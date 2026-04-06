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

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round(
    (today.getTime() - sessionDay.getTime()) / 86_400_000
  )

  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
      <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
        <Clock className="h-10 w-10 mb-3 opacity-30" />
        <p className="font-medium text-sm">No sessions yet</p>
        <p className="text-xs mt-1">Completed sessions will appear here.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card divide-y">
      {sessions.map((session) => {
        const minutes = session.actual_minutes ?? session.duration_minutes
        return (
          <div
            key={session.id}
            className="group flex items-center gap-3 px-4 py-3"
          >
            {/* Status icon */}
            {session.completed ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            ) : (
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}

            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {session.goal ?? (session.completed ? 'Focus session' : 'Stopped early')}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {formatRelativeDate(session.started_at)}
                </span>
                {session.projects && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground border rounded px-1.5 py-0.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: session.projects.color }}
                    />
                    {session.projects.name}
                  </span>
                )}
                {session.tasks && (
                  <span className="text-[11px] text-muted-foreground border rounded px-1.5 py-0.5 truncate max-w-[120px]">
                    {session.tasks.title}
                  </span>
                )}
              </div>
            </div>

            {/* Duration */}
            <span
              className={cn(
                'text-sm font-medium shrink-0',
                session.completed ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {minutes}m
            </span>

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
  )
}
