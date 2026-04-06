import { createClient } from '@/lib/supabase/server'
import { AddTaskDialog } from '@/components/tasks/AddTaskDialog'
import { TasksView } from '@/components/tasks/TasksView'

export default async function TasksPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: tasks }, { data: projects }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*, projects(id, name, color)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', user!.id)
      .eq('status', 'active')
      .order('name'),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Manage your to-dos, assignments, and work items.
          </p>
        </div>
        <AddTaskDialog projects={projects ?? []} />
      </div>

      <TasksView tasks={tasks ?? []} projects={projects ?? []} />
    </div>
  )
}
