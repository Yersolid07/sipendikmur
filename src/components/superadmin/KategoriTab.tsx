'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, Kategori } from '@/types/database'

export default function KategoriTab({ activeEvent }: { activeEvent: Event | undefined }) {
  const [kategoris, setKategoris] = useState<Kategori[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const supabase = createClient()

  // Form State
  const [nama, setNama] = useState('')
  const [jenisLomba, setJenisLomba] = useState<'perorangan' | 'beregu'>('perorangan')
  const [urutan, setUrutan] = useState(1)
  
  // Weights State
  const [wInterpretasi, setWInterpretasi] = useState(35)
  const [wPenghayatan, setWPenghayatan] = useState(30)
  const [wArtikulasi, setWArtikulasi] = useState(25)
  const [wPenampilan, setWPenampilan] = useState(10)
  const [wKekompakan, setWKekompakan] = useState(30)
  
  // Range State
  const [rangeMin, setRangeMin] = useState(0)
  const [rangeMax, setRangeMax] = useState(100)

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  async function loadData() {
    if (!activeEvent) return
    setIsLoading(true)
    const { data } = await supabase.from('kategori').select('*').eq('event_id', activeEvent.id).order('urutan')
    setKategoris(data as Kategori[] ?? [])
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [activeEvent])

  // Reset bobot when changing jenis_lomba in form
  useEffect(() => {
    if (!editId) {
      if (jenisLomba === 'perorangan') {
        setWInterpretasi(35); setWPenghayatan(30); setWArtikulasi(25); setWPenampilan(10);
      } else {
        setWKekompakan(30); setWPenghayatan(25); setWInterpretasi(20); setWArtikulasi(20); setWPenampilan(5);
      }
    }
  }, [jenisLomba, editId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeEvent) return

    // Validation: Total weight must be 100
    const totalWeight = jenisLomba === 'perorangan' 
      ? wInterpretasi + wPenghayatan + wArtikulasi + wPenampilan
      : wKekompakan + wPenghayatan + wInterpretasi + wArtikulasi + wPenampilan

    if (Math.abs(totalWeight - 100) > 0.01) {
      showToast('error', `Total bobot harus 100%! Saat ini: ${totalWeight}%`)
      return
    }

    const payload = {
      event_id: activeEvent.id,
      nama,
      jenis_lomba: jenisLomba,
      urutan,
      maks_interpretasi: wInterpretasi,
      maks_penghayatan: wPenghayatan,
      maks_artikulasi: wArtikulasi,
      maks_penampilan: wPenampilan,
      maks_kekompakan: jenisLomba === 'beregu' ? wKekompakan : null,
      range_min: rangeMin,
      range_max: rangeMax,
    }

    if (editId) {
      await supabase.from('kategori').update(payload as any).eq('id', editId)
      showToast('success', 'Kategori diperbarui')
    } else {
      await supabase.from('kategori').insert(payload as any)
      showToast('success', 'Kategori ditambahkan')
    }

    setShowForm(false)
    setEditId(null)
    loadData()
  }

  function handleEdit(k: Kategori) {
    setEditId(k.id)
    setNama(k.nama)
    setJenisLomba(k.jenis_lomba)
    setUrutan(k.urutan)
    setWInterpretasi(Number(k.maks_interpretasi))
    setWPenghayatan(Number(k.maks_penghayatan))
    setWArtikulasi(Number(k.maks_artikulasi))
    setWPenampilan(Number(k.maks_penampilan))
    setWKekompakan(Number(k.maks_kekompakan || 30))
    setRangeMin(Number(k.range_min ?? 0))
    setRangeMax(Number(k.range_max ?? 100))
    setShowForm(true)
  }

  if (!activeEvent) {
    return <div className="text-center p-6 text-[var(--color-text-muted)]">Silakan aktifkan event terlebih dahulu.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-display font-semibold text-[var(--color-text)]">Kategori & Bobot Nilai</h3>
          <p className="text-xs text-[var(--color-text-muted)]">Atur parameter lomba untuk {activeEvent.nama}</p>
        </div>
        <button onClick={() => {
          setEditId(null)
          setNama('')
          setJenisLomba('perorangan')
          setUrutan(kategoris.length + 1)
          setRangeMin(0)
          setRangeMax(100)
          setShowForm(true)
        }} className="btn-primary">+ Tambah Kategori</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-5 animate-fade-in-up space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Nama Kategori</label>
              <input value={nama} onChange={e => setNama(e.target.value)} required placeholder="Contoh: Seri A Teladan" className="form-input" />
            </div>
            <div>
              <label className="form-label">Urutan Tampil (Opsional)</label>
              <input type="number" value={urutan} onChange={e => setUrutan(Number(e.target.value))} required className="form-input" />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Jenis Lomba</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="jenis" checked={jenisLomba === 'perorangan'} onChange={() => setJenisLomba('perorangan')} className="text-[var(--color-amber)]" />
                  <span className="text-[var(--color-text)]">👤 Perorangan</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="jenis" checked={jenisLomba === 'beregu'} onChange={() => setJenisLomba('beregu')} className="text-[var(--color-amber)]" />
                  <span className="text-[var(--color-text)]">👥 Beregu</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)]">
            <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Rentang Nilai Konvensional</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Batas Bawah (Min)</label>
                <input type="number" step="0.001" value={rangeMin} onChange={e => setRangeMin(Number(e.target.value))} required className="form-input text-[var(--color-text)]" placeholder="Contoh: 80.000" />
              </div>
              <div>
                <label className="form-label">Batas Atas (Max)</label>
                <input type="number" step="0.001" value={rangeMax} onChange={e => setRangeMax(Number(e.target.value))} required className="form-input text-[var(--color-text)]" placeholder="Contoh: 81.999" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)]">
            <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Bobot Penilaian (%)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {jenisLomba === 'beregu' && (
                <div>
                  <label className="form-label text-xs">Kekompakan</label>
                  <input type="number" step="0.01" value={wKekompakan} onChange={e => setWKekompakan(Number(e.target.value))} className="form-input text-center text-[var(--color-amber-dark)] font-bold" />
                </div>
              )}
              <div>
                <label className="form-label text-xs">Interpretasi</label>
                <input type="number" step="0.01" value={wInterpretasi} onChange={e => setWInterpretasi(Number(e.target.value))} className="form-input text-center text-[var(--color-amber-dark)] font-bold" />
              </div>
              <div>
                <label className="form-label text-xs">Penghayatan</label>
                <input type="number" step="0.01" value={wPenghayatan} onChange={e => setWPenghayatan(Number(e.target.value))} className="form-input text-center text-[var(--color-amber-dark)] font-bold" />
              </div>
              <div>
                <label className="form-label text-xs">Artikulasi</label>
                <input type="number" step="0.01" value={wArtikulasi} onChange={e => setWArtikulasi(Number(e.target.value))} className="form-input text-center text-[var(--color-amber-dark)] font-bold" />
              </div>
              <div>
                <label className="form-label text-xs">Penampilan</label>
                <input type="number" step="0.01" value={wPenampilan} onChange={e => setWPenampilan(Number(e.target.value))} className="form-input text-center text-[var(--color-amber-dark)] font-bold" />
              </div>
            </div>
            
            {/* Total Indicator */}
            <div className="mt-4 flex justify-between items-center bg-[var(--color-cream-2)] p-3 rounded-lg border border-[var(--color-border)]">
              <span className="text-sm text-[var(--color-text-muted)]">Total Bobot:</span>
              <span className={`text-lg font-bold ${
                (jenisLomba === 'perorangan' ? wInterpretasi + wPenghayatan + wArtikulasi + wPenampilan : wKekompakan + wInterpretasi + wPenghayatan + wArtikulasi + wPenampilan) === 100 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {jenisLomba === 'perorangan' ? wInterpretasi + wPenghayatan + wArtikulasi + wPenampilan : wKekompakan + wInterpretasi + wPenghayatan + wArtikulasi + wPenampilan}%
              </span>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary">Simpan</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center p-6"><span className="spinner" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {kategoris.map(k => (
            <div key={k.id} className="glass-card p-4 hover:border-[var(--color-amber-light)] transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-[var(--color-text)]">{k.nama}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${k.jenis_lomba === 'perorangan' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {k.jenis_lomba === 'perorangan' ? '👤 Perorangan' : '👥 Beregu'}
                  </span>
                </div>
                <button onClick={() => handleEdit(k)} className="text-[var(--color-text-light)] hover:text-[var(--color-amber-dark)] opacity-0 group-hover:opacity-100 transition-opacity">✏️</button>
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1 mb-2">
                Rentang: <span className="font-semibold text-emerald-600">{Number(k.range_min ?? 0).toFixed(3)} - {Number(k.range_max ?? 100).toFixed(3)}</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs text-[var(--color-text-muted)] mt-2 border-t border-[var(--color-border)] pt-2">
                {k.jenis_lomba === 'beregu' && <div>Kekompakan: <span className="font-semibold text-[var(--color-text)]">{k.maks_kekompakan}%</span></div>}
                <div>Interpretasi: <span className="font-semibold text-[var(--color-text)]">{k.maks_interpretasi}%</span></div>
                <div>Penghayatan: <span className="font-semibold text-[var(--color-text)]">{k.maks_penghayatan}%</span></div>
                <div>Artikulasi: <span className="font-semibold text-[var(--color-text)]">{k.maks_artikulasi}%</span></div>
                <div>Penampilan: <span className="font-semibold text-[var(--color-text)]">{k.maks_penampilan}%</span></div>
              </div>
            </div>
          ))}
          {kategoris.length === 0 && !showForm && (
            <div className="col-span-2 text-center text-[var(--color-text-muted)] py-10">Belum ada kategori untuk event ini.</div>
          )}
        </div>
      )}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
