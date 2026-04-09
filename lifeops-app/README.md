# LifeOPS

**One app to replace the scattered tools every student juggles.**

LifeOPS is a full-stack undergraduate student productivity platform combining task management, habit tracking, focus mode, notes, document storage, AI planning, and social accountability — all in a single, cohesive web app.

---

## Overview

LifeOPS was built as an undergraduate Software Engineering capstone project, developed incrementally across 9 phases. Each phase adds a discrete feature set without breaking what came before.

The goal: give a university student everything they need to stay organized and focused, from daily to-dos to AI-generated weekly plans, with a leaderboard to compete with friends.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v3 + shadcn/ui (hand-written Radix primitives) |
| Authentication | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL with Row Level Security |
| File Storage | Supabase Storage (`vault` private bucket) |
| AI | Vercel AI SDK (`ai@4`) + OpenAI `gpt-4o-mini` |
| Theme | next-themes (dark / light / system) |
| Deployment | Vercel |
| Package manager | npm |
| React version | 19 |
| Chrome Extension | Manifest V3 (plain HTML/CSS/JS) |

---

## Features

### Core Productivity
- **Task Management** — Create, edit, prioritize, and track tasks with due dates, projects, and tags. Status flow: `todo → in_progress → done`.
- **Projects / Areas / Clients** — Organize tasks under color-coded projects, personal areas, or client work.
- **Focus Mode** — Pomodoro timer + free timer with session logging and history. Links sessions to tasks and projects.
- **Habit Tracker** — Daily and weekly habits with streak tracking, weekday scheduling, streak freeze protection, and a "grace window" for yesterday's logs.
- **Calendar** — Monthly grid view of tasks by due date. Click a day to see, add, or reschedule tasks inline.

### Knowledge Management
- **Notes** — Rich-text note CRUD with pin/unpin, project linking, search, and tags.
- **Journal** — Daily journal entries with the same interface as Notes but scoped separately.
- **Document Vault** — Upload PDFs and images to a private Supabase Storage bucket. Download via signed 1-hour URLs. Full metadata + project tagging.

### Organization
- **Tagging System** — Normalized tag table with join tables for tasks, notes, journal, and documents. Tag filter bars on every list page.
- **Smart Filters / Saved Views** — Name and save filter presets (status, priority, tag, due date, project, file type) per entity type. One-click restore.

### Social & AI
- **Study Buddy** — Send, accept, decline, and remove buddy requests by email. See buddy count on dashboard.
- **Leaderboard** — Weekly ranking for you + accepted buddies. Score = focus minutes + (tasks × 20) + (habit logs × 10). Resets every Monday.
- **AI Assistant** — Context-aware chat at `/assistant`. Sees your tasks, habits, and goals. Can create tasks on your behalf via tool calling. Streaming responses.
- **AI Planner** — Generates a structured 7-day weekly plan at `/planner` using your goals, tasks, habits, and focus stats. Save/regenerate. Persisted per user per week.

### Chrome Extension
- **Distraction Blocker** — Manifest V3 extension in `/extension`. Manually toggle focus mode to block user-defined domains. Uses `declarativeNetRequest` for lightweight, battery-friendly blocking. Blocked page shows a clean "You're in Focus Mode" message.

---

## Pages & Routes

| Route | Type | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/auth/login` | Public | Email/password login |
| `/auth/register` | Public | Account registration |
| `/onboarding` | Protected | First-time setup wizard |
| `/dashboard` | Protected | Overview of all activity |
| `/projects` | Protected | Project / Area / Client management |
| `/tasks` | Protected | Task list with filters and saved views |
| `/focus` | Protected | Pomodoro + free timer |
| `/habits` | Protected | Habit tracker with streaks |
| `/calendar` | Protected | Monthly task calendar |
| `/notes` | Protected | Note-taking |
| `/journal` | Protected | Daily journaling |
| `/documents` | Protected | Document vault |
| `/study-buddy` | Protected | Buddy requests and management |
| `/leaderboard` | Protected | Weekly productivity leaderboard |
| `/assistant` | Protected | AI chat assistant |
| `/planner` | Protected | AI weekly planner |

---

## Local Setup

### Prerequisites
- Node.js 18+
- npm
- A [Supabase](https://supabase.com) project (free tier is sufficient)
- An [OpenAI API key](https://platform.openai.com/api-keys) for AI features

### Steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd "Soft Eng Proj/lifeops-app"

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env.local
# Fill in your values (see Environment Variables section below)

# 4. Run the Supabase SQL migrations (see Supabase Setup section)

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Environment Variables

Create `lifeops-app/.env.local` with the following:

```env
# Required — Supabase project credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Required for AI features (server-side only, never exposed to the client)
OPENAI_API_KEY=sk-...
```

**Security note:** `OPENAI_API_KEY` is only read inside Next.js Route Handlers (`app/api/chat/route.ts` and `app/api/planner/route.ts`) which run server-side. It is never sent to the browser.

---

## Supabase Setup

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com), create a new project, and copy the **Project URL** and **anon public key** into `.env.local`.

### 2. Enable Email Auth
In the Supabase dashboard: **Authentication → Providers → Email** — enable it.

For development, disable "Confirm email" under **Authentication → Email** to skip the confirmation step.

### 3. Run SQL migrations in order

Open the **Supabase SQL Editor** and run each file from the `supabase/` folder in this exact order:

| Order | File | Phase |
|---|---|---|
| 1 | `schema.sql` | Base schema |
| 2 | `add_onboarding_columns.sql` | Onboarding fields |
| 3 | `fix_rls_and_timezone.sql` | RLS + timezone fix |
| 4 | `add_project_type.sql` | Project type column |
| 5 | `add_tasks.sql` | Tasks table |
| 6 | `add_focus_sessions.sql` | Focus sessions |
| 7 | `add_habits.sql` | Habits + logs |
| 8 | `add_habits_weekdays.sql` | Weekday scheduling |
| 9 | `add_streak_protection.sql` | Freeze days + grace window |
| 10 | `add_vault.sql` | Storage bucket + policies |
| 11 | `add_tags.sql` | Normalized tags |
| 12 | `add_saved_views.sql` | Saved filter presets |
| 13 | `add_study_buddy.sql` | Buddy system + RPC |
| 14 | `add_leaderboard.sql` | Leaderboard RPC |
| 15 | `add_weekly_plans.sql` | AI planner storage |

Each migration is idempotent (`create table if not exists`) — running them twice is safe.

### 4. Create the Vault storage bucket

Some Supabase plans require creating the storage bucket via the dashboard instead of SQL:

1. Go to **Storage** in your Supabase project
2. Create a new bucket named `vault`
3. Set it to **Private** (not public)
4. The storage access policies from `add_vault.sql` handle per-user access

---

## Vercel Deployment

### 1. Push to GitHub

```bash
git add .
git commit -m "LifeOPS — all phases complete"
git push origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) and click **Add New Project**
2. Import your GitHub repository
3. Set the **Root Directory** to `lifeops-app`
4. Framework preset: **Next.js** (auto-detected)

### 3. Add Environment Variables in Vercel

In the Vercel project settings → **Environment Variables**, add:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `OPENAI_API_KEY` | Your OpenAI API key |

### 4. Deploy

Click **Deploy**. Vercel builds and deploys automatically on every push to `main`.

### 5. Update Supabase Auth redirect URLs

In Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: add `https://your-app.vercel.app/auth/callback`

---

## Chrome Extension Setup

The distraction blocker extension lives in the `/extension` folder (separate from the Next.js app).

### Load as Unpacked Extension (Development)

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repository
5. The ⚡ icon appears in your Chrome toolbar

### Usage

1. Click the extension icon to open the popup
2. Add domains to block (e.g. `youtube.com`, `instagram.com`)
3. Toggle **Focus Mode** on — blocking activates immediately
4. Visit a blocked domain to see the "You're in Focus Mode" page
5. Toggle off to unblock everything

State persists across browser sessions via `chrome.storage.local`.

---

## Screenshots

> _Add screenshots here for the submission._

| Screen | Description |
|---|---|
| `screenshots/dashboard.png` | Main dashboard overview |
| `screenshots/tasks.png` | Task list with filters |
| `screenshots/focus.png` | Pomodoro timer in session |
| `screenshots/habits.png` | Habit tracker with streaks |
| `screenshots/planner.png` | AI weekly plan generated |
| `screenshots/assistant.png` | AI chat assistant |
| `screenshots/leaderboard.png` | Weekly leaderboard |
| `screenshots/extension.png` | Chrome extension popup |
| `screenshots/blocked.png` | Blocked site page |

---

## Project Status

All 9 phases implemented and functional.

| Phase | Feature | Status |
|---|---|---|
| 1 | Auth + Dashboard + Project CRUD | ✅ Complete |
| 2A | Onboarding Wizard | ✅ Complete |
| 2B-1 | Projects / Areas / Clients | ✅ Complete |
| 2B-2 | Task Management | ✅ Complete |
| 3A | Focus Mode (Pomodoro + timer) | ✅ Complete |
| 3B | Habit Tracker + Streaks | ✅ Complete |
| 3C | Streak Protection + Recovery | ✅ Complete |
| 4A | Calendar (monthly, task view) | ✅ Complete |
| 4B | Notes + Journal | ✅ Complete |
| 4C | Document Vault | ✅ Complete |
| 5A | Tagging System | ✅ Complete |
| 5B | Smart Filters / Saved Views | ✅ Complete |
| 6A | Study Buddy Foundation | ✅ Complete |
| 6B | Leaderboard | ✅ Complete |
| 7A | AI Assistant (chat + tool calling) | ✅ Complete |
| 7B | AI Planner (weekly plan generation) | ✅ Complete |
| 8 | Distraction Blocker Chrome Extension | ✅ Complete |
| 9 | Polish + Documentation + Deployment Readiness | ✅ Complete |

---

## Architecture Notes

- **App Router only** — all pages in `app/`, data fetching in Server Components, mutations in Server Actions (`lib/actions/*.ts`)
- **RLS everywhere** — every Supabase table has Row Level Security enabled with `auth.uid() = user_id` policies. Data is isolated per user at the database level.
- **No API routes for CRUD** — the only Route Handlers are `app/api/chat/route.ts` (streaming AI) and `app/api/planner/route.ts` (structured object generation), both required by the Vercel AI SDK
- **`@supabase/ssr`** — cookie-based Supabase client for both browser and server; never uses deprecated `auth-helpers-nextjs`
- **Auth guard in layout** — `app/(dashboard)/layout.tsx` checks auth and `is_onboarded` server-side on every protected page load
- **Zod v3** — must stay at `zod@3.x`; the AI SDK has a peer dependency on `zod@^3` and `zod@4` causes silent runtime failures

---

## License

This project was built as an undergraduate capstone project. All rights reserved.
