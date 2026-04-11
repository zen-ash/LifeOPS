-- Phase 11.A: Activity Log Foundation
-- Append-only telemetry table. NOT the source of truth for any product state.
-- Core tables (tasks, habits, focus_sessions, etc.) remain the source of truth.
-- This table feeds: Daily Shutdown, Weekly Review, analytics, and replanning intelligence.

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload     JSONB
);

-- Fast per-user time-ordered queries (daily shutdown, weekly review)
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_time
  ON user_activity_logs (user_id, occurred_at DESC);

-- Fast per-user event-type filtering (e.g. fetch only focus_session_completed this week)
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_event
  ON user_activity_logs (user_id, event_type);

ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own activity logs"
  ON user_activity_logs
  FOR ALL
  USING (auth.uid() = user_id);
