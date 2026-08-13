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
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text)] flex flex-col font-body selection:bg-amber-100 selection:text-amber-900">
      {/* Navbar */}
      <header className="flex justify-between items-center px-6 py-4 md:px-12 md:py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 md:w-12 md:h-12">
            <Image 
              src="/Simbol_GMIM_free.png" 
              alt="Logo GMIM" 
              fill 
              className="object-contain"
            />
          </div>
          <span className="font-display font-semibold text-xl md:text-2xl tracking-wider text-slate-800">
            GMIM
          </span>
        </div>
        <div>
          {user && profile ? (
             <Link 
              href={dashboardLink} 
              className="px-5 py-2 text-sm md:text-base border border-amber-600/30 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <Link 
              href="/login" 
              className="px-5 py-2 text-sm md:text-base border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Masuk
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center pt-16 md:pt-24 px-4 w-full max-w-5xl mx-auto text-center">
        <p className="text-amber-600 text-xs md:text-sm font-semibold tracking-[0.2em] uppercase mb-6">
          Lomba Rohani
        </p>
        
        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-medium text-slate-800 mb-6 leading-tight">
          Penilaian lomba baca Mazmur, <br/>
          <span className="text-amber-600 font-semibold italic">objektif & transparan</span>
        </h1>
        
        <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Membantu panitia mengelola lomba baca Mazmur dengan sistem penilaian digital yang mudah, adil, dan profesional.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto mb-24">
          <Link 
            href={user ? dashboardLink : "/login"}
            className="w-full sm:w-auto px-8 py-3 bg-[#7f1d1d] hover:bg-[#6c1919] text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            Masuk
          </Link>
          <Link 
            href="/register" 
            className="w-full sm:w-auto px-8 py-3 bg-[#fdfbf7] hover:bg-[#f3f0e8] text-slate-700 border border-slate-200 rounded-lg font-medium transition-colors"
          >
            Daftar
          </Link>
          <Link 
            href="/live" 
            className="w-full sm:w-auto px-8 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-medium transition-colors shadow-sm"
          >
            Live Ranking
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {/* Card 1 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 flex items-center justify-center rounded-lg mb-6">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h3 className="font-display text-xl font-semibold text-slate-800 mb-3">
              Admin / Panitia
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Kelola peserta, juri, kriteria, dan hasil akhir dari satu panel terpusat.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 flex items-center justify-center rounded-lg mb-6">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m14.5 16.5-6.5 6.5"/>
                <path d="m5 16 3-3"/>
                <path d="m7 14 3-3"/>
                <path d="M19 13 11 5"/>
                <path d="M22 10 14 2"/>
              </svg>
            </div>
            <h3 className="font-display text-xl font-semibold text-slate-800 mb-3">
              Juri
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Form penilaian yang fokus dan bersih — juri hanya melihat tugasnya sendiri.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 flex items-center justify-center rounded-lg mb-6">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <h3 className="font-display text-xl font-semibold text-slate-800 mb-3">
              Viewer
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Lihat pemeringkatan setelah hasil diumumkan panitia.
            </p>
          </div>
        </div>
      </main>

      <footer className="w-full text-center py-10 mt-12 text-slate-400 text-xs">
        &copy; {new Date().getFullYear()} Gereja Masehi Injili di Minahasa
      </footer>
    </div>
  )
}
