'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Event, Sesi, Peserta, Kategori, Penilaian } from '@/types/database'

type ActiveSesi = Sesi & {
  peserta: Peserta | null
  kategori: Kategori | null
}

interface Props {
  profile: Profile
  sesi: ActiveSesi | null
  activeEvent: Event
}

interface ScoreState {
  interpretasi: number
  artikulasi: number
  penghayatan: number
  penampilan: number
  catatan: string
}

const KRITERIA = [
  {
    key: 'interpretasi' as const,
    label: 'Interpretasi',
    description: 'Pemahaman & penyampaian makna teologis teks Mazmur',
    max: 25,
    color: '#c9a84c',
  },
  {
    key: 'artikulasi' as const,
    label: 'Artikulasi',
    description: 'Kejelasan pelafalan, ketepatan vokal dan bunyi',
    max: 22,
    color: '#3b82f6',
  },
  {
    key: 'penghayatan' as const,
    label: 'Penghayatan',
    description: 'Kedalaman ekspresi dan rasa, suasana batin Mazmur',
    max: 20,
    color: '#a855f7',
  },
  {
    key: 'penampilan' as const,
    label: 'Penampilan',
    description: 'Sikap tubuh, kepercayaan diri, kesesuaian busana',
    max: 18,
    color: '#22c55e',
  },
]

const MAX_TOTAL = KRITERIA.reduce((sum, k) => sum + k.max, 0) // 85

export default function TabPenilaian({ profile, sesi, activeEvent }: Props) {
  const [scores, setScores] = useState<ScoreState>({
    interpretasi: 0,
    artikulasi: 0,
    penghayatan: 0,
    penampilan: 0,
    catatan: '',
  })
  const [existingPenilaian, setExistingPenilaian] = useState<Penilaian | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  const total = scores.interpretasi + scores.artikulasi + scores.penghayatan + scores.penampilan

  // Load existing penilaian for current peserta
  useEffect(() => {
    async function loadExisting() {
      if (!sesi?.peserta_aktif_id || !sesi.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      const { data } = await supabase
        .from('penilaian')
        .select('*')
        .eq('sesi_id', sesi.id)
        .eq('peserta_id', sesi.peserta_aktif_id)
        .eq('juri_id', profile.id)
        .single()

      if (data) {
        setExistingPenilaian(data)
        setIsSubmitted(data.is_submitted)
        setScores({
          interpretasi: data.interpretasi ?? 0,
          artikulasi: data.artikulasi ?? 0,
          penghayatan: data.penghayatan ?? 0,
          penampilan: data.penampilan ?? 0,
          catatan: data.catatan ?? '',
        })
      } else {
        // Reset for new peserta
        setExistingPenilaian(null)
        setIsSubmitted(false)
        setScores({ interpretasi: 0, artikulasi: 0, penghayatan: 0, penampilan: 0, catatan: '' })
      }
      setIsLoading(false)
    }

    loadExisting()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesi?.id, sesi?.peserta_aktif_id, profile.id])

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSaveDraft() {
    if (!sesi?.peserta_aktif_id || !sesi.id) return

    const payload = {
      sesi_id: sesi.id,
      peserta_id: sesi.peserta_aktif_id,
      juri_id: profile.id,
      interpretasi: scores.interpretasi,
      artikulasi: scores.artikulasi,
      penghayatan: scores.penghayatan,
      penampilan: scores.penampilan,
      catatan: scores.catatan,
      is_submitted: false,
    }

    if (existingPenilaian) {
      await supabase.from('penilaian').update(payload).eq('id', existingPenilaian.id)
    } else {
      const { data } = await supabase.from('penilaian').insert(payload).select().single()
      if (data) setExistingPenilaian(data)
    }
    showToast('success', 'Draft nilai tersimpan')
  }

  async function handleSubmit() {
    if (!sesi?.peserta_aktif_id || !sesi.id) return

    const allFilled = KRITERIA.every((k) => scores[k.key] > 0)
    if (!allFilled) {
      showToast('error', 'Semua kriteria harus diisi sebelum submit!')
      return
    }

    setIsSubmitting(true)
    const payload = {
      sesi_id: sesi.id,
      peserta_id: sesi.peserta_aktif_id,
      juri_id: profile.id,
      interpretasi: scores.interpretasi,
      artikulasi: scores.artikulasi,
      penghayatan: scores.penghayatan,
      penampilan: scores.penampilan,
      catatan: scores.catatan,
      is_submitted: true,
      submitted_at: new Date().toISOString(),
    }

    let err
    if (existingPenilaian) {
      const res = await supabase.from('penilaian').update(payload).eq('id', existingPenilaian.id)
      err = res.error
    } else {
      const res = await supabase.from('penilaian').insert(payload)
      err = res.error
    }

    setIsSubmitting(false)
    if (err) {
      showToast('error', 'Gagal submit nilai. Coba lagi.')
    } else {
      setIsSubmitted(true)
      showToast('success', 'Nilai berhasil disubmit! ✓')
    }
  }

  if (!sesi?.peserta) {
    return (
      <div className="glass-card p-10 text-center">
        <div className="text-5xl mb-3">⏳</div>
        <h3 className="font-display text-xl font-semibold text-slate-300 mb-2">
          Menunggu Peserta
        </h3>
        <p className="text-slate-500 text-sm">
          Inspektur Pertandingan akan mengaktifkan peserta berikutnya.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="glass-card p-10 flex items-center justify-center">
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  const isLocked = isSubmitted || sesi.nilai_dikunci

  return (
    <div className="space-y-5">
      {/* Score Criteria */}
      <div className={`glass-card p-6 space-y-6 ${isLocked ? 'locked-overlay' : ''}`}>
        {KRITERIA.map((k) => {
          const pct = (scores[k.key] / k.max) * 100
          return (
            <div key={k.key}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-semibold text-white text-sm">{k.label}</span>
                  <p className="text-xs text-slate-500 mt-0.5">{k.description}</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-2xl font-bold font-display"
                    style={{ color: k.color }}
                  >
                    {scores[k.key].toFixed(1)}
                  </span>
                  <span className="text-slate-500 text-sm">/ {k.max}</span>
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={0}
                max={k.max}
                step={0.5}
                value={scores[k.key]}
                disabled={isLocked}
                onChange={(e) => setScores((s) => ({ ...s, [k.key]: parseFloat(e.target.value) }))}
                className="score-track"
                style={{
                  background: `linear-gradient(to right, ${k.color} ${pct}%, #334155 ${pct}%)`,
                }}
              />

              {/* Quick preset buttons */}
              {!isLocked && (
                <div className="flex gap-1 mt-2">
                  {[
                    Math.round(k.max * 0.6),
                    Math.round(k.max * 0.7),
                    Math.round(k.max * 0.8),
                    Math.round(k.max * 0.9),
                    k.max,
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setScores((s) => ({ ...s, [k.key]: preset }))}
                      className="text-xs px-2 py-0.5 rounded border border-slate-600 text-slate-400 hover:border-amber-500 hover:text-amber-400 transition-all"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Total Score */}
      <div className="glass-card-dark p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Total Nilai</p>
          <p className="text-xs text-slate-500 mt-0.5">dari {MAX_TOTAL} maksimal</p>
        </div>
        <div className="text-right">
          <span className="score-display">{total.toFixed(1)}</span>
          <div className="w-32 h-1.5 rounded-full bg-slate-700 mt-2 ml-auto">
            <div
              className="h-full rounded-full bg-gold-gradient transition-all duration-300"
              style={{ width: `${(total / MAX_TOTAL) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Catatan */}
      <div>
        <label className="form-label">Catatan Juri (Opsional)</label>
        <textarea
          value={scores.catatan}
          onChange={(e) => setScores((s) => ({ ...s, catatan: e.target.value }))}
          disabled={isLocked}
          className="form-input resize-none"
          rows={3}
          placeholder="Catatan atau komentar untuk peserta ini..."
        />
      </div>

      {/* Actions */}
      {!isLocked ? (
        <div className="flex gap-3">
          <button onClick={handleSaveDraft} className="btn-secondary flex-1">
            💾 Simpan Draft
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || total === 0}
            className="btn-primary flex-1"
          >
            {isSubmitting ? (
              <><span className="spinner" /> Menyimpan...</>
            ) : (
              '✓ Submit Nilai'
            )}
          </button>
        </div>
      ) : (
        <div className="glass-card p-4 text-center border-green-500/30 bg-green-500/5">
          <p className="text-green-400 font-semibold">
            ✅ Nilai telah disubmit untuk peserta ini
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Menunggu peserta berikutnya...
          </p>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}
    </div>
  )
}
