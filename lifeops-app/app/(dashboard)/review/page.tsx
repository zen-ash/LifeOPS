import { createClient } from '@/lib/supabase/server'
import { ReviewView } from '@/components/review/ReviewView'
import { TrendingUp } from 'lucide-react'
import type {
  WeeklyMetrics,
  HabitConsistencyItem,
  WeeklyReview,
} from '@/types'

// Compute Monday of the current UTC week (ISO 8601: week starts on Monday)
function getWeekBounds(): {
  weekStart: string
  weekEnd: string
  weekStartISO: string
  nextWeekStartISO: string
  daysElapsed: number
} {
  const now = new Date()
  const dayOfWeek = now.getUTCDay() // 0=Sun, 1=Mon ... 6=Sat
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - daysSinceMonday)
  monday.setUTCHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)

  const nextMonday = new Date(monday)
  nextMonday.setUTCDate(monday.getUTCDate() + 7)

  const weekStart = monday.toISOString().split('T')[0]
  const weekEnd = sunday.toISOString().split('T')[0]

  return {
    weekStart,
    weekEnd,
    weekStartISO: monday.toISOString(),
    nextWeekStartISO: nextMonday.toISOString(),
    // How many days have elapsed in this week so far (1 on Monday, 7 on Sunday)
    daysElapsed: daysSinceMonday + 1,
  }
}

export default async function ReviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { weekStart, weekEnd, weekStartISO, nextWeekStartISO, daysElapsed } =
    getWeekBounds()

  const [
    { data: completedTasksRaw },
    { data: missedTasksRaw },
    { data: focusSessionsRaw },
    { data: activeHabits },
    { data: habitLogsRaw },
    { data: habitSkipLogsRaw },
    { data: weeklyPlanRaw },
    { data: shutdownsRaw },
    { data: existingReview },
  ] = await Promise.all([
    // Tasks completed this week
    supabase
      .from('tasks')
      .select('id, title, priority')
      .eq('user_id', user!.id)
      .eq('status', 'done')
      .gte('completed_at', weekStartISO)
      .lt('completed_at', nextWeekStartISO)
      .order('completed_at', { ascending: false }),

    // Tasks due this week that are still open (missed so far)
    supabase
      .from('tasks')
      .select('id, title, priority, due_date')
      .eq('user_id', user!.id)
      .in('status', ['todo', 'in_progress'])
      .gte('due_date', weekStart)
      .lte('due_date', weekEnd),

    // Focus sessions this week
    supabase
      .from('focus_sessions')
      .select('actual_minutes, duration_minutes')
      .eq('user_id', user!.id)
      .gte('started_at', weekStartISO)
      .lt('started_at', nextWeekStartISO),

    // Active habits (for consistency calculation)
    supabase
      .from('habits')
      .select('id, title, frequency, target_days_per_week, selected_weekdays')
      .eq('user_id', user!.id)
      .eq('is_active', true),

    // Habit logs this week
    supabase
      .from('habit_logs')
      .select('habit_id, logged_date')
      .eq('user_id', user!.id)
      .gte('logged_date', weekStart)
      .lte('logged_date', weekEnd),

    // Phase 12.E: habit skip logs this week
    supabase
      .from('habit_skip_logs')
      .select('habit_id, skip_date')
      .eq('user_id', user!.id)
      .gte('skip_date', weekStart)
      .lte('skip_date', weekEnd),

    // Weekly plan for this week (if one was generated)
    supabase
      .from('weekly_plans')
      .select('plan_json')
      .eq('user_id', user!.id)
      .eq('week_start_date', weekStart)
      .maybeSingle(),

    // Daily shutdowns this week (for energy + shutdown day count)
    supabase
      .from('daily_shutdowns')
      .select('shutdown_date, energy, reflection')
      .eq('user_id', user!.id)
      .gte('shutdown_date', weekStart)
      .lte('shutdown_date', weekEnd)
      .order('shutdown_date', { ascending: true }),

    // Existing review for this week (re-edit support)
    supabase
      .from('weekly_reviews')
      .select('*')
      .eq('user_id', user!.id)
      .eq('week_start', weekStart)
      .maybeSingle(),
  ])

  // --- Focus minutes ---
  const focusMinutes = (focusSessionsRaw ?? []).reduce(
    (sum, s) => sum + (s.actual_minutes ?? s.duration_minutes ?? 0),
    0
  )

  // --- Habit consistency ---
  const logCountByHabitId = new Map<string, number>()
  for (const log of habitLogsRaw ?? []) {
    logCountByHabitId.set(log.habit_id, (logCountByHabitId.get(log.habit_id) ?? 0) + 1)
  }

  // Phase 12.E: skip count per habit this week
  const skipCountByHabitId = new Map<string, number>()
  for (const sl of habitSkipLogsRaw ?? []) {
    skipCountByHabitId.set(sl.habit_id, (skipCountByHabitId.get(sl.habit_id) ?? 0) + 1)
  }

  const habitConsistency: HabitConsistencyItem[] = (activeHabits ?? []).map((h) => {
    const logsCount = logCountByHabitId.get(h.id) ?? 0
    // Daily habits: expected = days elapsed so far in this week
    // Weekly habits: expected = target_days_per_week or count of selected weekdays (default 1)
    const expectedDays =
      h.frequency === 'daily'
        ? daysElapsed
        : (h.target_days_per_week ??
            ((Array.isArray(h.selected_weekdays) ? h.selected_weekdays.length : 0) || 1))
    const percentage = Math.min(logsCount / Math.max(expectedDays, 1), 1)
    const skippedCount = skipCountByHabitId.get(h.id)
    return {
      habitId: h.id,
      habitTitle: h.title,
      logsCount,
      expectedDays,
      percentage,
      ...(skippedCount !== undefined ? { skippedCount } : {}),
    }
  })

  // --- Planned task titles (from the weekly plan, deduplicated) ---
  const plannedTaskTitles: string[] = []
  if (weeklyPlanRaw?.plan_json?.days) {
    const seen = new Set<string>()
    for (const day of weeklyPlanRaw.plan_json.days) {
      for (const title of day.topTasks ?? []) {
        if (!seen.has(title)) {
          seen.add(title)
          plannedTaskTitles.push(title)
        }
      }
    }
  }

  // --- Shutdown insights ---
  const shutdowns = shutdownsRaw ?? []
  const energySummary = shutdowns.map((s) => ({
    date: s.shutdown_date as string,
    energy: s.energy as string | null,
  }))

  const completedTasks = (completedTasksRaw ?? []) as Array<{
    id: string
    title: string
    priority: string
  }>
  const missedTasks = (missedTasksRaw ?? []) as Array<{
    id: string
    title: string
    priority: string
    due_date: string | null
  }>

  const metrics: WeeklyMetrics = {
    focusMinutes,
    completedTaskCount: completedTasks.length,
    missedTaskCount: missedTasks.length,
    plannedTaskTitles,
    completedTasks,
    missedTasks,
    habitConsistency,
    shutdownDays: shutdowns.length,
    energySummary,
  }

  const weekLabel = new Date(weekStart + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })
  const weekEndLabel = new Date(weekEnd + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const isCurrentWeek = daysElapsed < 7

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Page header */}
      <div className="rounded-xl border bg-card px-6 py-4 flex items-center justify-between gap-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-tight">Weekly Review</h1>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              {weekLabel} – {weekEndLabel}
            </p>
          </div>
        </div>
        {isCurrentWeek && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 shrink-0">
            Week in progress
          </span>
        )}
      </div>

      <ReviewView
        weekStart={weekStart}
        weekEnd={weekEnd}
        metrics={metrics}
        existingReview={(existingReview as WeeklyReview) ?? null}
      />
    </div>
  )
}
