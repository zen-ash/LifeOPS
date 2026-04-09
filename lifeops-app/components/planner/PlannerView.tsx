'use client'

import { useState, useTransition } from 'react'
import {
  Wand2,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  ListTodo,
  Heart,
  Lightbulb,
  Timer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { savePlan } from '@/lib/actions/planner'
import type { GeneratedPlan, PlanDay } from '@/types'

interface PlannerViewProps {
  weekStart: string
  savedPlan: GeneratedPlan | null
}

const DAY_COLORS: Record<string, string> = {
  Monday: 'border-blue-200 dark:border-blue-800',
  Tuesday: 'border-purple-200 dark:border-purple-800',
  Wednesday: 'border-green-200 dark:border-green-800',
  Thursday: 'border-orange-200 dark:border-orange-800',
  Friday: 'border-pink-200 dark:border-pink-800',
  Saturday: 'border-yellow-200 dark:border-yellow-800',
  Sunday: 'border-gray-200 dark:border-gray-700',
}

function DayCard({ day }: { day: PlanDay }) {
  return (
    <div
      className={cn(
        'rounded-xl border-2 bg-card p-4 space-y-3',
        DAY_COLORS[day.day] ?? 'border-border'
      )}
    >
      {/* Day header */}
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary shrink-0" />
        <h3 className="font-semibold text-sm">{day.day}</h3>
      </div>

      {/* Focus block */}
      <div className="flex gap-2">
        <Timer className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-foreground leading-snug">{day.focusBlock}</p>
      </div>

      {/* Top tasks */}
      {day.topTasks.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <ListTodo className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Tasks
            </p>
          </div>
          <ul className="space-y-0.5 pl-5">
            {day.topTasks.map((task, i) => (
              <li key={i} className="text-sm text-foreground list-disc leading-snug">
                {task}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Habit reminder */}
      {day.habitReminder && (
        <div className="flex gap-2">
          <Heart className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
          <p className="text-sm text-foreground leading-snug">{day.habitReminder}</p>
        </div>
      )}

      {/* Notes / tip */}
      {day.notes && (
        <div className="flex gap-2 border-t pt-2 mt-2">
          <Lightbulb className="h-3.5 w-3.5 text-yellow-500 dark:text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-snug italic">{day.notes}</p>
        </div>
      )}
    </div>
  )
}

export function PlannerView({ weekStart, savedPlan }: PlannerViewProps) {
  // `plan` is the plan currently displayed (may differ from what's saved)
  const [plan, setPlan] = useState<GeneratedPlan | null>(savedPlan)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  // `isSaved` tracks whether the displayed plan is the same as what's in the DB
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

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : plan ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Regenerate Plan
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              Generate Weekly Plan
            </>
          )}
        </Button>

        {plan && (
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving || isSaved}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : isSaved ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
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

        {saveStatus === 'saved' && (
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Plan saved for the week of {weekStart}
          </p>
        )}
        {saveStatus === 'error' && (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" />
            Failed to save — please try again
          </p>
        )}
      </div>

      {/* Error state */}
      {generateError && (
        <div className="flex gap-2 items-start rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{generateError}</p>
        </div>
      )}

      {/* Empty state */}
      {!plan && !isGenerating && !generateError && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl text-muted-foreground gap-4">
          <Wand2 className="h-10 w-10 opacity-30" />
          <div className="text-center">
            <p className="font-medium">No plan for this week yet</p>
            <p className="text-sm mt-1">
              Click <span className="font-medium text-foreground">Generate Weekly Plan</span> to
              create your personalised plan based on your tasks, habits, and goals.
            </p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isGenerating && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border-2 border-border bg-card p-4 space-y-3 animate-pulse"
            >
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-4/5" />
              <div className="h-3 bg-muted rounded w-3/5" />
            </div>
          ))}
        </div>
      )}

      {/* Plan grid */}
      {plan && !isGenerating && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {plan.days.map((day) => (
              <DayCard key={day.day} day={day} />
            ))}
          </div>

          {!isSaved && (
            <p className="text-xs text-muted-foreground text-center">
              This plan is not saved yet — click <span className="font-medium">Save Plan</span> to
              keep it.
            </p>
          )}
        </>
      )}
    </div>
  )
}
