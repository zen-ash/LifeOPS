'use client'

// Phase 14.A: Compact Google Calendar connect/status control for the Planner header.
// When not connected: shows a "Connect Google Calendar" link.
// When connected: shows a green status dot + disconnect button.

import { useTransition } from 'react'
import { Calendar, Link2Off, Loader2, ExternalLink } from 'lucide-react'
import { disconnectCalendar } from '@/lib/actions/calendarActions'

interface CalendarConnectBannerProps {
  connected: boolean
}

export function CalendarConnectBanner({ connected }: CalendarConnectBannerProps) {
  const [isPending, startTransition] = useTransition()

  function handleDisconnect() {
    startTransition(async () => {
      await disconnectCalendar()
    })
  }

  if (connected) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
        <span>Google Calendar synced</span>
        <button
          onClick={handleDisconnect}
          disabled={isPending}
          className="ml-0.5 text-muted-foreground/50 hover:text-destructive transition-colors"
          title="Disconnect Google Calendar"
          aria-label="Disconnect Google Calendar"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Link2Off className="h-3 w-3" />
          )}
        </button>
      </div>
    )
  }

  return (
    <a
      href="/api/calendar/connect"
      className="flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
      title="Import events from Google Calendar into your planner"
    >
      <Calendar className="h-3.5 w-3.5 shrink-0" />
      Connect Google Calendar
      <ExternalLink className="h-2.5 w-2.5 opacity-40" aria-hidden="true" />
    </a>
  )
}
