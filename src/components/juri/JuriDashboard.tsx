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
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null)

  function showToast(type: 'success' | 'error' | 'info', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

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
    pollSesi()
    
    // Auto-refresh fallback every 3 seconds
    const intervalId = setInterval(() => {
      pollSesi()
    }, 3000)

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
      clearInterval(intervalId)
      supabase.removeChannel(channel)
    }
  }, [profile.id, pendingVar])

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
        showToast('success', 'VAR berhasil disetujui penuh oleh 3 Juri!')
      } else {
        showToast('info', 'Persetujuan Anda tercatat. Menunggu juri lain...')
      }
      await supabase.from('var_requests').update(update).eq('id', pendingVar.id)
    }
    setHasApprovedVar(true)
  }
  
  async function handleRejectVar() {
    if (!pendingVar) return
    await supabase.from('var_requests').update({ status: 'rejected', resolved_at: new Date().toISOString() }).eq('id', pendingVar.id)
    setPendingVar(null)
    showToast('error', 'VAR ditolak.')
  }

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="panel p-10">
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">
            Belum Ada Event
          </h2>
          <p className="text-[var(--color-text-muted)] text-sm max-w-sm">
            Inspektur Pertandingan belum mengaktifkan event. Silakan tunggu instruksi lebih lanjut.
          </p>
        </div>
      </div>
    )
  }

  const isJeda = activeEvent.status === 'jeda'

  return (
    <div className="space-y-6">
      {isJeda && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 rounded shadow-sm flex items-center justify-between animate-pulse">
          <div className="flex items-center">
            <span className="text-xl mr-3">⏸</span>
            <div>
              <p className="font-bold">Sistem Dijeda Sementara</p>
              <p className="text-sm">Panitia sedang menjeda event. Aksi dibekukan, Anda hanya dapat melihat data historis.</p>
            </div>
          </div>
        </div>
      )}

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
        <div className="panel p-6 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)] animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Sedang Tampil
              </p>
              <h2 className="font-display text-3xl font-bold text-[var(--color-text)]">
                {sesi.peserta.nama}
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[var(--color-text-muted)] font-medium">{sesi.peserta.asal_jemaat}</span>
                {sesi.peserta.nomor_undian && (
                  <span className="badge badge-gold px-3 py-1 shadow-sm font-bold">No. {sesi.peserta.nomor_undian}</span>
                )}
                {sesi.kategori && (
                  <span className="badge badge-info px-3 py-1 shadow-sm font-bold">{sesi.kategori.nama}</span>
                )}
              </div>
            </div>
            {sesi.peserta.mazmur_bacaan && (
              <div className="text-right ml-4">
                <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-1 font-semibold">Mazmur</p>
                <p className="text-2xl font-display font-bold text-blue-700/90 drop-shadow-sm">{sesi.peserta.mazmur_bacaan}</p>
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
            isJeda={isJeda}
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-white/30 backdrop-blur-md">
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

      {/* Toast notification */}
      {toast && (
        <div className={`toast z-[300] ${toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : 'bg-blue-600 text-white'}`}>
          {toast.type === 'success' ? '✓' : toast.type === 'error' ? '⚠' : 'ℹ'} {toast.msg}
        </div>
      )}
    </div>
  )
}
