'use client'

import { useState, useMemo, useTransition } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight, Plus, CalendarDays, X } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { addTask, rescheduleTask } from '@/lib/actions/tasks'

// ── Constants ────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const PRIORITY_BADGE: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low:    'bg-secondary text-secondary-foreground',
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high:   'bg-orange-500',
  medium: 'bg-yellow-400',
  low:    'bg-muted-foreground/50',
}

// ── Types ────────────────────────────────────────────────────────────

export interface CalendarTask {
  id: string
  title: string
  priority: string
  status: string
  due_date: string
  project_name: string | null
}

export interface CalendarProject {
  id: string
  name: string
}

interface CalendarViewProps {
  tasks: CalendarTask[]
  projects: CalendarProject[]
  initialYear: number
  initialMonth: number
  today: string
}

// ── Grid helpers ─────────────────────────────────────────────────────

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ── Shared input / select style ───────────────────────────────────────

const inputCls =
  'bg-background border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'
const selectCls =
  'bg-background border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'

// ── Component ────────────────────────────────────────────────────────

export function CalendarView({
  tasks,
  projects,
  initialYear,
  initialMonth,
  today,
}: CalendarViewProps) {
  // ── Navigation state
  const [year, setYear]   = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)

  // ── Day selection
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  // ── Quick-add form state
  const [showAddForm, setShowAddForm]     = useState(false)
  const [addTitle, setAddTitle]           = useState('')
  const [addPriority, setAddPriority]     = useState('medium')
  const [addProjectId, setAddProjectId]   = useState('')
  const [addPending, startAddTransition]  = useTransition()

  // ── Reschedule state
  const [reschedulingId, setReschedulingId]           = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate]             = useState('')
  const [reschedulePending, startRescheduleTransition] = useTransition()

  // ── Month navigation ─────────────────────────────────────────────

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
    resetDayState()
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
    resetDayState()
  }

  function resetDayState() {
    setSelectedDay(null)
    setShowAddForm(false)
    setReschedulingId(null)
    setAddTitle('')
  }

  // ── Day selection ────────────────────────────────────────────────

  function selectDay(day: number) {
    if (day === selectedDay) {
      setSelectedDay(null)
    } else {
      setSelectedDay(day)
    }
    setShowAddForm(false)
    setReschedulingId(null)
    setAddTitle('')
  }

  // ── Derived data ─────────────────────────────────────────────────

  const tasksByDate = useMemo(() => {
    const map: Record<string, CalendarTask[]> = {}
    for (const t of tasks) {
      if (!map[t.due_date]) map[t.due_date] = []
      map[t.due_date].push(t)
    }
    return map
  }, [tasks])

  const grid = useMemo(() => buildGrid(year, month), [year, month])

  const selectedDateStr = selectedDay !== null ? toDateStr(year, month, selectedDay) : null
  const selectedTasks   = selectedDateStr ? (tasksByDate[selectedDateStr] ?? []) : []

  // ── Quick Add ────────────────────────────────────────────────────

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!addTitle.trim() || !selectedDateStr) return
    const fd = new FormData()
    fd.append('title', addTitle.trim())
    fd.append('priority', addPriority)
    fd.append('due_date', selectedDateStr)
    if (addProjectId) fd.append('project_id', addProjectId)
    startAddTransition(async () => {
      await addTask(fd)
      setShowAddForm(false)
      setAddTitle('')
      setAddPriority('medium')
      setAddProjectId('')
    })
  }

  // ── Reschedule ───────────────────────────────────────────────────

  function openReschedule(task: CalendarTask) {
    setReschedulingId(task.id)
    setRescheduleDate(task.due_date)
    setShowAddForm(false)
  }

  function handleReschedule(taskId: string) {
    if (!rescheduleDate) return
    startRescheduleTransition(async () => {
      await rescheduleTask(taskId, rescheduleDate)
      setReschedulingId(null)
    })
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Month navigation header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Previous month"
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-semibold">{MONTH_NAMES[month]} {year}</h2>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="Next month"
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Weekday header row */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {grid.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="h-16 border-b border-r bg-muted/10" />
            }

            const ds       = toDateStr(year, month, day)
            const dayTasks = tasksByDate[ds] ?? []
            const isToday    = ds === today
            const isSelected = day === selectedDay
            const dots       = dayTasks.slice(0, 3)

            return (
              <button
                key={day}
                type="button"
                onClick={() => selectDay(day)}
                className={cn(
                  'h-16 p-1.5 flex flex-col items-start border-b border-r transition-colors hover:bg-accent/60 text-left',
                  isSelected && 'bg-primary/10 hover:bg-primary/15',
                  !isSelected && isToday && 'bg-primary/5'
                )}
              >
                <span
                  className={cn(
                    'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full shrink-0',
                    isSelected && 'bg-primary text-primary-foreground',
                    !isSelected && isToday && 'text-primary font-bold'
                  )}
                >
                  {day}
                </span>

                {dayTasks.length > 0 && (
                  <div className="flex items-center gap-0.5 mt-auto">
                    {dots.map((t, idx) => (
                      <span
                        key={idx}
                        className={cn('h-1.5 w-1.5 rounded-full shrink-0', PRIORITY_DOT[t.priority] ?? 'bg-primary')}
                      />
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[9px] text-muted-foreground leading-none ml-0.5">
                        +{dayTasks.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Priority dot legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {(['urgent', 'high', 'medium', 'low'] as const).map((key) => (
          <span key={key} className="flex items-center gap-1.5 capitalize">
            <span className={cn('h-2 w-2 rounded-full shrink-0', PRIORITY_DOT[key])} />
            {key}
          </span>
        ))}
      </div>

      {/* ── Selected day panel ──────────────────────────────────────── */}
      {selectedDay !== null && (
        <section className="space-y-3">

          {/* Panel header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {MONTH_NAMES[month]} {selectedDay}, {year}
            </h3>
            <Link
              href="/tasks"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              All tasks
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Task list */}
          {selectedTasks.length > 0 && (
            <div className="rounded-xl border bg-card divide-y">
              {selectedTasks.map((task) => {
                const done = task.status === 'done'

                // ── Reschedule mode for this task ────────────────────
                if (reschedulingId === task.id) {
                  return (
                    <div key={task.id} className="flex items-center gap-2 px-4 py-3 flex-wrap">
                      <p className="flex-1 text-sm font-medium truncate text-muted-foreground min-w-0">
                        {task.title}
                      </p>
                      <input
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className={cn(inputCls, 'text-sm py-1')}
                      />
                      <button
                        type="button"
                        onClick={() => handleReschedule(task.id)}
                        disabled={reschedulePending || !rescheduleDate}
                        className="text-xs font-medium text-primary hover:underline disabled:opacity-50 shrink-0"
                      >
                        {reschedulePending ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReschedulingId(null)}
                        className="text-muted-foreground hover:text-foreground shrink-0"
                        aria-label="Cancel reschedule"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                }

                // ── Normal task row ──────────────────────────────────
                return (
                  <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        href="/tasks"
                        className={cn(
                          'text-sm font-medium truncate block hover:underline',
                          done && 'line-through text-muted-foreground'
                        )}
                      >
                        {task.title}
                      </Link>
                      {task.project_name && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {task.project_name}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Priority */}
                      <span
                        className={cn(
                          'text-[11px] font-medium px-1.5 py-0.5 rounded capitalize',
                          PRIORITY_BADGE[task.priority]
                        )}
                      >
                        {task.priority}
                      </span>

                      {/* Status */}
                      <span
                        className={cn(
                          'text-[11px] px-1.5 py-0.5 rounded',
                          done
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : task.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-secondary text-secondary-foreground'
                        )}
                      >
                        {task.status === 'in_progress' ? 'In progress' : task.status}
                      </span>

                      {/* Reschedule button */}
                      <button
                        type="button"
                        onClick={() => openReschedule(task)}
                        title="Reschedule task"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <CalendarDays className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty state — only when no tasks AND add form not open */}
          {selectedTasks.length === 0 && !showAddForm && (
            <div className="flex items-center justify-center py-6 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
              No tasks due on this day.
            </div>
          )}

          {/* ── Quick-add toggle / form ─────────────────────────── */}
          {showAddForm ? (
            <form
              onSubmit={handleAdd}
              className="rounded-xl border bg-card p-4 space-y-2.5"
            >
              <input
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder="Task title…"
                autoFocus
                required
                className={cn(inputCls, 'w-full')}
              />
              <div className="flex gap-2 flex-wrap">
                <select
                  value={addPriority}
                  onChange={(e) => setAddPriority(e.target.value)}
                  className={selectCls}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>

                {projects.length > 0 && (
                  <select
                    value={addProjectId}
                    onChange={(e) => setAddProjectId(e.target.value)}
                    className={cn(selectCls, 'flex-1 min-w-0')}
                  >
                    <option value="">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}

                <div className="flex gap-1.5 ml-auto">
                  <button
                    type="submit"
                    disabled={addPending || !addTitle.trim()}
                    className="text-sm font-medium bg-primary text-primary-foreground px-4 py-1.5 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {addPending ? 'Adding…' : 'Add task'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddForm(false); setAddTitle('') }}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add task for this day
            </button>
          )}
        </section>
      )}
    </div>
  )
}
