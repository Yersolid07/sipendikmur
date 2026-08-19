import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/shared/Navbar'
import SuperadminDashboard from '@/components/superadmin/SuperadminDashboard'
import { Profile, Event, Kategori } from '@/types/database'

export default async function SuperadminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null
  if (!profile || !['superadmin', 'subadmin'].includes(profile.role)) redirect('/login')

  // Get all events
  let eventsQuery = supabase.from('events').select('*').order('created_at', { ascending: false })
  
  if (profile.role === 'subadmin' && profile.event_id) {
    eventsQuery = eventsQuery.eq('id', profile.event_id)
  }

  const { data: eventsData } = await eventsQuery

  // Get users - subadmin cannot see superadmin accounts
  let usersQuery = supabase.from('profiles').select('*').order('nama')
  if (profile.role === 'subadmin') {
    usersQuery = usersQuery.not('role', 'in', '("superadmin","subadmin")')
  }
  const { data: usersData } = await usersQuery

  const events = (eventsData ?? []) as Event[]
  const usersList = (usersData ?? []) as Profile[]

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <SuperadminDashboard
          profile={profile}
          events={events}
          usersList={usersList}
        />
      </main>
    </div>
  )
}
