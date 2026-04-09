# LifeOPS —  Claude Code Project Rules

## Project Overview
LifeOPS is an undergraduate student productivity web app deployed on Vercel.
All 9 phases are complete. The project is functionally finished.

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

## Session Continuity Rules
- **Always read `PROJECT_STATE.md` at the start of a new session** before implementing anything
- **Do not rebuild Phases 1–3A** — they are working; start from the current state
- **Preserve working auth, onboarding flow, project CRUD, task management, and focus mode** — these must not break
- **Sidebar links to unbuilt pages will 404** — this is expected and intentional until that phase is built
- When a phase is complete, update `PROJECT_STATE.md` accordingly

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
