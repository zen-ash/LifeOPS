'use server'

// Phase 13.B: Vault Linking — server actions for note↔task and document↔task links.
// Unlinking removes only the junction row; the underlying note/document/task is untouched.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ── Note ↔ Task ──────────────────────────────────────────────────────────────

export async function linkNoteToTask(noteId: string, taskId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('note_task_links')
    .insert({ user_id: user.id, note_id: noteId, task_id: taskId })

  if (error) return { error: error.message }
  revalidatePath('/notes')
  return { success: true }
}

export async function unlinkNoteFromTask(noteId: string, taskId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('note_task_links')
    .delete()
    .eq('user_id', user.id)
    .eq('note_id', noteId)
    .eq('task_id', taskId)

  if (error) return { error: error.message }
  revalidatePath('/notes')
  return { success: true }
}

// ── Document ↔ Task ──────────────────────────────────────────────────────────

export async function linkDocumentToTask(documentId: string, taskId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('document_task_links')
    .insert({ user_id: user.id, document_id: documentId, task_id: taskId })

  if (error) return { error: error.message }
  revalidatePath('/documents')
  return { success: true }
}

export async function unlinkDocumentFromTask(documentId: string, taskId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('document_task_links')
    .delete()
    .eq('user_id', user.id)
    .eq('document_id', documentId)
    .eq('task_id', taskId)

  if (error) return { error: error.message }
  revalidatePath('/documents')
  return { success: true }
}
