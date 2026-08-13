'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, Peserta, Sesi, Kategori } from '@/types/database'

interface Props {
  activeEvent: Event | null
}

type SesiWithPeserta = Sesi & {
  peserta: Peserta | null
  kategori: Kategori | null
}

export default function AdminSesiTab({ activeEvent }: Props) {
  const [sesi, setSesi] = useState<SesiWithPeserta | null>(null)
  const [pesertaList, setPesertaList] = useState<Peserta[]>([])
  const [kategoriList, setKategoriList] = useState<Kategori[]>([])
  const [selectedKategori, setSelectedKategori] = useState('')
  const [selectedPeserta, setSelectedPeserta] = useState('')
  const [pengumuman, setPengumuman] = useState('')
  const [mazmurInput, setMazmurInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const supabase = createClient()

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  // Load kategori
  useEffect(() => {
    if (!activeEvent) return
    async function loadData() {
      const { data: kat } = await supabase
        .from('kategori')
        .select('*')
        .eq('event_id', activeEvent!.id)
        .order('urutan')
      setKategoriList(kat ?? [])
      if (kat && kat.length > 0) setSelectedKategori(kat[0].id)

      // Load active sesi
      const { data: s } = await supabase
        .from('sesi')
        .select('*, peserta:peserta_aktif_id(*), kategori:kategori_id(*)')
        .eq('event_id', activeEvent!.id)
        .neq('status', 'selesai')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (s) {
        const typed = s as unknown as SesiWithPeserta
        setSesi(typed)
        setPengumuman(typed.pengumuman ?? '')
      }
    }
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEvent?.id])

  // Load peserta by kategori
  useEffect(() => {
    if (!activeEvent || !selectedKategori) return
    async function loadPeserta() {
      const { data } = await supabase
        .from('peserta')
        .select('*')
        .eq('event_id', activeEvent!.id)
        .eq('kategori_id', selectedKategori)
        .order('nomor_undian', { ascending: true })
      setPesertaList(data ?? [])
    }
    loadPeserta()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKategori, activeEvent?.id])

  async function handleAktifkanPeserta() {
    if (!activeEvent || !selectedPeserta) {
      showToast('error', 'Pilih peserta terlebih dahulu!')
      return
    }
    setIsSaving(true)

    // Update peserta status lama → menunggu
    if (sesi?.peserta_aktif_id) {
      await supabase
        .from('peserta')
        .update({ status: 'selesai' } as any)
        .eq('id', sesi.peserta_aktif_id)
    }

    // Update peserta baru → tampil
    if (mazmurInput) {
      await supabase
        .from('peserta')
        .update({ status: 'tampil', mazmur_bacaan: mazmurInput } as any)
        .eq('id', selectedPeserta)
    } else {
      await supabase
        .from('peserta')
        .update({ status: 'tampil' } as any)
        .eq('id', selectedPeserta)
    }

    // Upsert sesi
    const payload = {
      event_id: activeEvent.id,
      kategori_id: selectedKategori,
      peserta_aktif_id: selectedPeserta,
      status: 'berjalan' as const,
      pengumuman,
      nilai_dikunci: false,
    }

    if (sesi) {
      await supabase.from('sesi').update(payload as any).eq('id', sesi.id)
    } else {
      const { data } = await supabase.from('sesi').insert(payload as any).select('*, peserta:peserta_aktif_id(*), kategori:kategori_id(*)').single()
      if (data) setSesi(data as unknown as SesiWithPeserta)
    }

    // Reload sesi
    const { data: s } = await supabase
      .from('sesi')
      .select('*, peserta:peserta_aktif_id(*), kategori:kategori_id(*)')
      .eq('event_id', activeEvent.id)
      .neq('status', 'selesai')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (s) setSesi(s as unknown as SesiWithPeserta)

    setIsSaving(false)
    setSelectedPeserta('')
    setMazmurInput('')
    showToast('success', 'Peserta berhasil diaktifkan! Semua juri dinotifikasi.')
  }

  async function handleKunciNilai() {
    if (!sesi) return
    await supabase.from('sesi').update({ nilai_dikunci: true, status: 'jeda' } as any).eq('id', sesi.id)
    setSesi((s) => s ? { ...s, nilai_dikunci: true, status: 'jeda' as const } : s)
    showToast('success', 'Nilai dikunci. Juri tidak bisa mengubah nilai lagi.')
  }

  async function handleUpdatePengumuman() {
    if (!sesi) return
    await supabase.from('sesi').update({ pengumuman } as any).eq('id', sesi.id)
    showToast('success', 'Pengumuman diperbarui!')
  }

  if (!activeEvent) {
    return (
      <div className="panel p-10 text-center">
        <div className="text-5xl mb-4">📅</div>
        <h3 className="font-display text-xl font-semibold text-[var(--color-text)] mb-2">Tidak Ada Event Aktif</h3>
        <p className="text-[var(--color-text-muted)] text-sm">Buat atau aktifkan event di tab Event terlebih dahulu.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Current Active Performer */}
      <div className="panel p-5">
        <h3 className="font-display text-lg font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
          🎯 Status Sesi Saat Ini
        </h3>
        {sesi?.peserta ? (
          <div className="performer-banner">
            <div className="flex items-center justify-between">
              <div>
                <span className="badge badge-success mb-2 text-xs px-2 py-0.5">● Sedang Tampil</span>
                <h2 className="font-display text-2xl font-bold text-white mt-1">{sesi.peserta.nama}</h2>
                <p className="text-sm text-white/80">{sesi.peserta.asal_jemaat}</p>
                {sesi.peserta.mazmur_bacaan && (
                  <p className="text-white font-semibold mt-1">📖 {sesi.peserta.mazmur_bacaan}</p>
                )}
              </div>
              {!sesi.nilai_dikunci ? (
                <button onClick={handleKunciNilai} className="btn-danger">
                  🔒 Kunci Nilai
                </button>
              ) : (
                <span className="badge badge-error">🔒 Nilai Dikunci</span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-[var(--color-cream-1)] border border-[var(--color-border-dark)] text-[var(--color-text-muted)] text-sm">
            Belum ada peserta yang diaktifkan.
          </div>
        )}
      </div>

      {/* Aktifkan Peserta */}
      <div className="panel p-5 space-y-4">
        <h3 className="font-display text-lg font-semibold text-[var(--color-text)] flex items-center gap-2">
          ▶️ Aktifkan Peserta Berikutnya
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Kategori</label>
            <select
              value={selectedKategori}
              onChange={(e) => { setSelectedKategori(e.target.value); setSelectedPeserta('') }}
              className="form-input"
            >
              {kategoriList.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Pilih Peserta</label>
            <select
              value={selectedPeserta}
              onChange={(e) => setSelectedPeserta(e.target.value)}
              className="form-input"
            >
              <option value="">-- Pilih Peserta --</option>
              {pesertaList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nomor_undian ? `No.${p.nomor_undian} - ` : ''}{p.nama} ({p.asal_jemaat})
                  {p.status === 'selesai' ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="form-label">Mazmur yang Dibaca (Hasil Undian)</label>
          <input
            type="text"
            value={mazmurInput}
            onChange={(e) => setMazmurInput(e.target.value)}
            className="form-input"
            placeholder="Contoh: Mazmur 23:1-6"
          />
        </div>

        <button
          onClick={handleAktifkanPeserta}
          disabled={isSaving || !selectedPeserta}
          className="btn-primary"
        >
          {isSaving ? <><span className="spinner" /> Memproses...</> : '▶ Aktifkan Peserta'}
        </button>
      </div>

      {/* Pengumuman */}
      <div className="panel p-5 space-y-3">
        <h3 className="font-display text-lg font-semibold text-[var(--color-text)] flex items-center gap-2">
          📢 Pengumuman ke Juri
        </h3>
        <textarea
          value={pengumuman}
          onChange={(e) => setPengumuman(e.target.value)}
          className="form-input resize-none"
          rows={3}
          placeholder="Tulis pengumuman yang akan ditampilkan di panel semua juri..."
        />
        <button onClick={handleUpdatePengumuman} className="btn-secondary">
          📤 Kirim Pengumuman
        </button>
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}
    </div>
  )
}
