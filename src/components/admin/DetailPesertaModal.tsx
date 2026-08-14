'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, Profile } from '@/types/database'
import { AlertTriangle, CheckCircle2, XCircle, X } from 'lucide-react'
import { calculateTotalScore } from '@/lib/utils/score'

interface DetailPesertaModalProps {
  pesertaId: string
  sesiId: string
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

  const supabase = createClient()

  useEffect(() => {
    async function loadDetail() {
      setIsLoading(true)
      
      // 1. Fetch Penilaian
      const { data: pData } = await supabase
        .from('penilaian')
        .select('*')
        .eq('sesi_id', sesiId)
        .eq('peserta_id', pesertaId)
      
      if (pData) setPenilaianList(pData)

      // 2. Fetch Sesi and Peserta Kategori
      const { data: sData } = await supabase
        .from('sesi')
        .select('catatan_ip, kategori_id, kategori(*)')
        .eq('id', sesiId)
        .single()
      
      if (sData) {
        setCatatanIp((sData as any).catatan_ip || '')
        setKategori((sData as any).kategori)
      }

      // 3. Fetch pending VAR
      const { data: vData } = await supabase
        .from('var_requests')
        .select('*')
        .eq('peserta_id', pesertaId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
        
      if (vData) setVarRequest(vData)

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
    // Coba simpan ke kolom catatan_ip jika ada, jika error abaikan (mungkin blm migrate)
    const { error } = await supabase.from('sesi').update({ catatan_ip: catatanIp } as any).eq('id', sesiId)
    if (error) {
       console.error("Gagal menyimpan catatan_ip", error)
       alert('Gagal menyimpan catatan, pastikan database sudah ter-update.')
    } else {
       alert('Catatan berhasil disimpan!')
    }
    setIsSaving(false)
  }

  // Helper untuk mendapatkan status pengiriman juri
  const getJuriData = (jId: string) => penilaianList.find(p => p.juri_id === jId)

  // Kriteria keys
  const criteriaKeys = ['artikulasi', 'interpretasi', 'penghayatan', 'penampilan', 'kekompakan']

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#fdfbf7] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up border border-[#e8dfce]">
        
        {/* Header */}
        <div className="flex justify-between items-start p-6 pb-2 relative">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#1e1e1e]">
              Detail — {pesertaUndian ? `${pesertaUndian}. ` : ''}{pesertaNama}
            </h2>
            <p className="text-slate-500 text-sm mt-1">Rincian penilaian juri dan Potensi VAR (read-only).</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 scrollbar-thin scrollbar-thumb-amber-200">
          
          {isLoading ? (
            <div className="flex justify-center py-10">
              <span className="spinner" style={{ width: '40px', height: '40px', borderColor: '#8b252d', borderRightColor: 'transparent' }} />
            </div>
          ) : (
            <>
              {/* Potensi VAR Alert */}
              {varRequest && (
                <div className="bg-[#ffe4e6] border border-[#f43f5e] rounded-xl p-4 shadow-sm relative overflow-hidden">
                   <h3 className="text-[#be123c] font-bold flex items-center gap-2 mb-2">
                     <AlertTriangle className="w-5 h-5" /> 
                     Potensi VAR — menunggu keputusan Inspektur
                   </h3>
                   <div className="text-[#9f1239] text-sm space-y-1 mb-3">
                     <p><span className="font-semibold">Bacaan:</span> {pesertaMazmur}</p>
                     <p className="opacity-80 mt-2">Tidak ada komponen tercatat.</p>
                     <p className="opacity-80">Tulis catatan/rekomendasi lalu pilih keputusan (Setujui / Tolak / Catatan Saja). Menyimpan akan menutup Potensi VAR.</p>
                   </div>
                </div>
              )}

              {/* Progres Juri */}
              <div>
                <div className="flex items-center gap-2 mb-3">
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
                    {juriList.map(juri => {
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

                      return (
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
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Ringkasan Nilai Juri */}
              <div className="mt-8">
                <h3 className="font-display font-semibold text-slate-800 text-lg mb-3">Ringkasan Nilai Juri</h3>
                <table className="w-full text-sm text-left">
                  <thead className="border-b-2 border-slate-200 text-slate-500 font-medium">
                    <tr>
                      <th className="py-3 font-medium">Juri</th>
                      <th className="py-3 font-medium text-right">Nilai Juri</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {juriList.map(juri => {
                      const p = getJuriData(juri.id)
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
                          scores: { interpretasi: p.interpretasi, penghayatan: p.penghayatan, artikulasi: p.artikulasi, penampilan: p.penampilan, kekompakan: p.kekompakan },
                          perhatian: p.perhatian, catatan_aspek: p.catatan_aspek,
                          scale: { min: Number(kategori.range_min || 0), max: Number(kategori.range_max || 100) }
                        })
                      }
                      return (
                        <tr key={`ringkasan-${juri.id}`}>
                          <td className="py-4 text-slate-600">{juri.nama}</td>
                          <td className="py-4 text-right text-[#8b252d] font-semibold">{p?.is_submitted ? totalScore.toFixed(3) : '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
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
                          if (keys.length > 0) catatanBonus = (sum / 50) * 10
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
          <div className="text-xs text-slate-400"></div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                onAkhiriPenampilan()
                onClose()
              }}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-[#059669] text-white font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Terapkan Perubahan Juri & Finalkan
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
