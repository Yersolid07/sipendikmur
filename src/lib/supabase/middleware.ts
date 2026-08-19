// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SESSION_MAX_AGE_DAYS = 7 // Auto-logout after 7 days of inactivity

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
            supabaseResponse.cookies.set(name, value, {
              ...options,
              // Force secure session cookie settings
              httpOnly: true,
              sameSite: 'lax',
              maxAge: SESSION_MAX_AGE_DAYS * 24 * 60 * 60,
            })
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const path = url.pathname

  // Always allow: live display (public), static assets, auth callbacks, and public APIs
  if (
    path.startsWith('/live') ||
    path.startsWith('/api/public/') ||
    path.startsWith('/api/auth/') ||
    path.startsWith('/auth/callback') ||
    path.startsWith('/_next/') ||
    path.startsWith('/favicon')
  ) {
    return supabaseResponse
  }

  // Public routes — accessible without login
  const publicRoutes = ['/', '/login', '/register', '/informasi', '/reset-password']
  const isPublic = publicRoutes.some(r =>
    r === '/' ? path === '/' : path.startsWith(r)
  )

  // Redirect unauthenticated users to login for protected routes
  if (!user && !isPublic) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    const role = profile?.role
    const isActive = profile?.is_active

    // If account is inactive, force logout and redirect
    if (profile && isActive === false && !isPublic) {
      await supabase.auth.signOut()
      url.pathname = '/login'
      url.searchParams.set('reason', 'inactive')
      return NextResponse.redirect(url)
    }

    // Redirect authenticated users away from login/register to their dashboard
    if (path === '/login' || path === '/register') {
      if (role === 'superadmin') url.pathname = '/superadmin'
      else if (role === 'subadmin') url.pathname = '/superadmin'
      else if (role === 'ip') url.pathname = '/admin'
      else if (role === 'op_regis') url.pathname = '/op-regis'
      else if (role === 'op_sesi') url.pathname = '/op-sesi'
      else url.pathname = '/dashboard' // Juri
      return NextResponse.redirect(url)
    }

    // Role-based Route Protection
    if (path.startsWith('/superadmin') && role !== 'superadmin' && role !== 'subadmin') {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    if (path.startsWith('/admin') && role !== 'ip' && role !== 'superadmin' && role !== 'subadmin') {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    if (path.startsWith('/op-regis') && role !== 'op_regis' && role !== 'superadmin' && role !== 'subadmin') {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    if (path.startsWith('/op-sesi') && role !== 'op_sesi' && role !== 'superadmin' && role !== 'subadmin') {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
