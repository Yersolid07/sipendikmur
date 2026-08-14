'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, Peserta, Kategori } from '@/types/database'
import { Users, Pencil, UserRound } from 'lucide-react'

interface Props {
  activeEvent: Event | null
}

export default function AdminPesertaTab({ activeEvent }: Props) {
  const [pesertaList, setPesertaList] = useState<Peserta[]>([])
  const [kategoriList, setKategoriList] = useState<Kategori[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [form, setForm] = useState({
    nama: '', asal_jemaat: '', kategori_id: '', nomor_peserta: '', nomor_undian: '', mazmur_bacaan: '', potongan_nilai: '0', keterangan_potongan: '',
  })
  const supabase = createClient()

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function loadData() {
    if (!activeEvent) return
    const [peserta, kategori] = await Promise.all([
      supabase.from('peserta').select('*').eq('event_id', activeEvent.id).order('nomor_undian', { ascending: true }),
      supabase.from('kategori').select('*').eq('event_id', activeEvent.id).order('urutan'),
    ])
    setPesertaList((peserta.data ?? []) as Peserta[])
    setKategoriList((kategori.data ?? []) as Kategori[])
    if (kategori.data && kategori.data.length > 0 && !form.kategori_id) {
      setForm((f) => ({ ...f, kategori_id: (kategori.data![0] as Kategori).id }))
    }
    setIsLoading(false)
  }

  useEffect(() => { 
    loadData() 
    
    // Auto-refresh fallback every 3 seconds
    const intervalId = setInterval(() => {
      loadData()
    }, 3000)

    return () => clearInterval(intervalId)
  }, [activeEvent?.id])

  function resetForm() {
    setForm({ nama: '', asal_jemaat: '', kategori_id: kategoriList[0]?.id ?? '', nomor_peserta: '', nomor_undian: '', mazmur_bacaan: '', potongan_nilai: '0', keterangan_potongan: '' })
    setEditId(null)
    setShowForm(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeEvent) return

    const payload = {
      nama: form.nama,
      asal_jemaat: form.asal_jemaat,
      kategori_id: form.kategori_id,
      event_id: activeEvent.id,
      nomor_peserta: form.nomor_peserta || null,
      nomor_undian: form.nomor_undian ? parseInt(form.nomor_undian) : null,
      mazmur_bacaan: form.mazmur_bacaan || null,
      potongan_nilai: parseFloat(form.potongan_nilai),
      keterangan_potongan: form.keterangan_potongan || null,
    }

    if (editId) {
      const { error } = await supabase.from('peserta').update(payload as any).eq('id', editId)
      if (error) showToast('error', 'Gagal mengubah peserta')
      else showToast('success', 'Peserta berhasil diubah!')
    } else {
      const { error } = await supabase.from('peserta').insert(payload as any)
      if (error) showToast('error', 'Gagal menambah peserta: ' + error.message)
      else showToast('success', 'Peserta berhasil ditambahkan!')
    }

    resetForm()
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus peserta ini beserta semua nilainya?')) return
    const { error } = await supabase.from('peserta').delete().eq('id', id)
    if (error) showToast('error', 'Gagal menghapus peserta')
    else { showToast('success', 'Peserta dihapus'); loadData() }
  }

  function handleEdit(p: Peserta) {
    setForm({
      nama: p.nama,
      asal_jemaat: p.asal_jemaat,
      kategori_id: p.kategori_id,
      nomor_peserta: p.nomor_peserta ?? '',
      nomor_undian: p.nomor_undian?.toString() ?? '',
      mazmur_bacaan: p.mazmur_bacaan ?? '',
      potongan_nilai: p.potongan_nilai.toString(),
      keterangan_potongan: p.keterangan_potongan ?? '',
    })
    setEditId(p.id)
    setShowForm(true)
  }

  const statusBadge = (status: string) => {
    if (status === 'tampil') return <span className="badge badge-success text-xs px-2 py-0.5">● Tampil</span>
    if (status === 'selesai') return <span className="badge badge-info text-xs px-2 py-0.5">✓ Selesai</span>
    return <span className="badge bg-gray-200 text-gray-700 text-xs px-2 py-0.5">Menunggu</span>
  }

  if (!activeEvent) {
    return (
      <div className="panel p-10 text-center">
        <p className="text-[var(--color-text-muted)]">Tidak ada event aktif. Buat event di tab Event terlebih dahulu.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-[var(--color-text)] flex items-center gap-2">
            <UserRound className="w-5 h-5 text-[var(--color-amber-dark)]" /> Manajemen Peserta
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">{pesertaList.length} peserta terdaftar</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary">
          + Tambah Peserta
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="panel">
          <h4 className="font-semibold text-[var(--color-text)] mb-4">{editId ? 'Edit Peserta' : 'Tambah Peserta Baru'}</h4>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Nama Lengkap *</label>
              <input value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} className="form-input" required placeholder="Nama peserta" />
            </div>
            <div>
              <label className="form-label">Asal Jemaat *</label>
              <input value={form.asal_jemaat} onChange={(e) => setForm((f) => ({ ...f, asal_jemaat: e.target.value }))} className="form-input" required placeholder="GMIM Nama Jemaat" />
            </div>
            <div>
              <label className="form-label">Kategori *</label>
              <select value={form.kategori_id} onChange={(e) => setForm((f) => ({ ...f, kategori_id: e.target.value }))} className="form-input" required>
                {kategoriList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Nomor Peserta (Registrasi)</label>
              <input type="text" value={form.nomor_peserta} onChange={(e) => setForm((f) => ({ ...f, nomor_peserta: e.target.value }))} className="form-input" placeholder="ID/No. Pendaftaran" />
            </div>
            <div>
              <label className="form-label">Nomor Undian (No. Urut Tampil)</label>
              <input type="number" value={form.nomor_undian} onChange={(e) => setForm((f) => ({ ...f, nomor_undian: e.target.value }))} className="form-input" placeholder="Nomor urut tampil" />
            </div>
            <div>
              <label className="form-label">Mazmur Bacaan</label>
              <input value={form.mazmur_bacaan} onChange={(e) => setForm((f) => ({ ...f, mazmur_bacaan: e.target.value }))} className="form-input" placeholder="Mazmur 23:1-6" />
            </div>
            <div>
              <label className="form-label">Potongan Nilai</label>
              <input type="number" step="0.5" value={form.potongan_nilai} onChange={(e) => setForm((f) => ({ ...f, potongan_nilai: e.target.value }))} className="form-input" placeholder="0" />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Keterangan Potongan</label>
              <input value={form.keterangan_potongan} onChange={(e) => setForm((f) => ({ ...f, keterangan_potongan: e.target.value }))} className="form-input" placeholder="Alasan potongan nilai (jika ada)" />
            </div>
            <div className="sm:col-span-2 flex gap-3 pt-1">
              <button type="button" onClick={resetForm} className="btn-secondary">Batal</button>
              <button type="submit" className="btn-primary">
                {editId ? <><Pencil className="w-4 h-4 inline mr-1" /> Simpan Perubahan</> : '+ Tambah Peserta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="panel p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
        ) : pesertaList.length === 0 ? (
          <div className="p-10 text-center">
            <div className="flex justify-center mb-3 text-[var(--color-text-muted)] opacity-50"><Users className="w-12 h-12" /></div>
            <p className="text-[var(--color-text-muted)] text-sm">Belum ada peserta terdaftar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-container">
              <thead className="table-header">
                <tr>
                  <th>No</th>
                  <th>Nama Peserta</th>
                  <th className="hidden md:table-cell">Asal Jemaat</th>
                  <th className="hidden md:table-cell">Kategori</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pesertaList.map((p) => {
                  const kat = kategoriList.find((k) => k.id === p.kategori_id)
                  return (
                    <tr key={p.id} className="table-row">
                      <td className="font-bold text-[var(--color-amber-dark)]">{p.nomor_undian ?? '-'}</td>
                      <td>
                        <div className="font-semibold text-[var(--color-text)]">{p.nama}</div>
                        {p.nomor_peserta && (
                          <div className="text-xs text-[var(--color-text-muted)] mt-0.5">ID: {p.nomor_peserta}</div>
                        )}
                        {p.potongan_nilai > 0 && (
                          <div className="text-xs text-red-600 mt-0.5">-{p.potongan_nilai} poin</div>
                        )}
                      </td>
                      <td className="hidden md:table-cell text-[var(--color-text-muted)]">{p.asal_jemaat}</td>
                      <td className="hidden md:table-cell">
                        <span className="badge badge-info text-xs px-2 py-0.5">{kat?.nama ?? '-'}</span>
                      </td>
                      <td>{statusBadge(p.status)}</td>
                      <td>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(p)} className="text-xs px-2 py-1 rounded border border-[var(--color-border-dark)] text-[var(--color-text-muted)] hover:text-[var(--color-amber-dark)] hover:border-[var(--color-amber-dark)] transition-all bg-[var(--color-cream-1)]">Edit</button>
                          <button onClick={() => handleDelete(p.id)} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-all bg-white">Hapus</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '⚠'} {toast.msg}</div>}
    </div>
  )
}
