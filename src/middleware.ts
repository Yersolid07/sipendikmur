import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Public routes — accessible without login
  const publicRoutes = ['/', '/login', '/register', '/live', '/informasi']

  const isPublicRoute = publicRoutes.some((route) => 
    request.nextUrl.pathname === route
  )

  const response = await updateSession(request)

  if (!isPublicRoute && !request.cookies.get('supabase-auth-token')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
