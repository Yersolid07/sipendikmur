import { createClient } from '@/lib/supabase/server'
import LiveScreen from '@/components/live/LiveScreen'
import { Event, Setting, Sesi } from '@/types/database'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type ActiveSesi = Sesi & {
  peserta: { id: string; nama: string; mazmur_bacaan: string | null; asal_jemaat: string } | null
  kategori: { id: string; nama: string; jenis_lomba: 'perorangan' | 'beregu' } | null
}

export default async function LivePage({
  searchParams,
}: {
  searchParams: { event_id?: string }
}) {
  const supabase = await createClient()

  // Get settings for branding
  const { data: settingsData } = await supabase
    .from('settings')
    .select('*')
    .limit(1)
    .single()

  // If no event_id, fetch all active events and show a selection screen
  if (!searchParams.event_id) {
    const { data: activeEvents } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'aktif')
      .order('nama')

    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e1b4b] -z-10" />
        <div className="w-full max-w-xl animate-fade-in-up">
          <div className="text-center mb-10">
            {settingsData?.logo_url ? (
              <img src={settingsData.logo_url || '/Simbol_GMIM_free.png'} alt="Logo" className="h-20 object-contain mx-auto mb-6" />
            ) : (
              <img src="/Simbol_GMIM_free.png" alt="Logo" className="h-20 object-contain mx-auto mb-6" />
            )}
            <h1 className="text-3xl font-display font-bold text-gold-gradient tracking-wide uppercase">
              {settingsData?.nama_penyelenggara || 'Sistem Penjurian GMIM'}
            </h1>
            <p className="text-slate-400 mt-2 text-lg">Pilih Event untuk Tampilan Live</p>
          </div>

          {activeEvents && activeEvents.length > 0 ? (
            <div className="space-y-4">
              {activeEvents.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/live?event_id=${ev.id}`}
                  className="block w-full p-6 bg-white/5 backdrop-blur-md hover:bg-white/10 border border-white/10 hover:border-amber-500/50 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-xl group"
                >
                  <h3 className="text-2xl font-display font-semibold tracking-wide text-white group-hover:text-amber-400 transition-colors" style={{ color: 'white' }}>
                    {ev.nama}
                  </h3>
                  <p className="text-slate-300 mt-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Klik untuk membuka Live Screen
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-slate-800/30 border border-slate-700 rounded-2xl">
              <p className="text-slate-400">Tidak ada event yang sedang aktif saat ini.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Get active event based on event_id
  const { data: activeEventData } = await supabase
    .from('events')
    .select('*')
    .eq('id', searchParams.event_id)
    .single()

  if (!activeEventData) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl text-white">Event tidak ditemukan atau tidak aktif</h1>
        <Link href="/live" className="mt-6 text-amber-500 hover:underline">
          Kembali ke Pemilihan Event
        </Link>
      </div>
    )
  }

  // Get active sesi if any
  let activeSesi: ActiveSesi | null = null
  const { data: sesiData } = await supabase
    .from('sesi')
    .select('*, peserta:peserta_aktif_id(id, nama, mazmur_bacaan, asal_jemaat), kategori:kategori_id(id, nama, jenis_lomba)')
    .eq('event_id', activeEventData.id)
    .neq('status', 'selesai')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
    
  if (sesiData) activeSesi = sesiData as unknown as ActiveSesi

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <LiveScreen 
        activeEvent={activeEventData as Event} 
        settings={settingsData as Setting | null}
        initialSesi={activeSesi}
      />
    </div>
  )
}
