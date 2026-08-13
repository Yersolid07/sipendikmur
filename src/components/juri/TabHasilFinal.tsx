'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, RekapPenilaian } from '@/types/database'

interface Props {
  activeEvent: Event
}

export default function TabHasilFinal({ activeEvent }: Props) {
  const [data, setData] = useState<RekapPenilaian[]>([])
  const [selectedKategori, setSelectedKategori] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  async function loadData() {
    const { data: rekap } = await supabase
      .from('v_rekap_penilaian')
      .select('*')
      .eq('event_id', activeEvent.id)
      .order('ranking', { ascending: true })

    setData(rekap ?? [])
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000) // refresh every 10s
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEvent.id])

  const kategoriList = [...new Set(data.map((d) => d.kategori))]
  const filtered = selectedKategori === 'all'
    ? data
    : data.filter((d) => d.kategori === selectedKategori)

  function rankBadge(rank: number | null) {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return rank ?? '-'
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Filter */}
      <div className="p-4 border-b border-slate-700 flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Kategori:</span>
        <button
          onClick={() => setSelectedKategori('all')}
          className={`tab-item text-xs py-1 px-3 ${selectedKategori === 'all' ? 'active' : ''}`}
          style={{ flex: 'none' }}
        >
          Semua
        </button>
        {kategoriList.map((k) => (
          <button
            key={k}
            onClick={() => setSelectedKategori(k)}
            className={`tab-item text-xs py-1 px-3 ${selectedKategori === k ? 'active' : ''}`}
            style={{ flex: 'none' }}
          >
            {k}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-10 flex justify-center">
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-slate-500 text-sm">Belum ada nilai yang masuk</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Nama Peserta</th>
                <th className="hidden md:table-cell">Jemaat</th>
                <th className="hidden md:table-cell">Kategori</th>
                <th>Interpretasi</th>
                <th>Artikulasi</th>
                <th className="hidden sm:table-cell">Penghayatan</th>
                <th className="hidden sm:table-cell">Penampilan</th>
                <th>Nilai Akhir</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.peserta_id}>
                  <td>
                    <span className={`font-display text-lg font-bold rank-${row.ranking}`}>
                      {rankBadge(row.ranking)}
                    </span>
                  </td>
                  <td>
                    <div className="font-semibold text-white">{row.nama_peserta}</div>
                    {row.nomor_undian && (
                      <div className="text-xs text-slate-500">No. {row.nomor_undian}</div>
                    )}
                  </td>
                  <td className="hidden md:table-cell text-slate-300">{row.asal_jemaat}</td>
                  <td className="hidden md:table-cell">
                    <span className="badge badge-info">{row.kategori}</span>
                  </td>
                  <td className="text-amber-400">{row.avg_interpretasi ?? '-'}</td>
                  <td className="text-blue-400">{row.avg_artikulasi ?? '-'}</td>
                  <td className="hidden sm:table-cell text-purple-400">{row.avg_penghayatan ?? '-'}</td>
                  <td className="hidden sm:table-cell text-green-400">{row.avg_penampilan ?? '-'}</td>
                  <td>
                    <span className={`font-display text-xl font-bold ${
                      row.ranking === 1 ? 'rank-1' : row.ranking === 2 ? 'rank-2' : row.ranking === 3 ? 'rank-3' : 'text-white'
                    }`}>
                      {row.nilai_akhir ?? '-'}
                    </span>
                    {row.potongan_nilai > 0 && (
                      <div className="text-xs text-red-400">-{row.potongan_nilai} potongan</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-3 border-t border-slate-700 text-right">
        <span className="text-xs text-slate-500">
          Auto-refresh setiap 10 detik · {filtered.length} peserta
        </span>
      </div>
    </div>
  )
}
