import { createClient } from '@/lib/supabase/server'
import { AddHabitDialog } from '@/components/habits/AddHabitDialog'
import { HabitsView } from '@/components/habits/HabitsView'

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

  const [{ data: habits }, { data: logs }, { data: projects }] = await Promise.all([
    supabase
      .from('habits')
      .select('id, title, description, frequency, target_days_per_week, selected_weekdays, linked_project_id, is_active, created_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('habit_logs')
      .select('habit_id, logged_date')
      .eq('user_id', user!.id)
      .gte('logged_date', sixtyDaysAgoStr),
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Habits</h1>
          <p className="text-muted-foreground mt-1">
            Track your daily and weekly habits.
          </p>
        </div>
        <AddHabitDialog projects={projects ?? []} />
      </div>

      <HabitsView
        habits={habits ?? []}
        logsMap={logsMap}
        today={today}
        projects={projects ?? []}
      />
    </div>
  )
}
