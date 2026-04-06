-- ================================================================
-- Phase 2A: Onboarding columns — additive, safe to run on existing DB
-- Run in: Supabase Dashboard > SQL Editor
-- ================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_onboarded          BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS goals                 TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS study_hours_per_week  INTEGER,
  ADD COLUMN IF NOT EXISTS priorities            TEXT[]   DEFAULT '{}';

-- Note: timezone, work_hours_start, work_hours_end already exist from Phase 1.
-- Nothing is dropped or renamed.
