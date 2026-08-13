import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/types/database'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let profile: Profile | null = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data as Profile | null
  }

  let dashboardLink = '/dashboard'
  if (profile) {
    if (profile.role === 'superadmin') dashboardLink = '/superadmin'
    else if (profile.role === 'ip') dashboardLink = '/admin'
    else if (profile.role === 'op_regis') dashboardLink = '/op-regis'
    else if (profile.role === 'op_sesi') dashboardLink = '/op-sesi'
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-cream)', fontFamily: 'var(--font-body)' }}>
      {/* Subtle texture overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(201,133,44,0.04) 0%, transparent 50%),
                          radial-gradient(circle at 80% 20%, rgba(127,29,29,0.03) 0%, transparent 50%)`,
      }} />

      {/* Navbar */}
      <header style={{ backgroundColor: 'rgba(253,248,240,0.96)', borderBottom: '1px solid var(--color-border)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9">
              <Image src="/Simbol_GMIM_free.png" alt="Logo GMIM" fill className="object-contain" />
            </div>
            <div>
              <span className="font-display font-semibold text-xl" style={{ color: 'var(--color-text)' }}>
                Penjurian Baca Mazmur
              </span>
              <span className="hidden sm:block text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Gereja Masehi Injili di Minahasa
              </span>
            </div>
          </div>
          {user && profile ? (
            <Link href={dashboardLink} className="btn-primary text-sm">
              Buka Dashboard
            </Link>
          ) : (
            <Link href="/login" style={{ padding: '0.5rem 1.25rem', border: '1px solid var(--color-border-dark)', borderRadius: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem', transition: 'all 0.2s' }}
              className="hover:bg-white">
              Masuk
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 relative z-10 max-w-4xl mx-auto w-full">
        {/* Main heading */}
        <h1 className="font-display mb-6 leading-tight" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 500, color: 'var(--color-text)' }}>
          Penilaian lomba baca Mazmur,{' '}
          <span className="font-semibold italic" style={{ color: 'var(--color-amber)' }}>objektif &amp; transparan</span>
        </h1>

        <p className="text-lg max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Platform penjurian digital yang terintegrasi, adil, dan mudah digunakan — dirancang khusus untuk lomba baca Mazmur GMIM.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-20">
          <Link href={user ? dashboardLink : '/login'} className="btn-primary px-8 py-3 text-base">
            Masuk ke Sistem
          </Link>
          <Link href="/register"
            style={{ padding: '0.75rem 2rem', border: '1px solid var(--color-border-dark)', borderRadius: '0.5rem', color: 'var(--color-text)', fontSize: '1rem', transition: 'all 0.2s', background: 'white' }}
            className="hover:shadow-sm">
            Daftar Akun
          </Link>
          <Link href="/live"
            style={{ padding: '0.75rem 2rem', border: '1px solid rgba(201,133,44,0.3)', borderRadius: '0.5rem', color: 'var(--color-amber)', fontSize: '1rem', transition: 'all 0.2s', background: 'rgba(201,133,44,0.06)' }}
            className="flex items-center gap-2 hover:bg-[rgba(201,133,44,0.1)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            Live Ranking
          </Link>
        </div>

        {/* Divider */}
        <div className="w-full flex items-center gap-4 mb-12">
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-light)' }}>Peran dalam sistem</span>
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full">
          {[
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              ),
              title: 'Admin / Panitia',
              desc: 'Kelola peserta, juri, event, dan hasil akhir dari satu panel terpusat.'
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m14.5 16.5-6.5 6.5M5 16l3-3M7 14l3-3M19 13 11 5M22 10 14 2"/>
                </svg>
              ),
              title: 'Juri',
              desc: 'Form penilaian yang bersih. Juri fokus pada tugasnya, skor terekam real-time.'
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              ),
              title: 'Live Score',
              desc: 'Publik bisa melihat ranking real-time tanpa perlu login. Transparan dan terbuka.'
            }
          ].map((card) => (
            <div key={card.title} className="glass-card p-7 text-left hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5"
                style={{ background: 'rgba(201,133,44,0.08)', color: 'var(--color-amber)' }}>
                {card.icon}
              </div>
              <h3 className="font-display text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                {card.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-8 text-xs" style={{ color: 'var(--color-text-light)', borderTop: '1px solid var(--color-border)' }}>
        &copy; {new Date().getFullYear()} Gereja Masehi Injili di Minahasa &mdash; Sistem Penjurian Digital
      </footer>
    </div>
  )
}
