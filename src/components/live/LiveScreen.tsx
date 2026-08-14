'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, Setting, Sesi } from '@/types/database'

type ActiveSesi = Sesi & {
  peserta: { id: string; nama: string; mazmur_bacaan: string | null; asal_jemaat: string } | null
  kategori: { id: string; nama: string; jenis_lomba: 'perorangan' | 'beregu' } | null
}

interface Props {
  activeEvent: Event | null
  settings: Setting | null
  initialSesi: ActiveSesi | null
}

export default function LiveScreen({ activeEvent, settings, initialSesi }: Props) {
  const [sesi, setSesi] = useState<ActiveSesi | null>(initialSesi)
  const [finalScore, setFinalScore] = useState<number | null>(null)
  
  const supabase = createClient()
  
  const loadScore = useCallback(async () => {
    if (sesi?.nilai_dikunci && sesi.peserta_aktif_id) {
      const { data } = await supabase
        .from('v_rekap_penilaian')
        .select('nilai_akhir')
        .eq('peserta_id', sesi.peserta_aktif_id)
        .single()
        
      if (data) setFinalScore(data.nilai_akhir)
    } else {
      setFinalScore(null)
    }
  }, [sesi?.nilai_dikunci, sesi?.peserta_aktif_id, supabase])

  const loadSesi = useCallback(async () => {
    if (!activeEvent) return
    const { data } = await supabase
      .from('sesi')
      .select('*, peserta:peserta_aktif_id(id, nama, mazmur_bacaan, asal_jemaat), kategori:kategori_id(id, nama, jenis_lomba)')
      .eq('event_id', activeEvent.id)
      .neq('status', 'selesai')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      
    setSesi((data as unknown as ActiveSesi) || null)
  }, [activeEvent, supabase])

  useEffect(() => {
    loadScore()
  }, [sesi?.nilai_dikunci, loadScore])

  useEffect(() => {
    const channel = supabase.channel('realtime_live_screen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sesi' }, () => {
        loadSesi()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'peserta' }, () => {
        loadScore()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadSesi, loadScore, supabase])

  if (!activeEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <h1 className="text-4xl font-display font-bold text-slate-500">Tidak ada event aktif</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-between overflow-hidden relative">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e1b4b] -z-10" />
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-500/20 blur-[120px] rounded-full -z-10 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full -z-10 pointer-events-none" />

      {/* Header */}
      <header className="p-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {settings?.logo_url ? (
            <img src={settings?.logo_url || '/Simbol_GMIM_free.png'} alt="Logo" className="h-16 object-contain" />
          ) : (
             <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-500 flex items-center justify-center shadow-[0_0_30px_rgba(201,168,76,0.3)]">
                <svg width="32" height="32" viewBox="0 0 18 18" fill="none">
                  <rect x="7.5" y="1" width="3" height="16" rx="1" fill="white" opacity="0.9"/>
                  <rect x="3" y="6" width="12" height="3" rx="1" fill="white" opacity="0.9"/>
                </svg>
              </div>
          )}
          <div>
            <h1 className="text-3xl font-display font-bold text-gold-gradient tracking-wide uppercase">
              {settings?.nama_penyelenggara || 'Sistem Penjurian GMIM'}
            </h1>
            <p className="text-xl text-slate-400 mt-1">{activeEvent.nama}</p>
          </div>
        </div>
        <div className="text-right">
          {sesi?.status === 'berjalan' && !sesi.nilai_dikunci && (
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 font-bold tracking-widest uppercase text-sm">LIVE</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in-up">
        {sesi?.peserta ? (
          <div className="text-center space-y-8 w-full max-w-5xl">
            <div className="inline-block px-6 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 text-amber-400 font-semibold tracking-widest uppercase mb-4">
              {sesi.kategori?.nama}
            </div>
            
            <h2 className="text-6xl md:text-8xl font-display font-bold text-white drop-shadow-2xl leading-tight">
              {sesi.peserta.nama}
            </h2>
            
            <div className="text-3xl md:text-4xl text-slate-300 font-light mt-4">
              {sesi.peserta.asal_jemaat}
            </div>

            {sesi.peserta.mazmur_bacaan && (
              <div className="mt-8">
                <span className="text-xl text-slate-500 uppercase tracking-widest">Mazmur Bacaan</span>
                <p className="text-4xl font-display font-semibold text-blue-400 mt-2 drop-shadow-lg">
                  {sesi.peserta.mazmur_bacaan}
                </p>
              </div>
            )}

            {/* Score Reveal */}
            <div className={`mt-16 transition-all duration-1000 transform ${sesi.nilai_dikunci && finalScore !== null ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10'}`}>
              <div className="inline-block p-1 bg-gradient-to-br from-amber-400 via-amber-200 to-amber-600 rounded-3xl shadow-[0_0_50px_rgba(251,191,36,0.3)]">
                <div className="bg-[#0f172a] rounded-[22px] px-16 py-8">
                  <p className="text-sm font-semibold text-amber-500 uppercase tracking-widest mb-2">Nilai Akhir</p>
                  <div className="text-8xl md:text-[140px] font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
                    {finalScore?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center opacity-50">
            <h2 className="text-4xl font-display font-light text-white">Menunggu Penampilan Berikutnya...</h2>
          </div>
        )}
      </main>

      {/* Footer ticker / Pengumuman */}
      {sesi?.pengumuman && (
        <div className="bg-amber-500 text-slate-900 overflow-hidden py-3 shadow-[0_0_20px_rgba(245,158,11,0.2)] relative z-10">
          <div className="whitespace-nowrap inline-block animate-[scroll_20s_linear_infinite] font-semibold text-xl">
            📢 {sesi.pengumuman} &nbsp; • &nbsp; 📢 {sesi.pengumuman} &nbsp; • &nbsp; 📢 {sesi.pengumuman}
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scroll {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
      `}} />
    </div>
  )
}
