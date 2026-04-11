import { createClient } from '@/lib/supabase/server'
import { ShutdownView } from '@/components/shutdown/ShutdownView'
import { Moon } from 'lucide-react'
import type { DailyShutdown } from '@/types'

export default async function ShutdownPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // UTC date boundaries for today
  const today = new Date().toISOString().split('T')[0]
  const todayStart = today + 'T00:00:00.000Z'
  const tomorrowDate = new Date(today + 'T00:00:00Z')
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1)
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0]
  const tomorrowStart = tomorrowStr + 'T00:00:00.000Z'

  const [
    { data: completedToday },
    { data: slippedTasks },
    { data: focusSessions },
    { data: suggestions },
    { data: existingShutdown },
  ] = await Promise.all([
    // Tasks the user marked done today
    supabase
      .from('tasks')
      .select('id, title, priority')
      .eq('user_id', user!.id)
      .eq('status', 'done')
      .gte('completed_at', todayStart)
      .lt('completed_at', tomorrowStart)
      .order('completed_at', { ascending: false }),

    // Slipped: still incomplete and due today or earlier
    supabase
      .from('tasks')
      .select('id, title, priority, due_date')
      .eq('user_id', user!.id)
      .in('status', ['todo', 'in_progress'])
      .lte('due_date', today)
      .order('due_date', { ascending: true }),

    // Focus today — for the progress summary
    supabase
      .from('focus_sessions')
      .select('actual_minutes, duration_minutes')
      .eq('user_id', user!.id)
      .gte('started_at', todayStart)
      .lt('started_at', tomorrowStart),

    // Tomorrow suggestions pool: future tasks + undated urgent/high
    // The client merges carried-slipped tasks into this list dynamically
    supabase
      .from('tasks')
      .select('id, title, priority, due_date')
      .eq('user_id', user!.id)
      .in('status', ['todo', 'in_progress'])
      .or(`due_date.is.null,due_date.gte.${tomorrowStr}`)
      .limit(12),

    // Today's existing shutdown record (if user re-visits the page)
    supabase
      .from('daily_shutdowns')
      .select('*')
      .eq('user_id', user!.id)
      .eq('shutdown_date', today)
      .maybeSingle(),
  ])

  const focusMinutes = (focusSessions ?? []).reduce(
    (sum, s) => sum + (s.actual_minutes ?? s.duration_minutes ?? 0),
    0
  )

  const dateLabel = new Date(today + 'T12:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Page header */}
      <div className="rounded-xl border bg-card px-6 py-4 flex items-center justify-between gap-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Moon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-tight">Daily Shutdown</h1>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              Capture today&apos;s reality and set up tomorrow
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground hidden sm:block">{dateLabel}</span>
      </div>

      <ShutdownView
        today={today}
        completedTasks={
          (completedToday as Array<{ id: string; title: string; priority: string }>) ?? []
        }
        slippedTasks={
          (slippedTasks as Array<{
            id: string
            title: string
            priority: string
            due_date: string | null
          }>) ?? []
        }
        focusMinutes={focusMinutes}
        tomorrowSuggestions={
          (suggestions as Array<{
            id: string
            title: string
            priority: string
            due_date: string | null
          }>) ?? []
        }
        existingShutdown={(existingShutdown as DailyShutdown) ?? null}
      />
    </div>
  )
}
