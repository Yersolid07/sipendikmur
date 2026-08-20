'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event } from '@/types/database'
import { Calendar, Pencil, MapPin } from 'lucide-react'

interface Props {
  events: Event[]
  role?: string
}

export default function AdminEventTab({ events: initialEvents, role }: Props) {
  const [events, setEvents] = useState(initialEvents)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showKategoriFor, setShowKategoriFor] = useState<string | null>(null)
  const [restartEventId, setRestartEventId] = useState<string | null>(null)
  const [form, setForm] = useState({ nama: '', deskripsi: '', tanggal: '', lokasi: '' })
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function loadEvents() {
    const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false })
    setEvents(data ?? [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!confirm('Apakah Anda yakin ingin menyimpan event ini?')) return
    setIsSaving(true)

    const payload = {
      nama: form.nama,
      deskripsi: form.deskripsi || null,
      tanggal: form.tanggal || null,
      lokasi: form.lokasi || null,
    }

    if (editId) {
      await supabase.from('events').update(payload as any).eq('id', editId)
      showToast('success', 'Event berhasil diperbarui!')
    } else {
      await supabase.from('events').insert({ ...payload, status: 'aktif' } as any)
      showToast('success', 'Event baru berhasil dibuat!')
    }

    setShowForm(false)
    setEditId(null)
    setForm({ nama: '', deskripsi: '', tanggal: '', lokasi: '' })
    loadEvents()
    setIsSaving(false)
  }

  async function handleSetAktif(id: string) {
    if (!confirm('Apakah Anda yakin ingin mengaktifkan event ini? Semua panel akan beralih ke event ini.')) return
    await supabase.from('events').update({ status: 'aktif' } as any).eq('id', id)
    showToast('success', 'Event diaktifkan!')
    loadEvents()
  }

  async function handleSelesai(id: string) {
    if (!confirm('Tandai event ini sebagai selesai? Ini akan mengunci semua nilai.')) return
    await supabase.from('events').update({ status: 'selesai' } as any).eq('id', id)
    loadEvents()
  }

  async function handleJeda(id: string, toJeda: boolean) {
    if (toJeda && !confirm('Anda yakin ingin MENJEDA event ini? Seluruh operator & juri akan diblokir sementara.')) return
    
    await supabase.from('events').update({ status: toJeda ? 'jeda' : 'aktif' } as any).eq('id', id)
    showToast('success', toJeda ? 'Event dijeda!' : 'Event dilanjutkan!')
    loadEvents()
  }

  async function handleRestartEvent(type: 'resume' | 'reset') {
    if (!restartEventId) return
    setIsSaving(true)

    if (type === 'reset') {
      if (!confirm('PERINGATAN KERAS! Anda yakin ingin RESET TOTAL event ini? Seluruh data peserta, sesi, penilaian, dan histori akan DIHAPUS PERMANEN.')) {
        setIsSaving(false)
        return
      }
      await supabase.from('peserta').delete().eq('event_id', restartEventId)
      await supabase.from('sesi').delete().eq('event_id', restartEventId)
      
    }

    await supabase.from('events').update({ status: 'aktif' } as any).eq('id', restartEventId)
    
    showToast('success', type === 'reset' ? 'Event di-reset total dan aktif kembali!' : 'Event dilanjutkan!')
    setRestartEventId(null)
    loadEvents()
    setIsSaving(false)
  }

  const statusConfig: Record<string, {label: string, badge: string}> = {
    aktif: { label: 'Aktif', badge: 'badge-success' },
    draft: { label: 'Draft', badge: 'badge-warning' },
    selesai: { label: 'Selesai', badge: 'badge-info' },
    jeda: { label: 'Jeda', badge: 'badge-warning' }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-[var(--color-text)] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--color-amber-dark)]" /> Manajemen Event
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">{events.length} event tercatat</p>
        </div>
        {role !== 'subadmin' && (
          <button
            onClick={() => { setEditId(null); setForm({ nama: '', deskripsi: '', tanggal: '', lokasi: '' }); setShowForm(true) }}
            className="btn-primary"
          >
            + Buat Event Baru
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="panel">
          <h4 className="font-semibold text-[var(--color-text)] mb-4">{editId ? 'Edit Event' : 'Buat Event Baru'}</h4>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Nama Event *</label>
              <input value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} className="form-input" required placeholder="Contoh: Lomba Baca Mazmur P/KB 2026" />
            </div>
            <div>
              <label className="form-label">Tanggal</label>
              <input type="date" value={form.tanggal} onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))} className="form-input" />
            </div>
            <div>
              <label className="form-label">Lokasi</label>
              <input value={form.lokasi} onChange={(e) => setForm((f) => ({ ...f, lokasi: e.target.value }))} className="form-input" placeholder="Nama gereja / aula" />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Deskripsi</label>
              <textarea value={form.deskripsi} onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))} className="form-input resize-none" rows={2} placeholder="Deskripsi singkat event..." />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Batal</button>
              <button type="submit" disabled={isSaving} className="btn-primary">
                {isSaving ? <><span className="spinner" /> Menyimpan...</> : (editId ? <><Pencil className="w-4 h-4 inline mr-1" /> Simpan</> : '+ Buat Event')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events list */}
      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="panel text-center">
            <div className="flex justify-center mb-3 text-[var(--color-text-muted)] opacity-50"><Calendar className="w-12 h-12" /></div>
            <p className="text-[var(--color-text-muted)] text-sm">Belum ada event. Buat event pertama!</p>
          </div>
        ) : events.map((ev) => {
          const sc = statusConfig[ev.status]
          return (
            <div key={ev.id} className="panel">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${sc.badge}`}>{sc.label}</span>
                    {ev.status === 'aktif' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                  </div>
                  <h4 className="font-display text-lg font-semibold text-[var(--color-text)]">{ev.nama}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-muted)]">
                    {ev.tanggal && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(ev.tanggal).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>}
                    {ev.lokasi && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.lokasi}</span>}
                  </div>
                  {ev.deskripsi && <p className="text-sm text-[var(--color-text-muted)] mt-1">{ev.deskripsi}</p>}
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  {ev.status === 'draft' && (
                    <button onClick={() => handleSetAktif(ev.id)} className="btn-primary text-xs py-1 px-3">
                      ▶ Aktifkan
                    </button>
                  )}
                  {ev.status === 'jeda' && (
                    <button onClick={() => handleJeda(ev.id, false)} className="btn-primary text-xs py-1 px-3 bg-emerald-600 hover:bg-emerald-700">
                      ▶ Lanjutkan
                    </button>
                  )}
                  {ev.status === 'aktif' && (
                    <>
                      <button onClick={() => handleJeda(ev.id, true)} className="btn-secondary text-xs py-1 px-3 border-amber-500 text-amber-600 hover:bg-amber-50">
                        ⏸ Jeda
                      </button>
                      <button onClick={() => handleSelesai(ev.id)} className="btn-secondary text-xs py-1 px-3">
                        ■ Selesaikan
                      </button>
                    </>
                  )}
                  {ev.status === 'selesai' && (
                    <button onClick={() => setRestartEventId(ev.id)} className="btn-secondary text-xs py-1 px-3 border-blue-500 text-blue-600 hover:bg-blue-50">
                      ▶ Mulai Kembali
                    </button>
                  )}
                  <button
                    onClick={() => { setEditId(ev.id); setForm({ nama: ev.nama, deskripsi: ev.deskripsi ?? '', tanggal: ev.tanggal ?? '', lokasi: ev.lokasi ?? '' }); setShowForm(true) }}
                    className="btn-secondary text-xs py-1 px-3"
                  >
                    <Pencil className="w-3 h-3 inline mr-1" /> Edit
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* RESTART EVENT MODAL */}
      {restartEventId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-[var(--color-text)] mb-4 border-b pb-2">Mulai Kembali Event</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              Bagaimana Anda ingin memulai kembali event ini?
            </p>
            <div className="space-y-4">
              <button 
                onClick={() => handleRestartEvent('resume')}
                disabled={isSaving}
                className="w-full text-left p-4 rounded-xl border border-blue-200 hover:bg-blue-50 transition-colors"
              >
                <div className="font-bold text-blue-700">Lanjutkan Data (Resume)</div>
                <div className="text-xs text-blue-600 mt-1">Mengaktifkan event kembali tanpa menghapus data apapun yang sudah ada.</div>
              </button>
              
              <button 
                onClick={() => handleRestartEvent('reset')}
                disabled={isSaving}
                className="w-full text-left p-4 rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
              >
                <div className="font-bold text-red-700">Reset Total (Start Fresh)</div>
                <div className="text-xs text-red-600 mt-1">Menghapus SELURUH data peserta, sesi, penilaian. Mulai dari nol.</div>
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setRestartEventId(null)} disabled={isSaving} className="btn-secondary">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '⚠'} {toast.msg}</div>}
    </div>
  )
}
