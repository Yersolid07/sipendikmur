'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Event, Sesi, Peserta, Kategori } from '@/types/database'
import TabPenilaian from './TabPenilaian'
import TabHasilFinal from './TabHasilFinal'
import TabPeninjauan from './TabPeninjauan'

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
  { id: 'penilaian', label: '⚖️ Penilaian', icon: 'gavel' },
  { id: 'hasil', label: '🏆 Hasil Final', icon: 'trophy' },
  { id: 'peninjauan', label: '👁️ Peninjauan', icon: 'eye' },
]

export default function JuriDashboard({ profile, activeEvent, activeSesi: initialSesi }: Props) {
  const [activeTab, setActiveTab] = useState('penilaian')
  const [sesi, setSesi] = useState<ActiveSesi | null>(initialSesi)
  const [lastUpdate, setLastUpdate] = useState(new Date())

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
    const interval = setInterval(pollSesi, 5000)
    return () => clearInterval(interval)
  }, [pollSesi])

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="glass-card p-10">
          <div className="text-5xl mb-4">📖</div>
          <h2 className="font-display text-2xl font-semibold text-white mb-2">
            Belum Ada Event Aktif
          </h2>
          <p className="text-slate-400 text-sm max-w-sm">
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
          <p className="text-slate-400 text-sm mt-1">
            {activeEvent.nama}
          </p>
        </div>
        <div className="text-right">
          <span className="badge badge-gold">
            {profile.nama}
          </span>
          <p className="text-xs text-slate-500 mt-1">
            Update: {lastUpdate.toLocaleTimeString('id-ID')}
          </p>
        </div>
      </div>

      {/* Active Performer Banner */}
      {sesi?.peserta ? (
        <div className="performer-banner animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
                Sedang Tampil
              </p>
              <h2 className="font-display text-2xl font-bold text-white">
                {sesi.peserta.nama}
              </h2>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-sm text-slate-300">{sesi.peserta.asal_jemaat}</span>
                {sesi.peserta.nomor_undian && (
                  <span className="badge badge-gold text-xs">No. {sesi.peserta.nomor_undian}</span>
                )}
                {sesi.kategori && (
                  <span className="badge badge-info text-xs">{sesi.kategori.nama}</span>
                )}
              </div>
            </div>
            {sesi.peserta.mazmur_bacaan && (
              <div className="text-right ml-4">
                <p className="text-xs text-slate-500 mb-1">Mazmur</p>
                <p className="font-display text-lg font-semibold text-amber-300">
                  {sesi.peserta.mazmur_bacaan}
                </p>
              </div>
            )}
          </div>
          {sesi.pengumuman && (
            <div className="mt-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
              📢 {sesi.pengumuman}
            </div>
          )}
        </div>
      ) : (
        <div className="performer-banner" style={{ borderColor: 'rgba(51,65,85,0.5)', background: 'rgba(30,41,59,0.3)' }}>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
            <p className="text-slate-400 text-sm">
              {sesi?.status === 'jeda'
                ? '⏸️ Sesi sedang dijeda. Tunggu instruksi berikutnya.'
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
    </div>
  )
}
