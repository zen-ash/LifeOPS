'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, ArrowRight, Zap, Ban } from 'lucide-react'
import { deleteTask, toggleTaskStatus, carryToTomorrow, cancelTask } from '@/lib/actions/tasks'
import { EditTaskDialog } from './EditTaskDialog'
import { TagBadge } from '@/components/ui/tag-input'
import { cn } from '@/lib/utils'
import type { Tag, Task } from '@/types'

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
  taskTags: Tag[]
}

const PRIORITY_BAR: Record<string, string> = {
  urgent: 'bg-red-500',
  high:   'bg-orange-500',
  medium: 'bg-yellow-400',
  low:    'bg-blue-400/60',
}

// ── Urgency model — Phase 11.E ─────────────────────────────────────────────
type UrgencyLevel = 'overdue' | 'due_today' | 'due_soon' | 'at_risk' | 'normal'

function getUrgencyLevel(task: TaskWithProject): UrgencyLevel {
  if (task.status === 'done' || task.status === 'cancelled') return 'normal'

  if (!task.due_date) {
    return task.priority === 'urgent' ? 'at_risk' : 'normal'
  }

  const [y, m, d] = task.due_date.split('-').map(Number)
  const due = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const dayAfterTomorrow = new Date(today)
  dayAfterTomorrow.setDate(today.getDate() + 2)

  if (due < today)             return 'overdue'
  if (due < tomorrow)          return 'due_today'
  if (due < dayAfterTomorrow)  return 'due_soon'
  return 'normal'
}

function formatDueDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const due = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (diffDays === 0)  return 'Today'
  if (diffDays === 1)  return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays < 0)    return `${Math.abs(diffDays)}d overdue`
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function TaskRow({ task, projects, taskTags }: TaskRowProps) {
  const [pending,    setPending]    = useState(false)
  const [carrying,   setCarrying]   = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [editOpen,   setEditOpen]   = useState(false)

  const isDone      = task.status === 'done'
  const isCancelled = task.status === 'cancelled'
  const urgency     = getUrgencyLevel(task)
  const showCarry   = urgency === 'overdue' || urgency === 'due_today'

  async function handleToggle() {
    if (isCancelled) return  // cancelled tasks reopen via edit dialog
    setPending(true)
    await toggleTaskStatus(task.id, task.status)
    setPending(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return
    await deleteTask(task.id)
  }

  async function handleCarry() {
    setCarrying(true)
    await carryToTomorrow(task.id)
    setCarrying(false)
  }

  async function handleCancel() {
    if (!confirm(`Cancel "${task.title}"? It will move to the Canceled section.`)) return
    setCancelling(true)
    await cancelTask(task.id)
    setCancelling(false)
  }

  const dueDateChipClass =
    urgency === 'overdue'
      ? 'bg-destructive/10 text-destructive border border-destructive/20 font-semibold'
      : urgency === 'due_today'
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium'
      : urgency === 'due_soon'
      ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20'
      : 'bg-muted text-muted-foreground border border-border/40'

  const rowBgClass =
    urgency === 'overdue' && !isDone && !isCancelled
      ? 'bg-destructive/[0.02] hover:bg-destructive/[0.05]'
      : 'hover:bg-accent/30'

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-3 pl-3 pr-2 py-3 border-b last:border-b-0',
          'transition-colors',
          rowBgClass,
          (isDone || isCancelled) && 'opacity-50'
        )}
      >
        {/* Priority bar */}
        <div
          className={cn(
            'w-0.5 self-stretch rounded-full shrink-0',
            (isDone || isCancelled) ? 'bg-muted-foreground/20' : PRIORITY_BAR[task.priority]
          )}
        />

        {/* Checkbox — disabled for cancelled tasks */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={pending || isCancelled}
          aria-label={isDone ? 'Mark incomplete' : isCancelled ? 'Canceled' : 'Mark complete'}
          className={cn(
            'h-5 w-5 shrink-0 rounded-[5px] border-2 flex items-center justify-center',
            'transition-all duration-200',
            isDone
              ? 'bg-primary border-primary cursor-pointer'
              : isCancelled
              ? 'bg-muted/50 border-muted-foreground/20 cursor-default'
              : 'border-muted-foreground/30 hover:border-primary/70 hover:bg-primary/5 cursor-pointer'
          )}
        >
          {isDone && (
            <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 10 10" fill="none">
              <path
                d="M1.5 5L4 7.5L8.5 2.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {isCancelled && (
            <svg className="h-2.5 w-2.5 text-muted-foreground/40" viewBox="0 0 10 10" fill="none">
              <path d="M2 5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </button>

        {/* Title + description + tags + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p
              className={cn(
                'text-sm font-medium leading-snug truncate',
                (isDone || isCancelled) && 'line-through text-muted-foreground/60'
              )}
            >
              {task.title}
            </p>
            {urgency === 'at_risk' && (
              <span className="inline-flex items-center gap-0.5 shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                <Zap className="h-2.5 w-2.5" />
                At risk
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{task.description}</p>
          )}
          {taskTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {taskTags.map((tag) => (
                <TagBadge key={tag.id} tag={tag} />
              ))}
            </div>
          )}
        </div>

        {/* Meta: due date chip + project */}
        <div className="flex items-center gap-2 shrink-0">
          {task.due_date && !isDone && !isCancelled && (
            <span className={cn('text-[11px] px-1.5 py-0.5 rounded', dueDateChipClass)}>
              {formatDueDate(task.due_date)}
            </span>
          )}

          {task.projects && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted border border-border/50 rounded px-1.5 py-0.5 max-w-[90px] truncate">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: task.projects.color }}
              />
              {task.projects.name}
            </span>
          )}
        </div>

        {/* Action buttons — visible on hover */}
        <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Carry to tomorrow — only for overdue/today active tasks */}
          {showCarry && !isDone && !isCancelled && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
              onClick={handleCarry}
              disabled={carrying}
              aria-label="Carry to tomorrow"
              title="Carry to tomorrow"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Cancel — only for active tasks */}
          {!isDone && !isCancelled && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-orange-600 hover:bg-orange-500/10"
              onClick={handleCancel}
              disabled={cancelling}
              aria-label="Cancel task"
              title="Cancel task"
            >
              <Ban className="h-3.5 w-3.5" />
            </Button>
          )}

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
        taskTags={taskTags}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}
