'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, Peserta, Kategori, Sesi, Profile } from '@/types/database'
import { ExternalLink, RefreshCw, AlertTriangle, MonitorPlay, Users, ShieldAlert, Eye } from 'lucide-react'
import Link from 'next/link'
import DetailPesertaModal from '../admin/DetailPesertaModal'

interface Props {
  activeEvent: Event
}

type PesertaWithKategori = Peserta & { kategori: Kategori | Kategori[] | null }

export default function KontrolLombaTab({ activeEvent }: Props) {
  const [pesertaList, setPesertaList] = useState<PesertaWithKategori[]>([])
  const [sesiList, setSesiList] = useState<Sesi[]>([])
  const [juriList, setJuriList] = useState<Profile[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [selectedDetailPeserta, setSelectedDetailPeserta] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const loadData = async () => {
    setIsLoading(true)
    
    // Load Peserta
    const { data: pData, error: pErr } = await supabase
      .from('peserta')
      .select('*, kategori(*)')
      .eq('event_id', activeEvent.id)
      .order('nomor_undian', { ascending: true })
      
    if (!pErr && pData) {
      setPesertaList(pData as any)
    }

    // Load Sesi to know which sesi belongs to which peserta
    const { data: sData, error: sErr } = await supabase
      .from('sesi')
      .select('*')
      .eq('event_id', activeEvent.id)

    if (!sErr && sData) {
      setSesiList(sData as any)
    }

    // Load Juri for this event
    const { data: juriData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'juri')
      .eq('event_id', activeEvent.id)
      .eq('is_juri_penilai', true)
      .order('nama')
      
    if (juriData) setJuriList(juriData as Profile[])

    // Load Current User
    const { data: userData } = await supabase.auth.getUser()
    if (userData?.user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userData.user.id).single()
      if (profileData) setCurrentUser(profileData as Profile)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    loadData()

    const channel = supabase.channel('kontrol-lomba')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'peserta', filter: `event_id=eq.${activeEvent.id}` }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sesi', filter: `event_id=eq.${activeEvent.id}` }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeEvent.id])

  const handleBatalFinalkan = async (pesertaId: string) => {
    if (!window.confirm('PERINGATAN: Membatalkan finalisasi akan membuka kembali akses penilaian juri dan mengubah status peserta menjadi "tampil". Lanjutkan?')) {
      return
    }

    try {
      // 1. Update Peserta status to 'tampil'
      await supabase.from('peserta').update({ status: 'tampil' } as any).eq('id', pesertaId)

      // 2. Find associated sesi and update it to berjalan & unlock
      const sesi = sesiList.find(s => s.peserta_aktif_id === pesertaId)
      if (sesi) {
        await supabase.from('sesi').update({ 
          status: 'berjalan',
          nilai_dikunci: false
        } as any).eq('id', sesi.id)
      }

      alert('Peserta berhasil dikembalikan ke status tampil dan penilaian dibuka kembali.')
    } catch (err) {
      console.error(err)
      alert('Gagal membatalkan finalisasi.')
    }
  }

  const getKategoriNama = (k: Kategori | Kategori[] | null) => {
    if (!k) return '-'
    if (Array.isArray(k)) return k.map(x => x.nama).join(', ')
    return k.nama
  }

  return (
    <div className="space-y-6">
      <div className="panel">
        <h2 className="panel-header mb-4 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          Navigasi Cepat (God Mode)
        </h2>
        <p className="panel-subtext mb-6">
          Anda memiliki hak istimewa untuk memasuki panel operator kapan saja untuk melakukan intervensi atau pemantauan langsung.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/op-regis" target="_blank" className="p-4 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-colors flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg text-white">
                <Users className="w-5 h-5" />
              </div>
              <div className="font-semibold text-blue-900">Panel Registrasi</div>
            </div>
            <ExternalLink className="w-4 h-4 text-blue-500 opacity-50 group-hover:opacity-100" />
          </Link>

          <Link href="/op-sesi" target="_blank" className="p-4 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 transition-colors flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg text-white">
                <MonitorPlay className="w-5 h-5" />
              </div>
              <div className="font-semibold text-indigo-900">Panel Operator Sesi</div>
            </div>
            <ExternalLink className="w-4 h-4 text-indigo-500 opacity-50 group-hover:opacity-100" />
          </Link>

          <Link href="/admin" target="_blank" className="p-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 transition-colors flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#c81e1e] rounded-lg text-white">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="font-semibold text-rose-900">Panel Inspektur (IP)</div>
            </div>
            <ExternalLink className="w-4 h-4 text-rose-500 opacity-50 group-hover:opacity-100" />
          </Link>
        </div>
      </div>

      <div className="panel">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="panel-header">Monitoring Peserta</h2>
            <p className="panel-subtext">Daftar seluruh peserta di event ini beserta status penampilannya.</p>
          </div>
          <button onClick={loadData} className="btn-secondary" title="Refresh Data">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[var(--color-text-muted)] uppercase bg-[var(--color-cream-2)] border-y border-[var(--color-border)]">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi & Kontrol</th>
              </tr>
            </thead>
            <tbody>
              {pesertaList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                    Belum ada peserta yang terdaftar pada event ini.
                  </td>
                </tr>
              ) : (
                pesertaList.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-cream-1)]/50">
                    <td className="px-4 py-3 font-medium text-slate-700">{p.nomor_undian || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{p.nama}</td>
                    <td className="px-4 py-3 text-slate-600">{getKategoriNama(p.kategori)}</td>
                    <td className="px-4 py-3">
                      {p.status === 'selesai' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800">Selesai</span>
                      ) : p.status === 'tampil' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 animate-pulse">Sedang Tampil</span>
                      ) : p.status === 'bersiap' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">Bersiap</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-800">Menunggu</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedDetailPeserta(p.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Detail & Progres
                        </button>

                        {p.status === 'selesai' && (
                          <button
                            onClick={() => handleBatalFinalkan(p.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shadow-sm"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Batal Finalkan
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDetailPeserta && (
        <DetailPesertaModal
          pesertaId={selectedDetailPeserta}
          sesiId={sesiList.find(s => s.peserta_aktif_id === selectedDetailPeserta)?.id}
          pesertaNama={pesertaList.find(p => p.id === selectedDetailPeserta)?.nama || ''}
          pesertaUndian={pesertaList.find(p => p.id === selectedDetailPeserta)?.nomor_undian || null}
          pesertaMazmur={pesertaList.find(p => p.id === selectedDetailPeserta)?.mazmur_bacaan || null}
          juriList={juriList}
          onClose={() => setSelectedDetailPeserta(null)}
          onAkhiriPenampilan={async () => {
            const row = pesertaList.find(d => d.id === selectedDetailPeserta);
            if (row) {
               if (!window.confirm('Akhiri & Finalkan penampilan peserta ini secara paksa?')) return
               const sId = sesiList.find(s => s.peserta_aktif_id === row.id)?.id
               if (sId) {
                 await supabase.from('sesi').update({ nilai_dikunci: true, status: 'selesai' } as any).eq('id', sId)
               }
               await supabase.from('peserta').update({ status: 'selesai' } as any).eq('id', row.id)
               loadData()
            }
          }}
          currentUser={currentUser || undefined}
          currentUserRole={currentUser?.role}
        />
      )}
    </div>
  )
}
