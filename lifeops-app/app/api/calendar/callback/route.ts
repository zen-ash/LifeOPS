// Phase 14.A: Handles the redirect from Google after the user grants (or denies)
// calendar access. Exchanges the authorization code for OAuth tokens and stores
// them in calendar_connections. Never exposes tokens to the browser.
//
// Required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_APP_URL

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface GoogleTokenResponse {
  access_token:   string
  refresh_token?: string
  expires_in:     number
  token_type:     string
  error?:         string
  error_description?: string
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  // User denied access or Google returned an error
  if (error || !code) {
    return NextResponse.redirect(`${origin}/planner?calendar=denied`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login`)
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const appUrl       = process.env.NEXT_PUBLIC_APP_URL ?? origin
  const redirectUri  = `${appUrl}/api/calendar/callback`

  try {
    // Exchange authorization code for access + refresh tokens
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    })

    const tokens = (await res.json()) as GoogleTokenResponse

    if (!res.ok || tokens.error || !tokens.access_token) {
      console.error('[calendar/callback] token exchange failed:', tokens.error, tokens.error_description)
      return NextResponse.redirect(`${origin}/planner?calendar=error`)
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Upsert: handles both first connect and re-auth (e.g., token rotation)
    const { error: dbError } = await supabase.from('calendar_connections').upsert(
      {
        user_id:       user.id,
        provider:      'google',
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at:    expiresAt,
        updated_at:    new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    if (dbError) {
      console.error('[calendar/callback] DB upsert failed:', dbError.message)
      return NextResponse.redirect(`${origin}/planner?calendar=error`)
    }

    return NextResponse.redirect(`${origin}/planner?calendar=connected`)
  } catch (err) {
    console.error('[calendar/callback] unexpected error:', err)
    return NextResponse.redirect(`${origin}/planner?calendar=error`)
  }
}
