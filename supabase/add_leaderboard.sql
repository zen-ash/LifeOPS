-- ================================================================
-- Phase 6B: Leaderboard
-- Run this in Supabase Dashboard → SQL Editor
-- ================================================================

-- get_weekly_leaderboard(p_timezone)
--
-- Returns one row per participant (the caller + their accepted buddies)
-- aggregated over the current Monday-based calendar week in p_timezone.
--
-- Scoring formula (simple and explainable):
--   score = focus_minutes + (completed_tasks * 20) + (habit_completions * 10)
--
-- Tie-breaking (deterministic):
--   1. score DESC
--   2. focus_minutes DESC
--   3. completed_tasks DESC
--   4. display_name ASC
--
-- SECURITY DEFINER: runs as the function owner (postgres role), which can
-- read all tables regardless of RLS. Only the calling user's buddy group
-- is included — no raw rows are returned, only safe aggregates.
--
-- p_timezone: IANA timezone string (e.g. 'America/New_York', 'UTC').
-- Defaults to 'UTC'. Used to determine the Monday boundary of the current week.

CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(p_timezone TEXT DEFAULT 'UTC')
RETURNS TABLE(
  user_id           UUID,
  display_name      TEXT,
  focus_minutes     INT,
  completed_tasks   INT,
  habit_completions INT,
  score             INT,
  rank              INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller         UUID := auth.uid();
  v_week_start     TIMESTAMPTZ;
  v_week_start_date DATE;
BEGIN
  -- Monday 00:00 in the caller's timezone, expressed as a UTC TIMESTAMPTZ.
  -- date_trunc('week', ...) is ISO-8601: week starts on Monday.
  v_week_start      := (date_trunc('week', NOW() AT TIME ZONE p_timezone)) AT TIME ZONE p_timezone;
  v_week_start_date := (date_trunc('week', NOW() AT TIME ZONE p_timezone))::date;

  RETURN QUERY
  WITH

  -- 1. Build the participant set: caller + accepted buddies
  participants AS (
    SELECT v_caller AS uid
    UNION
    SELECT
      CASE
        WHEN requester_user_id = v_caller THEN addressee_user_id
        ELSE requester_user_id
      END AS uid
    FROM public.study_buddies
    WHERE (requester_user_id = v_caller OR addressee_user_id = v_caller)
      AND status = 'accepted'
  ),

  -- 2. Focus minutes this week
  --    Sum COALESCE(actual_minutes, duration_minutes) for all sessions
  --    started on or after the week boundary (consistent with dashboard stats).
  focus_agg AS (
    SELECT
      fs.user_id,
      COALESCE(SUM(COALESCE(fs.actual_minutes, fs.duration_minutes)), 0)::INT AS focus_minutes
    FROM public.focus_sessions fs
    INNER JOIN participants p ON fs.user_id = p.uid
    WHERE fs.started_at >= v_week_start
    GROUP BY fs.user_id
  ),

  -- 3. Completed tasks this week
  --    Tasks where status = 'done' AND completed_at falls in this week.
  tasks_agg AS (
    SELECT
      t.user_id,
      COUNT(*)::INT AS completed_tasks
    FROM public.tasks t
    INNER JOIN participants p ON t.user_id = p.uid
    WHERE t.status = 'done'
      AND t.completed_at >= v_week_start
    GROUP BY t.user_id
  ),

  -- 4. Habit completions this week
  --    habit_logs.logged_date is a DATE; compare to the local-date week start.
  habits_agg AS (
    SELECT
      hl.user_id,
      COUNT(*)::INT AS habit_completions
    FROM public.habit_logs hl
    INNER JOIN participants p ON hl.user_id = p.uid
    WHERE hl.logged_date >= v_week_start_date
    GROUP BY hl.user_id
  ),

  -- 5. Combine and compute score
  combined AS (
    SELECT
      p.uid                                                               AS user_id,
      COALESCE(pr.full_name, pr.email, 'Unknown')::TEXT                  AS display_name,
      COALESCE(fa.focus_minutes,    0)                                    AS focus_minutes,
      COALESCE(ta.completed_tasks,  0)                                    AS completed_tasks,
      COALESCE(ha.habit_completions,0)                                    AS habit_completions,
      (
        COALESCE(fa.focus_minutes,    0)
        + COALESCE(ta.completed_tasks,  0) * 20
        + COALESCE(ha.habit_completions,0) * 10
      )                                                                   AS score
    FROM participants p
    LEFT JOIN public.profiles  pr ON pr.id = p.uid
    LEFT JOIN focus_agg        fa ON fa.user_id = p.uid
    LEFT JOIN tasks_agg        ta ON ta.user_id = p.uid
    LEFT JOIN habits_agg       ha ON ha.user_id = p.uid
  )

  -- 6. Rank and return
  SELECT
    c.user_id,
    c.display_name,
    c.focus_minutes,
    c.completed_tasks,
    c.habit_completions,
    c.score,
    ROW_NUMBER() OVER (
      ORDER BY c.score DESC, c.focus_minutes DESC, c.completed_tasks DESC, c.display_name ASC
    )::INT AS rank
  FROM combined c
  ORDER BY rank;
END;
$$;

-- Grant execute to authenticated users only.
GRANT    EXECUTE ON FUNCTION public.get_weekly_leaderboard(TEXT) TO authenticated;
REVOKE   EXECUTE ON FUNCTION public.get_weekly_leaderboard(TEXT) FROM anon;
