'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteSession } from '@/lib/actions/focus'
import { cn } from '@/lib/utils'
import type { FocusSession } from '@/types'

type SessionWithLinks = FocusSession & {
  tasks: { title: string } | null
  projects: { name: string; color: string } | null
}

interface SessionHistoryProps {
  sessions: SessionWithLinks[]
}

function getDateKey(isoString: string): string {
  const d = new Date(isoString)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function getDateLabel(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - sessionDay.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function SessionHistory({ sessions }: SessionHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Delete this session record?')) return
    setDeletingId(id)
    await deleteSession(id)
    setDeletingId(null)
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/50">
          <Clock className="h-4 w-4 text-muted-foreground/60" />
          <span className="text-sm font-semibold">Recent Sessions</span>
        </div>
        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
          <Clock className="h-7 w-7 mb-2 opacity-20" />
          <p className="text-sm font-medium">No sessions yet</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Completed sessions appear here
          </p>
        </div>
      </div>
    )
  }

  // Group sessions by date
  const groups: { label: string; items: SessionWithLinks[] }[] = []
  const seen = new Map<string, SessionWithLinks[]>()

  for (const s of sessions) {
    const key = getDateKey(s.started_at)
    if (!seen.has(key)) {
      const items: SessionWithLinks[] = []
      seen.set(key, items)
      groups.push({ label: getDateLabel(s.started_at), items })
    }
    seen.get(key)!.push(s)
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/50">
        <Clock className="h-4 w-4 text-muted-foreground/60" />
        <span className="text-sm font-semibold">Recent Sessions</span>
        <span className="text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium tabular-nums ml-auto">
          {sessions.length}
        </span>
      </div>

      {/* Date groups */}
      <div className="divide-y divide-border/40">
        {groups.map(({ label, items }) => (
          <div key={label}>
            {/* Date header */}
            <div className="px-5 py-2 bg-muted/20">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                {label}
              </p>
            </div>

            {/* Sessions in this group */}
            {items.map((session) => {
              const mins = session.actual_minutes ?? session.duration_minutes
              return (
                <div
                  key={session.id}
                  className="group flex items-center gap-3 pl-5 pr-3 py-3 hover:bg-muted/20 transition-colors border-t border-border/30 first:border-t-0"
                >
                  {/* Status bar */}
                  <div
                    className={cn(
                      'w-0.5 self-stretch rounded-full shrink-0',
                      session.completed ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                    )}
                  />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-snug">
                      {session.goal ?? (session.completed ? 'Focus session' : 'Stopped early')}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(session.started_at)}
                      </span>
                      {session.projects && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted border border-border/50 rounded px-1.5 py-0.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: session.projects.color }}
                          />
                          {session.projects.name}
                        </span>
                      )}
                      {session.tasks && (
                        <span className="text-[10px] text-muted-foreground bg-muted border border-border/50 rounded px-1.5 py-0.5 truncate max-w-[100px]">
                          {session.tasks.title}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Duration + status */}
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-sm font-semibold tabular-nums">
                      {mins}m
                    </span>
                    {session.completed ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60">early</span>
                    )}
                  </div>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(session.id)}
                    disabled={deletingId === session.id}
                    aria-label="Delete session"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
