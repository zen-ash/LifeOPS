'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { refreshDocumentEmbeddings } from '@/lib/actions/embeddings'

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
  // Phase 15.B: PDFs are inserted with 'pending'; all others default to 'none'
  parse_status?: 'none' | 'pending'
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
      parse_status: data.parse_status ?? 'none',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Phase 13.C / 15.B: embed the document name post-response — non-blocking.
  // For PDFs, /api/process-pdf will re-call refreshDocumentEmbeddings with
  // the extracted text once parsing completes, replacing the name-only chunks.
  const documentId = inserted.id as string
  const userId = user.id
  const nameVal = data.name.trim() || 'Untitled'
  after(async () => {
    await refreshDocumentEmbeddings(documentId, userId, nameVal, null)
  })

  revalidateDocumentPaths()
  return { success: true, documentId }
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

  // Phase 15.B: fetch extracted_text BEFORE updating so a rename never wipes
  // full-content embeddings back to name-only for an already-parsed PDF.
  const { data: current } = await supabase
    .from('documents')
    .select('extracted_text')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase
    .from('documents')
    .update({
      name: data.name.trim() || 'Untitled',
      project_id: data.project_id || null,
    })
    .eq('id', documentId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  const userId = user.id
  const nameVal = data.name.trim() || 'Untitled'
  const extractedTextVal = current?.extracted_text ?? null
  after(async () => {
    await refreshDocumentEmbeddings(documentId, userId, nameVal, extractedTextVal)
  })

  revalidateDocumentPaths()
  return { success: true }
}

export async function deleteDocument(documentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch the document to get file_path + file_type for storage deletion
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('file_path, file_type')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !doc) return { error: 'Document not found' }

  // Phase 15.A: route to correct bucket.
  // text/* files (txt, md) were uploaded to vault_media; everything else uses vault.
  const bucket = (doc.file_type ?? '').startsWith('text/') ? 'vault_media' : 'vault'

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(bucket)
    .remove([doc.file_path])

  if (storageError) return { error: storageError.message }

  // Delete from database — vault_embeddings.document_id ON DELETE CASCADE
  // ensures embedding chunks are removed automatically
  const { error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('user_id', user.id)

  if (dbError) return { error: dbError.message }

  revalidateDocumentPaths()
  return { success: true }
}
