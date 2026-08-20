'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, Profile } from '@/types/database'
import DetailPesertaModal from './DetailPesertaModal'
import { Eye, Lock, Video, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface PesertaRow {
  id: string
  nomor_urut: number
  nama: string
  kategori_nama: string
  mazmur_bacaan: string
  status: 'menunggu' | 'dinilai' | 'selesai'
  var_status?: 'pending' | 'approved' | 'rejected' | null
  sesi_id?: string
}

interface Stats {
  totalPeserta: number
  sudahTampil: number
  sedangTampil: number
  belumTampil: number
  sesiAktif: number
  sesiSelesai: number
  potensiVar: number
}

interface Props {
  activeEvent: Event | null
  juriList: Profile[]
  profile: Profile
}

export default function AdminMonitorTab({ activeEvent, juriList, profile }: Props) {
  const [data, setData] = useState<PesertaRow[]>([])
  const [stats, setStats] = useState<Stats>({
    totalPeserta: 0, sudahTampil: 0, sedangTampil: 0, belumTampil: 0, sesiAktif: 0, sesiSelesai: 0, potensiVar: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDetailPeserta, setSelectedDetailPeserta] = useState<string | null>(null)
  
  // Active Sesi Progress
  const [activePesertaInfo, setActivePesertaInfo] = useState<any>(null)
  const [juriProgress, setJuriProgress] = useState<any[]>([])

  const supabase = createClient()

  const loadData = useCallback(async () => {
    if (!activeEvent) return

    // Fetch stats
    const [pesertaRes, sesiRes, varRes] = await Promise.all([
      supabase.from('peserta').select('status, id').eq('event_id', activeEvent.id),
      supabase.from('sesi').select('status, id').eq('event_id', activeEvent.id),
      supabase.from('var_requests').select('status, peserta_id').eq('status', 'pending')
    ])

    const pData = pesertaRes.data || []
    const sData = sesiRes.data || []
    const vData = varRes.data || []

    // Fetch penilaian to check if all juries have submitted for the VAR requests
    const pendingVarPesertaIds = vData.map(v => v.peserta_id)
    let validVarCount = 0
    
    if (pendingVarPesertaIds.length > 0) {
      const { data: penData } = await supabase.from('penilaian').select('peserta_id, is_submitted').in('peserta_id', pendingVarPesertaIds)
      
      if (penData) {
         // Group by peserta_id and check if all is_submitted are true
         const grouped = penData.reduce((acc, curr) => {
           if (!acc[curr.peserta_id]) acc[curr.peserta_id] = []
           acc[curr.peserta_id].push(curr.is_submitted)
           return acc
         }, {} as Record<string, boolean[]>)
         
         validVarCount = vData.filter(v => {
           const statuses = grouped[v.peserta_id]
           return statuses && statuses.length > 0 && statuses.every(s => s === true)
         }).length
      }
    }

    const sudahTampil = pData.filter(p => p.status === 'selesai').length
    const sedangTampil = pData.filter(p => p.status === 'dinilai').length

    setStats({
      totalPeserta: pData.length,
      sudahTampil,
      sedangTampil,
      belumTampil: pData.length - sudahTampil - sedangTampil,
      sesiAktif: sData.filter(s => s.status === 'berjalan').length,
      sesiSelesai: sData.filter(s => s.status === 'selesai').length,
      potensiVar: validVarCount
    })

    // Fetch Monitoring Table (only dinilai & selesai)
    const { data: rows } = await supabase
      .from('peserta')
      .select(`
        id, nomor_undian, nama, mazmur_bacaan, status,
        kategori:kategori_id(nama),
        sesi!sesi_peserta_aktif_id_fkey(id)
      `)
      .eq('event_id', activeEvent.id)
      .in('status', ['dinilai', 'selesai'])
      .order('updated_at', { ascending: false })
      .limit(50)

    const mapped = (rows ?? []).map((r: any) => ({
      id: r.id,
      nomor_urut: r.nomor_undian || '-',
      nama: r.nama,
      kategori_nama: r.kategori?.nama || '-',
      mazmur_bacaan: r.mazmur_bacaan || '-',
      status: r.status,
      sesi_id: r.sesi?.[0]?.id, // Taking the first matching session if any
    }))

    setData(mapped)

    // --- PROGRES PENILAIAN JURI ---
    const activeSesi = sData.find(s => s.status === 'berjalan')
    if (activeSesi) {
      const { data: sesiDetail } = await supabase
        .from('sesi')
        .select(`
          peserta_aktif_id, 
          peserta:peserta_aktif_id(nama, nomor_undian, mazmur_bacaan, status, kategori:kategori_id(nama, jenis_lomba))
        `)
        .eq('id', activeSesi.id)
        .single()
        
      if (sesiDetail && sesiDetail.peserta) {
        setActivePesertaInfo({ ...sesiDetail.peserta, sesi_id: activeSesi.id, id: sesiDetail.peserta_aktif_id })
        
        const { data: penData } = await supabase
          .from('penilaian')
          .select('juri_id, is_submitted, total, interpretasi, artikulasi, penghayatan, penampilan, kekompakan')
          .eq('peserta_id', sesiDetail.peserta_aktif_id)

        const mappedProgress = juriList.map(j => {
          const p = penData?.find(pd => pd.juri_id === j.id)
          let kriteriaCount = 0
          if (p) {
            if (p.interpretasi != null) kriteriaCount++
            if (p.artikulasi != null) kriteriaCount++
            if (p.penghayatan != null) kriteriaCount++
            if (p.penampilan != null) kriteriaCount++
            if (p.kekompakan != null) kriteriaCount++
          }
          return {
            juri_id: j.id,
            nama_juri: j.nama,
            is_submitted: !!p?.is_submitted,
            total_nilai: p?.total || 0,
            kriteria_terisi: kriteriaCount
          }
        })
        setJuriProgress(mappedProgress)
      } else {
        setActivePesertaInfo(null)
      }
    } else {
      setActivePesertaInfo(null)
    }

    setIsLoading(false)
  }, [activeEvent, supabase, juriList])

  useEffect(() => {
    loadData()
    
    // Auto-refresh fallback every 3 seconds
    const intervalId = setInterval(() => {
      loadData()
    }, 3000)
    
    // Use Supabase Realtime instead of polling
    const channel = supabase.channel('admin_monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'peserta' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sesi' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'var_requests' }, () => loadData())
      .subscribe()
      
    return () => {
      clearInterval(intervalId)
      supabase.removeChannel(channel)
    }
  }, [loadData, supabase])

  async function handleAkhiriPenampilan(pesertaId: string, sesiId?: string) {
    if (!confirm('Akhiri & Finalkan penampilan peserta ini?')) return
    if (sesiId) {
      await supabase.from('sesi').update({ nilai_dikunci: true, status: 'selesai' } as any).eq('id', sesiId)
    }
    await supabase.from('peserta').update({ status: 'selesai' } as any).eq('id', pesertaId)
    loadData()
  }

  async function handleAjukanVAR(pesertaId: string) {
    const alasan = window.prompt('Alasan mengajukan VAR:')
    if (!alasan?.trim()) return
    const { error } = await supabase.from('var_requests').insert({
      peserta_id: pesertaId, requested_by: profile.id, requested_role: 'ip', alasan: alasan.trim(), status: 'pending'
    } as any)
    if (!error) alert('VAR berhasil diajukan. Menunggu persetujuan 3 Juri.')
    else alert('Gagal mengajukan VAR: ' + error.message)
  }

  if (!activeEvent) return <div className="panel text-center">Tidak ada event aktif.</div>

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 7 Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { label: 'Total Peserta', val: stats.totalPeserta },
          { label: 'Sudah Tampil', val: stats.sudahTampil },
          { label: 'Sedang Tampil', val: stats.sedangTampil },
          { label: 'Belum Tampil', val: stats.belumTampil },
          { label: 'Sesi Aktif', val: stats.sesiAktif },
          { label: 'Sesi Selesai', val: stats.sesiSelesai },
          { label: 'Potensi VAR', val: stats.potensiVar, isRed: true },
        ].map((s, i) => (
          <div key={i} className="panel p-4 flex flex-col justify-center items-start bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <span className={`text-sm font-semibold mb-1 ${s.isRed ? 'text-red-500' : 'text-slate-500'}`}>{s.label}</span>
            <span className={`text-4xl font-display font-bold ${s.isRed ? 'text-red-600' : 'text-slate-800'}`}>{s.val}</span>
          </div>
        ))}
      </div>

      <div className="panel p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <h3 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
           Monitoring Real-time Peserta
        </h3>
        <p className="text-sm text-slate-500 mb-6">Hanya peserta yang sementara dinilai dan yang sudah dinilai.</p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-sm text-slate-500">
                <th className="py-4 px-4 font-semibold w-16">No.</th>
                <th className="py-4 px-4 font-semibold">Nama</th>
                <th className="py-4 px-4 font-semibold">Kategori</th>
                <th className="py-4 px-4 font-semibold">Bacaan Mazmur</th>
                <th className="py-4 px-4 font-semibold">Status</th>
                <th className="py-4 px-4 font-semibold">VAR</th>
                <th className="py-4 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4 text-slate-600">{i + 1}</td>
                  <td className="py-4 px-4 font-medium text-slate-900">{r.nama}</td>
                  <td className="py-4 px-4 text-amber-700 font-semibold">{r.kategori_nama}</td>
                  <td className="py-4 px-4 text-slate-600">{r.mazmur_bacaan}</td>
                  <td className="py-4 px-4">
                    {r.status === 'dinilai' 
                      ? <span className="bg-amber-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-sm">Sedang Dinilai</span>
                      : <span className="bg-emerald-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-sm">Final</span>}
                  </td>
                  <td className="py-4 px-4 text-slate-600">
                    {/* VAR Indicator */}
                  </td>
                  <td className="py-4 px-4 text-right flex items-center justify-end gap-2">
                      {r.status === 'dinilai' && r.sesi_id && (
                        <button onClick={() => handleAjukanVAR(r.id)} className="bg-pink-600 hover:bg-pink-700 text-white text-xs px-4 py-2 rounded-lg font-semibold flex items-center gap-1 shadow-sm transition-colors">
                          <AlertTriangle className="w-3.5 h-3.5" /> Ajukan VAR
                        </button>
                      )}
                    <button onClick={() => setSelectedDetailPeserta(r.id)} className="bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 text-xs px-4 py-1.5 rounded-lg font-semibold flex items-center gap-1 shadow-sm transition-colors">
                      <Eye className="w-3.5 h-3.5" /> Detail
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">Belum ada peserta yang dinilai</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Progres Penilaian Juri Component */}
      <div className="panel p-6 bg-white border border-slate-200 rounded-2xl shadow-sm mt-6">
        <h3 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Progres Penilaian Juri
        </h3>
        <p className="text-sm text-slate-500 mb-6">Progres pengiriman & nilai tiap juri untuk peserta pada sesi yang sedang aktif. Diperbarui setiap 3 detik.</p>
        
        {activePesertaInfo ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-800 text-lg">
                  {activePesertaInfo.nomor_undian}. {activePesertaInfo.nama}
                </h4>
                <p className="text-sm text-slate-500 mt-0.5">
                  {activePesertaInfo.kategori?.nama} {activePesertaInfo.mazmur_bacaan && `- ${activePesertaInfo.mazmur_bacaan}`}
                </p>
              </div>
              <div>
                <span className="bg-amber-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-sm">
                  Sedang Dinilai
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4 font-semibold">Juri</th>
                    <th className="py-3 px-4 font-semibold">Status Kirim</th>
                    <th className="py-3 px-4 font-semibold text-center">Nilai Juri</th>
                    <th className="py-3 px-4 font-semibold text-center">Kriteria Terisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {juriProgress.map((jp) => (
                    <tr key={jp.juri_id}>
                      <td className="py-3 px-4 font-medium text-slate-700">{jp.nama_juri}</td>
                      <td className="py-3 px-4">
                        {jp.is_submitted ? (
                          <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Sudah Kirim
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-700 border border-amber-200 text-xs px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Belum Kirim
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {jp.total_nilai > 0 ? jp.total_nilai.toFixed(3) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-slate-500">
                        {jp.kriteria_terisi} {activePesertaInfo.kategori?.jenis_lomba === 'beregu' ? 'dari 5 kriteria' : 'dari 4 kriteria'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-slate-50 p-3 border-t border-slate-200 text-right">
               <button onClick={() => setSelectedDetailPeserta(activePesertaInfo.id)} className="bg-white border-2 border-slate-200 hover:bg-slate-100 text-slate-700 text-xs px-4 py-1.5 rounded-lg font-semibold inline-flex items-center gap-1 shadow-sm transition-colors">
                  <Eye className="w-3.5 h-3.5" /> Detail & Kendali
               </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 border border-dashed border-slate-300 rounded-xl bg-slate-50">
            Tidak ada peserta yang sedang tampil saat ini.
          </div>
        )}
      </div>

      {selectedDetailPeserta && (
        <DetailPesertaModal
          pesertaId={selectedDetailPeserta}
          sesiId={
            selectedDetailPeserta === activePesertaInfo?.id
              ? activePesertaInfo?.sesi_id
              : data.find(d => d.id === selectedDetailPeserta)?.sesi_id
          }
          pesertaNama={
            selectedDetailPeserta === activePesertaInfo?.id
              ? activePesertaInfo?.nama
              : data.find(d => d.id === selectedDetailPeserta)?.nama || ''
          }
          pesertaUndian={
            selectedDetailPeserta === activePesertaInfo?.id
              ? activePesertaInfo?.nomor_undian
              : data.find(d => d.id === selectedDetailPeserta)?.nomor_urut || null
          }
          pesertaMazmur={
            selectedDetailPeserta === activePesertaInfo?.id
              ? activePesertaInfo?.mazmur_bacaan
              : data.find(d => d.id === selectedDetailPeserta)?.mazmur_bacaan || null
          }
          juriList={juriList}
          onClose={() => setSelectedDetailPeserta(null)}
          onAkhiriPenampilan={() => {
            loadData();
          }}
          currentUser={profile}
          currentUserRole={profile.role}
        />
      )}
    </div>
  )
}
