-- ================================================================
-- LifeOPS — Full Database Schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- Covers all 12 phases. Each table is labelled with its phase.
-- ================================================================


-- ================================================================
-- PHASE 1: Profiles (extends auth.users automatically via trigger)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email        TEXT NOT NULL,
  full_name    TEXT,
  avatar_url   TEXT,
  timezone     TEXT DEFAULT 'UTC',
  -- Phase 2: Onboarding fields
  onboarding_completed BOOLEAN DEFAULT FALSE,
  work_hours_start     TIME DEFAULT '09:00',
  work_hours_end       TIME DEFAULT '17:00',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ================================================================
-- PHASE 3: Projects / Areas / Clients
-- ================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT DEFAULT '#6366f1',
  icon        TEXT,
  -- type lets the same table serve "projects", "areas", and "clients"
  type        TEXT DEFAULT 'project' CHECK (type IN ('project', 'area', 'client')),
  status      TEXT DEFAULT 'active'  CHECK (status IN ('active', 'completed', 'archived')),
  due_date    DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ================================================================
-- PHASE 4: Tasks
-- ================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id         UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title              TEXT NOT NULL,
  description        TEXT,
  status             TEXT DEFAULT 'todo'   CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  priority           TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date           DATE,
  tags               TEXT[] DEFAULT '{}',
  -- Phase 7: Focus mode fields
  estimated_minutes  INTEGER,
  actual_minutes     INTEGER,
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);


-- ================================================================
-- PHASE 5: Notes & Journal
-- ================================================================
CREATE TABLE IF NOT EXISTS public.notes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title      TEXT NOT NULL,
  content    TEXT,
  -- type 'journal' = daily journal entry; 'note' = general note
  type       TEXT DEFAULT 'note' CHECK (type IN ('note', 'journal')),
  tags       TEXT[] DEFAULT '{}',
  is_pinned  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ================================================================
-- PHASE 6: Document Vault (files stored in Supabase Storage)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  file_path  TEXT NOT NULL,   -- path inside the Supabase Storage bucket
  file_type  TEXT,            -- e.g. 'application/pdf', 'image/png'
  file_size  INTEGER,         -- in bytes
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ================================================================
-- PHASE 7: Focus Sessions (Pomodoro + free tracking)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id          UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  type             TEXT DEFAULT 'pomodoro' CHECK (type IN ('pomodoro', 'free')),
  duration_minutes INTEGER NOT NULL,
  completed        BOOLEAN DEFAULT FALSE,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  ended_at         TIMESTAMPTZ
);


-- ================================================================
-- PHASE 8: Habits & Streak Logs
-- ================================================================
CREATE TABLE IF NOT EXISTS public.habits (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  frequency   TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  -- Array of ISO weekday numbers (1=Mon … 7=Sun) the habit targets
  target_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
  color       TEXT DEFAULT '#6366f1',
  icon        TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id    UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  logged_date DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (habit_id, logged_date)  -- prevents double-logging the same day
);


-- ================================================================
-- PHASE 10: Study Groups & Leaderboard
-- ================================================================
CREATE TABLE IF NOT EXISTS public.study_groups (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,  -- short code friends use to join
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_group_members (
  group_id  UUID REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);


-- ================================================================
-- ROW LEVEL SECURITY
-- Every table is locked — users can only touch their own data.
-- ================================================================

ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members   ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Simple "owner-only" policy for personal tables
CREATE POLICY "Users can manage own projects"
  ON public.projects FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tasks"
  ON public.tasks FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notes"
  ON public.notes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own documents"
  ON public.documents FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own focus sessions"
  ON public.focus_sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own habits"
  ON public.habits FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own habit logs"
  ON public.habit_logs FOR ALL USING (auth.uid() = user_id);

-- Study groups — visible if you're a member or the creator
CREATE POLICY "Users can view their groups"
  ON public.study_groups FOR SELECT USING (
    created_by = auth.uid()
    OR id IN (
      SELECT group_id FROM public.study_group_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create groups"
  ON public.study_groups FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Members can view group members"
  ON public.study_group_members FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM public.study_group_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can join groups"
  ON public.study_group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups"
  ON public.study_group_members FOR DELETE USING (auth.uid() = user_id);


-- ================================================================
-- FUNCTIONS & TRIGGERS
-- ================================================================

-- Auto-create a profile row whenever a new user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Auto-bump updated_at on every UPDATE
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
