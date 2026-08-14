import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function InformasiPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('settings').select('*').limit(1).single()

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-cream)', fontFamily: 'var(--font-body)' }}>
      <header style={{ backgroundColor: 'rgba(253,248,240,0.96)', borderBottom: '1px solid var(--color-border)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-9 h-9">
              <Image src={settings?.logo_url || "/Simbol_GMIM_free.png"} alt="Logo GMIM" fill className="object-contain" />
            </div>
            <div>
              <span className="font-display font-semibold text-xl" style={{ color: 'var(--color-text)' }}>
                {settings?.nama_penyelenggara || 'Penjurian Baca Mazmur'}
              </span>
            </div>
          </Link>
          <div className="flex gap-3">
            <Link href="/" className="text-sm px-4 py-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
              Kembali
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 relative z-10">
        <div className="glass-card p-6 md:p-12 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <h1 className="font-display text-4xl font-bold mb-8 text-[var(--color-text)] border-b border-[var(--color-border)] pb-6 relative z-10">
            Informasi & Pedoman Lomba
          </h1>
          
          <div className="relative z-10">
            {settings?.informasi_lomba ? (
              <div 
                className="prose prose-amber prose-headings:font-display prose-headings:text-[var(--color-text)] prose-a:text-amber-600 prose-img:rounded-xl max-w-none text-slate-700"
                dangerouslySetInnerHTML={{ __html: settings.informasi_lomba }}
              />
            ) : (
              <div className="text-center py-20 text-[var(--color-text-muted)]">
                Informasi belum ditambahkan oleh Panitia.
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="text-center py-8 text-xs" style={{ color: 'var(--color-text-light)', borderTop: '1px solid var(--color-border)' }}>
        &copy; {new Date().getFullYear()} {settings?.nama_penyelenggara || 'Gereja Masehi Injili di Minahasa'}
      </footer>
    </div>
  )
}
