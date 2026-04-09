'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function revalidateNotePaths() {
  revalidatePath('/notes')
  revalidatePath('/journal')
  revalidatePath('/dashboard')
}

export async function addNote(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const type = (formData.get('type') as string) || 'note'
  const project_id = (formData.get('project_id') as string) || null
  const is_pinned = formData.get('is_pinned') === 'true'

  if (!title?.trim()) return { error: 'Title is required' }
  if (!['note', 'journal'].includes(type)) return { error: 'Invalid type' }

  const { data: inserted, error } = await supabase
    .from('notes')
    .insert({
      user_id: user.id,
      title: title.trim(),
      content: content?.trim() || null,
      type,
      project_id: project_id || null,
      is_pinned,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidateNotePaths()
  return { success: true, noteId: inserted.id as string }
}

export async function editNote(noteId: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const project_id = (formData.get('project_id') as string) || null
  const is_pinned = formData.get('is_pinned') === 'true'

  if (!title?.trim()) return { error: 'Title is required' }

  const { error } = await supabase
    .from('notes')
    .update({
      title: title.trim(),
      content: content?.trim() || null,
      project_id: project_id || null,
      is_pinned,
    })
    .eq('id', noteId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateNotePaths()
  return { success: true }
}

export async function deleteNote(noteId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateNotePaths()
  return { success: true }
}

export async function togglePin(noteId: string, currentPinned: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('notes')
    .update({ is_pinned: !currentPinned })
    .eq('id', noteId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateNotePaths()
  return { success: true }
}
