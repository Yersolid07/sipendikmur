'use client'

import { useState, useEffect } from 'react'
import { Profile, Event, Setting, RekapPenilaian } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Props {
  profile: Profile
  activeEvent: Event | null
  settings: Setting | null
}

export default function OpRegisDashboard({ profile, activeEvent, settings }: Props) {
  const [pesertaList, setPesertaList] = useState<RekapPenilaian[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [kategoriFilter, setKategoriFilter] = useState('all')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  
  const supabase = createClient()

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function loadData() {
    if (!activeEvent) {
      setIsLoading(false)
      return
    }
    const { data } = await supabase
      .from('v_rekap_penilaian')
      .select('*')
      .eq('event_id', activeEvent.id)
      .order('kategori_id')
      .order('nomor_undian')

    if (data) setPesertaList(data as RekapPenilaian[])
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
    
    // Realtime subscription for peserta
    const channel = supabase.channel('realtime_peserta_opregis')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'peserta' }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'penilaian' }, () => {
        loadData() // Refresh for final scores
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeEvent])

  async function toggleCheckIn(pesertaId: string, currentStatus: boolean) {
    const { error } = await supabase.from('peserta').update({ is_checked_in: !currentStatus } as any).eq('id', pesertaId)
    if (error) showToast('error', 'Gagal update status check-in')
    else showToast('success', !currentStatus ? 'Peserta berhasil Check-In!' : 'Check-In dibatalkan.')
  }

  async function printHasil(p: RekapPenilaian) {
    // Ambil nilai detail per juri
    const { data: detailNilai } = await supabase
      .from('penilaian')
      .select('*, juri:juri_id(nama)')
      .eq('peserta_id', p.peserta_id)
      .eq('is_submitted', true)
      
    const doc = new jsPDF()
    const brand = settings?.nama_penyelenggara || 'BUMOTIK GMIM'
    
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(`HASIL PENILAIAN LOMBA BACA MAZMUR`, 105, 15, { align: 'center' })
    doc.setFontSize(14)
    doc.text(`${activeEvent?.nama}`, 105, 22, { align: 'center' })
    doc.text(`${brand}`, 105, 29, { align: 'center' })
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Nama Peserta: ${p.nama_peserta}`, 14, 45)
    doc.text(`Asal Jemaat: ${p.asal_jemaat}`, 14, 52)
    doc.text(`Kategori: ${p.kategori} (${p.jenis_lomba})`, 14, 59)
    doc.text(`No. Undian: ${p.nomor_undian || '-'}`, 130, 45)
    doc.text(`Mazmur: ${p.mazmur_bacaan || '-'}`, 130, 52)

    if (p.jenis_lomba === 'perorangan') {
      const body = detailNilai?.map((n: any) => [
        n.juri.nama,
        n.interpretasi || 0,
        n.penghayatan || 0,
        n.artikulasi || 0,
        n.penampilan || 0,
        n.catatan || '-'
      ]) || []

      autoTable(doc, {
        startY: 65,
        head: [['Juri', 'Interpretasi (35%)', 'Penghayatan (30%)', 'Artikulasi (25%)', 'Penampilan (10%)', 'Catatan']],
        body,
        styles: { fontSize: 9 }
      })
    } else {
      const body = detailNilai?.map((n: any) => [
        n.juri.nama,
        n.kekompakan || 0,
        n.interpretasi || 0,
        n.penghayatan || 0,
        n.artikulasi || 0,
        n.penampilan || 0,
        n.catatan || '-'
      ]) || []

      autoTable(doc, {
        startY: 65,
        head: [['Juri', 'Kekompakan (30%)', 'Interpretasi (20%)', 'Penghayatan (25%)', 'Artikulasi (20%)', 'Penampilan (5%)', 'Catatan']],
        body,
        styles: { fontSize: 8 }
      })
    }

    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`Total Nilai Akhir: ${p.nilai_akhir || 'Belum Final'}`, 14, finalY)
    
    doc.save(`Hasil_${p.nama_peserta.replace(/ /g, '_')}_${p.kategori.replace(/ /g, '_')}.pdf`)
  }

  const filtered = pesertaList.filter(p => {
    if (kategoriFilter !== 'all' && p.kategori_id !== kategoriFilter) return false
    if (search && !p.nama_peserta.toLowerCase().includes(search.toLowerCase()) && !p.asal_jemaat.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Unique categories for filter
  const categories = Array.from(new Set(pesertaList.map(p => p.kategori_id))).map(id => {
    return { id, nama: pesertaList.find(p => p.kategori_id === id)?.kategori }
  })

  if (!activeEvent) {
    return (
      <div className="glass-card p-10 text-center">
        <h2 className="text-xl font-bold text-white">Tidak Ada Event Aktif</h2>
        <p className="text-slate-400 mt-2">Hubungi Superadmin untuk mengaktifkan event.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 flex flex-col md:flex-row justify-between md:items-center gap-4 border-l-4 border-l-blue-500">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Panel Registrasi & Cetak Hasil</h1>
          <p className="text-slate-400 text-sm mt-1">{activeEvent.nama}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm text-slate-400">Total Check-In</div>
            <div className="text-xl font-bold text-blue-400">{pesertaList.filter(p => p.is_checked_in).length} / {pesertaList.length}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <input 
          type="text" 
          placeholder="Cari peserta / utusan..." 
          className="form-input flex-1"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select 
          className="form-input sm:w-64 bg-slate-900 border-slate-700"
          value={kategoriFilter}
          onChange={e => setKategoriFilter(e.target.value)}
        >
          <option value="all">Semua Kategori</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.nama}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center p-10"><span className="spinner" /></div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-slate-400">
                <tr>
                  <th className="p-4">No. Urut</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4">Nama Peserta / Utusan</th>
                  <th className="p-4">Status & Nilai</th>
                  <th className="p-4 text-center">Kehadiran</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map(p => (
                  <tr key={p.peserta_id} className="hover:bg-slate-800/30">
                    <td className="p-4 text-lg font-display font-bold text-slate-500">{p.nomor_undian || '-'}</td>
                    <td className="p-4">
                      <span className="badge badge-info">{p.kategori}</span>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">{p.nama_peserta}</div>
                      <div className="text-xs text-slate-400">{p.asal_jemaat}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs mb-1">
                        {p.jumlah_juri_menilai === 3 ? (
                          <span className="text-green-400">✅ Selesai Dinilai</span>
                        ) : p.jumlah_juri_menilai > 0 ? (
                          <span className="text-amber-400">⏳ Sedang Dinilai ({p.jumlah_juri_menilai}/3)</span>
                        ) : (
                          <span className="text-slate-500">Belum Tampil</span>
                        )}
                      </div>
                      {p.jumlah_juri_menilai === 3 && (
                        <div className="font-bold text-white">Skor: {p.nilai_akhir}</div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => toggleCheckIn(p.peserta_id, p.is_checked_in)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${p.is_checked_in ? 'bg-green-500' : 'bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${p.is_checked_in ? 'left-7' : 'left-1'}`} />
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      {p.jumlah_juri_menilai === 3 && (
                        <button onClick={() => printHasil(p)} className="btn-primary text-xs py-1.5 px-3">
                          🖨️ Cetak Hasil
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-500">Tidak ada peserta ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
