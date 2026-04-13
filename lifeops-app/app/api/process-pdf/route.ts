// Phase 15.B: PDF text extraction endpoint.
// Called by DocumentUploadDialog immediately after addDocument returns for PDF uploads.
//
// Flow:
//   1. Verify auth + ownership of the document record
//   2. Download the PDF from the vault storage bucket
//   3. Parse text with pdf-parse (pure-JS, serverless-safe)
//   4. Update documents.extracted_text + documents.parse_status
//   5. Re-embed the document with full text via after() (non-blocking)
//   6. Return { status: 'done' | 'no_text' | 'failed' }
//
// The file is NOT deleted on failure — the document row stays intact so the
// user still has their uploaded file even if parsing fails.

import { after }          from 'next/server'
import { revalidatePath }  from 'next/cache'
import { PDFParse } from 'pdf-parse'
import { createClient }    from '@/lib/supabase/server'
import { refreshDocumentEmbeddings } from '@/lib/actions/embeddings'

export const maxDuration = 30

const MAX_BYTES = 5 * 1024 * 1024  // 5 MB — server-side guard matches client validation

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  // ── Parse request body ────────────────────────────────────────────────────
  let documentId: string
  let filePath: string
  try {
    const body = await req.json()
    documentId = body.documentId
    filePath   = body.filePath
    if (!documentId || !filePath) throw new Error('missing fields')
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // ── Ownership check ───────────────────────────────────────────────────────
  // Belt-and-suspenders: storage RLS already blocks cross-user reads,
  // but we explicitly verify the document belongs to this user before writing.
  const { data: docRow, error: docErr } = await supabase
    .from('documents')
    .select('id, name')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single()

  if (docErr || !docRow) {
    return Response.json({ error: 'Document not found.' }, { status: 404 })
  }

  // ── Download from storage ─────────────────────────────────────────────────
  const { data: fileBlob, error: dlErr } = await supabase.storage
    .from('vault')
    .download(filePath)

  if (dlErr || !fileBlob) {
    await markFailed(supabase, documentId, user.id)
    return Response.json({ status: 'failed', error: 'Could not download file from storage.' })
  }

  // Server-side size guard
  if (fileBlob.size > MAX_BYTES) {
    await markFailed(supabase, documentId, user.id)
    return Response.json({ status: 'failed', error: 'File exceeds the 5 MB limit.' })
  }

  // ── Parse PDF ─────────────────────────────────────────────────────────────
  let extractedText = ''
  try {
    const arrayBuffer = await fileBlob.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)
    const parser      = new PDFParse({ data: buffer })
    const result      = await parser.getText()
    extractedText     = result.text?.trim() ?? ''
    await parser.destroy()
  } catch (err) {
    console.error('[process-pdf] pdf-parse error:', err instanceof Error ? err.message : err)
    await markFailed(supabase, documentId, user.id)
    return Response.json({ status: 'failed', error: 'Text extraction failed.' })
  }

  // ── Determine status ──────────────────────────────────────────────────────
  const parseStatus = extractedText.length > 0 ? 'done' : 'no_text'

  // ── Persist extracted text + status ──────────────────────────────────────
  const { error: updateErr } = await supabase
    .from('documents')
    .update({
      extracted_text: extractedText || null,
      parse_status:   parseStatus,
    })
    .eq('id', documentId)
    .eq('user_id', user.id)

  if (updateErr) {
    console.error('[process-pdf] DB update error:', updateErr.message)
    // File and document row are still intact; just couldn't save the text
    return Response.json({ status: 'failed', error: 'Could not save extracted text.' })
  }

  // ── Re-embed with full text — non-blocking ────────────────────────────────
  // Replaces the name-only embedding that addDocument created via after().
  const userId       = user.id
  const docName      = docRow.name as string
  const textForEmbed = parseStatus === 'done' ? extractedText : null
  after(async () => {
    await refreshDocumentEmbeddings(documentId, userId, docName, textForEmbed)
  })

  revalidatePath('/documents')
  revalidatePath('/dashboard')

  return Response.json({ status: parseStatus })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function markFailed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string,
  userId: string
) {
  await supabase
    .from('documents')
    .update({ parse_status: 'failed' })
    .eq('id', documentId)
    .eq('user_id', userId)
}
