-- Phase 3C: Streak Protection + Recovery
-- Run this in the Supabase SQL Editor

-- 1. Add freeze / grace columns to habits
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS freeze_days_available INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS grace_window_hours    INTEGER NOT NULL DEFAULT 2;

-- 2. Create habit_freeze_logs table
CREATE TABLE IF NOT EXISTS public.habit_freeze_logs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id    UUID        NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  freeze_date DATE        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (habit_id, freeze_date)
);

-- 3. Enable RLS on habit_freeze_logs
ALTER TABLE public.habit_freeze_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own habit freeze logs" ON public.habit_freeze_logs;
CREATE POLICY "Users can manage own habit freeze logs"
  ON public.habit_freeze_logs
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
