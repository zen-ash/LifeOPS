# LifeOPS — Project State
_Last updated: Phase 6B complete (Leaderboard) — next: Phase 7A (AI Assistant)_

---

## Project Overview

**LifeOPS** is an undergraduate university student productivity web app.
It is a multi-phase project being built incrementally, one phase at a time.

**Goal:** A single app that replaces scattered tools — tasks, habits, focus timer, notes, document vault, AI planner, study buddy.

### Exact Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15, App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v3 + shadcn/ui (Radix primitives, hand-written) |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL |
| File storage | Supabase Storage (`vault` private bucket — active since Phase 4C) |
| Theme | next-themes (dark/light/system) |
| Deployment target | Vercel |
| Package manager | npm |
| React version | 19 |

---

## Current File Tree

```
Soft Eng Proj/                          ← project root
├── CLAUDE.md                           ← persistent project rules for Claude
├── PROJECT_STATE.md                    ← this file (read at start of every session)
├── NEXT_CHAT_PROMPT.md                 ← re-entry prompt for next session
├── SESSION_HANDOFF.md                  ← handoff notes for latest session
│
├── supabase/
│   ├── schema.sql                      ← full base schema (run once on setup)
│   ├── add_onboarding_columns.sql      ← Phase 2A
│   ├── fix_rls_and_timezone.sql        ← Phase 2A RLS fix
│   ├── add_project_type.sql            ← Phase 2B-1
│   ├── add_tasks.sql                   ← Phase 2B-2
│   ├── add_focus_sessions.sql          ← Phase 3A
│   ├── add_habits.sql                  ← Phase 3B
│   ├── add_habits_weekdays.sql         ← Phase 3B refinement
│   ├── add_streak_protection.sql       ← Phase 3C
│   ├── add_vault.sql                   ← Phase 4C
│   ├── add_tags.sql                    ← Phase 5A
│   ├── add_saved_views.sql             ← Phase 5B
│   ├── add_study_buddy.sql            ← Phase 6A
│   └── add_leaderboard.sql            ← Phase 6B
│
├── extension/
│   └── README.md                       ← placeholder only, Phase 8
│
└── lifeops-app/                        ← Next.js 15 application
    ├── package.json
    ├── tsconfig.json                   ← includes "target": "ES2017"
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── middleware.ts                   ← auth route protection only
    ├── .env.local                      ← not committed; NEXT_PUBLIC_SUPABASE_URL + ANON_KEY
    │
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx                  ← root layout, ThemeProvider
    │   ├── providers.tsx
    │   ├── page.tsx                    ← landing page (public)
    │   ├── auth/
    │   │   ├── login/page.tsx
    │   │   ├── register/page.tsx
    │   │   └── callback/route.ts
    │   ├── onboarding/
    │   │   ├── page.tsx
    │   │   └── OnboardingWizard.tsx
    │   └── (dashboard)/               ← ALL protected pages; layout is auth guard
    │       ├── layout.tsx
    │       ├── dashboard/page.tsx
    │       ├── projects/page.tsx
    │       ├── tasks/page.tsx
    │       ├── focus/page.tsx
    │       ├── habits/page.tsx
    │       ├── calendar/page.tsx
    │       ├── notes/page.tsx
    │       ├── journal/page.tsx
    │       ├── documents/page.tsx
    │       ├── study-buddy/page.tsx
    │       └── leaderboard/page.tsx
    │
    ├── components/
    │   ├── ThemeToggle.tsx
    │   ├── layout/
    │   │   ├── Sidebar.tsx
    │   │   └── Header.tsx
    │   ├── ui/                         ← hand-written shadcn/ui primitives
    │   │   ├── button.tsx, input.tsx, label.tsx, card.tsx
    │   │   ├── badge.tsx, dialog.tsx, dropdown-menu.tsx
    │   │   ├── avatar.tsx, separator.tsx
    │   ├── projects/
    │   │   ├── ProjectCard.tsx, AddProjectDialog.tsx
    │   │   ├── EditProjectDialog.tsx, ProjectsView.tsx
    │   ├── tasks/
    │   │   ├── AddTaskDialog.tsx, EditTaskDialog.tsx
    │   │   ├── TaskRow.tsx, TasksView.tsx
    │   ├── focus/
    │   │   ├── FocusTimer.tsx, SessionHistory.tsx
    │   ├── habits/
    │   │   ├── AddHabitDialog.tsx, EditHabitDialog.tsx
    │   │   ├── WeekdayPicker.tsx, HabitsView.tsx
    │   │   └── HabitsDashboardWidget.tsx
    │   ├── calendar/
    │   │   └── CalendarView.tsx
    │   ├── notes/
    │   │   ├── NoteDialog.tsx, NoteCard.tsx, NotesView.tsx
    │   ├── documents/
    │   │   ├── DocumentUploadDialog.tsx, DocumentCard.tsx, DocumentsView.tsx
    │   ├── saved-views/
    │   │   └── SavedViewsPanel.tsx     ← saved filter preset chips (Phase 5B)
    │   ├── study-buddy/
    │   │   └── StudyBuddyView.tsx      ← add/manage buddy relationships (Phase 6A)
    │   ├── leaderboard/                ← (no separate component; render logic in page.tsx)
    │   └── ui/
    │       └── tag-input.tsx           ← TagInput, TagBadge, TagFilterBar (Phase 5A)
    │
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts               ← browser client
    │   │   └── server.ts               ← server client (async, cookie-based)
    │   ├── actions/
    │   │   ├── onboarding.ts
    │   │   ├── projects.ts
    │   │   ├── tasks.ts                ← addTask, editTask, deleteTask, toggleTaskStatus, rescheduleTask
    │   │   ├── focus.ts                ← saveSession, deleteSession
    │   │   ├── habits.ts               ← addHabit, editHabit, deleteHabit, logHabit, unlogHabit, convertHabitToTask, applyFreeze
    │   │   ├── notes.ts                ← addNote, editNote, deleteNote, togglePin
    │   │   ├── documents.ts            ← addDocument, editDocument, deleteDocument
    │   │   ├── tags.ts                 ← setTaskTags, setNoteTags, setDocumentTags (Phase 5A)
    │   │   ├── savedViews.ts           ← createSavedView, deleteSavedView, renameSavedView (Phase 5B)
    │   │   └── studyBuddy.ts           ← sendBuddyRequest, respondToBuddyRequest, removeBuddy (Phase 6A)
    │   └── utils.ts                    ← cn() helper
    │
    ├── types/index.ts                  ← Profile, Project, Task, Note, Document, FocusSession, Habit, HabitLog, HabitFreezeLog, Tag, SavedView, StudyGroup
    └── hooks/useUser.ts
```

---

## Current Database Schema

### Tables and their status

| Table | Status | Notes |
|---|---|---|
| `profiles` | Active | Auth + onboarding data |
| `projects` | Active | Project/Area/Client CRUD |
| `tasks` | Active | Task management; has `tags TEXT[]` column |
| `notes` | Active | Notes (`type='note'`) + Journal (`type='journal'`); has `tags TEXT[]` column |
| `documents` | Active | Document vault metadata; storage in `vault` bucket |
| `focus_sessions` | Active | Focus mode + session history |
| `habits` | Active | Habit tracker with streaks |
| `habit_logs` | Active | Per-date habit completion logs |
| `habit_freeze_logs` | Active | Streak protection freeze records |
| `tags` | Active | Normalized tag table per user; `UNIQUE(user_id, name)` |
| `task_tags` | Active | Join: task ↔ tag; `PRIMARY KEY(task_id, tag_id)` |
| `note_tags` | Active | Join: note ↔ tag (notes + journal); `PRIMARY KEY(note_id, tag_id)` |
| `document_tags` | Active | Join: document ↔ tag; `PRIMARY KEY(document_id, tag_id)` |
| `saved_views` | Active | Named filter presets per user per entity_type; `filters_json JSONB` |
| `study_buddies` | Active | Peer-to-peer buddy requests; `status` pending/accepted/declined; Phase 6A |
| `get_weekly_leaderboard(p_timezone)` | Active RPC | SECURITY DEFINER function; aggregates focus/tasks/habits for self+buddies this week; Phase 6B |
| `study_groups` | Schema only | Group-based study rooms — future phase |
| `study_group_members` | Schema only | Group membership — future phase |

### Key columns to know

**`habits`**: `title` (NOT `name`), `frequency`, `target_days_per_week`, `selected_weekdays TEXT[]`, `linked_project_id`, `freeze_days_available` (default 3), `grace_window_hours` (default 2), `is_active`

**`notes`**: `type TEXT` (either `'note'` or `'journal'`), `is_pinned`, `tags TEXT[]`, `project_id`

**`documents`**: `name`, `file_path` (path in vault bucket), `file_type`, `file_size`, `project_id`, `updated_at`

**`tasks`**: `status` (`todo`|`in_progress`|`done`|`cancelled`), `priority` (`low`|`medium`|`high`|`urgent`), `due_date`, `tags TEXT[]`, `estimated_minutes`

### RLS

All tables have RLS enabled with `FOR ALL USING (auth.uid() = user_id)` (or `= id` for profiles). Never disable.

### Supabase Storage

- **Bucket:** `vault` (private, NOT public)
- **Path format:** `<user_id>/<timestamp>-<sanitized_filename>`
- **Policies:** INSERT/SELECT/DELETE on `storage.objects` scoped to `bucket_id = 'vault'` and `auth.uid()::text = (string_to_array(name, '/'))[1]`
- **Downloads:** via 1-hour signed URLs (generated browser-side via `createClient()`)
- **Uploads:** client-side upload → then `addDocument` server action inserts DB row; on DB failure, orphaned file is cleaned up from storage

### SQL Migrations — all must be run

| File | Phase | Must run? |
|---|---|---|
| `schema.sql` | 1 | Yes |
| `add_onboarding_columns.sql` | 2A | Yes |
| `fix_rls_and_timezone.sql` | 2A fix | Yes |
| `add_project_type.sql` | 2B-1 | Yes (no-op if schema.sql was run) |
| `add_tasks.sql` | 2B-2 | Yes (no-op if schema.sql was run) |
| `add_focus_sessions.sql` | 3A | Yes |
| `add_habits.sql` | 3B | Yes |
| `add_habits_weekdays.sql` | 3B | Yes |
| `add_streak_protection.sql` | 3C | Yes |
| `add_vault.sql` | 4C | Yes |
| `add_tags.sql` | 5A | Yes — creates `tags`, `task_tags`, `note_tags`, `document_tags` with RLS |
| `add_saved_views.sql` | 5B | Yes — creates `saved_views` table with RLS |
| `add_study_buddy.sql` | 6A | Yes — creates `study_buddies` table, `find_user_by_email` RPC, profile buddy policy |
| `add_leaderboard.sql` | 6B | Yes — creates `get_weekly_leaderboard(p_timezone)` SECURITY DEFINER function |

---

## Implemented Routes

| Route | Type | Status |
|---|---|---|
| `/` | Server | ✅ Landing page |
| `/auth/login` | Client | ✅ |
| `/auth/register` | Client | ✅ |
| `/auth/callback` | Route Handler | ✅ |
| `/onboarding` | Server + Client | ✅ |
| `/dashboard` | Server | ✅ |
| `/projects` | Server | ✅ |
| `/tasks` | Server | ✅ |
| `/focus` | Server | ✅ |
| `/habits` | Server | ✅ |
| `/calendar` | Server | ✅ |
| `/notes` | Server | ✅ |
| `/journal` | Server | ✅ |
| `/documents` | Server | ✅ |
| `/study-buddy` | Server | ✅ |
| `/leaderboard` | Server | ✅ |
| `/ai` | — | ❌ 404 — Phase 7A |
| `/settings` | — | ❌ 404 — future |

---

## Dashboard Widgets / Sections (current)

1. **Welcome banner** — "Good day, [first name]"
2. **Profile card** — goals tags, priorities tags, timezone, study hours/week
3. **Focus summary** — 3-column grid: today's minutes, week's minutes, sessions completed this week
4. **Habits widget** (`HabitsDashboardWidget`) — active count, today's progress (X/Y done), best streak, quick daily check-off list (habits due today only, filtered by weekday schedule)
5. **Upcoming Tasks** — next 5 non-done tasks with due dates, sorted ascending; priority badge + overdue highlight
6. **Notes & Documents** — 3-column grid: Notes count (→ /notes), Journal count (→ /journal), Documents count (→ /documents)
7. **Study Buddy** — 2-column grid: buddy count + pending requests (→ /study-buddy) | leaderboard rank this week (→ /leaderboard)
8. **Projects** — full project grid with AddProjectDialog

---

## Completed Phases

- ✅ Phase 1 — Auth + dashboard + base project CRUD
- ✅ Phase 2A — Onboarding wizard
- ✅ Phase 2B-1 — Projects / Areas / Clients refactor
- ✅ Phase 2B-2 — Task management
- ✅ Phase 3A — Focus Mode (Pomodoro, custom timer, session history)
- ✅ Phase 3B — Habit Tracker (daily/weekly, streaks, convert to task, weekday scheduling)
- ✅ Phase 3C — Streak Protection + Recovery (freeze days, grace window, recovery suggestions)
- ✅ Phase 4A — Calendar (monthly grid, quick-add from date, inline reschedule)
- ✅ Phase 4B — Notes + Journal (CRUD, pin, search, project link)
- ✅ Phase 4C — Document Vault (upload PDFs/images, signed URL download, delete)
- ✅ Phase 5A — Tagging System (normalized tags table, tags on tasks/notes/journal/documents, tag filter bar)
- ✅ Phase 5B — Smart Filters / Saved Views (named filter presets with project/dueDate/fileType, SavedViewsPanel chip strip on tasks/notes/journal/documents)
- ✅ Phase 6A — Study Buddy Foundation (send/accept/decline/remove buddy requests by email; SECURITY DEFINER email lookup; buddy count on dashboard)
- ✅ Phase 6B — Leaderboard (weekly ranking for self + accepted buddies; SECURITY DEFINER aggregation; score = focus_min + tasks×20 + habits×10; rank shown on dashboard)

---

## Partially Completed / Known Quirks

- **Profile editing:** `work_hours_start`, `work_hours_end`, `avatar_url` exist in DB/types but no edit UI.
- **Mobile layout:** Sidebar is `hidden md:flex`. No hamburger/drawer on mobile — intentional for now.
- **No global toast:** Errors are shown inline. No `sonner` or shadcn toast added yet.
- **`onboarding_completed` column:** Present in DB from Phase 1, unused in code. Do not remove.
- **Sidebar 404s:** `/study-buddy`, `/ai`, `/settings` will 404 until built — expected and intentional.
- **Email confirmation:** Works if Supabase email is configured. For dev, can disable in Supabase → Auth → Email → "Confirm email".

---

## Important Architecture Decisions

1. **Next.js 15 App Router only.** All data fetching in Server Components or Server Actions.
2. **`@supabase/ssr` only.** `lib/supabase/client.ts` for browser, `lib/supabase/server.ts` for server. Never use `@supabase/auth-helpers-nextjs`.
3. **Server Actions for all mutations.** No custom API routes for CRUD. All mutations in `lib/actions/*.ts` with `'use server'`.
4. **`(dashboard)` route group = auth boundary.** `app/(dashboard)/layout.tsx` handles auth check + `is_onboarded` guard. All new protected pages go inside this group.
5. **Onboarding guard in layout, not middleware.** Middleware handles only auth; `is_onboarded` check is in `app/(dashboard)/layout.tsx`.
6. **shadcn/ui hand-written.** Do NOT run `npx shadcn@latest add`. Write component files manually in `components/ui/`.
7. **`revalidatePath` after every mutation.** Always call after server action writes so page cache is invalidated.
8. **Storage: client uploads, server records.** File upload happens in the browser component using the browser Supabase client. Then `addDocument` server action is called to insert the DB row. If DB insert fails, browser cleans up the orphaned storage file.
9. **`habits.title` (not `name`).** The column was renamed via migration. Never reference `habits.name` in queries.
10. **Normalized tags** — Phase 5A uses `tags` + join tables (`task_tags`, `note_tags`, `document_tags`). The old `TEXT[]` columns on `tasks` and `notes` are dead weight and not used. Do not write to them.
11. **`find_user_by_email` RPC** — Phase 6A SECURITY DEFINER function. Call via `supabase.rpc('find_user_by_email', { search_email: '...' })`. Returns `[{ id: UUID }]` or `[]`. Do not query `auth.users` directly.
12. **`study_buddies` design** — requester/addressee model. Accept/decline enforced via `.eq('addressee_user_id', user.id)` in server actions (RLS UPDATE is open to both parties; the action narrows it). On decline, the row is deleted so the requester can retry later.
13. **`get_weekly_leaderboard(p_timezone TEXT DEFAULT 'UTC')` RPC** — Phase 6B SECURITY DEFINER. Call via `supabase.rpc('get_weekly_leaderboard', { p_timezone: tz })`. Returns `LeaderboardEntry[]` sorted by rank ASC. Dashboard uses `'UTC'` default; the leaderboard page uses the user's `profile.timezone` for accuracy. Scoring: `focus_minutes + (completed_tasks * 20) + (habit_completions * 10)`. Week start = Monday (ISO-8601, `date_trunc('week', ...)`). Only the caller + their accepted buddies are included.
11. **`tags.color`** — deterministic color is auto-assigned from a fixed palette based on the tag name hash in `lib/actions/tags.ts`. No user-facing color picker needed.

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Future: `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for Phase 7A.

---

## Do-Not-Break Warnings

1. **Auth flow** — login → onboarding (if new) → dashboard. `is_onboarded` flag and dashboard layout guard must not change.
2. **Supabase client helpers** — `lib/supabase/client.ts` and `lib/supabase/server.ts`. Do not replace with direct `createClient` calls.
3. **Middleware** — never add DB queries to middleware. Auth redirect only.
4. **Project CRUD** — `lib/actions/projects.ts` + components are working. Do not refactor unless phase requires it.
5. **RLS on all tables** — never disable. Filter by `user_id` in queries as belt-and-suspenders.
6. **`revalidatePath` after mutations** — always call so page cache is busted.
7. **`(dashboard)` route group** — all future protected pages must live inside `app/(dashboard)/`.
8. **Habit logs uniqueness** — `UNIQUE(habit_id, logged_date)` on `habit_logs`. `logHabit` uses `ignoreDuplicates: true`. Do not change.
9. **`habits.title`** — column is `title` not `name`. Do not reference `habits.name`.
10. **Storage vault policies** — the 3 storage policies on `storage.objects` for the `vault` bucket must remain intact.

---

## Next Recommended Phase

**Phase 7A — AI Assistant**

App-context-aware chat using an LLM API.

Key facts:
- Will need `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` added to `.env.local`
- Should be able to answer questions about the user's own tasks, habits, and notes
- Keep MVP: simple chat UI at `/ai`, no persistent message history in DB required initially
