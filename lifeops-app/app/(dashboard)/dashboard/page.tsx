import { createClient } from '@/lib/supabase/server'
import { AddProjectDialog } from '@/components/projects/AddProjectDialog'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { HabitsDashboardWidget } from '@/components/habits/HabitsDashboardWidget'
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap'
import type { HeatmapDay } from '@/components/dashboard/ActivityHeatmap'
import {
  FolderOpen,
  CheckSquare,
  ArrowRight,
  Timer,
  FileText,
  BookOpen,
  Vault,
  Users,
  Trophy,
  BrainCircuit,
  Activity,
  Flame,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ── Priority dot color ────────────────────────────────────────────────
const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-muted-foreground/30',
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

// ── Streak helpers ────────────────────────────────────────────────────

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

function computeWeeklyStreak(
  today: string,
  targetPerWeek: number | null,
  logDates: string[]
): number {
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
      ws = shiftDate(ws, -7)
    } else {
      break
    }
  }
  return streak
}

const JS_DAY_TO_SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - now.getDay()
  ).toISOString()

  const sixtyDaysAgo = new Date(now)
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const sixtyDaysAgoStr = `${sixtyDaysAgo.getFullYear()}-${String(sixtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sixtyDaysAgo.getDate()).padStart(2, '0')}`

  // Phase 12.D: Heatmap window — 17 weeks of UTC dates, starting from a Sunday
  const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const thisSundayUTC = new Date(nowUTC)
  thisSundayUTC.setUTCDate(nowUTC.getUTCDate() - nowUTC.getUTCDay())
  const heatmapStartSunday = new Date(thisSundayUTC)
  heatmapStartSunday.setUTCDate(thisSundayUTC.getUTCDate() - 51 * 7)
  const heatmapStartStr = heatmapStartSunday.toISOString().split('T')[0]

  const [
    { data: profile },
    { data: projects },
    { data: upcomingTasks },
    { data: focusToday },
    { data: focusWeek },
    { data: activeHabits },
    { data: recentHabitLogs },
    { count: notesCount },
    { count: journalCount },
    { count: documentsCount },
    { data: buddyRows },
    { data: leaderboardRows },
    { data: activityLogs },
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
      .limit(8),
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
    supabase
      .from('notes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .eq('type', 'note'),
    supabase
      .from('notes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .eq('type', 'journal'),
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user!.id),
    supabase
      .from('study_buddies')
      .select('id, requester_user_id, addressee_user_id, status'),
    supabase.rpc('get_weekly_leaderboard', { p_timezone: 'UTC' }),
    // Phase 12.D: activity heatmap — only high-signal events
    supabase
      .from('user_activity_logs')
      .select('occurred_at')
      .eq('user_id', user!.id)
      .in('event_type', ['task_completed', 'focus_session_completed', 'habit_checked'])
      .gte('occurred_at', heatmapStartStr),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  type BuddyRow = {
    id: string
    requester_user_id: string
    addressee_user_id: string
    status: string
  }
  const buddies = (buddyRows as BuddyRow[] | null) ?? []
  const buddyCount = buddies.filter((b) => b.status === 'accepted').length
  const incomingCount = buddies.filter(
    (b) => b.addressee_user_id === user!.id && b.status === 'pending'
  ).length

  type LbRow = { user_id: string; rank: number; score: number }
  const lbRows = (leaderboardRows as LbRow[] | null) ?? []
  const myRank = lbRows.find((r) => r.user_id === user!.id)?.rank ?? null
  const totalParticipants = lbRows.length

  function sumMinutes(
    rows: { actual_minutes: number | null; duration_minutes: number }[] | null
  ) {
    return (rows ?? []).reduce(
      (sum, s) => sum + (s.actual_minutes ?? s.duration_minutes),
      0
    )
  }

  const todayMinutes = sumMinutes(focusToday)
  const weekMinutes = sumMinutes(focusWeek)
  const weekCompleted = (focusWeek ?? []).filter((s) => s.completed).length

  const habitLogsMap: Record<string, string[]> = {}
  for (const log of recentHabitLogs ?? []) {
    if (!habitLogsMap[log.habit_id]) habitLogsMap[log.habit_id] = []
    habitLogsMap[log.habit_id].push(log.logged_date)
  }

  const todayShort = JS_DAY_TO_SHORT[now.getDay()]

  const todayHabits = (activeHabits ?? []).filter((h) => {
    if (h.frequency === 'daily') return true
    const days: string[] = h.selected_weekdays ?? []
    if (days.length === 0) return true
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
  const completedTodayIds = (recentHabitLogs ?? [])
    .filter((l) => l.logged_date === today && todayHabitIds.has(l.habit_id))
    .map((l) => l.habit_id)

  const bestStreak = Math.max(0, ...todayHabitsWithStreak.map((h) => h.streak))

  // Phase 12.D: aggregate activity counts per UTC date
  const activityCountMap: Record<string, number> = {}
  for (const row of activityLogs ?? []) {
    const dateStr = new Date(row.occurred_at).toISOString().split('T')[0]
    activityCountMap[dateStr] = (activityCountMap[dateStr] ?? 0) + 1
  }
  const heatmapDays: HeatmapDay[] = []
  const curDate = new Date(heatmapStartSunday)
  while (curDate <= nowUTC) {
    const dateStr = curDate.toISOString().split('T')[0]
    heatmapDays.push({ date: dateStr, count: activityCountMap[dateStr] ?? 0 })
    curDate.setUTCDate(curDate.getUTCDate() + 1)
  }

  // Split tasks into overdue vs upcoming
  const overdueTasks = (upcomingTasks ?? []).filter((t) => t.due_date && isOverdue(t.due_date))
  const nonOverdueTasks = (upcomingTasks ?? []).filter(
    (t) => !t.due_date || !isOverdue(t.due_date)
  )
  const pendingCount = (upcomingTasks ?? []).length

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-8">

      {/* ── Today Hero ──────────────────────────────────────────────── */}
      <section className="animate-fade-in-up rounded-xl border bg-card overflow-hidden">
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Today
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Good day, {firstName}</h1>
          </div>

          {/* KPI chips */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex flex-col items-center rounded-lg bg-muted/50 px-4 py-2.5 min-w-[64px] text-center">
              <p className="text-lg font-bold leading-none tabular-nums">{todayMinutes}m</p>
              <p className="text-[10px] text-muted-foreground mt-1">focused</p>
            </div>
            <div className="flex flex-col items-center rounded-lg bg-muted/50 px-4 py-2.5 min-w-[64px] text-center">
              <p className="text-lg font-bold leading-none tabular-nums">
                {completedTodayIds.length}/{todayHabits.length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">habits</p>
            </div>
            <div className="flex flex-col items-center rounded-lg bg-muted/50 px-4 py-2.5 min-w-[64px] text-center">
              <p className="text-lg font-bold leading-none tabular-nums">{pendingCount}</p>
              <p className="text-[10px] text-muted-foreground mt-1">pending</p>
            </div>
            {myRank != null && totalParticipants > 1 && (
              <div className="flex flex-col items-center rounded-lg bg-primary/10 px-4 py-2.5 min-w-[64px] text-center">
                <p className="text-lg font-bold leading-none text-primary tabular-nums">
                  #{myRank}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">ranked</p>
              </div>
            )}
            {bestStreak > 0 && (
              <div className="flex flex-col items-center rounded-lg bg-orange-500/10 px-4 py-2.5 min-w-[64px] text-center">
                <p className="text-lg font-bold leading-none text-orange-500 flex items-center gap-0.5">
                  <Flame className="h-4 w-4" />
                  {bestStreak}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">streak</p>
              </div>
            )}
          </div>
        </div>

        {/* Goals strip */}
        {profile?.goals && profile.goals.length > 0 && (
          <div className="border-t border-border/50 px-6 py-2.5 flex items-center gap-2 bg-muted/20 overflow-x-auto">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider whitespace-nowrap shrink-0">
              Goals
            </p>
            {profile.goals.map((goal: string) => (
              <span
                key={goal}
                className="text-[11px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0"
              >
                {goal}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ── Main grid: Tasks (2/3) + Right column (1/3) ─────────────── */}
      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in-up"
        style={{ animationDelay: '80ms' }}
      >
        {/* Tasks panel — spans 2 cols on large screens */}
        <div className="lg:col-span-2 rounded-xl border bg-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-muted-foreground/60" />
              <span className="text-sm font-semibold">Upcoming Tasks</span>
              {pendingCount > 0 && (
                <span className="text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium tabular-nums">
                  {pendingCount}
                </span>
              )}
            </div>
            <Link
              href="/tasks"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Overdue zone */}
          {overdueTasks.length > 0 && (
            <div className="border-b border-destructive/20 bg-destructive/[0.035]">
              <div className="flex items-center gap-1.5 px-5 pt-3 pb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                <p className="text-[11px] font-semibold text-destructive/70 uppercase tracking-wider">
                  Overdue · {overdueTasks.length}
                </p>
              </div>
              {overdueTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-destructive/5 transition-colors"
                >
                  <div
                    className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      PRIORITY_DOT[task.priority]
                    )}
                  />
                  <p className="flex-1 text-sm font-medium truncate">{task.title}</p>
                  <span className="text-xs font-medium text-destructive shrink-0">
                    {formatDueDate(task.due_date!)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Non-overdue tasks */}
          {nonOverdueTasks.length > 0 ? (
            <div className="divide-y divide-border/40 flex-1">
              {nonOverdueTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors"
                >
                  <div
                    className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      PRIORITY_DOT[task.priority]
                    )}
                  />
                  <p className="flex-1 text-sm font-medium truncate">{task.title}</p>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {task.due_date ? formatDueDate(task.due_date) : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : overdueTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground flex-1">
              <CheckSquare className="h-7 w-7 mb-2 opacity-20" />
              <p className="text-sm font-medium">All clear</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                No upcoming tasks with due dates
              </p>
              <Link href="/tasks" className="text-xs mt-3 text-primary hover:underline">
                Add tasks →
              </Link>
            </div>
          ) : null}
        </div>

        {/* Right column: Habits + Focus stacked */}
        <div className="flex flex-col gap-5">
          <HabitsDashboardWidget
            activeCount={(activeHabits ?? []).length}
            completedTodayCount={completedTodayIds.length}
            bestStreak={bestStreak}
            todayHabits={todayHabitsWithStreak}
            today={today}
            completedTodayIds={completedTodayIds}
          />

          {/* Focus compact */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground/60" />
                <span className="text-sm font-semibold">Focus</span>
              </div>
              <Link
                href="/focus"
                className="text-xs text-primary hover:text-primary/70 font-medium transition-colors"
              >
                Start →
              </Link>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border/50">
              <div className="flex flex-col items-center py-4 px-2 text-center">
                <p className="text-xl font-bold tabular-nums">{todayMinutes}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">min today</p>
              </div>
              <div className="flex flex-col items-center py-4 px-2 text-center">
                <p className="text-xl font-bold tabular-nums">{weekMinutes}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">min/week</p>
              </div>
              <div className="flex flex-col items-center py-4 px-2 text-center">
                <p className="text-xl font-bold tabular-nums">{weekCompleted}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">sessions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom row: Knowledge + Social + AI ─────────────────────── */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-fade-in-up"
        style={{ animationDelay: '160ms' }}
      >
        {/* Knowledge */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/50">
            <FileText className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-sm font-semibold">Knowledge</span>
          </div>
          <div className="divide-y divide-border/40">
            <Link
              href="/notes"
              className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Notes
              </div>
              <span className="text-sm font-semibold tabular-nums">{notesCount ?? 0}</span>
            </Link>
            <Link
              href="/journal"
              className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" />
                Journal
              </div>
              <span className="text-sm font-semibold tabular-nums">{journalCount ?? 0}</span>
            </Link>
            <Link
              href="/documents"
              className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Vault className="h-3.5 w-3.5" />
                Documents
              </div>
              <span className="text-sm font-semibold tabular-nums">{documentsCount ?? 0}</span>
            </Link>
          </div>
        </div>

        {/* Social */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/50">
            <Users className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-sm font-semibold">Social</span>
          </div>
          <div className="divide-y divide-border/40">
            <Link
              href="/study-buddy"
              className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Study Buddies</span>
                {incomingCount > 0 && (
                  <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">
                    {incomingCount}
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold tabular-nums">{buddyCount}</span>
            </Link>
            <Link
              href="/leaderboard"
              className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                Weekly rank
              </div>
              <span className="text-sm font-semibold">
                {myRank != null && totalParticipants > 1 ? `#${myRank}` : '—'}
              </span>
            </Link>
          </div>
        </div>

        {/* AI Planner */}
        <Link
          href="/planner"
          className="rounded-xl border bg-card hover:bg-accent/30 transition-colors overflow-hidden flex flex-col"
        >
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/50">
            <BrainCircuit className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-semibold">AI Planner</span>
          </div>
          <div className="flex-1 px-5 py-4 flex flex-col">
            <p className="text-sm text-muted-foreground">
              Get your AI-generated weekly plan
            </p>
            <p className="text-xs text-primary font-medium mt-auto pt-3">Generate plan →</p>
          </div>
        </Link>
      </div>

      {/* ── Phase 12.D: Activity Heatmap ────────────────────────────── */}
      <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <ActivityHeatmap days={heatmapDays} />
      </div>

      {/* ── Projects ─────────────────────────────────────────────────── */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '280ms' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground/60" />
            <h2 className="text-sm font-semibold">Projects</h2>
            {projects && projects.length > 0 && (
              <span className="text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">
                {projects.length}
              </span>
            )}
          </div>
          <AddProjectDialog />
        </div>

        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 border-2 border-dashed rounded-xl text-muted-foreground">
            <FolderOpen className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm font-medium">No projects yet</p>
            <p className="text-xs mt-0.5 text-muted-foreground/70">
              Create your first project to get started
            </p>
          </div>
        )}
      </section>

      {/* ── Profile strip (secondary) ────────────────────────────────── */}
      {profile &&
        ((profile.priorities && profile.priorities.length > 0) ||
          profile.study_hours_per_week != null) && (
          <div
            className="rounded-xl border bg-card/50 px-5 py-3 animate-fade-in-up"
            style={{ animationDelay: '320ms' }}
          >
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-muted-foreground/50" />
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Profile
                </p>
              </div>
              {profile.priorities?.map((p: string) => (
                <span key={p} className="text-xs text-muted-foreground">
                  {p}
                </span>
              ))}
              {profile.study_hours_per_week != null && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {profile.study_hours_per_week}h/week · {profile.timezone ?? 'UTC'}
                </span>
              )}
            </div>
          </div>
        )}
    </div>
  )
}
