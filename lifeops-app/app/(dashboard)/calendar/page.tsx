import { createClient } from '@/lib/supabase/server'
import { CalendarView } from '@/components/calendar/CalendarView'

type TaskRow = {
  id: string
  title: string
  priority: string
  status: string
  due_date: string
  projects: { name: string } | null
}

export default async function CalendarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const [{ data: rawTasks }, { data: projects }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, priority, status, due_date, projects(name)')
      .eq('user_id', user!.id)
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true }),
    supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', user!.id)
      .eq('status', 'active')
      .order('name'),
  ])

  const tasks = (rawTasks as TaskRow[] | null ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    status: t.status,
    due_date: t.due_date,
    project_name: t.projects?.name ?? null,
  }))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground mt-1">
          View and manage your tasks by due date.
        </p>
      </div>

      <CalendarView
        tasks={tasks}
        projects={projects ?? []}
        initialYear={now.getFullYear()}
        initialMonth={now.getMonth()}
        today={today}
      />
    </div>
  )
}
