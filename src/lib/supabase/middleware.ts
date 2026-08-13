// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isLiveRoute = url.pathname.startsWith('/live')
  
  // Do not protect /live, it's public (for multimedia)
  if (isLiveRoute) return supabaseResponse

  // Redirect unauthenticated users to login
  if (!user && !url.pathname.startsWith('/login')) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    // Redirect authenticated users away from login
    if (url.pathname === '/login') {
      if (role === 'superadmin') url.pathname = '/superadmin'
      else if (role === 'ip') url.pathname = '/admin'
      else if (role === 'op_regis') url.pathname = '/op-regis'
      else if (role === 'op_sesi') url.pathname = '/op-sesi'
      else url.pathname = '/dashboard' // Juri
      
      return NextResponse.redirect(url)
    }

    // Role-based Route Protection
    if (url.pathname.startsWith('/superadmin') && role !== 'superadmin') {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    
    if (url.pathname.startsWith('/admin') && role !== 'ip' && role !== 'superadmin') {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    if (url.pathname.startsWith('/op-regis') && role !== 'op_regis' && role !== 'superadmin') {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    if (url.pathname.startsWith('/op-sesi') && role !== 'op_sesi' && role !== 'superadmin') {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Juri accessing operator/admin routes will hit the blocks above.
  }

  return supabaseResponse
}
