import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createJuriSchema = z.object({
  nama: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  role: z.enum(['juri', 'op_sesi', 'op_regis', 'ip', 'subadmin', 'superadmin']).default('juri'),
  event_id: z.string().nullable().optional(),
  is_juri_penilai: z.boolean().default(true)
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
      .select('role, event_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['superadmin', 'subadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin or Subadmin only' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createJuriSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { nama, email, password, role, event_id, is_juri_penilai } = parsed.data
    
    // Subadmin restriction: cannot create superadmin or subadmin
    if (profile.role === 'subadmin' && ['superadmin', 'subadmin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden: You cannot create this role' }, { status: 403 })
    }
    const supabaseAdmin = createAdminSupabaseClient()

    // Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nama, role },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Upsert profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: authUser.user.id, nama, email, role, event_id: event_id || null, is_active: true, is_juri_penilai })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId: authUser.user.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
