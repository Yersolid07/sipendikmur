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
    const interval = setInterval(loadData, 3000)
    return () => clearInterval(interval)
  }, [loadData])

  if (!activeEvent) {
    return (
      <div className="panel text-center">
        <p className="text-[var(--color-text-muted)]">Tidak ada event aktif untuk dimonitor.</p>
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
        <h3 className="font-display text-lg font-semibold text-[var(--color-text)]">
          📊 Monitor Nilai Real-time
        </h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          Update: {lastUpdate.toLocaleTimeString('id-ID')} · auto refresh 8s
        </span>
      </div>

      {/* Juri Status */}
      <div className="panel">
        <p className="text-xs text-[var(--color-text-muted)] font-semibold uppercase tracking-wide mb-3">Status Juri</p>
        <div className="flex flex-wrap gap-2">
          {juriList.map((j) => {
            const hasSubmitted = data.some((d) => d.juri_id === j.id && d.is_submitted)
            const hasDraft = data.some((d) => d.juri_id === j.id && !d.is_submitted)
            return (
              <div
                key={j.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
                  hasSubmitted
                    ? 'bg-green-100 border-green-300 text-green-800'
                    : hasDraft
                    ? 'bg-amber-100 border-amber-300 text-amber-800'
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  hasSubmitted ? 'bg-green-500' : hasDraft ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'
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
        <div className="panel flex justify-center">
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : Object.keys(byPeserta).length === 0 ? (
        <div className="panel text-center">
          <p className="text-[var(--color-text-muted)] text-sm">Belum ada nilai masuk</p>
        </div>
      ) : (
        Object.entries(byPeserta).map(([pesertaId, rows]) => {
          const pesertaNama = rows[0].peserta_nama
          const allSubmitted = rows.every((r) => r.is_submitted)
          const avgTotal = rows.filter((r) => r.is_submitted).length > 0
            ? (rows.filter((r) => r.is_submitted).reduce((s, r) => s + r.total, 0) / rows.filter((r) => r.is_submitted).length).toFixed(2)
            : null

          return (
            <div key={pesertaId} className="panel p-0 overflow-hidden">
              <div className="p-4 border-b border-[var(--color-border-dark)] bg-[var(--color-cream-2)] flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-[var(--color-text)]">{pesertaNama}</h4>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {rows.filter((r) => r.is_submitted).length}/{juriList.length} juri sudah submit
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  {avgTotal && (
                    <span className="font-display text-2xl font-bold text-[var(--color-text)]">{avgTotal}</span>
                  )}
                  {allSubmitted && <div className="badge badge-success text-xs py-0.5 px-2">✓ Semua submit</div>}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table-container">
                  <thead className="table-header">
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
                      <tr key={r.juri_id} className="table-row">
                        <td className="font-medium text-[var(--color-text)]">{r.juri_nama}</td>
                        <td className="text-red-600">{r.kekompakan ?? <span className="text-gray-400">-</span>}</td>
                        <td className="text-[var(--color-amber-dark)]">{r.interpretasi ?? <span className="text-gray-400">-</span>}</td>
                        <td className="text-blue-600">{r.artikulasi ?? <span className="text-gray-400">-</span>}</td>
                        <td className="hidden sm:table-cell text-purple-600">{r.penghayatan ?? <span className="text-gray-400">-</span>}</td>
                        <td className="hidden sm:table-cell text-green-600">{r.penampilan ?? <span className="text-gray-400">-</span>}</td>
                        <td className="font-bold text-[var(--color-text)]">{r.total.toFixed(1)}</td>
                        <td>
                          {r.is_submitted ? (
                            <span className="badge badge-success text-xs px-2 py-0.5">✓ Submit</span>
                          ) : (
                            <span className="badge badge-warning text-xs px-2 py-0.5">Draft</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
