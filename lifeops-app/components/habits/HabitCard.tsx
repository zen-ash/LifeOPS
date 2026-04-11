'use client'

import { useState } from 'react'
import {
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  ArrowRightCircle,
  Flame,
  Snowflake,
  Clock,
  Lightbulb,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  logHabit,
  unlogHabit,
  deleteHabit,
  convertHabitToTask,
  applyFreeze,
} from '@/lib/actions/habits'
import { EditHabitDialog } from './EditHabitDialog'
import { formatWeekdays } from './WeekdayPicker'

// ── Helpers ───────────────────────────────────────────────────────────

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

function getMonWeekStart(dateStr: string): string {
  const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay()
  return shiftDate(dateStr, dow === 0 ? -6 : 1 - dow)
}

function computeStreak(
  frequency: 'daily' | 'weekly',
  targetPerWeek: number | null,
  logDates: string[],
  freezeDates: string[],
  today: string
): number {
  const allDates = [...new Set([...logDates, ...freezeDates])]
  if (allDates.length === 0) return 0
  const dateSet = new Set(allDates)

  if (frequency === 'daily') {
    const startDate = dateSet.has(today) ? today : shiftDate(today, -1)
    if (!dateSet.has(startDate)) return 0
    let streak = 0
    let cur = startDate
    while (dateSet.has(cur)) { streak++; cur = shiftDate(cur, -1) }
    return streak
  }

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
    if (count >= target) { streak++; ws = shiftDate(ws, -7) }
    else if (i === 0) { ws = shiftDate(ws, -7) }
    else break
  }
  return streak
}

function getDayLetter(dateStr: string): string {
  const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay()
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dow]
}

// ── Types ─────────────────────────────────────────────────────────────

export interface HabitRow {
  id: string
  title: string
  description: string | null
  frequency: 'daily' | 'weekly'
  target_days_per_week: number | null
  selected_weekdays: string[]
  linked_project_id: string | null
  is_active: boolean
  freeze_days_available: number
  grace_window_hours: number
  created_at: string
}

interface Project { id: string; name: string }

interface HabitCardProps {
  habit: HabitRow
  logs: string[]
  freezeDates: string[]
  isCompletedToday: boolean
  today: string
  yesterday: string
  hourNow: number
  projects: Project[]
}

// ── HabitCard ─────────────────────────────────────────────────────────

export function HabitCard({
  habit,
  logs,
  freezeDates,
  isCompletedToday,
  today,
  yesterday,
  hourNow,
  projects,
}: HabitCardProps) {
  const [toggling, setToggling] = useState(false)
  const [converting, setConverting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [freezing, setFreezing] = useState(false)
  const [loggingYesterday, setLoggingYesterday] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const streak = computeStreak(
    habit.frequency,
    habit.target_days_per_week,
    logs,
    freezeDates,
    today
  )

  const yesterdayLogged = logs.includes(yesterday)
  const yesterdayFrozen = freezeDates.includes(yesterday)
  const canFreeze =
    streak > 0 && !yesterdayLogged && !yesterdayFrozen && habit.freeze_days_available > 0
  const inGraceWindow = hourNow < habit.grace_window_hours && !yesterdayLogged
  const recentLogCount = logs.filter((d) => d >= shiftDate(today, -7)).length
  const showRecoverySuggestion = streak === 0 && recentLogCount === 0

  // Last 7 days for history strip
  const last7 = Array.from({ length: 7 }, (_, i) => shiftDate(today, -(6 - i)))

  // Frequency label
  const freqLabel =
    habit.frequency === 'daily'
      ? 'Daily'
      : [
          'Weekly',
          habit.target_days_per_week ? `${habit.target_days_per_week}×/wk` : null,
          habit.selected_weekdays?.length > 0 ? formatWeekdays(habit.selected_weekdays) : null,
        ]
          .filter(Boolean)
          .join(' · ')

  async function handleToggle() {
    setToggling(true)
    if (isCompletedToday) await unlogHabit(habit.id, today)
    else await logHabit(habit.id, today)
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

  async function handleFreeze() {
    setFreezing(true)
    await applyFreeze(habit.id, yesterday)
    setFreezing(false)
  }

  async function handleLogYesterday() {
    setLoggingYesterday(true)
    await logHabit(habit.id, yesterday)
    setLoggingYesterday(false)
  }

  return (
    <>
      <div
        className={cn(
          'flex flex-col rounded-xl border bg-card overflow-hidden',
          !habit.is_active && 'opacity-60'
        )}
      >
        {/* Top: title + frequency badge */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm font-semibold leading-snug',
                  isCompletedToday && 'line-through text-muted-foreground/60'
                )}
              >
                {habit.title}
              </p>
              {habit.description && (
                <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                  {habit.description}
                </p>
              )}
            </div>
            <span
              className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5',
                habit.frequency === 'daily'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
              )}
            >
              {freqLabel}
            </span>
          </div>
        </div>

        {/* 7-day history strip */}
        <div className="px-4 py-2.5 border-y border-border/40 bg-muted/20">
          <div className="flex items-end gap-1">
            {last7.map((dateStr) => {
              const logged = logs.includes(dateStr)
              const frozen = freezeDates.includes(dateStr)
              const isFuture = dateStr > today
              const isCurrentDay = dateStr === today
              return (
                <div key={dateStr} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[9px] text-muted-foreground/40 uppercase leading-none">
                    {getDayLetter(dateStr)}
                  </span>
                  <div
                    className={cn(
                      'w-full h-3 rounded-sm transition-colors',
                      isFuture
                        ? 'bg-muted/30'
                        : logged
                        ? 'bg-primary'
                        : frozen
                        ? 'bg-sky-400/50'
                        : isCurrentDay
                        ? 'bg-muted border border-border'
                        : 'bg-muted/60'
                    )}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom: streak + check-in + actions */}
        <div className="px-4 pt-3 pb-4 flex flex-col gap-3 flex-1">
          {/* Streak + freeze indicator */}
          <div className="flex items-center gap-3">
            {streak > 0 ? (
              <div className="flex items-center gap-1.5">
                <Flame
                  className={cn(
                    'h-4 w-4',
                    streak >= 14
                      ? 'text-orange-400'
                      : streak >= 7
                      ? 'text-orange-500'
                      : 'text-orange-500/70'
                  )}
                />
                <span className="text-sm font-bold tabular-nums">{streak}</span>
                <span className="text-xs text-muted-foreground">
                  {streak === 1 ? 'day' : 'days'}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground/40">No streak yet</span>
            )}
            {habit.freeze_days_available > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-sky-500 ml-auto">
                <Snowflake className="h-3 w-3" />
                {habit.freeze_days_available}
              </span>
            )}
          </div>

          {/* Check-in button */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggling}
            aria-label={isCompletedToday ? 'Unmark for today' : 'Mark complete for today'}
            className={cn(
              'w-full rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2',
              'transition-all duration-200 disabled:opacity-60',
              isCompletedToday
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                : 'border-2 border-dashed border-muted-foreground/20 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5'
            )}
          >
            {isCompletedToday ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {toggling ? 'Updating…' : 'Done today'}
              </>
            ) : (
              <>
                <Circle className="h-4 w-4" />
                {toggling ? 'Marking…' : 'Mark done today'}
              </>
            )}
          </button>

          {/* Streak protection + grace hints */}
          {(canFreeze || inGraceWindow || showRecoverySuggestion) && (
            <div className="flex flex-wrap gap-2">
              {canFreeze && (
                <button
                  type="button"
                  onClick={handleFreeze}
                  disabled={freezing}
                  className="flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline disabled:opacity-50"
                >
                  <Snowflake className="h-3 w-3" />
                  {freezing ? 'Freezing…' : `Freeze yesterday (${habit.freeze_days_available} left)`}
                </button>
              )}
              {inGraceWindow && (
                <button
                  type="button"
                  onClick={handleLogYesterday}
                  disabled={loggingYesterday}
                  className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
                >
                  <Clock className="h-3 w-3" />
                  {loggingYesterday ? 'Logging…' : 'Log for yesterday'}
                </button>
              )}
              {showRecoverySuggestion && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Lightbulb className="h-3 w-3 text-yellow-500" />
                  Log 3 days in a row to restart your streak
                </span>
              )}
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-1 pt-1 mt-auto border-t border-border/30">
            <button
              type="button"
              onClick={handleConvert}
              disabled={converting}
              title="Convert to task"
              className="flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors disabled:opacity-50"
            >
              <ArrowRightCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">To task</span>
            </button>
            <div className="ml-auto flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditOpen(true)}
                className="h-6 w-6 text-muted-foreground/50 hover:text-foreground hover:bg-accent"
                aria-label="Edit habit"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-[11px] text-destructive font-medium hover:underline disabled:opacity-50 px-1"
                  >
                    {deleting ? '…' : 'Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-[11px] text-muted-foreground hover:underline px-1"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirmDelete(true)}
                  className="h-6 w-6 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                  aria-label="Delete habit"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
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
