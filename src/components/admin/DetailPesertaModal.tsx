'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, Profile } from '@/types/database'
import { AlertTriangle, CheckCircle2, XCircle, X } from 'lucide-react'
import { calculateTotalScore } from '@/lib/utils/score'

interface DetailPesertaModalProps {
  pesertaId: string
  sesiId?: string
  pesertaNama: string
  pesertaUndian: number | null
  pesertaMazmur: string | null
  juriList: Profile[]
  onClose: () => void
  onAkhiriPenampilan: () => void
}

export default function DetailPesertaModal({
  pesertaId,
  sesiId,
  pesertaNama,
  pesertaUndian,
  pesertaMazmur,
  juriList,
  onClose,
  onAkhiriPenampilan
}: DetailPesertaModalProps) {
  const [penilaianList, setPenilaianList] = useState<any[]>([])
  const [varRequest, setVarRequest] = useState<any>(null)
  const [kategori, setKategori] = useState<any>(null)
  const [catatanIp, setCatatanIp] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasOpenedVar, setHasOpenedVar] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function loadDetail() {
      setIsLoading(true)
      let currentSesiId = sesiId
      
      // 1. Fetch Penilaian by pesertaId only (since a peserta only performs once)
      const { data: pData } = await supabase
        .from('penilaian')
        .select('*')
        .eq('peserta_id', pesertaId)
      
      if (pData) {
        setPenilaianList(pData)
        if (!currentSesiId && pData.length > 0) {
          currentSesiId = pData[0].sesi_id
        }
      }

      // 2. Fetch Peserta to get Kategori
      const { data: pKategori } = await supabase
        .from('peserta')
        .select('kategori_id, kategori(*)')
        .eq('id', pesertaId)
        .single()
        
      if (pKategori) {
        const kat = (pKategori as any).kategori
        setKategori(Array.isArray(kat) ? kat[0] : kat)
        
        // If we STILL don't have currentSesiId, find the sesi for this kategori
        if (!currentSesiId && pKategori.kategori_id) {
          const { data: sFallback } = await supabase
            .from('sesi')
            .select('id')
            .eq('kategori_id', pKategori.kategori_id)
            .limit(1)
            .maybeSingle()
          if (sFallback) currentSesiId = sFallback.id
        }
      }

      // 3. Fetch Catatan IP if we have currentSesiId
      if (currentSesiId) {
        const { data: sData } = await supabase
          .from('sesi')
          .select('catatan_ip')
          .eq('id', currentSesiId)
          .single()
        if (sData) setCatatanIp((sData as any).catatan_ip || '')
      }

      // 3. Fetch pending VAR (ONLY if all juries have submitted)
      const allSubmitted = pData && pData.length > 0 && pData.every(p => p.is_submitted)
      
      if (allSubmitted) {
        const { data: vData } = await supabase
          .from('var_requests')
          .select('*')
          .eq('peserta_id', pesertaId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
          
        setVarRequest(vData || null)
      } else {
        setVarRequest(null)
      }

      setIsLoading(false)
    }

    loadDetail()

    // Realtime subscription for penilaian updates
    const channel = supabase.channel(`detail_${pesertaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'penilaian', filter: `peserta_id=eq.${pesertaId}` }, () => {
        // Reload all when a change occurs
        loadDetail()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'var_requests', filter: `peserta_id=eq.${pesertaId}` }, () => {
        loadDetail()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pesertaId, sesiId, supabase])

  async function handleSimpanCatatan() {
    setIsSaving(true)
    
    // Attempt to find sesi_id from penilaian or fallback
    let targetSesiId = sesiId
    if (!targetSesiId && penilaianList.length > 0) {
      targetSesiId = penilaianList[0].sesi_id
    }
    
    if (!targetSesiId && kategori) {
      const { data: sFallback } = await supabase
        .from('sesi')
        .select('id')
        .eq('kategori_id', kategori.id)
        .limit(1)
        .maybeSingle()
      if (sFallback) targetSesiId = sFallback.id
    }

    if (!targetSesiId) {
      alert('Sesi tidak ditemukan untuk menyimpan catatan.')
      setIsSaving(false)
      return
    }

    const { error } = await supabase
      .from('sesi')
      .update({ catatan_ip: catatanIp } as any)
      .eq('id', targetSesiId)
      
    setIsSaving(false)
    if (error) {
      alert('Gagal menyimpan catatan: ' + error.message)
    } else {
      alert('Catatan berhasil disimpan!')
    }
  }

  async function handleBukaKunciVAR() {
    if (!varRequest) return
    setIsSaving(true)
    
    // 1. Update var_requests to approved
    await supabase.from('var_requests').update({ status: 'approved', resolved_at: new Date().toISOString() }).eq('id', varRequest.id)
    
    // 2. Unlock ALL juris' penilaian for this sesi
    let targetSesiId = sesiId
    if (!targetSesiId && penilaianList.length > 0) targetSesiId = penilaianList[0].sesi_id

    if (targetSesiId) {
      await supabase.from('penilaian').update({ is_submitted: false } as any).eq('sesi_id', targetSesiId).eq('peserta_id', pesertaId)
    } else {
      // Fallback if somehow sesiId is not found (though very unlikely if var request exists)
      await supabase.from('penilaian').update({ is_submitted: false } as any).eq('peserta_id', pesertaId)
    }
    
    setVarRequest(null)
    setHasOpenedVar(true)
    setIsSaving(false)
    alert('Kunci nilai seluruh Juri berhasil dibuka!')
  }

  // Helper untuk mendapatkan status pengiriman juri
  const getJuriData = (jId: string) => penilaianList.find(p => p.juri_id === jId)

  // Kriteria keys
  const criteriaKeys = ['artikulasi', 'interpretasi', 'penghayatan', 'penampilan', 'kekompakan']

  // Process juri scores & detect jomplang
  const juriScores = juriList.map(juri => {
    const p = getJuriData(juri.id)
    const isSubmitted = p?.is_submitted
    
    let filled = 0
    criteriaKeys.forEach(k => {
      if (p && p[k] > 0) filled++
    })
    
    let totalScore = 0
    if (p && kategori) {
      const isBeregu = kategori.jenis_lomba === 'beregu'
      const kriteria = []
      if (isBeregu) kriteria.push({ key: 'kekompakan', max: kategori.maks_kekompakan || 30 })
      kriteria.push(
        { key: 'interpretasi', max: kategori.maks_interpretasi || (isBeregu ? 20 : 35) },
        { key: 'penghayatan', max: kategori.maks_penghayatan || (isBeregu ? 25 : 30) },
        { key: 'artikulasi', max: kategori.maks_artikulasi || (isBeregu ? 20 : 25) },
        { key: 'penampilan', max: kategori.maks_penampilan || (isBeregu ? 5 : 10) }
      )
      totalScore = calculateTotalScore({
        kriteria,
        scores: {
          interpretasi: p.interpretasi,
          penghayatan: p.penghayatan,
          artikulasi: p.artikulasi,
          penampilan: p.penampilan,
          kekompakan: p.kekompakan
        },
        perhatian: p.perhatian,
        catatan_aspek: p.catatan_aspek,
        scale: { min: Number(kategori.range_min || 0), max: Number(kategori.range_max || 100) }
      })
    }
    
    return { juri, isSubmitted, filled, totalScore, p }
  })

  // Jomplang Detection
  let isJomplang = false
  const submittedTotals = juriScores.filter(j => j.isSubmitted).map(j => j.totalScore)
  if (submittedTotals.length >= 2) {
    const maxScore = Math.max(...submittedTotals)
    const minScore = Math.min(...submittedTotals)
    if (maxScore - minScore > 0.800) {
      isJomplang = true
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/30 backdrop-blur-md">
      <div className="bg-[#fdfbf7] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up border border-[#e8dfce]">
        
        {/* Header */}
        <div className="p-6 border-b border-[#e8dfce] bg-white flex justify-between items-start shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -z-10" />
          <div>
            <h2 className="text-2xl font-display font-bold text-amber-900">{pesertaNama}</h2>
            <div className="text-sm text-slate-500 mt-1 flex gap-3">
              <span>No. Undian: <strong className="text-slate-700">{pesertaUndian ?? '-'}</strong></span>
              <span>•</span>
              <span>Bahan: <strong className="text-slate-700">{pesertaMazmur ?? '-'}</strong></span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <span className="spinner mr-2 border-slate-400" /> Memuat data...
            </div>
          ) : (
            <>
              {varRequest && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl animate-fade-in-up shadow-sm">
                  <h3 className="font-semibold text-rose-800 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    Pengajuan VAR dari Juri
                  </h3>
                  <div className="text-rose-700 text-sm mb-3">
                    <p><strong>Alasan VAR:</strong> {varRequest.alasan}</p>
                    {varRequest.lokasi_teks && <p><strong>Lokasi Teks:</strong> {varRequest.lokasi_teks}</p>}
                  </div>
                  <button 
                    onClick={handleBukaKunciVAR}
                    disabled={isSaving}
                    className="bg-[#c81e1e] hover:bg-[#a01818] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                  >
                    Izinkan & Buka Kunci Juri
                  </button>
                </div>
              )}

              {isJomplang && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-2xl animate-fade-in-up shadow-sm">
                  <h3 className="font-semibold text-orange-800 flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-5 h-5" />
                    Peringatan: Selisih Nilai Terlalu Besar (Jomplang)
                  </h3>
                  <p className="text-orange-700 text-sm">
                    Terdapat perbedaan nilai antar juri yang melebihi batas <strong>0.800</strong> poin. Disarankan untuk melakukan mediasi atau mempertimbangkan pengajuan VAR jika terdapat kekeliruan penilaian.
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-3 gap-6">
                {/* Panel Kiri: Progres & Tabel */}
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-display font-semibold text-slate-800 text-lg">Progres Juri</h3>
                  </div>
                  <table className="w-full text-sm text-left">
                    <thead className="border-b-2 border-slate-200 text-slate-500 font-medium">
                      <tr>
                        <th className="py-3 font-medium">Juri</th>
                        <th className="py-3 font-medium">Status Kirim</th>
                        <th className="py-3 font-medium text-center">Nilai Juri</th>
                        <th className="py-3 font-medium text-right">Kriteria Terisi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {juriScores.map(({ juri, isSubmitted, filled, totalScore }) => (
                        <tr key={juri.id} className="hover:bg-slate-50/50">
                          <td className="py-4 text-[#1e1e1e] font-medium">{juri.nama}</td>
                          <td className="py-4">
                            {isSubmitted ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-sm">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Selesai
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-500 shadow-sm">
                                <XCircle className="w-3.5 h-3.5" /> Belum Kirim
                              </span>
                            )}
                          </td>
                          <td className="py-4 text-center text-[#1e1e1e]">
                            {isSubmitted ? totalScore.toFixed(3) : '-'}
                          </td>
                          <td className="py-4 text-right text-slate-500">
                            {filled} kriteria
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Panel Kanan: Ringkasan Nilai Juri */}
                <div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-display font-semibold text-slate-800 text-lg mb-4">Ringkasan Nilai Juri</h3>
                    <table className="w-full text-sm text-left">
                      <thead className="border-b-2 border-slate-200 text-slate-500 font-medium">
                        <tr>
                          <th className="py-2 font-medium">Juri</th>
                          <th className="py-2 font-medium text-right">Nilai</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {juriScores.map(({ juri, isSubmitted, totalScore }) => (
                          <tr key={`ringkasan-${juri.id}`}>
                            <td className="py-3 text-slate-600">{juri.nama}</td>
                            <td className="py-3 text-right text-[#8b252d] font-semibold text-base">{isSubmitted ? totalScore.toFixed(3) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Rincian Nilai per Kriteria */}
              <div className="mt-8">
                <h3 className="font-display font-semibold text-slate-800 text-lg mb-3">Rincian Nilai per Kriteria</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-sm text-left">
                    <thead className="border-b border-slate-200 text-slate-500 font-medium bg-[#faf8f4]">
                      <tr>
                        <th className="py-3 px-4 font-medium">Juri</th>
                        <th className="py-3 px-4 font-medium">Kriteria</th>
                        <th className="py-3 px-4 font-medium text-right">Nilai Mentah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {juriList.flatMap(juri => {
                        const p = getJuriData(juri.id)
                        if (!p || !kategori) return []
                        
                        const isBeregu = kategori.jenis_lomba === 'beregu'
                        
                        // We will just list the grades entered (1-5) 
                        // Wait, screenshot shows "Nilai Mentah 20.00" 
                        // This means the raw converted score (Grade / 5 * Max)
                        const getMentah = (val: number, max: number) => ((val || 0) / 5 * max).toFixed(2)
                        
                        const rows = [
                          { label: 'Artikulasi', val: getMentah(p.artikulasi, kategori.maks_artikulasi || (isBeregu ? 20 : 25)) },
                          { label: 'Interpretasi', val: getMentah(p.interpretasi, kategori.maks_interpretasi || (isBeregu ? 20 : 35)) },
                          { label: 'Penghayatan', val: getMentah(p.penghayatan, kategori.maks_penghayatan || (isBeregu ? 25 : 30)) },
                          { label: 'Penampilan', val: getMentah(p.penampilan, kategori.maks_penampilan || (isBeregu ? 5 : 10)) },
                        ]
                        
                        if (isBeregu) {
                          rows.push({ label: 'Kekompakan', val: getMentah(p.kekompakan, kategori.maks_kekompakan || 30) })
                        }
                        
                        if (p.potongan_perhatian) {
                          rows.push({ label: 'Potongan Perhatian', val: `-${p.potongan_perhatian.toFixed(2)}` })
                        }

                        // Bonus Catatan Juri (max 10)
                        let catatanBonus = 0
                        if (p.catatan_aspek) {
                          const keys = Object.keys(p.catatan_aspek)
                          let sum = 0
                          keys.forEach(k => sum += p.catatan_aspek[k])
                          if (keys.length > 0) catatanBonus = (sum / (keys.length * 5)) * 10
                        }
                        
                        if (catatanBonus > 0) {
                          rows.push({ label: 'Catatan Juri (Bonus)', val: `+${catatanBonus.toFixed(2)}` })
                        }

                        // Sort alphabetically like the screenshot
                        rows.sort((a, b) => a.label.localeCompare(b.label))

                        return rows.map((r, i) => (
                          <tr key={`${juri.id}-${r.label}`} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 text-slate-700">{i === 0 ? juri.nama : ''}</td>
                            <td className="py-3 px-4 text-slate-600">{r.label}</td>
                            <td className="py-3 px-4 text-right text-slate-800 font-medium">{r.val}</td>
                          </tr>
                        ))
                      })}
                      {juriList.length === 0 && (
                        <tr><td colSpan={3} className="text-center py-4 text-slate-400">Tidak ada data</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#fdfbf7] flex items-center justify-between gap-4 mt-auto rounded-b-2xl border-t border-[#e8dfce]">
          <div className="text-xs text-slate-400">
            {!(juriScores.length > 0 && juriScores.every(j => j.isSubmitted)) && !hasOpenedVar && (
              <span className="text-rose-500 font-medium">⚠️ Semua juri harus mengirim nilai sebelum memfinalkan penampilan.</span>
            )}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                onAkhiriPenampilan()
                onClose()
              }}
              disabled={isLoading || (!hasOpenedVar && !(juriScores.length > 0 && juriScores.every(j => j.isSubmitted)))}
              className={`px-5 py-2.5 rounded-xl text-white font-semibold transition-colors shadow-sm
                ${isLoading || (!hasOpenedVar && !(juriScores.length > 0 && juriScores.every(j => j.isSubmitted)))
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-[#059669] hover:bg-emerald-700'
                }`}
            >
              {hasOpenedVar ? 'Terapkan Perubahan Juri & Finalkan' : 'Finalkan Nilai & Akhiri Penampilan'}
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl border border-[#e8dfce] bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm"
            >
              Tutup
            </button>
            <button 
              onClick={handleSimpanCatatan}
              disabled={isSaving || isLoading}
              className="px-6 py-2.5 rounded-xl bg-[#71232c] hover:bg-[#5a1b22] text-white font-semibold transition-colors shadow-sm"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Catatan'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
