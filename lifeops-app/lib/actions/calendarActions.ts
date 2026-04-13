'use server'

// Phase 14.A / 14.B: Client-callable server actions for calendar connection management
// and plan sync. Tokens are never returned to the client.

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getFreshAccessToken } from '@/lib/actions/calendar'
import { syncPlanFocusBlocksToCalendar } from '@/lib/actions/calendarSync'
import type { GeneratedPlan } from '@/types'

// ── Disconnect ────────────────────────────────────────────────────────────────

// Removes the user's Google Calendar connection, clears cached events, and
// removes all sync mappings so stale events are not re-pushed on reconnect.
// Called from the CalendarConnectBanner disconnect button.
export async function disconnectCalendar() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  // Delete connection (tokens), cached events, and all sync mappings
  await Promise.all([
    supabase.from('calendar_connections').delete().eq('user_id', user.id),
    supabase.from('calendar_events').delete().eq('user_id', user.id),
    supabase.from('calendar_sync_mappings').delete().eq('user_id', user.id),
  ])

  revalidatePath('/planner')
}

// ── Sync plan to Google Calendar ──────────────────────────────────────────────

export interface SyncPlanResult {
  synced:  number
  deleted: number
  error?:  string
}

// Syncs the focus blocks from the current plan to Google Calendar.
// Creates new events, patches existing ones, and removes stale events.
// Only touches events that LifeOPS created (identified via sync mappings and
// extendedProperties.private.lifeops_managed = "true").
//
// weekStart: ISO date string for the Monday of the plan week ("2024-01-15")
// plan:      the current GeneratedPlan object from the client's planner state
export async function syncPlanToCalendar(
  weekStart: string,
  plan:      GeneratedPlan
): Promise<SyncPlanResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { synced: 0, deleted: 0, error: 'Not authenticated.' }

  const accessToken = await getFreshAccessToken(user.id)
  if (!accessToken) {
    return {
      synced:  0,
      deleted: 0,
      error:   'Google Calendar is not connected or the connection has expired. Please reconnect.',
    }
  }

  const result = await syncPlanFocusBlocksToCalendar(accessToken, user.id, weekStart, plan)

  // Trigger a planner reload so the calendar section reflects any newly pushed events
  revalidatePath('/planner')

  return result
}
