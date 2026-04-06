'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Zap, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { completeOnboarding } from '@/lib/actions/onboarding'

// ── Options ────────────────────────────────────────────────────────────────

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

const PRIORITY_OPTIONS = [
  'Academic excellence',
  'Physical health',
  'Mental wellbeing',
  'Career growth',
  'Social life',
  'Creative projects',
  'Financial stability',
  'Personal development',
]

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time — New York' },
  { value: 'America/Chicago', label: 'Central Time — Chicago' },
  { value: 'America/Denver', label: 'Mountain Time — Denver' },
  { value: 'America/Los_Angeles', label: 'Pacific Time — Los Angeles' },
  { value: 'America/Toronto', label: 'Toronto' },
  { value: 'America/Vancouver', label: 'Vancouver' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Karachi', label: 'Pakistan (PKT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
]

const TOTAL_STEPS = 4

// ── Component ──────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  defaultTimezone: string
}

export function OnboardingWizard({ defaultTimezone }: OnboardingWizardProps) {
  const [step, setStep] = useState(1)
  const [goals, setGoals] = useState<string[]>([])
  const [studyHours, setStudyHours] = useState('20')
  const [priorities, setPriorities] = useState<string[]>([])
  const [timezone, setTimezone] = useState(() => {
    // Auto-detect the browser's IANA timezone (e.g. "Asia/Kolkata")
    // and pre-select it if it's in our supported list.
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    const isSupported = TIMEZONE_OPTIONS.some((tz) => tz.value === detected)
    return isSupported ? detected : (defaultTimezone || 'UTC')
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleGoal(goal: string) {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    )
  }

  function togglePriority(priority: string) {
    setPriorities((prev) => {
      if (prev.includes(priority)) return prev.filter((p) => p !== priority)
      if (prev.length >= 3) return prev // max 3
      return [...prev, priority]
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

    // If redirect() was called in the action, this line won't run.
    // We only reach here if there was an error.
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  const progressPercent = ((step - 1) / TOTAL_STEPS) * 100

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10 justify-center">
          <Zap className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">LifeOPS</span>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Step {step} of {TOTAL_STEPS}</span>
            <span>{Math.round(progressPercent)}% complete</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* ── Step 1: Goals ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">What are your goals?</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Select all that apply — LifeOPS uses this to tailor your experience.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {GOAL_OPTIONS.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => toggleGoal(goal)}
                  className={cn(
                    'p-3 rounded-lg border text-sm text-left transition-all duration-150',
                    goals.includes(goal)
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:border-primary/40 hover:bg-accent'
                  )}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Study hours ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Study & work hours</h2>
              <p className="text-muted-foreground text-sm mt-1">
                How many hours per week do you plan to study or work?
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="study-hours">Hours per week</Label>
                <Input
                  id="study-hours"
                  type="number"
                  min="1"
                  max="168"
                  value={studyHours}
                  onChange={(e) => setStudyHours(e.target.value)}
                  className="text-center text-2xl font-bold h-14"
                />
              </div>
              {/* Quick preset chips */}
              <div className="flex gap-2 flex-wrap">
                {[10, 20, 30, 40, 50].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setStudyHours(String(h))}
                    className={cn(
                      'px-4 py-1.5 rounded-full border text-sm transition-all',
                      studyHours === String(h)
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border hover:border-primary/40 hover:bg-accent'
                    )}
                  >
                    {h}h / week
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Priorities ────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Your top priorities</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Pick up to 3 things that matter most to you right now.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PRIORITY_OPTIONS.map((priority) => {
                const isSelected = priorities.includes(priority)
                const maxReached = priorities.length >= 3 && !isSelected
                return (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => togglePriority(priority)}
                    disabled={maxReached}
                    className={cn(
                      'p-3 rounded-lg border text-sm text-left transition-all duration-150',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : maxReached
                        ? 'border-border opacity-40 cursor-not-allowed'
                        : 'border-border hover:border-primary/40 hover:bg-accent'
                    )}
                  >
                    {priority}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {priorities.length === 0
                ? 'Select up to 3 priorities'
                : `${3 - priorities.length} selection${3 - priorities.length === 1 ? '' : 's'} remaining`}
            </p>
          </div>
        )}

        {/* ── Step 4: Timezone ──────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Your timezone</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Used for scheduling, reminders, and your daily planner.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="timezone">Timezone</Label>
                <span className="text-xs text-muted-foreground">
                  Auto-detected from your browser
                </span>
              </div>
              {/* Native select — no extra dependency needed */}
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{timezone}</span>
              </p>
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            {/* Summary before submitting */}
            <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Your setup
              </p>
              <p>
                <span className="text-muted-foreground">Goals: </span>
                {goals.length > 0 ? `${goals.length} selected` : 'None selected'}
              </p>
              <p>
                <span className="text-muted-foreground">Study hours: </span>
                {studyHours}h / week
              </p>
              <p>
                <span className="text-muted-foreground">Priorities: </span>
                {priorities.length > 0 ? priorities.join(', ') : 'None selected'}
              </p>
            </div>
          </div>
        )}

        {/* ── Navigation buttons ────────────────────────────────────────── */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={loading}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}

          {step < TOTAL_STEPS ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              className="flex-1"
              // Require at least one goal before moving past step 1
              disabled={step === 1 && goals.length === 0}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Get started'}
              {!loading && <Sparkles className="h-4 w-4 ml-1" />}
            </Button>
          )}
        </div>

        {/* Skip link — only on step 1 */}
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
