'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'

interface Props {
  profile: Profile
}

export default function Navbar({ profile }: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
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
    subadmin: 'Sub Admin',
    op_regis: 'Operator Registrasi',
    op_sesi: 'Operator Sesi',
    ip: 'Inspektur Pertandingan',
    juri: 'Juri',
  }[profile.role] ?? profile.role

  const roleBadgeClass = {
    superadmin: 'badge-error',
    subadmin: 'badge-warning',
    op_regis: 'badge-info',
    op_sesi: 'badge-success',
    ip: 'badge-warning',
    juri: 'badge-gold',
  }[profile.role] ?? 'badge-gold'

  return (
    <>
      <nav className="navbar flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img src="/Simbol_GMIM_free.png" alt="GMIM" className="w-9 h-9 object-contain" />
          <div>
            <span className="font-display font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
              Penjurian Baca Mazmur
            </span>
            <span className="hidden sm:inline text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>GMIM</span>
          </div>
        </div>

        {/* Center / Return Button */}
        {['subadmin', 'superadmin'].includes(profile.role) && pathname !== '/superadmin' && (
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2">
            <button
              onClick={() => router.push('/superadmin')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-full transition-colors border border-slate-200 shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Kembali ke {profile.role === 'subadmin' ? 'Panel Sub-Admin' : 'Superadmin'}
            </button>
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Role + name (desktop) */}
          <div className="hidden sm:flex items-center gap-2.5">
            <span className={`badge ${roleBadgeClass}`}>{roleLabel}</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{profile.nama}</span>
          </div>

          {/* Dots menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ border: '1px solid var(--color-border-dark)', color: 'var(--color-text-muted)' }}
            >
              <svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor">
                <circle cx="2" cy="2" r="1.5"/>
                <circle cx="2" cy="8" r="1.5"/>
                <circle cx="2" cy="14" r="1.5"/>
              </svg>
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-11 w-52 z-50 rounded-xl shadow-xl overflow-hidden"
                style={{ background: 'white', border: '1px solid var(--color-border)' }}
              >
                {/* Mobile: user info */}
                <div className="sm:hidden px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{profile.nama}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{roleLabel}</p>
                </div>

                <button
                  onClick={() => { setShowPasswordModal(true); setShowMenu(false) }}
                  className="w-full text-left px-4 py-3 text-sm flex items-center gap-2.5 transition-colors hover:bg-[var(--color-cream-2)]"
                  style={{ color: 'var(--color-text)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Ganti Password
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm flex items-center gap-2.5 transition-colors hover:bg-red-50"
                  style={{ color: '#b91c1c', borderTop: '1px solid var(--color-border)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(44,26,14,0.45)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl animate-fade-in-up shadow-2xl"
            style={{ background: 'white', border: '1px solid var(--color-border)' }}
          >
            <h3 className="font-display text-xl font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
              Ganti Password
            </h3>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
              Masukkan password baru Anda (min. 8 karakter).
            </p>

            {passwordError && (
              <div className="mb-4 p-3 rounded-lg text-sm"
                style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#b91c1c' }}>
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-4 p-3 rounded-lg text-sm"
                style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.25)', color: '#15803d' }}>
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
              <div className="flex gap-3 pt-1">
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

      {/* Click-outside close */}
      {showMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
      )}
    </>
  )
}
