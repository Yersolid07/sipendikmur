'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, KeyRound, Mail, ArrowLeft, Send } from 'lucide-react'

function LoginInner() {
  const searchParams = useSearchParams()
  const inactiveReason = searchParams.get('reason') === 'inactive'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(inactiveReason ? 'Akun Anda belum diaktivasi atau telah dinonaktifkan. Hubungi Admin Event.' : '')
  const [success, setSuccess] = useState('')
  const [isPending, setIsPending] = useState(false)
  
  const [showPassword, setShowPassword] = useState(false)
  const [isResetMode, setIsResetMode] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsPending(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('Email atau password salah. Silakan coba lagi.')
        setIsPending(false)
        return
      }

      // Check profile validity
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsPending(false)
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()
      
      if (profileData && profileData.is_active === false) {
        await supabase.auth.signOut()
        setError('Akun Anda belum divalidasi admin. Silakan hubungi Panitia atau Admin.')
        setIsPending(false)
        return
      }

      // Navigate directly to the correct dashboard URL based on role.
      // Using window.location.href ensures the browser makes a fresh server request
      // with the newly set auth cookies, bypassing Next.js router caching entirely.
      const role = profileData?.role
      if (role === 'superadmin' || role === 'subadmin') window.location.href = '/superadmin'
      else if (role === 'ip') window.location.href = '/admin'
      else if (role === 'op_regis') window.location.href = '/op-regis'
      else if (role === 'op_sesi') window.location.href = '/op-sesi'
      else window.location.href = '/dashboard'

    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
      setIsPending(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsPending(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      if (error) {
        console.error("Reset password error:", error)
        if (error.message.includes("URL not allowed")) {
          setError('Pengaturan Supabase: URL Vercel ini belum diizinkan. Hubungi Superadmin untuk menambahkan URL ini ke "Redirect URLs" di Supabase.')
        } else if (error.message.includes("rate limit")) {
          setError('Terlalu banyak permintaan pengiriman email. Silakan tunggu beberapa menit dan coba lagi nanti.')
        } else {
          setError(`Gagal: ${error.message}`)
        }
      } else {
        setSuccess('Link reset password telah dikirim ke email Anda! Silakan cek kotak masuk atau folder spam.')
      }
    } catch (err: any) {
      setError('Terjadi kesalahan. Silakan hubungi Superadmin.')
    }
    
    setIsPending(false)
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--color-cream)' }}>
      {/* Left panel — decorative */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12"
        style={{ background: 'linear-gradient(160deg, var(--color-cream-2) 0%, var(--color-cream-3) 100%)', borderRight: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <img src="/Simbol_GMIM_free.png" alt="GMIM" className="w-10 h-10 object-contain" />
          <span className="font-display font-semibold text-xl" style={{ color: 'var(--color-text)' }}>
            Penjurian Baca Mazmur
          </span>
        </div>
        <div>
          <blockquote className="font-display text-3xl font-medium leading-snug mb-6" style={{ color: 'var(--color-text)' }}>
            &ldquo;Pujilah TUHAN, hai segala bangsa, megahkanlah Dia, hai segala suku bangsa!&rdquo;
          </blockquote>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>— Mazmur 117:1</p>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-light)' }}>
          &copy; {new Date().getFullYear()} Gereja Masehi Injili di Minahasa
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <img src="/Simbol_GMIM_free.png" alt="GMIM" className="w-10 h-10 object-contain" />
          <span className="font-display font-semibold text-xl" style={{ color: 'var(--color-text)' }}>
            Penjurian Baca Mazmur
          </span>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="font-display text-3xl font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            {isResetMode ? <><KeyRound className="w-7 h-7 text-amber-500" /> Reset Password</> : 'Masuk'}
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
            {isResetMode 
              ? 'Masukkan email Anda untuk menerima link pengaturan ulang kata sandi.'
              : 'Masukkan email dan password yang diberikan panitia.'}
          </p>

          {error && (
            <div className="mb-5 p-3.5 rounded-lg flex items-start gap-2.5 text-sm"
              style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#b91c1c' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 p-3.5 rounded-lg flex items-start gap-2.5 text-sm"
              style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', color: '#047857' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              {success}
            </div>
          )}

          {isResetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label htmlFor="email" className="form-label font-medium flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> Email</label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input focus:ring-amber-500 focus:border-amber-500"
                  placeholder="nama@email.com"
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary w-full py-3 mt-4"
              >
                {isPending ? <><span className="spinner" />Mengirim...</> : <><Send className="w-4 h-4 mr-2 inline" />Kirim Link Reset</>}
              </button>
              
              <div className="text-center mt-6">
                <button 
                  type="button" 
                  onClick={() => { setIsResetMode(false); setError(''); setSuccess(''); }} 
                  className="text-sm text-slate-500 hover:text-amber-600 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali ke Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="form-label font-medium flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> Email</label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input focus:ring-amber-500 focus:border-amber-500"
                  placeholder="nama@email.com"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="password" className="form-label mb-0 font-medium flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-slate-400" /> Password
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setIsResetMode(true)}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                  >
                    Lupa Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input focus:ring-amber-500 focus:border-amber-500 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="btn-primary w-full py-3 mt-4"
                style={{ fontSize: '0.95rem' }}
              >
                {isPending ? (
                  <><span className="spinner" />Masuk...</>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                    Masuk ke Sistem
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 space-y-2 text-center text-sm" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
            <p>
              Belum punya akun?{' '}
              <a href="/register" className="font-medium" style={{ color: 'var(--color-amber)' }}>Daftar di sini</a>
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-light)' }}>
              Butuh bantuan? Hubungi panitia atau admin
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}
