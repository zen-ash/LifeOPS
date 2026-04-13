-- ================================================================
-- Phase 16.A: Project Tagging
-- Run in: Supabase Dashboard > SQL Editor > New query
--
-- Additive only — no existing tables are modified.
-- Mirrors the exact pattern of task_tags, note_tags, document_tags
-- from Phase 5A (add_tags.sql).
-- ================================================================

-- Join: project ↔ tag
CREATE TABLE IF NOT EXISTS public.project_tags (
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  tag_id     UUID REFERENCES public.tags(id)      ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES auth.users(id)        ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (project_id, tag_id)
);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own project_tags"
  ON public.project_tags FOR ALL USING (auth.uid() = user_id);
