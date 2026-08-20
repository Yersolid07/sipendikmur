'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Event, Sesi, Peserta, Kategori, Penilaian } from '@/types/database'
import { CheckCircle2, Video, Lock } from 'lucide-react'
import { calculateTotalScore } from '@/lib/utils/score'
import { logActivity } from '@/lib/utils/logActivity'

type ActiveSesi = Sesi & {
  peserta: Peserta | null
  kategori: Kategori | null
}

interface Props {
  profile: Profile
  sesi: ActiveSesi | null
  activeEvent: Event
  isJeda?: boolean
}

const getGradeDesc = (val: number, kriteriaKey: string | null) => {
  const baseDesc: Record<number, string> = {
    1: 'Sangat Kurang',
    1.5: 'Sangat Kurang (+)',
    2: 'Kurang',
    2.5: 'Kurang (+)',
    3: 'Cukup',
    3.5: 'Cukup (+)',
    4: 'Baik',
    4.5: 'Baik (+)',
    5: 'Sangat Baik',
  }
  
  if (!kriteriaKey) return baseDesc[val]

  const getSpecific = (v: number, dict: string[]) => {
    const isPlus = v % 1 !== 0
    const baseVal = Math.floor(v)
    const baseStr = dict[baseVal - 1]
    return isPlus ? `${baseStr} namun ada sedikit peningkatan kualitas.` : baseStr
  }

  if (kriteriaKey === 'interpretasi') {
    return getSpecific(val, [
      'Sama sekali tidak memahami/menangkap makna teks, penyampaian sangat melenceng.',
      'Banyak kekeliruan dalam penekanan makna teks, belum tergambar dengan jelas.',
      'Memahami makna teks secara dasar, namun penyampaian belum terlalu mendalam.',
      'Pemahaman makna teks baik, penekanan makna sudah cukup tepat.',
      'Pemahaman sangat mendalam, makna teks tersampaikan dengan sempurna.'
    ])
  }
  if (kriteriaKey === 'penghayatan') {
    return getSpecific(val, [
      'Datar, tanpa emosi, mimik/gestur tidak sesuai dengan konteks.',
      'Emosi kaku atau sering tidak relevan dengan teks yang dibaca.',
      'Emosi dan mimik mulai terlihat namun kurang konsisten.',
      'Penghayatan emosi, mimik, dan gestur tubuh sudah baik dan meyakinkan.',
      'Emosi sangat menyentuh, gestur dan mimik sangat natural dan menjiwai penuh.'
    ])
  }
  if (kriteriaKey === 'artikulasi') {
    return getSpecific(val, [
      'Pelafalan sangat tidak jelas, bergumam, intonasi kacau.',
      'Suara sering kurang jelas, pelafalan kata banyak yang keliru/tidak utuh.',
      'Suara cukup jelas terdengar, intonasi standar, pemenggalan kalimat lumayan.',
      'Pelafalan kata jelas, intonasi dinamis, dan pemenggalan kalimat teratur baik.',
      'Pelafalan sangat jernih, pemenggalan kata dan intonasi sangat memukau dan tepat.'
    ])
  }
  if (kriteriaKey === 'penampilan') {
    return getSpecific(val, [
      'Tidak rapi, postur sangat buruk, sangat gugup/gemetar.',
      'Kurang rapi, terlihat sering gelisah, pandangan tidak fokus.',
      'Kerapian standar, postur cukup baik, lumayan tenang di panggung.',
      'Rapi, postur tegap, percaya diri, dan tenang menguasai panggung.',
      'Sangat prima, penuh wibawa, ketenangan dan karisma sangat luar biasa.'
    ])
  }
  if (kriteriaKey === 'kekompakan') {
    return getSpecific(val, [
      'Sangat berantakan, suara/gerakan saling mendahului atau bertabrakan.',
      'Sering tidak sinkron, harmoni kurang terjaga.',
      'Cukup serempak namun sesekali goyah pada pergantian/transisi.',
      'Harmonis, pergantian suara/gerakan rapi dan sinkron.',
      'Sangat solid, harmoni, chemistry, dan kekompakan luar biasa tanpa cela.'
    ])
  }

  return baseDesc[val]
}

const GRADES = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

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

export default function TabPenilaian({ profile, sesi, activeEvent, isJeda }: Props) {
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

  const [juriProgress, setJuriProgress] = useState({ submitted: 0, total: 3 })
  const [pendingVarRequest, setPendingVarRequest] = useState<any>(null)

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

  // Realtime progress listener
  useEffect(() => {
    if (!sesi?.peserta_aktif_id || !sesi.id) return

    async function fetchProgressAndVar() {
      // 1. Fetch Progress
      const { data } = await supabase.from('penilaian').select('id, is_submitted, juri_id').eq('peserta_id', sesi!.peserta_aktif_id)
      
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'juri').eq('event_id', activeEvent.id).eq('is_juri_penilai', true)

      if (data) {
        setJuriProgress({
          submitted: data.filter(d => d.is_submitted).length,
          total: count || 3
        })
        
        // Cek apakah nilai kita sudah di-unlock oleh IP
        const myScore = data.find(d => d.juri_id === profile.id)
        if (myScore && !myScore.is_submitted && isSubmitted) {
           setIsSubmitted(false) // Buka kunci layar jika di-unlock oleh IP
        }
      }
      
      // 2. Fetch VAR Request if exists
      if (existingPenilaian) {
        const { data: varData } = await supabase.from('var_requests').select('id, status').eq('penilaian_id', existingPenilaian.id).eq('status', 'pending').maybeSingle()
        setPendingVarRequest(varData)
      }
    }

    fetchProgressAndVar()
    
    // Fallback Auto-Refresh (Polling) every 3 seconds to ensure real-time UI without relying solely on WebSockets
    const interval = setInterval(() => {
      fetchProgressAndVar()
    }, 3000)

    const channel = supabase.channel('juri_progress')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'penilaian', filter: `peserta_id=eq.${sesi.peserta_aktif_id}` }, () => fetchProgressAndVar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'var_requests' }, () => fetchProgressAndVar())
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [sesi?.peserta_aktif_id, existingPenilaian, profile.id, isSubmitted, supabase])

  // Auto-save to localStorage
  useEffect(() => {
    if (isLoading || isSubmitted || !sesi?.id) return
    const storageKey = `juri_draft_${sesi.id}_${profile.id}`
    localStorage.setItem(storageKey, JSON.stringify(scores))
  }, [scores, isLoading, isSubmitted, sesi?.id, profile.id])

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
      const { error } = await supabase.from('penilaian').update(payload as any).eq('id', existingPenilaian.id)
      if (error) {
         showToast('error', error.message)
         return
      }
    } else {
      const { data, error } = await supabase.from('penilaian').insert(payload as any).select().single()
      if (error) {
         showToast('error', error.message)
         return
      }
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

    if (!confirm('Apakah Anda yakin ingin MENGIRIM nilai secara permanen? Nilai yang sudah dikirim tidak dapat diubah kecuali melalui pengajuan VAR.')) return
  
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
      const { error } = await supabase.from('penilaian').update(payload as any).eq('id', existingPenilaian.id)
      if (error) {
         showToast('error', error.message)
         setIsSubmitting(false)
         return
      }
    } else {
      const { data, error } = await supabase.from('penilaian').insert(payload as any).select().single()
      if (error) {
         showToast('error', error.message)
         setIsSubmitting(false)
         return
      }
      if (data) setExistingPenilaian(data as Penilaian)
    }

    // Refetch the data after successful submit to ensure state matches DB
    const { data: latestData } = await supabase.from('penilaian').select('id, is_submitted, juri_id').eq('peserta_id', sesi.peserta_aktif_id)
    if (latestData) {
      setJuriProgress({
        submitted: latestData.filter(d => d.is_submitted).length,
        total: latestData.length > 0 ? latestData.length : 3
      })
    }

    await logActivity(supabase, {
      event_id: activeEvent.id,
      action: `Juri ${profile.nama} telah memfinalisasi penilaian.`,
      entity_type: 'penilaian',
      entity_id: existingPenilaian?.id
    })

    setIsSubmitting(false)
    setIsSubmitted(true)
    showToast('success', 'Nilai berhasil disubmit!')
  }

  async function handleAjukanVAR(e: React.FormEvent) {
    e.preventDefault()
    if (!existingPenilaian || !sesi?.peserta_aktif_id) return
    if (!confirm('Yakin ingin mengajukan VAR untuk mengubah nilai? Permintaan ini akan ditinjau oleh Inspektur Pertandingan.')) return
    setIsSubmitting(true)
    
    // 1. Catat Request VAR (Pending, butuh persetujuan IP)
    const varPayload = {
      penilaian_id: existingPenilaian.id,
      peserta_id: sesi.peserta_aktif_id,
      requested_by: profile.id,
      requested_role: 'juri',
      alasan: varAlasan,
      lokasi_teks: varLokasi,
      status: 'pending'
    }
    const { error } = await supabase.from('var_requests').insert(varPayload as any)
    
    if (error) {
      showToast('error', error.message)
      setIsSubmitting(false)
      return
    }

    // Refetch VAR requests
    const { data: varData } = await supabase.from('var_requests').select('id, status').eq('penilaian_id', existingPenilaian.id).eq('status', 'pending').maybeSingle()
    if (varData) setPendingVarRequest(varData)

    await logActivity(supabase, {
      event_id: activeEvent.id,
      action: `Juri ${profile.nama} mengajukan VAR.`,
      entity_type: 'var_requests',
      entity_id: varData?.id
    })
    
    setIsSubmitting(false)
    setShowVarModal(false)
    setVarAlasan('')
    setVarLokasi('')
    showToast('success', 'Pengajuan VAR berhasil dikirim. Menunggu persetujuan IP.')
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

  const isLocked = isSubmitted || sesi.nilai_dikunci || isJeda

  return (
    <>
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

      </div>

      {/* Grade Selection Modal */}
      {activeModal && activeModal !== 'perhatian' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/30 backdrop-blur-md">
          <div className="bg-slate-50 text-slate-900 w-full max-w-lg rounded-3xl p-6 md:p-8 animate-fade-in-up shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-2xl font-bold text-amber-900 capitalize">
                {KRITERIA.find(k => k.key === activeModal)?.label ?? activeModal}
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
              {GRADES.map(val => (
                <button
                  key={val}
                  onClick={() => {
                    setScores({ ...scores, [activeModal]: val })
                    setActiveModal(null)
                  }}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 group
                    ${scores[activeModal] === val 
                      ? 'border-amber-600 bg-amber-50' 
                      : 'border-slate-200 hover:border-amber-400 hover:bg-slate-100'}`}
                >
                  <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-display font-bold text-lg
                    ${scores[activeModal] === val ? 'bg-amber-800 text-white' : 'bg-slate-200 text-slate-600 group-hover:bg-amber-100'}`}>
                    {val}
                  </div>
                  <div>
                    <div className={`font-bold ${scores[activeModal] === val ? 'text-amber-900' : 'text-slate-700'}`}>
                      Grade {val}
                    </div>
                    <div className={`text-xs mt-0.5 font-medium leading-relaxed ${scores[activeModal] === val ? 'text-amber-700' : 'text-slate-500'}`}>
                      {getGradeDesc(val, activeModal)}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/30 backdrop-blur-md">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/30 backdrop-blur-md">
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
              {KRITERIA.filter(k => scores[k.key] > 0).length} dari {KRITERIA.length} kriteria dinilai
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
          <div className="mb-4">
            <span className="inline-block bg-white text-slate-600 text-sm font-medium px-4 py-2 rounded-xl shadow-sm border border-slate-200">
              Menunggu juri lain... ({juriProgress.submitted} / {juriProgress.total} Juri telah mengirim nilai)
            </span>
          </div>

          {!sesi.nilai_dikunci ? (
            pendingVarRequest ? (
               <p className="text-amber-700 text-sm font-semibold bg-amber-50 p-3 rounded-xl border border-amber-200">
                 ⏳ VAR sedang diajukan, menunggu persetujuan Inspektur Pertandingan.
               </p>
            ) : (
              <button onClick={() => setShowVarModal(true)} className="btn-secondary text-sm">
                <><Video className="w-5 h-5 inline mr-1" /> Ajukan VAR (Revisi Nilai)</>
              </button>
            )
          ) : (
            <p className="text-[var(--color-amber-dark)] text-xs mt-2">
              <Lock className="w-4 h-4 inline mr-1" /> Sesi ini sudah dikunci oleh IP. Anda tidak dapat mengajukan VAR.
            </p>
          )}
        </div>
      )}

      {/* Modal VAR */}
      {showVarModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-white/30 backdrop-blur-md">
          <div className="panel w-full max-w-md p-6 animate-fade-in-up">
            <h3 className="font-display text-xl font-semibold text-[var(--color-text)] mb-4">Pengajuan VAR</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Silakan tuliskan alasan Anda melakukan revisi nilai. Permintaan ini akan dikirim ke Inspektur Pertandingan (IP) untuk disetujui.
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
                  Kirim Pengajuan VAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type} z-[200]`}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}
    </>
  )
}
