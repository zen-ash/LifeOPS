// Phase 14.A: Internal server-side calendar helpers.
// Not a 'use server' file — never import from client components.
// Handles Google OAuth token refresh and Google Calendar event sync.

import { createClient } from '@/lib/supabase/server'
import type { CalendarEvent } from '@/types'

// ── Internal Google API types ────────────────────────────────────────────────

interface GoogleTokenResponse {
  access_token:   string
  expires_in:     number
  token_type:     string
  refresh_token?: string
  error?:         string
}

interface GoogleCalendarApiEvent {
  id:             string
  summary?:       string
  start:          { dateTime?: string; date?: string; timeZone?: string }
  end:            { dateTime?: string; date?: string; timeZone?: string }
  status?:        string
  transparency?:  string
  // Phase 14.B: used to identify LifeOPS-managed events pushed back to Google
  extendedProperties?: {
    private?: Record<string, string>
  }
}

// ── Connection helpers ───────────────────────────────────────────────────────

// Returns true if the user has an active (or refreshable) calendar connection.
export async function isCalendarConnected(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('calendar_connections')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  return data !== null
}

// Returns a fresh access token, refreshing it from Google if it has expired.
// Removes the broken connection and returns null on unrecoverable errors.
// Exported so calendarActions.ts can obtain a token before calling calendarSync helpers.
export async function getFreshAccessToken(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: conn } = await supabase
    .from('calendar_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (!conn) return null

  // Token still valid (60s buffer before expiry)
  if (new Date(conn.expires_at).getTime() - Date.now() > 60_000) {
    return conn.access_token
  }

  // Token expired — attempt refresh
  if (!conn.refresh_token) {
    // No refresh token stored — user must reconnect
    await supabase.from('calendar_connections').delete().eq('user_id', userId)
    return null
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token: conn.refresh_token,
        grant_type:    'refresh_token',
      }),
    })

    const tokens = (await res.json()) as GoogleTokenResponse

    if (!res.ok || tokens.error) {
      // Refresh rejected (e.g., user revoked access) — remove the connection
      await supabase.from('calendar_connections').delete().eq('user_id', userId)
      return null
    }

    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await supabase
      .from('calendar_connections')
      .update({
        access_token: tokens.access_token,
        expires_at:   newExpiresAt,
        updated_at:   new Date().toISOString(),
      })
      .eq('user_id', userId)

    return tokens.access_token
  } catch (err) {
    console.error('[calendar] token refresh failed:', err)
    return null
  }
}

// ── Event sync ───────────────────────────────────────────────────────────────

// Fetches Google Calendar events for a date window, caches them in
// calendar_events (delete-and-reinsert for the window), and returns the
// stored rows. Returns [] if the user is not connected or the fetch fails.
//
// weekStart / weekEnd are ISO date strings, e.g. "2024-01-15" / "2024-01-21".
// Events are fetched from primary calendar only, with singleEvents=true so
// Google expands recurring events — no rrule parsing needed.
export async function syncCalendarEvents(
  userId:    string,
  weekStart: string,
  weekEnd:   string
): Promise<CalendarEvent[]> {
  const accessToken = await getFreshAccessToken(userId)
  if (!accessToken) return []

  const timeMin = weekStart + 'T00:00:00Z'
  const timeMax = weekEnd   + 'T23:59:59Z'

  try {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
    url.searchParams.set('timeMin',      timeMin)
    url.searchParams.set('timeMax',      timeMax)
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('orderBy',      'startTime')
    url.searchParams.set('maxResults',   '50')

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      // Log the full Google error body so scope/permission issues are diagnosable
      const errBody = await res.json().catch(() => null)
      console.error('[calendar] Google Calendar API error:', res.status, JSON.stringify(errBody))
      return []
    }

    const body = await res.json()
    const items: GoogleCalendarApiEvent[] = body.items ?? []

    // Filter out cancelled events and transparent (free/no-block) events
    const rows = items
      .filter((e) => e.status !== 'cancelled' && e.transparency !== 'transparent')
      .map((e) => {
        const isAllDay  = !e.start.dateTime
        // All-day events have a `date` field (YYYY-MM-DD); timed events have dateTime with offset
        const startTime = e.start.dateTime ?? (e.start.date! + 'T00:00:00Z')
        const endTime   = e.end.dateTime   ?? (e.end.date!   + 'T00:00:00Z')
        // Phase 14.B: detect LifeOPS-managed events so they can be excluded from
        // busyCalendarMinutes in the planner (prevents double-counting synced work blocks).
        const isLifeopsManaged = e.extendedProperties?.private?.['lifeops_managed'] === 'true'
        return {
          user_id:             userId,
          provider_event_id:   e.id,
          title:               e.summary?.trim() || '(No title)',
          start_time:          startTime,
          end_time:            endTime,
          is_all_day:          isAllDay,
          is_lifeops_managed:  isLifeopsManaged,
        }
      })

    const supabase = await createClient()

    // Delete stale cached events in this window, then insert the fresh batch
    await supabase
      .from('calendar_events')
      .delete()
      .eq('user_id', userId)
      .gte('start_time', timeMin)
      .lte('start_time', timeMax)

    if (rows.length > 0) {
      await supabase.from('calendar_events').insert(rows)
    }

    // Read back from DB so types are clean (include is_lifeops_managed for Phase 14.B filtering)
    const { data } = await supabase
      .from('calendar_events')
      .select('id, title, start_time, end_time, is_all_day, is_lifeops_managed')
      .eq('user_id', userId)
      .gte('start_time', timeMin)
      .lte('start_time', timeMax)
      .order('start_time')

    return (data ?? []) as CalendarEvent[]
  } catch (err) {
    console.error('[calendar] syncCalendarEvents failed:', err)
    return []
  }
}
