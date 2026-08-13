import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/types/database'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const profile = profileData as Profile | null

  if (profile?.role === 'superadmin') redirect('/superadmin')
  if (profile?.role === 'ip') redirect('/admin')
  if (profile?.role === 'op_regis') redirect('/op-regis')
  if (profile?.role === 'op_sesi') redirect('/op-sesi')

  redirect('/dashboard')
}
