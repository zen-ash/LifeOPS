-- Phase 12.E: Habit Skip Logs
-- Records intentional rest days for habits. Distinct from:
--   habit_freeze_logs (streak protection)
--   habit_logs absence (simply missed — no log)
-- Skip = user consciously chose to rest for that day.

CREATE TABLE IF NOT EXISTS habit_skip_logs (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id    UUID    NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skip_date   DATE    NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(habit_id, skip_date)
);

CREATE INDEX IF NOT EXISTS idx_habit_skip_logs_user_date
  ON habit_skip_logs (user_id, skip_date DESC);

ALTER TABLE habit_skip_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own habit skip logs"
  ON habit_skip_logs
  FOR ALL
  USING (auth.uid() = user_id);
