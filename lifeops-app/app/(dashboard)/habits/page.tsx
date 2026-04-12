import { createClient } from '@/lib/supabase/server'
import { AddHabitDialog } from '@/components/habits/AddHabitDialog'
import { HabitsView } from '@/components/habits/HabitsView'
import { Flame } from 'lucide-react'

export default async function HabitsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const sixtyDaysAgo = new Date(now)
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const sixtyDaysAgoStr = `${sixtyDaysAgo.getFullYear()}-${String(sixtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sixtyDaysAgo.getDate()).padStart(2, '0')}`

  const [{ data: habits }, { data: logs }, { data: freezeLogs }, { data: skipLogs }, { data: projects }] =
    await Promise.all([
      supabase
        .from('habits')
        .select(
          'id, title, description, frequency, target_days_per_week, selected_weekdays, linked_project_id, is_active, freeze_days_available, grace_window_hours, created_at'
        )
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('habit_logs')
        .select('habit_id, logged_date')
        .eq('user_id', user!.id)
        .gte('logged_date', sixtyDaysAgoStr),
      supabase
        .from('habit_freeze_logs')
        .select('habit_id, freeze_date')
        .eq('user_id', user!.id)
        .gte('freeze_date', sixtyDaysAgoStr),
      // Phase 12.E: intentional skip logs
      supabase
        .from('habit_skip_logs')
        .select('habit_id, skip_date')
        .eq('user_id', user!.id)
        .gte('skip_date', sixtyDaysAgoStr),
      supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .order('name'),
    ])

  // Build logsMap: habitId → string[]
  const logsMap: Record<string, string[]> = {}
  for (const log of logs ?? []) {
    if (!logsMap[log.habit_id]) logsMap[log.habit_id] = []
    logsMap[log.habit_id].push(log.logged_date)
  }

  // Build freezeLogsMap: habitId → freeze date strings
  const freezeLogsMap: Record<string, string[]> = {}
  for (const fl of freezeLogs ?? []) {
    if (!freezeLogsMap[fl.habit_id]) freezeLogsMap[fl.habit_id] = []
    freezeLogsMap[fl.habit_id].push(fl.freeze_date)
  }

  // Phase 12.E: Build skipLogsMap: habitId → skip date strings
  const skipLogsMap: Record<string, string[]> = {}
  for (const sl of skipLogs ?? []) {
    if (!skipLogsMap[sl.habit_id]) skipLogsMap[sl.habit_id] = []
    skipLogsMap[sl.habit_id].push(sl.skip_date)
  }

  const activeCount = (habits ?? []).filter(h => h.is_active).length
  const totalCount = habits?.length ?? 0

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Page header */}
      <div className="rounded-xl border bg-card px-6 py-4 flex items-center justify-between gap-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Flame className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-tight">Habits</h1>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              {totalCount === 0
                ? 'Build your daily routines'
                : `${activeCount} active habit${activeCount === 1 ? '' : 's'} tracked`}
            </p>
          </div>
        </div>
        <AddHabitDialog projects={projects ?? []} />
      </div>

      <HabitsView
        habits={habits ?? []}
        logsMap={logsMap}
        freezeLogsMap={freezeLogsMap}
        skipLogsMap={skipLogsMap}
        today={today}
        projects={projects ?? []}
      />
    </div>
  )
}
