'use client'

import { useState } from 'react'
import type { ComponentType } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Zap, ArrowRight, ArrowLeft, Sparkles, Check, Loader2,
  BookOpen, Heart, Smile, TrendingUp, Users, Pencil, DollarSign, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { completeOnboarding } from '@/lib/actions/onboarding'

// ── Data ──────────────────────────────────────────────────────────────────────

// Stored in DB as-is — do not change these strings
const GOAL_OPTIONS = [
  '🎓 Better grades',
  '💻 Learn coding',
  '📚 Read more',
  '🏃 Exercise regularly',
  '⏰ Time management',
  '🧘 Reduce stress',
  '🚀 Build side projects',
  '💼 Internship / job prep',
  '🎯 Deep focus',
  '💡 Learn new skills',
]

interface PriorityOption {
  label: string
  icon: ComponentType<{ className?: string }>
}

// Labels stored in DB as-is — do not change these strings
const PRIORITY_OPTIONS: PriorityOption[] = [
  { label: 'Academic excellence',  icon: BookOpen   },
  { label: 'Physical health',      icon: Heart      },
  { label: 'Mental wellbeing',     icon: Smile      },
  { label: 'Career growth',        icon: TrendingUp },
  { label: 'Social life',          icon: Users      },
  { label: 'Creative projects',    icon: Pencil     },
  { label: 'Financial stability',  icon: DollarSign },
  { label: 'Personal development', icon: Star       },
]

const TIMEZONE_OPTIONS = [
  { value: 'UTC',                 label: 'UTC' },
  { value: 'America/New_York',    label: 'Eastern Time — New York' },
  { value: 'America/Chicago',     label: 'Central Time — Chicago' },
  { value: 'America/Denver',      label: 'Mountain Time — Denver' },
  { value: 'America/Los_Angeles', label: 'Pacific Time — Los Angeles' },
  { value: 'America/Toronto',     label: 'Toronto' },
  { value: 'America/Vancouver',   label: 'Vancouver' },
  { value: 'Europe/London',       label: 'London (GMT)' },
  { value: 'Europe/Paris',        label: 'Paris (CET)' },
  { value: 'Europe/Berlin',       label: 'Berlin (CET)' },
  { value: 'Europe/Amsterdam',    label: 'Amsterdam' },
  { value: 'Asia/Kolkata',        label: 'India (IST)' },
  { value: 'Asia/Karachi',        label: 'Pakistan (PKT)' },
  { value: 'Asia/Dubai',          label: 'Dubai (GST)' },
  { value: 'Asia/Singapore',      label: 'Singapore (SGT)' },
  { value: 'Asia/Shanghai',       label: 'China (CST)' },
  { value: 'Asia/Tokyo',          label: 'Japan (JST)' },
  { value: 'Australia/Sydney',    label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland',    label: 'Auckland (NZST)' },
]

const TOTAL_STEPS = 4
const STEP_LABELS = ['Goals', 'Schedule', 'Priorities', 'Timezone']

// ── Component ─────────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  defaultTimezone: string
}

export function OnboardingWizard({ defaultTimezone }: OnboardingWizardProps) {
  const [step,       setStep]       = useState(1)
  const [goals,      setGoals]      = useState<string[]>([])
  const [studyHours, setStudyHours] = useState('20')
  const [priorities, setPriorities] = useState<string[]>([])
  const [timezone,   setTimezone]   = useState(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    const supported = TIMEZONE_OPTIONS.some((tz) => tz.value === detected)
    return supported ? detected : (defaultTimezone || 'UTC')
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  function toggleGoal(goal: string) {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    )
  }

  function togglePriority(label: string) {
    setPriorities((prev) => {
      if (prev.includes(label)) return prev.filter((p) => p !== label)
      if (prev.length >= 3) return prev
      return [...prev, label]
    })
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    const result = await completeOnboarding({
      goals,
      study_hours_per_week: parseInt(studyHours) || 0,
      priorities,
      timezone,
    })
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  // Step 1 requires at least one goal before continuing
  const canContinue = step !== 1 || goals.length > 0

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg">

        {/* ── Branding ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">LifeOPS</span>
        </div>

        {/* ── Step indicator ────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-2.5 mb-6">
          <p className="text-xs text-muted-foreground">
            Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step - 1]}
          </p>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
              const n = i + 1
              return (
                <div
                  key={i}
                  className={cn(
                    'rounded-full transition-all duration-300',
                    n === step
                      ? 'w-6 h-1.5 bg-primary'
                      : n < step
                      ? 'w-1.5 h-1.5 bg-primary/50'
                      : 'w-1.5 h-1.5 bg-border'
                  )}
                />
              )
            })}
          </div>
        </div>

        {/* ── Step card — key triggers remount + fade-in on each step ───── */}
        <div
          key={step}
          className="rounded-2xl border bg-card shadow-sm p-6 sm:p-8 space-y-5 animate-fade-in-up"
        >

          {/* Step 1: Goals ───────────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">What are your goals?</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Select all that apply — we use this to tailor your experience.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {GOAL_OPTIONS.map((goal) => {
                  const [icon, ...rest] = goal.split(' ')
                  const text = rest.join(' ')
                  const isSelected = goals.includes(goal)
                  return (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => toggleGoal(goal)}
                      className={cn(
                        'relative p-3 rounded-xl border text-left transition-all duration-150',
                        'flex items-center gap-2.5',
                        isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/20'
                          : 'border-border hover:border-primary/40 hover:bg-accent/60'
                      )}
                    >
                      <span className="text-base shrink-0">{icon}</span>
                      <span className={cn(
                        'text-sm font-medium leading-snug',
                        isSelected ? 'text-primary' : 'text-foreground'
                      )}>
                        {text}
                      </span>
                      {isSelected && (
                        <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {goals.length === 0
                  ? 'Select at least one goal to continue'
                  : `${goals.length} goal${goals.length !== 1 ? 's' : ''} selected`}
              </p>
            </>
          )}

          {/* Step 2: Study hours ─────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Study & work hours</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  How many hours per week do you plan to study or work?
                </p>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    id="study-hours"
                    type="number"
                    min="1"
                    max="168"
                    value={studyHours}
                    onChange={(e) => setStudyHours(e.target.value)}
                    className={cn(
                      'text-center text-3xl font-bold h-20 pr-16',
                      '[appearance:textfield]',
                      '[&::-webkit-outer-spin-button]:appearance-none',
                      '[&::-webkit-inner-spin-button]:appearance-none'
                    )}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none select-none">
                    hrs/wk
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[10, 20, 30, 40, 50].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setStudyHours(String(h))}
                      className={cn(
                        'px-3.5 py-1.5 rounded-full border text-sm font-medium transition-all duration-150',
                        studyHours === String(h)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/40 hover:bg-accent/60 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 3: Priorities ──────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Your top priorities</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Pick up to 3 things that matter most to you right now.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITY_OPTIONS.map(({ label, icon: Icon }) => {
                  const isSelected = priorities.includes(label)
                  const maxReached = priorities.length >= 3 && !isSelected
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => togglePriority(label)}
                      disabled={maxReached}
                      className={cn(
                        'relative p-3 rounded-xl border text-left transition-all duration-150',
                        'flex items-center gap-2.5',
                        isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/20'
                          : maxReached
                          ? 'border-border opacity-40 cursor-not-allowed'
                          : 'border-border hover:border-primary/40 hover:bg-accent/60'
                      )}
                    >
                      <Icon className={cn(
                        'h-4 w-4 shrink-0',
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      )} />
                      <span className={cn(
                        'text-sm font-medium leading-snug',
                        isSelected ? 'text-primary' : 'text-foreground'
                      )}>
                        {label}
                      </span>
                      {isSelected && (
                        <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {priorities.length === 0
                  ? 'Select up to 3 priorities'
                  : priorities.length === 3
                  ? 'Maximum reached — deselect one to swap'
                  : `${3 - priorities.length} selection${3 - priorities.length === 1 ? '' : 's'} remaining`}
              </p>
            </>
          )}

          {/* Step 4: Timezone ────────────────────────────────────────────── */}
          {step === 4 && (
            <>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Your timezone</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Used for scheduling, weekly plans, and your daily planner.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="timezone" className="text-sm font-medium">Timezone</label>
                  <span className="text-xs text-muted-foreground">Auto-detected</span>
                </div>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-xl border border-destructive/20">
                  {error}
                </div>
              )}

              {/* Setup summary */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Your setup
                </p>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Goals</span>
                  <span className="font-medium text-right">
                    {goals.length > 0 ? `${goals.length} selected` : 'None'}
                  </span>
                  <span className="text-muted-foreground">Study hours</span>
                  <span className="font-medium tabular-nums text-right">{studyHours}h / week</span>
                  <span className="text-muted-foreground">Priorities</span>
                  <span className="font-medium text-right text-xs leading-relaxed">
                    {priorities.length > 0 ? priorities.join(', ') : 'None'}
                  </span>
                </div>
              </div>
            </>
          )}

        </div>
        {/* end step card */}

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <div className="flex gap-3 mt-4">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={loading}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}

          {step < TOTAL_STEPS ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 gap-1.5"
              disabled={!canContinue}
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="flex-1 h-11 gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Setting up your workspace…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Launch LifeOPS
                </>
              )}
            </Button>
          )}
        </div>

        {/* Skip — only on step 1 */}
        {step === 1 && (
          <p className="text-center mt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip this step →
            </button>
          </p>
        )}

      </div>
    </div>
  )
}
