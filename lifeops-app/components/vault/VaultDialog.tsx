'use client'

// Phase 13.C: Ask Your Second Brain — compact Q&A dialog over the user's notes.

import { useState, useRef, useEffect } from 'react'
import { Brain, Send, Loader2, FileText, X, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface VaultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface VaultResult {
  answer: string
  sources: string[]
}

export function VaultDialog({ open, onOpenChange }: VaultDialogProps) {
  const [query,   setQuery]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<VaultResult | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus the textarea when the dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [open])

  // Reset state when dialog closes
  function handleOpenChange(value: boolean) {
    if (!value) {
      setQuery('')
      setResult(null)
      setError(null)
    }
    onOpenChange(value)
  }

  async function handleAsk() {
    const q = query.trim()
    if (!q || loading) return

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? 'Something went wrong. Please try again.')
      } else {
        setResult(data as VaultResult)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleAsk()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2.5 text-base">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            Ask Your Second Brain
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Query input */}
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={'Ask something about your notes\u2026 e.g. \u201cWhat did I write about systems thinking?\u201d'}
              rows={3}
              disabled={loading}
              className={cn(
                'flex w-full rounded-xl border border-input bg-background px-3.5 py-2.5',
                'text-sm placeholder:text-muted-foreground/50 resize-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:opacity-50'
              )}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground/50 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Answers are grounded only in your notes. ⌘↵ to submit.
              </p>
              <Button
                size="sm"
                onClick={handleAsk}
                disabled={!query.trim() || loading}
                className="shrink-0 gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Searching…
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Ask
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Answer */}
          {result && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Answer body */}
              <div className="rounded-xl border bg-card px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                {result.answer}
              </div>

              {/* Source citations */}
              {result.sources.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                    Sources
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.sources.map((source) => (
                      <span
                        key={source}
                        className="inline-flex items-center gap-1 text-[11px] bg-primary/8 text-primary border border-primary/20 px-2 py-0.5 rounded-md"
                      >
                        <FileText className="h-2.5 w-2.5 shrink-0" />
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ask another question */}
              <button
                type="button"
                onClick={() => { setQuery(''); setResult(null); textareaRef.current?.focus() }}
                className="text-xs text-primary hover:underline"
              >
                Ask another question →
              </button>
            </div>
          )}

          {/* First-time / empty state hint */}
          {!result && !error && !loading && (
            <div className="rounded-xl border border-dashed border-border/60 px-4 py-4 text-center text-xs text-muted-foreground/60 space-y-0.5">
              <p>Your notes are indexed as you save them.</p>
              <p>New notes become searchable within seconds of saving.</p>
            </div>
          )}
        </div>

        {/* Close button overlay */}
        <button
          type="button"
          onClick={() => handleOpenChange(false)}
          className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </DialogContent>
    </Dialog>
  )
}
