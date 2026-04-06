-- ================================================================
-- Phase 2B-2: Tasks table (idempotent — safe to run even if schema.sql was run)
-- Run in: Supabase Dashboard > SQL Editor
-- ================================================================

-- 1. Create table if not exists (no-op if schema.sql already ran)
CREATE TABLE IF NOT EXISTS public.tasks (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id        UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  status            TEXT DEFAULT 'todo'   CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  priority          TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date          DATE,
  tags              TEXT[] DEFAULT '{}',
  estimated_minutes INTEGER,
  actual_minutes    INTEGER,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. RLS policy (drop and recreate for idempotency)
DROP POLICY IF EXISTS "Users can manage own tasks" ON public.tasks;
CREATE POLICY "Users can manage own tasks"
  ON public.tasks FOR ALL USING (auth.uid() = user_id);

-- 4. updated_at trigger (drop and recreate for idempotency)
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
