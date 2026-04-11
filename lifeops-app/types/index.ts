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

// Phase 11.B: Daily Shutdown
export type ShutdownDecisionAction = 'carry' | 'reschedule' | 'drop' | 'leave'

export interface ShutdownDecision {
  task_id: string
  title: string
  action: ShutdownDecisionAction
  new_date?: string
}

export interface ShutdownTomorrowItem {
  task_id: string
  title: string
  priority: string
}

export type ShutdownEnergyLevel = 'high' | 'medium' | 'low'

export interface DailyShutdown {
  id: string
  user_id: string
  shutdown_date: string
  completed_tasks: Array<{ id: string; title: string; priority: string }>
  slipped_decisions: ShutdownDecision[]
  tomorrow_top3: ShutdownTomorrowItem[]
  reflection: string | null
  energy: ShutdownEnergyLevel | null
  focus_minutes: number
  created_at: string
  updated_at: string
}

// Phase 11.A: Activity Log
export type ActivityEventType =
  | 'task_completed'
  | 'task_uncompleted'
  | 'focus_session_completed'
  | 'focus_session_stopped_early'
  | 'habit_checked'
  | 'habit_skipped'
  | 'plan_generated'
  | 'plan_saved'
  | 'shutdown_completed'
  | 'weekly_review_completed'

export interface ActivityLog {
  id: string
  user_id: string
  event_type: ActivityEventType
  entity_type: string | null
  entity_id: string | null
  occurred_at: string
  payload: Record<string, unknown> | null
}

// Phase 11.C: Weekly Review
export interface HabitConsistencyItem {
  habitId: string
  habitTitle: string
  logsCount: number
  expectedDays: number
  percentage: number
}

export interface WeeklyMetrics {
  focusMinutes: number
  completedTaskCount: number
  missedTaskCount: number
  plannedTaskTitles: string[]
  completedTasks: Array<{ id: string; title: string; priority: string }>
  missedTasks: Array<{ id: string; title: string; priority: string; due_date: string | null }>
  habitConsistency: HabitConsistencyItem[]
  shutdownDays: number
  energySummary: Array<{ date: string; energy: string | null }>
}

export interface ReviewAISummary {
  summary: string
  topWin: string
  topLearning: string
  nextWeekFocus: string
}

export interface WeeklyReview {
  id: string
  user_id: string
  week_start: string
  week_end: string
  metrics_json: WeeklyMetrics
  ai_summary: ReviewAISummary | null
  reflection: string | null
  created_at: string
  updated_at: string
}

// Phase 7B / Phase 11.D: AI Planner
// PlanDay supports both the legacy v1 shape (pre-11.D) and the new v2 structured shape.
// All fields are optional so that old saved plans (which have v1 fields) continue to render,
// while new plans (generated post-11.D) use v2 fields. DayCard handles both via fallback reads.
export interface PlanDay {
  day: string
  // V2 fields — Phase 11.D structured output
  tasks?: string[]
  habits?: string[]
  focus_blocks?: string[]
  rationale?: string
  // V1 legacy fields — present in plans saved before Phase 11.D
  focusBlock?: string
  topTasks?: string[]
  habitReminder?: string
  notes?: string
}

export interface GeneratedPlan {
  weekStart: string
  days: PlanDay[]
}

export interface WeeklyPlan {
  id: string
  user_id: string
  week_start_date: string
  plan_json: GeneratedPlan
  created_at: string
  updated_at: string
}
