import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/shared/Navbar'
import OpSesiDashboard from '@/components/opsesi/OpSesiDashboard'
import { Profile, Event, Sesi } from '@/types/database'

type ActiveSesi = Sesi & {
  peserta: { id: string; nama: string; mazmur_bacaan: string | null } | null
  kategori: { id: string; nama: string; jenis_lomba: 'perorangan' | 'beregu' } | null
}

export default async function OpSesiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null
  if (!profile || !['op_sesi', 'subadmin', 'superadmin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  let activeEventQuery = supabase.from('events').select('*')
  
  if (profile.event_id) {
    activeEventQuery = activeEventQuery.eq('id', profile.event_id)
  } else {
    activeEventQuery = activeEventQuery.eq('status', 'aktif').order('created_at', { ascending: false }).limit(1)
  }

  const { data: activeEventData } = await activeEventQuery.single()

  // Get active sesi if any
  let activeSesi: ActiveSesi | null = null
  if (activeEventData) {
    const { data: sesiData } = await supabase
      .from('sesi')
      .select('*, peserta:peserta_aktif_id(id, nama, mazmur_bacaan), kategori:kategori_id(id, nama, jenis_lomba)')
      .eq('event_id', activeEventData.id)
      .neq('status', 'selesai')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      
    if (sesiData) activeSesi = sesiData as unknown as ActiveSesi
  }

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <OpSesiDashboard
          profile={profile}
          activeEvent={activeEventData as Event | null}
          initialSesi={activeSesi}
        />
      </main>
    </div>
  )
}
