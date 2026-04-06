-- ================================================================
-- Phase 2B-1: Ensure projects.type column exists
-- Safe to run even if schema.sql already added this column.
-- Run in: Supabase Dashboard > SQL Editor
-- ================================================================

-- 1. Add column if not already present (no-op if it exists)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'project';

-- 2. Backfill any rows where type is NULL (shouldn't exist, but just in case)
UPDATE public.projects SET type = 'project' WHERE type IS NULL;
