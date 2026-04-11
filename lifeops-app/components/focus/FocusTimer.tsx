'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Play, Square, RotateCcw, CheckCircle2, Timer, Target, CalendarRange } from 'lucide-react'
import { saveSession } from '@/lib/actions/focus'
import { cn } from '@/lib/utils'

type Phase = 'setup' | 'running' | 'finished'

interface SelectOption {
  id: string
  name: string
}

interface FocusTimerProps {
  tasks: SelectOption[]
  projects: SelectOption[]
  // Phase 11.F: optional prefill from Planner → Focus handoff via query params
  initialIntent?: string
  initialDuration?: number
}

const PRESET_MINUTES = [15, 25, 30, 45, 60]
const CIRCLE_R = 120
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R

export function FocusTimer({ tasks, projects, initialIntent, initialDuration }: FocusTimerProps) {
  const router = useRouter()

  // Phase 11.F: if launched from planner, prefill goal and duration.
  // If initialDuration matches a preset, select that preset; otherwise use custom.
  const fromPlanner = !!initialIntent
  const defaultPreset = initialDuration && PRESET_MINUTES.includes(initialDuration) ? initialDuration : 25
  const defaultCustom = initialDuration && !PRESET_MINUTES.includes(initialDuration)
    ? String(initialDuration)
    : ''

  // Setup state
  const [plannedMinutes, setPlannedMinutes] = useState(defaultPreset)
  const [customMinutes, setCustomMinutes] = useState(defaultCustom)
  const [goal, setGoal] = useState(initialIntent ?? '')
  const [taskId, setTaskId] = useState('')
  const [projectId, setProjectId] = useState('')

  // Timer state
  const [phase, setPhase] = useState<Phase>('setup')
  const [timeLeft, setTimeLeft] = useState(0) // seconds
  const [totalSeconds, setTotalSeconds] = useState(0)
  const startedAtRef = useRef<Date | null>(null)
  const savedRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Result state
  const [result, setResult] = useState<{
    completed: boolean
    actualMinutes: number
    plannedMinutes: number
    goal: string | null
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const effectiveMinutes =
    customMinutes && parseInt(customMinutes) > 0
      ? parseInt(customMinutes)
      : plannedMinutes

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const persistSession = useCallback(
    async (completed: boolean, endedAt: Date) => {
      if (savedRef.current) return
      savedRef.current = true
      setSaving(true)
      setSaveError(null)

      const startedAt = startedAtRef.current!
      const elapsedMs = endedAt.getTime() - startedAt.getTime()
      const actualMinutes = Math.max(1, Math.round(elapsedMs / 60_000))

      const res = await saveSession({
        goal: goal.trim() || null,
        type: 'pomodoro',
        duration_minutes: effectiveMinutes,
        actual_minutes: actualMinutes,
        completed,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        task_id: taskId || null,
        project_id: projectId || null,
        from_planner: fromPlanner,
      })

      if (res?.error) {
        setSaveError(res.error)
        savedRef.current = false // allow retry
      } else {
        setResult({ completed, actualMinutes, plannedMinutes: effectiveMinutes, goal: goal.trim() || null })
        router.refresh()
      }

      setSaving(false)
    },
    [goal, effectiveMinutes, taskId, projectId, router]
  )

  function startTimer() {
    const mins = effectiveMinutes
    const secs = mins * 60
    setTotalSeconds(secs)
    setTimeLeft(secs)
    setPhase('running')
    savedRef.current = false
    startedAtRef.current = new Date()

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          const endedAt = new Date()
          setPhase('finished')
          persistSession(true, endedAt)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function stopEarly() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const endedAt = new Date()
    setPhase('finished')
    persistSession(false, endedAt)
  }

  function resetTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setPhase('setup')
    setTimeLeft(0)
    setTotalSeconds(0)
    setResult(null)
    setSaveError(null)
    savedRef.current = false
    startedAtRef.current = null
  }

  // Derived display values
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  // Depleting ring: starts full (progress=1) and empties as time elapses
  const progress = totalSeconds > 0 ? timeLeft / totalSeconds : 0
  const dashOffset = CIRCUMFERENCE * (1 - progress)

  // ── Setup phase ───────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="rounded-xl border bg-card overflow-hidden max-w-md mx-auto animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Timer className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight">New Session</h2>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              Choose a duration and optional goal
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Duration presets */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Duration
            </p>
            <div className="flex gap-2 flex-wrap">
              {PRESET_MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setPlannedMinutes(m); setCustomMinutes('') }}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full border text-sm font-medium transition-all duration-150',
                    plannedMinutes === m && !customMinutes
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-accent/60 hover:text-foreground'
                  )}
                >
                  {m}m
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="180"
                placeholder="Custom"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="w-28 h-8 text-sm"
              />
              <span className="text-xs text-muted-foreground">min (max 180)</span>
            </div>
          </div>

          {/* Goal */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="focus-goal" className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                Session goal <span className="normal-case font-normal text-muted-foreground/40">(optional)</span>
              </Label>
              {/* Phase 11.F: badge shown when session was launched from the Planner */}
              {fromPlanner && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <CalendarRange className="h-2 w-2" />
                  From planner
                </span>
              )}
            </div>
            <div className="relative">
              <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
              <Input
                id="focus-goal"
                placeholder="e.g. Finish chapter 5, write the intro…"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Link task / project */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="focus-task" className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                Task
              </Label>
              <select
                id="focus-task"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">None</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="focus-project" className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                Project
              </Label>
              <select
                id="focus-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Start button */}
        <div className="px-6 pb-6">
          <Button
            className="w-full"
            size="lg"
            onClick={startTimer}
            disabled={effectiveMinutes < 1 || effectiveMinutes > 180}
          >
            <Play className="h-4 w-4 mr-2" />
            Start {effectiveMinutes}-minute session
          </Button>
        </div>
      </div>
    )
  }

  // ── Running phase ─────────────────────────────────────────────────────
  if (phase === 'running') {
    const minutesLeft = Math.ceil(timeLeft / 60)

    return (
      <div className="rounded-xl border bg-card overflow-hidden animate-fade-in-up">
        {/* Active indicator strip */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-primary/[0.04]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-semibold text-primary">In Focus</span>
          </div>
          {goal && (
            <p className="text-xs text-muted-foreground max-w-[240px] truncate">
              {goal}
            </p>
          )}
        </div>

        {/* Ring + controls */}
        <div className="flex flex-col items-center py-10 gap-7">
          {/* Progress ring */}
          <div className="relative">
            <svg
              width="280"
              height="280"
              viewBox="0 0 280 280"
              className="-rotate-90"
              aria-label={`${minutes} minutes ${seconds} seconds remaining`}
            >
              {/* Track */}
              <circle
                cx="140"
                cy="140"
                r={CIRCLE_R}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="14"
              />
              {/* Remaining arc — depletes from full to empty */}
              <circle
                cx="140"
                cy="140"
                r={CIRCLE_R}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <span className="text-6xl font-bold tabular-nums tracking-tight leading-none">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              <span className="text-xs text-muted-foreground">
                {minutesLeft <= 1 ? 'less than a minute left' : `${minutesLeft} min left`}
              </span>
            </div>
          </div>

          {/* Stop — intentional, destructive-tinted */}
          <Button
            variant="outline"
            size="lg"
            onClick={stopEarly}
            className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors"
          >
            <Square className="h-4 w-4" />
            End session early
          </Button>
        </div>
      </div>
    )
  }

  // ── Finished phase ────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border bg-card overflow-hidden animate-fade-in-up">
      <div className="flex flex-col items-center text-center px-8 py-12 gap-6">
        {saving ? (
          <p className="text-sm text-muted-foreground animate-pulse">Saving session…</p>
        ) : saveError ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive">{saveError}</p>
            <Button variant="outline" onClick={resetTimer}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Start new session
            </Button>
          </div>
        ) : result ? (
          <>
            {/* Result icon */}
            <div
              className={cn(
                'flex h-20 w-20 items-center justify-center rounded-full',
                result.completed ? 'bg-emerald-500/10' : 'bg-primary/10'
              )}
            >
              <CheckCircle2
                className={cn(
                  'h-10 w-10',
                  result.completed ? 'text-emerald-500' : 'text-primary'
                )}
              />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold">
                {result.completed ? 'Session complete!' : 'Session saved'}
              </h2>
              <p className="text-5xl font-bold tabular-nums text-primary">
                {result.actualMinutes}m
              </p>
              <p className="text-sm text-muted-foreground">
                {result.completed
                  ? 'of focused work'
                  : `of ${result.plannedMinutes}m planned — stopped early`}
                {result.goal && <> — &ldquo;{result.goal}&rdquo;</>}
              </p>
            </div>

            <Button size="lg" className="w-full max-w-xs" onClick={resetTimer}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Start new session
            </Button>
          </>
        ) : null}
      </div>
    </div>
  )
}
