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

  // Determine dashboard link based on role
  let dashboardLink = '/dashboard'
  if (profile) {
    if (profile.role === 'superadmin') dashboardLink = '/superadmin'
    else if (profile.role === 'ip') dashboardLink = '/admin'
    else if (profile.role === 'op_regis') dashboardLink = '/op-regis'
    else if (profile.role === 'op_sesi') dashboardLink = '/op-sesi'
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 20%, rgba(201,168,76,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(12,22,49,0.9) 0%, #0f172a 100%)',
        }}
      />
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl px-6 text-center animate-fade-in-up">
        {/* Logo GMIM */}
        <div className="flex justify-center mb-8">
          <div className="relative w-32 h-32 md:w-40 md:h-40 drop-shadow-[0_0_30px_rgba(201,168,76,0.3)]">
            <Image 
              src="/Simbol_GMIM_free.png" 
              alt="Logo GMIM" 
              fill 
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="font-display text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
          Sistem Penjurian Baca Mazmur <br/>
          <span className="text-gold-gradient">Digital GMIM</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-12">
          Selamat datang di platform penjurian digital yang transparan, akurat, dan terintegrasi untuk lomba Baca Mazmur Gereja Masehi Injili di Minahasa.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {user && profile ? (
            <Link 
              href={dashboardLink} 
              className="px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-2xl font-semibold text-lg hover:from-amber-500 hover:to-amber-600 transition-all shadow-[0_0_30px_rgba(217,119,6,0.4)] flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              Masuk ke Dashboard ({profile.nama})
            </Link>
          ) : (
            <>
              <Link 
                href="/login" 
                className="px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-2xl font-semibold text-lg hover:from-amber-500 hover:to-amber-600 transition-all shadow-[0_0_30px_rgba(217,119,6,0.4)] w-full sm:w-auto text-center"
              >
                Masuk
              </Link>
              <Link 
                href="/register" 
                className="px-8 py-4 bg-slate-800/80 text-white border border-slate-700 rounded-2xl font-semibold text-lg hover:bg-slate-700 transition-all w-full sm:w-auto text-center"
              >
                Daftar Akun
              </Link>
            </>
          )}

          <Link 
            href="/live" 
            className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-semibold text-lg hover:bg-slate-100 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            Lihat Live Score
          </Link>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-0 w-full text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} GMIM — Sistem Penjurian Digital
      </div>
    </div>
  )
}
