-- ================================================================
-- Phase 2A Fix: RLS + explicit timezone column
-- Safe to run on existing database — all operations are idempotent.
-- Run in: Supabase Dashboard > SQL Editor
-- ================================================================

-- 1. Ensure timezone column exists (already added by schema.sql, but safe to repeat)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- 2. Rebuild the UPDATE policy with explicit WITH CHECK.
--    The old policy (USING only) works but WITH CHECK is best practice:
--    - USING  → which existing rows can be targeted
--    - WITH CHECK → what the updated row must look like after the write
--    Together they ensure a user can only update their own row
--    and cannot change the id to someone else's.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING     (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Verify all three profile policies exist:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'profiles';
