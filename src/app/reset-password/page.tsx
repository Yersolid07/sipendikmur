'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KeyRound, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isPending, setIsPending] = useState(false)

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsPending(true)

    if (password.length < 6) {
      setError('Password minimal 6 karakter.')
      setIsPending(false)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        setError('Gagal memperbarui password: ' + error.message)
      } else {
        setSuccess('Password berhasil diperbarui! Anda dapat masuk ke aplikasi sekarang.')
        // Redirect ke dashboard setelah beberapa detik
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 2000)
      }
    } catch (err: any) {
      setError('Terjadi kesalahan yang tidak terduga.')
    }
    
    setIsPending(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-cream)' }}>
      <div className="w-full max-w-md panel p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,133,44,0.1)', color: 'var(--color-amber-dark)' }}>
            <KeyRound className="w-8 h-8" />
          </div>
        </div>
        
        <h2 className="font-display text-2xl font-semibold text-center mb-2" style={{ color: 'var(--color-text)' }}>
          Buat Password Baru
        </h2>
        <p className="text-center text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          Silakan masukkan password baru untuk akun Anda.
        </p>

        {error && (
          <div className="mb-6 p-3.5 rounded-lg flex items-start gap-2.5 text-sm bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center">
            <div className="mb-6 p-4 rounded-lg flex flex-col items-center gap-3 text-sm bg-green-50 text-green-700 border border-green-200">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <p className="font-medium">{success}</p>
              <p className="text-xs opacity-80">Mengarahkan ke dashboard...</p>
            </div>
            <a href="/dashboard" className="btn-primary w-full inline-block text-center py-3 mt-2">
              Ke Dashboard Sekarang
            </a>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div>
              <label htmlFor="password" className="form-label font-medium">Password Baru</label>
              <input
                type="password"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input focus:ring-amber-500 focus:border-amber-500"
                placeholder="Minimal 6 karakter"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full py-3 mt-2 text-base"
            >
              {isPending ? <span className="spinner" /> : 'Simpan Password Baru'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
