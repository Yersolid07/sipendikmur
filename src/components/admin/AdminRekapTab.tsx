'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, RekapPenilaian } from '@/types/database'

interface Props {
  activeEvent: Event | null
}

export default function AdminRekapTab({ activeEvent }: Props) {
  const [data, setData] = useState<RekapPenilaian[]>([])
  const [selectedKategori, setSelectedKategori] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!activeEvent) return
    async function load() {
      const { data: rows } = await supabase
        .from('v_rekap_penilaian')
        .select('*')
        .eq('event_id', activeEvent!.id)
        .order('ranking', { ascending: true })
      setData(rows ?? [])
      setIsLoading(false)
    }
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEvent?.id])

  const kategoriList = [...new Set(data.map((d) => d.kategori))]
  const filtered = selectedKategori === 'all' ? data : data.filter((d) => d.kategori === selectedKategori)

  async function exportToExcel() {
    setIsExporting(true)
    try {
      const XLSX = await import('xlsx')
      const wsData = [
        ['REKAP HASIL PENILAIAN BACA MAZMUR GMIM'],
        [activeEvent?.nama ?? ''],
        [''],
        ['No', 'Nama Peserta', 'Asal Jemaat', 'Kategori', 'Interpretasi', 'Artikulasi', 'Penghayatan', 'Penampilan', 'Rata-rata', 'Potongan', 'Nilai Akhir', 'Ranking'],
        ...filtered.map((r) => [
          r.nomor_undian ?? '',
          r.nama_peserta,
          r.asal_jemaat,
          r.kategori,
          r.avg_interpretasi ?? '',
          r.avg_artikulasi ?? '',
          r.avg_penghayatan ?? '',
          r.avg_penampilan ?? '',
          r.avg_total ?? '',
          r.potongan_nilai,
          r.nilai_akhir ?? '',
          r.ranking ?? '',
        ]),
      ]

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai')

      // Style header rows
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }]
      ws['!cols'] = [
        { wch: 6 }, { wch: 28 }, { wch: 25 }, { wch: 15 },
        { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 13 },
        { wch: 12 }, { wch: 12 }, { wch: 13 }, { wch: 10 },
      ]

      XLSX.writeFile(wb, `Rekap_Baca_Mazmur_GMIM_${new Date().toISOString().slice(0,10)}.xlsx`)
    } finally {
      setIsExporting(false)
    }
  }

  async function exportToPDF() {
    setIsExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'landscape' })

      // Header
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text('REKAP HASIL PENILAIAN BACA MAZMUR GMIM', 148, 20, { align: 'center' })
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(activeEvent?.nama ?? '', 148, 28, { align: 'center' })
      doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`, 148, 34, { align: 'center' })

      autoTable(doc, {
        startY: 42,
        head: [['No', 'Nama Peserta', 'Asal Jemaat', 'Kategori', 'Interp.', 'Artik.', 'Penghyt.', 'Penamp.', 'Rata²', 'Potong.', 'Nilai Akhir', 'Rank']],
        body: filtered.map((r) => [
          r.nomor_undian ?? '-',
          r.nama_peserta,
          r.asal_jemaat,
          r.kategori,
          r.avg_interpretasi ?? '-',
          r.avg_artikulasi ?? '-',
          r.avg_penghayatan ?? '-',
          r.avg_penampilan ?? '-',
          r.avg_total ?? '-',
          r.potongan_nilai > 0 ? `-${r.potongan_nilai}` : '0',
          r.nilai_akhir ?? '-',
          r.ranking ?? '-',
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [155, 126, 53], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      })

      doc.save(`Rekap_Baca_Mazmur_GMIM_${new Date().toISOString().slice(0,10)}.pdf`)
    } finally {
      setIsExporting(false)
    }
  }

  function rankBadge(rank: number | null) {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return rank ?? '-'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-display text-lg font-semibold text-white">🏆 Rekap Nilai Akhir</h3>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            disabled={isExporting || data.length === 0}
            className="btn-secondary text-sm"
          >
            {isExporting ? <span className="spinner" /> : '📊'} Export Excel
          </button>
          <button
            onClick={exportToPDF}
            disabled={isExporting || data.length === 0}
            className="btn-primary text-sm"
          >
            {isExporting ? <span className="spinner" /> : '📄'} Export PDF
          </button>
        </div>
      </div>

      {/* Filter kategori */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Kategori:</span>
        <button
          onClick={() => setSelectedKategori('all')}
          className={`tab-item text-xs py-1 px-3 ${selectedKategori === 'all' ? 'active' : ''}`}
          style={{ flex: 'none' }}
        >Semua</button>
        {kategoriList.map((k) => (
          <button
            key={k}
            onClick={() => setSelectedKategori(k)}
            className={`tab-item text-xs py-1 px-3 ${selectedKategori === k ? 'active' : ''}`}
            style={{ flex: 'none' }}
          >{k}</button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-500 text-sm">Belum ada data nilai yang masuk</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Nama Peserta</th>
                  <th className="hidden md:table-cell">Asal Jemaat</th>
                  <th className="hidden md:table-cell">Kategori</th>
                  <th>Interpretasi</th>
                  <th>Artikulasi</th>
                  <th className="hidden sm:table-cell">Penghayatan</th>
                  <th className="hidden sm:table-cell">Penampilan</th>
                  <th>Rata²</th>
                  <th className="hidden sm:table-cell">Potongan</th>
                  <th className="font-bold">Nilai Akhir</th>
                  <th className="hidden sm:table-cell">Juri</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.peserta_id}>
                    <td>
                      <span className={`font-display text-xl font-bold ${
                        r.ranking === 1 ? 'rank-1' : r.ranking === 2 ? 'rank-2' : r.ranking === 3 ? 'rank-3' : 'text-white'
                      }`}>
                        {rankBadge(r.ranking)}
                      </span>
                    </td>
                    <td>
                      <div className="font-semibold text-white">{r.nama_peserta}</div>
                      {r.nomor_undian && <div className="text-xs text-slate-500">No. {r.nomor_undian}</div>}
                      {r.mazmur_bacaan && <div className="text-xs text-amber-400">{r.mazmur_bacaan}</div>}
                    </td>
                    <td className="hidden md:table-cell text-slate-300">{r.asal_jemaat}</td>
                    <td className="hidden md:table-cell"><span className="badge badge-info">{r.kategori}</span></td>
                    <td className="text-amber-400">{r.avg_interpretasi ?? '-'}</td>
                    <td className="text-blue-400">{r.avg_artikulasi ?? '-'}</td>
                    <td className="hidden sm:table-cell text-purple-400">{r.avg_penghayatan ?? '-'}</td>
                    <td className="hidden sm:table-cell text-green-400">{r.avg_penampilan ?? '-'}</td>
                    <td className="text-slate-300">{r.avg_total ?? '-'}</td>
                    <td className="hidden sm:table-cell">
                      {r.potongan_nilai > 0 ? (
                        <span className="text-red-400">-{r.potongan_nilai}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td>
                      <span className={`font-display text-xl font-bold ${
                        r.ranking === 1 ? 'rank-1' : r.ranking === 2 ? 'rank-2' : r.ranking === 3 ? 'rank-3' : 'text-white'
                      }`}>
                        {r.nilai_akhir ?? '-'}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className="badge badge-info">{r.jumlah_juri_menilai} juri</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-3 border-t border-slate-700 text-right">
          <span className="text-xs text-slate-500">
            {filtered.length} peserta · Auto refresh 15 detik
          </span>
        </div>
      </div>
    </div>
  )
}
