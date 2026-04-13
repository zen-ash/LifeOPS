import { createClient } from '@/lib/supabase/server'
import { PlannerView } from '@/components/planner/PlannerView'
import { CalendarConnectBanner } from '@/components/planner/CalendarConnectBanner'
import { isCalendarConnected, syncCalendarEvents } from '@/lib/actions/calendar'
import { BrainCircuit, CalendarDays } from 'lucide-react'
import type { GeneratedPlan, CalendarEvent } from '@/types'

// Ordered weekday names matching the planner's Mon–Sun layout
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

// Returns ISO date string for Monday of the week containing `date`
function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

// Builds a map from ISO date string → day name for a 7-day week starting on weekStart.
// Uses UTC arithmetic so the mapping is consistent with how events are stored.
function buildDateToDayMap(weekStart: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + i)
    map[d.toISOString().split('T')[0]] = DAY_NAMES[i]
  }
  return map
}

export default async function PlannerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const weekStart = getMondayOfWeek(new Date())
  const today = new Date().toISOString().split('T')[0]

  // Phase 13.A: fetch profile + pending tasks alongside saved plan
  const [savedRowResult, profileResult, tasksResult] = await Promise.all([
    supabase
      .from('weekly_plans')
      .select('plan_json')
      .eq('user_id', user!.id)
      .eq('week_start_date', weekStart)
      .single(),
    supabase
      .from('profiles')
      .select('study_hours_per_week')
      .eq('id', user!.id)
      .single(),
    supabase
      .from('tasks')
      .select('title, priority, due_date')
      .eq('user_id', user!.id)
      .in('status', ['todo', 'in_progress'])
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })
      .limit(30),
  ])

  const savedPlan = (savedRowResult.data?.plan_json as GeneratedPlan) ?? null

  // Phase 13.A: compute base available time per weekday from profile (default 6h)
  const studyHoursPerWeek = profileResult.data?.study_hours_per_week ?? null
  const availableMinutesPerDay = studyHoursPerWeek
    ? Math.round((studyHoursPerWeek * 60) / 5)
    : 360

  // Phase 13.A: deadline-risk tasks — due within 3 days from today
  const riskCutoffDate = new Date()
  riskCutoffDate.setDate(riskCutoffDate.getDate() + 3)
  const riskCutoff = riskCutoffDate.toISOString().split('T')[0]
  const atRiskTasks = (tasksResult.data ?? [])
    .filter((t) => t.due_date && t.due_date >= today && t.due_date <= riskCutoff)
    .map((t) => ({
      title:    t.title,
      priority: t.priority as string,
      dueDate:  t.due_date as string,
    }))

  // ── Phase 14.A: Calendar integration ─────────────────────────────────────
  const weekEndDate = new Date(weekStart + 'T00:00:00Z')
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6)
  const weekEnd = weekEndDate.toISOString().split('T')[0]

  const calendarConnected = await isCalendarConnected(user!.id)

  let calendarEvents: CalendarEvent[] = []
  const calendarBusyMinutesByDay: Record<string, number> = {}
  const calendarEventsByDay:      Record<string, CalendarEvent[]> = {}

  if (calendarConnected) {
    calendarEvents = await syncCalendarEvents(user!.id, weekStart, weekEnd)

    const dateToDayName = buildDateToDayMap(weekStart)

    for (const ev of calendarEvents) {
      // Use UTC date portion of start_time for day bucketing
      const eventDate = ev.start_time.split('T')[0]
      const dayName   = dateToDayName[eventDate]
      if (!dayName) continue

      // Group for display
      if (!calendarEventsByDay[dayName]) calendarEventsByDay[dayName] = []
      calendarEventsByDay[dayName].push(ev)

      // Accumulate busy minutes.
      // Skip all-day events (no specific time block) and LifeOPS-managed events
      // (Phase 14.B: we pushed these from our own plan — counting them would
      // make overloaded days appear even fuller after syncing, doubling the impact).
      if (!ev.is_all_day && !ev.is_lifeops_managed) {
        const durationMin = Math.round(
          (new Date(ev.end_time).getTime() - new Date(ev.start_time).getTime()) / 60_000
        )
        // Cap individual event contribution at 8h to guard against bad data
        calendarBusyMinutesByDay[dayName] =
          (calendarBusyMinutesByDay[dayName] ?? 0) + Math.min(durationMin, 480)
      }
    }
  }
  // ── End Phase 14.A ────────────────────────────────────────────────────────

  const weekEndLabel = weekEndDate.toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
  })
  const weekStartLabel = new Date(weekStart).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
  })

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="rounded-xl border bg-card px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <BrainCircuit className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-tight">AI Planner</h1>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              Personalised weekly plan based on your tasks, habits &amp; goals
            </p>
          </div>
        </div>

        {/* Week range + save status + Phase 14.A: calendar connect */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <CalendarConnectBanner connected={calendarConnected} />

          <div className="flex items-center gap-2.5 text-sm shrink-0">
            <CalendarDays className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-muted-foreground text-xs">
              {weekStartLabel} – {weekEndLabel}
            </span>
            <span
              className={
                savedPlan
                  ? 'text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20'
                  : 'text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border/50'
              }
            >
              {savedPlan ? 'Saved' : 'No plan'}
            </span>
          </div>
        </div>
      </div>

      <PlannerView
        weekStart={weekStart}
        savedPlan={savedPlan}
        availableMinutesPerDay={availableMinutesPerDay}
        atRiskTasks={atRiskTasks}
        calendarEventsByDay={calendarEventsByDay}
        calendarBusyMinutesByDay={calendarBusyMinutesByDay}
        calendarConnected={calendarConnected}
      />
    </div>
  )
}
