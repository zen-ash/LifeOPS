-- Phase 14.B: Two-Way Calendar Sync

-- ── 1. Add is_lifeops_managed to calendar_events ──────────────────────────
-- Marks events that LifeOPS itself pushed to Google Calendar.
-- Set to true during syncCalendarEvents when extendedProperties.private.lifeops_managed = "true".
-- Used to exclude LifeOPS-owned events from busyCalendarMinutes (prevents double-counting).

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS is_lifeops_managed boolean NOT NULL DEFAULT false;

-- ── 2. calendar_sync_mappings ─────────────────────────────────────────────
-- Tracks which LifeOPS planner focus blocks have been synced to Google Calendar.
-- (user_id, week_start, day_name, block_text) uniquely identifies a planner block.
-- provider_event_id stores the Google Calendar event ID so LifeOPS can patch/delete it.
--
-- Why block_text as identifier: planner focus blocks are not persisted as DB rows —
-- they live inside plan_json JSONB. Using block_text + day + week is the stable handle.
-- If the text changes during a rebuild, the old mapping is treated as stale and cleaned up.

CREATE TABLE IF NOT EXISTS calendar_sync_mappings (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start        text        NOT NULL,          -- ISO date "2024-01-15" (Monday of the week)
  day_name          text        NOT NULL,          -- "Monday" | "Tuesday" | ... | "Sunday"
  block_text        text        NOT NULL,          -- The focus block string from plan_json
  provider_event_id text        NOT NULL,          -- Google Calendar event ID
  provider_name     text        NOT NULL DEFAULT 'google',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_sync_mapping UNIQUE (user_id, week_start, day_name, block_text)
);

ALTER TABLE calendar_sync_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own sync mappings"
  ON calendar_sync_mappings FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast week-scoped lookups during sync
CREATE INDEX IF NOT EXISTS sync_mappings_user_week_idx
  ON calendar_sync_mappings (user_id, week_start);
