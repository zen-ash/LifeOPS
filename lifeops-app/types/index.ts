// Shared TypeScript types — mirrors the Supabase DB schema

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  timezone: string
  // Phase 1 schema fields
  onboarding_completed: boolean
  work_hours_start: string
  work_hours_end: string
  // Phase 2A onboarding fields
  is_onboarded: boolean
  goals: string[]
  study_hours_per_week: number | null
  priorities: string[]
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  color: string
  icon: string | null
  type: 'project' | 'area' | 'client'
  status: 'active' | 'completed' | 'archived'
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  project_id: string | null
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  tags: string[]
  estimated_minutes: number | null
  actual_minutes: number | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  user_id: string
  project_id: string | null
  title: string
  content: string | null
  type: 'note' | 'journal'
  tags: string[]
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  user_id: string
  project_id: string | null
  name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  created_at: string
}

export interface FocusSession {
  id: string
  user_id: string
  task_id: string | null
  project_id: string | null
  goal: string | null
  type: 'pomodoro' | 'free'
  duration_minutes: number
  actual_minutes: number | null
  completed: boolean
  started_at: string
  ended_at: string | null
  created_at: string
  updated_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  description: string | null
  frequency: 'daily' | 'weekly'
  target_days: number[]
  color: string
  icon: string | null
  is_active: boolean
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  user_id: string
  logged_date: string
  created_at: string
}

export interface StudyGroup {
  id: string
  name: string
  invite_code: string
  created_by: string | null
  created_at: string
}
