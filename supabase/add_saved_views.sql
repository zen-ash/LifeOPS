-- ================================================================
-- Phase 5B: Saved Views
-- Run in: Supabase Dashboard > SQL Editor > New query
--
-- One row per named filter preset per user per entity type.
-- filters_json stores a plain JSONB object whose shape varies by
-- entity_type (see types/index.ts — TaskViewFilters etc.).
--
-- entity_type CHECK includes 'journal' so Notes and Journal pages
-- can each maintain independent saved-view lists.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.saved_views (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name         TEXT        NOT NULL,
  entity_type  TEXT        NOT NULL
                           CHECK (entity_type IN ('tasks', 'notes', 'journal', 'documents')),
  filters_json JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved_views"
  ON public.saved_views FOR ALL USING (auth.uid() = user_id);
