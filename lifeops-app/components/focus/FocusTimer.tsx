'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Play, Square, RotateCcw, CheckCircle2 } from 'lucide-react'
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
}

const PRESET_MINUTES = [15, 25, 30, 45, 60]
const CIRCLE_R = 90
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R

export function FocusTimer({ tasks, projects }: FocusTimerProps) {
  const router = useRouter()

  // Setup state
  const [plannedMinutes, setPlannedMinutes] = useState(25)
  const [customMinutes, setCustomMinutes] = useState('')
  const [goal, setGoal] = useState('')
  const [taskId, setTaskId] = useState('')
  const [projectId, setProjectId] = useState('')

  // Timer state
  const [phase, setPhase] = useState<Phase>('setup')
  const [timeLeft, setTimeLeft] = useState(0) // seconds
  const [totalSeconds, setTotalSeconds] = useState(0)
  const startedAtRef = useRef<Date | null>(null)
  const savedRef = useRef(false) // prevents double-save
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Result state (shown in finished phase)
  const [result, setResult] = useState<{
    completed: boolean
    actualMinutes: number
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
      })

      if (res?.error) {
        setSaveError(res.error)
        savedRef.current = false // allow retry
      } else {
        setResult({
          completed,
          actualMinutes,
          goal: goal.trim() || null,
        })
        router.refresh() // re-fetches history from the server
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
          // Timer hit zero — complete
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
  const progress = totalSeconds > 0 ? (totalSeconds - timeLeft) / totalSeconds : 0
  const dashOffset = CIRCUMFERENCE * (1 - progress)

  // ── Setup phase ────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="rounded-xl border bg-card p-6 space-y-6 max-w-md mx-auto">
        <div>
          <h2 className="text-lg font-semibold">Set up your session</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose a duration and optional goal before starting.
          </p>
        </div>

        {/* Duration presets */}
        <div className="space-y-2">
          <Label>Duration</Label>
          <div className="flex gap-2 flex-wrap">
            {PRESET_MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setPlannedMinutes(m); setCustomMinutes('') }}
                className={cn(
                  'px-4 py-1.5 rounded-full border text-sm transition-all',
                  plannedMinutes === m && !customMinutes
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border hover:border-primary/40 hover:bg-accent'
                )}
              >
                {m}m
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="number"
              min="1"
              max="180"
              placeholder="Custom minutes"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              className="w-40"
            />
            {customMinutes && (
              <span className="text-sm text-muted-foreground">min</span>
            )}
          </div>
        </div>

        {/* Goal */}
        <div className="space-y-2">
          <Label htmlFor="focus-goal">Session goal (optional)</Label>
          <Input
            id="focus-goal"
            placeholder="e.g. Finish chapter 5, Write intro, Study flashcards..."
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </div>

        {/* Link task / project */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="focus-task">Link task (optional)</Label>
            <select
              id="focus-task"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">None</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="focus-project">Link project (optional)</Label>
            <select
              id="focus-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

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
    )
  }

  // ── Running phase ──────────────────────────────────────────────
  if (phase === 'running') {
    return (
      <div className="flex flex-col items-center gap-8">
        {goal && (
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            <span className="font-medium text-foreground">Goal:</span> {goal}
          </p>
        )}

        {/* SVG circular progress */}
        <div className="relative">
          <svg width="220" height="220" className="-rotate-90">
            {/* Background track */}
            <circle
              cx="110" cy="110" r={CIRCLE_R}
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth="8"
            />
            {/* Progress arc */}
            <circle
              cx="110" cy="110" r={CIRCLE_R}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          {/* Time display in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold tabular-nums tracking-tight">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              of {effectiveMinutes}m
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="lg"
          onClick={stopEarly}
          className="gap-2"
        >
          <Square className="h-4 w-4" />
          Stop early
        </Button>
      </div>
    )
  }

  // ── Finished phase ─────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-6 max-w-sm mx-auto text-center">
      {saving ? (
        <p className="text-muted-foreground text-sm">Saving session…</p>
      ) : saveError ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive">{saveError}</p>
          <Button variant="outline" onClick={resetTimer}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Start new session
          </Button>
        </div>
      ) : result ? (
        <>
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2
              className={cn(
                'h-16 w-16',
                result.completed ? 'text-green-500' : 'text-primary'
              )}
            />
            <h2 className="text-xl font-bold">
              {result.completed ? 'Session complete!' : 'Session saved'}
            </h2>
            <p className="text-muted-foreground text-sm">
              You focused for{' '}
              <span className="font-medium text-foreground">
                {result.actualMinutes} minute{result.actualMinutes !== 1 ? 's' : ''}
              </span>
              {result.goal && (
                <> on &ldquo;{result.goal}&rdquo;</>
              )}
              .
            </p>
          </div>
          <Button size="lg" className="w-full" onClick={resetTimer}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Start new session
          </Button>
        </>
      ) : null}
    </div>
  )
}
