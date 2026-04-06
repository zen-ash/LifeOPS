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
