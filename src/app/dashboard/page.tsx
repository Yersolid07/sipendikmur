import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import JuriDashboard from '@/components/juri/JuriDashboard'
import Navbar from '@/components/shared/Navbar'
import { Profile, Event, Sesi, Peserta, Kategori } from '@/types/database'

type ActiveSesi = Sesi & {
  peserta: Peserta | null
  kategori: Kategori | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null
  if (!profile) redirect('/login')

  if (profile.role === 'superadmin') redirect('/superadmin')
  if (profile.role === 'ip') redirect('/admin')
  if (profile.role === 'op_regis') redirect('/op-regis')
  if (profile.role === 'op_sesi') redirect('/op-sesi')

  // Get the active event
  let activeEventQuery = supabase.from('events').select('*')
  
  if (profile.event_id) {
    activeEventQuery = activeEventQuery.eq('id', profile.event_id)
  } else {
    activeEventQuery = activeEventQuery.eq('status', 'aktif').order('created_at', { ascending: false }).limit(1)
  }

  const { data: activeEventData } = await activeEventQuery.single()

  const activeEvent = activeEventData as Event | null

  // Get the active sesi
  let activeSesi: ActiveSesi | null = null
  if (activeEvent) {
    const { data: sesiData } = await supabase
      .from('sesi')
      .select('*, peserta:peserta_aktif_id(*), kategori:kategori_id(*)')
      .eq('event_id', activeEvent.id)
      .in('status', ['berjalan', 'menunggu'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (sesiData) activeSesi = sesiData as unknown as ActiveSesi
  }

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <JuriDashboard
          profile={profile}
          activeEvent={activeEvent}
          activeSesi={activeSesi}
        />
      </main>
    </div>
  )
}
