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
    <div className="min-h-screen flex items-center justify-center relative bg-[var(--color-surface)]">
      {/* Background - Removed dark radial gradients */}
      <div className="absolute inset-0 bg-[var(--color-surface)]" />
      {/* Removed the decorative cross / mazmur ornament */}

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="relative mx-auto w-24 h-24 mb-4 drop-shadow-[0_0_30px_rgba(201,168,76,0.3)]">
            <img src="/Simbol_GMIM_free.png" alt="GMIM Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-display text-4xl font-bold text-slate-800 mb-1">
            GMIM
          </h1>
          <p className="text-sm text-slate-500 font-medium tracking-wide">
            Sistem Penjurian Baca Mazmur Digital
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-fade-in-up">
          <h2 className="font-display text-2xl font-semibold text-slate-800 mb-1">
            Masuk ke Sistem
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Masukkan kredensial yang diberikan panitia.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input bg-white text-slate-800 border-slate-300 focus:border-amber-500"
                placeholder="nama@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label text-slate-700">Password</label>
              <input
                type="password"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input bg-white text-slate-800 border-slate-300 focus:border-amber-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-4 bg-[#7f1d1d] hover:bg-[#6c1919] text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isPending ? (
                <>
                  <span className="spinner" />
                  Masuk...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Masuk
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Belum punya akun? <a href="/register" className="text-amber-500 hover:text-amber-400 underline underline-offset-4">Daftar sekarang</a>
            <br/><br/>
            Untuk bantuan login, hubungi panitia atau admin
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          © 2026 GMIM — Sistem Penjurian Baca Mazmur Digital
        </p>
      </div>
    </div>
  )
}
