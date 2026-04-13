// Phase 13.C: Vault embedding helpers — NOT 'use server'.
// These are internal server-side utilities called from server actions and route handlers.
// They are never imported from client components.

import { embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'

// ── Text chunking ─────────────────────────────────────────────────────────────
// Splits a note into paragraph-level chunks, then breaks large paragraphs at
// sentence boundaries. Each chunk is <= MAX_CHARS characters. Max 15 chunks
// per note — more than enough for typical student notes.

const MAX_CHARS = 500
const MAX_CHUNKS = 15
// Phase 15.B: PDFs can be much longer than notes — allow up to 50 chunks
const MAX_PDF_CHUNKS = 50

function chunkText(text: string, maxChunks = MAX_CHUNKS): string[] {
  if (!text || !text.trim()) return []

  // Split on two or more blank lines (paragraph boundaries)
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20) // discard very short fragments

  const chunks: string[] = []

  for (const para of paragraphs) {
    if (chunks.length >= maxChunks) break

    if (para.length <= MAX_CHARS) {
      chunks.push(para)
    } else {
      // Split long paragraphs at sentence boundaries
      const sentences = para.match(/[^.!?]+[.!?]+\s*/g) ?? [para]
      let current = ''
      for (const sentence of sentences) {
        if (chunks.length >= maxChunks) break
        if ((current + sentence).length > MAX_CHARS && current) {
          chunks.push(current.trim())
          current = sentence
        } else {
          current += sentence
        }
      }
      if (current.trim() && chunks.length < maxChunks) {
        chunks.push(current.trim())
      }
    }
  }

  return chunks
}

// ── Note embedding refresh ────────────────────────────────────────────────────
// Called via after() in addNote/editNote. Always deletes old chunks first so
// the index stays in sync with the latest content.
// Wraps all work in try/catch so embedding failure never surfaces to the user.

export async function refreshNoteEmbeddings(
  noteId: string,
  userId: string,
  title: string,
  content: string | null
): Promise<void> {
  if (!process.env.OPENAI_API_KEY) return

  try {
    // Combine title + content so the title is also searchable
    const fullText = [title, content].filter(Boolean).join('\n\n')
    const chunks = chunkText(fullText)

    const supabase = await createClient()

    // Always delete old chunks before inserting new ones
    await supabase.from('vault_embeddings').delete().eq('note_id', noteId)

    if (chunks.length === 0) return

    // Batch-embed all chunks in a single API call
    const { embeddings } = await embedMany({
      model: openai.embedding('text-embedding-3-small'),
      values: chunks,
    })

    const rows = chunks.map((content, i) => ({
      user_id: userId,
      note_id: noteId,
      source_title: title,
      chunk_index: i,
      content,
      embedding: embeddings[i],
    }))

    await supabase.from('vault_embeddings').insert(rows)
  } catch (err) {
    // Log but never throw — embedding failure must not break the primary save
    console.error('[embeddings] refreshNoteEmbeddings failed:', err instanceof Error ? err.message : err)
  }
}

// ── Document embedding refresh ────────────────────────────────────────────────
// Phase 15.B: canonical document embedding function.
//
// If extractedText is provided and non-empty (PDF with readable text), chunks
// "name + \n\n + extractedText" using the higher MAX_PDF_CHUNKS limit so the
// full document content becomes searchable in Ask Vault.
//
// If extractedText is null/empty (image, txt/md, or pre-15.B doc), falls back
// to embedding just the name as a single chunk — same behaviour as the old
// refreshDocumentNameEmbedding. Fully backward-compatible.

export async function refreshDocumentEmbeddings(
  documentId: string,
  userId: string,
  name: string,
  extractedText: string | null
): Promise<void> {
  if (!process.env.OPENAI_API_KEY) return

  try {
    const supabase = await createClient()

    // Always delete old chunks so the index stays in sync
    await supabase.from('vault_embeddings').delete().eq('document_id', documentId)

    const trimmedName = name.trim()
    if (!trimmedName) return

    const hasText = !!extractedText?.trim()
    const fullText = hasText
      ? `${trimmedName}\n\n${extractedText!.trim()}`
      : trimmedName

    const chunks = hasText
      ? chunkText(fullText, MAX_PDF_CHUNKS)
      : [trimmedName]

    if (chunks.length === 0) return

    const { embeddings } = await embedMany({
      model: openai.embedding('text-embedding-3-small'),
      values: chunks,
    })

    const rows = chunks.map((content, i) => ({
      user_id: userId,
      document_id: documentId,
      source_title: trimmedName,
      chunk_index: i,
      content,
      embedding: embeddings[i],
    }))

    await supabase.from('vault_embeddings').insert(rows)
  } catch (err) {
    console.error('[embeddings] refreshDocumentEmbeddings failed:', err instanceof Error ? err.message : err)
  }
}

// ── Document name embedding refresh (legacy) ─────────────────────────────────
// Kept for any call sites that haven't been migrated yet.
// New code should call refreshDocumentEmbeddings instead.

export async function refreshDocumentNameEmbedding(
  documentId: string,
  userId: string,
  name: string
): Promise<void> {
  return refreshDocumentEmbeddings(documentId, userId, name, null)
}
