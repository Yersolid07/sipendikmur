import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import JuriDashboard from '@/components/juri/JuriDashboard'
import Navbar from '@/components/shared/Navbar'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Admin/inspektur go to admin panel
  if (profile.role === 'admin' || profile.role === 'inspektur') {
    redirect('/admin')
  }

  // Get the active event
  const { data: activeEvent } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'aktif')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Get the active sesi
  const { data: activeSesi } = activeEvent
    ? await supabase
        .from('sesi')
        .select(`*, peserta:peserta_aktif_id(*), kategori(*)`)
        .eq('event_id', activeEvent.id)
        .in('status', ['berjalan', 'menunggu'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
    : { data: null }

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <JuriDashboard
          profile={profile}
          activeEvent={activeEvent ?? null}
          activeSesi={activeSesi ?? null}
        />
      </main>
    </div>
  )
}
