'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, RekapPenilaian } from '@/types/database'
import { Trophy, Monitor, RefreshCw, Eye, EyeOff } from 'lucide-react'

interface Props {
  activeEvent: Event
}

export default function RekapLiveBoardTab({ activeEvent }: Props) {
  const [pesertaList, setPesertaList] = useState<RekapPenilaian[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [liveSettings, setLiveSettings] = useState<any>(activeEvent.live_settings || { show_leaderboard: false, sort_by: 'kategori', target_id: null })
  
  const [filterKategori, setFilterKategori] = useState('all')
  const [kategoriList, setKategoriList] = useState<{id: string, nama: string}[]>([])
  const supabase = createClient()

  async function loadData() {
    setIsLoading(true)
    const { data: katData } = await supabase.from('kategori').select('id, nama').eq('event_id', activeEvent.id)
    if (katData) setKategoriList(katData)

    const { data } = await supabase
      .from('v_rekap_penilaian')
      .select('*')
      .eq('event_id', activeEvent.id)
      .not('nilai_akhir', 'is', null) // Only those with final score
      .order('nilai_akhir', { ascending: false })
      
    if (data) setPesertaList(data as RekapPenilaian[])
    
    const { data: evData } = await supabase.from('events').select('live_settings').eq('id', activeEvent.id).single()
    if (evData && evData.live_settings) {
      setLiveSettings(evData.live_settings)
    }
    
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [activeEvent.id])

  async function updateLiveSettings(newSettings: any) {
    const updated = { ...liveSettings, ...newSettings }
    setLiveSettings(updated)
    await supabase.from('events').update({ live_settings: updated } as any).eq('id', activeEvent.id)
  }

  const filteredList = pesertaList.filter(p => filterKategori === 'all' || p.kategori_id === filterKategori)

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Settings Panel */}
      <div className="panel bg-gradient-to-br from-indigo-900 to-slate-900 border-none text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <h3 className="text-2xl font-display font-bold flex items-center gap-2 mb-2">
              <Monitor className="w-6 h-6 text-amber-400" /> Kontrol Layar Live Publik
            </h3>
            <p className="text-indigo-200 text-sm">
              Kelola apa yang ditampilkan pada URL <span className="font-mono bg-indigo-950/50 px-2 py-0.5 rounded text-amber-300">/live</span> untuk umum.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-indigo-100">Status Live:</span>
              <button 
                onClick={() => updateLiveSettings({ show_leaderboard: !liveSettings.show_leaderboard })}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${liveSettings.show_leaderboard ? 'bg-emerald-500' : 'bg-slate-500'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${liveSettings.show_leaderboard ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className={`text-sm font-bold ${liveSettings.show_leaderboard ? 'text-emerald-400' : 'text-slate-400'}`}>
                {liveSettings.show_leaderboard ? 'TAYANG' : 'SEMBUNYI'}
              </span>
            </div>
            
            <div className="h-8 w-px bg-white/20 hidden sm:block" />
            
            <select
              value={liveSettings.sort_by}
              onChange={(e) => updateLiveSettings({ sort_by: e.target.value })}
              className="bg-indigo-950/50 border border-white/20 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2 outline-none"
            >
              <option value="kategori">Tampilkan per Kategori</option>
              <option value="all">Tampilkan Keseluruhan (Global)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recap Table */}
      <div className="panel p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
             Rekapitulasi Nilai Akhir
          </h3>
          <div className="flex items-center gap-3">
            <select 
              value={filterKategori} 
              onChange={e => setFilterKategori(e.target.value)}
              className="form-input py-1.5 text-sm"
            >
              <option value="all">Semua Kategori</option>
              {kategoriList.map(k => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
            <button onClick={loadData} className="btn-secondary" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-sm text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-4 font-semibold w-16">Rank</th>
                <th className="py-4 px-4 font-semibold">Nama / Utusan</th>
                <th className="py-4 px-4 font-semibold">Kategori</th>
                <th className="py-4 px-4 font-semibold text-right">Nilai Akhir</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((p, idx) => (
                <tr key={p.peserta_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4">
                    {idx === 0 ? (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 font-bold border border-amber-200">
                        1
                      </span>
                    ) : idx === 1 ? (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold border border-slate-200">
                        2
                      </span>
                    ) : idx === 2 ? (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold border border-orange-200">
                        3
                      </span>
                    ) : (
                      <span className="font-bold text-slate-400 ml-2">{idx + 1}</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-800">{p.nama_peserta}</div>
                    <div className="text-xs text-slate-500">{p.asal_jemaat}</div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="badge badge-info text-xs px-2 py-1">{p.kategori}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-xl font-display font-bold text-emerald-600">
                      {p.nilai_akhir?.toFixed(3)}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredList.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p>Belum ada nilai akhir yang tercatat.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
