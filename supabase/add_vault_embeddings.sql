-- Phase 13.C: Chat with Your Vault — pgvector embeddings for notes/documents

-- ── 1. Enable pgvector extension ─────────────────────────────────────────────
-- Must be enabled in Supabase Dashboard → Extensions if it is not already on.
-- Running this here is safe (no-op if already enabled).
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 2. vault_embeddings table ────────────────────────────────────────────────
-- Stores text chunks + 1536-dim embeddings from user notes and documents.
-- note_id and document_id are explicit nullable FKs so cascade delete works
-- cleanly: deleting a note/document automatically removes its chunks.
-- Exactly one of note_id or document_id must be non-null (enforced by CHECK).

CREATE TABLE IF NOT EXISTS vault_embeddings (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id      uuid        REFERENCES notes(id)      ON DELETE CASCADE,
  document_id  uuid        REFERENCES documents(id)  ON DELETE CASCADE,
  source_title text        NOT NULL,
  chunk_index  int         NOT NULL DEFAULT 0,
  content      text        NOT NULL,
  embedding    vector(1536),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_vault_embedding_source
    CHECK (note_id IS NOT NULL OR document_id IS NOT NULL)
);

-- HNSW index — better than IVFFlat for small datasets (no minimum row requirement)
CREATE INDEX IF NOT EXISTS vault_embeddings_embedding_idx
  ON vault_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- Standard indexes for fast row-level cleanup
CREATE INDEX IF NOT EXISTS vault_embeddings_user_idx    ON vault_embeddings (user_id);
CREATE INDEX IF NOT EXISTS vault_embeddings_note_idx    ON vault_embeddings (note_id);
CREATE INDEX IF NOT EXISTS vault_embeddings_doc_idx     ON vault_embeddings (document_id);

ALTER TABLE vault_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own vault_embeddings"
  ON vault_embeddings FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 3. match_embeddings RPC ───────────────────────────────────────────────────
-- Performs cosine-similarity search against the authenticated user's chunks.
-- SECURITY DEFINER + auth.uid() means the caller CANNOT bypass user scoping
-- by supplying a fake user_id in the query parameters.
-- SET search_path includes extensions so the <=> vector operator is found.
-- Supabase installs pgvector in the extensions schema, not public.

CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  id           uuid,
  source_title text,
  chunk_index  int,
  content      text,
  similarity   float
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    id,
    source_title,
    chunk_index,
    content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM vault_embeddings
  WHERE user_id = auth.uid()
    AND embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
