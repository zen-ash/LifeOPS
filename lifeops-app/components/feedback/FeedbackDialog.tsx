'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { CheckCircle2, MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { submitFeedback } from '@/lib/actions/feedback'
import { cn } from '@/lib/utils'

const FEEDBACK_TYPES = [
  { value: 'bug',     label: 'Bug report' },
  { value: 'feature', label: 'Feature idea' },
  { value: 'general', label: 'General feedback' },
] as const

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const pathname = usePathname()

  const [feedbackType, setFeedbackType] = useState<string>('general')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset form state whenever dialog opens
  useEffect(() => {
    if (open) {
      setFeedbackType('general')
      setMessage('')
      setSubmitting(false)
      setSubmitted(false)
      setError(null)
      // Autofocus textarea after transition settles
      setTimeout(() => textareaRef.current?.focus(), 80)
    }
  }, [open])

  // Auto-close 1.5s after successful submission
  useEffect(() => {
    if (!submitted) return
    const t = setTimeout(() => onOpenChange(false), 1500)
    return () => clearTimeout(t)
  }, [submitted, onOpenChange])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) {
      setError('Please write something before submitting.')
      return
    }
    setSubmitting(true)
    setError(null)

    const result = await submitFeedback({
      feedbackType,
      message,
      route: pathname,
    })

    setSubmitting(false)

    if (result?.error) {
      setError(result.error)
    } else {
      setSubmitted(true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-primary" />
            Share feedback
          </DialogTitle>
          <DialogDescription>
            Found a bug? Have an idea? Let us know — every message helps.
          </DialogDescription>
        </DialogHeader>

        {/* ── Success state ───────────────────────────────────────── */}
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold">Thanks for your feedback!</p>
            <p className="text-xs text-muted-foreground">Closing in a moment…</p>
          </div>
        ) : (
          /* ── Form ──────────────────────────────────────────────── */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type selector */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                Category
              </p>
              <div className="flex gap-2 flex-wrap">
                {FEEDBACK_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFeedbackType(value)}
                    className={cn(
                      'px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150',
                      feedbackType === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-accent/60 hover:text-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message textarea */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                Message
              </p>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => { setMessage(e.target.value); setError(null) }}
                placeholder={
                  feedbackType === 'bug'
                    ? 'Describe what happened and what you expected…'
                    : feedbackType === 'feature'
                    ? 'Describe the feature and why it would help…'
                    : 'Anything on your mind — good or bad…'
                }
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 placeholder:text-muted-foreground"
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>

            {/* Current page context — shown as a subtle note */}
            <p className="text-[10px] text-muted-foreground/40">
              Submitting from: <span className="font-mono">{pathname}</span>
            </p>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting || !message.trim()}>
                {submitting ? 'Submitting…' : 'Submit feedback'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
