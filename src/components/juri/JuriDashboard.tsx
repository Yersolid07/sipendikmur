'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Event, Sesi, Peserta, Kategori } from '@/types/database'
import TabPenilaian from './TabPenilaian'
import TabHasilFinal from './TabHasilFinal'
import TabPeninjauan from './TabPeninjauan'
import { AlertTriangle, Trophy, BookOpen, PauseCircle, Megaphone, CheckCircle2, XCircle } from 'lucide-react'

type ActiveSesi = Sesi & {
  peserta: Peserta | null
  kategori: Kategori | null
}

interface Props {
  profile: Profile
  activeEvent: Event | null
  activeSesi: ActiveSesi | null
}

const TABS = [
  { id: 'penilaian', label: 'Tugas Penilaian', icon: 'clipboard' },
  { id: 'hasil', label: <><Trophy className="w-4 h-4 inline mr-1" /> Hasil Final</>, icon: 'trophy' },
  { id: 'peninjauan', label: 'Peninjauan', icon: 'eye' },
]

export default function JuriDashboard({ profile, activeEvent, activeSesi: initialSesi }: Props) {
  const [activeTab, setActiveTab] = useState('penilaian')
  const [sesi, setSesi] = useState<ActiveSesi | null>(initialSesi)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  
  const [pendingVar, setPendingVar] = useState<any | null>(null)
  const [hasApprovedVar, setHasApprovedVar] = useState(false)

  const supabase = createClient()

  // Real-time polling for active sesi changes (every 5 seconds)
  const pollSesi = useCallback(async () => {
    if (!activeEvent) return

    const { data } = await supabase
      .from('sesi')
      .select('*, peserta:peserta_aktif_id(*), kategori:kategori_id(*)')
      .eq('event_id', activeEvent.id)
      .in('status', ['berjalan', 'menunggu'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      const typed = data as unknown as ActiveSesi
      const newPesertaId = typed.peserta?.id
      const oldPesertaId = sesi?.peserta?.id
      if (newPesertaId !== oldPesertaId) {
        // Peserta changed — switch to penilaian tab
        setActiveTab('penilaian')
      }
      setSesi(typed)
      setLastUpdate(new Date())
    }
  }, [activeEvent, sesi?.peserta?.id, supabase])

  useEffect(() => {
    const interval = setInterval(pollSesi, 3000)
    
    // Real-time var_requests
    const channel = supabase.channel('var_requests_juri')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'var_requests' }, (payload) => {
        const newData = payload.new as any
        if (newData && newData.status === 'pending' && newData.requested_role === 'ip') {
          setPendingVar((prev: any) => {
             if (prev?.id !== newData.id) {
               setHasApprovedVar(false)
               return newData
             }
             return newData
          })
        } else if (newData && newData.status !== 'pending') {
           setPendingVar((prev: any) => {
              if (prev && prev.id === newData.id) return null
              return prev
           })
        }
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [pollSesi, supabase])

  async function handleApproveVar() {
    if (!pendingVar) return
    const { data: v } = await supabase.from('var_requests').select('*').eq('id', pendingVar.id).single()
    if (!v) return

    let update: any = {}
    if (v.approved_by_juri_1 === false) update = { approved_by_juri_1: true }
    else if (v.approved_by_juri_2 === false) update = { approved_by_juri_2: true }
    else if (v.approved_by_juri_3 === false) update = { approved_by_juri_3: true }

    if (Object.keys(update).length > 0) {
      if (update.approved_by_juri_3) {
        update.status = 'approved'
        update.resolved_at = new Date().toISOString()
        alert('VAR berhasil disetujui penuh oleh 3 Juri!')
      }
      await supabase.from('var_requests').update(update).eq('id', pendingVar.id)
    }
    setHasApprovedVar(true)
  }
  
  async function handleRejectVar() {
    if (!pendingVar) return
    await supabase.from('var_requests').update({ status: 'rejected', resolved_at: new Date().toISOString() }).eq('id', pendingVar.id)
    setPendingVar(null)
    alert('VAR ditolak.')
  }

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="panel p-10">
          <div className="mb-4"><BookOpen className="w-16 h-16 mx-auto text-[var(--color-amber-dark)] opacity-50" /></div>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-text)] mb-2">
            Belum Ada Event Aktif
          </h2>
          <p className="text-[var(--color-text-muted)] text-sm max-w-sm">
            Inspektur Pertandingan belum mengaktifkan event. Silakan tunggu instruksi lebih lanjut.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-gold-gradient">
            Panel Juri
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">
            {activeEvent.nama}
          </p>
        </div>
        <div className="text-right">
          <span className="badge badge-gold">
            {profile.nama}
          </span>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Update: {lastUpdate.toLocaleTimeString('id-ID')}
          </p>
        </div>
      </div>

      {/* Active Performer Banner */}
      {sesi?.peserta ? (
        <div className="performer-banner animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white/90 uppercase tracking-widest mb-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
                Sedang Tampil
              </p>
              <h2 className="font-display text-2xl font-bold text-white">
                {sesi.peserta.nama}
              </h2>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-sm text-white/80">{sesi.peserta.asal_jemaat}</span>
                {sesi.peserta.nomor_undian && (
                  <span className="badge badge-gold text-xs">No. {sesi.peserta.nomor_undian}</span>
                )}
                {sesi.kategori && (
                  <span className="badge badge-info text-xs px-2 py-0.5">{sesi.kategori.nama}</span>
                )}
              </div>
            </div>
            {sesi.peserta.mazmur_bacaan && (
              <div className="text-right ml-4">
                <p className="text-xs text-white/70 mb-1">Mazmur</p>
                <p className="font-display text-lg font-semibold text-white">
                  {sesi.peserta.mazmur_bacaan}
                </p>
              </div>
            )}
          </div>
          {sesi.pengumuman && (
            <div className="mt-3 p-2 rounded-lg bg-blue-100 border border-blue-300 text-blue-800 text-sm flex items-center gap-2">
              <Megaphone className="w-4 h-4 shrink-0" /> {sesi.pengumuman}
            </div>
          )}
        </div>
      ) : (
        <div className="panel p-4" style={{ borderColor: 'var(--color-border-dark)', background: 'var(--color-cream-1)' }}>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
            <p className="text-[var(--color-text-muted)] text-sm flex items-center gap-1">
              {sesi?.status === 'jeda'
                ? <><PauseCircle className="w-4 h-4 inline" /> Sesi sedang dijeda. Tunggu instruksi berikutnya.</>
                : 'Menunggu peserta berikutnya...'}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-list">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in-up">
        {activeTab === 'penilaian' && (
          <TabPenilaian
            profile={profile}
            sesi={sesi}
            activeEvent={activeEvent}
          />
        )}
        {activeTab === 'hasil' && (
          <TabHasilFinal
            activeEvent={activeEvent}
          />
        )}
        {activeTab === 'peninjauan' && (
          <TabPeninjauan
            profile={profile}
            activeEvent={activeEvent}
          />
        )}
      </div>

      {/* VAR Request Popup */}
      {pendingVar && !hasApprovedVar && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl relative overflow-hidden animate-fade-in-up">
            <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
            <div className="text-red-500 mb-4 flex justify-center"><AlertTriangle className="w-16 h-16" /></div>
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Permintaan VAR / Reveal</h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              Inspektur Pertandingan mengajukan VAR / Revisi Nilai untuk peserta yang sedang tampil.
            </p>
            <div className="bg-[var(--color-cream-1)] p-4 rounded-xl border border-[var(--color-border)] mb-6 text-left">
              <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Alasan:</span>
              <p className="font-semibold text-[var(--color-text)]">{pendingVar.alasan}</p>
            </div>
            
            <p className="text-sm text-red-600 mb-4 font-medium">Permintaan ini membutuhkan persetujuan 3 Juri.</p>
            
            <div className="flex gap-3">
              <button onClick={handleRejectVar} className="btn-danger flex-1 py-3 text-sm flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> Tolak
              </button>
              <button onClick={handleApproveVar} className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Setuju
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
