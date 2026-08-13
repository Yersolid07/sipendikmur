import { createClient } from '@/lib/supabase/server'
import LiveScreen from '@/components/live/LiveScreen'
import { Event, Setting, Sesi } from '@/types/database'

type ActiveSesi = Sesi & {
  peserta: { id: string; nama: string; mazmur_bacaan: string | null; asal_jemaat: string } | null
  kategori: { id: string; nama: string; jenis_lomba: 'perorangan' | 'beregu' } | null
}

export default async function LivePage() {
  const supabase = await createClient()

  // Get active event
  const { data: activeEventData } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'aktif')
    .limit(1)
    .single()

  // Get settings for branding
  const { data: settingsData } = await supabase
    .from('settings')
    .select('*')
    .limit(1)
    .single()

  // Get active sesi if any
  let activeSesi: ActiveSesi | null = null
  if (activeEventData) {
    const { data: sesiData } = await supabase
      .from('sesi')
      .select('*, peserta:peserta_aktif_id(id, nama, mazmur_bacaan, asal_jemaat), kategori:kategori_id(id, nama, jenis_lomba)')
      .eq('event_id', activeEventData.id)
      .neq('status', 'selesai')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      
    if (sesiData) activeSesi = sesiData as unknown as ActiveSesi
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <LiveScreen 
        activeEvent={activeEventData as Event | null} 
        settings={settingsData as Setting | null}
        initialSesi={activeSesi}
      />
    </div>
  )
}
