import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export async function logActivity(
  supabase: SupabaseClient<Database>,
  params: {
    event_id: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    details?: any;
  }
) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('activity_logs').insert({
      event_id: params.event_id,
      user_id: user.id,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id || null,
      details: params.details || null
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}
