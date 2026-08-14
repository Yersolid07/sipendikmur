'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Event } from '@/types/database'

interface Props {
  juriList: Profile[]
  activeEvent: Event | null
}

export default function AdminJuriTab({ juriList, activeEvent }: Props) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState({ nama: '', email: '', password: '' })
  const [isCreating, setIsCreating] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (showCreateForm || resetPasswordId) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [showCreateForm, resetPasswordId])

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleCreateJuri(e: React.FormEvent) {
    e.preventDefault()
    setIsCreating(true)
    try {
      // Call API route to create user (requires service role key)
      const res = await fetch('/api/admin/create-juri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast('success', `Akun juri untuk ${form.nama} berhasil dibuat!`)
      setForm({ nama: '', email: '', password: '' })
      setShowCreateForm(false)
    } catch (err: any) {
      showToast('error', err.message)
    } finally {
      setIsCreating(false)
    }
  }

  async function handleResetPassword(juriId: string) {
    if (!newPassword || newPassword.length < 8) {
      showToast('error', 'Password minimal 8 karakter')
      return
    }
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: juriId, newPassword }),
    })
    if (res.ok) {
      showToast('success', 'Password berhasil direset!')
      setResetPasswordId(null)
      setNewPassword('')
    } else {
      showToast('error', 'Gagal reset password')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-[var(--color-text)]">⚖️ Manajemen Juri</h3>
          <p className="text-xs text-[var(--color-text-muted)]">{juriList.length} juri terdaftar</p>
        </div>
        <button onClick={() => setShowCreateForm(true)} className="btn-primary">+ Tambah Juri</button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="panel">
          <h4 className="font-semibold text-[var(--color-text)] mb-4">Buat Akun Juri Baru</h4>
          <form onSubmit={handleCreateJuri} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Nama Lengkap *</label>
              <input value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} className="form-input" required placeholder="Nama juri" />
            </div>
            <div>
              <label className="form-label">Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="form-input" required placeholder="email@domain.com" />
            </div>
            <div>
              <label className="form-label">Password Awal *</label>
              <input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="form-input" required placeholder="Min. 8 karakter" />
            </div>
            <div className="flex items-end gap-3">
              <button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary flex-1">Batal</button>
              <button type="submit" disabled={isCreating} className="btn-primary flex-1">
                {isCreating ? <><span className="spinner" /> Membuat...</> : '+ Buat Akun'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Juri list */}
      <div className="panel p-0 overflow-hidden">
        {juriList.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">⚖️</div>
            <p className="text-[var(--color-text-muted)] text-sm">Belum ada akun juri</p>
          </div>
        ) : (
          <table className="table-container">
            <thead className="table-header">
              <tr>
                <th>Nama Juri</th>
                <th>Email</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {juriList.map((j) => (
                <tr key={j.id} className="table-row">
                  <td className="font-semibold text-[var(--color-text)]">{j.nama}</td>
                  <td className="text-[var(--color-text-muted)]">{j.email}</td>
                  <td>
                    {j.is_active ? (
                      <span className="badge badge-success text-xs px-2 py-0.5">● Aktif</span>
                    ) : (
                      <span className="badge badge-error text-xs px-2 py-0.5">Nonaktif</span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => { setResetPasswordId(j.id); setNewPassword('') }}
                      className="text-xs px-2 py-1 rounded border border-[var(--color-border-dark)] text-[var(--color-text-muted)] hover:text-[var(--color-amber-dark)] hover:border-[var(--color-amber-dark)] transition-all bg-[var(--color-cream-1)]"
                    >
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reset password modal */}
      {resetPasswordId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="panel w-full max-w-sm">
            <h4 className="font-display text-xl font-semibold text-[var(--color-text)] mb-4">Reset Password Juri</h4>
            <div className="space-y-4">
              <div>
                <label className="form-label">Password Baru</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input"
                  placeholder="Min. 8 karakter"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setResetPasswordId(null)} className="btn-secondary flex-1">Batal</button>
                <button onClick={() => handleResetPassword(resetPasswordId)} className="btn-primary flex-1">Reset</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '⚠'} {toast.msg}</div>}
    </div>
  )
}
