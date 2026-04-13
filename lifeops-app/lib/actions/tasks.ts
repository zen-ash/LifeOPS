'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/actions/activityLog'

const VALID_STATUSES = ['todo', 'in_progress', 'done', 'cancelled']
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent']

function revalidateTaskPaths() {
  revalidatePath('/dashboard')
  revalidatePath('/tasks')
  revalidatePath('/calendar')
}

export async function addTask(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const priority = (formData.get('priority') as string) || 'medium'
  const due_date = (formData.get('due_date') as string) || null
  const estimated_minutes = formData.get('estimated_minutes')
  const project_id = (formData.get('project_id') as string) || null

  if (!title?.trim()) return { error: 'Task title is required' }
  if (!VALID_PRIORITIES.includes(priority)) return { error: 'Invalid priority' }

  const { data: inserted, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      priority,
      due_date: due_date || null,
      estimated_minutes: estimated_minutes ? parseInt(estimated_minutes as string) : null,
      project_id: project_id || null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidateTaskPaths()
  return { success: true, taskId: inserted.id as string }
}

export async function editTask(taskId: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const priority = (formData.get('priority') as string) || 'medium'
  const status = (formData.get('status') as string) || 'todo'
  const due_date = (formData.get('due_date') as string) || null
  const estimated_minutes = formData.get('estimated_minutes')
  const project_id = (formData.get('project_id') as string) || null

  if (!title?.trim()) return { error: 'Task title is required' }
  if (!VALID_PRIORITIES.includes(priority)) return { error: 'Invalid priority' }
  if (!VALID_STATUSES.includes(status)) return { error: 'Invalid status' }

  const updates: Record<string, unknown> = {
    title: title.trim(),
    description: description?.trim() || null,
    priority,
    status,
    due_date: due_date || null,
    estimated_minutes: estimated_minutes ? parseInt(estimated_minutes as string) : null,
    project_id: project_id || null,
  }

  // Keep completed_at in sync when status changes via edit
  if (status === 'done') {
    updates.completed_at = new Date().toISOString()
  } else {
    updates.completed_at = null
  }

  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateTaskPaths()
  return { success: true }
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateTaskPaths()
  return { success: true }
}

export async function rescheduleTask(taskId: string, newDate: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('tasks')
    .update({ due_date: newDate || null })
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateTaskPaths()
  return { success: true }
}

// Phase 11.E: Carry a task to tomorrow — mirrors Daily Shutdown "carry" behavior exactly.
// Tomorrow is computed in UTC (same as completeShutdown's getTomorrow) so the date string
// written to the DB is consistent regardless of which server action writes it.
export async function carryToTomorrow(taskId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const todayUTC = new Date().toISOString().split('T')[0]
  const d = new Date(todayUTC + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  const tomorrow = d.toISOString().split('T')[0]

  const { error } = await supabase
    .from('tasks')
    .update({ due_date: tomorrow })
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateTaskPaths()
  revalidatePath('/shutdown')
  return { success: true }
}

// Phase 15.C: object-based task creation for the Co-Pilot confirm flow.
// addTask takes FormData and is designed for the form UI — unsuitable for
// programmatic use. This accepts a plain object and shares the same DB insert.
export async function createTaskDirect(data: {
  title: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  estimated_minutes: number | null
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!data.title?.trim()) return { error: 'Task title is required' }
  if (!(['low', 'medium', 'high', 'urgent'] as const).includes(data.priority)) {
    return { error: 'Invalid priority' }
  }

  const { data: inserted, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: data.title.trim(),
      priority: data.priority,
      due_date: data.due_date || null,
      estimated_minutes: data.estimated_minutes || null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidateTaskPaths()
  return { success: true, taskId: inserted.id as string }
}

// Phase 15.C: batch reschedule for the Co-Pilot confirm flow.
// Single UPDATE ... WHERE id IN (...) instead of N sequential rescheduleTask calls.
// RLS ensures only the authenticated user's tasks are affected.
export async function rescheduleMultipleTasks(taskIds: string[], newDate: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!taskIds.length) return { error: 'No tasks specified' }

  const { error } = await supabase
    .from('tasks')
    .update({ due_date: newDate || null })
    .in('id', taskIds)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateTaskPaths()
  return { success: true }
}

// Phase 16.C: one-click cancel — sets status to cancelled and clears completed_at.
// Intentionally separate from deleteTask: cancelled tasks remain in the history
// and are visible in the Canceled section of the Tasks workspace.
export async function cancelTask(taskId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'cancelled', completed_at: null })
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateTaskPaths()
  return { success: true }
}

export async function toggleTaskStatus(taskId: string, currentStatus: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const isDone = currentStatus === 'done'
  const updates = isDone
    ? { status: 'todo', completed_at: null }
    : { status: 'done', completed_at: new Date().toISOString() }

  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  await logEvent(supabase, user.id, {
    event_type: isDone ? 'task_uncompleted' : 'task_completed',
    entity_type: 'task',
    entity_id: taskId,
  })

  revalidateTaskPaths()
  return { success: true }
}
