-- Phase 15.B: PDF text extraction
-- Run in Supabase SQL Editor after add_vault_media.sql

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS extracted_text TEXT,
  ADD COLUMN IF NOT EXISTS parse_status   TEXT NOT NULL DEFAULT 'none';

-- Valid parse_status values:
--   'none'    — not a parseable file type (image, etc.) or upload pre-dates Phase 15.B
--   'pending' — PDF accepted, extraction in progress
--   'done'    — text extracted and embedded successfully
--   'no_text' — PDF had no extractable text (scanned / image-only PDF)
--   'failed'  — extraction attempt failed (malformed, encrypted, etc.)

COMMENT ON COLUMN public.documents.extracted_text IS
  'Phase 15.B: raw text extracted from the PDF; NULL for non-PDF files';

COMMENT ON COLUMN public.documents.parse_status IS
  'Phase 15.B: PDF parsing state — none | pending | done | no_text | failed';
