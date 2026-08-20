import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const deleteUserSchema = z.object({
  id: z.string().uuid()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['superadmin', 'subadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin or Subadmin only' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = deleteUserSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { id } = parsed.data
    
    // Prevent self-deletion
    if (id === user.id) {
      return NextResponse.json({ error: 'Tidak bisa menghapus akun Anda sendiri' }, { status: 400 })
    }

    const supabaseAdmin = createAdminSupabaseClient()

    // Subadmin restriction check: they can only delete users in their event
    if (profile.role === 'subadmin') {
      const { data: targetProfile } = await supabaseAdmin.from('profiles').select('role, event_id').eq('id', id).single()
      if (!targetProfile || targetProfile.role === 'superadmin' || targetProfile.role === 'subadmin') {
        return NextResponse.json({ error: 'Forbidden: Tidak dapat menghapus akun ini' }, { status: 403 })
      }
    }

    // Delete user using Admin API (this will cascade to profiles)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
