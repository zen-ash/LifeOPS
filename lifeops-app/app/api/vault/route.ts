// Phase 13.C: Ask-Vault API — RAG over the user's notes and documents.
// Embeds the query, retrieves top matching chunks via match_embeddings RPC,
// builds a grounded prompt, and returns the AI answer + source citations.

import { generateText, embed } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

interface EmbeddingChunk {
  id: string
  source_title: string
  chunk_index: number
  content: string
  similarity: number
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: 'OPENAI_API_KEY is not configured on this server.' },
      { status: 500 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const query: string = typeof body.query === 'string' ? body.query.trim() : ''

  if (!query) {
    return Response.json({ error: 'query is required' }, { status: 400 })
  }

  // ── 1. Embed the query ─────────────────────────────────────────────────────
  let queryEmbedding: number[]
  try {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: query,
    })
    queryEmbedding = embedding
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Embedding failed'
    console.error('[/api/vault] embed error:', message)
    return Response.json({ error: 'Could not process your question. Please try again.' }, { status: 500 })
  }

  // ── 2. Retrieve top chunks via RPC ─────────────────────────────────────────
  // match_embeddings is SECURITY DEFINER and uses auth.uid() internally —
  // the user cannot retrieve another user's chunks even if they forge the call.
  const { data: rawChunks, error: rpcError } = await supabase.rpc('match_embeddings', {
    query_embedding: queryEmbedding,
    match_count: 6,
  })

  if (rpcError) {
    console.error('[/api/vault] match_embeddings RPC error:', rpcError.message)
    return Response.json({ error: 'Search failed. Please try again.' }, { status: 500 })
  }

  const chunks = (rawChunks ?? []) as EmbeddingChunk[]

  // ── 3. No matching content ─────────────────────────────────────────────────
  // Filter to only high-enough similarity chunks (cosine similarity > 0.3)
  const relevantChunks = chunks.filter((c) => c.similarity > 0.3)

  if (relevantChunks.length === 0) {
    return Response.json({
      answer: "I don't have this in your notes.",
      sources: [],
    })
  }

  // ── 4. Build grounded prompt ───────────────────────────────────────────────
  const context = relevantChunks
    .map((c, i) => `[Source ${i + 1}: "${c.source_title}"]\n${c.content}`)
    .join('\n\n---\n\n')

  const systemPrompt = `You are a personal knowledge assistant for a student using LifeOPS.
Your only job is to answer questions based strictly on the notes and documents provided below.

Rules:
- Answer ONLY from the provided context. Do not use any outside knowledge.
- If the context does not contain enough information to answer, say exactly: "I don't have this in your notes."
- Keep answers concise and factual — bullet points where appropriate.
- When you use information from a source, naturally reference it by name, e.g. "(from: Note Title)".
- Do not invent, extrapolate, or speculate beyond what the context says.`

  const userPrompt = `## Your Notes (retrieved context)

${context}

## Question

${query}`

  // ── 5. Generate grounded answer ────────────────────────────────────────────
  let answer: string
  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt: userPrompt,
    })
    answer = text
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/vault] generateText error:', message)
    return Response.json({ error: 'Could not generate an answer. Please try again.' }, { status: 500 })
  }

  // ── 6. Deduplicate source titles for citation display ──────────────────────
  const sources = [...new Set(relevantChunks.map((c) => c.source_title))]

  return Response.json({ answer, sources })
}
