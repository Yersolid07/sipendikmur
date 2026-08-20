'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RekapPenilaian } from '@/types/database'
import { Trophy } from 'lucide-react'

interface Props {
  eventId: string
  sortBy: string
}

export default function LeaderboardView({ eventId, sortBy }: Props) {
  const [leaderboard, setLeaderboard] = useState<RekapPenilaian[]>([])
  const [kategoriList, setKategoriList] = useState<{id: string, nama: string}[]>([])
  
  const supabase = createClient()

  useEffect(() => {
    async function fetchLeaderboard() {
      // Ambil kategori untuk referensi
      const { data: katData } = await supabase.from('kategori').select('id, nama').eq('event_id', eventId).order('nama')
      if (katData) setKategoriList(katData)

      // Ambil seluruh rekap nilai
      const { data } = await supabase
        .from('v_rekap_penilaian')
        .select('*')
        .eq('event_id', eventId)
        .not('nilai_akhir', 'is', null)
        .order('nilai_akhir', { ascending: false })

      if (data) {
        setLeaderboard(data as RekapPenilaian[])
      }
    }

    fetchLeaderboard()

    // Realtime update
    const channel = supabase.channel('realtime_leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'peserta', filter: `event_id=eq.${eventId}` }, () => {
        fetchLeaderboard()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, () => {
        fetchLeaderboard()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  if (leaderboard.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <Trophy className="w-24 h-24 text-amber-500/20 mb-6" />
        <h2 className="text-3xl font-display font-light text-slate-400">Belum Ada Skor Final</h2>
        <p className="text-slate-500 mt-2">Leaderboard akan muncul setelah juri memfinalkan nilai.</p>
      </div>
    )
  }

  // Pengelompokan berdasarkan pengaturan sortBy
  const groupedData = useMemo(() => {
    if (sortBy === 'kategori') {
      return kategoriList.map(kat => ({
        title: kat.nama,
        items: leaderboard.filter(p => p.kategori_id === kat.id)
      })).filter(g => g.items.length > 0)
    } else {
      return [{ title: 'Leaderboard Global', items: leaderboard }]
    }
  }, [sortBy, kategoriList, leaderboard])

  return (
    <div className="w-full max-w-6xl mx-auto space-y-12 animate-fade-in">
      {groupedData.map((group, gIdx) => (
        <div key={gIdx} className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="text-center mb-8 relative z-10">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 uppercase tracking-widest">
              {group.title}
            </h2>
          </div>

          <div className="space-y-4 relative z-10">
            {group.items.map((p, idx) => (
              <div 
                key={p.peserta_id} 
                className={`flex items-center gap-4 p-4 md:p-6 rounded-2xl border transition-all duration-500 hover:scale-[1.01] ${
                  idx === 0 
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-900/20 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)]' 
                    : idx === 1 
                      ? 'bg-gradient-to-r from-slate-400/10 to-slate-600/10 border-slate-400/30' 
                      : idx === 2 
                        ? 'bg-gradient-to-r from-orange-500/10 to-orange-800/10 border-orange-500/30' 
                        : 'bg-white/5 border-white/5'
                }`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full font-display font-bold text-2xl md:text-3xl shrink-0 ${
                  idx === 0 ? 'bg-amber-500 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.5)]' :
                  idx === 1 ? 'bg-slate-300 text-slate-800' :
                  idx === 2 ? 'bg-orange-400 text-slate-900' :
                  'bg-white/10 text-slate-400'
                }`}>
                  {idx + 1}
                </div>
                
                <div className="flex-grow min-w-0">
                  <h3 className={`font-display font-bold truncate text-xl md:text-3xl ${idx === 0 ? 'text-amber-400' : 'text-white'}`}>
                    {p.nama_peserta}
                  </h3>
                  <p className="text-slate-400 text-sm md:text-lg truncate">
                    {p.asal_jemaat} {p.nomor_undian && `• Undian ${p.nomor_undian}`}
                  </p>
                </div>
                
                <div className="text-right shrink-0">
                  <div className={`font-display font-bold text-3xl md:text-5xl tracking-tighter ${
                    idx === 0 ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'text-white'
                  }`}>
                    {p.nilai_akhir?.toFixed(3)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
