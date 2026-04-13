-- Phase 14.A: Calendar Integration Foundation

-- ── 1. calendar_connections ───────────────────────────────────────────────
-- Stores Google OAuth tokens per user. Token handling is strictly server-side;
-- access_token and refresh_token are never sent to the browser.
-- UNIQUE on user_id: one Google Calendar connection per LifeOPS account.

CREATE TABLE IF NOT EXISTS calendar_connections (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  provider         text        NOT NULL DEFAULT 'google',
  access_token     text        NOT NULL,
  refresh_token    text,
  expires_at       timestamptz NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own calendar connection"
  ON calendar_connections FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 2. calendar_events ────────────────────────────────────────────────────
-- Read-only cache of synced Google Calendar events for the planner.
-- Refreshed on demand when the planner page loads (no background cron).
-- Unique constraint on (user_id, provider_event_id) for clean upserts.
-- Timestamps stored as UTC; day-of-week mapping happens at read time.

CREATE TABLE IF NOT EXISTS calendar_events (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_event_id text        NOT NULL,
  title             text        NOT NULL DEFAULT '',
  start_time        timestamptz NOT NULL,
  end_time          timestamptz NOT NULL,
  is_all_day        boolean     NOT NULL DEFAULT false,
  color             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_calendar_event UNIQUE (user_id, provider_event_id)
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access their own calendar events"
  ON calendar_events FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast window queries (planner fetches events by user + time range)
CREATE INDEX IF NOT EXISTS calendar_events_user_time_idx
  ON calendar_events (user_id, start_time);
