import { createClient } from '@/lib/supabase/server'
import { AddProjectDialog } from '@/components/projects/AddProjectDialog'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { HabitsDashboardWidget } from '@/components/habits/HabitsDashboardWidget'
import { FolderOpen, CheckSquare, ArrowRight, Timer } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-secondary text-secondary-foreground',
}

function formatDueDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const due = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number)
  const due = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

// ── Streak helpers (server-side, for dashboard widget) ───────────────

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

function computeDailyStreak(today: string, logDates: string[]): number {
  const dateSet = new Set(logDates)
  const startDate = dateSet.has(today) ? today : shiftDate(today, -1)
  if (!dateSet.has(startDate)) return 0
  let streak = 0
  let cur = startDate
  while (dateSet.has(cur)) {
    streak++
    cur = shiftDate(cur, -1)
  }
  return streak
}

function getMonWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  const dow = d.getUTCDay()
  const diff = dow === 0 ? -6 : 1 - dow
  return shiftDate(dateStr, diff)
}

function computeWeeklyStreak(today: string, targetPerWeek: number | null, logDates: string[]): number {
  if (logDates.length === 0) return 0
  const dateSet = new Set(logDates)
  const target = targetPerWeek ?? 1
  const weekCounts = new Map<string, number>()
  for (const d of dateSet) {
    const ws = getMonWeekStart(d)
    weekCounts.set(ws, (weekCounts.get(ws) ?? 0) + 1)
  }
  let streak = 0
  let ws = getMonWeekStart(today)
  for (let i = 0; i < 52; i++) {
    const count = weekCounts.get(ws) ?? 0
    if (count >= target) {
      streak++
      ws = shiftDate(ws, -7)
    } else if (i === 0) {
      ws = shiftDate(ws, -7) // current week may still be in progress
    } else {
      break
    }
  }
  return streak
}

// Maps JS getDay() (0=Sun…6=Sat) to our short weekday strings
const JS_DAY_TO_SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // Date boundaries for focus stats
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - now.getDay()
  ).toISOString()

  const sixtyDaysAgo = new Date(now)
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const sixtyDaysAgoStr = `${sixtyDaysAgo.getFullYear()}-${String(sixtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sixtyDaysAgo.getDate()).padStart(2, '0')}`

  const [
    { data: profile },
    { data: projects },
    { data: upcomingTasks },
    { data: focusToday },
    { data: focusWeek },
    { data: activeHabits },
    { data: recentHabitLogs },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, goals, priorities, study_hours_per_week, timezone')
      .eq('id', user!.id)
      .single(),
    supabase
      .from('projects')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('id, title, priority, due_date, status')
      .eq('user_id', user!.id)
      .not('status', 'in', '("done","cancelled")')
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })
      .limit(5),
    supabase
      .from('focus_sessions')
      .select('actual_minutes, duration_minutes, completed')
      .eq('user_id', user!.id)
      .gte('started_at', todayStart),
    supabase
      .from('focus_sessions')
      .select('actual_minutes, duration_minutes, completed')
      .eq('user_id', user!.id)
      .gte('started_at', weekStart),
    supabase
      .from('habits')
      .select('id, title, frequency, target_days_per_week, selected_weekdays')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('habit_logs')
      .select('habit_id, logged_date')
      .eq('user_id', user!.id)
      .gte('logged_date', sixtyDaysAgoStr),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  // Focus stats
  function sumMinutes(rows: { actual_minutes: number | null; duration_minutes: number }[] | null) {
    return (rows ?? []).reduce(
      (sum, s) => sum + (s.actual_minutes ?? s.duration_minutes),
      0
    )
  }

  const todayMinutes = sumMinutes(focusToday)
  const weekMinutes = sumMinutes(focusWeek)
  const weekCompleted = (focusWeek ?? []).filter((s) => s.completed).length

  // Habits stats
  const habitLogsMap: Record<string, string[]> = {}
  for (const log of recentHabitLogs ?? []) {
    if (!habitLogsMap[log.habit_id]) habitLogsMap[log.habit_id] = []
    habitLogsMap[log.habit_id].push(log.logged_date)
  }

  // Short weekday string for today (e.g. 'mon', 'fri')
  const todayShort = JS_DAY_TO_SHORT[now.getDay()]

  // Habits due today:
  //   - daily habits: always
  //   - weekly habits with selected days: only when today's weekday is in the list
  //   - weekly habits with null/empty selected_weekdays: always (backward compat)
  const todayHabits = (activeHabits ?? []).filter((h) => {
    if (h.frequency === 'daily') return true
    const days: string[] = h.selected_weekdays ?? []
    if (days.length === 0) return true   // no schedule set → show every day
    return days.includes(todayShort)
  })

  const todayHabitsWithStreak = todayHabits.map((h) => ({
    id: h.id,
    title: h.title,
    frequency: h.frequency as 'daily' | 'weekly',
    streak:
      h.frequency === 'daily'
        ? computeDailyStreak(today, habitLogsMap[h.id] ?? [])
        : computeWeeklyStreak(today, h.target_days_per_week, habitLogsMap[h.id] ?? []),
  }))

  const todayHabitIds = new Set(todayHabits.map((h) => h.id))
  // Only count completions for habits that are actually due today
  const completedTodayIds = (recentHabitLogs ?? [])
    .filter((l) => l.logged_date === today && todayHabitIds.has(l.habit_id))
    .map((l) => l.habit_id)

  const bestStreak = Math.max(0, ...todayHabitsWithStreak.map((h) => h.streak))

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Welcome banner */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Good day, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your workspace.
        </p>
      </div>

      {/* Profile card */}
      {profile && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Your profile
          </p>

          {profile.goals && profile.goals.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.goals.map((goal: string) => (
                <span
                  key={goal}
                  className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium"
                >
                  {goal}
                </span>
              ))}
            </div>
          )}

          {profile.priorities && profile.priorities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.priorities.map((p: string) => (
                <span
                  key={p}
                  className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full"
                >
                  {p}
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground pt-0.5">
            <span className="font-medium text-foreground">Timezone:</span>{' '}
            {profile.timezone ?? 'UTC'}
            {profile.study_hours_per_week != null && (
              <>
                {' · '}
                <span className="font-medium text-foreground">
                  {profile.study_hours_per_week}h
                </span>{' '}
                / week
              </>
            )}
          </p>
        </div>
      )}

      {/* Focus summary */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Focus</h2>
          <Link
            href="/focus"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Open Focus Mode
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Today', value: `${todayMinutes}m`, sub: 'focused' },
            { label: 'This week', value: `${weekMinutes}m`, sub: 'focused' },
            {
              label: 'Sessions',
              value: String(weekCompleted),
              sub: 'completed this week',
            },
          ].map(({ label, value, sub }) => (
            <div
              key={label}
              className="rounded-xl border bg-card p-4 flex flex-col items-center text-center"
            >
              <Timer className="h-5 w-5 text-primary mb-2" />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              <p className="text-[10px] text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Habits widget */}
      <HabitsDashboardWidget
        activeCount={(activeHabits ?? []).length}
        completedTodayCount={completedTodayIds.length}
        bestStreak={bestStreak}
        todayHabits={todayHabitsWithStreak}
        today={today}
        completedTodayIds={completedTodayIds}
      />

      {/* Upcoming Tasks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Upcoming Tasks</h2>
          <Link
            href="/tasks"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {upcomingTasks && upcomingTasks.length > 0 ? (
          <div className="rounded-xl border bg-card divide-y">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                <CheckSquare className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                <p className="flex-1 text-sm font-medium truncate">{task.title}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      'text-[11px] font-medium px-1.5 py-0.5 rounded capitalize',
                      PRIORITY_STYLES[task.priority]
                    )}
                  >
                    {task.priority}
                  </span>
                  {task.due_date && (
                    <span
                      className={cn(
                        'text-xs',
                        isOverdue(task.due_date)
                          ? 'text-destructive font-medium'
                          : 'text-muted-foreground'
                      )}
                    >
                      {formatDueDate(task.due_date)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-xl text-muted-foreground">
            <CheckSquare className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm font-medium">No upcoming tasks with due dates</p>
            <Link href="/tasks" className="text-xs mt-1 text-primary hover:underline">
              Go to Tasks →
            </Link>
          </div>
        )}
      </section>

      {/* Projects section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Projects</h2>
          <AddProjectDialog />
        </div>

        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
            <FolderOpen className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No projects yet</p>
            <p className="text-sm mt-1">
              Create your first project to get started.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
