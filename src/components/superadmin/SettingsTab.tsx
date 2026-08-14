'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Setting } from '@/types/database'
import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

export default function SettingsTab() {
  const [settings, setSettings] = useState<Setting | null>(null)
  const [namaPenyelenggara, setNamaPenyelenggara] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [informasiLomba, setInformasiLomba] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  
  const supabase = createClient()

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function loadSettings() {
    setIsLoading(true)
    const { data } = await supabase.from('settings').select('*').limit(1).single()
    if (data) {
      setSettings(data as Setting)
      setNamaPenyelenggara(data.nama_penyelenggara || '')
      setLogoUrl(data.logo_url || '')
      setInformasiLomba(data.informasi_lomba || '')
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadSettings()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    
    const payload = {
      nama_penyelenggara: namaPenyelenggara,
      logo_url: logoUrl,
      informasi_lomba: informasiLomba,
    }

    if (settings) {
      const { error } = await supabase.from('settings').update(payload as any).eq('id', settings.id)
      if (error) showToast('error', 'Gagal update settings')
      else showToast('success', 'Pengaturan global berhasil disimpan!')
    } else {
      const { error } = await supabase.from('settings').insert(payload as any)
      if (error) showToast('error', 'Gagal insert settings')
      else showToast('success', 'Pengaturan global berhasil dibuat!')
    }
    
    loadSettings()
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-semibold text-[var(--color-text)]">Pengaturan Global</h3>
        <p className="text-xs text-[var(--color-text-muted)]">Atur tampilan dan branding sistem (Berlaku untuk semua halaman)</p>
      </div>

      {isLoading ? (
        <div className="p-10 text-center"><span className="spinner" /></div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5 max-w-2xl">
          <div>
            <label className="form-label">Nama Penyelenggara (Singkatan / Teks Utama)</label>
            <input 
              required 
              value={namaPenyelenggara} 
              onChange={e => setNamaPenyelenggara(e.target.value)} 
              className="form-input" 
              placeholder="Contoh: P/KB SINODE, GMIM Wilayah Manado" 
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Akan muncul di sebelah logo pada Navbar dan Kop Surat.</p>
          </div>
          
          <div>
            <label className="form-label">URL Logo (Opsional)</label>
            <input 
              value={logoUrl} 
              onChange={e => setLogoUrl(e.target.value)} 
              className="form-input" 
              placeholder="https://..." 
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Masukkan link gambar (PNG/SVG) untuk mengganti logo default GMIM.</p>
          </div>

          {logoUrl && (
            <div className="p-4 bg-[var(--color-cream-2)] rounded-lg border border-[var(--color-border)] inline-block">
              <p className="text-xs text-[var(--color-text-muted)] mb-2">Preview Logo:</p>
              <img src={logoUrl} alt="Logo Preview" className="h-16 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
            </div>
          )}

          <div className="pt-4 border-t border-[var(--color-border)]">
            <h4 className="font-semibold text-[var(--color-text)] mb-3">Informasi Lomba</h4>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              Isi syarat & ketentuan, deskripsi lomba, pedoman kategori, dll. Mendukung format tabel, list, dan link.
            </p>
            <div className="bg-white rounded-lg border border-[var(--color-border)] [&_.ql-editor]:min-h-[300px]">
              <ReactQuill 
                theme="snow" 
                value={informasiLomba} 
                onChange={setInformasiLomba} 
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'image'],
                    ['clean']
                  ]
                }}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)] flex justify-end">
            <button type="submit" disabled={isSaving} className="btn-primary px-8">
              {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
