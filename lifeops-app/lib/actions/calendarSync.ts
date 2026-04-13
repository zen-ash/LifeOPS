// Phase 14.B: Core server-side logic for syncing LifeOPS planner focus blocks
// to Google Calendar. Not a 'use server' file — only called from calendarActions.ts.
//
// Safety rules:
// - Only creates/patches/deletes events that LifeOPS itself created (tracked via
//   calendar_sync_mappings and extendedProperties.private.lifeops_managed = "true").
// - Never touches user-created Google Calendar events.
// - All token handling is server-side; access tokens never reach the browser.

import { createClient } from '@/lib/supabase/server'
import type { GeneratedPlan } from '@/types'

// ── Constants ────────────────────────────────────────────────────────────────

const GOOGLE_EVENTS_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

// Shown in the UI when the token lacks write scope (user connected under Phase 14.A readonly scope).
const SCOPE_ERROR =
  'Your Google Calendar connection needs write access. Please disconnect and reconnect your calendar.'

// ── Internal types ───────────────────────────────────────────────────────────

interface SyncMapping {
  id:                string
  day_name:          string
  block_text:        string
  provider_event_id: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Returns ISO date string for the calendar day (weekStart + offset for dayName).
// Uses UTC so it matches the UTC-based weekStart stored in the DB.
function getDayISODate(weekStart: string, dayName: string): string {
  const offset = DAY_ORDER.indexOf(dayName as typeof DAY_ORDER[number])
  if (offset === -1) return weekStart
  const d = new Date(weekStart + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().split('T')[0]
}

// Builds a Google Calendar event body for a focus block.
// Events are scheduled at 09:00–09:45 UTC on the target day (MVP default).
// The [LifeOPS] prefix makes them visually identifiable in Google Calendar.
// extendedProperties.private.lifeops_managed ensures ownership is machine-readable
// even if the user renames the event in Google Calendar.
function buildEventBody(blockText: string, dayISODate: string) {
  return {
    summary: `[LifeOPS] ${blockText}`,
    description: 'Synced from LifeOPS planner. Manage this block in LifeOPS.',
    start: { dateTime: `${dayISODate}T09:00:00Z` },
    end:   { dateTime: `${dayISODate}T09:45:00Z` },
    extendedProperties: {
      private: { lifeops_managed: 'true' },
    },
  }
}

// ── Main sync function ────────────────────────────────────────────────────────

export interface SyncResult {
  synced:  number   // events successfully created or updated
  deleted: number   // stale events removed
  error?:  string   // human-readable error if the sync could not run
}

// Syncs all focus blocks in the given plan to Google Calendar for the user.
// - Creates a Google event for each focus block that has no existing mapping.
// - Patches the existing Google event when a mapping already exists.
// - Deletes Google events (and mappings) for blocks no longer in the plan.
//
// Receives an already-valid access token — caller (calendarActions.ts) is
// responsible for obtaining it via getFreshAccessToken.
export async function syncPlanFocusBlocksToCalendar(
  accessToken: string,
  userId:      string,
  weekStart:   string,
  plan:        GeneratedPlan
): Promise<SyncResult> {
  const supabase = await createClient()

  // ── Build set of current focus blocks ─────────────────────────────────────
  // key: "DayName::blockText"
  const currentBlocks = new Map<string, { dayName: string; blockText: string; dayDate: string }>()
  for (const day of plan.days) {
    const focusBlocks: string[] = day.focus_blocks ?? (day.focusBlock ? [day.focusBlock] : [])
    const dayDate = getDayISODate(weekStart, day.day)
    for (const fb of focusBlocks) {
      currentBlocks.set(`${day.day}::${fb}`, { dayName: day.day, blockText: fb, dayDate })
    }
  }

  // ── Load all existing mappings for this week ───────────────────────────────
  const { data: mappingRows } = await supabase
    .from('calendar_sync_mappings')
    .select('id, day_name, block_text, provider_event_id')
    .eq('user_id', userId)
    .eq('week_start', weekStart)

  const existingMappings = new Map<string, SyncMapping>()
  for (const m of (mappingRows ?? []) as SyncMapping[]) {
    existingMappings.set(`${m.day_name}::${m.block_text}`, m)
  }

  let synced  = 0
  let deleted = 0

  // ── Create or patch events for current blocks ─────────────────────────────
  for (const [key, { dayName, blockText, dayDate }] of currentBlocks) {
    const existing = existingMappings.get(key)

    if (existing) {
      // Mapping found — PATCH the event (idempotent update)
      const patchRes = await fetch(`${GOOGLE_EVENTS_BASE}/${existing.provider_event_id}`, {
        method:  'PATCH',
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildEventBody(blockText, dayDate)),
      })

      if (patchRes.ok) {
        // Update mapping timestamp
        await supabase
          .from('calendar_sync_mappings')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        synced++
      } else if (patchRes.status === 404) {
        // Event was deleted in Google — remove stale mapping and recreate
        await supabase.from('calendar_sync_mappings').delete().eq('id', existing.id)
        existingMappings.delete(key)
        const created = await createGoogleEvent(accessToken, blockText, dayDate)
        if (created === 'insufficient_scope') {
          return { synced, deleted, error: SCOPE_ERROR }
        }
        if (created) {
          await insertMapping(supabase, userId, weekStart, dayName, blockText, created)
          synced++
        }
      } else if (patchRes.status === 403) {
        return { synced, deleted, error: SCOPE_ERROR }
      }
      // Other errors: skip this block, continue
    } else {
      // No mapping — CREATE new event
      const created = await createGoogleEvent(accessToken, blockText, dayDate)
      if (created === 'insufficient_scope') {
        return { synced, deleted, error: SCOPE_ERROR }
      }
      if (created) {
        await insertMapping(supabase, userId, weekStart, dayName, blockText, created)
        synced++
      }
    }
  }

  // ── Delete stale mappings (blocks removed from the plan) ──────────────────
  for (const [key, mapping] of existingMappings) {
    if (!currentBlocks.has(key)) {
      // This block is no longer in the plan — delete the Google event
      const delRes = await fetch(`${GOOGLE_EVENTS_BASE}/${mapping.provider_event_id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      // 404 means already gone — that's fine. Any 2xx or 404 = mapping can be removed.
      if (delRes.ok || delRes.status === 404 || delRes.status === 410) {
        await supabase.from('calendar_sync_mappings').delete().eq('id', mapping.id)
        deleted++
      }
      // 403 would mean wrong scope — we already handle that above in the create/patch path.
    }
  }

  return { synced, deleted }
}

// ── Private helpers ───────────────────────────────────────────────────────────

// Returns the new Google event ID on success, 'insufficient_scope' on 403, or null on other errors.
async function createGoogleEvent(
  accessToken: string,
  blockText:   string,
  dayDate:     string
): Promise<string | 'insufficient_scope' | null> {
  const res = await fetch(GOOGLE_EVENTS_BASE, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildEventBody(blockText, dayDate)),
  })

  if (!res.ok) {
    if (res.status === 403) {
      return 'insufficient_scope'
    }
    console.error('[calendarSync] failed to create event:', res.status)
    return null
  }

  const data = await res.json()
  return data.id as string
}

async function insertMapping(
  supabase:        Awaited<ReturnType<typeof createClient>>,
  userId:          string,
  weekStart:       string,
  dayName:         string,
  blockText:       string,
  providerEventId: string
): Promise<void> {
  await supabase.from('calendar_sync_mappings').upsert(
    {
      user_id:           userId,
      week_start:        weekStart,
      day_name:          dayName,
      block_text:        blockText,
      provider_event_id: providerEventId,
      provider_name:     'google',
      updated_at:        new Date().toISOString(),
    },
    { onConflict: 'user_id,week_start,day_name,block_text' }
  )
}
