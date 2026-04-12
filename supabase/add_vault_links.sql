-- Phase 13.B: Vault Linking
-- Dedicated junction tables for note↔task and document↔task links.
-- Notes and documents already have a project_id FK (project linking exists).
-- These tables add many-to-many task linking without altering core entity tables.

create table if not exists note_task_links (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  note_id    uuid        not null references notes(id)      on delete cascade,
  task_id    uuid        not null references tasks(id)      on delete cascade,
  created_at timestamptz not null default now(),
  unique (note_id, task_id)
);

alter table note_task_links enable row level security;

create policy "Users manage their own note_task_links"
  on note_task_links for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists document_task_links (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  document_id uuid        not null references documents(id)  on delete cascade,
  task_id     uuid        not null references tasks(id)      on delete cascade,
  created_at  timestamptz not null default now(),
  unique (document_id, task_id)
);

alter table document_task_links enable row level security;

create policy "Users manage their own document_task_links"
  on document_task_links for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
