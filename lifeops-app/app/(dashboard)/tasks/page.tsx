import { createClient } from '@/lib/supabase/server'
import { AddTaskDialog } from '@/components/tasks/AddTaskDialog'
import { TasksView } from '@/components/tasks/TasksView'
import type { Tag, SavedView } from '@/types'

type TaskTagRow = {
  task_id: string
  tags: { id: string; name: string; color: string; user_id: string; created_at: string } | null
}

export default async function TasksPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: tasks }, { data: projects }, { data: rawTaskTags }, { data: rawSavedViews }] =
    await Promise.all([
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
      supabase
        .from('task_tags')
        .select('task_id, tags(id, name, color, user_id, created_at)')
        .eq('user_id', user!.id),
      supabase
        .from('saved_views')
        .select('*')
        .eq('user_id', user!.id)
        .eq('entity_type', 'tasks')
        .order('created_at', { ascending: true }),
    ])

  // Build task_id → Tag[] lookup
  const tagsByTaskId: Record<string, Tag[]> = {}
  for (const row of (rawTaskTags as TaskTagRow[] | null) ?? []) {
    if (!row.tags) continue
    if (!tagsByTaskId[row.task_id]) tagsByTaskId[row.task_id] = []
    tagsByTaskId[row.task_id].push(row.tags as Tag)
  }

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

      <TasksView
        tasks={tasks ?? []}
        projects={projects ?? []}
        tagsByTaskId={tagsByTaskId}
        savedViews={(rawSavedViews as SavedView[] | null) ?? []}
      />
    </div>
  )
}
