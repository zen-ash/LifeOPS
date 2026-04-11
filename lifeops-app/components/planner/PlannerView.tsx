'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Wand2,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Timer,
  ListTodo,
  Heart,
  Lightbulb,
  Sparkles,
  CalendarRange,
  Target,
  Brain,
  X,
  RotateCcw,
  CalendarClock,
  Info,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { savePlan } from '@/lib/actions/planner'
import type { GeneratedPlan, PlanDay } from '@/types'

interface PlannerViewProps {
  weekStart: string
  savedPlan: GeneratedPlan | null
}

// Left accent color per day
const DAY_ACCENT: Record<string, string> = {
  Monday: 'border-l-blue-500',
  Tuesday: 'border-l-violet-500',
  Wednesday: 'border-l-emerald-500',
  Thursday: 'border-l-orange-500',
  Friday: 'border-l-rose-500',
  Saturday: 'border-l-amber-400',
  Sunday: 'border-l-slate-400',
}

const IS_WEEKEND = new Set(['Saturday', 'Sunday'])

// Day order for rebuild-rest-of-week range computation
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// ── Helper: normalise a PlanDay to always read v2 fields, falling back to v1 ──
// This allows old saved plans (pre-11.D) to render correctly alongside new plans.
function normDay(day: PlanDay) {
  return {
    tasks: day.tasks ?? day.topTasks ?? [],
    habits: day.habits ?? (day.habitReminder ? [day.habitReminder] : []),
    focusBlocks: day.focus_blocks ?? (day.focusBlock ? [day.focusBlock] : []),
    rationale: day.rationale ?? day.notes ?? null,
  }
}

// ── Shimmer skeleton card ──────────────────────────────────────────────────
function ShimmerCard({ index }: { index: number }) {
  const delay = `${index * 120}ms`
  return (
    <div
      className="rounded-xl border bg-card overflow-hidden border-l-4 border-l-border/50"
      style={{ animationDelay: delay }}
    >
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
        <div className="shimmer h-2.5 w-7 rounded" style={{ animationDelay: delay }} />
        <div className="shimmer h-2.5 w-20 rounded" style={{ animationDelay: `${index * 120 + 80}ms` }} />
      </div>
      <div className="px-4 py-3 border-b border-border/40 space-y-2">
        <div className="shimmer h-2.5 w-full rounded" style={{ animationDelay: `${index * 120 + 160}ms` }} />
        <div className="shimmer h-2.5 w-4/5 rounded" style={{ animationDelay: `${index * 120 + 240}ms` }} />
      </div>
      <div className="px-4 py-3 border-b border-border/40 space-y-2">
        <div className="shimmer h-2 w-10 rounded" style={{ animationDelay: `${index * 120 + 320}ms` }} />
        <div className="shimmer h-2.5 w-full rounded" style={{ animationDelay: `${index * 120 + 400}ms` }} />
        <div className="shimmer h-2.5 w-3/4 rounded" style={{ animationDelay: `${index * 120 + 480}ms` }} />
      </div>
      <div className="px-4 py-3 space-y-2">
        <div className="shimmer h-2.5 w-full rounded" style={{ animationDelay: `${index * 120 + 560}ms` }} />
        <div className="shimmer h-2.5 w-2/3 rounded" style={{ animationDelay: `${index * 120 + 640}ms` }} />
      </div>
    </div>
  )
}

// ── Removable list item ────────────────────────────────────────────────────
function RemovableItem({
  children,
  onRemove,
  dot,
  dotColor = 'bg-primary/50',
}: {
  children: React.ReactNode
  onRemove: () => void
  dot?: boolean
  dotColor?: string
}) {
  return (
    <li className="group flex items-start gap-2 relative">
      {dot && <span className={`w-1 h-1 rounded-full ${dotColor} shrink-0 mt-1.5`} />}
      <span className="text-xs text-foreground leading-snug flex-1 min-w-0">{children}</span>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all"
        aria-label="Remove"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </li>
  )
}

// ── Focus block item — Phase 11.F ─────────────────────────────────────────
// Like RemovableItem but with an additional "Start Timer" link button.
// Launches /focus?intent=<text>&duration=45 so FocusTimer prefills from this block.
function FocusBlockItem({
  text,
  onRemove,
}: {
  text: string
  onRemove: () => void
}) {
  const href = `/focus?intent=${encodeURIComponent(text)}&duration=45`
  return (
    <li className="group flex items-start gap-2 relative">
      <span className="w-1 h-1 rounded-full bg-primary/60 shrink-0 mt-1.5" />
      <span className="text-xs text-foreground leading-snug flex-1 min-w-0">{text}</span>
      {/* Start timer — visible on hover */}
      <Link
        href={href}
        className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded text-primary/60 hover:text-primary hover:bg-primary/10 transition-all"
        aria-label="Start focus timer"
        title="Start focus timer"
      >
        <Play className="h-2.5 w-2.5" />
      </Link>
      {/* Remove — visible on hover */}
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all"
        aria-label="Remove"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </li>
  )
}

// ── Day card ───────────────────────────────────────────────────────────────
interface DayCardProps {
  day: PlanDay
  index: number
  isRebuilding: boolean
  onRebuild: () => void
  onRemoveTask: (i: number) => void
  onRemoveHabit: (i: number) => void
  onRemoveFocusBlock: (i: number) => void
}

function DayCard({
  day,
  index,
  isRebuilding,
  onRebuild,
  onRemoveTask,
  onRemoveHabit,
  onRemoveFocusBlock,
}: DayCardProps) {
  const isWeekend = IS_WEEKEND.has(day.day)
  const { tasks, habits, focusBlocks, rationale } = normDay(day)

  return (
    <div
      className={cn(
        'rounded-xl border bg-card overflow-hidden border-l-4 flex flex-col animate-fade-in-up',
        DAY_ACCENT[day.day] ?? 'border-l-border',
        isWeekend && 'opacity-90'
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Day header */}
      <div
        className={cn(
          'px-3 pt-3 pb-2 border-b border-border/50 flex items-center justify-between gap-1',
          isWeekend ? 'bg-muted/20' : ''
        )}
      >
        <div>
          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
            {day.day.slice(0, 3)}
          </p>
          <h3 className="text-sm font-semibold leading-tight">{day.day}</h3>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isWeekend && (
            <span className="text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">
              Weekend
            </span>
          )}
          {/* Per-day rebuild button */}
          <button
            onClick={onRebuild}
            disabled={isRebuilding}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-colors disabled:opacity-40"
            title={`Rebuild ${day.day}`}
          >
            {isRebuilding ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <RotateCcw className="h-2.5 w-2.5" />
            )}
          </button>
        </div>
      </div>

      {/* Focus blocks */}
      {focusBlocks.length > 0 && (
        <div className="px-3 py-2.5 border-b border-border/40 bg-primary/[0.03]">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Timer className="h-2.5 w-2.5" />
            Focus
          </p>
          <ul className="space-y-1">
            {focusBlocks.map((fb, i) => (
              // Phase 11.F: FocusBlockItem adds a hover Start Timer link alongside remove
              <FocusBlockItem key={i} text={fb} onRemove={() => onRemoveFocusBlock(i)} />
            ))}
          </ul>
        </div>
      )}

      {/* Tasks */}
      {tasks.length > 0 && (
        <div className="px-3 py-2.5 border-b border-border/40">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <ListTodo className="h-2.5 w-2.5" />
            Tasks
          </p>
          <ul className="space-y-1">
            {tasks.map((task, i) => (
              <RemovableItem key={i} onRemove={() => onRemoveTask(i)} dot>
                {task}
              </RemovableItem>
            ))}
          </ul>
        </div>
      )}

      {/* Habits */}
      {habits.length > 0 && (
        <div className="px-3 py-2 border-b border-border/40">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Heart className="h-2.5 w-2.5 text-rose-400" />
            Habits
          </p>
          <ul className="space-y-1">
            {habits.map((h, i) => (
              <RemovableItem key={i} onRemove={() => onRemoveHabit(i)}>
                <span className="text-muted-foreground">{h}</span>
              </RemovableItem>
            ))}
          </ul>
        </div>
      )}

      {/* Rationale / tip */}
      {rationale && (
        <div className="px-3 py-2 mt-auto">
          <div className="flex items-start gap-1.5">
            <Info className="h-2.5 w-2.5 text-muted-foreground/50 shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground/60 leading-snug italic">{rationale}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────
function PlannerEmptyState({
  onGenerate,
  isGenerating,
}: {
  onGenerate: () => void
  isGenerating: boolean
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden animate-fade-in-up">
      <div className="flex flex-col items-center text-center px-8 py-16 max-w-lg mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
          <Brain className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">
          Your AI-powered week, planned in seconds
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          LifeOPS reads your tasks, habits, and goals — then generates a structured
          7-day plan with clear focus blocks, task assignments, and rationale for every day.
        </p>
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {[
            { icon: Target, label: 'Task-aligned' },
            { icon: CalendarRange, label: 'Due-date aware' },
            { icon: Heart, label: 'Habit-smart' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border/50"
            >
              <Icon className="h-3 w-3" />
              {label}
            </div>
          ))}
        </div>
        <Button onClick={onGenerate} disabled={isGenerating} size="lg" className="gap-2 px-8">
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating your plan…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Weekly Plan
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export function PlannerView({ weekStart, savedPlan }: PlannerViewProps) {
  const [plan, setPlan] = useState<GeneratedPlan | null>(savedPlan)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(savedPlan !== null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [isSaving, startSaving] = useTransition()
  // Per-day rebuild tracking: dayName → true when rebuilding that day
  const [rebuildingDay, setRebuildingDay] = useState<string | null>(null)
  const [isRebuildingWeek, setIsRebuildingWeek] = useState(false)

  // ── Mark plan dirty whenever state is mutated ──
  function markDirty() {
    setIsSaved(false)
    setSaveStatus('idle')
  }

  // ── Full week generate (existing flow) ────────────────────────────────
  async function handleGenerate() {
    setIsGenerating(true)
    setGenerateError(null)
    markDirty()

    try {
      const res = await fetch('/api/planner', { method: 'POST' })
      const data = await res.json()

      if (!res.ok || data.error) {
        const msg: string = data.error ?? 'Generation failed'
        setGenerateError(
          msg.includes('OPENAI_API_KEY') || msg.includes('API key') || res.status === 500
            ? 'OpenAI API key is not configured. Add OPENAI_API_KEY to your .env.local file.'
            : `Failed to generate plan: ${msg}`
        )
        return
      }

      setPlan(data.plan as GeneratedPlan)
    } catch {
      setGenerateError('Network error — please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Rebuild a single day ───────────────────────────────────────────────
  // Sends the current plan as context so the AI knows what's already scheduled.
  // The API returns a plan with only that one day; we merge it in.
  async function handleRebuildDay(dayName: string) {
    if (!plan) return
    setRebuildingDay(dayName)
    setGenerateError(null)

    try {
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'rebuild_day',
          targetDay: dayName,
          currentPlan: plan,
        }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setGenerateError(`Failed to rebuild ${dayName}: ${data.error ?? 'Unknown error'}`)
        return
      }

      const rebuiltDay: PlanDay | undefined = (data.plan as GeneratedPlan)?.days?.[0]
      if (rebuiltDay) {
        setPlan((prev) => ({
          ...prev!,
          days: prev!.days.map((d) => (d.day === dayName ? rebuiltDay : d)),
        }))
        markDirty()
      }
    } catch {
      setGenerateError(`Network error rebuilding ${dayName} — please try again.`)
    } finally {
      setRebuildingDay(null)
    }
  }

  // ── Rebuild rest of week ───────────────────────────────────────────────
  // Determines today's position in the week, sends current plan as context,
  // receives rebuilt days (today through Sunday), and merges them in while
  // preserving past days.
  async function handleRebuildRestOfWeek() {
    if (!plan) return
    setIsRebuildingWeek(true)
    setGenerateError(null)

    try {
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'rebuild_rest_of_week',
          currentPlan: plan,
        }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setGenerateError(`Failed to rebuild rest of week: ${data.error ?? 'Unknown error'}`)
        return
      }

      const rebuiltDays: PlanDay[] = (data.plan as GeneratedPlan)?.days ?? []
      if (rebuiltDays.length > 0) {
        const rebuiltByName = new Map(rebuiltDays.map((d) => [d.day, d]))
        setPlan((prev) => ({
          ...prev!,
          days: prev!.days.map((d) => rebuiltByName.get(d.day) ?? d),
        }))
        markDirty()
      }
    } catch {
      setGenerateError('Network error rebuilding rest of week — please try again.')
    } finally {
      setIsRebuildingWeek(false)
    }
  }

  // ── Remove an item from a day (pure client-state mutation) ────────────
  function removeFromDay(
    dayName: string,
    field: 'tasks' | 'habits' | 'focus_blocks',
    index: number
  ) {
    setPlan((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        days: prev.days.map((d) => {
          if (d.day !== dayName) return d
          const updated = { ...d }
          if (field === 'tasks') {
            if (updated.tasks) {
              updated.tasks = updated.tasks.filter((_, i) => i !== index)
            } else if (updated.topTasks) {
              updated.topTasks = updated.topTasks.filter((_, i) => i !== index)
            }
          } else if (field === 'habits') {
            if (updated.habits) {
              updated.habits = updated.habits.filter((_, i) => i !== index)
            } else {
              // v1 had a single string — removing the only item clears it
              updated.habitReminder = undefined
            }
          } else if (field === 'focus_blocks') {
            if (updated.focus_blocks) {
              updated.focus_blocks = updated.focus_blocks.filter((_, i) => i !== index)
            } else {
              updated.focusBlock = undefined
            }
          }
          return updated
        }),
      }
    })
    markDirty()
  }

  // ── Save ───────────────────────────────────────────────────────────────
  function handleSave() {
    if (!plan) return
    startSaving(async () => {
      const result = await savePlan(weekStart, plan)
      if (result.error) {
        setSaveStatus('error')
      } else {
        setSaveStatus('saved')
        setIsSaved(true)
      }
    })
  }

  // ── Determine whether "Rebuild rest of week" should be shown ──────────
  // Show only when there's an existing plan and it's not already Sunday.
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const showRebuildWeek = !!plan && todayName !== 'Sunday'
  const isAnyRebuildRunning = isRebuildingWeek || rebuildingDay !== null

  const weekdayCards = plan?.days.filter((d) => !IS_WEEKEND.has(d.day)) ?? []
  const weekendCards = plan?.days.filter((d) => IS_WEEKEND.has(d.day)) ?? []

  return (
    <div className="space-y-5">

      {/* ── Action bar ──────────────────────────────────────────────── */}
      {(plan || isGenerating) && (
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Full regenerate */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || isAnyRebuildRunning}
            variant={plan ? 'outline' : 'default'}
            size="sm"
            className="gap-1.5"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate Week
              </>
            )}
          </Button>

          {/* Rebuild rest of week */}
          {showRebuildWeek && (
            <Button
              onClick={handleRebuildRestOfWeek}
              disabled={isRebuildingWeek || isGenerating || rebuildingDay !== null}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              {isRebuildingWeek ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Rebuilding…
                </>
              ) : (
                <>
                  <CalendarClock className="h-3.5 w-3.5" />
                  Rebuild Rest of Week
                </>
              )}
            </Button>
          )}

          {/* Save */}
          {plan && (
            <Button
              onClick={handleSave}
              disabled={isSaving || isSaved || isGenerating || isAnyRebuildRunning}
              size="sm"
              className={cn(
                'gap-1.5',
                isSaved && 'bg-emerald-600 hover:bg-emerald-600 text-white border-emerald-600'
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : isSaved ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save Plan
                </>
              )}
            </Button>
          )}

          {/* Status messages */}
          {saveStatus === 'error' && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Failed to save — please try again
            </p>
          )}
          {plan && !isSaved && saveStatus === 'idle' && !isGenerating && !isAnyRebuildRunning && (
            <p className="text-xs text-muted-foreground/70 italic">Unsaved changes</p>
          )}
        </div>
      )}

      {/* ── Hint bar: hover × to remove items ──────────────────────── */}
      {plan && !isGenerating && (
        <p className="text-[11px] text-muted-foreground/50 px-0.5">
          Hover any task, habit, or focus block to remove it. Use the{' '}
          <RotateCcw className="inline h-2.5 w-2.5" /> icon on a day to rebuild just that day.
        </p>
      )}

      {/* ── Error state ─────────────────────────────────────────────── */}
      {generateError && (
        <div className="flex gap-3 items-start rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{generateError}</p>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!plan && !isGenerating && !generateError && (
        <PlannerEmptyState onGenerate={handleGenerate} isGenerating={isGenerating} />
      )}

      {/* ── Generating shimmer ──────────────────────────────────────── */}
      {isGenerating && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            <p className="text-xs text-muted-foreground animate-pulse">
              AI is crafting your personalised week…
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <ShimmerCard key={i} index={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[calc(40%+0.5rem)]">
            {Array.from({ length: 2 }).map((_, i) => (
              <ShimmerCard key={i} index={i + 5} />
            ))}
          </div>
        </div>
      )}

      {/* ── Plan grid ───────────────────────────────────────────────── */}
      {plan && !isGenerating && (
        <div className="space-y-4">
          {/* Mon – Fri */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {weekdayCards.map((day, i) => (
              <DayCard
                key={day.day}
                day={day}
                index={i}
                isRebuilding={rebuildingDay === day.day || isRebuildingWeek}
                onRebuild={() => handleRebuildDay(day.day)}
                onRemoveTask={(idx) => removeFromDay(day.day, 'tasks', idx)}
                onRemoveHabit={(idx) => removeFromDay(day.day, 'habits', idx)}
                onRemoveFocusBlock={(idx) => removeFromDay(day.day, 'focus_blocks', idx)}
              />
            ))}
          </div>

          {/* Sat – Sun */}
          {weekendCards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {weekendCards.map((day, i) => (
                <DayCard
                  key={day.day}
                  day={day}
                  index={weekdayCards.length + i}
                  isRebuilding={rebuildingDay === day.day || isRebuildingWeek}
                  onRebuild={() => handleRebuildDay(day.day)}
                  onRemoveTask={(idx) => removeFromDay(day.day, 'tasks', idx)}
                  onRemoveHabit={(idx) => removeFromDay(day.day, 'habits', idx)}
                  onRemoveFocusBlock={(idx) => removeFromDay(day.day, 'focus_blocks', idx)}
                />
              ))}
              {weekendCards.length < 2 && <div className="hidden xl:block" />}
              <div className="hidden xl:block" />
              <div className="hidden xl:block" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
