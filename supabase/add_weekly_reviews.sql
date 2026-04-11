-- ================================================================
-- Phase 11.C: Weekly Review
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ================================================================

create table if not exists weekly_reviews (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  week_start   date        not null,
  week_end     date        not null,
  metrics_json jsonb       not null default '{}',
  ai_summary   jsonb,      -- { summary, topWin, topLearning, nextWeekFocus }
  reflection   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table weekly_reviews enable row level security;

create policy "Users can manage their own weekly reviews"
  on weekly_reviews for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_weekly_reviews_user_week
  on weekly_reviews (user_id, week_start desc);
