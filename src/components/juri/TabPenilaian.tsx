'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Event, Sesi, Peserta, Kategori, Penilaian } from '@/types/database'
import { CheckCircle2, Video, Lock } from 'lucide-react'
import { calculateTotalScore } from '@/lib/utils/score'

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
  { label: 'Grade 1', val: 1, desc: 'Sangat Kurang' },
  { label: 'Grade 1.5', val: 1.5, desc: 'Sangat Kurang (+)' },
  { label: 'Grade 2', val: 2, desc: 'Kurang' },
  { label: 'Grade 2.5', val: 2.5, desc: 'Kurang (+)' },
  { label: 'Grade 3', val: 3, desc: 'Cukup' },
  { label: 'Grade 3.5', val: 3.5, desc: 'Cukup (+)' },
  { label: 'Grade 4', val: 4, desc: 'Baik' },
  { label: 'Grade 4.5', val: 4.5, desc: 'Baik (+)' },
  { label: 'Grade 5', val: 5, desc: 'Sangat Baik' },
]

const CATATAN_ASPEK = [
  { id: 'kesan', label: '1. Kesan dari teks bacaan' },
  { id: 'penguasaan', label: '2. Penguasaan teks' },
  { id: 'emosi', label: '3. Emosi' },
  { id: 'ekspresi', label: '4. Ekspresi' },
  { id: 'intonasi', label: '5. Intonasi dan Irama' },
  { id: 'vokal', label: '6. Kesesuaian Vokal' },
  { id: 'penggunaan_kata', label: '7. Penggunaan kata dan kalimat sesuai teks bacaan' },
  { id: 'tanda_baca', label: '8. Sesuai Tanda Baca' },
  { id: 'penampilan_keserasian', label: '9. Keserasian Penampilan' },
  { id: 'penguasaan_panggung', label: '10. Penguasaan Panggung' },
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
    },
    catatan_aspek: {} as Record<string, number>
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

  // Score calculation
  const total = calculateTotalScore({
    kriteria: KRITERIA,
    scores,
    perhatian: scores.perhatian,
    catatan_aspek: scores.catatan_aspek,
    scale: { min: Number(k?.range_min ?? 0), max: Number(k?.range_max ?? 100) }
  })

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
        const storageKey = `juri_draft_${sesi.id}_${profile.id}`
        const local = localStorage.getItem(storageKey)
        let localScores = null
        if (local && !p.is_submitted) {
          try { localScores = JSON.parse(local) } catch(e) {}
        }

        setScores(localScores || {
          kekompakan: (p as any).kekompakan ?? 0,
          interpretasi: p.interpretasi ?? 0,
          artikulasi: p.artikulasi ?? 0,
          penghayatan: p.penghayatan ?? 0,
          penampilan: p.penampilan ?? 0,
          catatan: p.catatan ?? '',
          catatan_aspek: (p as any).catatan_aspek ?? {},
          perhatian: (p as any).perhatian ?? { clear_text: true }
        })
      } else {
        // Reset for new peserta
        setExistingPenilaian(null)
        setIsSubmitted(false)
        const storageKey = `juri_draft_${sesi.id}_${profile.id}`
        const local = localStorage.getItem(storageKey)
        let localScores = null
        if (local) {
          try { localScores = JSON.parse(local) } catch(e) {}
        }
        setScores(localScores || { kekompakan: 0, interpretasi: 0, artikulasi: 0, penghayatan: 0, penampilan: 0, catatan: '', catatan_aspek: {}, perhatian: { clear_text: true } })
      }
      setIsLoading(false)
    }

    loadExisting()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesi?.id, sesi?.peserta_aktif_id, profile.id])

  // Auto-save to localStorage
  useEffect(() => {
    if (isLoading || isSubmitted || !sesi?.id) return
    const storageKey = `juri_draft_${sesi.id}_${profile.id}`
    localStorage.setItem(storageKey, JSON.stringify(scores))
  }, [scores, isLoading, isSubmitted, sesi?.id, profile.id])

  // Body Scroll Lock for Modals
  useEffect(() => {
    if (activeModal || showVarModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [activeModal, showVarModal])

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSaveDraft() {
    if (!sesi?.peserta_aktif_id || !sesi.id) return

    const p = scores.perhatian
    let potongan = 0
    if (p && !p.clear_text) potongan += 5

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
      catatan_aspek: scores.catatan_aspek,
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

    const p = scores.perhatian
    const isCatatanWajib = p && !p.clear_text
    if (isCatatanWajib) {
      const allAspekFilled = CATATAN_ASPEK.every(a => scores.catatan_aspek[a.id])
      if (!allAspekFilled) {
        showToast('error', 'Semua aspek Catatan Juri WAJIB diisi karena Clear Text = "Tidak"!')
        return
      }
    }

    setIsSubmitting(true)
    
    let potongan = 0
    if (p && !p.clear_text) potongan += 5

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
      catatan_aspek: scores.catatan_aspek,
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
            <span className="block relative z-10 text-2xl mb-1">{k.label}</span>
            <span className={`block relative z-10 text-sm font-normal mb-2 ${scores[k.key] > 0 ? 'text-amber-100' : 'text-slate-500'}`}>
              {k.description}
            </span>
            {scores[k.key] > 0 && (
              <span className="inline-block text-sm font-bold relative z-10 text-white bg-black/20 rounded-full px-4 py-1.5">
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
          className="p-8 rounded-2xl border-2 bg-[var(--color-cream-1)] border-amber-300 hover:bg-amber-50 hover:border-amber-400 transition-all duration-300 font-display font-semibold text-xl text-amber-800 shadow-lg text-center"
        >
          Perhatian
        </button>

        {/* Catatan Juri Button */}
        <button 
          disabled={isLocked}
          onClick={() => setActiveModal('catatan_juri')}
          className={`p-8 rounded-2xl border-2 transition-all duration-300 font-display font-semibold text-xl text-center shadow-lg relative overflow-hidden group
            ${Object.keys(scores.catatan_aspek).length > 0 
              ? 'bg-gradient-to-br from-amber-600 to-amber-700 border-amber-400 text-white shadow-[0_0_20px_rgba(217,119,6,0.4)]' 
              : 'bg-[var(--color-cream-1)] border-[var(--color-border)] hover:bg-[var(--color-cream-2)] hover:border-[var(--color-amber-dark)] text-[var(--color-text)]'}`}
        >
          Catatan Juri
        </button>
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
                    <div className={`text-xs mt-0.5 font-medium ${scores[activeModal] === g.val ? 'text-amber-700' : 'text-slate-500'}`}>
                      {g.desc}
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
                <p className="text-sm text-slate-500 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  Untuk kesalahan lebih rinci seperti salah kata, menambah kata, atau mengurangi kata, mohon tuliskan langsung di bagian <strong>Catatan Umum</strong>.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-end">
               <button onClick={() => setActiveModal(null)} className="px-6 py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700">
                 Simpan Perubahan
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Catatan Juri Modal */}
      {activeModal === 'catatan_juri' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-50 text-slate-900 w-full max-w-3xl rounded-3xl p-6 md:p-8 animate-fade-in-up shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-2xl font-bold text-amber-900">Catatan Juri</h3>
              <button 
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300"
              >
                ✕
              </button>
            </div>
            
            <p className="text-slate-500 mb-6 text-sm">Clear Text = "Tidak" &rarr; seluruh aspek WAJIB diisi (nilai 1-5).</p>

            <div className="space-y-4">
              {CATATAN_ASPEK.map(aspek => (
                <div key={aspek.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-800">{aspek.label}</h4>
                    {scores.perhatian && !scores.perhatian.clear_text && (
                      <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-semibold">Wajib</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(val => (
                      <button
                        key={val}
                        onClick={() => setScores({ ...scores, catatan_aspek: { ...scores.catatan_aspek, [aspek.id]: val } })}
                        className={`w-12 h-10 rounded-xl font-bold transition-colors border 
                          ${scores.catatan_aspek[aspek.id] === val 
                            ? 'bg-amber-600 border-amber-600 text-white' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-400'}`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="mt-4">
                <label className="font-semibold text-slate-800 block mb-2">Catatan Umum (Opsional)</label>
                <textarea
                  value={scores.catatan}
                  onChange={(e) => setScores({ ...scores, catatan: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                  rows={3}
                  placeholder="Berlaku untuk keseluruhan bacaan..."
                />
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-end gap-3">
               <button onClick={() => setActiveModal(null)} className="px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50">
                 Batal
               </button>
               <button onClick={() => setActiveModal(null)} className="px-6 py-3 bg-amber-800 text-white rounded-xl font-semibold hover:bg-amber-700">
                 Simpan
               </button>
            </div>
          </div>
        </div>
      )}


      {/* Actions / Bottom Bar */}
      {!isLocked ? (
        <div className="bg-[var(--color-cream-1)] border border-amber-500/30 rounded-3xl p-6 mt-8 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="text-[var(--color-text-muted)] text-sm font-medium">
              {KRITERIA.filter(k => scores[k.key] > 0).length + 2} dari {KRITERIA.length + 2} kriteria dinilai
              <div className="flex gap-2 mt-2">
                <button onClick={handleSaveDraft} className="text-xs text-amber-700 hover:text-amber-900 border border-amber-300 bg-amber-50 rounded-lg px-3 py-1">
                  💾 Simpan Draft
                </button>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-xs text-[var(--color-amber-dark)] font-bold tracking-widest uppercase mb-1">NILAI AKHIR</div>
              <div className="font-display text-4xl font-bold text-slate-900">{total.toFixed(3)}</div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || total === 0}
              className="bg-[#74232c] hover:bg-[#5a1b22] text-white px-8 py-3 rounded-2xl font-bold text-lg shadow-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2 min-w-[200px]"
            >
              {isSubmitting ? (
                <><span className="spinner" /> Kirim</>
              ) : (
                <><CheckCircle2 className="w-6 h-6" /> Kirim</>
              )}
            </button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -z-10" />
        </div>
      ) : (
        <div className="panel p-4 text-center border-green-500/30 bg-green-50">
          <p className="text-green-600 font-semibold mb-2">
            ✅ Nilai telah disubmit untuk peserta ini
          </p>
          {!sesi.nilai_dikunci && (
            <button onClick={() => setShowVarModal(true)} className="btn-secondary text-sm">
              <><Video className="w-5 h-5 inline mr-1" /> Ajukan VAR (Revisi Nilai)</>
            </button>
          )}
          {sesi.nilai_dikunci && (
            <p className="text-[var(--color-amber-dark)] text-xs mt-2">
              <Lock className="w-4 h-4 inline mr-1" /> Sesi ini sudah dikunci oleh IP. Anda tidak dapat mengajukan VAR.
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
