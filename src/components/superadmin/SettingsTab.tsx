'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Setting } from '@/types/database'

export default function SettingsTab() {
  const [settings, setSettings] = useState<Setting | null>(null)
  const [namaPenyelenggara, setNamaPenyelenggara] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
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
        <h3 className="font-display font-semibold text-white">Pengaturan Global</h3>
        <p className="text-xs text-slate-400">Atur tampilan dan branding sistem (Berlaku untuk semua halaman)</p>
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
              placeholder="Contoh: BUMOTIK, GMIM, P/KB SINODE" 
            />
            <p className="text-xs text-slate-500 mt-1">Akan muncul di sebelah logo pada Navbar dan Kop Surat.</p>
          </div>
          
          <div>
            <label className="form-label">URL Logo (Opsional)</label>
            <input 
              value={logoUrl} 
              onChange={e => setLogoUrl(e.target.value)} 
              className="form-input" 
              placeholder="https://..." 
            />
            <p className="text-xs text-slate-500 mt-1">Masukkan link gambar (PNG/SVG) untuk mengganti logo default BUMOTIK.</p>
          </div>

          {logoUrl && (
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-700/50 inline-block">
              <p className="text-xs text-slate-400 mb-2">Preview Logo:</p>
              <img src={logoUrl} alt="Logo Preview" className="h-16 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
            </div>
          )}

          <div className="pt-4 border-t border-slate-700/50 flex justify-end">
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
