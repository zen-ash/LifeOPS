import { createClient } from '@/lib/supabase/server'
import { AddProjectDialog } from '@/components/projects/AddProjectDialog'
import { ProjectCard } from '@/components/projects/ProjectCard'
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

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Date boundaries for focus stats
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - now.getDay() // Sunday of current week
  ).toISOString()

  const [
    { data: profile },
    { data: projects },
    { data: upcomingTasks },
    { data: focusToday },
    { data: focusWeek },
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
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  // Compute focus stats
  function sumMinutes(rows: { actual_minutes: number | null; duration_minutes: number }[] | null) {
    return (rows ?? []).reduce(
      (sum, s) => sum + (s.actual_minutes ?? s.duration_minutes),
      0
    )
  }

  const todayMinutes = sumMinutes(focusToday)
  const weekMinutes = sumMinutes(focusWeek)
  const weekCompleted = (focusWeek ?? []).filter((s) => s.completed).length

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
