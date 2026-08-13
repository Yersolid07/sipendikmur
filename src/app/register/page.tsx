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
    <div className="min-h-screen flex items-center justify-center relative bg-[var(--color-surface)] py-12">
      {/* Background - Removed dark gradients */}
      <div className="absolute inset-0 bg-[var(--color-surface)]" />
      {/* Removed the decorative cross / mazmur ornament */}

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
          <h1 className="font-display text-3xl font-bold text-slate-800 mb-1">
            Pendaftaran Akun
          </h1>
          <p className="text-sm text-slate-500 font-medium tracking-wide">
            Sistem Penjurian Baca Mazmur GMIM
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-fade-in-up">
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
              <label className="form-label text-slate-700">Nama Lengkap</label>
              <input
                type="text"
                required
                value={formData.nama}
                onChange={(e) => setFormData({...formData, nama: e.target.value})}
                className="form-input bg-white text-slate-800 border-slate-300 focus:border-amber-500"
                placeholder="Misal: Pnt. John Doe"
              />
            </div>

            <div>
              <label className="form-label text-slate-700">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="form-input bg-white text-slate-800 border-slate-300 focus:border-amber-500"
                placeholder="nama@email.com"
              />
            </div>

            <div>
              <label className="form-label text-slate-700">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="form-input bg-white text-slate-800 border-slate-300 focus:border-amber-500"
                placeholder="Minimal 6 karakter"
              />
            </div>

            <div>
              <label className="form-label text-slate-700">Peran (Role)</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="form-input bg-white text-slate-800 border-slate-300 focus:border-amber-500"
              >
                <option value="juri">Juri</option>
                <option value="op_sesi">Operator Sesi</option>
                <option value="op_regis">Operator Registrasi</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-[#7f1d1d] hover:bg-[#6c1919] text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
