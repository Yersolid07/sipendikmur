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
  if (!profile || profile.role !== 'superadmin') redirect('/login')

  // Get all events
  const { data: eventsData } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  // Get all users
  const { data: usersData } = await supabase
    .from('profiles')
    .select('*')
    .order('nama')

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
