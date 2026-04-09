-- Phase 4C: Document Vault
-- Run this in the Supabase SQL Editor

-- ── 1. Add updated_at to documents ───────────────────────────────────
-- (The base table was created by schema.sql; this adds the missing column)

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing rows
UPDATE public.documents SET updated_at = created_at WHERE updated_at IS NULL;

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION update_documents_updated_at_fn()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_documents_updated_at_fn();

-- ── 2. Create vault storage bucket (private) ──────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('vault', 'vault', false)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Storage RLS policies ───────────────────────────────────────────
-- Policies apply to files under vault/<user_id>/...
-- The storage.objects.name field holds the path WITHIN the bucket.

-- Drop any stale policies first so this script is re-runnable
DROP POLICY IF EXISTS "vault: users upload to own folder"  ON storage.objects;
DROP POLICY IF EXISTS "vault: users read own files"        ON storage.objects;
DROP POLICY IF EXISTS "vault: users delete own files"      ON storage.objects;

-- INSERT: user can only upload into their own subfolder
CREATE POLICY "vault: users upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vault'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- SELECT: user can only read their own files (needed for signed URL generation)
CREATE POLICY "vault: users read own files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'vault'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- DELETE: user can only delete their own files
CREATE POLICY "vault: users delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'vault'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );
