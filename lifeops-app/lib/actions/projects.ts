'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const VALID_TYPES = ['project', 'area', 'client']
const VALID_STATUSES = ['active', 'completed', 'archived']

function revalidateProjectPaths() {
  revalidatePath('/dashboard')
  revalidatePath('/projects')
}

export async function addProject(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const color = (formData.get('color') as string) || '#6366f1'
  const type = (formData.get('type') as string) || 'project'

  if (!name?.trim()) return { error: 'Project name is required' }
  if (!VALID_TYPES.includes(type)) return { error: 'Invalid type' }

  const { error } = await supabase.from('projects').insert({
    user_id: user.id,
    name: name.trim(),
    description: description?.trim() || null,
    color,
    type,
  })

  if (error) return { error: error.message }

  revalidateProjectPaths()
  return { success: true }
}

export async function editProject(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const color = (formData.get('color') as string) || '#6366f1'
  const type = (formData.get('type') as string) || 'project'
  const status = (formData.get('status') as string) || 'active'

  if (!name?.trim()) return { error: 'Project name is required' }
  if (!VALID_TYPES.includes(type)) return { error: 'Invalid type' }
  if (!VALID_STATUSES.includes(status)) return { error: 'Invalid status' }

  const { error } = await supabase
    .from('projects')
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      color,
      type,
      status,
    })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateProjectPaths()
  return { success: true }
}

export async function updateProjectStatus(
  projectId: string,
  status: 'active' | 'completed' | 'archived'
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }
  if (!VALID_STATUSES.includes(status)) return { error: 'Invalid status' }

  const { error } = await supabase
    .from('projects')
    .update({ status })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateProjectPaths()
  return { success: true }
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateProjectPaths()
  return { success: true }
}

// ── Types for the Project Hub ────────────────────────────────────────────────

export type HubTask = {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
}

export type HubDocument = {
  id: string
  name: string
  file_type: string | null
  file_size: number | null
  parse_status: string
  created_at: string
}

export type HubNote = {
  id: string
  title: string
  is_pinned: boolean
  updated_at: string
}

export type ProjectHubData = {
  tasks: HubTask[]
  documents: HubDocument[]
  notes: HubNote[]
}

// Lazily fetched when a specific project hub panel is opened.
// Only fetches tasks / documents / notes — tags are already loaded on the
// initial page load via tagsByProjectId and passed as initialTags.
export async function getProjectHubData(
  projectId: string
): Promise<{ data?: ProjectHubData; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const [{ data: tasks }, { data: documents }, { data: notes }] =
    await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, status, priority, due_date')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('documents')
        .select('id, name, file_type, file_size, parse_status, created_at')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('notes')
        .select('id, title, is_pinned, updated_at')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .eq('type', 'note')
        .order('updated_at', { ascending: false })
        .limit(50),
    ])

  return {
    data: {
      tasks: (tasks ?? []) as HubTask[],
      documents: (documents ?? []) as HubDocument[],
      notes: (notes ?? []) as HubNote[],
    },
  }
}
