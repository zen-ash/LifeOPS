'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['todo', 'in_progress', 'done', 'cancelled']
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent']

function revalidateTaskPaths() {
  revalidatePath('/dashboard')
  revalidatePath('/tasks')
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

  const { error } = await supabase.from('tasks').insert({
    user_id: user.id,
    title: title.trim(),
    description: description?.trim() || null,
    priority,
    due_date: due_date || null,
    estimated_minutes: estimated_minutes ? parseInt(estimated_minutes as string) : null,
    project_id: project_id || null,
  })

  if (error) return { error: error.message }

  revalidateTaskPaths()
  return { success: true }
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

  revalidateTaskPaths()
  return { success: true }
}
