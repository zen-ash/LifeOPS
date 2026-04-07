# LifeOPS — Project State
_Last updated: Phase 3B complete (Habit Tracker) — next: Phase 3C (Streak Protection)_

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
| Styling | Tailwind CSS v3 + shadcn/ui (Radix primitives) |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL |
| File storage | Supabase Storage (planned — Phase 6) |
| Theme | next-themes (dark/light/system) |
| Deployment target | Vercel |
| Package manager | npm |
| React version | 19 |

---

## Current File Tree

```
Soft Eng Proj/                          ← project root
├── DEVELOPMENT_GUIDE.md                           ← persistent project rules for Claude
├── PROJECT_STATE.md                    ← this file
│
├── supabase/
│   ├── schema.sql                      ← full Phase 1 schema (must be run once)
│   ├── add_onboarding_columns.sql      ← Phase 2A columns (must be run once)
│   └── fix_rls_and_timezone.sql        ← Phase 2A RLS fix (must be run once)
│
├── extension/
│   └── README.md                       ← placeholder only, Phase 12
│
└── lifeops-app/                        ← Next.js 15 application
    ├── package.json
    ├── tsconfig.json                   ← includes "target": "ES2017" (user-modified)
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── postcss.config.mjs
    ├── components.json                 ← shadcn/ui config
    ├── middleware.ts                   ← auth route protection
    ├── .env.local                      ← exists locally (not in git)
    ├── .env.example
    ├── .gitignore
    ├── .eslintrc.json
    │
    ├── app/
    │   ├── globals.css                 ← CSS custom properties (light + dark)
    │   ├── layout.tsx                  ← root layout, wraps Providers
    │   ├── providers.tsx               ← ThemeProvider (client)
    │   ├── page.tsx                    ← landing page (public)
    │   │
    │   ├── auth/
    │   │   ├── login/page.tsx          ← login form (client)
    │   │   ├── register/page.tsx       ← register form (client)
    │   │   └── callback/route.ts       ← email confirmation handler (route handler)
    │   │
    │   ├── onboarding/
    │   │   ├── page.tsx                ← server: auth + onboarding guard
    │   │   └── OnboardingWizard.tsx    ← client: 4-step wizard
    │   │
    │   └── (dashboard)/               ← route group — all protected pages
    │       ├── layout.tsx              ← server: auth check + is_onboarded guard
    │       ├── dashboard/
    │       │   └── page.tsx            ← dashboard (server component)
    │       ├── projects/
    │       │   └── page.tsx            ← projects/areas/clients page (server)
    │       ├── tasks/
    │       │   └── page.tsx            ← tasks page with filters (server)
    │       └── focus/
    │           └── page.tsx            ← focus mode page (server)
    │
    ├── components/
    │   ├── ThemeToggle.tsx
    │   ├── layout/
    │   │   ├── Sidebar.tsx             ← responsive sidebar (hidden on mobile)
    │   │   └── Header.tsx              ← top bar with user menu + logout
    │   ├── projects/
    │   │   ├── ProjectCard.tsx         ← card with edit + delete buttons
    │   │   ├── AddProjectDialog.tsx    ← create modal with type + color picker
    │   │   ├── EditProjectDialog.tsx   ← edit modal (name/type/status/color)
    │   │   └── ProjectsView.tsx        ← client: filter tabs + grid
    │   ├── tasks/
    │   │   ├── AddTaskDialog.tsx       ← create task modal
    │   │   ├── EditTaskDialog.tsx      ← edit task modal
    │   │   ├── TaskRow.tsx             ← single task row (checkbox, badges, edit/delete)
    │   │   └── TasksView.tsx           ← client: status tabs + priority filter
    │   ├── focus/
    │   │   ├── FocusTimer.tsx          ← client: setup → running → finished state machine
    │   │   └── SessionHistory.tsx      ← session list with delete
    │   └── ui/                         ← shadcn/ui primitives (hand-written)
    │       ├── button.tsx
    │       ├── input.tsx
    │       ├── label.tsx
    │       ├── card.tsx
    │       ├── badge.tsx
    │       ├── dialog.tsx
    │       ├── dropdown-menu.tsx
    │       ├── avatar.tsx
    │       └── separator.tsx
    │
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts               ← createBrowserClient (use in client components)
    │   │   └── server.ts               ← createServerClient (use in server components)
    │   ├── actions/
    │   │   ├── projects.ts             ← addProject, deleteProject (Server Actions)
    │   │   └── onboarding.ts           ← completeOnboarding (Server Action)
    │   └── utils.ts                    ← cn() helper
    │
    ├── types/
    │   └── index.ts                    ← all TS interfaces (mirrors DB schema)
    │
    └── hooks/
        └── useUser.ts                  ← client-side auth state hook
```

---

## Current Database Schema

### Exact current `profiles` table

The `profiles` table has columns from **Phase 1** (`schema.sql`) PLUS columns added via **Phase 2A** (`add_onboarding_columns.sql`):

```sql
CREATE TABLE public.profiles (
  -- Phase 1 (schema.sql)
  id                   UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email                TEXT NOT NULL,
  full_name            TEXT,
  avatar_url           TEXT,
  timezone             TEXT DEFAULT 'UTC',
  onboarding_completed BOOLEAN DEFAULT FALSE,   -- legacy, not used in code
  work_hours_start     TIME DEFAULT '09:00',    -- not yet used in UI
  work_hours_end       TIME DEFAULT '17:00',    -- not yet used in UI
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),

  -- Phase 2A (add_onboarding_columns.sql)
  is_onboarded          BOOLEAN DEFAULT FALSE,  -- ← used by routing guard
  goals                 TEXT[]  DEFAULT '{}',
  study_hours_per_week  INTEGER,
  priorities            TEXT[]  DEFAULT '{}'
);
```

> **Note:** `onboarding_completed` is a legacy column from the Phase 1 schema definition. It is not used anywhere in the application code. `is_onboarded` is the active flag.

### Other tables (schema defined, not yet used in UI)

All tables exist in Supabase (created by `schema.sql`), but only `profiles` and `projects` are actively read/written by the app:

| Table | Status |
|---|---|
| `profiles` | Active — auth + onboarding |
| `projects` | Active — dashboard CRUD |
| `tasks` | Active — task management |
| `notes` | Schema only — no UI yet |
| `documents` | Schema only — no UI yet |
| `focus_sessions` | Active — Focus Mode |
| `habits` | Active — Habit Tracker |
| `habit_logs` | Active — Habit Tracker |
| `study_groups` | Schema only — no UI yet |
| `study_group_members` | Schema only — no UI yet |

### RLS Policies

All tables have RLS enabled. Current policies on `profiles`:

```sql
-- SELECT: users can read their own row
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

-- INSERT: trigger creates the row; this policy allows it
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- UPDATE: rebuilt in fix_rls_and_timezone.sql with explicit WITH CHECK
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING     (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

All other personal tables (`projects`, `tasks`, etc.) use a single `FOR ALL USING (auth.uid() = user_id)` policy.

### Triggers

- `on_auth_user_created` — auto-creates a `profiles` row on every new signup (reads `full_name` from `raw_user_meta_data`)
- `update_*_updated_at` — bumps `updated_at` on UPDATE for `profiles`, `projects`, `tasks`, `notes`

---

## Completed Features

- [x] Next.js 15 App Router project scaffold
- [x] TypeScript, Tailwind CSS, shadcn/ui primitives
- [x] Supabase browser + server client helpers (`lib/supabase/`)
- [x] Supabase Auth — email/password registration with email confirmation
- [x] Supabase Auth — login and logout
- [x] Auth callback route (`/auth/callback`) for email confirmation redirects
- [x] Middleware — protects all non-public routes; unauthenticated → `/auth/login`
- [x] Middleware — authenticated users on `/auth/*` → redirect to `/dashboard`
- [x] Landing page (`/`) — public, with dark/light toggle
- [x] Dark/light/system mode toggle (next-themes)
- [x] Authenticated app layout — sidebar + top header inside `(dashboard)` route group
- [x] Sidebar — navigation links for all 12 planned phases (most 404 until built)
- [x] Header — user avatar dropdown with logout
- [x] Dashboard layout guard — redirects to `/onboarding` if `is_onboarded = false`
- [x] Onboarding wizard — 4-step flow: goals → study hours → priorities → timezone
- [x] Onboarding — browser timezone auto-detection
- [x] Onboarding — saves all fields to `profiles`, sets `is_onboarded = true`
- [x] Onboarding guard — already-onboarded users visiting `/onboarding` redirect to `/dashboard`
- [x] Dashboard — displays saved goals, priorities, timezone, study hours from profile
- [x] Projects — create project/area/client (name, description, type select, color picker)
- [x] Projects — list on dashboard in a responsive grid
- [x] Projects — delete (hover-to-reveal trash icon, confirmation dialog)
- [x] Projects — edit (pencil icon, dialog with name/type/status/color)
- [x] Projects — dedicated `/projects` page with type filter tabs (All / Projects / Areas / Clients)
- [x] Projects — type badge always visible on each card
- [x] Tasks — create task (title, description, priority, due date, estimated minutes, optional project link)
- [x] Tasks — edit task (all fields + status)
- [x] Tasks — delete task (with confirmation)
- [x] Tasks — mark complete / incomplete (checkbox toggle)
- [x] Tasks — dedicated `/tasks` page with status tabs (All / To Do / In Progress / Done) and priority filter dropdown
- [x] Tasks — overdue date highlighting (red)
- [x] Tasks — project badge on task rows (when linked)
- [x] Dashboard — "Upcoming Tasks" section (non-done tasks with due dates, sorted by due date, limit 5)
- [x] Focus Mode — Pomodoro timer with preset durations (15/25/30/45/60m) and custom input
- [x] Focus Mode — optional session goal, linked task, and linked project
- [x] Focus Mode — start, stop early, and auto-complete on timer expiry
- [x] Focus Mode — saves session to DB (actual_minutes, completed flag, start/end timestamps)
- [x] Focus Mode — session history list (last 20) with project/task badges and delete
- [x] Focus Mode — dedicated `/focus` page
- [x] Dashboard — Focus summary widget (today's minutes, week's minutes, completed sessions this week)
- [x] All personal data protected by Row Level Security (users see only their own data)
- [x] Full TypeScript types for all 8 DB entities in `types/index.ts`
- [x] Server Actions for all mutations (no API routes needed)
- [x] Habits — create habit (title, description, frequency daily/weekly, target days/week, optional project link)
- [x] Habits — edit habit (all fields + active/inactive toggle)
- [x] Habits — delete habit (with inline confirm)
- [x] Habits — mark complete / unmark for today (per-date logs with duplicate prevention)
- [x] Habits — streak computation (daily: consecutive days; weekly: consecutive weeks meeting target)
- [x] Habits — "Convert to Task" action (creates task with today's due date and habit's linked project)
- [x] Habits — dedicated `/habits` page with Active / Daily / Weekly / Inactive filter tabs
- [x] Dashboard — Habits widget (active count, today's progress, best streak, quick daily check-off)

---

## Partially Completed Features
- [ ] **Profile editing** — `work_hours_start`, `work_hours_end`, and `avatar_url` are in the DB schema but no UI to edit them exists yet.
- [ ] **Project detail page** — `/projects/[id]` showing linked tasks/notes (deferred to Phase 4+).

---

## Broken / Unverified Areas

- **Sidebar links 404:** `/notes`, `/documents`, `/habits`, `/calendar`, `/study-buddy`, `/ai`, `/settings` — all 404 until their phases are built. This is expected and intentional.
- **Mobile layout:** Sidebar is `hidden md:flex`. On screens narrower than `md` (768px), there is no navigation — the sidebar simply disappears. No hamburger menu or mobile drawer has been built yet.
- **Email confirmation flow:** Works if Supabase's email service is configured. For local dev, email confirmation can be disabled in Supabase Dashboard → Authentication → Email → "Confirm email" toggle.
- **`onboarding_completed` column:** Present in the DB from Phase 1 schema but unused in code. Not a bug, just dead schema weight. Do not remove it — future phases might use it or it can be cleaned up in a migration later.
- **`work_hours_start` / `work_hours_end`:** Columns exist in DB and in the `Profile` TS type but no UI reads or writes them yet.
- **Storage bucket:** Supabase Storage bucket for documents has not been created yet. Needed for Phase 6.
- **No toast/notification system:** Errors are shown inline; there is no global toast. The `sonner` or shadcn `toast` component has not been added.

---

## Supabase / Database State

### SQL files created

| File | Purpose | Must be run? |
|---|---|---|
| `supabase/schema.sql` | Full schema for all 12 phases + RLS + triggers | ✅ Yes — Phase 1 |
| `supabase/add_onboarding_columns.sql` | Adds `is_onboarded`, `goals`, `study_hours_per_week`, `priorities` | ✅ Yes — Phase 2A |
| `supabase/fix_rls_and_timezone.sql` | Ensures `timezone` column exists; rebuilds UPDATE policy with `WITH CHECK` | ✅ Yes — Phase 2A fix |
| `supabase/add_project_type.sql` | Ensures `projects.type` column exists; backfills NULL rows to `'project'` | ✅ Yes — Phase 2B-1 (no-op if schema.sql was run) |
| `supabase/add_tasks.sql` | Ensures tasks table, RLS policy, and trigger exist | ✅ Yes — Phase 2B-2 (no-op if schema.sql was run) |
| `supabase/add_focus_sessions.sql` | Adds `project_id`, `goal`, `actual_minutes`, `created_at`, `updated_at` to `focus_sessions`; RLS + trigger | ✅ Yes — Phase 3A |
| `supabase/add_habits.sql` | Renames `habits.name→title`; adds `target_days_per_week`, `linked_project_id`, `updated_at`; trigger; RLS | ✅ Yes — Phase 3B |

### What the user has confirmed running

- `schema.sql` — confirmed working (auth, profile trigger, projects RLS)
- `add_onboarding_columns.sql` — should have been run for Phase 2A to work
- `fix_rls_and_timezone.sql` — provided in Phase 2A fixes session

### RLS assumptions

- All DB operations from the app use the **user's session cookie** (via `@supabase/ssr`), so `auth.uid()` is always the logged-in user's ID.
- The Supabase anon key is used in the client — this is correct and safe because RLS prevents cross-user data access.

---

## Environment Variables Expected

Stored in `lifeops-app/.env.local` (not committed to git):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find them:** Supabase Dashboard → Your project → Settings → API → "Project URL" and "anon public"

No other env vars are required at this phase. Future phases will add:
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` (Phase 11 — AI assistant)

---

## Routes / Pages Implemented

| Route | File | Type | Status |
|---|---|---|---|
| `/` | `app/page.tsx` | Server | ✅ Landing page |
| `/auth/login` | `app/auth/login/page.tsx` | Client | ✅ Working |
| `/auth/register` | `app/auth/register/page.tsx` | Client | ✅ Working |
| `/auth/callback` | `app/auth/callback/route.ts` | Route Handler | ✅ Working |
| `/onboarding` | `app/onboarding/page.tsx` | Server + Client | ✅ Working |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | Server | ✅ Working |
| `/projects` | `app/(dashboard)/projects/page.tsx` | Server | ✅ Working |
| `/tasks` | `app/(dashboard)/tasks/page.tsx` | Server | ✅ Working |
| `/notes` | — | — | ❌ 404 — Phase 4B |
| `/documents` | — | — | ❌ 404 — Phase 4C |
| `/focus` | `app/(dashboard)/focus/page.tsx` | Server | ✅ Working |
| `/habits` | `app/(dashboard)/habits/page.tsx` | Server | ✅ Working |
| `/calendar` | — | — | ❌ 404 — Phase 4A |
| `/study-buddy` | — | — | ❌ 404 — Phase 6A |
| `/ai` | — | — | ❌ 404 — Phase 7A |
| `/settings` | — | — | ❌ 404 — future |

---

## Important Architecture Decisions

1. **Next.js 15 App Router only.** No Pages Router. All data fetching is in Server Components or Server Actions. No `getServerSideProps`.

2. **`@supabase/ssr` (not `@supabase/auth-helpers-nextjs`).** The older helpers package is deprecated. Use `createBrowserClient` for client components and `createServerClient` (async, with cookie store) for server components.

3. **Server Actions for all mutations.** No custom API routes (`app/api/`) for CRUD operations. Mutations go in `lib/actions/*.ts` with `'use server'` at the top.

4. **Route group `(dashboard)` for protected pages.** The layout at `app/(dashboard)/layout.tsx` is the single auth + onboarding guard for all protected pages. Adding a new protected page = put it in `app/(dashboard)/your-page/`.

5. **Onboarding guard lives in the layout, not middleware.** Middleware only handles the auth check (unauthenticated → login). The `is_onboarded` check is in `app/(dashboard)/layout.tsx`, keeping middleware lean.

6. **shadcn/ui components are hand-written, not CLI-generated.** The Radix dependencies are in `package.json`. Components live in `components/ui/`. Do not run `npx shadcn@latest add` — just write the component file directly as we have been.

7. **Server Actions revalidate with `revalidatePath`.** After a mutation, call `revalidatePath('/dashboard')` to invalidate the page cache. This causes Next.js to re-fetch data on the next request without a full reload.

8. **`lib/actions/` is the home for all Server Actions.** Organized by domain: `projects.ts`, `onboarding.ts`. Future: `tasks.ts`, `notes.ts`, `habits.ts`, etc.

9. **`types/index.ts` mirrors the DB schema.** All TypeScript interfaces live here. Keep them in sync with the actual DB columns.

10. **Supabase Storage bucket not yet created.** Required for Phase 6 (Document Vault). When Phase 6 starts, create a private bucket named `documents` in Supabase Dashboard → Storage.

---

## Most Recently Changed Files

_(Phase 2B-2: Task Management)_

| File | Change |
|---|---|
| `supabase/add_tasks.sql` | New — idempotent SQL for tasks table, RLS, trigger |
| `lib/actions/tasks.ts` | New — addTask, editTask, deleteTask, toggleTaskStatus |
| `components/tasks/AddTaskDialog.tsx` | New — create task modal |
| `components/tasks/EditTaskDialog.tsx` | New — edit task modal (all fields + status) |
| `components/tasks/TaskRow.tsx` | New — single task row with checkbox, priority badge, due date, edit/delete |
| `components/tasks/TasksView.tsx` | New — status filter tabs + priority dropdown + task list |
| `app/(dashboard)/tasks/page.tsx` | New — /tasks server page |
| `app/(dashboard)/dashboard/page.tsx` | Added "Upcoming Tasks" section (due-date sorted, limit 5) |

_(Phase 3B: Habit Tracker)_

| File | Change |
|---|---|
| `supabase/add_habits.sql` | New — renames `name→title`, adds `target_days_per_week`, `linked_project_id`, `updated_at`; trigger; RLS |
| `types/index.ts` | Updated `Habit` interface (`title`, `target_days_per_week`, `linked_project_id`, `updated_at`) |
| `lib/actions/habits.ts` | New — `addHabit`, `editHabit`, `deleteHabit`, `logHabit`, `unlogHabit`, `convertHabitToTask` |
| `components/habits/AddHabitDialog.tsx` | New — create habit modal |
| `components/habits/EditHabitDialog.tsx` | New — edit habit modal |
| `components/habits/HabitsView.tsx` | New — filter tabs, habit rows, streak display, inline confirm delete |
| `components/habits/HabitsDashboardWidget.tsx` | New — dashboard habits widget with quick daily check-off |
| `app/(dashboard)/habits/page.tsx` | New — /habits server page |
| `app/(dashboard)/dashboard/page.tsx` | Added habits queries + HabitsDashboardWidget |

_(Phase 3A: Focus Mode)_

| File | Change |
|---|---|
| `supabase/add_focus_sessions.sql` | New — adds `project_id`, `goal`, `actual_minutes`, `created_at`, `updated_at`; RLS; trigger |
| `types/index.ts` | Updated `FocusSession` interface with new fields |
| `lib/actions/focus.ts` | New — `saveSession`, `deleteSession` |
| `components/focus/FocusTimer.tsx` | New — client timer: setup form → SVG countdown ring → finished state |
| `components/focus/SessionHistory.tsx` | New — session list with project/task badges and delete |
| `app/(dashboard)/focus/page.tsx` | New — /focus server page |
| `app/(dashboard)/dashboard/page.tsx` | Added Focus summary widget (today/week minutes, completed sessions) |

---

## Next Recommended Task

**Phase 3C — Streak Protection + Recovery (Freeze day, grace window)**

Habit Tracker is complete. The next phase adds streak safety features:
- "Freeze" a habit streak for one missed day (one freeze token per period)
- Grace window: streak doesn't break until end of next day
- Visible freeze/recovery UI on the habits page

---

## Do-Not-Break Warnings

These are working and must be preserved across all future phases:

1. **Auth flow** — login → onboarding (if new) → dashboard. Do not change how `is_onboarded` or the dashboard layout guard works.
2. **Supabase client helpers** — `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server). Do not replace these with direct `createClient` calls.
3. **Middleware** — the current matcher and redirect logic is correct. Do not add DB queries to middleware (performance).
4. **Project CRUD on dashboard** — `lib/actions/projects.ts` (`addProject`, `deleteProject`) plus `ProjectCard` and `AddProjectDialog` are working. Do not refactor these unless the phase specifically asks for it.
5. **RLS on all tables** — every table has RLS enabled. Never disable RLS. Always filter by `user_id` in queries as a belt-and-suspenders check even though RLS enforces it.
6. **`revalidatePath` after mutations** — always call this in server actions so the page cache is busted after a write.
7. **Route group `(dashboard)`** — all future protected pages must live inside `app/(dashboard)/`. Do not create protected pages outside this group.
8. **Habit logs duplicate prevention** — the `UNIQUE(habit_id, logged_date)` constraint on `habit_logs` prevents double-counting. `logHabit` uses upsert with `ignoreDuplicates: true`. Do not change this.
9. **`habits.title` column** — the DB column is `title` (renamed from `name` via migration). Do not reference `name` in any habits query.
