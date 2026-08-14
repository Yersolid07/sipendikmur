'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Upload, FileSpreadsheet, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Props {
  eventId: string
  kategoriList: { id: string; nama: string }[]
  onClose: () => void
  onSuccess: () => void
}

interface ParsedRow {
  kategori: string
  nama: string
  asal_jemaat: string
  nomor_undian: string
  mazmur_bacaan: string
  _status?: 'valid' | 'invalid'
  _error?: string
  _kategoriId?: string
}

export default function ImportExcelModal({ eventId, kategoriList, onClose, onSuccess }: Props) {
  const [dataPreview, setDataPreview] = useState<ParsedRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const supabase = createClient()

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    const reader = new FileReader()
    
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        
        // Baca data as array of arrays
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
        
        // Asumsi baris 1 adalah header: ["Kategori", "Nama Peserta", "Asal Jemaat", "Nomor Undian", "Mazmur Bacaan"]
        // Kita mulai baca dari baris 2 (index 1)
        const parsedRows: ParsedRow[] = []
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i]
          if (!row || row.length === 0 || (!row[0] && !row[1])) continue // Skip empty rows

          const kategoriName = (row[0] || '').toString().trim()
          const nama = (row[1] || '').toString().trim()
          const asalJemaat = (row[2] || '').toString().trim()
          const noUndian = (row[3] || '').toString().trim()
          const mazmur = (row[4] || '').toString().trim()

          // Cari kategori yang cocok secara case-insensitive
          const matchedKategori = kategoriList.find(k => k.nama.toLowerCase() === kategoriName.toLowerCase())
          
          let status: 'valid' | 'invalid' = 'valid'
          let error = ''
          let kId = matchedKategori?.id

          if (!kategoriName || !nama || !asalJemaat) {
            status = 'invalid'
            error = 'Kolom Kategori, Nama, dan Asal Jemaat wajib diisi'
          } else if (!matchedKategori) {
            status = 'invalid'
            error = `Kategori "${kategoriName}" tidak ditemukan di sistem`
          }

          parsedRows.push({
            kategori: kategoriName,
            nama,
            asal_jemaat: asalJemaat,
            nomor_undian: noUndian,
            mazmur_bacaan: mazmur,
            _status: status,
            _error: error,
            _kategoriId: kId
          })
        }
        
        setDataPreview(parsedRows)
      } catch (err) {
        alert('Gagal membaca file Excel. Pastikan format sudah benar.')
      } finally {
        setIsProcessing(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    
    reader.readAsBinaryString(file)
  }

  async function handleImport() {
    const validData = dataPreview.filter(r => r._status === 'valid')
    if (validData.length === 0) return

    setIsSaving(true)

    const payload = validData.map(r => ({
      event_id: eventId,
      kategori_id: r._kategoriId,
      nama: r.nama,
      asal_jemaat: r.asal_jemaat,
      nomor_undian: r.nomor_undian || null,
      mazmur_bacaan: r.mazmur_bacaan || null
    }))

    const { error } = await supabase.from('peserta').insert(payload as any)
    setIsSaving(false)

    if (error) {
      alert('Gagal import data: ' + error.message)
    } else {
      alert(`Berhasil mengimpor ${validData.length} peserta!`)
      onSuccess()
    }
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Kategori', 'Nama Peserta', 'Asal Jemaat', 'Nomor Undian', 'Mazmur Bacaan'],
      ['Pria/Kaum Bapa', 'P/KB Zaitun', 'Zaitun Mahakeret', '01', 'Mazmur 23'],
      ['Remaja', 'Remaja Betel', 'Betel Teling', '02', 'Mazmur 1']
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template Peserta')
    XLSX.writeFile(wb, 'Template_Import_Peserta.xlsx')
  }

  const validCount = dataPreview.filter(r => r._status === 'valid').length
  const invalidCount = dataPreview.filter(r => r._status === 'invalid').length

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Import Data Excel</h2>
            <p className="text-xs text-gray-500 mt-1">Upload banyak peserta sekaligus dari Excel</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto flex flex-col gap-6">
          {dataPreview.length === 0 ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-12 bg-gray-50">
              <FileSpreadsheet className="w-16 h-16 text-blue-500 mb-4 opacity-80" />
              <h3 className="font-semibold text-gray-700 mb-1">Pilih File Excel (.xlsx / .csv)</h3>
              <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">
                Pastikan baris pertama adalah judul kolom sesuai dengan template standar sistem.
              </p>
              
              <div className="flex gap-4">
                <button onClick={downloadTemplate} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                  Unduh Template
                </button>
                <label className="btn-primary cursor-pointer">
                  {isProcessing ? 'Memproses...' : 'Pilih File Excel'}
                  <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} disabled={isProcessing} ref={fileInputRef} />
                </label>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 h-full">
              <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100 shrink-0">
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Total Baris</div>
                    <div className="font-bold text-lg">{dataPreview.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Valid siap Import</div>
                    <div className="font-bold text-lg text-green-600">{validCount}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Error / Tidak Valid</div>
                    <div className="font-bold text-lg text-red-500">{invalidCount}</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setDataPreview([])} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100">Reset File</button>
                  <button 
                    onClick={handleImport} 
                    disabled={isSaving || validCount === 0} 
                    className="btn-primary"
                  >
                    {isSaving ? 'Menyimpan...' : `Import ${validCount} Data`}
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden flex-1 flex flex-col">
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600 text-xs uppercase sticky top-0 shadow-sm">
                      <tr>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Kategori</th>
                        <th className="px-4 py-3">Nama</th>
                        <th className="px-4 py-3">Asal Jemaat</th>
                        <th className="px-4 py-3">No. Undian</th>
                        <th className="px-4 py-3">Mazmur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dataPreview.map((row, i) => (
                        <tr key={i} className={row._status === 'invalid' ? 'bg-red-50' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-2">
                            {row._status === 'valid' ? (
                              <span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold px-2 py-1 bg-green-100 rounded-md">Valid</span>
                            ) : (
                              <div className="flex items-center gap-1 text-red-600 text-xs font-semibold px-2 py-1 bg-red-100 rounded-md cursor-help" title={row._error}>
                                <AlertTriangle className="w-3 h-3" /> Error
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2">{row.kategori}</td>
                          <td className="px-4 py-2 font-medium">{row.nama}</td>
                          <td className="px-4 py-2">{row.asal_jemaat}</td>
                          <td className="px-4 py-2">{row.nomor_undian}</td>
                          <td className="px-4 py-2">{row.mazmur_bacaan}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
