'use client'

import { useState, useEffect } from 'react'
import { Profile, Event, Setting, RekapPenilaian } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { FileText, Printer, Plus, Upload } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import AddPesertaModal from './AddPesertaModal'
import ImportExcelModal from './ImportExcelModal'

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
  
  const [kategoriList, setKategoriList] = useState<{ id: string; nama: string }[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  
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
    
    // Fetch categories for forms
    const { data: katData } = await supabase.from('kategori').select('id, nama').order('nama')
    if (katData) setKategoriList(katData)

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
    const brand = settings?.nama_penyelenggara || 'Sistem Penjurian GMIM'
    
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

  async function exportToWord(p: RekapPenilaian) {
    const { data: detailNilai } = await supabase
      .from('penilaian')
      .select('*, juri:juri_id(nama)')
      .eq('peserta_id', p.peserta_id)
      .eq('is_submitted', true)
      
    const brand = settings?.nama_penyelenggara || 'Sistem Penjurian GMIM'
    
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = await import('docx')
    const { saveAs } = await import('file-saver')

    let tableRows = []
    
    if (p.jenis_lomba === 'perorangan') {
      tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Juri')] }),
            new TableCell({ children: [new Paragraph('Interpretasi (35%)')] }),
            new TableCell({ children: [new Paragraph('Penghayatan (30%)')] }),
            new TableCell({ children: [new Paragraph('Artikulasi (25%)')] }),
            new TableCell({ children: [new Paragraph('Penampilan (10%)')] }),
            new TableCell({ children: [new Paragraph('Catatan')] }),
          ]
        }),
        ...(detailNilai || []).map((n: any) => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(n.juri.nama)] }),
            new TableCell({ children: [new Paragraph(n.interpretasi?.toString() || '0')] }),
            new TableCell({ children: [new Paragraph(n.penghayatan?.toString() || '0')] }),
            new TableCell({ children: [new Paragraph(n.artikulasi?.toString() || '0')] }),
            new TableCell({ children: [new Paragraph(n.penampilan?.toString() || '0')] }),
            new TableCell({ children: [new Paragraph(n.catatan || '-')] }),
          ]
        }))
      ]
    } else {
      tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Juri')] }),
            new TableCell({ children: [new Paragraph('Kekompakan (30%)')] }),
            new TableCell({ children: [new Paragraph('Interpretasi (20%)')] }),
            new TableCell({ children: [new Paragraph('Penghayatan (25%)')] }),
            new TableCell({ children: [new Paragraph('Artikulasi (20%)')] }),
            new TableCell({ children: [new Paragraph('Penampilan (5%)')] }),
            new TableCell({ children: [new Paragraph('Catatan')] }),
          ]
        }),
        ...(detailNilai || []).map((n: any) => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(n.juri.nama)] }),
            new TableCell({ children: [new Paragraph(n.kekompakan?.toString() || '0')] }),
            new TableCell({ children: [new Paragraph(n.interpretasi?.toString() || '0')] }),
            new TableCell({ children: [new Paragraph(n.penghayatan?.toString() || '0')] }),
            new TableCell({ children: [new Paragraph(n.artikulasi?.toString() || '0')] }),
            new TableCell({ children: [new Paragraph(n.penampilan?.toString() || '0')] }),
            new TableCell({ children: [new Paragraph(n.catatan || '-')] }),
          ]
        }))
      ]
    }

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows
    })

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ children: [new TextRun({ text: 'HASIL PENILAIAN LOMBA BACA MAZMUR', bold: true, size: 28 })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: activeEvent?.nama || '', size: 24 })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: brand, size: 20 })], alignment: AlignmentType.CENTER }),
          new Paragraph({ text: '' }),
          new Paragraph(`Nama Peserta: ${p.nama_peserta}`),
          new Paragraph(`Asal Jemaat: ${p.asal_jemaat}`),
          new Paragraph(`Kategori: ${p.kategori} (${p.jenis_lomba})`),
          new Paragraph(`No. Undian: ${p.nomor_undian || '-'}`),
          new Paragraph(`Mazmur: ${p.mazmur_bacaan || '-'}`),
          new Paragraph({ text: '' }),
          table,
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `Total Nilai Akhir: ${p.nilai_akhir || 'Belum Final'}`, bold: true })] }),
        ]
      }]
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `Hasil_${p.nama_peserta.replace(/ /g, '_')}_${p.kategori.replace(/ /g, '_')}.docx`)
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
      <div className="panel p-10 text-center">
        <h2 className="text-xl font-bold text-[var(--color-text)]">Tidak Ada Event Aktif</h2>
        <p className="text-[var(--color-text-muted)] mt-2">Hubungi Superadmin untuk mengaktifkan event.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="panel p-6 flex flex-col md:flex-row justify-between md:items-center gap-4 border-l-4 border-l-blue-600">
        <div>
          <h1 className="text-2xl font-display font-bold text-[var(--color-text)]">Panel Registrasi & Cetak Hasil</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">{activeEvent.nama}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-4 hidden sm:block">
            <div className="text-sm text-[var(--color-text-muted)]">Total Check-In</div>
            <div className="text-xl font-bold text-blue-600">{pesertaList.filter(p => p.is_checked_in).length} / {pesertaList.length}</div>
          </div>
          <button onClick={() => setShowImportModal(true)} className="px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import Excel
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tambah Peserta
          </button>
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
          className="form-input sm:w-64 bg-[var(--color-cream-1)] border-[var(--color-border-dark)] text-[var(--color-text)]"
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
        <div className="panel p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-container">
              <thead className="table-header">
                <tr>
                  <th>No. Urut</th>
                  <th>Kategori</th>
                  <th>Nama Peserta / Utusan</th>
                  <th>Status & Nilai</th>
                  <th className="text-center">Kehadiran</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.peserta_id} className="table-row">
                    <td className="text-lg font-display font-bold text-[var(--color-text-muted)]">{p.nomor_undian || '-'}</td>
                    <td>
                      <span className="badge badge-info text-xs px-2 py-0.5">{p.kategori}</span>
                    </td>
                    <td>
                      <div className="font-semibold text-[var(--color-text)]">{p.nama_peserta}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">{p.asal_jemaat}</div>
                    </td>
                    <td>
                      <div className="text-xs mb-1">
                        {p.jumlah_juri_menilai === 3 ? (
                          <span className="text-green-600 font-semibold">✅ Selesai Dinilai</span>
                        ) : p.jumlah_juri_menilai > 0 ? (
                          <span className="text-[var(--color-amber-dark)] font-semibold">⏳ Sedang Dinilai ({p.jumlah_juri_menilai}/3)</span>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">Belum Tampil</span>
                        )}
                      </div>
                      {p.jumlah_juri_menilai === 3 && (
                        <div className="font-bold text-[var(--color-text)]">Skor: {p.nilai_akhir}</div>
                      )}
                    </td>
                    <td className="text-center">
                      <button 
                        onClick={() => toggleCheckIn(p.peserta_id, p.is_checked_in)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${p.is_checked_in ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${p.is_checked_in ? 'left-7' : 'left-1'}`} />
                      </button>
                    </td>
                    <td className="text-right">
                      {p.jumlah_juri_menilai === 3 && (
                        <div className="flex gap-2 justify-end">
                          <button 
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                            onClick={() => exportToWord(p)}
                          >
                            <FileText className="w-4 h-4" /> Word
                          </button>
                          <button 
                            className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                            onClick={() => printHasil(p)}
                          >
                            <Printer className="w-4 h-4" /> PDF
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-[var(--color-text-muted)]">Tidak ada peserta ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {showAddModal && activeEvent && (
        <AddPesertaModal
          eventId={activeEvent.id}
          kategoriList={kategoriList}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            showToast('success', 'Peserta baru berhasil ditambahkan!')
            loadData()
          }}
        />
      )}

      {showImportModal && activeEvent && (
        <ImportExcelModal
          eventId={activeEvent.id}
          kategoriList={kategoriList}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false)
            showToast('success', 'Import Excel berhasil diselesaikan!')
            loadData()
          }}
        />
      )}
    </div>
  )
}
