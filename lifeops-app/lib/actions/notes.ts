'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { refreshNoteEmbeddings } from '@/lib/actions/embeddings'

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

  // Phase 13.C: refresh embeddings after the response is sent — non-blocking
  const noteId = inserted.id as string
  const userId = user.id
  const titleVal = title.trim()
  const contentVal = content?.trim() || null
  after(async () => {
    await refreshNoteEmbeddings(noteId, userId, titleVal, contentVal)
  })

  revalidateNotePaths()
  return { success: true, noteId }
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

  // Phase 13.C: refresh embeddings after the response is sent — non-blocking
  const userId = user.id
  const titleVal = title.trim()
  const contentVal = content?.trim() || null
  after(async () => {
    await refreshNoteEmbeddings(noteId, userId, titleVal, contentVal)
  })

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

  // Phase 13.C: vault_embeddings.note_id has ON DELETE CASCADE —
  // embedding chunks are cleaned up automatically, no extra code needed.

  revalidateNotePaths()
  return { success: true }
}

// Phase 15.A: Save a Voice Brain Dump transcript as a Note.
// Called from VoiceMemoDialog after /api/transcribe returns a transcript.
// The note title is auto-generated from today's date; the transcript is the content.
// Because it's a normal Note, the after() hook fires Phase 13.C embeddings automatically.
export async function saveTranscriptAsNote(
  transcript: string
): Promise<{ success?: boolean; noteId?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const content = transcript.trim()
  if (!content) return { error: 'Transcript is empty.' }

  const title = `Voice Memo — ${new Date().toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  })}`

  const { data: inserted, error } = await supabase
    .from('notes')
    .insert({
      user_id:   user.id,
      title,
      content,
      type:      'note',
      is_pinned: false,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const noteId  = inserted.id as string
  const userId  = user.id
  const titleV  = title
  const contentV = content
  after(async () => {
    await refreshNoteEmbeddings(noteId, userId, titleV, contentV)
  })

  revalidateNotePaths()
  return { success: true, noteId }
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
