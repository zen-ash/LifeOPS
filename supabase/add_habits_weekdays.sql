-- ================================================================
-- Phase 3B refinement: Add selected_weekdays to habits
-- Idempotent — safe to run even if add_habits.sql was already run.
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ================================================================

-- Add selected_weekdays column (TEXT[]) for weekly habits.
-- Stores short day strings: 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'.
-- Daily habits keep this as '{}'. Weekly habits may store 0-7 values.
-- Existing habits are unaffected (default is empty array).
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS selected_weekdays TEXT[] DEFAULT '{}';
