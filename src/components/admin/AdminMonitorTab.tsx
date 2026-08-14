'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, Profile } from '@/types/database'
import DetailPesertaModal from './DetailPesertaModal'
import { Eye, Lock, Video, AlertTriangle } from 'lucide-react'

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
  const supabase = createClient()

  const loadData = useCallback(async () => {
    if (!activeEvent) return

    // Fetch stats
    const [pesertaRes, sesiRes, varRes] = await Promise.all([
      supabase.from('peserta').select('status, id').eq('event_id', activeEvent.id),
      supabase.from('sesi').select('status, id').eq('event_id', activeEvent.id),
      supabase.from('var_requests').select('status').eq('status', 'pending')
    ])

    const pData = pesertaRes.data || []
    const sData = sesiRes.data || []
    const vData = varRes.data || []

    const sudahTampil = pData.filter(p => p.status === 'selesai').length
    const sedangTampil = pData.filter(p => p.status === 'dinilai').length

    setStats({
      totalPeserta: pData.length,
      sudahTampil,
      sedangTampil,
      belumTampil: pData.length - sudahTampil - sedangTampil,
      sesiAktif: sData.filter(s => s.status === 'berjalan').length,
      sesiSelesai: sData.filter(s => s.status === 'selesai').length,
      potensiVar: vData.length
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
      nomor_urut: r.nomor_undian || 0,
      nama: r.nama,
      kategori_nama: r.kategori?.nama || '-',
      mazmur_bacaan: r.mazmur_bacaan || '-',
      status: r.status,
      sesi_id: r.sesi?.[0]?.id, // Taking the first matching session if any
    }))

    setData(mapped)
    setIsLoading(false)
  }, [activeEvent, supabase])

  useEffect(() => {
    loadData()
    
    // Use Supabase Realtime instead of polling
    const channel = supabase.channel('admin_monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'peserta' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sesi' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'var_requests' }, () => loadData())
      .subscribe()
      
    return () => {
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
    const alasan = prompt('Alasan mengajukan VAR:')
    if (!alasan) return
    const { error } = await supabase.from('var_requests').insert({
      peserta_id: pesertaId, requested_by: profile.id, requested_role: 'ip', alasan: alasan, status: 'pending'
    } as any)
    if (!error) alert('VAR berhasil diajukan.')
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
                    {r.status === 'dinilai' && (
                      <>
                        <button onClick={() => handleAjukanVAR(r.id)} className="bg-pink-600 hover:bg-pink-700 text-white text-xs px-4 py-2 rounded-lg font-semibold flex items-center gap-1 shadow-sm transition-colors">
                          <AlertTriangle className="w-3.5 h-3.5" /> Ajukan VAR
                        </button>
                        <button onClick={() => handleAkhiriPenampilan(r.id, r.sesi_id)} className="bg-[#b31b26] hover:bg-[#8f151e] text-white text-xs px-4 py-2 rounded-lg font-semibold flex items-center gap-1 shadow-sm transition-colors">
                          <Lock className="w-3.5 h-3.5" /> Akhiri & Finalkan
                        </button>
                      </>
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

      {selectedDetailPeserta && (
        <DetailPesertaModal
          pesertaId={selectedDetailPeserta}
          sesiId={data.find(d => d.id === selectedDetailPeserta)?.sesi_id}
          pesertaNama={data.find(d => d.id === selectedDetailPeserta)?.nama || ''}
          pesertaUndian={data.find(d => d.id === selectedDetailPeserta)?.nomor_urut || null}
          pesertaMazmur={data.find(d => d.id === selectedDetailPeserta)?.mazmur_bacaan || null}
          juriList={juriList}
          onClose={() => setSelectedDetailPeserta(null)}
          onAkhiriPenampilan={() => {
            const row = data.find(d => d.id === selectedDetailPeserta);
            if (row) handleAkhiriPenampilan(row.id, row.sesi_id);
          }}
        />
      )}
    </div>
  )
}
