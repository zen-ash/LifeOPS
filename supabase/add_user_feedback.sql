-- Phase 12.C: user_feedback table
-- Lightweight feedback capture — bug reports, feature ideas, general feedback.
-- INSERT-only for users (no read/update/delete policy needed for MVP).

create table if not exists user_feedback (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  feedback_type text        not null check (feedback_type in ('bug', 'feature', 'general')),
  message       text        not null,
  route         text        not null default '/',
  created_at    timestamptz not null default now()
);

alter table user_feedback enable row level security;

-- Users can only insert their own feedback rows
create policy "Users can insert own feedback"
  on user_feedback
  for insert
  with check (auth.uid() = user_id);

-- Index to support future admin queries by user or date
create index if not exists user_feedback_user_id_idx on user_feedback (user_id);
create index if not exists user_feedback_created_at_idx on user_feedback (created_at desc);
