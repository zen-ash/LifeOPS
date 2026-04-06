-- ================================================================
-- Phase 3A: Focus Sessions — additive column additions
-- Safe to run even if schema.sql already created the base table.
-- Run in: Supabase Dashboard > SQL Editor
-- ================================================================

-- 1. Create the table if it doesn't exist (no-op if schema.sql was run)
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id          UUID REFERENCES public.tasks(id)    ON DELETE SET NULL,
  type             TEXT DEFAULT 'pomodoro' CHECK (type IN ('pomodoro', 'free')),
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  completed        BOOLEAN DEFAULT FALSE,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  ended_at         TIMESTAMPTZ
);

-- 2. Add columns that the Phase 3A UI requires (all idempotent)
ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS project_id     UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS goal           TEXT,
  ADD COLUMN IF NOT EXISTS actual_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

-- 3. Enable RLS
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- 4. RLS policy
DROP POLICY IF EXISTS "Users can manage own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can manage own focus sessions"
  ON public.focus_sessions FOR ALL USING (auth.uid() = user_id);

-- 5. updated_at trigger
DROP TRIGGER IF EXISTS update_focus_sessions_updated_at ON public.focus_sessions;
CREATE TRIGGER update_focus_sessions_updated_at
  BEFORE UPDATE ON public.focus_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
