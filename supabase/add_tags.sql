-- ================================================================
-- Phase 5A: Normalized Tagging System
-- Run in: Supabase Dashboard > SQL Editor > New query
--
-- Schema audit notes:
--   tasks.tags  TEXT[]  and  notes.tags  TEXT[]  already exist
--   from schema.sql but were NEVER written by any server action —
--   they are dead columns with no data.  They remain in place as
--   harmless dead weight; this system supersedes them entirely.
--   documents has no tags column at all.
-- ================================================================

-- Master tags table: one row per unique tag per user
CREATE TABLE IF NOT EXISTS public.tags (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Join: task ↔ tag
CREATE TABLE IF NOT EXISTS public.task_tags (
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  tag_id  UUID REFERENCES public.tags(id)  ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id)   ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (task_id, tag_id)
);

-- Join: note ↔ tag  (covers both notes and journal entries)
CREATE TABLE IF NOT EXISTS public.note_tags (
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  tag_id  UUID REFERENCES public.tags(id)  ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id)   ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (note_id, tag_id)
);

-- Join: document ↔ tag
CREATE TABLE IF NOT EXISTS public.document_tags (
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  tag_id      UUID REFERENCES public.tags(id)       ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id)         ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (document_id, tag_id)
);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.tags          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_tags     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tags"
  ON public.tags FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own task_tags"
  ON public.task_tags FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own note_tags"
  ON public.note_tags FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own document_tags"
  ON public.document_tags FOR ALL USING (auth.uid() = user_id);
