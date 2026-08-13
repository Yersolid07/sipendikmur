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

const GRADES = [
  { label: 'Grade 1', val: 1 },
  { label: 'Grade 1.5', val: 1.5 },
  { label: 'Grade 2', val: 2 },
  { label: 'Grade 2.5', val: 2.5 },
  { label: 'Grade 3', val: 3 },
  { label: 'Grade 3.5', val: 3.5 },
  { label: 'Grade 4', val: 4 },
  { label: 'Grade 4.5', val: 4.5 },
  { label: 'Grade 5', val: 5 },
]

export default function TabPenilaian({ profile, sesi, activeEvent }: Props) {
  const [scores, setScores] = useState<any>({
    kekompakan: 0,
    interpretasi: 0,
    artikulasi: 0,
    penghayatan: 0,
    penampilan: 0,
    catatan: '',
    perhatian: {
      clear_text: true,
      salah_kata: [] as number[],
      menambah_kata: [] as number[],
      mengurangi_kata: [] as number[],
    }
  })

  // State for Modals
  const [activeModal, setActiveModal] = useState<string | null>(null)
  
  const [showVarModal, setShowVarModal] = useState(false)
  const [varAlasan, setVarAlasan] = useState('')
  const [varLokasi, setVarLokasi] = useState('')
  
  // Dynamic criteria
  const k = sesi?.kategori
  const isBeregu = k?.jenis_lomba === 'beregu'
  
  const KRITERIA = []
  if (isBeregu) {
    KRITERIA.push({ key: 'kekompakan', label: 'Kekompakan', description: 'Keserasian dan harmoni tim', max: k?.maks_kekompakan || 30, color: '#ef4444' })
  }
  KRITERIA.push(
    { key: 'interpretasi', label: 'Interpretasi', description: 'Pemahaman & penyampaian makna', max: k?.maks_interpretasi || (isBeregu ? 20 : 35), color: '#c9a84c' },
    { key: 'penghayatan', label: 'Penghayatan', description: 'Kedalaman ekspresi dan rasa', max: k?.maks_penghayatan || (isBeregu ? 25 : 30), color: '#a855f7' },
    { key: 'artikulasi', label: 'Artikulasi', description: 'Kejelasan pelafalan', max: k?.maks_artikulasi || (isBeregu ? 20 : 25), color: '#3b82f6' },
    { key: 'penampilan', label: 'Penampilan', description: 'Sikap tubuh, busana', max: k?.maks_penampilan || (isBeregu ? 5 : 10), color: '#22c55e' }
  )
  
  const MAX_TOTAL = KRITERIA.reduce((sum, item) => sum + item.max, 0)

  const [existingPenilaian, setExistingPenilaian] = useState<Penilaian | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  // Score calculation: Grade (1-5) converted proportionally to Max Criteria
  const calculateTotal = () => {
    let sum = 0
    for (const k of KRITERIA) {
      const grade = scores[k.key] || 0
      if (grade > 0) {
        sum += (grade / 5) * k.max
      }
    }
    
    // Perhatian Deductions
    const p = scores.perhatian
    if (p) {
      if (!p.clear_text) sum -= 5 // penalty for clear text
      const mistakesCount = p.salah_kata.length + p.menambah_kata.length + p.mengurangi_kata.length
      sum -= mistakesCount // penalty of -1 per mistake
    }

    return Math.max(0, sum) // Ensure score doesn't go below 0
  }
  const total = calculateTotal()

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
        const p = data as Penilaian
        setExistingPenilaian(p)
        setIsSubmitted(p.is_submitted)
        // Note: we might have saved raw totals in DB before. For now, assume DB stores Grades 1-5.
        // We will need to update DB schema if we change from values to grades. 
        setScores({
          kekompakan: (p as any).kekompakan ?? 0,
          interpretasi: p.interpretasi ?? 0,
          artikulasi: p.artikulasi ?? 0,
          penghayatan: p.penghayatan ?? 0,
          penampilan: p.penampilan ?? 0,
          catatan: p.catatan ?? '',
          perhatian: (p as any).perhatian ?? { clear_text: true, salah_kata: [], menambah_kata: [], mengurangi_kata: [] }
        })
      } else {
        // Reset for new peserta
        setExistingPenilaian(null)
        setIsSubmitted(false)
        setScores({ kekompakan: 0, interpretasi: 0, artikulasi: 0, penghayatan: 0, penampilan: 0, catatan: '', perhatian: { clear_text: true, salah_kata: [], menambah_kata: [], mengurangi_kata: [] } })
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

    const p = scores.perhatian
    let potongan = 0
    if (p) {
      if (!p.clear_text) potongan += 5
      potongan += p.salah_kata.length + p.menambah_kata.length + p.mengurangi_kata.length
    }

    const payload = {
      sesi_id: sesi.id,
      peserta_id: sesi.peserta_aktif_id,
      juri_id: profile.id,
      kekompakan: isBeregu ? scores.kekompakan : null,
      interpretasi: scores.interpretasi,
      artikulasi: scores.artikulasi,
      penghayatan: scores.penghayatan,
      penampilan: scores.penampilan,
      catatan: scores.catatan,
      perhatian: scores.perhatian,
      potongan_perhatian: potongan,
      is_submitted: false,
    }

    if (existingPenilaian) {
      await supabase.from('penilaian').update(payload as any).eq('id', existingPenilaian.id)
    } else {
      const { data } = await supabase.from('penilaian').insert(payload as any).select().single()
      if (data) setExistingPenilaian(data as Penilaian)
    }
    showToast('success', 'Draft nilai tersimpan')
  }

  async function handleSubmit() {
    if (!sesi?.peserta_aktif_id || !sesi.id) return

    const allFilled = KRITERIA.every((k) => scores[k.key] > 0)
    if (!allFilled) {
      showToast('error', 'Semua kriteria harus diisi (Pilih Grade) sebelum submit!')
      return
    }

    setIsSubmitting(true)
    
    const p = scores.perhatian
    let potongan = 0
    if (p) {
      if (!p.clear_text) potongan += 5
      potongan += p.salah_kata.length + p.menambah_kata.length + p.mengurangi_kata.length
    }

    const payload = {
      sesi_id: sesi.id,
      peserta_id: sesi.peserta_aktif_id,
      juri_id: profile.id,
      kekompakan: isBeregu ? scores.kekompakan : null,
      interpretasi: scores.interpretasi,
      artikulasi: scores.artikulasi,
      penghayatan: scores.penghayatan,
      penampilan: scores.penampilan,
      catatan: scores.catatan,
      perhatian: scores.perhatian,
      potongan_perhatian: potongan,
      is_submitted: true,
    }

    if (existingPenilaian) {
      await supabase.from('penilaian').update(payload as any).eq('id', existingPenilaian.id)
    } else {
      await supabase.from('penilaian').insert(payload as any)
    }

    setIsSubmitting(false)
    setIsSubmitted(true)
    showToast('success', 'Nilai berhasil disubmit!')
  }

  async function handleAjukanVAR(e: React.FormEvent) {
    e.preventDefault()
    if (!existingPenilaian || !sesi?.peserta_aktif_id) return
    setIsSubmitting(true)
    
    // 1. Catat Request VAR
    const varPayload = {
      penilaian_id: existingPenilaian.id,
      peserta_id: sesi.peserta_aktif_id,
      requested_by: profile.id,
      requested_role: 'juri',
      alasan: varAlasan,
      lokasi_teks: varLokasi,
      status: 'approved', // Juri langsung disetujui untuk VAR sendiri
      resolved_at: new Date().toISOString()
    }
    await supabase.from('var_requests').insert(varPayload as any)

    // 2. Unlock Penilaian
    await supabase.from('penilaian').update({ is_submitted: false } as any).eq('id', existingPenilaian.id)
    
    setIsSubmitting(false)
    setIsSubmitted(false)
    setShowVarModal(false)
    setVarAlasan('')
    setVarLokasi('')
    showToast('success', 'VAR dicatat. Silakan revisi nilai Anda.')
  }

  if (!sesi?.peserta) {
    return (
      <div className="panel p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-cream-2)] border border-[var(--color-border-dark)] flex items-center justify-center mx-auto mb-4 animate-pulse">
          ⏳
        </div>
        <h3 className="font-display text-xl text-[var(--color-text)] mb-2">Menunggu Peserta</h3>
        <p className="text-[var(--color-text-muted)] text-sm">
          Operator Sesi belum memulai penampilan peserta.
        </p>
      </div>
    )
  }

  const isLocked = isSubmitted || sesi.nilai_dikunci

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Peserta Banner */}
      <div className="panel p-6 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
        
        <div className="flex justify-between items-start">
          <div>
            <div className="inline-block px-3 py-1 rounded-full bg-[var(--color-cream-2)] border border-[var(--color-border-dark)] text-[var(--color-amber-dark)] text-xs font-bold tracking-widest uppercase mb-3">
              {sesi.kategori?.nama} • Peserta {sesi.peserta.nomor_undian}
            </div>
            <h2 className="font-display text-3xl font-bold text-[var(--color-text)] mb-1">
              {sesi.peserta.nama}
            </h2>
            <p className="text-[var(--color-text-muted)]">{sesi.peserta.asal_jemaat}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Nilai Akhir Anda</div>
            <div className="text-4xl font-display font-bold text-[var(--color-amber-dark)]">
              {total.toFixed(2)}
            </div>
          </div>
        </div>

        {sesi.peserta.mazmur_bacaan && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border-dark)]">
            <span className="text-xs text-[var(--color-text-muted)] uppercase">Bacaan Mazmur</span>
            <p className="text-lg text-blue-600 font-semibold">{sesi.peserta.mazmur_bacaan}</p>
          </div>
        )}
      </div>

      {/* Grid Kriteria (UI Overhaul to match old app) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        {KRITERIA.map((k) => (
          <button 
            key={k.key}
            disabled={isLocked}
            onClick={() => setActiveModal(k.key)}
            className={`p-8 rounded-2xl border transition-all duration-300 font-display font-semibold text-xl text-center shadow-lg relative overflow-hidden group
              ${scores[k.key] > 0 
                ? 'bg-gradient-to-br from-amber-600 to-amber-700 border-amber-400 text-white shadow-[0_0_20px_rgba(217,119,6,0.4)]' 
                : 'bg-[var(--color-cream-1)] border-[var(--color-border)] hover:bg-[var(--color-cream-2)] hover:border-[var(--color-amber-dark)] text-[var(--color-text)]'}`}
          >
            <span className="relative z-10">{k.label}</span>
            {scores[k.key] > 0 && (
              <span className="block text-sm font-normal opacity-90 mt-2 relative z-10">
                Grade: {scores[k.key]}
              </span>
            )}
            
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}

        {/* Perhatian Button */}
        <button 
          disabled={isLocked}
          onClick={() => setActiveModal('perhatian')}
          className="p-8 sm:col-span-2 rounded-2xl border-2 bg-[var(--color-cream-1)] border-red-200 hover:bg-red-50 hover:border-red-400 transition-all duration-300 font-display font-semibold text-xl text-red-600 shadow-lg"
        >
          Perhatian (Pengurang Nilai)
        </button>

        {/* Catatan */}
        <div className="sm:col-span-2 panel p-6 mt-4">
          <label className="form-label text-[var(--color-amber-dark)] font-display text-lg mb-3 block">Catatan Juri</label>
          <textarea
            disabled={isLocked}
            value={scores.catatan}
            onChange={(e) => setScores({ ...scores, catatan: e.target.value })}
            className="w-full bg-white border border-[var(--color-border)] rounded-xl p-4 text-[var(--color-text)] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
            rows={4}
            placeholder="Tulis catatan untuk peserta ini..."
          />
        </div>
      </div>

      {/* Grade Selection Modal */}
      {activeModal && activeModal !== 'perhatian' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-50 text-slate-900 w-full max-w-lg rounded-3xl p-6 md:p-8 animate-fade-in-up shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-2xl font-bold text-amber-900 capitalize">
                {activeModal}
              </h3>
              <button 
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300"
              >
                ✕
              </button>
            </div>
            
            <p className="text-slate-500 mb-6 text-sm">Pilih grade yang paling sesuai dengan penampilan peserta.</p>

            <div className="space-y-3">
              {GRADES.map(g => (
                <button
                  key={g.val}
                  onClick={() => {
                    setScores({ ...scores, [activeModal]: g.val })
                    setActiveModal(null)
                  }}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 group
                    ${scores[activeModal] === g.val 
                      ? 'border-amber-600 bg-amber-50' 
                      : 'border-slate-200 hover:border-amber-400 hover:bg-slate-100'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg
                    ${scores[activeModal] === g.val ? 'bg-amber-800 text-white' : 'bg-slate-200 text-slate-600 group-hover:bg-amber-100'}`}>
                    {g.val}
                  </div>
                  <div>
                    <div className={`font-bold ${scores[activeModal] === g.val ? 'text-amber-900' : 'text-slate-700'}`}>
                      {g.label}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Perhatian Modal */}
      {activeModal === 'perhatian' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-50 text-slate-900 w-full max-w-2xl rounded-3xl p-6 md:p-8 animate-fade-in-up shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-2xl font-bold text-red-900">Perhatian</h3>
              <button 
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300"
              >
                ✕
              </button>
            </div>
            
            <p className="text-slate-500 mb-6 text-sm">Centang setiap ayat yang mengalami masalah pada aspek terkait.</p>

            <div className="space-y-6">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-semibold text-slate-800 mb-3">1. Clear Text</h4>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setScores({ ...scores, perhatian: { ...scores.perhatian, clear_text: true }})}
                    className={`flex-1 py-3 rounded-xl border font-medium ${scores.perhatian.clear_text ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                  >
                    Ya
                  </button>
                  <button 
                    onClick={() => setScores({ ...scores, perhatian: { ...scores.perhatian, clear_text: false }})}
                    className={`flex-1 py-3 rounded-xl font-medium ${!scores.perhatian.clear_text ? 'bg-red-600 text-white' : 'border border-red-200 text-red-600 hover:bg-red-50'}`}
                  >
                    Tidak
                  </button>
                </div>
              </div>

              {[
                { id: 'salah_kata', label: '2. Salah kata' },
                { id: 'menambah_kata', label: '3. Menambah kata' },
                { id: 'mengurangi_kata', label: '4. Mengurangi kata' }
              ].map(section => (
                <div key={section.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="font-semibold text-slate-800 mb-3">{section.label}</h4>
                  <div className="flex flex-wrap gap-2">
                    {[1,2,3,4,5,6,7,8].map(ayat => {
                      const isActive = scores.perhatian[section.id].includes(ayat)
                      return (
                        <button 
                          key={ayat} 
                          onClick={() => {
                            const arr = [...scores.perhatian[section.id]]
                            if (isActive) {
                              arr.splice(arr.indexOf(ayat), 1)
                            } else {
                              arr.push(ayat)
                            }
                            setScores({ ...scores, perhatian: { ...scores.perhatian, [section.id]: arr } })
                          }}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${isActive ? 'bg-red-600 border-red-600 text-white' : 'border-slate-200 text-slate-600 hover:border-red-400 hover:text-red-600'}`}
                        >
                          Ayat {ayat}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-end">
               <button onClick={() => setActiveModal(null)} className="px-6 py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700">
                 Simpan Perubahan
               </button>
            </div>
          </div>
        </div>
      )}


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
        <div className="panel p-4 text-center border-green-500/30 bg-green-50">
          <p className="text-green-600 font-semibold mb-2">
            ✅ Nilai telah disubmit untuk peserta ini
          </p>
          {!sesi.nilai_dikunci && (
            <button onClick={() => setShowVarModal(true)} className="btn-secondary text-sm">
              🎥 Ajukan VAR (Revisi Nilai)
            </button>
          )}
          {sesi.nilai_dikunci && (
            <p className="text-[var(--color-amber-dark)] text-xs mt-2">
              🔒 Sesi ini sudah dikunci oleh IP. Anda tidak dapat mengajukan VAR.
            </p>
          )}
        </div>
      )}

      {/* Modal VAR */}
      {showVarModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="panel w-full max-w-md p-6 animate-fade-in-up">
            <h3 className="font-display text-xl font-semibold text-[var(--color-text)] mb-4">Pengajuan VAR</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Silakan tuliskan alasan Anda melakukan revisi nilai. Formulir nilai Anda akan terbuka kembali setelah ini.
            </p>
            <form onSubmit={handleAjukanVAR} className="space-y-4">
              <div>
                <label className="form-label">Alasan Revisi / VAR *</label>
                <textarea
                  required
                  value={varAlasan}
                  onChange={(e) => setVarAlasan(e.target.value)}
                  className="form-input resize-none"
                  rows={3}
                  placeholder="Contoh: Kesalahan input nilai, cek ulang rekaman..."
                />
              </div>
              <div>
                <label className="form-label">Lokasi Teks / Menit (Opsional)</label>
                <input
                  type="text"
                  value={varLokasi}
                  onChange={(e) => setVarLokasi(e.target.value)}
                  className="form-input"
                  placeholder="Contoh: Mazmur 23:2 atau Menit 02:15"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVarModal(false)}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  Buka Kunci Nilai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type} z-[200]`}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}
    </div>
  )
}
