'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { deleteTask, toggleTaskStatus } from '@/lib/actions/tasks'
import { EditTaskDialog } from './EditTaskDialog'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

type TaskWithProject = Task & {
  projects: { id: string; name: string; color: string } | null
}

interface Project {
  id: string
  name: string
}

interface TaskRowProps {
  task: TaskWithProject
  projects: Project[]
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-secondary text-secondary-foreground',
}

function formatDueDate(dateStr: string): string {
  // Parse as local date to avoid timezone-shifting the date
  const [year, month, day] = dateStr.split('-').map(Number)
  const due = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(dateStr: string, status: string): boolean {
  if (status === 'done' || status === 'cancelled') return false
  const [year, month, day] = dateStr.split('-').map(Number)
  const due = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

export function TaskRow({ task, projects }: TaskRowProps) {
  const [pending, setPending] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const isDone = task.status === 'done'
  const overdue = task.due_date ? isOverdue(task.due_date, task.status) : false

  async function handleToggle() {
    setPending(true)
    await toggleTaskStatus(task.id, task.status)
    setPending(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return
    await deleteTask(task.id)
  }

  return (
    <>
      <div className="group flex items-center gap-3 py-3 px-1 border-b last:border-b-0 hover:bg-accent/30 rounded-sm transition-colors">
        {/* Checkbox */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={pending}
          aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
          className={cn(
            'h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors',
            isDone
              ? 'bg-primary border-primary'
              : 'border-muted-foreground/40 hover:border-primary'
          )}
        >
          {isDone && (
            <svg className="h-2.5 w-2.5 text-primary-foreground" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm font-medium leading-snug truncate',
              isDone && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-muted-foreground truncate">{task.description}</p>
          )}
        </div>

        {/* Meta: priority, due date, project */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              'text-[11px] font-medium px-1.5 py-0.5 rounded capitalize',
              PRIORITY_STYLES[task.priority]
            )}
          >
            {task.priority}
          </span>

          {task.due_date && (
            <span
              className={cn(
                'text-xs',
                overdue ? 'text-destructive font-medium' : 'text-muted-foreground'
              )}
            >
              {formatDueDate(task.due_date)}
            </span>
          )}

          {task.projects && (
            <span
              className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground border rounded px-1.5 py-0.5 max-w-[100px] truncate"
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: task.projects.color }}
              />
              {task.projects.name}
            </span>
          )}
        </div>

        {/* Action buttons — visible on hover */}
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={() => setEditOpen(true)}
            aria-label="Edit task"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            aria-label="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <EditTaskDialog
        task={task}
        projects={projects}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}
