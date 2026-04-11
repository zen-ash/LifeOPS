// Phase 11.A: Activity Log helper
// Not a Server Action — this is a plain async utility called from within
// server actions and route handlers that already hold an authenticated client.
// It must never throw or cause a calling action to fail.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActivityEventType } from '@/types'

interface LogEventParams {
  event_type: ActivityEventType
  entity_type?: string
  entity_id?: string
  payload?: Record<string, unknown>
}

/**
 * Appends one event to user_activity_logs.
 * Errors are silently swallowed — telemetry must never break a user action.
 */
export async function logEvent(
  supabase: SupabaseClient,
  userId: string,
  params: LogEventParams
): Promise<void> {
  try {
    const { error } = await supabase.from('user_activity_logs').insert({
      user_id: userId,
      event_type: params.event_type,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      payload: params.payload ?? null,
    })
    if (error) {
      // Intentionally silent — telemetry failures must not surface to users
    }
  } catch {
    // Intentionally silent
  }
}
