import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const registerSchema = z.object({
  nama: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama terlalu panjang'),
  email: z.string().email('Format email tidak valid'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung minimal 1 huruf besar')
    .regex(/[0-9]/, 'Password harus mengandung minimal 1 angka'),
  role: z.enum(['juri', 'op_sesi', 'op_regis'], {
    message: 'Role tidak valid',
  }),
  event_id: z.string().uuid('Event ID tidak valid'),
})

export async function POST(request: NextRequest) {
  // Safely parse body — prevent "Unexpected end of JSON input"
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body tidak valid (bukan JSON)' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { nama, email, password, role, event_id } = parsed.data

  try {
    const supabaseAdmin = createAdminSupabaseClient()

    // Validate that the event exists and is active
    const { data: eventData, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, nama')
      .eq('id', event_id)
      .eq('status', 'aktif')
      .single()

    if (eventError || !eventData) {
      return NextResponse.json({ error: 'Event tidak ditemukan atau sudah tidak aktif.' }, { status: 400 })
    }

    // Create auth user (email_confirm: true skips email verification)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nama, role },
    })

    if (authError) {
      if (authError.message.toLowerCase().includes('already registered') ||
          authError.message.toLowerCase().includes('already been registered')) {
        return NextResponse.json({ error: 'Email sudah terdaftar. Gunakan email lain atau hubungi admin.' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Upsert profile with is_active = false (pending activation)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        nama,
        email,
        role,
        event_id,
        is_active: false,
      })

    if (profileError) {
      // Rollback: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: 'Gagal membuat profil: ' + profileError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Registrasi berhasil. Menunggu aktivasi dari Admin Event "${eventData.nama}".`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
