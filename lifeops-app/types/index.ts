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
  updated_at: string
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
  title: string
  description: string | null
  frequency: 'daily' | 'weekly'
  target_days: number[]
  target_days_per_week: number | null
  selected_weekdays: string[]
  linked_project_id: string | null
  color: string
  icon: string | null
  is_active: boolean
  freeze_days_available: number
  grace_window_hours: number
  created_at: string
  updated_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  user_id: string
  logged_date: string
  created_at: string
}

export interface HabitFreezeLog {
  id: string
  habit_id: string
  user_id: string
  freeze_date: string
  created_at: string
}

// Phase 5A: normalized tag
export interface Tag {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

// Phase 5B: saved filter views
export type SavedViewEntityType = 'tasks' | 'notes' | 'journal' | 'documents'

export interface TaskViewFilters {
  status?: string       // 'all' | 'todo' | 'in_progress' | 'done'
  priority?: string     // 'all' | 'urgent' | 'high' | 'medium' | 'low'
  tagName?: string | null
  dueDate?: string      // 'all' | 'today' | 'this_week' | 'overdue'
  projectId?: string | null
}

export interface NoteViewFilters {
  pinned?: boolean
  tagName?: string | null
  search?: string
  projectId?: string | null
}

export interface DocViewFilters {
  fileType?: string | null  // 'all' | 'pdf' | 'image'
  tagName?: string | null
  search?: string
  projectId?: string | null
}

export interface SavedView {
  id: string
  user_id: string
  name: string
  entity_type: SavedViewEntityType
  filters_json: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface StudyGroup {
  id: string
  name: string
  invite_code: string
  created_by: string | null
  created_at: string
}

// Phase 6B: Leaderboard row returned by get_weekly_leaderboard()
export interface LeaderboardEntry {
  user_id: string
  display_name: string
  focus_minutes: number
  completed_tasks: number
  habit_completions: number
  score: number
  rank: number
}

// Phase 6A: Study Buddy
export interface StudyBuddy {
  id: string
  requester_user_id: string
  addressee_user_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  updated_at: string
}
