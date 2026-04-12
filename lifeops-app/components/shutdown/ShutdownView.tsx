'use client'

import { useState, useMemo } from 'react'
import { CheckCircle2, Circle, ChevronRight, Timer, Zap, Minus, Battery, X, MinusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { completeShutdown } from '@/lib/actions/shutdown'
import { logHabit, skipHabit } from '@/lib/actions/habits'
import type {
  ShutdownDecisionAction,
  ShutdownDecision,
  ShutdownTomorrowItem,
  ShutdownEnergyLevel,
  DailyShutdown,
} from '@/types'

// ── Priority display helpers ──────────────────────────────────────────────────

const PRIORITY_CLASSES: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  low: 'bg-muted/60 text-muted-foreground border-border/40',
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

function priorityLabel(p: string) {
  return p.charAt(0).toUpperCase() + p.slice(1)
}

function formatDaysOverdue(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const due = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - due.getTime()) / 86_400_000)
  if (diff === 0) return 'Due today'
  if (diff === 1) return '1 day overdue'
  return `${diff} days overdue`
}

// ── Energy config ─────────────────────────────────────────────────────────────

const ENERGY_OPTIONS: Array<{
  value: ShutdownEnergyLevel
  label: string
  Icon: React.ElementType
  activeClass: string
}> = [
  {
    value: 'high',
    label: 'High',
    Icon: Zap,
    activeClass: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  {
    value: 'medium',
    label: 'Medium',
    Icon: Minus,
    activeClass: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  },
  {
    value: 'low',
    label: 'Low',
    Icon: Battery,
    activeClass: 'border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  },
]

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card px-6 py-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold leading-tight">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface SlippedTask {
  id: string
  title: string
  priority: string
  due_date: string | null
}

interface CompletedTask {
  id: string
  title: string
  priority: string
}

interface SuggestionTask {
  id: string
  title: string
  priority: string
  due_date: string | null
}

// Phase 12.E: habits due today with completion/skip status
interface TodayHabitItem {
  id: string
  title: string
  status: 'done' | 'skipped' | 'pending'
}

interface ShutdownViewProps {
  today: string
  todayHabits: TodayHabitItem[]   // Phase 12.E
  completedTasks: CompletedTask[]
  slippedTasks: SlippedTask[]
  focusMinutes: number
  tomorrowSuggestions: SuggestionTask[]
  existingShutdown: DailyShutdown | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ShutdownView({
  today,
  todayHabits,
  completedTasks,
  slippedTasks,
  focusMinutes,
  tomorrowSuggestions,
  existingShutdown,
}: ShutdownViewProps) {
  // Phase 12.E: local habit status — optimistic updates so form state is preserved on action
  const [habitStatuses, setHabitStatuses] = useState<Record<string, TodayHabitItem['status']>>(
    () => Object.fromEntries(todayHabits.map((h) => [h.id, h.status]))
  )

  // State — initialised from an existing record if the user re-visits
  const [decisions, setDecisions] = useState<Record<string, ShutdownDecisionAction>>(() => {
    const init: Record<string, ShutdownDecisionAction> = {}
    for (const t of slippedTasks) init[t.id] = 'leave'
    if (existingShutdown) {
      for (const d of existingShutdown.slipped_decisions) init[d.task_id] = d.action
    }
    return init
  })

  const [rescheduleDates, setRescheduleDates] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    if (existingShutdown) {
      for (const d of existingShutdown.slipped_decisions) {
        if (d.action === 'reschedule' && d.new_date) init[d.task_id] = d.new_date
      }
    }
    return init
  })

  const [top3, setTop3] = useState<ShutdownTomorrowItem[]>(
    existingShutdown?.tomorrow_top3 ?? []
  )
  const [reflection, setReflection] = useState(existingShutdown?.reflection ?? '')
  const [energy, setEnergy] = useState<ShutdownEnergyLevel | null>(
    existingShutdown?.energy ?? null
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(!!existingShutdown)

  // Tomorrow date string for "carry" label
  const tomorrowStr = useMemo(() => {
    const d = new Date(today + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + 1)
    return d.toISOString().split('T')[0]
  }, [today])

  // Suggestion pool: carried slipped tasks + server-fetched future tasks
  // Deduplicated by task_id so carried tasks don't double-appear
  const suggestionPool = useMemo<SuggestionTask[]>(() => {
    const carriedIds = new Set(
      slippedTasks.filter((t) => decisions[t.id] === 'carry').map((t) => t.id)
    )
    const serverIds = new Set(tomorrowSuggestions.map((t) => t.id))
    const carried: SuggestionTask[] = slippedTasks
      .filter((t) => carriedIds.has(t.id))
      .map((t) => ({ ...t, due_date: tomorrowStr }))
    const future = tomorrowSuggestions.filter((t) => !carriedIds.has(t.id))
    return [...carried, ...future].sort(
      (a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
    )
  }, [slippedTasks, tomorrowSuggestions, decisions, tomorrowStr])

  // Already-selected IDs for quick lookup
  const selectedIds = useMemo(() => new Set(top3.map((t) => t.task_id)), [top3])

  function toggleTop3(task: SuggestionTask) {
    if (selectedIds.has(task.id)) {
      setTop3((prev) => prev.filter((t) => t.task_id !== task.id))
    } else if (top3.length < 3) {
      setTop3((prev) => [...prev, { task_id: task.id, title: task.title, priority: task.priority }])
    }
  }

  async function handleSubmit() {
    setSaving(true)
    setError(null)

    const slippedDecisions: ShutdownDecision[] = slippedTasks.map((task) => ({
      task_id: task.id,
      title: task.title,
      action: decisions[task.id] ?? 'leave',
      ...(decisions[task.id] === 'reschedule' && rescheduleDates[task.id]
        ? { new_date: rescheduleDates[task.id] }
        : {}),
    }))

    const result = await completeShutdown({
      shutdownDate: today,
      completedTasks,
      slippedDecisions,
      tomorrowTop3: top3,
      reflection,
      energy,
      focusMinutes,
    })

    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setIsComplete(true)
  }

  // ── Completed state ─────────────────────────────────────────────────────────
  if (isComplete) {
    const carried = Object.values(decisions).filter((a) => a === 'carry').length
    const dropped = Object.values(decisions).filter((a) => a === 'drop').length
    const rescheduled = Object.values(decisions).filter((a) => a === 'reschedule').length
    const energyOption = ENERGY_OPTIONS.find((e) => e.value === energy)

    return (
      <div className="rounded-xl border bg-card px-6 py-6 space-y-5 animate-fade-in-up">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold leading-tight">Shutdown complete</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(today + 'T12:00:00Z').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsComplete(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Edit
          </button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Completed', value: completedTasks.length },
            { label: 'Focus', value: `${focusMinutes}m` },
            { label: 'Slipped', value: slippedTasks.length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border bg-muted/30 px-3 py-2.5 text-center">
              <p className="text-base font-bold leading-tight">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Decisions summary */}
        {slippedTasks.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            {carried > 0 && <p>↗ {carried} carried to tomorrow</p>}
            {rescheduled > 0 && <p>📅 {rescheduled} rescheduled</p>}
            {dropped > 0 && <p>✕ {dropped} dropped</p>}
          </div>
        )}

        {/* Tomorrow's top 3 */}
        {top3.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">
              Tomorrow&apos;s focus
            </p>
            <div className="space-y-1.5">
              {top3.map((item, i) => (
                <div key={item.task_id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground/50 w-4 shrink-0">{i + 1}.</span>
                  <span className="text-sm leading-tight">{item.title}</span>
                  <span
                    className={cn(
                      'ml-auto text-[10px] px-1.5 py-0.5 rounded border shrink-0',
                      PRIORITY_CLASSES[item.priority] ?? PRIORITY_CLASSES.low
                    )}
                  >
                    {priorityLabel(item.priority)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Energy + reflection */}
        <div className="space-y-2">
          {energyOption && (
            <div className="flex items-center gap-2">
              <energyOption.Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Energy: {energyOption.label}</span>
            </div>
          )}
          {reflection && (
            <p className="text-sm text-muted-foreground italic leading-relaxed">
              &ldquo;{reflection}&rdquo;
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Form state ──────────────────────────────────────────────────────────────
  const isEmpty = completedTasks.length === 0 && slippedTasks.length === 0 && focusMinutes === 0

  return (
    <div className="space-y-4">
      {/* 1. Today's progress */}
      <Section
        title="Today's progress"
        subtitle={
          isEmpty
            ? 'Nothing was tracked today — still a good time to reflect and plan tomorrow'
            : undefined
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <p className="text-base font-bold leading-tight">{completedTasks.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Tasks done</p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5 flex items-start gap-2">
            <Timer className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-base font-bold leading-tight">{focusMinutes}m</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Focus time</p>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <p className="text-base font-bold leading-tight">{slippedTasks.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Slipped</p>
          </div>
        </div>

        {completedTasks.length > 0 && (
          <div className="space-y-1.5">
            {completedTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-sm leading-tight flex-1 min-w-0 truncate">{task.title}</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded border shrink-0',
                    PRIORITY_CLASSES[task.priority] ?? PRIORITY_CLASSES.low
                  )}
                >
                  {priorityLabel(task.priority)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Phase 12.E: 2. Today's habits */}
      {todayHabits.length > 0 && (
        <Section
          title="Today's habits"
          subtitle={`${todayHabits.length} habit${todayHabits.length === 1 ? '' : 's'} scheduled today — mark any you haven't actioned`}
        >
          <div className="space-y-2">
            {todayHabits.map((habit) => {
              const status = habitStatuses[habit.id] ?? 'pending'
              return (
                <div key={habit.id} className="flex items-center gap-3">
                  {/* Status icon */}
                  {status === 'done' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : status === 'skipped' ? (
                    <MinusCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                  )}

                  <span className={cn(
                    'text-sm flex-1 min-w-0 truncate',
                    status !== 'pending' && 'text-muted-foreground'
                  )}>
                    {habit.title}
                  </span>

                  {/* Actions for pending habits */}
                  {status === 'pending' && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          setHabitStatuses((prev) => ({ ...prev, [habit.id]: 'done' }))
                          await logHabit(habit.id, today)
                        }}
                        className="text-xs px-2 py-1 rounded-md border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      >
                        Done
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setHabitStatuses((prev) => ({ ...prev, [habit.id]: 'skipped' }))
                          await skipHabit(habit.id, today)
                        }}
                        className="text-xs px-2 py-1 rounded-md border border-border/50 text-muted-foreground hover:border-amber-400/40 hover:text-amber-600 hover:bg-amber-400/10 transition-colors"
                      >
                        Skip
                      </button>
                    </div>
                  )}

                  {/* Status badge for already-actioned habits */}
                  {status === 'done' && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0">Done</span>
                  )}
                  {status === 'skipped' && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 shrink-0">Skipped</span>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* 3. Slipped tasks */}
      {slippedTasks.length > 0 && (
        <Section
          title="What slipped?"
          subtitle={`${slippedTasks.length} task${slippedTasks.length === 1 ? '' : 's'} didn't get done — decide what happens next`}
        >
          <div className="space-y-4">
            {slippedTasks.map((task) => {
              const action = decisions[task.id] ?? 'leave'
              return (
                <div key={task.id} className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Circle className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm leading-tight">{task.title}</span>
                      {task.due_date && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatDaysOverdue(task.due_date)}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded border shrink-0',
                        PRIORITY_CLASSES[task.priority] ?? PRIORITY_CLASSES.low
                      )}
                    >
                      {priorityLabel(task.priority)}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-1.5 pl-6">
                    {(
                      [
                        { value: 'carry', label: `Carry to ${tomorrowStr}` },
                        { value: 'reschedule', label: 'Reschedule' },
                        { value: 'drop', label: 'Drop' },
                        { value: 'leave', label: 'Leave' },
                      ] as const
                    ).map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setDecisions((prev) => ({ ...prev, [task.id]: value }))
                        }
                        className={cn(
                          'text-xs px-2.5 py-1 rounded-md border transition-colors',
                          action === value
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Date picker for reschedule */}
                  {action === 'reschedule' && (
                    <div className="pl-6">
                      <input
                        type="date"
                        min={tomorrowStr}
                        value={rescheduleDates[task.id] ?? ''}
                        onChange={(e) =>
                          setRescheduleDates((prev) => ({ ...prev, [task.id]: e.target.value }))
                        }
                        className="text-xs rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* 4. Tomorrow's top 3 */}
      <Section
        title="Tomorrow's top 3"
        subtitle="Pick up to 3 tasks to focus on tomorrow"
      >
        {/* Selected items */}
        {top3.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {top3.map((item, i) => (
              <div
                key={item.task_id}
                className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2"
              >
                <span className="text-xs font-medium text-primary/60 w-4 shrink-0">{i + 1}</span>
                <span className="text-sm flex-1 min-w-0 truncate leading-tight">{item.title}</span>
                <button
                  type="button"
                  onClick={() => setTop3((prev) => prev.filter((t) => t.task_id !== item.task_id))}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  aria-label="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Suggestion pool */}
        {top3.length < 3 && suggestionPool.length > 0 && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-2">
              {top3.length === 0 ? 'Suggestions — click to add:' : 'Add more:'}
            </p>
            <div className="space-y-1">
              {suggestionPool
                .filter((t) => !selectedIds.has(t.id))
                .map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => toggleTop3(task)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border/40 bg-muted/20 hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    <span className="text-sm flex-1 min-w-0 truncate leading-tight">
                      {task.title}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded border shrink-0',
                        PRIORITY_CLASSES[task.priority] ?? PRIORITY_CLASSES.low
                      )}
                    >
                      {priorityLabel(task.priority)}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {suggestionPool.length === 0 && top3.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No upcoming tasks — add some from the Tasks page or type a note in the reflection below.
          </p>
        )}
      </Section>

      {/* 5. Reflection + energy */}
      <Section title="How did today go?">
        {/* Energy level */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Energy level</p>
          <div className="flex gap-2">
            {ENERGY_OPTIONS.map(({ value, label, Icon, activeClass }) => (
              <button
                key={value}
                type="button"
                onClick={() => setEnergy((prev) => (prev === value ? null : value))}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs transition-colors',
                  energy === value
                    ? activeClass
                    : 'border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Reflection */}
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Any notes on how today went, what to do differently, or what you're carrying mentally..."
          rows={3}
          className="w-full rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 leading-relaxed"
        />
      </Section>

      {/* Submit */}
      {error && (
        <p className="text-xs text-destructive px-1">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        className="w-full rounded-xl border border-primary/30 bg-primary/10 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : 'Complete Shutdown'}
      </button>
    </div>
  )
}
