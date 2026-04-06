# LifeOPS — Claude Code Project Rules

## Project Overview
LifeOPS is an undergraduate student productivity web app deployed on Vercel.
It is built phase by phase. Do not implement features ahead of the current phase.

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
- **Server Actions for all mutations** — `lib/actions/*.ts` with `'use server'`, no custom API routes for CRUD
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
- **Do not rebuild Phase 1 or 2** — they are working; start from the current state
- **Preserve working auth, onboarding flow, and project CRUD** — these must not break
- **Sidebar links to unbuilt pages will 404** — this is expected and intentional until that phase is built
- When a phase is complete, update `PROJECT_STATE.md` accordingly

## Phase Roadmap
1. ✅ Project setup + Supabase Auth (login/register/logout) — COMPLETE
2. ✅ Onboarding wizard (goals, hours, priorities, timezone) — COMPLETE
3. ⬜ Projects / Areas / Clients — full page, edit, filter
4. ⬜ Tasks (CRUD, priorities, tags, filters, due dates)
5. ⬜ Notes and Journal
6. ⬜ Document Vault (PDF/image upload via Supabase Storage)
7. ⬜ Focus Mode (Pomodoro + time tracker)
8. ⬜ Habit Tracker + Streaks
9. ⬜ Calendar view
10. ⬜ Study Buddy + Leaderboard
11. ⬜ AI Assistant + AI Weekly Planner
12. ⬜ Distraction Blocker (Chrome extension)
