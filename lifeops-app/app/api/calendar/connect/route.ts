// Phase 14.A / 14.B: Initiates the Google Calendar OAuth 2.0 consent flow.
// The user must be authenticated in LifeOPS (Supabase session).
// On success, Google redirects to /api/calendar/callback with an auth code.
//
// Scope: https://www.googleapis.com/auth/calendar (full calendar access).
// We use the broad 'calendar' scope rather than the narrower 'calendar.events'
// because Google's behaviour with 'calendar.events' varies by account type —
// some Workspace configurations reject event listing with that scope alone.
// 'calendar' definitively covers both read (events.list) and write (events.insert/patch/delete).
// For a personal/portfolio app this is the most reliable choice.
//
// Required env vars: GOOGLE_CLIENT_ID, NEXT_PUBLIC_APP_URL

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL

  if (!clientId || !appUrl) {
    return NextResponse.json(
      { error: 'Google Calendar is not configured on this server. Set GOOGLE_CLIENT_ID and NEXT_PUBLIC_APP_URL.' },
      { status: 500 }
    )
  }

  const redirectUri = `${appUrl}/api/calendar/callback`

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/calendar',
    access_type:   'offline',   // request a refresh_token
    prompt:        'consent',   // always return a refresh_token even on re-auth
    state:         user.id,     // carried through for user binding in callback
  })

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  return NextResponse.redirect(googleAuthUrl)
}
