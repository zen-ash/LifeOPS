# LifeOPS — Project State
_Last updated: Phase 16.C complete_

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
| File storage | Supabase Storage (`vault` + `vault_media` private buckets — vault since 4C, vault_media since 15.A) |
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
│   ├── add_weekly_plans.sql           ← Phase 7B
│   ├── add_activity_log.sql           ← Phase 11.A
│   ├── add_daily_shutdowns.sql        ← Phase 11.B
│   ├── add_weekly_reviews.sql         ← Phase 11.C
│   ├── add_user_feedback.sql          ← Phase 12.C
│   ├── add_habit_skip_logs.sql        ← Phase 12.E
│   ├── add_vault_links.sql            ← Phase 13.B
│   ├── add_vault_embeddings.sql       ← Phase 13.C
│   ├── add_calendar_events.sql        ← Phase 14.A
│   ├── add_calendar_sync.sql          ← Phase 14.B
│   ├── add_vault_media.sql            ← Phase 15.A
│   ├── add_pdf_parsing.sql            ← Phase 15.B
│   └── add_project_tags.sql           ← Phase 16.A
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
    │   │   ├── review/route.ts         ← Phase 11.C: generateObject weekly review AI summary
    │   │   ├── vault/route.ts          ← Phase 13.C: RAG endpoint (embed query → match_embeddings RPC → answer)
    │   │   ├── calendar/
    │   │   │   ├── connect/route.ts    ← Phase 14.A: GET redirects to Google OAuth consent (full calendar scope)
    │   │   │   └── callback/route.ts  ← Phase 14.A: exchanges code for tokens, upserts calendar_connections
    │   │   ├── transcribe/route.ts     ← Phase 15.A: Whisper audio transcription endpoint
    │   │   ├── process-pdf/route.ts    ← Phase 15.B: PDF text extraction endpoint (maxDuration=30)
    │   │   └── copilot/route.ts        ← Phase 15.C: NL command parse-only endpoint (returns tool call, never mutates)
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
    │   │   └── command.tsx             ← Phase 12.A: cmdk wrapper
    │   ├── command-palette/
    │   │   ├── CommandPalette.tsx      ← Phase 12.A: Cmd+K palette (+ Submit Feedback in 12.C; + Ask Co-Pilot in 15.C)
    │   │   └── CopilotDialog.tsx       ← Phase 15.C: 3-step NL command dialog (input → preview → execute)
    │   ├── dashboard/
    │   │   └── ActivityHeatmap.tsx     ← Phase 12.D: GitHub-style activity heatmap (52 weeks, 4-level scale)
    │   ├── feedback/
    │   │   └── FeedbackDialog.tsx      ← Phase 12.C: bug/feature/general feedback dialog
    │   ├── projects/
    │   │   ├── ProjectCard.tsx         ← Phase 16.A: inline status dropdown; tag badges; onSelect for hub
    │   │   ├── AddProjectDialog.tsx, EditProjectDialog.tsx
    │   │   ├── ProjectsView.tsx        ← Phase 16.A: status tabs; type pills; TagFilterBar; hub state
    │   │   └── ProjectHubPanel.tsx     ← Phase 16.A: lazy slide-over hub; linked tasks/docs/notes; tag editor
    │   ├── tasks/
    │   │   ├── AddTaskDialog.tsx, EditTaskDialog.tsx
    │   │   ├── TaskRow.tsx, TasksView.tsx
    │   ├── focus/
    │   │   ├── FocusTimer.tsx, SessionHistory.tsx
    │   ├── habits/
    │   │   ├── AddHabitDialog.tsx, EditHabitDialog.tsx
    │   │   ├── WeekdayPicker.tsx, HabitsView.tsx
    │   │   ├── HabitCard.tsx           ← Phase 12.E: individual habit card with skip/complete + 7-day strip
    │   │   └── HabitsDashboardWidget.tsx
    │   ├── calendar/
    │   │   └── CalendarView.tsx
    │   ├── notes/
    │   │   ├── NoteDialog.tsx, NoteCard.tsx, NotesView.tsx
    │   │   └── NoteEditor.tsx          ← Phase 10C: split-pane right-side inline note editor
    │   ├── documents/
    │   │   ├── DocumentUploadDialog.tsx, DocumentCard.tsx, DocumentsView.tsx
    │   ├── vault/
    │   │   ├── VaultDialog.tsx         ← Phase 13.C: Ask Second Brain Q&A dialog
    │   │   └── VoiceMemoDialog.tsx     ← Phase 15.A: Voice Brain Dump record + transcribe
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
    │   │   ├── projects.ts             ← addProject, editProject, updateProjectStatus, deleteProject, getProjectHubData (Phase 16.A)
    │   │   ├── tasks.ts                ← addTask, editTask, deleteTask, toggleTaskStatus, rescheduleTask, carryToTomorrow, createTaskDirect, rescheduleMultipleTasks
    │   │   ├── focus.ts                ← saveSession (with from_planner; enriched logEvent payload), deleteSession
    │   │   ├── habits.ts               ← addHabit, editHabit, deleteHabit, logHabit, unlogHabit, convertHabitToTask, applyFreeze
    │   │   ├── notes.ts                ← addNote, editNote, deleteNote, togglePin, saveTranscriptAsNote
    │   │   ├── embeddings.ts           ← refreshNoteEmbeddings, refreshDocumentEmbeddings (50-chunk PDF), refreshDocumentNameEmbedding (legacy alias)
    │   │   ├── documents.ts            ← addDocument, editDocument, deleteDocument
    │   │   ├── tags.ts                 ← setTaskTags, setNoteTags, setDocumentTags (Phase 5A); setProjectTags (Phase 16.A)
    │   │   ├── savedViews.ts           ← createSavedView, deleteSavedView, renameSavedView (Phase 5B)
    │   │   ├── studyBuddy.ts           ← sendBuddyRequest, respondToBuddyRequest, removeBuddy (Phase 6A)
    │   │   ├── planner.ts              ← savePlan (upsert weekly_plans) (Phase 7B)
    │   │   ├── activityLog.ts          ← logEvent helper (Phase 11.A; no 'use server')
    │   │   ├── links.ts                ← Phase 13.B: linkNoteToTask, unlinkNoteFromTask, linkDocumentToTask, unlinkDocumentFromTask
    │   │   ├── shutdown.ts             ← completeShutdown server action (Phase 11.B)
    │   │   ├── review.ts               ← saveWeeklyReview server action (Phase 11.C)
    │   │   ├── calendar.ts             ← Phase 14.A/B: isCalendarConnected, getFreshAccessToken (exported), syncCalendarEvents
    │   │   ├── calendarActions.ts      ← Phase 14.A/B: disconnectCalendar, syncPlanToCalendar server actions
    │   │   └── calendarSync.ts         ← Phase 14.B: syncPlanFocusBlocksToCalendar (core write logic, no 'use server')
    │   ├── utils.ts                    ← cn() helper
    │   └── templates.ts                ← Phase 12.B: 6 static PlannerTemplate definitions + TEMPLATE_BY_ID lookup
    │
    ├── types/index.ts                  ← Profile, Project, Task, Note, Document, FocusSession, Habit, HabitLog, HabitFreezeLog, HabitSkipLog, Tag, SavedView, StudyBuddy, LeaderboardEntry, CalendarEvent, WeeklyPlan, GeneratedPlan, PlanDay, DailyShutdown, WeeklyReview, WeeklyMetrics, ReviewAISummary, ActivityLog, PlannerTemplate
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
| `habit_skip_logs` | Active | Phase 12.E: intentional rest days; `UNIQUE(habit_id, skip_date)`; distinct from freeze and missed |
| `tags` | Active | Normalized tag table per user; `UNIQUE(user_id, name)` |
| `task_tags` | Active | Join: task ↔ tag; `PRIMARY KEY(task_id, tag_id)` |
| `note_tags` | Active | Join: note ↔ tag (notes + journal); `PRIMARY KEY(note_id, tag_id)` |
| `document_tags` | Active | Join: document ↔ tag; `PRIMARY KEY(document_id, tag_id)` |
| `project_tags` | Active | Phase 16.A join: project ↔ tag; `PRIMARY KEY(project_id, tag_id)`; cascade on both FKs; RLS |
| `saved_views` | Active | Named filter presets per user per entity_type; `filters_json JSONB` |
| `study_buddies` | Active | Peer-to-peer buddy requests; `status` pending/accepted/declined; Phase 6A |
| `get_weekly_leaderboard(p_timezone)` | Active RPC | SECURITY DEFINER function; aggregates focus/tasks/habits for self+buddies this week; Phase 6B |
| `weekly_plans` | Active | AI-generated weekly plans; `UNIQUE(user_id, week_start_date)`; upsert on re-save; `plan_json` JSONB |
| `user_activity_logs` | Active | Append-only telemetry; `event_type`, `entity_type`, `entity_id`, `payload` JSONB; Phase 11.A |
| `daily_shutdowns` | Active | One row per user per day; `UNIQUE(user_id, shutdown_date)`; `completed_tasks`/`slipped_decisions`/`tomorrow_top3` JSONB; Phase 11.B |
| `weekly_reviews` | Active | One row per user per week; `UNIQUE(user_id, week_start)`; `metrics_json` JSONB; `ai_summary` JSONB; Phase 11.C |
| `note_task_links` | Active | Phase 13.B junction: note↔task many-to-many; `UNIQUE(note_id, task_id)`; cascade on both FKs; RLS via user_id |
| `document_task_links` | Active | Phase 13.B junction: document↔task many-to-many; `UNIQUE(document_id, task_id)`; cascade on both FKs; RLS via user_id |
| `vault_embeddings` | Active | Phase 13.C: `vector(1536)` chunks from notes (and document names); explicit `note_id`/`document_id` FKs with cascade delete; HNSW index; RLS; `match_embeddings` SECURITY DEFINER RPC uses `auth.uid()` |
| `calendar_connections` | Active | Phase 14.A: Google OAuth tokens per user; `UNIQUE(user_id)`; access/refresh tokens stored server-side only; RLS |
| `calendar_events` | Active | Phase 14.A/B: cached Google Calendar events; `UNIQUE(user_id, provider_event_id)`; RLS; `is_lifeops_managed boolean` (Phase 14.B) — true when LifeOPS pushed the event; index on `(user_id, start_time)` |
| `calendar_sync_mappings` | Active | Phase 14.B: maps LifeOPS focus blocks → Google event IDs; `UNIQUE(user_id, week_start, day_name, block_text)`; RLS; index on `(user_id, week_start)` |
| `study_groups` | Schema only | Group-based study rooms — future phase |
| `study_group_members` | Schema only | Group membership — future phase |

### Key columns to know

**`habits`**: `title` (NOT `name`), `frequency`, `target_days_per_week`, `selected_weekdays TEXT[]`, `linked_project_id`, `freeze_days_available` (default 3), `grace_window_hours` (default 2), `is_active`

**`notes`**: `type TEXT` (either `'note'` or `'journal'`), `is_pinned`, `tags TEXT[]`, `project_id`

**`documents`**: `name`, `file_path` (path in vault/vault_media bucket), `file_type`, `file_size`, `project_id`, `updated_at`, `extracted_text TEXT NULL` (Phase 15.B), `parse_status TEXT DEFAULT 'none'` (Phase 15.B — values: `none|pending|done|no_text|failed`)

**`tasks`**: `status` (`todo`|`in_progress`|`done`|`cancelled`), `priority` (`low`|`medium`|`high`|`urgent`), `due_date`, `tags TEXT[]`, `estimated_minutes`

### RLS

All tables have RLS enabled with `FOR ALL USING (auth.uid() = user_id)` (or `= id` for profiles). Never disable.

### Supabase Storage

- **Buckets:** `vault` (PDFs + images, private) and `vault_media` (TXT/MD files, private — Phase 15.A)
- **Path format:** `<user_id>/<timestamp>-<sanitized_filename>`
- **Policies:** INSERT/SELECT/DELETE on `storage.objects` scoped to the bucket and `auth.uid()::text = (string_to_array(name, '/'))[1]`
- **Routing:** `bucketForType(mimeType)` in `DocumentUploadDialog` — `text/*` → `vault_media`; everything else → `vault`; `deleteDocument` determines bucket from stored `file_type`
- **Downloads:** via 1-hour signed URLs (generated browser-side via `createClient()`)
- **Uploads:** client-side upload → then `addDocument` server action inserts DB row; on DB failure, orphaned file is cleaned up from same bucket
- **Voice memos:** NOT stored — audio Blob is discarded after Whisper transcription; transcript saved as a Note

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
| `add_user_feedback.sql` | 12.C | Yes — creates `user_feedback` table with INSERT-only RLS |
| `add_habit_skip_logs.sql` | 12.E | Yes — creates `habit_skip_logs` table with RLS + index |
| `add_vault_links.sql` | 13.B | Yes — creates `note_task_links` + `document_task_links` tables with RLS |
| `add_vault_embeddings.sql` | 13.C | Yes — enables pgvector; creates `vault_embeddings` table + HNSW index + RLS + `match_embeddings` SECURITY DEFINER RPC |
| `add_calendar_events.sql` | 14.A | Yes — creates `calendar_connections` + `calendar_events` tables with RLS |
| `add_calendar_sync.sql` | 14.B | Yes — `ALTER TABLE calendar_events ADD COLUMN is_lifeops_managed`; creates `calendar_sync_mappings` table with RLS + index |
| `add_vault_media.sql` | 15.A | Yes — creates `vault_media` private Storage bucket (10 MB limit, text/plain + text/markdown + text/x-markdown + image/* MIME); 3 RLS policies scoped to user path prefix |
| `add_pdf_parsing.sql` | 15.B | Yes — `ALTER TABLE documents ADD COLUMN extracted_text TEXT, ADD COLUMN parse_status TEXT NOT NULL DEFAULT 'none'` |
| `add_project_tags.sql` | 16.A | Yes — creates `project_tags` join table with RLS; additive only; mirrors `task_tags`/`note_tags`/`document_tags` pattern |

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
8. **Activity Heatmap** (`ActivityHeatmap`) — Phase 12.D: GitHub-style 52-week grid; task_completed/focus_session_completed/habit_checked; 4-level color scale; native title tooltips
9. **Projects** — full project grid with AddProjectDialog

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
- ✅ Phase 12.A — Global Command Palette (`cmdk` installed; `components/ui/command.tsx` hand-written shadcn Command primitives; `components/command-palette/CommandPalette.tsx` with 3 groups: Navigation (13 items), Actions (Ask Co-Pilot + Create Task + Start Focus Session + Ask Second Brain + Voice Brain Dump + Submit Feedback — expanded by later phases), Review & Recovery (Daily Shutdown + Weekly Review); Cmd+K/Ctrl+K keyboard shortcut via `document.addEventListener` in `CommandPalette`; `open` state lifted to `AppShell`; `⌘K` hint button added to `Header` (hidden on mobile); no DB changes; no new routes)
- ✅ Phase 12.B — Planner Templates (6 static templates in `lib/templates.ts`: Exam Prep, Internship Hunt, Coding Interview, Deep Work, Gym + Study, Side-Project Launch; template picker card grid in `PlannerEmptyState` with accent colors, focus-area pills, and toggle selection; `selectedTemplate` state in `PlannerView` persists across all generate/rebuild calls; `templateId` accepted in `app/api/planner/route.ts` body; resolved via `TEMPLATE_BY_ID` lookup; `planning_emphasis` injected as `## Weekly Template` section in system prompt; no DB changes; fully backward-compatible — templateId is optional)
- ✅ Phase 12.C — Feedback Widget (`supabase/add_user_feedback.sql` migration: `user_feedback` table with INSERT-only RLS, no read/update/delete policies; `lib/actions/feedback.ts` server action validates type + trims message; `components/feedback/FeedbackDialog.tsx` — Dialog with category pills (bug/feature/general), textarea, pathname-captured route context, inline success state + 1.5s auto-close; `Sidebar.tsx` gets `onOpenFeedback?` prop + "Share feedback" button above user footer; `CommandPalette.tsx` gets `onOpenFeedback?` prop + "Submit Feedback" CommandItem that closes palette then opens dialog; `feedbackOpen` state in `AppShell` shared between both triggers; **manual step required**: run `add_user_feedback.sql` in Supabase SQL editor)
- ✅ Phase 12.D — Activity Heatmap (GitHub-style 52-week contribution grid on `/dashboard`; signals: `task_completed` + `focus_session_completed` + `habit_checked` from `user_activity_logs`; server-side UTC date aggregation in dashboard page; builds complete day array from prior 52-week Sunday to today including zero-activity days; `components/dashboard/ActivityHeatmap.tsx` — pure presentational component; CSS Grid with `gridTemplateColumns: repeat(weekCount, 1fr)` stretches to card width; 4-level color scale; native `title` tooltip; Mon/Thu row labels; legend; horizontally scrollable on mobile; no new DB table, no SQL migration)
- ✅ Phase 12.E — Habits Intelligence (`supabase/add_habit_skip_logs.sql`: `habit_skip_logs` table with `UNIQUE(habit_id, skip_date)` and INSERT-only-style RLS; `skipHabit`/`unskipHabit` server actions in `lib/actions/habits.ts`; `unlogHabit` event renamed from `habit_skipped` → `habit_unchecked`; `HabitCard` gains `skipDates` prop, Skip button with amber active state, amber color in 7-day history strip for skipped days, 14-day consistency display "X/14 days" + ↑↓ trend arrow computed client-side from existing logs; `habit_skip_logs` queried in habits page, review page, shutdown page; Daily Shutdown gains "Today's habits" section listing all habits due today with optimistic Complete/Skip buttons preserving form state; `HabitConsistencyItem` gains `skippedCount?`; Weekly Review AI prompt now distinguishes intentional skips from plain misses: "Meditation: 4/7 days (57%) (2 intentionally skipped), 1 missed"; **manual step required**: run `add_habit_skip_logs.sql` in Supabase SQL editor)
- ✅ Phase 13.A — Workload Realism + Auto-Replanning (no new DB migration needed; `planner/page.tsx` fetches `profiles.study_hours_per_week` + pending tasks; computes `availableMinutesPerDay` and `atRiskTasks`; `PlannerView` accepts realism props; `useMemo`-derived `overloadMap` (tasks×30 + focus_blocks×45 vs available); amber "Full" badge on overloaded day cards; risk/overload banner above plan grid with "Repair Rest of Week" button; `repairContext` injected into both `handleRebuildDay` and `handleRebuildRestOfWeek` API calls when risk signals exist; `api/planner/route.ts` accepts `repairContext`, injects "Workload Realism Warning" into system prompt, adds `deferredTasks` optional field to `planSchema`; `GeneratedPlan.deferredTasks?: string[]` added to types; deferred tasks section shown below plan grid)
- ✅ Phase 14.A — Calendar Integration Foundation (`supabase/add_calendar_events.sql`: `calendar_connections` table (UNIQUE on `user_id`, stores Google OAuth tokens server-side); `calendar_events` table (UNIQUE `(user_id, provider_event_id)`, RLS, index on `(user_id, start_time)`); `lib/actions/calendar.ts`: `isCalendarConnected(userId)`, `getFreshAccessToken(userId)` refreshes via `oauth2.googleapis.com/token` when `expires_at` within 60s, removes broken connections; `syncCalendarEvents(userId, weekStart, weekEnd)` calls Google Calendar API with `singleEvents=true`, filters cancelled + transparent events, delete-and-reinsert cached events; `lib/actions/calendarActions.ts`: `disconnectCalendar()` server action deletes connection + all events + `revalidatePath('/planner')`; `/api/calendar/connect/route.ts`: GET redirects to Google OAuth consent (scope: full `https://www.googleapis.com/auth/calendar`); `/api/calendar/callback/route.ts`: exchanges code for tokens, upserts `calendar_connections`, redirects to `/planner?calendar=connected`; `components/planner/CalendarConnectBanner.tsx`: shows "Connect Google Calendar" link (not connected) or green dot + disconnect button (connected); `planner/page.tsx`: calls `isCalendarConnected` + `syncCalendarEvents` server-side, builds `calendarEventsByDay` and `calendarBusyMinutesByDay` via UTC date mapping, passes to `PlannerView`; `PlannerView.tsx`: `computeOverload` now subtracts `calendarBusyByDay[day]` from available minutes; `DayCard` renders read-only sky-blue "Calendar" section above focus blocks; all calendar props optional — planner is fully backward-compatible when not connected)
- ✅ Phase 14.B — Two-Way Calendar Sync (`supabase/add_calendar_sync.sql`: `ALTER TABLE calendar_events ADD COLUMN is_lifeops_managed boolean NOT NULL DEFAULT false`; new `calendar_sync_mappings` table with `UNIQUE(user_id, week_start, day_name, block_text)` — maps planner focus block text to Google event IDs; RLS; index on `(user_id, week_start)`; `lib/actions/calendarSync.ts`: `syncPlanFocusBlocksToCalendar(accessToken, userId, weekStart, plan)` iterates all focus blocks, creates new Google events (title `[LifeOPS] <text>`, `extendedProperties.private.lifeops_managed = "true"`, 09:00–09:45 UTC) or patches existing, deletes stale events when blocks removed; 404 on PATCH triggers cleanup + recreate; 403 returns human-readable reconnect error; `lib/actions/calendar.ts`: `extendedProperties` added to Google API type; `is_lifeops_managed` detected and stored on insert; `getFreshAccessToken` now exported; `lib/actions/calendarActions.ts`: `syncPlanToCalendar(weekStart, plan)` server action; `disconnectCalendar` also deletes `calendar_sync_mappings`; `/api/calendar/connect/route.ts`: OAuth scope is full `https://www.googleapis.com/auth/calendar`; `planner/page.tsx`: `calendarBusyMinutesByDay` excludes `is_lifeops_managed` events (double-count prevention); passes `calendarConnected` to `PlannerView`; `PlannerView.tsx`: DayCard Calendar section filters out `is_lifeops_managed` events; "Sync to Calendar" button in action bar; `markDirty` resets sync status; `types/index.ts`: `is_lifeops_managed: boolean` added to `CalendarEvent`; **required setup**: run `add_calendar_sync.sql` in Supabase SQL editor; existing 14.A users must disconnect + reconnect to get write scope)
- ✅ Phase 13.C — Chat with Your Vault (`supabase/add_vault_embeddings.sql`: `CREATE EXTENSION vector`; `vault_embeddings` table with `note_id`/`document_id` explicit nullable FKs (cascade), `embedding vector(1536)`, HNSW cosine index, RLS; `match_embeddings(query_embedding, match_count)` SECURITY DEFINER function uses `auth.uid()` internally — caller cannot bypass user filter; `lib/actions/embeddings.ts`: `chunkText()` splits on paragraphs then sentence boundaries (max 500 chars, 15 chunks); `refreshNoteEmbeddings(noteId, userId, title, content)` delete-and-reinsert via `embedMany()` batch call; `refreshDocumentNameEmbedding(documentId, userId, name)` embeds document name as single lightweight chunk; `lib/actions/notes.ts` + `lib/actions/documents.ts`: `after()` from `next/server` fires embedding refresh post-response, wrapped in try/catch so failure never breaks the save; cascade delete on `note_id`/`document_id` handles embedding cleanup on deletion; `app/api/vault/route.ts`: embeds query with `text-embedding-3-small`, calls `match_embeddings` RPC, filters to similarity > 0.3, builds grounded prompt that prohibits outside-knowledge answers, returns `{ answer, sources }`; fallback: "I don't have this in your notes."; `components/vault/VaultDialog.tsx`: compact Dialog with textarea, loading state, answer + source chips, "ask another" reset; `components/command-palette/CommandPalette.tsx`: "Ask Second Brain" callback command item; `components/layout/AppShell.tsx`: `vaultOpen` state + `VaultDialog` mounted globally; **manual steps required**: 1) enable pgvector in Supabase Dashboard → Extensions; 2) run `add_vault_embeddings.sql` in SQL editor)
- ✅ Phase 15.C — Co-Pilot Command Line (natural-language command entry in ⌘K palette; `app/api/copilot/route.ts`: auth-gated, fetches up to 15 active tasks for context, calls OpenAI `gpt-4o-mini` via Vercel AI SDK `generateText` with `toolChoice: 'required'` + `maxSteps: 1`; tools: `create_task(title, priority, due_date, estimated_minutes)` + `reschedule_tasks(task_ids[], task_titles[], new_date)` — both strict Zod schemas; client sends `localDate`/`localDayName`/`timezone` captured at click time so relative date phrases resolve to the user's local TZ; route returns `{ tool, args }` — never executes; `components/command-palette/CopilotDialog.tsx`: 6-state machine `input → parsing → preview → executing → done | error`; `PreviewCard` renders human-readable summary of the pending action; "Rethink" returns to input with prompt preserved; on confirm calls `createTaskDirect` or `rescheduleMultipleTasks` then `router.refresh()`; `lib/actions/tasks.ts`: `createTaskDirect(data)` — object-based task creation bypassing FormData; `rescheduleMultipleTasks(taskIds, newDate)` — single batch UPDATE WHERE id IN (...); both call `revalidateTaskPaths()`; `CommandPalette.tsx`: "Ask Co-Pilot" item at top of Actions group with `onOpenCopilot` callback; `AppShell.tsx`: `copilotOpen` state + `CopilotDialog` mounted globally; no DB migration needed; no destructive tools)
- ✅ Phase 15.B — Advanced Document Parsing / PDF Ingestion (`supabase/add_pdf_parsing.sql`: `extracted_text TEXT NULL` + `parse_status TEXT NOT NULL DEFAULT 'none'` on `documents`; `next.config.ts`: `serverExternalPackages: ['pdf-parse', 'pdfjs-dist']` prevents webpack from bundling these packages (pdf-parse v2 uses pdfjs-dist internally); `app/api/process-pdf/route.ts`: `maxDuration = 30`; auth + ownership check; downloads PDF from `vault` bucket; `pdf-parse` extracts text; updates `extracted_text` + `parse_status` (`done`/`no_text`/`failed`); re-embeds with full text via `after()` using `refreshDocumentEmbeddings`; `revalidatePath`; `lib/actions/embeddings.ts`: `chunkText` gets optional `maxChunks` param (default 15); new `refreshDocumentEmbeddings(id, userId, name, extractedText)` — with text: up to 50 chunks of full content; without text: name-only (backwards-compat); `refreshDocumentNameEmbedding` now aliases to `refreshDocumentEmbeddings(…, null)`; `lib/actions/documents.ts`: `addDocument` accepts `parse_status?: 'none' | 'pending'`; `editDocument` SELECTs current `extracted_text` before re-embedding so a rename never wipes PDF content; both use `refreshDocumentEmbeddings`; `DocumentUploadDialog`: PDF path shows "Processing…" step label + hint text; calls `/api/process-pdf`; amber `parseWarning` for `no_text`; red error + keep-open for `failed`; `router.refresh()` after any PDF outcome; `DocumentCard` + `DocumentsView` + documents `page.tsx`: `parse_status` threaded through; card shows "Processing…" / "No text found" / "Parse failed" badges; **manual step required**: run `add_pdf_parsing.sql` in Supabase SQL editor)
- ✅ Phase 16.B — Data Cleanliness (no schema changes; Notes/Journal tag separation: `notes/page.tsx` and `journal/page.tsx` now build a `noteIds` / `journalIds` Set from the already-type-filtered entries and use it to filter `tagsByNoteId`, ensuring the `TagFilterBar` on `/notes` only surfaces Note tags and the bar on `/journal` only surfaces Journal tags; project-scoped task linking: `documents/page.tsx`, `notes/page.tsx` now select `project_id` on the tasks query and cast it through; `DocumentsView.tsx`, `DocumentCard.tsx`, `NotesView.tsx`, `NoteEditor.tsx` updated with `project_id: string | null` on `TaskOption`; `DocumentCard` and `NoteEditor` filter `unlinkableTasks` by the currently selected `editProjectId` / `projectId` — no project → show all tasks; existing cross-project linked chips remain visible for backward compatibility; `NoteEditor.handleSave` wrapped in `try/finally` to guarantee `setSaving(false)` executes even when a server action throws; journal page passes explicitly typed empty `tasks` array to satisfy updated `TaskOption` interface; no 16.C or 16.D drift)
- ✅ Phase 16.C — Task Lifecycle Upgrade (`cancelTask` server action sets `status='cancelled'` and clears `completed_at` — not a delete; Ban-icon one-click cancel button on `TaskRow` for all active tasks; dedicated "Canceled" tab in `TasksView` status pills + separate Canceled group in the grouped view below Completed; active task groups (Overdue, Today, Upcoming, No due date) now sorted by `byPriorityThenDue` — urgent first, then high/medium/low, then due date ascending; flat list view also sorted by priority then due date; cancelled tasks rendered with strikethrough, muted opacity, dash checkbox (non-interactive), no carry/cancel buttons — reopen via Edit dialog; no schema migration needed — `cancelled` was already in the DB check constraint, `VALID_STATUSES`, `Task` type, and `EditTaskDialog`; system-wide audit confirmed all consumers (AI Planner, AI Assistant, Co-Pilot, Dashboard, Shutdown, Review, overdue logic, urgency model) already correctly excluded `cancelled` via `in(['todo','in_progress'])` or explicit filters)
- ✅ Phase 16.A — Project-Centric Organization (`supabase/add_project_tags.sql`: `project_tags` join table — additive only, mirrors Phase 5A tag pattern; `setProjectTags` server action in `lib/actions/tags.ts`; `updateProjectStatus` lightweight server action + `getProjectHubData` lazy fetch in `lib/actions/projects.ts`; `/projects` page now fetches `tagsByProjectId` on initial load via parallel Promise.all; `ProjectsView` gains status tabs Active/Completed/Archived/All as primary filter + type pills as secondary + `TagFilterBar` for project tag filtering; `ProjectCard` gains inline status `<select>` with optimistic update + revert-on-error + `TagBadge` display + `onSelect` callback; `ProjectHubPanel` new fixed right-side slide-over — fetches tasks/documents/notes lazily via `getProjectHubData` only when opened, shows linked items as lightweight rows with click-through links, includes `TagInput` + save button for managing project tags; existing `tasks.project_id` / `notes.project_id` / `documents.project_id` FKs treated as the stable relational foundation — no destructive migrations; `projects.status` column was already present in schema — no migration needed for status support)
- ✅ Phase 15.A — Multi-Modal Vault Ingestion (`supabase/add_vault_media.sql`: new `vault_media` private Storage bucket — 10 MB limit, accepts `text/plain` + `text/markdown` + `text/x-markdown` + `image/*`; 3 RLS policies path-scoped to user prefix; `app/api/transcribe/route.ts`: auth-gated Whisper endpoint; receives `audio` Blob from FormData; `audioExtension()` maps MIME → file extension; calls `openai.audio.transcriptions.create({ model: 'whisper-1' })`; audio NOT stored; `lib/actions/notes.ts`: `saveTranscriptAsNote(transcript)` server action — auto-titles `Voice Memo — <date>`, inserts Note, fires `after()` embedding refresh; `components/vault/VoiceMemoDialog.tsx`: state machine `idle → requesting → recording → processing → done | error`; browser `MediaRecorder` API; 60s max with progress bar + animated pulsing indicator; onstop collects Blob → POST `/api/transcribe` → `saveTranscriptAsNote` → show transcript preview + "Open in Notes" link; cleanup stops all stream tracks; `components/documents/DocumentUploadDialog.tsx`: `ACCEPTED_TYPES` extended with text MIME types; `bucketForType()` routes `text/*` to `vault_media` at upload + orphan cleanup; `<input accept>` updated to `.pdf,.jpg,.jpeg,.png,.webp,.txt,.md`; `lib/actions/documents.ts`: `deleteDocument` now fetches `file_type` to determine correct bucket for storage removal; `components/command-palette/CommandPalette.tsx`: "Voice Brain Dump" command item with `onOpenVoice` callback; `components/layout/AppShell.tsx`: `voiceOpen` state + `VoiceMemoDialog` mounted globally; **requires**: `OPENAI_API_KEY` in `.env.local`; run `add_vault_media.sql` in Supabase SQL editor)
- ✅ Phase 13.B — Notes / Docs / Vault Linking (`supabase/add_vault_links.sql`: two junction tables `note_task_links` + `document_task_links` — each with `user_id`, cascade FKs, `UNIQUE(note_id/document_id, task_id)`, and RLS policy; `lib/actions/links.ts`: 4 server actions `linkNoteToTask`, `unlinkNoteFromTask`, `linkDocumentToTask`, `unlinkDocumentFromTask`; `notes/page.tsx` + `documents/page.tsx`: each adds 2 parallel fetches (active tasks + link rows) to existing Promise.all; `NotesView.tsx` + `DocumentsView.tsx`: accept + thread `tasks`/`linkedTaskIds*` props; `NoteEditor.tsx`: "Linked tasks" metadata row below Tags — chips with × unlink + task selector; `DocumentCard.tsx`: linked task chips on card body + "Linked tasks" section in edit dialog with same chip+select pattern; all link/unlink operations are optimistic with server revalidation; backward compatible — existing notes/docs with no links work unchanged; **manual step required**: run `add_vault_links.sql` in Supabase SQL editor)

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
- **Sidebar 404s:** `/settings` will 404 until built — expected and intentional.
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

## Phase 16 — Refinement Sprint

**Status:** Phases 16.A, 16.B, and 16.C are complete. Phase 16.D is next.

**Ordering principle:** Data model first → Data cleanliness second → Operational UX third → Internal tooling last

---

### ✅ Phase 16.A — Project-Centric Organization (complete)

**What was built:**
- `project_tags` join table (additive migration; mirrors `task_tags` / `note_tags` / `document_tags` exactly)
- `setProjectTags` server action in `lib/actions/tags.ts`
- `updateProjectStatus` server action — lightweight single-field update on `projects.status` (column already existed in schema)
- `getProjectHubData` server action — lazily fetches linked tasks, documents, and notes for one project; called only when the hub panel opens, not on initial page load
- `/projects` page: parallel fetch of `project_tags` alongside projects; builds `tagsByProjectId` map
- `ProjectsView`: status tabs (Active / Completed / Archived / All) as primary filter; type pills (All / Projects / Areas / Clients) as secondary; `TagFilterBar` for project tag filtering; `selectedId` state drives hub panel
- `ProjectCard`: inline status `<select>` with optimistic update + server-side revert on failure; `TagBadge` display; `onSelect` prop (optional — dashboard widget continues to work without it)
- `ProjectHubPanel`: fixed right-side slide-over (z-50); lazy-fetches tasks/documents/notes on mount; shows linked items as lightweight rows with click-through navigation; includes `TagInput` + "Save tags" button calling `setProjectTags` + `router.refresh()`
- Existing `tasks.project_id`, `notes.project_id`, `documents.project_id` FKs were already the correct stable relational foundation — no schema changes needed on those tables

**Key architectural decision:** Initial `/projects` page load fetches only projects + their tags (lightweight). Full linked-item data for a specific project is fetched lazily when the hub panel opens — not up front for every project.

**Manual step (already completed):** Run `supabase/add_project_tags.sql` in Supabase SQL Editor.

---

### ✅ Phase 16.B — Data Cleanliness (complete)

**What was built:**
- Notes/Journal tag separation at the server-processing layer (no schema changes): `notes/page.tsx` builds a `noteIds` Set from type='note' entries and filters `tagsByNoteId` to those IDs; `journal/page.tsx` does the same with a `journalIds` Set from type='journal' entries. The `TagFilterBar` on each page now only surfaces tags that actually belong to that entry type.
- Project-scoped task linking across Documents, Notes, and Journals: `DocumentCard`, `NoteEditor` each filter `unlinkableTasks` by the currently selected project — when a project is selected, the picker shows only that project's active tasks; when no project is selected, all active tasks are shown (safe fallback).
- `documents/page.tsx` and `notes/page.tsx` now include `project_id` in the tasks select query so it flows through to the pickers.
- `DocumentsView`, `NotesView` `TaskOption` interfaces updated with `project_id: string | null`.
- `NoteEditor.handleSave` wrapped in `try/finally` — `setSaving(false)` is now guaranteed even if a server action throws, preventing the Save button from getting stuck in a disabled state.
- Journal page passes an explicitly typed empty tasks array to satisfy the updated `TaskOption` interface.
- Existing cross-project task links remain visible and removable (backward compatible — only new linking is scoped).

---

### ✅ Phase 16.C — Task Lifecycle Upgrade (complete)

**What was built:**
- `cancelTask(taskId)` server action in `lib/actions/tasks.ts` — sets `status = 'cancelled'`, clears `completed_at`; intentionally not a delete so cancelled tasks remain in the history
- Ban-icon one-click cancel button on `TaskRow`, visible on hover for all active (non-done, non-cancelled) tasks; confirmation prompt before cancelling
- Cancelled tasks in `TaskRow`: strikethrough title, `opacity-50`, dash in checkbox (non-interactive — cannot toggle), no carry/cancel buttons; reopen by changing status in the Edit dialog
- Dedicated "Canceled" tab added to `TasksView` status pills; Canceled group shown in the grouped view (below Completed) with its own muted section header
- `byPriorityThenDue` sort applied within every active group (Overdue, Today, Upcoming, No due date) and the flat filtered list — urgent tasks rise to the top, then due date ascending, undated tasks last
- No schema migration needed — `'cancelled'` was already in the DB check constraint, `VALID_STATUSES`, `Task` TypeScript type, and `EditTaskDialog` status options
- System-wide audit confirmed all consumers already correctly excluded `cancelled`: AI Planner and AI Assistant (`in(['todo','in_progress'])`), Co-Pilot (`in(['todo','in_progress'])`), Dashboard upcoming tasks (`not('status','in','("done","cancelled")')`), Daily Shutdown slipped/suggestions (`in(['todo','in_progress'])`), Weekly Review missed tasks (`in(['todo','in_progress'])`), overdue CTA count, urgency model, `matchesDueDate` overdue filter

---

### 🔜 Phase 16.D — AI Workspace & UX Safety ← **next implementation target**

**Goal:** Make the AI surface more accessible and protect user relationships.

Planned work:
- Convert the AI Assistant from a standalone page (`/assistant`) into a global side panel / slide-over drawer accessible from any page
- Implement lightweight chat persistence — simple linear conversation history per user session; no branching threads; no complex chat-management UI
- Add an "Are you sure?" confirmation popup before removing a friend in the Study Buddy module

**Guardrail:** Chat persistence must remain simple and linear. Do not introduce branching conversation trees, named threads, or thread-management UI in this phase.

---

### 🔜 Phase 16.E — Admin View

**Goal:** Basic operational visibility for internal use.

Planned work:
- Build a protected admin-only route layout (separate from the `(dashboard)` route group; access controlled by an env-level flag or a hardcoded admin user ID check)
- Basic operational metrics: total users, active tasks, focus sessions in the last 7 days
- Integrate existing Feedback Widget submissions (`user_feedback` table) into the admin dashboard view
