'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    password: '',
    role: 'juri'
  })
  
  const [status, setStatus] = useState<{type: 'error'|'success', msg: string} | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mendaftar')

      setStatus({ type: 'success', msg: 'Berhasil mendaftar! Silakan tunggu admin memvalidasi dan mengaktifkan akun Anda.' })
      // Clear form on success
      setFormData({ nama: '', email: '', password: '', role: 'juri' })
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-12">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(201,168,76,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(12,22,49,0.9) 0%, #0f172a 100%)',
        }}
      />
      {/* Decorative cross / mazmur ornament */}
      <div
        className="absolute top-0 right-0 w-96 h-96 opacity-5 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(201,168,76,1) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="relative mx-auto w-20 h-20 mb-4 drop-shadow-[0_0_30px_rgba(201,168,76,0.3)]">
            <Image 
              src="/Simbol_GMIM_free.png" 
              alt="GMIM Logo" 
              fill
              className="object-contain" 
            />
          </div>
          <h1 className="font-display text-3xl font-bold text-gold-gradient mb-1">
            Pendaftaran Akun
          </h1>
          <p className="text-sm text-slate-400 font-medium tracking-wide">
            Sistem Penjurian Baca Mazmur GMIM
          </p>
        </div>

        {/* Register Card */}
        <div className="glass-card p-8 animate-fade-in-up shadow-2xl">
          {status && (
            <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${status.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
              <div className="mt-0.5">
                {status.type === 'success' ? '✅' : '⚠️'}
              </div>
              <div className="text-sm leading-relaxed">{status.msg}</div>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="form-label">Nama Lengkap</label>
              <input
                type="text"
                required
                value={formData.nama}
                onChange={(e) => setFormData({...formData, nama: e.target.value})}
                className="form-input"
                placeholder="Misal: Pnt. John Doe"
              />
            </div>

            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="form-input"
                placeholder="nama@email.com"
              />
            </div>

            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="form-input"
                placeholder="Minimal 6 karakter"
              />
            </div>

            <div>
              <label className="form-label">Peran (Role)</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="form-input"
              >
                <option value="juri">Juri</option>
                <option value="op_sesi">Operator Sesi</option>
                <option value="op_regis">Operator Registrasi</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(217,119,6,0.2)] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? 'Mendaftar...' : 'Daftar Sekarang'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Sudah punya akun? <Link href="/login" className="text-amber-500 hover:text-amber-400 underline underline-offset-4">Masuk ke Sistem</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
