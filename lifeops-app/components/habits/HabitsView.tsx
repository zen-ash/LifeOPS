'use client'

import { useState } from 'react'
import {
  Activity,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  ArrowRightCircle,
  Flame,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logHabit, unlogHabit, deleteHabit, convertHabitToTask } from '@/lib/actions/habits'
import { EditHabitDialog } from './EditHabitDialog'
import { formatWeekdays } from './WeekdayPicker'

// ── Streak computation ───────────────────────────────────────────────

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

function getMonWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  const dow = d.getUTCDay() // 0 = Sun
  const diff = dow === 0 ? -6 : 1 - dow
  return shiftDate(dateStr, diff)
}

function computeStreak(
  frequency: 'daily' | 'weekly',
  targetPerWeek: number | null,
  logDates: string[],
  today: string
): number {
  if (logDates.length === 0) return 0
  const dateSet = new Set(logDates)

  if (frequency === 'daily') {
    // Streak counts consecutive days ending at today or yesterday
    const startDate = dateSet.has(today) ? today : shiftDate(today, -1)
    if (!dateSet.has(startDate)) return 0
    let streak = 0
    let cur = startDate
    while (dateSet.has(cur)) {
      streak++
      cur = shiftDate(cur, -1)
    }
    return streak
  }

  // Weekly: count consecutive weeks (Mon-Sun) where completions ≥ target
  const target = targetPerWeek ?? 1
  const weekCounts = new Map<string, number>()
  for (const d of dateSet) {
    const ws = getMonWeekStart(d)
    weekCounts.set(ws, (weekCounts.get(ws) ?? 0) + 1)
  }

  let streak = 0
  let ws = getMonWeekStart(today)
  for (let i = 0; i < 52; i++) {
    const count = weekCounts.get(ws) ?? 0
    if (count >= target) {
      streak++
      ws = shiftDate(ws, -7)
    } else if (i === 0) {
      // Current week may still be in progress — skip it
      ws = shiftDate(ws, -7)
    } else {
      break
    }
  }
  return streak
}

// ── Types ────────────────────────────────────────────────────────────

interface HabitRow {
  id: string
  title: string
  description: string | null
  frequency: 'daily' | 'weekly'
  target_days_per_week: number | null
  selected_weekdays: string[]
  linked_project_id: string | null
  is_active: boolean
  created_at: string
}

interface Project {
  id: string
  name: string
}

interface HabitsViewProps {
  habits: HabitRow[]
  logsMap: Record<string, string[]>
  today: string
  projects: Project[]
}

// ── Single habit row ─────────────────────────────────────────────────

interface HabitItemProps {
  habit: HabitRow
  logs: string[]
  isCompletedToday: boolean
  today: string
  projects: Project[]
}

function HabitItem({ habit, logs, isCompletedToday, today, projects }: HabitItemProps) {
  const [toggling, setToggling] = useState(false)
  const [converting, setConverting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const streak = computeStreak(habit.frequency, habit.target_days_per_week, logs, today)

  async function handleToggle() {
    setToggling(true)
    if (isCompletedToday) {
      await unlogHabit(habit.id, today)
    } else {
      await logHabit(habit.id, today)
    }
    setToggling(false)
  }

  async function handleConvert() {
    setConverting(true)
    await convertHabitToTask(habit.id)
    setConverting(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await deleteHabit(habit.id)
    setDeleting(false)
  }

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3',
          !habit.is_active && 'opacity-50'
        )}
      >
        {/* Completion toggle */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          aria-label={isCompletedToday ? 'Unmark for today' : 'Mark complete for today'}
          className="shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
        >
          {isCompletedToday ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm font-medium truncate',
              isCompletedToday && 'line-through text-muted-foreground'
            )}
          >
            {habit.title}
          </p>
          {habit.description && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {habit.description}
            </p>
          )}
        </div>

        {/* Right-side badges + actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Frequency badge */}
          <span
            className={cn(
              'text-[11px] font-medium px-1.5 py-0.5 rounded capitalize',
              habit.frequency === 'daily'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
            )}
          >
            {habit.frequency === 'daily' ? 'Daily' : [
              'Weekly',
              habit.target_days_per_week ? `${habit.target_days_per_week}×/wk` : null,
              habit.selected_weekdays?.length > 0
                ? formatWeekdays(habit.selected_weekdays)
                : null,
            ].filter(Boolean).join(' · ')}
          </span>

          {/* Streak flame */}
          {streak > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] font-medium text-orange-500">
              <Flame className="h-3 w-3" />
              {streak}
            </span>
          )}

          {/* Convert to task */}
          <button
            type="button"
            onClick={handleConvert}
            disabled={converting}
            title="Convert to task"
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <ArrowRightCircle className="h-4 w-4" />
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            title="Edit habit"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          {/* Delete with inline confirm */}
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-[11px] text-destructive font-medium hover:underline disabled:opacity-50"
              >
                {deleting ? '...' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-[11px] text-muted-foreground hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              title="Delete habit"
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <EditHabitDialog
        habit={{ ...habit, selected_weekdays: habit.selected_weekdays ?? [] }}
        projects={projects}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}

// ── Main view ────────────────────────────────────────────────────────

type TabValue = 'active' | 'daily' | 'weekly' | 'inactive'

export function HabitsView({ habits, logsMap, today, projects }: HabitsViewProps) {
  const [tab, setTab] = useState<TabValue>('active')

  const filtered = habits.filter((h) => {
    if (tab === 'daily') return h.is_active && h.frequency === 'daily'
    if (tab === 'weekly') return h.is_active && h.frequency === 'weekly'
    if (tab === 'inactive') return !h.is_active
    return h.is_active // 'active' tab
  })

  const tabs: { value: TabValue; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'inactive', label: 'Inactive' },
  ]

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
          <Activity className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium">
            {tab === 'inactive' ? 'No inactive habits.' : 'No habits here yet.'}
          </p>
          {tab === 'active' && (
            <p className="text-sm mt-1">Create your first habit to start tracking.</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {filtered.map((habit) => (
            <HabitItem
              key={habit.id}
              habit={habit}
              logs={logsMap[habit.id] ?? []}
              isCompletedToday={(logsMap[habit.id] ?? []).includes(today)}
              today={today}
              projects={projects}
            />
          ))}
        </div>
      )}
    </div>
  )
}
