import { createClient } from '@/lib/supabase/server'
import { AddTaskDialog } from '@/components/tasks/AddTaskDialog'
import { TasksView } from '@/components/tasks/TasksView'
import { CheckSquare } from 'lucide-react'
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

  const totalTasks = tasks?.length ?? 0

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Page header */}
      <div className="rounded-xl border bg-card px-6 py-4 flex items-center justify-between gap-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <CheckSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-tight">Tasks</h1>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              {totalTasks === 0
                ? 'Your to-dos, assignments, and work items'
                : `${totalTasks} task${totalTasks === 1 ? '' : 's'} tracked`}
            </p>
          </div>
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
