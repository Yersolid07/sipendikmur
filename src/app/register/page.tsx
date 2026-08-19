'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'

interface EventOption {
  id: string
  nama: string
}

const ROLE_OPTIONS = [
  { value: 'juri', label: 'Juri (Input Nilai)' },
  { value: 'op_sesi', label: 'Operator Sesi (Kendali Stage)' },
  { value: 'op_regis', label: 'Operator Registrasi (Check-in)' },
]

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: 'Minimal 8 karakter' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Minimal 1 huruf besar' },
  { test: (p: string) => /[0-9]/.test(p), label: 'Minimal 1 angka' },
]

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    password: '',
    role: 'juri',
    event_id: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [events, setEvents] = useState<EventOption[]>([])
  const [statusMsg, setStatusMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/public/events')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setEvents(d) })
      .catch(() => {})
  }, [])

  const isPasswordStrong = PASSWORD_RULES.every(r => r.test(formData.password))

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setStatusMsg('')

    if (!isPasswordStrong) {
      setStatusMsg('Password belum memenuhi persyaratan keamanan.')
      return
    }

    if (!formData.event_id) {
      setStatusMsg('Pilih event yang sedang aktif terlebih dahulu.')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      let data: any = {}
      try { data = await res.json() } catch { /* ignore empty body */ }

      if (!res.ok) throw new Error(data.error || ('Gagal mendaftar (' + res.status + ')'))

      setIsSuccess(true)
    } catch (err: any) {
      setStatusMsg(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className='min-h-screen flex items-center justify-center p-6' style={{ backgroundColor: 'var(--color-cream)' }}>
        <div className='w-full max-w-sm text-center animate-fade-in-up'>
          <div className='w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6'>
            <CheckCircle2 className='w-10 h-10 text-emerald-600' />
          </div>
          <h2 className='font-display text-2xl font-semibold mb-3' style={{ color: 'var(--color-text)' }}>
            Pendaftaran Berhasil!
          </h2>
          <p className='text-sm mb-6 leading-relaxed' style={{ color: 'var(--color-text-muted)' }}>
            Akun Anda telah terdaftar dan sedang menunggu aktivasi.<br />
            <strong>Silakan hubungi Admin Event</strong> dari event yang Anda pilih untuk mengaktifkan akun Anda.
          </p>
          <div className='p-4 rounded-xl border text-sm mb-6' style={{ background: 'rgba(245,158,11,0.07)', borderColor: 'rgba(245,158,11,0.3)', color: 'var(--color-amber-dark)' }}>
            Akun belum bisa login sampai diaktivasi oleh admin event.
          </div>
          <Link href='/login' className='btn-primary w-full block py-3 text-center'>
            Kembali ke Halaman Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen flex' style={{ backgroundColor: 'var(--color-cream)' }}>
      <div className='hidden lg:flex flex-col justify-between w-1/2 p-12'
        style={{ background: 'linear-gradient(160deg, var(--color-cream-2) 0%, var(--color-cream-3) 100%)', borderRight: '1px solid var(--color-border)' }}>
        <Link href='/' className='flex items-center gap-3'>
          <img src='/Simbol_GMIM_free.png' alt='GMIM' className='w-10 h-10 object-contain' />
          <span className='font-display font-semibold text-xl' style={{ color: 'var(--color-text)' }}>Penjurian Baca Mazmur</span>
        </Link>
        <div>
          <blockquote className='font-display text-3xl font-medium leading-snug mb-6' style={{ color: 'var(--color-text)' }}>
            &ldquo;Pujilah TUHAN dengan kecapi&rdquo;
          </blockquote>
          <p className='text-sm' style={{ color: 'var(--color-text-muted)' }}>Mazmur 33:2</p>
        </div>
        <p className='text-xs' style={{ color: 'var(--color-text-light)' }}>&copy; {new Date().getFullYear()} Gereja Masehi Injili di Minahasa</p>
      </div>

      <div className='flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto'>
        <Link href='/' className='lg:hidden flex items-center gap-3 mb-10'>
          <img src='/Simbol_GMIM_free.png' alt='GMIM' className='w-10 h-10 object-contain' />
          <span className='font-display font-semibold text-xl' style={{ color: 'var(--color-text)' }}>Penjurian Baca Mazmur</span>
        </Link>
        <div className='w-full max-w-sm animate-fade-in-up'>
          <h2 className='font-display text-3xl font-semibold mb-1' style={{ color: 'var(--color-text)' }}>Daftar Akun</h2>
          <p className='text-sm mb-8' style={{ color: 'var(--color-text-muted)' }}>Isi data Anda. Akun akan aktif setelah divalidasi admin event.</p>

          {statusMsg && (
            <div className='mb-6 p-4 rounded-xl text-sm' style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#b91c1c' }}>
              {statusMsg}
            </div>
          )}

          <form onSubmit={handleRegister} className='space-y-4'>
            <div>
              <label className='form-label'>Nama Lengkap *</label>
              <input type='text' required minLength={2}
                value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                className='form-input' placeholder='Misal: Pnt. John Doe' />
            </div>
            <div>
              <label className='form-label'>Email *</label>
              <input type='email' required
                value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className='form-input' placeholder='nama@email.com' />
            </div>
            <div>
              <label className='form-label'>Password *</label>
              <div className='relative'>
                <input type={showPassword ? 'text' : 'password'} required
                  value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className='form-input pr-10' placeholder='Min. 8 karakter, huruf besar, angka' />
                <button type='button' onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-600 transition-colors'>
                  {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                </button>
              </div>
              {formData.password.length > 0 && (
                <div className='mt-2 space-y-1'>
                  {PASSWORD_RULES.map((rule) => (
                    <div key={rule.label} className={'flex items-center gap-1.5 text-xs ' + (rule.test(formData.password) ? 'text-emerald-600' : 'text-slate-400')}>
                      <span className='font-bold'>{rule.test(formData.password) ? 'v' : 'o'}</span>
                      {rule.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className='form-label'>Role (Hak Akses) *</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className='form-input cursor-pointer'>
                {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className='form-label'>Event (Pilih yang sedang aktif) *</label>
              <select required value={formData.event_id} onChange={(e) => setFormData({ ...formData, event_id: e.target.value })} className='form-input cursor-pointer'>
                <option value='' disabled>-- Pilih Event --</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.nama}</option>)}
                {events.length === 0 && <option value='' disabled>Tidak ada event aktif saat ini</option>}
              </select>
              <p className='text-xs mt-1.5' style={{ color: 'var(--color-text-muted)' }}>Setelah daftar, hubungi Admin Event untuk aktivasi akun Anda.</p>
            </div>
            <button type='submit'
              disabled={isSubmitting || !isPasswordStrong || !formData.event_id}
              className='btn-primary w-full py-3 mt-4 disabled:opacity-50 disabled:cursor-not-allowed'
              style={{ fontSize: '0.95rem' }}>
              {isSubmitting ? 'Mendaftarkan...' : 'Daftar Sekarang'}
            </button>
          </form>

          <div className='mt-6 pt-6 text-center text-sm' style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
            Sudah punya akun?{' '}
            <Link href='/login' className='font-medium' style={{ color: 'var(--color-amber)' }}>Masuk di sini</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
