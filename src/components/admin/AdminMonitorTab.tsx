'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, Profile } from '@/types/database'

interface PenilaianRow {
  peserta_nama: string
  peserta_id: string
  juri_id: string
  juri_nama: string
  kekompakan: number | null
  interpretasi: number | null
  artikulasi: number | null
  penghayatan: number | null
  penampilan: number | null
  total: number
  is_submitted: boolean
}

interface Props {
  activeEvent: Event | null
  juriList: Profile[]
}

export default function AdminMonitorTab({ activeEvent, juriList }: Props) {
  const [data, setData] = useState<PenilaianRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const supabase = createClient()

  const loadData = useCallback(async () => {
    if (!activeEvent) return

    const { data: rows } = await supabase
      .from('penilaian')
      .select(`
        *,
        peserta:peserta_id(nama),
        juri:juri_id(nama)
      `)
      .order('updated_at', { ascending: false })

    const mapped = (rows ?? []).map((r: any) => ({
      peserta_nama: r.peserta?.nama ?? '-',
      peserta_id: r.peserta_id,
      juri_id: r.juri_id,
      juri_nama: r.juri?.nama ?? '-',
      kekompakan: r.kekompakan,
      interpretasi: r.interpretasi,
      artikulasi: r.artikulasi,
      penghayatan: r.penghayatan,
      penampilan: r.penampilan,
      total: r.total ?? 0,
      is_submitted: r.is_submitted,
    }))

    setData(mapped)
    setLastUpdate(new Date())
    setIsLoading(false)
  }, [activeEvent, supabase])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 8000)
    return () => clearInterval(interval)
  }, [loadData])

  if (!activeEvent) {
    return (
      <div className="glass-card p-10 text-center">
        <p className="text-slate-500">Tidak ada event aktif untuk dimonitor.</p>
      </div>
    )
  }

  // Group by peserta
  const byPeserta: Record<string, PenilaianRow[]> = {}
  data.forEach((d) => {
    if (!byPeserta[d.peserta_id]) byPeserta[d.peserta_id] = []
    byPeserta[d.peserta_id].push(d)
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-white">
          📊 Monitor Nilai Real-time
        </h3>
        <span className="text-xs text-slate-500">
          Update: {lastUpdate.toLocaleTimeString('id-ID')} · auto refresh 8s
        </span>
      </div>

      {/* Juri Status */}
      <div className="glass-card p-4">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">Status Juri</p>
        <div className="flex flex-wrap gap-2">
          {juriList.map((j) => {
            const hasSubmitted = data.some((d) => d.juri_id === j.id && d.is_submitted)
            const hasDraft = data.some((d) => d.juri_id === j.id && !d.is_submitted)
            return (
              <div
                key={j.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
                  hasSubmitted
                    ? 'bg-green-500/10 border-green-500/30 text-green-300'
                    : hasDraft
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-slate-700/30 border-slate-700 text-slate-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  hasSubmitted ? 'bg-green-400' : hasDraft ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'
                }`} />
                {j.nama}
                {hasSubmitted && ' ✓'}
                {hasDraft && ' (draft)'}
              </div>
            )
          })}
        </div>
      </div>

      {/* Penilaian table per peserta */}
      {isLoading ? (
        <div className="glass-card p-10 flex justify-center">
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : Object.keys(byPeserta).length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-slate-500 text-sm">Belum ada nilai masuk</p>
        </div>
      ) : (
        Object.entries(byPeserta).map(([pesertaId, rows]) => {
          const pesertaNama = rows[0].peserta_nama
          const allSubmitted = rows.every((r) => r.is_submitted)
          const avgTotal = rows.filter((r) => r.is_submitted).length > 0
            ? (rows.filter((r) => r.is_submitted).reduce((s, r) => s + r.total, 0) / rows.filter((r) => r.is_submitted).length).toFixed(2)
            : null

          return (
            <div key={pesertaId} className="glass-card overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-white">{pesertaNama}</h4>
                  <p className="text-xs text-slate-500">
                    {rows.filter((r) => r.is_submitted).length}/{juriList.length} juri sudah submit
                  </p>
                </div>
                <div className="text-right">
                  {avgTotal && (
                    <span className="font-display text-2xl font-bold text-amber-400">{avgTotal}</span>
                  )}
                  {allSubmitted && <div className="badge badge-success text-xs">✓ Semua submit</div>}
                </div>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Juri</th>
                    <th>Kompak</th>
                    <th>Interp</th>
                    <th>Artik</th>
                    <th className="hidden sm:table-cell">Pengh</th>
                    <th className="hidden sm:table-cell">Penamp</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.juri_id}>
                      <td className="font-medium text-white">{r.juri_nama}</td>
                      <td className="text-red-400">{r.kekompakan ?? <span className="text-slate-600">-</span>}</td>
                      <td className="text-amber-400">{r.interpretasi ?? <span className="text-slate-600">-</span>}</td>
                      <td className="text-blue-400">{r.artikulasi ?? <span className="text-slate-600">-</span>}</td>
                      <td className="hidden sm:table-cell text-purple-400">{r.penghayatan ?? <span className="text-slate-600">-</span>}</td>
                      <td className="hidden sm:table-cell text-green-400">{r.penampilan ?? <span className="text-slate-600">-</span>}</td>
                      <td className="font-bold text-white">{r.total.toFixed(1)}</td>
                      <td>
                        {r.is_submitted ? (
                          <span className="badge badge-success">✓ Submit</span>
                        ) : (
                          <span className="badge badge-warning">Draft</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })
      )}
    </div>
  )
}
