import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    
    // Create response
    const response = NextResponse.json({ success: true })
    
    // For extra safety, manually clear common Supabase cookies just in case signOut misses them
    response.cookies.delete('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1].split('.')[0] + '-auth-token')
    
    return response
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
