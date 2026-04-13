'use client'

// Phase 15.C: Co-Pilot natural-language command dialog.
//
// 3-step flow:
//   input    → user types a command, presses "Parse Intent"
//   parsing  → POST /api/copilot; model returns structured tool call
//   preview  → UI shows human-readable preview of the action; user confirms or rethinks
//   executing → server action runs
//   done     → success confirmation
//   error    → error with "Try Again" option

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createTaskDirect, rescheduleMultipleTasks } from '@/lib/actions/tasks'

// ── Payload types returned by /api/copilot ────────────────────────────────
type CreateTaskArgs = {
  title: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  estimated_minutes: number | null
}

type RescheduleTasksArgs = {
  task_ids: string[]
  task_titles: string[]
  new_date: string
}

type CopilotPayload =
  | { tool: 'create_task';      args: CreateTaskArgs }
  | { tool: 'reschedule_tasks'; args: RescheduleTasksArgs }

type Step = 'input' | 'parsing' | 'preview' | 'executing' | 'done' | 'error'

// ── Helpers ───────────────────────────────────────────────────────────────
const PRIORITY_LABEL: Record<string, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
}

function formatDate(iso: string | null): string {
  if (!iso) return 'no due date'
  // Parse as local date (noon UTC avoids DST off-by-one)
  const d = new Date(`${iso}T12:00:00Z`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Renders the structured payload as a human-readable preview card.
function PreviewCard({ payload }: { payload: CopilotPayload }) {
  if (payload.tool === 'create_task') {
    const { title, priority, due_date, estimated_minutes } = payload.args
    return (
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm space-y-2">
        <p className="font-semibold text-foreground">{title}</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-md border bg-background px-2 py-0.5 text-xs text-muted-foreground">
            {PRIORITY_LABEL[priority] ?? priority} priority
          </span>
          <span className="inline-flex items-center rounded-md border bg-background px-2 py-0.5 text-xs text-muted-foreground">
            Due: {formatDate(due_date)}
          </span>
          {estimated_minutes != null && (
            <span className="inline-flex items-center rounded-md border bg-background px-2 py-0.5 text-xs text-muted-foreground">
              ~{estimated_minutes} min
            </span>
          )}
        </div>
      </div>
    )
  }

  if (payload.tool === 'reschedule_tasks') {
    const { task_titles, new_date } = payload.args
    const count = task_titles.length
    return (
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm space-y-2">
        <p className="text-muted-foreground text-xs">
          Moving{' '}
          <span className="font-medium text-foreground">
            {count} task{count !== 1 ? 's' : ''}
          </span>{' '}
          to{' '}
          <span className="font-medium text-foreground">{formatDate(new_date)}</span>
        </p>
        <ul className="space-y-1">
          {task_titles.map((t, i) => (
            <li key={i} className="flex items-center gap-2 text-foreground">
              <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return null
}

function getConfirmLabel(payload: CopilotPayload): string {
  if (payload.tool === 'create_task') return 'Create task'
  const n = payload.args.task_ids.length
  return `Reschedule ${n} task${n !== 1 ? 's' : ''}`
}

// ── Component ─────────────────────────────────────────────────────────────
interface CopilotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CopilotDialog({ open, onOpenChange }: CopilotDialogProps) {
  const router = useRouter()

  const [step,     setStep]     = useState<Step>('input')
  const [prompt,   setPrompt]   = useState('')
  const [payload,  setPayload]  = useState<CopilotPayload | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function reset() {
    setStep('input')
    setPrompt('')
    setPayload(null)
    setErrorMsg(null)
  }

  // Block closing while a network request is in flight.
  function handleOpenChange(next: boolean) {
    if (step === 'parsing' || step === 'executing') return
    onOpenChange(next)
    if (!next) reset()
  }

  // Step 1: send prompt to /api/copilot, get back structured tool call.
  async function handleParse() {
    const trimmed = prompt.trim()
    if (!trimmed) return

    setStep('parsing')
    setErrorMsg(null)

    // Capture local date context on the client so "tomorrow" resolves correctly
    // for the user's timezone — not the server's UTC date.
    const now         = new Date()
    const localDate   = now.toLocaleDateString('en-CA')          // YYYY-MM-DD
    const localDayName = now.toLocaleDateString('en-US', { weekday: 'long' })
    const timezone    = Intl.DateTimeFormat().resolvedOptions().timeZone

    try {
      const res  = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed, localDate, localDayName, timezone }),
      })
      const data = await res.json()

      if (data.error) {
        setErrorMsg(data.error)
        setStep('error')
        return
      }

      setPayload(data as CopilotPayload)
      setStep('preview')
    } catch {
      setErrorMsg('Network error. Please try again.')
      setStep('error')
    }
  }

  // Step 3: user confirmed — call the appropriate server action.
  async function handleConfirm() {
    if (!payload) return
    setStep('executing')

    let result: { error?: string; success?: boolean } = {}

    if (payload.tool === 'create_task') {
      result = await createTaskDirect(payload.args)
    } else if (payload.tool === 'reschedule_tasks') {
      result = await rescheduleMultipleTasks(
        payload.args.task_ids,
        payload.args.new_date
      )
    }

    if (result.error) {
      setErrorMsg(result.error)
      setStep('error')
      return
    }

    router.refresh()
    setStep('done')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Co-Pilot
          </DialogTitle>
          <DialogDescription>
            Describe what you want to do in plain English.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* ── Input ──────────────────────────────────────────────────── */}
          {(step === 'input' || step === 'parsing') && (
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              placeholder={
                'e.g. "Create a task to finish the report by Friday"\n' +
                'or "Reschedule my overdue tasks to next Monday"'
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParse()
              }}
              disabled={step === 'parsing'}
              autoFocus
            />
          )}

          {step === 'parsing' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Parsing intent…
            </div>
          )}

          {/* ── Preview ────────────────────────────────────────────────── */}
          {step === 'preview' && payload && (
            <div className="space-y-2.5">
              <p className="text-xs text-muted-foreground">
                Confirm the action below before it executes:
              </p>
              <PreviewCard payload={payload} />
            </div>
          )}

          {/* ── Executing ──────────────────────────────────────────────── */}
          {step === 'executing' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Executing…
            </div>
          )}

          {/* ── Done ───────────────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 py-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Done! Your request has been executed.
            </div>
          )}

          {/* ── Error ──────────────────────────────────────────────────── */}
          {step === 'error' && errorMsg && (
            <div className="flex items-start gap-2 text-sm text-destructive py-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {errorMsg}
            </div>
          )}
        </div>

        {/* ── Footer buttons change with each step ─────────────────────── */}
        <DialogFooter>
          {step === 'input' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleParse} disabled={!prompt.trim()}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Parse Intent
              </Button>
            </>
          )}

          {step === 'parsing' && (
            <Button disabled>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Parsing…
            </Button>
          )}

          {step === 'preview' && payload && (
            <>
              {/* "Rethink" returns to input without clearing the prompt */}
              <Button
                variant="outline"
                onClick={() => { setStep('input'); setPayload(null) }}
              >
                Rethink
              </Button>
              <Button onClick={handleConfirm}>
                {getConfirmLabel(payload)}
              </Button>
            </>
          )}

          {step === 'executing' && (
            <Button disabled>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Executing…
            </Button>
          )}

          {step === 'done' && (
            <Button onClick={() => handleOpenChange(false)}>Close</Button>
          )}

          {step === 'error' && (
            <>
              <Button variant="outline" onClick={() => setStep('input')}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
