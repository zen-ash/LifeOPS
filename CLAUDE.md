# LifeOPS —  Claude Code Project Rules

## Project Overview
LifeOPS is an AI operating system for students and early-career builders, deployed on Vercel.
The core promise: turn goals into a realistic week, execute it, and recover when life shifts.

**Core loop:** Goals → AI weekly plan → daily execution → focus sessions → tasks/habits/notes/docs stay connected → daily shutdown → weekly review → replanning.

The app must feel like one connected loop, not a collection of unrelated pages. Every new feature should strengthen that loop. Features that do not strengthen the loop are noise.

All phases through 16.C are complete. The app is functionally finished and UI/UX launch-ready.
It is treated as a serious personal product / flagship portfolio project.
Further work focuses on product behavior, retention loops, intelligence, and premium additions — NOT large visual redesigns.

## Exact Stack
- Next.js 15, App Router (no Pages Router)
- TypeScript strict mode
- Tailwind CSS v3
- shadcn/ui (Radix primitives, hand-written — do NOT run `npx shadcn@latest add`)
- Supabase Auth + PostgreSQL + Storage (`@supabase/ssr` package)
- next-themes (dark/light/system)
- React 19

## Non-Negotiable Architecture Rules
- **MVP level only** — no overengineering, no speculative abstractions
- **Vercel-friendly** — no custom servers, no long-running processes, no cron jobs in app code
- **App Router only** — all pages in `app/`, data fetching in Server Components or Server Actions
- **Server Actions for all mutations** — `lib/actions/*.ts` with `'use server'`, no custom API routes for CRUD. Exception: `app/api/chat/route.ts` (streaming) and `app/api/planner/route.ts` (generateObject) are Route Handlers required by the Vercel AI SDK — intentional, not CRUD routes
- **`@supabase/ssr`** — use `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server). Never import from `@supabase/auth-helpers-nextjs`
- **Protected pages inside `(dashboard)` route group** — the layout at `app/(dashboard)/layout.tsx` is the single auth + onboarding guard
- **Onboarding guard in layout, not middleware** — middleware only handles auth; `is_onboarded` check is in the dashboard layout
- **RLS always on** — never disable Row Level Security on any table
- **`revalidatePath` after mutations** — always call after server action writes
- **Distraction blocker is a separate Chrome extension** in `/extension` folder

## Folder Structure Convention
```
Soft Eng Proj/
├── CLAUDE.md
├── PROJECT_STATE.md        ← read this at the start of each new session
├── supabase/               ← SQL migration files
├── extension/              ← Chrome extension (Phase 12)
└── lifeops-app/            ← Next.js 15 app
    ├── app/
    │   ├── (dashboard)/    ← ALL protected pages go here
    │   ├── auth/
    │   ├── onboarding/
    │   └── page.tsx        ← landing
    ├── components/
    │   ├── layout/
    │   ├── ui/             ← shadcn primitives
    │   └── [feature]/      ← feature-specific components
    ├── lib/
    │   ├── actions/        ← server actions by domain
    │   └── supabase/       ← client.ts + server.ts only
    ├── types/index.ts      ← all TS interfaces
    └── hooks/              ← client-side hooks
```

## Code Style Rules
- TypeScript everywhere — no `any`, use proper types from `types/index.ts`
- Tailwind for all styling — no CSS modules
- Comments only where logic is non-obvious
- No mock/hardcoded data — always use Supabase
- Do not add error handling for scenarios that can't happen
- Do not add features, refactor, or clean up code beyond what the phase asks

## Design System Rules (post Phase 10)
- The design system is **locked** — do not casually tweak globals.css, token values, or base UI primitives
- Do not propose another large visual redesign — the app is UI/UX launch-ready
- New pages/components must follow the established token system (surface hierarchy, borders, rounded-xl, elevated card treatment)
- AppShell (`components/layout/AppShell.tsx`) is the canonical shell — all protected pages render inside it
- Sidebar and Header are finalized — do not restructure them unless a phase explicitly requires it
- Notes page uses a split-pane master-detail layout (`NoteEditor` extracted) — preserve this pattern for similar features

## Session Continuity Rules
- **Always read `PROJECT_STATE.md` at the start of a new session** before implementing anything
- **Do not rebuild Phases 1–3A** — they are working; start from the current state
- **Preserve working auth, onboarding flow, project CRUD, task management, and focus mode** — these must not break
- **Sidebar links to unbuilt pages will 404** — this is expected and intentional until that phase is built
- When a phase is complete, update `PROJECT_STATE.md` accordingly

## Delivery Principles (Phase 11+)
- Work **phase by phase** — do not build multiple phases at once
- Do not casually rewrite backend logic or architecture
- Preserve existing backend logic unless explicitly part of the current phase
- Use **feature branches** for all significant work
- For unfinished or staged features, prefer shipping behind a **feature flag** over exposing a broken partial version
- Feature flags: use frontend/config/env flags first; only use DB-level flags if per-user rollout is needed
- Prefer scoped prompts and scoped implementations — no 10-feature PRs

## What NOT to Build
- Do not start another large visual redesign
- Do not add disconnected modules that don't strengthen the core loop
- Do not overbuild collaboration/social features right now
- Do not build Chat with Vault before notes/docs data structure is ready
- Do not build calendar sync before planner logic is stable
- Do not attempt full offline-first sync early

## Phase 16 — Refinement Sprint Ordering Principle

**Data model first → Data cleanliness second → Operational UX third → Internal tooling last**

This is the non-negotiable sequencing rule for all Phase 16 work. Phases 16.A (data model), 16.B (data cleanliness), and 16.C (operational UX) are complete. Phase 16.D is the current target.

### Phase 16 Guardrails

**Phase 16.D — AI Workspace & UX Safety:**
- Chat persistence must remain **simple and linear** — one conversation thread per user per session context
- Do not over-engineer branching conversation trees, thread management, or complex chat-history systems in this phase
- The AI Assistant conversion to a global side panel must not break existing `/assistant` functionality or cause layout regressions on any page

## Phase Roadmap
- ✅ Phase 1 — Auth + dashboard + base project CRUD
- ✅ Phase 2A — Onboarding wizard
- ✅ Phase 2B-1 — Projects / Areas / Clients refactor
- ✅ Phase 2B-2 — Task management
- ✅ Phase 3A — Focus Mode (Pomodoro, custom timer, session history)
- ✅ Phase 3B — Habit Tracker (Daily/weekly habits, streaks, convert to task)
- ✅ Phase 3C — Streak Protection + Recovery (Freeze day, grace window)
- ✅ Phase 4A — Calendar (Due-date calendar view for tasks)
- ✅ Phase 4B — Notes + Journal (Simple CRUD)
- ✅ Phase 4C — Document Vault (Upload/store PDFs and images)
- ✅ Phase 5A — Tagging System (Normalized tags for tasks, notes, journal, documents)
- ✅ Phase 5B — Smart Filters / Saved Views (Named filter presets for tasks, notes, journal, documents)
- ✅ Phase 6A — Study Buddy foundation (Send/accept/remove buddy requests by email; SECURITY DEFINER lookup; buddy count on dashboard)
- ✅ Phase 6B — Leaderboard (Weekly ranking for self + buddies; SECURITY DEFINER aggregation; /leaderboard page; rank widget on dashboard)
- ✅ Phase 7A — AI Assistant (Context-aware chat at /assistant; Vercel AI SDK + OpenAI gpt-4o-mini; tasks/habits/goals injected as system prompt; create_task tool; streaming)
- ✅ Phase 7B — AI Planner (Weekly plan at /planner; generateObject with Zod schema; save/upsert to weekly_plans; regenerate flow)
- ✅ Phase 8 — Distraction Blocker Extension (MV3 Chrome extension in /extension; manual toggle; declarativeNetRequest; chrome.storage.local)
- ✅ Phase 9 — Final polish + deployment readiness (mobile responsive grids; loading.tsx skeletons; capstone README.md)
- ✅ Phase 10A — Design system + shell overhaul (premium dark-mode token system; AppShell; Sidebar + Header redesign; surface hierarchy)
- ✅ Phase 10B — Dashboard overhaul (command-center layout; Today hero; focus/tasks/habits/projects/social zones; updated skeleton)
- ✅ Phase 10C — Full page overhauls: Planner, Focus Mode, Tasks, Habits, Notes (→ split-pane master-detail), Documents, Leaderboard, Study Buddy, Onboarding
- ✅ Phase 10D — Global design-system polish (antialiasing; branded selection; scrollbars; button micro-interactions; input/card/dialog/dropdown unification)
- ✅ Phase 10D.1 — Micro polish follow-up (TagInput dark-mode fix; AppShell mobile padding)
- ✅ Phase 11.A — Activity Log Foundation (`user_activity_logs` table — prerequisite for all Phase 11+)
- ✅ Phase 11.B — Daily Shutdown (`/shutdown` workflow: done/slipped/carry-forward/tomorrow top 3/reflection)
- ✅ Phase 11.C — Weekly Review (`/review`: planned vs actual, focus time, habit consistency, AI summary, reflection; weekly_reviews table)
- ✅ Phase 11.D — AI Planner Upgrade (structured v2 PlanDay schema; Rebuild My Day + Rebuild Rest of Week flows; per-item remove; rationale field; backward-compatible with v1 saved plans)
- ✅ Phase 11.E — Task Intelligence (urgency model overdue/due_today/due_soon/at_risk; at-risk badge for urgent+undated; Carry to Tomorrow action; overdue→shutdown/review CTA banner)
- ✅ Phase 11.F — Focus Mode Upgrade (Planner→Focus URL handoff via ?intent&duration; prefill + "From planner" badge; planned vs actual in finished state; enriched activity log payload with goal+from_planner; Start Timer hover button on planner focus blocks)
- ✅ Phase 12.A — Command Palette (Cmd+K / Ctrl+K; cmdk-based; Navigation + Actions + Review & Recovery groups; ⌘K hint button in Header; open state in AppShell)
- ✅ Phase 12.B — Templates (6 static templates in lib/templates.ts; template picker in PlannerEmptyState; planning_emphasis injected into AI system prompt; active template badge in action bar; templateId persists across rebuilds)
- ✅ Phase 12.C — Feedback Widget (user_feedback table; submitFeedback server action; FeedbackDialog with category pills + textarea + inline success; sidebar trigger; Submit Feedback in command palette)
- ✅ Phase 12.D — Activity Heatmap (GitHub-style 52-week grid; task_completed/focus_session_completed/habit_checked events; server-side UTC aggregation; 4-level color scale; native title tooltip; dashboard placement)
- ✅ Phase 12.E — Habits Intelligence (habit_skip_logs table; skipHabit/unskipHabit server actions; Skip button + amber strip in HabitCard; 14-day consistency + trend arrow; habits section in Daily Shutdown with optimistic Complete/Skip; skippedCount in WeeklyMetrics; enriched AI review prompt)
- ✅ Phase 13.A — Workload Realism + Auto-Replanning (per-day overload detection from study_hours_per_week; deadline-risk tasks within 3 days; amber risk/overload banner with "Repair Rest of Week"; "Full" badge per overloaded day card; repairContext injected into rebuild API calls; deferredTasks in plan schema + UI section)
- ✅ Phase 13.B — Notes / Docs / Vault Linking (note_task_links + document_task_links junction tables; RLS; link/unlink server actions; linked task chips in NoteEditor metadata + DocumentCard edit dialog; linked task display on document cards)
- ✅ Phase 13.C — Chat with Your Vault (pgvector; vault_embeddings table; match_embeddings SECURITY DEFINER RPC; paragraph-based chunking; embedMany batch embedding; after() post-save refresh in notes + documents; /api/vault RAG endpoint; VaultDialog Q&A UI; "Ask Second Brain" in CommandPalette)
- ✅ Phase 14.A — Calendar Integration Foundation (Google OAuth 2.0; calendar_connections + calendar_events tables; server-side token refresh; syncCalendarEvents on planner load; read-only sky-blue event blocks in DayCard; calendarBusyMinutesByDay reduces effective available time in computeOverload; CalendarConnectBanner in planner header; /api/calendar/connect + /callback route handlers; disconnect server action)
- ✅ Phase 14.B — Two-Way Calendar Sync (push focus blocks to Google Calendar; calendar_sync_mappings table; [LifeOPS] title prefix + extendedProperties.private.lifeops_managed for ownership; create/patch/delete LifeOPS-managed events only; double-count prevention via is_lifeops_managed column; OAuth scope is full https://www.googleapis.com/auth/calendar; "Sync to Calendar" button in planner action bar; stale mapping cleanup on sync; disconnect clears mappings)
- ✅ Phase 15.A — Multi-Modal Vault Ingestion (vault_media private Storage bucket for txt/md; Voice Brain Dump: MediaRecorder → /api/transcribe Whisper endpoint → saveTranscriptAsNote → Phase 13.C embeddings; DocumentUploadDialog extended for txt/md with dual-bucket routing; "Voice Brain Dump" in CommandPalette; VoiceMemoDialog mounted in AppShell)
- ✅ Phase 15.B — Advanced Document Parsing / PDF Ingestion (pdf-parse + serverExternalPackages; extracted_text + parse_status columns on documents; /api/process-pdf route; refreshDocumentEmbeddings with 50-chunk limit; DocumentUploadDialog "Processing…" state + parse result messaging; DocumentCard parse status badges)
- ✅ Phase 15.C — Co-Pilot Command Line (natural-language command entry in ⌘K palette; /api/copilot parse-only route using OpenAI tool calling; create_task + reschedule_tasks tool schemas; client-side date/timezone injection; 3-step Parse→Preview→Execute flow; CopilotDialog; createTaskDirect + rescheduleMultipleTasks server actions; no destructive tools)
- ✅ Phase 16.A — Project-Centric Organization (project_tags join table; inline status dropdown on ProjectCard; status tabs Active/Completed/Archived/All on /projects; TagFilterBar for project tags; ProjectHubPanel lazy slide-over shows linked tasks/documents/notes; getProjectHubData server action; existing project_id FKs on tasks/notes/documents treated as stable relational foundation; no destructive migrations)
- ✅ Phase 16.B — Data Cleanliness (Notes/Journal tag separation at server-processing layer — no schema changes; project-scoped task linking in DocumentCard, NoteEditor, and journal; handleSave wrapped in try/finally to prevent stuck saving state; backward-compatible: existing cross-project links remain visible)
- ✅ Phase 16.C — Task Lifecycle Upgrade (cancelTask server action; Ban-icon cancel button on TaskRow; dedicated Canceled tab + grouped Canceled section in TasksView; priority-first sorting (urgent→high→medium→low then due date) within every group and flat list; cancelled tasks visually distinct — strikethrough, muted, dash checkbox; reopen via Edit dialog; no schema migration needed — cancelled already in DB constraint; system-wide audit confirmed all consumers correctly exclude cancelled)
- 🔜 Phase 16.D — AI Workspace & UX Safety ← **next implementation target**
- 🔜 Phase 16.E — Admin View