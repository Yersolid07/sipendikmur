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

      setStatus({ type: 'success', msg: 'Pendaftaran berhasil! Akun Anda masih menunggu aktivasi dari Admin. Silakan hubungi panitia untuk informasi lebih lanjut.' })
      setFormData({ nama: '', email: '', password: '', role: 'juri' })
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--color-cream)' }}>
      {/* Left panel — decorative */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12"
        style={{ background: 'linear-gradient(160deg, var(--color-cream-2) 0%, var(--color-cream-3) 100%)', borderRight: '1px solid var(--color-border)' }}>
        <Link href="/" className="flex items-center gap-3">
          <img src="/Simbol_GMIM_free.png" alt="GMIM" className="w-10 h-10 object-contain" />
          <span className="font-display font-semibold text-xl" style={{ color: 'var(--color-text)' }}>
            Penjurian Baca Mazmur
          </span>
        </Link>
        <div>
          <blockquote className="font-display text-3xl font-medium leading-snug mb-6" style={{ color: 'var(--color-text)' }}>
            &ldquo;Pujilah TUHAN dengan kecapi, bermazmurlah bagi-Nya dengan gambus sepuluh tali!&rdquo;
          </blockquote>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>— Mazmur 33:2</p>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-light)' }}>
          &copy; {new Date().getFullYear()} Gereja Masehi Injili di Minahasa
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <Link href="/" className="lg:hidden flex items-center gap-3 mb-10">
          <img src="/Simbol_GMIM_free.png" alt="GMIM" className="w-10 h-10 object-contain" />
          <span className="font-display font-semibold text-xl" style={{ color: 'var(--color-text)' }}>
            Penjurian Baca Mazmur
          </span>
        </Link>

        <div className="w-full max-w-sm animate-fade-in-up">
          <h2 className="font-display text-3xl font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
            Daftar Akun
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
            Isi data Anda. Akun akan aktif setelah divalidasi admin.
          </p>

          {status && (
            <div className="mb-6 p-4 rounded-xl text-sm"
              style={{
                background: status.type === 'success' ? 'rgba(22,163,74,0.07)' : 'rgba(220,38,38,0.07)',
                border: `1px solid ${status.type === 'success' ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.2)'}`,
                color: status.type === 'success' ? '#15803d' : '#b91c1c'
              }}>
              {status.msg}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
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
              <label className="form-label">Peran yang Diminta</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="form-input"
              >
                <option value="juri">Juri</option>
                <option value="op_sesi">Operator Sesi</option>
                <option value="op_regis">Operator Registrasi</option>
              </select>
              <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-light)' }}>
                Peran final akan dikonfirmasi oleh admin
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 mt-2"
              style={{ fontSize: '0.95rem' }}
            >
              {isSubmitting ? 'Mendaftarkan...' : 'Daftar Sekarang'}
            </button>
          </form>

          <div className="mt-6 pt-6 text-center text-sm" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
            Sudah punya akun?{' '}
            <Link href="/login" className="font-medium" style={{ color: 'var(--color-amber)' }}>
              Masuk di sini
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
