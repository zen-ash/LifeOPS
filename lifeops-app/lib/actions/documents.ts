'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function revalidateDocumentPaths() {
  revalidatePath('/documents')
  revalidatePath('/dashboard')
}

export async function addDocument(data: {
  name: string
  file_path: string
  file_type: string
  file_size: number
  project_id: string | null
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: inserted, error } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      name: data.name.trim() || 'Untitled',
      file_path: data.file_path,
      file_type: data.file_type,
      file_size: data.file_size,
      project_id: data.project_id || null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidateDocumentPaths()
  return { success: true, documentId: inserted.id as string }
}

export async function editDocument(
  documentId: string,
  data: { name: string; project_id: string | null }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('documents')
    .update({
      name: data.name.trim() || 'Untitled',
      project_id: data.project_id || null,
    })
    .eq('id', documentId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateDocumentPaths()
  return { success: true }
}

export async function deleteDocument(documentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch the document to get file_path for storage deletion
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('file_path')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !doc) return { error: 'Document not found' }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('vault')
    .remove([doc.file_path])

  if (storageError) return { error: storageError.message }

  // Delete from database
  const { error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('user_id', user.id)

  if (dbError) return { error: dbError.message }

  revalidateDocumentPaths()
  return { success: true }
}
