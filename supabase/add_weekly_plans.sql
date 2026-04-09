-- Phase 7B: AI Planner
-- Weekly plans table — one saved plan per user per week (upsert on re-save)

create table if not exists weekly_plans (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  week_start_date  date        not null,
  plan_json        jsonb       not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, week_start_date)
);

alter table weekly_plans enable row level security;

create policy "Users can manage their own weekly plans"
  on weekly_plans for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
