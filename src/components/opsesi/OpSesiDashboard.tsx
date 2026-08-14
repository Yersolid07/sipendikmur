'use client'

import { useState, useEffect } from 'react'
import { Profile, Event, Sesi, RekapPenilaian } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

type ActiveSesi = Sesi & {
  peserta: { id: string; nama: string; mazmur_bacaan: string | null } | null
  kategori: { id: string; nama: string; jenis_lomba: 'perorangan' | 'beregu' } | null
}

interface Props {
  profile: Profile
  activeEvent: Event | null
  initialSesi: ActiveSesi | null
}

export default function OpSesiDashboard({ profile, activeEvent, initialSesi }: Props) {
  const [sesi, setSesi] = useState<ActiveSesi | null>(initialSesi)
  const [pesertaList, setPesertaList] = useState<RekapPenilaian[]>([])
  const [selectedPesertaId, setSelectedPesertaId] = useState<string>('')
  const [mazmurInput, setMazmurInput] = useState('')
  const [pengumuman, setPengumuman] = useState(initialSesi?.pengumuman || '')
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  
  const supabase = createClient()

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function loadData() {
    if (!activeEvent) return
    const { data } = await supabase
      .from('v_rekap_penilaian')
      .select('*')
      .eq('event_id', activeEvent.id)
      .order('kategori_id')
      .order('nomor_undian')
    
    if (data) setPesertaList(data as RekapPenilaian[])
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
    
    // Auto-refresh fallback every 3 seconds
    const intervalId = setInterval(() => {
      loadData()
    }, 3000)

    const channel = supabase.channel('realtime_peserta_opsesi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'peserta' }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sesi' }, async (payload) => {
        // If someone else changes sesi (e.g. IP locks values)
        const newPayload = payload.new as any
        if (newPayload && newPayload.id === sesi?.id) {
          setSesi(newPayload as any)
        }
      })
      .subscribe()

    return () => {
      clearInterval(intervalId)
      supabase.removeChannel(channel)
    }
  }, [activeEvent, sesi?.id])

  async function handleMulaiTampil() {
    if (!selectedPesertaId || !activeEvent) return
    setIsSaving(true)

    const selectedPeserta = pesertaList.find(p => p.peserta_id === selectedPesertaId)
    if (!selectedPeserta) return

    // 1. Update existing aktif peserta to selesai
    if (sesi?.peserta_aktif_id) {
      await supabase.from('peserta').update({ status: 'selesai' } as any).eq('id', sesi.peserta_aktif_id)
    }

    // 2. Update new peserta status to tampil + set mazmur bacaan
    const pUpdatePayload: any = { status: 'tampil' }
    if (mazmurInput) pUpdatePayload.mazmur_bacaan = mazmurInput
    await supabase.from('peserta').update(pUpdatePayload).eq('id', selectedPesertaId)

    // 3. Upsert Sesi
    const payload = {
      event_id: activeEvent.id,
      kategori_id: selectedPeserta.kategori_id,
      peserta_aktif_id: selectedPesertaId,
      status: 'berjalan' as const,
      pengumuman,
      nilai_dikunci: false,
    }

    if (sesi) {
      await supabase.from('sesi').update(payload as any).eq('id', sesi.id)
    } else {
      const { data } = await supabase.from('sesi').insert(payload as any).select('*, peserta:peserta_aktif_id(id, nama, mazmur_bacaan), kategori:kategori_id(id, nama, jenis_lomba)').single()
      if (data) setSesi(data as unknown as ActiveSesi)
    }

    // Reload sesi to get joined data
    const { data: s } = await supabase
      .from('sesi')
      .select('*, peserta:peserta_aktif_id(id, nama, mazmur_bacaan), kategori:kategori_id(id, nama, jenis_lomba)')
      .eq('event_id', activeEvent.id)
      .neq('status', 'selesai')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      
    if (s) setSesi(s as unknown as ActiveSesi)

    setIsSaving(false)
    setSelectedPesertaId('')
    setMazmurInput('')
    showToast('success', 'Peserta berhasil diaktifkan! Semua juri dinotifikasi.')
  }



  async function handleUpdatePengumuman() {
    if (!sesi) return
    await supabase.from('sesi').update({ pengumuman } as any).eq('id', sesi.id)
    showToast('success', 'Pengumuman diperbarui!')
  }

  if (!activeEvent) {
    return (
      <div className="panel p-10 text-center">
        <h2 className="text-xl font-bold text-[var(--color-text)]">Tidak Ada Event Aktif</h2>
      </div>
    )
  }

  const checkedInList = pesertaList.filter(p => p.is_checked_in)
  
  const isSesiActive = sesi?.status === 'berjalan'

  return (
    <div className="space-y-6">
      <div className="panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-green-600">
        <div>
          <h1 className="text-2xl font-display font-bold text-[var(--color-text)]">Control Panel Sesi Panggung</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">{activeEvent.nama}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column: Stage Control */}
        <div className="space-y-6">
          <div className="panel p-6">
            <h3 className="font-semibold text-[var(--color-text)] mb-4">Mulai Penampilan Baru</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Pilih peserta dari daftar yang sudah check-in. Tombol ini akan otomatis membuka form nilai di layar Juri.
            </p>
            {isSesiActive && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <span className="font-bold">Sesi Sedang Berjalan!</span><br/>
                Harap tunggu Inspektur Pertandingan (IP) mengakhiri sesi saat ini sebelum memulai peserta baru.
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="form-label">Pilih Peserta (Hanya yang sudah Check-In)</label>
                <select 
                  className="form-input bg-[var(--color-cream-1)] border-[var(--color-border-dark)] text-[var(--color-text)] disabled:opacity-50"
                  value={selectedPesertaId}
                  onChange={e => setSelectedPesertaId(e.target.value)}
                  disabled={isSesiActive}
                >
                  <option value="">-- Pilih Peserta --</option>
                  {checkedInList.map(p => (
                    <option key={p.peserta_id} value={p.peserta_id}>
                      [{p.kategori}] {p.nomor_undian ? `#${p.nomor_undian}` : ''} - {p.nama_peserta} ({p.asal_jemaat})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--color-amber-dark)] mt-1">Sistem memungkinkan loncat sesi atau urutan tanpa batas.</p>
              </div>

              {selectedPesertaId && (
                <div className="animate-fade-in-up">
                  <label className="form-label">Update Mazmur Bacaan (Opsional)</label>
                  <input 
                    type="text" 
                    value={mazmurInput} 
                    onChange={e => setMazmurInput(e.target.value)} 
                    placeholder="Contoh: Mazmur 23:1-6"
                    className="form-input disabled:opacity-50" 
                    disabled={isSesiActive}
                  />
                </div>
              )}

              <button 
                onClick={handleMulaiTampil} 
                disabled={!selectedPesertaId || isSaving || isSesiActive}
                className="w-full btn-primary py-3 text-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Memproses...' : '▶ MULAI TAMPIL'}
              </button>
            </div>
          </div>

          <div className="panel p-6">
            <h3 className="font-semibold text-[var(--color-text)] mb-4">Broadcast Pengumuman</h3>
            <textarea 
              value={pengumuman} 
              onChange={e => setPengumuman(e.target.value)}
              placeholder="Tulis pengumuman untuk Juri & IP..." 
              className="form-input resize-none mb-3" 
              rows={3} 
            />
            <button onClick={handleUpdatePengumuman} disabled={!sesi} className="btn-secondary w-full">
              Kirim Pengumuman
            </button>
          </div>
        </div>

        {/* Right Column: Active Status */}
        <div className="space-y-6">
          <div className={`panel p-6 border-2 transition-colors ${sesi?.status === 'berjalan' ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.1)]' : 'border-[var(--color-border-dark)]'}`}>
            <h3 className="font-semibold text-[var(--color-text)] mb-4 flex justify-between items-center">
              <span>Status Panggung Saat Ini</span>
              {sesi?.status === 'berjalan' && <span className="badge badge-success animate-pulse text-xs px-2 py-0.5">LIVE</span>}
              {sesi?.status === 'jeda' && <span className="badge badge-warning text-xs px-2 py-0.5">JEDA (Nilai Dikunci)</span>}
            </h3>

            {sesi?.peserta ? (
              <div className="space-y-4">
                <div className="p-4 bg-[var(--color-cream-2)] rounded-xl border border-[var(--color-border)]">
                  <div className="text-sm text-[var(--color-text-muted)] mb-1">Sedang Tampil:</div>
                  <div className="text-2xl font-bold text-[var(--color-text)] mb-1">{sesi.peserta.nama}</div>
                  <div className="text-[var(--color-amber-dark)]">{sesi.kategori?.nama}</div>
                  {sesi.peserta.mazmur_bacaan && (
                    <div className="mt-3 p-3 bg-[var(--color-cream-1)] rounded-lg border border-[var(--color-border-dark)] text-sm">
                      📖 <span className="text-[var(--color-text-muted)]">{sesi.peserta.mazmur_bacaan}</span>
                    </div>
                  )}
                </div>

                {!sesi.nilai_dikunci ? (
                  <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg text-blue-800 text-sm text-center">
                    Peserta sedang tampil dan dinilai oleh juri.
                  </div>
                ) : (
                  <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg text-amber-800 text-sm text-center">
                    Nilai telah dikunci oleh Inspektur. Juri tidak dapat mengubah nilai lagi.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-10 text-center text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-dark)] rounded-xl">
                Belum ada peserta yang aktif di panggung.
              </div>
            )}
          </div>
        </div>
      </div>
      
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
