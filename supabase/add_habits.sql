-- ================================================================
-- Phase 3B: Habit Tracker
-- Idempotent — safe to run even if schema.sql was already run.
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ================================================================

-- 1. Rename 'name' → 'title' on habits table (schema.sql used 'name')
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'habits'
      AND column_name  = 'name'
  ) THEN
    ALTER TABLE public.habits RENAME COLUMN name TO title;
  END IF;
END $$;

-- 2. Ensure title column exists (handles fresh-table case)
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';

-- 3. Add new columns required by Phase 3B
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS target_days_per_week INTEGER,
  ADD COLUMN IF NOT EXISTS linked_project_id    UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ DEFAULT NOW();

-- 4. Add updated_at trigger for habits
--    update_updated_at_column() already exists from schema.sql
DROP TRIGGER IF EXISTS update_habits_updated_at ON public.habits;
CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Guarantee RLS is enabled
ALTER TABLE public.habits    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

-- 6. Ensure RLS policies exist (schema.sql may have already created them)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'habits'
      AND policyname = 'Users can manage own habits'
  ) THEN
    CREATE POLICY "Users can manage own habits"
      ON public.habits FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'habit_logs'
      AND policyname = 'Users can manage own habit logs'
  ) THEN
    CREATE POLICY "Users can manage own habit logs"
      ON public.habit_logs FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 7. Guarantee the duplicate-prevention constraint on habit_logs
--    (schema.sql already has UNIQUE(habit_id, logged_date), but be safe)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid  = 'public.habit_logs'::regclass
      AND contype   = 'u'
      AND conname   = 'habit_logs_habit_id_logged_date_key'
  ) THEN
    ALTER TABLE public.habit_logs
      ADD CONSTRAINT habit_logs_habit_id_logged_date_key
      UNIQUE (habit_id, logged_date);
  END IF;
END $$;
