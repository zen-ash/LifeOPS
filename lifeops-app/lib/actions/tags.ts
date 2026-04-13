'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Deterministic color from a fixed palette based on tag name
const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#14b8a6',
]

function tagColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

// Internal helper: resolve tag names → IDs, creating tags that don't exist yet.
// Not exported — only the setXTags actions below are callable from the client.
async function resolveTagIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tagNames: string[]
): Promise<string[]> {
  const unique = [...new Set(tagNames.map((n) => n.trim().toLowerCase()).filter(Boolean))]
  const ids: string[] = []

  for (const name of unique) {
    // Get-or-create: select first to avoid UPDATE churn on upsert
    const { data: existing } = await supabase
      .from('tags')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name)
      .maybeSingle()

    if (existing) {
      ids.push(existing.id as string)
      continue
    }

    const { data: created } = await supabase
      .from('tags')
      .insert({ user_id: userId, name, color: tagColor(name) })
      .select('id')
      .single()

    // If insert fails (race-condition duplicate), try select again
    if (!created) {
      const { data: retry } = await supabase
        .from('tags')
        .select('id')
        .eq('user_id', userId)
        .eq('name', name)
        .maybeSingle()
      if (retry) ids.push(retry.id as string)
    } else {
      ids.push(created.id as string)
    }
  }

  return ids
}

// Replace all tag associations for a task
export async function setTaskTags(taskId: string, tagNames: string[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const tagIds = await resolveTagIds(supabase, user.id, tagNames)

  await supabase
    .from('task_tags')
    .delete()
    .eq('task_id', taskId)
    .eq('user_id', user.id)

  if (tagIds.length > 0) {
    const { error } = await supabase
      .from('task_tags')
      .insert(tagIds.map((tag_id) => ({ task_id: taskId, tag_id, user_id: user.id })))
    if (error) return { error: error.message }
  }

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { success: true }
}

// Replace all tag associations for a note (or journal entry)
export async function setNoteTags(noteId: string, tagNames: string[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const tagIds = await resolveTagIds(supabase, user.id, tagNames)

  await supabase
    .from('note_tags')
    .delete()
    .eq('note_id', noteId)
    .eq('user_id', user.id)

  if (tagIds.length > 0) {
    const { error } = await supabase
      .from('note_tags')
      .insert(tagIds.map((tag_id) => ({ note_id: noteId, tag_id, user_id: user.id })))
    if (error) return { error: error.message }
  }

  revalidatePath('/notes')
  revalidatePath('/journal')
  revalidatePath('/dashboard')
  return { success: true }
}

// Replace all tag associations for a document
export async function setDocumentTags(documentId: string, tagNames: string[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const tagIds = await resolveTagIds(supabase, user.id, tagNames)

  await supabase
    .from('document_tags')
    .delete()
    .eq('document_id', documentId)
    .eq('user_id', user.id)

  if (tagIds.length > 0) {
    const { error } = await supabase
      .from('document_tags')
      .insert(tagIds.map((tag_id) => ({ document_id: documentId, tag_id, user_id: user.id })))
    if (error) return { error: error.message }
  }

  revalidatePath('/documents')
  revalidatePath('/dashboard')
  return { success: true }
}

// Replace all tag associations for a project
export async function setProjectTags(projectId: string, tagNames: string[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const tagIds = await resolveTagIds(supabase, user.id, tagNames)

  await supabase
    .from('project_tags')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', user.id)

  if (tagIds.length > 0) {
    const { error } = await supabase
      .from('project_tags')
      .insert(tagIds.map((tag_id) => ({ project_id: projectId, tag_id, user_id: user.id })))
    if (error) return { error: error.message }
  }

  revalidatePath('/projects')
  return { success: true }
}
