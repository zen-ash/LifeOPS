'use client'

import { useState, useTransition } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { savePlan } from '@/lib/actions/planner'
import type { GeneratedPlan, PlanDay } from '@/types'

interface PlannerViewProps {
  weekStart: string
  savedPlan: GeneratedPlan | null
}

// Left accent color per day — visible in both light and dark
const DAY_ACCENT: Record<string, string> = {
  Monday: 'border-l-blue-500',
  Tuesday: 'border-l-violet-500',
  Wednesday: 'border-l-emerald-500',
  Thursday: 'border-l-orange-500',
  Friday: 'border-l-rose-500',
  Saturday: 'border-l-amber-400',
  Sunday: 'border-l-slate-400',
}

// Weekday vs weekend distinction
const IS_WEEKEND = new Set(['Saturday', 'Sunday'])

// ── Shimmer skeleton card ──────────────────────────────────────────────
function ShimmerCard({ index }: { index: number }) {
  const delay = `${index * 120}ms`
  return (
    <div
      className="rounded-xl border bg-card overflow-hidden border-l-4 border-l-border/50"
      style={{ animationDelay: delay }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
        <div className="shimmer h-2.5 w-7 rounded" style={{ animationDelay: delay }} />
        <div className="shimmer h-2.5 w-20 rounded" style={{ animationDelay: `${index * 120 + 80}ms` }} />
      </div>
      {/* Focus block */}
      <div className="px-4 py-3 border-b border-border/40 space-y-2">
        <div className="shimmer h-2.5 w-full rounded" style={{ animationDelay: `${index * 120 + 160}ms` }} />
        <div className="shimmer h-2.5 w-4/5 rounded" style={{ animationDelay: `${index * 120 + 240}ms` }} />
      </div>
      {/* Tasks */}
      <div className="px-4 py-3 border-b border-border/40 space-y-2">
        <div className="shimmer h-2 w-10 rounded" style={{ animationDelay: `${index * 120 + 320}ms` }} />
        <div className="shimmer h-2.5 w-full rounded" style={{ animationDelay: `${index * 120 + 400}ms` }} />
        <div className="shimmer h-2.5 w-3/4 rounded" style={{ animationDelay: `${index * 120 + 480}ms` }} />
      </div>
      {/* Notes */}
      <div className="px-4 py-3 space-y-2">
        <div className="shimmer h-2.5 w-full rounded" style={{ animationDelay: `${index * 120 + 560}ms` }} />
        <div className="shimmer h-2.5 w-2/3 rounded" style={{ animationDelay: `${index * 120 + 640}ms` }} />
      </div>
    </div>
  )
}

// ── Day card ───────────────────────────────────────────────────────────
function DayCard({ day, index }: { day: PlanDay; index: number }) {
  const isWeekend = IS_WEEKEND.has(day.day)

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
          'px-4 pt-3.5 pb-2.5 border-b border-border/50 flex items-center justify-between',
          isWeekend ? 'bg-muted/20' : ''
        )}
      >
        <div>
          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
            {day.day.slice(0, 3)}
          </p>
          <h3 className="text-sm font-semibold leading-tight">{day.day}</h3>
        </div>
        {isWeekend && (
          <span className="text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">
            Weekend
          </span>
        )}
      </div>

      {/* Focus block */}
      <div className="px-4 py-2.5 border-b border-border/40 bg-primary/[0.03]">
        <div className="flex items-start gap-2">
          <Timer className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-foreground leading-snug">{day.focusBlock}</p>
        </div>
      </div>

      {/* Top tasks */}
      {day.topTasks.length > 0 && (
        <div className="px-4 py-2.5 border-b border-border/40">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">
            <ListTodo className="h-3 w-3 inline mr-1" />
            Tasks
          </p>
          <ul className="space-y-1.5">
            {day.topTasks.map((task, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-primary/50 shrink-0 mt-1.5" />
                <span className="text-xs text-foreground leading-snug">{task}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Habit reminder */}
      {day.habitReminder && (
        <div className="px-4 py-2 border-b border-border/40">
          <div className="flex items-start gap-2">
            <Heart className="h-3 w-3 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-snug">{day.habitReminder}</p>
          </div>
        </div>
      )}

      {/* Notes / tip */}
      {day.notes && (
        <div className="px-4 py-2.5 mt-auto">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-3 w-3 text-yellow-500/70 shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground/70 italic leading-snug">{day.notes}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────
function PlannerEmptyState({ onGenerate, isGenerating }: { onGenerate: () => void; isGenerating: boolean }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden animate-fade-in-up">
      <div className="flex flex-col items-center text-center px-8 py-16 max-w-lg mx-auto">
        {/* Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
          <Brain className="h-8 w-8 text-primary" />
        </div>

        {/* Headline */}
        <h2 className="text-xl font-bold tracking-tight mb-2">
          Your AI-powered week, planned in seconds
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          LifeOPS reads your tasks, habits, and goals — then generates a structured
          7-day plan that fits your schedule. One click, done.
        </p>

        {/* Feature chips */}
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

        {/* Primary CTA */}
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          size="lg"
          className="gap-2 px-8"
        >
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

// ── Main component ─────────────────────────────────────────────────────
export function PlannerView({ weekStart, savedPlan }: PlannerViewProps) {
  const [plan, setPlan] = useState<GeneratedPlan | null>(savedPlan)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(savedPlan !== null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [isSaving, startSaving] = useTransition()

  async function handleGenerate() {
    setIsGenerating(true)
    setGenerateError(null)
    setIsSaved(false)
    setSaveStatus('idle')

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

  // Weekday cards (Mon–Fri) and weekend cards (Sat–Sun) for layout split
  const weekdayCards = plan?.days.filter((d) => !IS_WEEKEND.has(d.day)) ?? []
  const weekendCards = plan?.days.filter((d) => IS_WEEKEND.has(d.day)) ?? []

  return (
    <div className="space-y-5">

      {/* ── Action bar (only shown when plan exists) ─────────────── */}
      {(plan || isGenerating) && (
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            variant={plan ? 'outline' : 'default'}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </>
            )}
          </Button>

          {plan && (
            <Button
              onClick={handleSave}
              disabled={isSaving || isSaved}
              className={cn(
                'gap-2',
                isSaved && 'bg-emerald-600 hover:bg-emerald-600 text-white border-emerald-600'
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : isSaved ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
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
          {plan && !isSaved && saveStatus === 'idle' && (
            <p className="text-xs text-muted-foreground/70 italic">Unsaved changes</p>
          )}
        </div>
      )}

      {/* ── Error state ──────────────────────────────────────────── */}
      {generateError && (
        <div className="flex gap-3 items-start rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{generateError}</p>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────── */}
      {!plan && !isGenerating && !generateError && (
        <PlannerEmptyState onGenerate={handleGenerate} isGenerating={isGenerating} />
      )}

      {/* ── Generating shimmer ───────────────────────────────────── */}
      {isGenerating && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            <p className="text-xs text-muted-foreground animate-pulse">
              AI is crafting your personalised week…
            </p>
          </div>
          {/* Weekday row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <ShimmerCard key={i} index={i} />
            ))}
          </div>
          {/* Weekend row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[calc(40%+0.5rem)]">
            {Array.from({ length: 2 }).map((_, i) => (
              <ShimmerCard key={i} index={i + 5} />
            ))}
          </div>
        </div>
      )}

      {/* ── Plan grid ────────────────────────────────────────────── */}
      {plan && !isGenerating && (
        <div className="space-y-4">
          {/* Mon – Fri */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {weekdayCards.map((day, i) => (
              <DayCard key={day.day} day={day} index={i} />
            ))}
          </div>

          {/* Sat – Sun: match 2/5 width on xl, 2/3 on lg */}
          {weekendCards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {weekendCards.map((day, i) => (
                <DayCard key={day.day} day={day} index={weekdayCards.length + i} />
              ))}
              {/* Invisible spacers to keep weekend cards left-aligned at same width */}
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
