'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

interface Props {
  eventId: string
  kategoriList: { id: string; nama: string; bahan_mazmur?: number[] | null }[]
  onClose: () => void
  onSuccess: () => void
}

export default function AddPesertaModal({ eventId, kategoriList, onClose, onSuccess }: Props) {
  const [nama, setNama] = useState('')
  const [asalJemaat, setAsalJemaat] = useState('')
  const [kategoriId, setKategoriId] = useState('')
  const [nomorPeserta, setNomorPeserta] = useState('')
  const [nomorUndian, setNomorUndian] = useState('')
  const [mazmurBacaan, setMazmurBacaan] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)

    const payload = {
      event_id: eventId,
      kategori_id: kategoriId,
      nama,
      asal_jemaat: asalJemaat,
      nomor_peserta: nomorPeserta || null,
      nomor_undian: nomorUndian || null,
      mazmur_bacaan: mazmurBacaan || null,
    }

    const { error } = await supabase.from('peserta').insert(payload as any)
    setIsSaving(false)

    if (error) {
      alert('Gagal menambahkan peserta: ' + error.message)
    } else {
      onSuccess()
    }
  }

  const selectedKategori = kategoriList.find(k => k.id === kategoriId)
  const allowedMazmur = selectedKategori?.bahan_mazmur || []

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Tambah Peserta</h2>
            <p className="text-xs text-gray-500 mt-1">Input peserta secara manual</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="form-label">Kategori Lomba <span className="text-red-500">*</span></label>
            <select required value={kategoriId} onChange={e => setKategoriId(e.target.value)} className="form-input">
              <option value="" disabled>-- Pilih Kategori --</option>
              {kategoriList.map(k => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="form-label">Nama Peserta / Utusan <span className="text-red-500">*</span></label>
            <input required type="text" value={nama} onChange={e => setNama(e.target.value)} className="form-input" placeholder="Contoh: P/KB Jemaat Zaitun" />
          </div>

          <div>
            <label className="form-label">Asal Jemaat <span className="text-red-500">*</span></label>
            <input required type="text" value={asalJemaat} onChange={e => setAsalJemaat(e.target.value)} className="form-input" placeholder="Contoh: Zaitun Mahakeret" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Nomor Peserta (Registrasi) <span className="text-gray-400 text-xs font-normal">(Opsional)</span></label>
              <input type="text" value={nomorPeserta} onChange={e => setNomorPeserta(e.target.value)} className="form-input" placeholder="ID/No. Pendaftaran" />
            </div>
            <div>
              <label className="form-label">No. Undian (Tampil) <span className="text-gray-400 text-xs font-normal">(Opsional)</span></label>
              <input type="number" value={nomorUndian} onChange={e => setNomorUndian(e.target.value)} className="form-input" placeholder="Contoh: 1" />
            </div>
            <div className="col-span-2">
              <label className="form-label">Mazmur Bacaan <span className="text-gray-400 text-xs font-normal">(Opsional)</span></label>
              {allowedMazmur.length > 0 ? (
                <select value={mazmurBacaan} onChange={e => setMazmurBacaan(e.target.value)} className="form-input bg-[var(--color-cream-1)]">
                  <option value="">-- Pilih Mazmur --</option>
                  {allowedMazmur.map(m => (
                    <option key={m} value={`Mazmur ${m}`}>Mazmur {m}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={mazmurBacaan} onChange={e => setMazmurBacaan(e.target.value)} className="form-input" placeholder="Contoh: Mazmur 23" />
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Batal</button>
            <button type="submit" disabled={isSaving || !kategoriId || !nama || !asalJemaat} className="btn-primary">
              {isSaving ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
