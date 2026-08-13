'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('Email atau password salah. Silakan coba lagi.')
        return
      }

      // Get user role to redirect appropriately
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

      const profile = profileData as Profile | null
      
      if (profile && profile.is_active === false) {
        await supabase.auth.signOut()
        setError('Akun Anda belum divalidasi admin. Silakan hubungi Panitia atau Admin.')
        return
      }

      if (profile?.role === 'superadmin') router.push('/superadmin')
      else if (profile?.role === 'ip') router.push('/admin')
      else if (profile?.role === 'op_regis') router.push('/op-regis')
      else if (profile?.role === 'op_sesi') router.push('/op-sesi')
      else router.push('/dashboard')
      
      router.refresh()
    })
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
          <h2 className="font-display text-3xl font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
            Masuk
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
            Masukkan email dan password yang diberikan panitia.
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="nama@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full py-3 mt-2"
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
