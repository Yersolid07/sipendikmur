import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/shared/Navbar'
import AdminDashboard from '@/components/admin/AdminDashboard'
import { Profile, Event } from '@/types/database'

export default async function AdminPage() {
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
  if (!['ip', 'subadmin', 'superadmin'].includes(profile.role)) redirect('/dashboard')

  // Get all events
  const { data: eventsData } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  // Get all juri profiles for Superadmin/Subadmin
  let juriQuery = supabase.from('profiles').select('*').eq('role', 'juri').order('nama')
  if (profile.role === 'subadmin' && profile.event_id) {
    juriQuery = juriQuery.eq('event_id', profile.event_id)
  }
  const { data: juriData } = await juriQuery

  const events = (eventsData ?? []) as Event[]
  // For IP/Admin Monitoring, they usually want to see active juries. We pass all to AdminDashboard
  // and AdminDashboard will filter by activeEvent and is_juri_penilai.
  const juriList = (juriData ?? []) as Profile[]

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <AdminDashboard
          profile={profile}
          events={events}
          juriList={juriList}
        />
      </main>
    </div>
  )
}
