-- Phase 11.B: Daily Shutdown
-- One record per user per calendar day. Upsert on (user_id, shutdown_date).
-- Stores completed-task snapshot, slipped decisions, tomorrow top 3, reflection, and energy.
-- This is the durable shutdown record. user_activity_logs gets the telemetry event.

CREATE TABLE IF NOT EXISTS daily_shutdowns (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shutdown_date     DATE        NOT NULL,
  completed_tasks   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  slipped_decisions JSONB       NOT NULL DEFAULT '[]'::jsonb,
  tomorrow_top3     JSONB       NOT NULL DEFAULT '[]'::jsonb,
  reflection        TEXT,
  energy            TEXT,
  focus_minutes     INTEGER     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, shutdown_date)
);

-- Fast lookup: most recent shutdown first (for weekly review, dashboard hook)
CREATE INDEX IF NOT EXISTS idx_daily_shutdowns_user_date
  ON daily_shutdowns (user_id, shutdown_date DESC);

ALTER TABLE daily_shutdowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own daily shutdowns"
  ON daily_shutdowns
  FOR ALL
  USING (auth.uid() = user_id);
