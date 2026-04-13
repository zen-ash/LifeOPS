-- Phase 15.A: vault_media Storage Bucket
--
-- Creates a private Supabase Storage bucket for user-uploaded text files (.txt, .md)
-- and image files (for reference/display, not OCR — that is Phase 15.B).
--
-- Separate from the existing `vault` bucket (PDFs + legacy images) so the two
-- concerns are cleanly isolated. The app routes uploads based on file_type:
--   text/* → vault_media
--   everything else → vault (unchanged)
--
-- Voice audio is NOT stored; it is transcribed by Whisper and then discarded.

-- ── 1. Bucket ────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vault_media',
  'vault_media',
  false,        -- private: never publicly accessible
  10485760,     -- 10 MB per file (generous for text; in practice txt/md are tiny)
  ARRAY[
    'text/plain',
    'text/markdown',
    'text/x-markdown',   -- some browsers report .md as this
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Storage RLS policies ──────────────────────────────────────────────────
-- Path convention: {user_id}/{timestamp}-{sanitized_filename}
-- The first path segment must match auth.uid() for all operations.
-- Mirrors the identical pattern used for the existing `vault` bucket.

CREATE POLICY "vault_media: users upload own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vault_media'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "vault_media: users read own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'vault_media'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "vault_media: users delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vault_media'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );
