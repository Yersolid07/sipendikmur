import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/shared/Navbar'
import OpRegisDashboard from '@/components/opregis/OpRegisDashboard'
import { Profile, Event, Setting } from '@/types/database'

export default async function OpRegisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null
  if (!profile || !['op_regis', 'subadmin', 'superadmin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Get the active event
  const { data: activeEventData } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'aktif')
    .limit(1)
    .single()

  // Get Settings
  const { data: settingsData } = await supabase
    .from('settings')
    .select('*')
    .limit(1)
    .single()

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <OpRegisDashboard
          profile={profile}
          activeEvent={activeEventData as Event | null}
          settings={settingsData as Setting | null}
        />
      </main>
    </div>
  )
}
