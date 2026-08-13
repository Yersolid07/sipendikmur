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
    const interval = setInterval(loadData, 3000) // refresh every 3s
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
    <div className="panel p-0 overflow-hidden">
      {/* Filter */}
      <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-3 flex-wrap bg-[var(--color-cream-1)]">
        <span className="text-xs text-[var(--color-text-muted)] font-semibold uppercase tracking-wide">Kategori:</span>
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
          <p className="text-[var(--color-text-muted)] text-sm">Belum ada nilai yang masuk</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-container">
            <thead className="table-header">
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
                <tr key={row.peserta_id} className="table-row">
                  <td>
                    <span className={`font-display text-lg font-bold rank-${row.ranking}`}>
                      {rankBadge(row.ranking)}
                    </span>
                  </td>
                  <td>
                    <div className="font-semibold text-[var(--color-text)]">{row.nama_peserta}</div>
                    {row.nomor_undian && (
                      <div className="text-xs text-[var(--color-text-muted)]">No. {row.nomor_undian}</div>
                    )}
                  </td>
                  <td className="hidden md:table-cell text-[var(--color-text-muted)]">{row.asal_jemaat}</td>
                  <td className="hidden md:table-cell">
                    <span className="badge badge-info text-xs px-2 py-0.5">{row.kategori}</span>
                  </td>
                  <td className="text-[var(--color-amber-dark)] font-semibold">{row.avg_interpretasi ?? '-'}</td>
                  <td className="text-blue-600 font-semibold">{row.avg_artikulasi ?? '-'}</td>
                  <td className="hidden sm:table-cell text-purple-600 font-semibold">{row.avg_penghayatan ?? '-'}</td>
                  <td className="hidden sm:table-cell text-green-600 font-semibold">{row.avg_penampilan ?? '-'}</td>
                  <td>
                    <span className={`font-display text-xl font-bold ${
                      row.ranking === 1 ? 'rank-1' : row.ranking === 2 ? 'rank-2' : row.ranking === 3 ? 'rank-3' : 'text-[var(--color-text)]'
                    }`}>
                      {row.nilai_akhir ?? '-'}
                    </span>
                    {row.potongan_nilai > 0 && (
                      <div className="text-xs text-red-600">-{row.potongan_nilai} potongan</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-cream-1)] text-right">
        <span className="text-xs text-[var(--color-text-muted)]">
          Auto-refresh setiap 3 detik · {filtered.length} peserta
        </span>
      </div>
    </div>
  )
}
