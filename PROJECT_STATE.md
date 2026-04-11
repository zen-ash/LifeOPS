# LifeOPS — Project State
_Last updated: Phase 11.F complete — Focus Mode Upgrade: Planner→Focus handoff, planned vs actual, enriched activity log_

---

## Project Overview

**LifeOPS** is an undergraduate university student productivity web app.
It is a multi-phase project being built incrementally, one phase at a time.

**Goal:** A single app that replaces scattered tools — tasks, habits, focus timer, notes, document vault, AI planner, study buddy.

**Project status:** Treated as a serious personal product / flagship portfolio project. The UI/UX is launch-ready. Further work should focus on product behavior, retention loops, intelligence, and premium additions — not large visual redesigns.

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
│   ├── add_leaderboard.sql            ← Phase 6B
│   ├── add_activity_log.sql           ← Phase 11.A
│   ├── add_daily_shutdowns.sql        ← Phase 11.B
│   └── add_weekly_reviews.sql         ← Phase 11.C
│
├── extension/                          ← Phase 8: Chrome extension (load unpacked in Chrome)
│   ├── manifest.json                   ← Manifest V3
│   ├── background.js                   ← Service worker: declarativeNetRequest rules
│   ├── blocked.html                    ← Page shown when a blocked site is visited
│   ├── README.md                       ← How to load and use the extension
│   ├── popup/
│   │   ├── popup.html                  ← Extension popup UI
│   │   └── popup.js                   ← Toggle focus mode, manage blocked sites
│   └── icons/
│       ├── icon16.svg
│       ├── icon48.svg
│       └── icon128.svg
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
    │   ├── api/
    │   │   ├── chat/route.ts           ← Phase 7A: streaming AI chat endpoint
    │   │   ├── planner/route.ts        ← Phase 7B: generateObject weekly plan endpoint
    │   │   └── review/route.ts         ← Phase 11.C: generateObject weekly review AI summary
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
    │       ├── leaderboard/page.tsx
    │       ├── assistant/page.tsx      ← Phase 7A: AI chat UI (client component)
    │       ├── planner/page.tsx        ← Phase 7B: AI planner (server + PlannerView client)
    │       ├── shutdown/page.tsx       ← Phase 11.B: daily shutdown workflow
    │       └── review/page.tsx         ← Phase 11.C: weekly review
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
    │   ├── planner/
    │   │   └── PlannerView.tsx         ← generate/save/render weekly plan (Phase 7B)
    │   ├── shutdown/
    │   │   └── ShutdownView.tsx        ← daily shutdown workflow UI (Phase 11.B)
    │   ├── review/
    │   │   └── ReviewView.tsx          ← weekly review UI with AI summary (Phase 11.C)
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
    │   │   ├── tasks.ts                ← addTask, editTask, deleteTask, toggleTaskStatus, rescheduleTask, carryToTomorrow
    │   │   ├── focus.ts                ← saveSession (with from_planner; enriched logEvent payload), deleteSession
    │   │   ├── habits.ts               ← addHabit, editHabit, deleteHabit, logHabit, unlogHabit, convertHabitToTask, applyFreeze
    │   │   ├── notes.ts                ← addNote, editNote, deleteNote, togglePin
    │   │   ├── documents.ts            ← addDocument, editDocument, deleteDocument
    │   │   ├── tags.ts                 ← setTaskTags, setNoteTags, setDocumentTags (Phase 5A)
    │   │   ├── savedViews.ts           ← createSavedView, deleteSavedView, renameSavedView (Phase 5B)
    │   │   ├── studyBuddy.ts           ← sendBuddyRequest, respondToBuddyRequest, removeBuddy (Phase 6A)
    │   │   ├── planner.ts              ← savePlan (upsert weekly_plans) (Phase 7B)
    │   │   ├── activityLog.ts          ← logEvent helper (Phase 11.A; no 'use server')
    │   │   ├── shutdown.ts             ← completeShutdown server action (Phase 11.B)
    │   │   └── review.ts               ← saveWeeklyReview server action (Phase 11.C)
    │   └── utils.ts                    ← cn() helper
    │
    ├── types/index.ts                  ← Profile, Project, Task, Note, Document, FocusSession, Habit, HabitLog, HabitFreezeLog, Tag, SavedView, StudyGroup, WeeklyPlan, GeneratedPlan, PlanDay, DailyShutdown, WeeklyReview, WeeklyMetrics, ReviewAISummary, ActivityLog
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
| `weekly_plans` | Active | AI-generated weekly plans; `UNIQUE(user_id, week_start_date)`; upsert on re-save; `plan_json` JSONB |
| `user_activity_logs` | Active | Append-only telemetry; `event_type`, `entity_type`, `entity_id`, `payload` JSONB; Phase 11.A |
| `daily_shutdowns` | Active | One row per user per day; `UNIQUE(user_id, shutdown_date)`; `completed_tasks`/`slipped_decisions`/`tomorrow_top3` JSONB; Phase 11.B |
| `weekly_reviews` | Active | One row per user per week; `UNIQUE(user_id, week_start)`; `metrics_json` JSONB; `ai_summary` JSONB; Phase 11.C |
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
| `add_weekly_plans.sql` | 7B | Yes — creates `weekly_plans` table with RLS; `UNIQUE(user_id, week_start_date)` |
| `add_activity_log.sql` | 11.A | Yes — creates `user_activity_logs` table with RLS + 2 indexes |
| `add_daily_shutdowns.sql` | 11.B | Yes — creates `daily_shutdowns` table with RLS; `UNIQUE(user_id, shutdown_date)` |
| `add_weekly_reviews.sql` | 11.C | Yes — creates `weekly_reviews` table with RLS; `UNIQUE(user_id, week_start)` |

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
| `/assistant` | Client | ✅ Phase 7A |
| `/planner` | Server + Client | ✅ Phase 7B |
| `/shutdown` | Server + Client | ✅ Phase 11.B |
| `/review` | Server + Client | ✅ Phase 11.C |
| `/settings` | — | ❌ 404 — future |

---

## Dashboard Widgets / Sections (current)

1. **Welcome banner** — "Good day, [first name]"
2. **Profile card** — goals tags, priorities tags, timezone, study hours/week
3. **Focus summary** — 3-column grid: today's minutes, week's minutes, sessions completed this week
4. **Habits widget** (`HabitsDashboardWidget`) — active count, today's progress (X/Y done), best streak, quick daily check-off list (habits due today only, filtered by weekday schedule)
5. **Upcoming Tasks** — next 5 non-done tasks with due dates, sorted ascending; priority badge + overdue highlight
6. **Notes & Documents** — 3-column grid: Notes count (→ /notes), Journal count (→ /journal), Documents count (→ /documents)
7. **Study Buddy** — 3-column grid: buddy count + pending requests (→ /study-buddy) | leaderboard rank this week (→ /leaderboard) | AI Planner link (→ /planner)
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
- ✅ Phase 7A — AI Assistant (context-aware chat at `/assistant`; Vercel AI SDK + OpenAI gpt-4o-mini; injects tasks/habits/goals as system prompt; `create_task` tool; streaming responses)
- ✅ Phase 7B — AI Planner (weekly plan at `/planner`; `generateObject` with Zod schema; context injection; save/upsert to `weekly_plans`; regenerate flow)
- ✅ Phase 8 — Distraction Blocker Extension (Manifest V3 Chrome extension; manual toggle; `declarativeNetRequest` dynamic rules; `chrome.storage.local`; blocked.html redirect page)
- ✅ Phase 9 — Final Polish + Deployment Readiness (mobile responsive grids on dashboard; loading.tsx skeletons for dashboard/planner/leaderboard; full capstone README.md in lifeops-app/)
- ✅ Phase 10A — Design system + shell overhaul (premium dark-mode token system; globals.css + Tailwind token rework; AppShell created; Sidebar + Header redesigned; surface hierarchy, borders, mobile shell behavior)
- ✅ Phase 10B — Dashboard overhaul (command-center layout; Today hero with stronger hierarchy; focus/tasks/habits/projects/social layout zones; updated loading skeleton; HabitsDashboardWidget improved)
- ✅ Phase 10C — Full page overhauls:
  - Planner: premium AI planning workspace; empty/generating/saved states; shimmer loading; cleaner weekly layout
  - Focus Mode: timer as visual centerpiece; inactive/active/finished states; session history redesigned; two-column workspace
  - Tasks: structured workspace; overdue/today/upcoming/no-due-date/completed grouping; stronger row design; filter toolbar
  - Habits: premium habit cards; 7-day history strip; improved streak treatment; better check-in button and progress area
  - Notes: redesigned with pinned hierarchy → then upgraded to split-pane master-detail (left list, right inline NoteEditor); mobile list/detail behavior
  - Documents: premium document workspace; upload in page header; file-type header zones; grid layout; improved filter toolbar
  - Leaderboard: improved header/stat strip; top-3 + current-user treatment; avatars/fallbacks; better row hover states
  - Study Buddy: premium header; avatars; better empty state; loading state added
  - Onboarding: premium setup flow; branding; step indicators; option cards; CTA states
- ✅ Phase 10D — Global design-system polish (antialiasing; branded selection styles; dark/light scrollbars; button micro-interactions; input hover/focus; card/dialog/dropdown unification; rounded-xl / elevated surface consistency)
- ✅ Phase 10D.1 — Micro polish follow-up (TagInput dark-mode focus ring offset fixed; AppShell mobile padding improved)
- ✅ Phase 11.A — Activity Log Foundation (`user_activity_logs` table + RLS + indexes; `logEvent` helper in `lib/actions/activityLog.ts`; `ActivityEventType` + `ActivityLog` types; events wired into `toggleTaskStatus`, `logHabit`, `unlogHabit`, `saveSession`, `savePlan`, and `/api/planner` route)
- ✅ Phase 11.B — Daily Shutdown (`daily_shutdowns` table; `/shutdown` page; `ShutdownView` client component; `completeShutdown` server action; slipped task decisions carry/reschedule/drop/leave; tomorrow top 3; reflection + energy; `shutdown_completed` event logged; sidebar link added)
- ✅ Phase 11.C — Weekly Review (`weekly_reviews` table; `/review` page; `ReviewView` client component; `saveWeeklyReview` server action; `app/api/review/route.ts` for AI summary via `generateObject`; planned vs actual, completed/missed tasks, habit consistency per habit, daily energy from shutdowns, AI summary with top win/learning/next week focus, freeform reflection; `weekly_review_completed` event logged; sidebar link added)
- ✅ Phase 11.D — AI Planner Upgrade (v2 `PlanDay` schema with `tasks[]`, `habits[]`, `focus_blocks[]`, `rationale`; backward-compatible with v1 saved plans via optional fields + `normDay()` fallback; `/api/planner` route accepts `{ mode, targetDay, currentPlan }` body; `rebuild_day` generates 1 day with repair context; `rebuild_rest_of_week` generates today–Sunday with overdue task context; per-item remove (hover × on any task/habit/focus block) is pure client-state; `Rebuild My Day` button on each day card; `Rebuild Rest of Week` button in action bar; no schema migration needed — `plan_json` JSONB accepts any shape)
- ✅ Phase 11.E — Task Intelligence (`carryToTomorrow` server action in `lib/actions/tasks.ts`; UTC-safe tomorrow date mirroring Daily Shutdown carry behavior; `getUrgencyLevel()` in `TaskRow.tsx` returning `overdue | due_today | due_soon | at_risk | normal`; `at_risk` badge for urgent+undated tasks; Carry to Tomorrow (→) hover button for overdue and due-today tasks; overdue row background tint; stronger due-date chip styling per urgency; overdue CTA banner in `TasksView.tsx` with links to `/shutdown` and `/review`; no DB migration, no type changes)
- ✅ Phase 11.F — Focus Mode Upgrade (Planner→Focus URL handoff: `FocusBlockItem` in `PlannerView.tsx` shows hover Play icon linking to `/focus?intent=<text>&duration=45`; `/focus` page reads `searchParams` (Next.js 15 async) and passes `initialIntent`/`initialDuration` to `FocusTimer`; `FocusTimer` prefills goal + duration, selects matching preset or sets custom, shows "From planner" badge; finished state now shows "Xm of Ym planned — stopped early" when stopped early; `saveSession` enriched with `from_planner?: boolean`; activity log `logEvent` payload now includes `goal` and `from_planner`; no DB migration — `payload` column is JSONB; no new tables; no type changes to `FocusSession`)

---

## Design System Status (post Phase 10)

The design system is **locked and launch-ready**. Key decisions:
- `AppShell` (`components/layout/AppShell.tsx`) is the canonical shell for all protected pages
- Sidebar and Header are finalized — do not restructure without an explicit phase requirement
- Notes uses split-pane master-detail with extracted `NoteEditor` — use this pattern for similar features
- Token system lives in `globals.css` and `tailwind.config.ts` — do not casually alter base tokens
- New components must match: surface hierarchy, `rounded-xl`, elevated card treatment, border conventions

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
12. **AI Assistant (`/assistant`)** — Phase 7A. API route at `app/api/chat/route.ts` uses Vercel AI SDK `streamText` + `@ai-sdk/openai` (gpt-4o-mini). Auth is enforced via `createClient()` inside the route — same cookie-based session as every other server action. Context (tasks, habits, profile) is fetched per-request and serialized into the system prompt. The `create_task` tool inserts directly via the server-scoped Supabase client (already authenticated). Requires `OPENAI_API_KEY` in `.env.local`. No DB schema changes needed.
13. **AI Planner (`/planner`)** — Phase 7B + upgraded in Phase 11.D. API route at `app/api/planner/route.ts` uses `generateObject` with a Zod schema. The route now accepts an optional JSON body: `{ mode: 'full' | 'rebuild_day' | 'rebuild_rest_of_week', targetDay?: string, currentPlan?: GeneratedPlan }`. For rebuild modes it also fetches overdue tasks and passes the current plan as context so the AI repairs rather than starts fresh. `PlanDay` is backward-compatible: v1 plans have `focusBlock/topTasks/habitReminder/notes`; v2 plans have `tasks/habits/focus_blocks/rationale` — all fields are optional; `normDay()` in PlannerView reads v2 with v1 fallback. `savePlan` server action is unchanged — it upserts `plan_json` JSONB. `zod` must stay at v3 (`zod@3`); v4 breaks the AI SDK tool schema validation.
14. **`zod` version lock** — Must stay at `zod@3.x`. The `@ai-sdk/openai` package has `peerDependencies: { zod: "^3.0.0" }`. Installing `zod@4` causes silent runtime failures in tool parameter validation.

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
OPENAI_API_KEY=sk-your_open-api-key
```

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

## Product Identity

**LifeOPS = AI operating system for students and early-career builders.**

Core promise: turn goals into a realistic week, execute it, and recover when life shifts.

Core loop: **Goals → AI weekly plan → daily execution → focus sessions → tasks/habits/notes/docs stay connected → daily shutdown → weekly review → replanning.**

Every new feature should strengthen this loop. If a feature does not strengthen the loop, it is probably noise.

---

## Phase 11 — Core Operating Loop (Next)

**Goal:** Make LifeOPS smarter and more useful day to day. This is the most important next phase.

### Phase 11.A — Activity Log Foundation
Add the append-only event telemetry table to Supabase. Everything else in Phase 11 depends on this.

**Table:** `user_activity_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → profiles; RLS scoped |
| `event_type` | TEXT | see list below |
| `entity_type` | TEXT | e.g. `task`, `habit`, `focus_session` |
| `entity_id` | UUID | nullable |
| `occurred_at` | TIMESTAMPTZ | default now() |
| `payload` | JSONB | optional metadata |

**Event types to log:**
`task_completed`, `task_uncompleted`, `focus_session_completed`, `focus_session_stopped_early`, `habit_checked`, `habit_skipped`, `plan_generated`, `plan_saved`, `shutdown_completed`, `weekly_review_completed`

**Important:** This table is for telemetry, reviews, history, and analytics. It is NOT the source of truth for core relational state. Core tables (`tasks`, `habits`, `focus_sessions`, etc.) remain the source of truth.

### Phase 11.B — Daily Shutdown
An end-of-day workflow surface (`/shutdown`) showing:
- What got done today
- What slipped
- What gets carried forward / rescheduled / dropped
- Tomorrow's top 3
- Short reflection or energy note
- Writes `shutdown_completed` event to `user_activity_logs`

### Phase 11.C — Weekly Review
A weekly review surface (`/review`) showing:
- Planned vs actual
- Missed and completed tasks
- Focus time this week
- Habit consistency
- AI summary of what to change next week
- Writes `weekly_review_completed` event to `user_activity_logs`

### Phase 11.D — AI Planner Upgrade
Improve the existing `/planner`:
- Better structure: tasks vs habits vs focus blocks clearly separated
- "Rebuild my day" and "rebuild my week" flows
- Clearer rationale for why work is scheduled where it is
- Better saved-plan editing / repair flow

### Phase 11.E — Task Intelligence
- At-risk task logic (overdue + upcoming urgency signals)
- "Carry to tomorrow" action
- Stronger due-date urgency display
- Direct linkage into shutdown and weekly review

### Phase 11.F — Focus Mode Upgrade
- Planned vs actual tracking
- Completion / abandonment feeding into weekly review
- Interruption / early stop tracking if supported
- "Start next planned block" shortcut from planner or dashboard

---

## Phase 12 — Premium Product Feel + Retention

**Goal:** Make the app feel faster, more intentional, and more habit-forming.

### Phase 12.A — Command Palette
Global Cmd+K / Ctrl+K palette for: navigation, create task, start focus, open planner, search notes, open vault, run daily shutdown, run weekly review.

### Phase 12.B — Templates
Pre-built weekly plan templates: exam prep week, internship hunt sprint, coding interview prep, deep work week, gym + study balance, side-project launch.

### Phase 12.C — Feedback Widget
Floating entry point for bug reports / feature ideas / general feedback. Stored in Supabase.

### Phase 12.D — Activity Heatmap
GitHub-style heatmap for focus sessions, completed tasks, or habit consistency. Best placed on profile or weekly review surface.

### Phase 12.E — Habits Intelligence
Missed habits and completion patterns feed into planning/review. Trend display alongside streak — not only streak.

---

## Phase 13 — Intelligence Moat

**Goal:** Make LifeOPS feel smart, not just polished.

### Phase 13.A — Workload Realism + Auto-Replanning
- Available-hours vs planned-hours comparison
- Overload detection; deadline-risk detection
- "Repair this day / repair this week" flows
- Suggestions after missed work blocks

### Phase 13.B — Notes / Docs / Vault Linking
- Notes and documents linked to projects/tasks/plans/reviews
- "Used in this week's plan" surface
- Stronger metadata and relevance display

### Phase 13.C — Chat with Your Vault (RAG)
Lightweight RAG over user notes and documents:
- Use chunk-based retrieval (not one embedding per full long document)
- Each chunk: `user_id`, `source_type`, `source_id`, `chunk_index`, `content`, `embedding`
- Enable Supabase vector support; embed query; retrieve top chunks; answer from chunks with source citations
- Scope all retrieval by `user_id`; answer only from retrieved user-owned content
- Do not overbuild with a giant framework — start with a lightweight MVP
- Build this only after Phase 13.B (notes/docs data structure is ready)

---

## Phase 14 — Real-World Integration

**Goal:** Make LifeOPS more useful in actual daily scheduling.

### Phase 14.A — Calendar Integration Foundation
- Read-only import of calendar events into the planner view
- Display real events alongside planned work blocks
- Foundation layer before two-way sync

### Phase 14.B — Two-Way Calendar Sync
- Google / Outlook two-way sync
- Push time-blocked work out to calendar
- Pull real events back; planning respects real availability
- Build this only after Phase 11.D (AI Planner upgrade) is stable

---

## Phase 15 — Platform Polish + Installability

**Goal:** Make the app more "app-like."

### Phase 15.A — PWA
Web app manifest, installable behavior, app-like shell.

### Phase 15.B — Staged Offline Support
Shell/offline-friendly caching first. Queued writes and deep offline sync only later if truly needed.

---

## Cross-Cutting Ongoing Upgrade Tracks

These are not separate phases but ongoing improvements as we go:

| Feature | Ongoing upgrade |
|---|---|
| AI Planner | Rebuild day/week; better realism; clearer task/habit/focus separation; better explanations |
| Tasks | Risk/urgency; carry-forward logic; planner/review linkage |
| Focus | Stronger write-back into reviews and planner realism; better completion outcome tracking |
| Habits | Missed habits affect replanning/review; trend, not only streak |
| Notes/Vault | Stronger linkage to tasks/projects/plans; support future RAG well |

---

## Build Execution Order

| # | Phase | Description |
|---|---|---|
| 1 | 11.A | ✅ Activity Log Foundation |
| 2 | 11.B | ✅ Daily Shutdown |
| 3 | 11.C | Weekly Review |
| 4 | 11.D | AI Planner Upgrade |
| 5 | 11.E | Task Intelligence |
| 6 | 11.F | Focus Mode Upgrade |
| 7 | 12.A | Command Palette |
| 8 | 12.B | Templates |
| 9 | 12.C | Feedback Widget |
| 10 | 12.D | Activity Heatmap |
| 11 | 12.E | Habits Intelligence |
| 12 | 13.A | Workload Realism + Auto-Replanning |
| 13 | 13.B | Notes / Docs / Vault Linking |
| 14 | 13.C | Chat with Your Vault (RAG) |
| 15 | 14.A | Calendar Integration Foundation |
| 16 | 14.B | Two-Way Calendar Sync |
| 17 | 15.A | PWA |
| 18 | 15.B | Staged Offline Support |
