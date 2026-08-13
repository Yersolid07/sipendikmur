'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'

interface Props {
  profile: Profile
}

export default function Navbar({ profile }: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword !== confirmPassword) {
      setPasswordError('Password baru tidak sama!')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Password minimal 8 karakter!')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordError('Gagal mengubah password: ' + error.message)
    } else {
      setPasswordSuccess('Password berhasil diubah! ✓')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setShowPasswordModal(false)
        setPasswordSuccess('')
      }, 2000)
    }
  }

  const roleLabel = {
    superadmin: 'Super Admin',
    op_regis: 'Operator Registrasi',
    op_sesi: 'Operator Sesi',
    ip: 'Inspektur Pertandingan',
    juri: 'Juri',
  }[profile.role]

  const roleBadgeClass = {
    superadmin: 'badge-error',
    op_regis: 'badge-info',
    op_sesi: 'badge-success',
    ip: 'badge-warning',
    juri: 'badge-gold',
  }[profile.role]

  return (
    <>
      <nav className="navbar flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-700 to-amber-500 flex items-center justify-center shadow-[0_0_16px_rgba(201,168,76,0.3)]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="7.5" y="1" width="3" height="16" rx="1" fill="white" opacity="0.9"/>
              <rect x="3" y="6" width="12" height="3" rx="1" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <div>
            <span className="font-display font-bold text-lg text-gold-gradient">BUMOTIK</span>
            <span className="hidden sm:inline text-xs text-slate-500 ml-2">Penjurian Baca Mazmur</span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <span className={`badge ${roleBadgeClass}`}>{roleLabel}</span>
            <span className="text-sm text-white font-medium">{profile.nama}</span>
          </div>

          {/* Menu button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 rounded-lg border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-amber-500 transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="1" fill="currentColor"/>
                <circle cx="12" cy="12" r="1" fill="currentColor"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-11 w-48 glass-card-dark border-slate-700 shadow-2xl z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-700 sm:hidden">
                  <p className="text-sm font-semibold text-white">{profile.nama}</p>
                  <p className="text-xs text-slate-400">{roleLabel}</p>
                </div>
                <button
                  onClick={() => { setShowPasswordModal(true); setShowMenu(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Ganti Password
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 animate-fade-in-up">
            <h3 className="font-display text-xl font-semibold text-white mb-4">Ganti Password</h3>

            {passwordError && (
              <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="form-label">Password Baru</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input"
                  placeholder="Min. 8 karakter"
                  required
                />
              </div>
              <div>
                <label className="form-label">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
                  placeholder="Ulangi password baru"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Overlay close */}
      {showMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
      )}
    </>
  )
}
