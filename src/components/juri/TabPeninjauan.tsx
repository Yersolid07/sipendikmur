'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Event, Penilaian } from '@/types/database'

interface PenilaianWithPeserta extends Penilaian {
  peserta: { nama: string; asal_jemaat: string; nomor_undian: number | null }
}

interface Props {
  profile: Profile
  activeEvent: Event
}

export default function TabPeninjauan({ profile, activeEvent }: Props) {
  const [penilaianList, setPenilaianList] = useState<PenilaianWithPeserta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase
        .from('penilaian')
        .select(`
          *,
          peserta:peserta_id(nama, asal_jemaat, nomor_undian),
          sesi:sesi_id(event_id)
        `)
        .eq('juri_id', profile.id)
        .eq('sesi.event_id', activeEvent.id)
        .order('created_at', { ascending: false })

      setPenilaianList((data as PenilaianWithPeserta[]) ?? [])
      setIsLoading(false)
    }
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, activeEvent.id])

  const KRITERIA_COLORS: Record<string, string> = {
    interpretasi: '#c9a84c',
    artikulasi: '#3b82f6',
    penghayatan: '#a855f7',
    penampilan: '#22c55e',
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Daftar semua nilai yang sudah Anda inputkan dalam event ini.
      </p>

      {isLoading ? (
        <div className="glass-card p-10 flex justify-center">
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : penilaianList.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-slate-500 text-sm">Belum ada penilaian yang tercatat</p>
        </div>
      ) : (
        <div className="space-y-3">
          {penilaianList.map((p) => (
            <div key={p.id} className="glass-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-white">{p.peserta?.nama}</p>
                  <p className="text-xs text-slate-400">
                    {p.peserta?.asal_jemaat}
                    {p.peserta?.nomor_undian && ` · No. ${p.peserta.nomor_undian}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {p.is_submitted ? (
                    <span className="badge badge-success">✓ Submitted</span>
                  ) : (
                    <span className="badge badge-warning">Draft</span>
                  )}
                  <span className="font-display text-xl font-bold text-amber-400">
                    {p.total?.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Score bars */}
              <div className="grid grid-cols-2 gap-2">
                {(['interpretasi', 'artikulasi', 'penghayatan', 'penampilan'] as const).map((key) => {
                  const max = key === 'interpretasi' ? 25 : key === 'artikulasi' ? 22 : key === 'penghayatan' ? 20 : 18
                  const val = p[key] ?? 0
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500 capitalize">{key}</span>
                        <span style={{ color: KRITERIA_COLORS[key] }}>{val}</span>
                      </div>
                      <div className="h-1 rounded-full bg-slate-700">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(val / max) * 100}%`,
                            backgroundColor: KRITERIA_COLORS[key],
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {p.catatan && (
                <p className="text-xs text-slate-500 mt-2 italic border-t border-slate-700 pt-2">
                  💬 {p.catatan}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
