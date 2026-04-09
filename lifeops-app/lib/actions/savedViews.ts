'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { SavedViewEntityType } from '@/types'

function revalidateForEntity(entityType: SavedViewEntityType) {
  if (entityType === 'tasks')     revalidatePath('/tasks')
  if (entityType === 'notes')     revalidatePath('/notes')
  if (entityType === 'journal')   revalidatePath('/journal')
  if (entityType === 'documents') revalidatePath('/documents')
}

export async function createSavedView(
  name: string,
  entityType: SavedViewEntityType,
  filtersJson: Record<string, unknown>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!name.trim()) return { error: 'Name is required' }

  const { error } = await supabase
    .from('saved_views')
    .insert({
      user_id: user.id,
      name: name.trim(),
      entity_type: entityType,
      filters_json: filtersJson,
    })

  if (error) return { error: error.message }

  revalidateForEntity(entityType)
  return { success: true }
}

export async function deleteSavedView(
  viewId: string,
  entityType: SavedViewEntityType
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('saved_views')
    .delete()
    .eq('id', viewId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateForEntity(entityType)
  return { success: true }
}

export async function renameSavedView(
  viewId: string,
  newName: string,
  entityType: SavedViewEntityType
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!newName.trim()) return { error: 'Name is required' }

  const { error } = await supabase
    .from('saved_views')
    .update({ name: newName.trim(), updated_at: new Date().toISOString() })
    .eq('id', viewId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateForEntity(entityType)
  return { success: true }
}
