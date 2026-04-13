'use client'

import { useState, useTransition, useMemo } from 'react'
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
  AlertTriangle,
  Wrench,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { savePlan } from '@/lib/actions/planner'
import { syncPlanToCalendar } from '@/lib/actions/calendarActions'
import { PLANNER_TEMPLATES, type PlannerTemplate } from '@/lib/templates'
import type { GeneratedPlan, PlanDay, CalendarEvent } from '@/types'

// Phase 13.A: realism types
interface AtRiskTask {
  title: string
  priority: string
  dueDate: string
}

interface DayOverloadInfo {
  plannedMinutes: number
  availableMinutes: number
  isOverloaded: boolean
}

interface PlannerViewProps {
  weekStart: string
  savedPlan: GeneratedPlan | null
  // Phase 13.A: realism signals from server
  availableMinutesPerDay: number
  atRiskTasks: AtRiskTask[]
  // Phase 14.A: calendar integration — optional so the planner degrades gracefully when not connected
  calendarEventsByDay?: Record<string, CalendarEvent[]>
  calendarBusyMinutesByDay?: Record<string, number>
  // Phase 14.B: whether the user has an active Google Calendar connection (enables Sync button)
  calendarConnected?: boolean
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

// Phase 13.A / 14.A: compute per-day overload from the current plan.
// Uses simple approximation: each task ≈ 30 min, each focus block ≈ 45 min.
// Phase 14.A: subtracts calendar busy minutes from available time per day so
// real calendar events reduce the effective capacity the AI plan is measured against.
function computeOverload(
  plan: GeneratedPlan | null,
  availableMinutes: number,
  calendarBusyByDay: Record<string, number> = {}
): Map<string, DayOverloadInfo> {
  const result = new Map<string, DayOverloadInfo>()
  if (!plan) return result
  for (const day of plan.days) {
    const { tasks, focusBlocks } = normDay(day)
    const plannedMinutes    = tasks.length * 30 + focusBlocks.length * 45
    const calendarBusy      = calendarBusyByDay[day.day] ?? 0
    const effectiveAvailable = Math.max(0, availableMinutes - calendarBusy)
    result.set(day.day, {
      plannedMinutes,
      availableMinutes: effectiveAvailable,
      isOverloaded:     plannedMinutes > effectiveAvailable,
    })
  }
  return result
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
  // Phase 13.A: overload info for this day
  overloadInfo?: DayOverloadInfo
  // Phase 14.A: read-only calendar events for this day
  calendarEvents?: CalendarEvent[]
}

function DayCard({
  day,
  index,
  isRebuilding,
  onRebuild,
  onRemoveTask,
  onRemoveHabit,
  onRemoveFocusBlock,
  overloadInfo,
  calendarEvents = [],
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
          {/* Phase 13.A: overload badge */}
          {overloadInfo?.isOverloaded && (
            <span
              className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5"
              title={`~${overloadInfo.plannedMinutes} min planned vs ${overloadInfo.availableMinutes} min available`}
            >
              <Clock className="h-2 w-2" />
              Full
            </span>
          )}
          {/* Per-day rebuild button — also acts as "Repair" when day is overloaded */}
          <button
            onClick={onRebuild}
            disabled={isRebuilding}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-colors disabled:opacity-40"
            title={overloadInfo?.isOverloaded ? `Repair ${day.day} (overloaded)` : `Rebuild ${day.day}`}
          >
            {isRebuilding ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <RotateCcw className="h-2.5 w-2.5" />
            )}
          </button>
        </div>
      </div>

      {/* Phase 14.A / 14.B: Read-only Google Calendar events — visually distinct from planner items.
          Phase 14.B: LifeOPS-managed events (is_lifeops_managed=true) are filtered out here;
          they are already shown in the Focus blocks section and would be duplicate/noisy. */}
      {calendarEvents.filter((ev) => !ev.is_lifeops_managed).length > 0 && (
        <div className="px-3 py-2.5 border-b border-border/40 bg-sky-500/[0.04]">
          <p className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <CalendarRange className="h-2.5 w-2.5" />
            Calendar
          </p>
          <ul className="space-y-1">
            {calendarEvents
              .filter((ev) => !ev.is_lifeops_managed)
              .map((ev) => {
                const startLabel = ev.is_all_day
                  ? 'All day'
                  : new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                return (
                  <li key={ev.id} className="flex items-start gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-sky-500/60 shrink-0 mt-1.5" />
                    <span className="text-xs text-sky-700 dark:text-sky-300 leading-snug min-w-0 flex-1">
                      {ev.title}
                      <span className="ml-1 text-[10px] text-sky-600/60 dark:text-sky-400/60 font-medium">
                        {startLabel}
                      </span>
                    </span>
                  </li>
                )
              })}
          </ul>
        </div>
      )}

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

// ── Template accent classes ────────────────────────────────────────────────
// Maps template accentColor to Tailwind classes for border and pill backgrounds.
// Using explicit class strings (not dynamic) so Tailwind includes them in the build.
const ACCENT_BORDER: Record<string, string> = {
  orange:  'border-orange-500/50 bg-orange-500/5',
  blue:    'border-blue-500/50 bg-blue-500/5',
  violet:  'border-violet-500/50 bg-violet-500/5',
  emerald: 'border-emerald-500/50 bg-emerald-500/5',
  rose:    'border-rose-500/50 bg-rose-500/5',
  amber:   'border-amber-500/50 bg-amber-500/5',
}
const ACCENT_PILL: Record<string, string> = {
  orange:  'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  blue:    'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  violet:  'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  rose:    'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  amber:   'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}
const ACCENT_BADGE: Record<string, string> = {
  orange:  'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  blue:    'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  violet:  'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  rose:    'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  amber:   'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
}

// ── Template picker card ───────────────────────────────────────────────────
function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: PlannerTemplate
  selected: boolean
  onSelect: () => void
}) {
  const borderCls = ACCENT_BORDER[template.accentColor] ?? 'border-border bg-card'
  const pillCls   = ACCENT_PILL[template.accentColor]   ?? 'bg-muted text-muted-foreground'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-xl border-2 p-4 transition-all duration-150',
        'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected ? borderCls : 'border-border bg-card hover:border-border/80 hover:bg-muted/30'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-semibold leading-snug">{template.title}</p>
        {selected && (
          <span className="shrink-0 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
            <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-snug mb-3">{template.description}</p>
      <div className="flex flex-wrap gap-1">
        {template.focus_areas.map((area) => (
          <span
            key={area}
            className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
              selected ? pillCls : 'bg-muted text-muted-foreground'
            )}
          >
            {area}
          </span>
        ))}
      </div>
    </button>
  )
}

// ── Empty state (with template picker) ────────────────────────────────────
function PlannerEmptyState({
  onGenerate,
  isGenerating,
  selectedTemplate,
  onSelectTemplate,
}: {
  onGenerate: () => void
  isGenerating: boolean
  selectedTemplate: string | null
  onSelectTemplate: (id: string | null) => void
}) {
  const active = PLANNER_TEMPLATES.find((t) => t.id === selectedTemplate) ?? null

  return (
    <div className="rounded-xl border bg-card overflow-hidden animate-fade-in-up">
      <div className="px-6 pt-8 pb-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Brain className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold tracking-tight mb-1">
            Plan your week with AI
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
            Choose a template to guide the AI — or generate a personalised plan based on your tasks and habits.
          </p>
        </div>

        {/* Template picker grid */}
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">
          Weekly Template <span className="normal-case font-normal text-muted-foreground/40">(optional)</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {PLANNER_TEMPLATES.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              selected={selectedTemplate === t.id}
              onSelect={() => onSelectTemplate(selectedTemplate === t.id ? null : t.id)}
            />
          ))}
        </div>

        {/* Skip / clear hint */}
        {selectedTemplate && (
          <button
            type="button"
            onClick={() => onSelectTemplate(null)}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors mb-6 flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear template — generate a personalised plan instead
          </button>
        )}
        {!selectedTemplate && (
          <p className="text-xs text-muted-foreground/50 mb-6">
            No template selected — plan will be based on your tasks, habits, and goals only.
          </p>
        )}

        {/* Generate button */}
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          size="lg"
          className="w-full gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating your plan…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {active ? `Generate ${active.title} Plan` : 'Generate Weekly Plan'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export function PlannerView({
  weekStart,
  savedPlan,
  availableMinutesPerDay,
  atRiskTasks,
  calendarEventsByDay = {},
  calendarBusyMinutesByDay = {},
  calendarConnected = false,
}: PlannerViewProps) {
  const [plan, setPlan] = useState<GeneratedPlan | null>(savedPlan)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(savedPlan !== null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [isSaving, startSaving] = useTransition()
  // Per-day rebuild tracking: dayName → true when rebuilding that day
  const [rebuildingDay, setRebuildingDay] = useState<string | null>(null)
  const [isRebuildingWeek, setIsRebuildingWeek] = useState(false)
  // Phase 12.B: selected template — persists across regenerations in this session
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  // Phase 14.B: calendar sync state
  const [isSyncing, startSyncing] = useTransition()
  const [syncStatus, setSyncStatus] = useState<'idle' | 'synced' | 'error'>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)

  // Phase 13.A / 14.A: per-day overload map — recomputed when plan or calendar data changes.
  // calendarBusyMinutesByDay reduces effective available minutes per day.
  const overloadMap = useMemo(
    () => computeOverload(plan, availableMinutesPerDay, calendarBusyMinutesByDay),
    [plan, availableMinutesPerDay, calendarBusyMinutesByDay]
  )
  const overloadedDays = useMemo(
    () =>
      [...overloadMap.entries()]
        .filter(([, info]) => info.isOverloaded)
        .map(([day]) => day),
    [overloadMap]
  )

  const activeTemplate = selectedTemplate
    ? PLANNER_TEMPLATES.find((t) => t.id === selectedTemplate) ?? null
    : null

  // ── Mark plan dirty whenever state is mutated ──
  function markDirty() {
    setIsSaved(false)
    setSaveStatus('idle')
    // Phase 14.B: plan changed — previous sync is now stale
    setSyncStatus('idle')
    setSyncError(null)
  }

  // ── Full week generate (existing flow) ────────────────────────────────
  async function handleGenerate() {
    setIsGenerating(true)
    setGenerateError(null)
    markDirty()

    try {
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplate ?? undefined }),
      })
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
  // Phase 13.A: also passes repairContext when the day is overloaded or tasks are at risk.
  async function handleRebuildDay(dayName: string) {
    if (!plan) return
    setRebuildingDay(dayName)
    setGenerateError(null)

    const dayOverload = overloadMap.get(dayName)
    const repairContext =
      dayOverload?.isOverloaded || atRiskTasks.length > 0
        ? {
            overloadedDays: dayOverload?.isOverloaded ? [dayName] : [],
            atRiskTaskTitles: atRiskTasks.map((t) => `${t.title} (due ${t.dueDate})`),
            availableMinutesPerDay,
          }
        : undefined

    try {
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'rebuild_day',
          targetDay: dayName,
          currentPlan: plan,
          templateId: selectedTemplate ?? undefined,
          repairContext,
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
  // Phase 13.A: passes repairContext when overloaded days or at-risk tasks exist.
  async function handleRebuildRestOfWeek() {
    if (!plan) return
    setIsRebuildingWeek(true)
    setGenerateError(null)

    const repairContext =
      overloadedDays.length > 0 || atRiskTasks.length > 0
        ? {
            overloadedDays,
            atRiskTaskTitles: atRiskTasks.map((t) => `${t.title} (due ${t.dueDate})`),
            availableMinutesPerDay,
          }
        : undefined

    try {
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'rebuild_rest_of_week',
          currentPlan: plan,
          templateId: selectedTemplate ?? undefined,
          repairContext,
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

  // ── Phase 14.B: Sync focus blocks to Google Calendar ──────────────────
  // Pushes each focus block in the plan to Google Calendar as a timed event,
  // patches existing synced events, and removes stale ones (blocks removed from plan).
  function handleSyncToCalendar() {
    if (!plan) return
    setSyncError(null)
    startSyncing(async () => {
      const result = await syncPlanToCalendar(weekStart, plan)
      if (result.error) {
        setSyncStatus('error')
        setSyncError(result.error)
      } else {
        setSyncStatus('synced')
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
          {/* Phase 12.B: active template badge — shows which template shaped this plan */}
          {activeTemplate && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md border',
                ACCENT_BADGE[activeTemplate.accentColor] ?? 'bg-muted text-muted-foreground border-border/50'
              )}
            >
              <Sparkles className="h-2.5 w-2.5" />
              {activeTemplate.title}
              <button
                onClick={() => setSelectedTemplate(null)}
                className="opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Clear template"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
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

          {/* Phase 14.B: Sync focus blocks to Google Calendar */}
          {calendarConnected && plan && (
            <Button
              onClick={handleSyncToCalendar}
              disabled={isSyncing || isGenerating || isAnyRebuildRunning}
              variant="outline"
              size="sm"
              className={cn(
                'gap-1.5',
                syncStatus === 'synced' && 'border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-500/5 hover:bg-sky-500/10'
              )}
              title="Push focus blocks to Google Calendar (9 AM UTC · drag to adjust)"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Syncing…
                </>
              ) : syncStatus === 'synced' ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Synced to Calendar
                </>
              ) : (
                <>
                  <CalendarRange className="h-3.5 w-3.5" />
                  Sync to Calendar
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
          {syncStatus === 'error' && syncError && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {syncError}
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

      {/* ── Empty state (with template picker) ──────────────────────── */}
      {!plan && !isGenerating && !generateError && (
        <PlannerEmptyState
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          selectedTemplate={selectedTemplate}
          onSelectTemplate={setSelectedTemplate}
        />
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

      {/* ── Phase 13.A: Risk / overload banner ──────────────────────── */}
      {plan && !isGenerating && (atRiskTasks.length > 0 || overloadedDays.length > 0) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-3 animate-fade-in-up">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 leading-snug">
              {[
                atRiskTasks.length > 0
                  ? `${atRiskTasks.length} task${atRiskTasks.length > 1 ? 's' : ''} due within 3 days`
                  : null,
                overloadedDays.length > 0
                  ? `${overloadedDays.length} day${overloadedDays.length > 1 ? 's' : ''} look${overloadedDays.length === 1 ? 's' : ''} full`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {atRiskTasks.length > 0 && (
              <p className="text-[11px] text-muted-foreground leading-snug">
                {atRiskTasks.map((t) => `${t.title} (due ${t.dueDate})`).join(' · ')}
              </p>
            )}
            {overloadedDays.length > 0 && (
              <p className="text-[11px] text-muted-foreground leading-snug">
                Overloaded: {overloadedDays.join(', ')} — each day is estimated at ~
                {availableMinutesPerDay} min available. Repair to rebalance.
              </p>
            )}
          </div>
          <Button
            onClick={handleRebuildRestOfWeek}
            disabled={isRebuildingWeek || isGenerating || rebuildingDay !== null}
            size="sm"
            variant="outline"
            className="gap-1.5 shrink-0 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
          >
            {isRebuildingWeek ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Repairing…
              </>
            ) : (
              <>
                <Wrench className="h-3.5 w-3.5" />
                Repair Rest of Week
              </>
            )}
          </Button>
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
                overloadInfo={overloadMap.get(day.day)}
                calendarEvents={calendarEventsByDay[day.day]}
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
                  overloadInfo={overloadMap.get(day.day)}
                  calendarEvents={calendarEventsByDay[day.day]}
                />
              ))}
              {weekendCards.length < 2 && <div className="hidden xl:block" />}
              <div className="hidden xl:block" />
              <div className="hidden xl:block" />
            </div>
          )}

          {/* Phase 13.A: Deferred tasks — shown when AI explicitly couldn't fit them */}
          {plan.deferredTasks && plan.deferredTasks.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 animate-fade-in-up">
              <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                Deferred — couldn&apos;t fit this week
              </p>
              <ul className="space-y-1">
                {plan.deferredTasks.map((task, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-amber-500/50 shrink-0" />
                    {task}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground/60 mt-2.5">
                These tasks were lower priority or undated. Add them to next week&apos;s plan when you&apos;re ready.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
