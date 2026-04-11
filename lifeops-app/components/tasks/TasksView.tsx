'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { CheckSquare, AlertCircle, Moon, TrendingUp, ArrowRight } from 'lucide-react'
import { TaskRow } from './TaskRow'
import { TagFilterBar } from '@/components/ui/tag-input'
import { SavedViewsPanel } from '@/components/saved-views/SavedViewsPanel'
import { cn } from '@/lib/utils'
import type { Tag, Task, SavedView, TaskViewFilters } from '@/types'

type TaskWithProject = Task & {
  projects: { id: string; name: string; color: string } | null
}

type StatusFilter   = 'all' | 'todo' | 'in_progress' | 'done'
type PriorityFilter = 'all' | 'urgent' | 'high' | 'medium' | 'low'
type DueDateFilter  = 'all' | 'today' | 'this_week' | 'overdue'

interface Project { id: string; name: string }

interface TasksViewProps {
  tasks: TaskWithProject[]
  projects: Project[]
  tagsByTaskId: Record<string, Tag[]>
  savedViews: SavedView[]
}

type TaskGroup = {
  key: string
  label: string
  count: number
  isOverdue?: boolean
  tasks: TaskWithProject[]
}

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'todo',        label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done',        label: 'Done' },
]

const SELECT_CLS =
  'h-8 rounded-lg border border-input bg-background px-2.5 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-muted-foreground'

function matchesDueDate(task: TaskWithProject, filter: DueDateFilter): boolean {
  if (filter === 'all') return true
  if (!task.due_date) return false
  const [y, m, d] = task.due_date.split('-').map(Number)
  const due   = new Date(y, m - 1, d)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const weekEnd  = new Date(today); weekEnd.setDate(today.getDate() + 7)
  if (filter === 'overdue')   return due < today && task.status !== 'done' && task.status !== 'cancelled'
  if (filter === 'today')     return due >= today && due < tomorrow
  if (filter === 'this_week') return due >= today && due <= weekEnd
  return true
}

function groupTasks(tasks: TaskWithProject[]): TaskGroup[] {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

  const overdue: TaskWithProject[]   = []
  const todayList: TaskWithProject[] = []
  const upcoming: TaskWithProject[]  = []
  const noDate: TaskWithProject[]    = []
  const done: TaskWithProject[]      = []

  for (const task of tasks) {
    if (task.status === 'done' || task.status === 'cancelled') {
      done.push(task)
      continue
    }
    if (!task.due_date) {
      noDate.push(task)
      continue
    }
    const [y, m, d] = task.due_date.split('-').map(Number)
    const due = new Date(y, m - 1, d)
    if (due < today)       overdue.push(task)
    else if (due < tomorrow) todayList.push(task)
    else                   upcoming.push(task)
  }

  const groups: TaskGroup[] = []
  if (overdue.length > 0)   groups.push({ key: 'overdue',  label: 'Overdue',     isOverdue: true, count: overdue.length,   tasks: overdue })
  if (todayList.length > 0) groups.push({ key: 'today',    label: 'Today',       count: todayList.length, tasks: todayList })
  if (upcoming.length > 0)  groups.push({ key: 'upcoming', label: 'Upcoming',    count: upcoming.length,  tasks: upcoming })
  if (noDate.length > 0)    groups.push({ key: 'no_date',  label: 'No due date', count: noDate.length,    tasks: noDate })
  if (done.length > 0)      groups.push({ key: 'done',     label: 'Completed',   count: done.length,      tasks: done })
  return groups
}

export function TasksView({ tasks, projects, tagsByTaskId, savedViews }: TasksViewProps) {
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [tagFilter,      setTagFilter]      = useState<string | null>(null)
  const [dueDateFilter,  setDueDateFilter]  = useState<DueDateFilter>('all')
  const [projectFilter,  setProjectFilter]  = useState<string | null>(null)

  const allTags = useMemo(() => {
    const seen = new Set<string>()
    const result: Tag[] = []
    for (const tags of Object.values(tagsByTaskId)) {
      for (const tag of tags) {
        if (!seen.has(tag.id)) { seen.add(tag.id); result.push(tag) }
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name))
  }, [tagsByTaskId])

  const filtered = tasks.filter((t) => {
    const statusMatch   = statusFilter   === 'all' || t.status   === statusFilter
    const priorityMatch = priorityFilter === 'all' || t.priority === priorityFilter
    const tagMatch      = !tagFilter     || (tagsByTaskId[t.id] ?? []).some((tg) => tg.name === tagFilter)
    const dateMatch     = matchesDueDate(t, dueDateFilter)
    const projectMatch  = !projectFilter || t.project_id === projectFilter
    return statusMatch && priorityMatch && tagMatch && dateMatch && projectMatch
  })

  function countForStatus(key: StatusFilter) {
    if (key === 'all') return tasks.length
    return tasks.filter((t) => t.status === key).length
  }

  const currentFilters: TaskViewFilters = {
    status:    statusFilter,
    priority:  priorityFilter,
    tagName:   tagFilter,
    dueDate:   dueDateFilter,
    projectId: projectFilter,
  }

  function applyFilters(f: Record<string, unknown>) {
    setStatusFilter((f.status    as StatusFilter)   ?? 'all')
    setPriorityFilter((f.priority as PriorityFilter) ?? 'all')
    setTagFilter((f.tagName   as string | null) ?? null)
    setDueDateFilter((f.dueDate  as DueDateFilter)  ?? 'all')
    setProjectFilter((f.projectId as string | null) ?? null)
  }

  // Smart grouping only when status=all and dueDate=all
  const shouldGroup = statusFilter === 'all' && dueDateFilter === 'all'
  const groups = shouldGroup ? groupTasks(filtered) : null

  // Phase 11.E: count overdue open tasks across ALL tasks (not just filtered)
  // to drive the shutdown/review linkage CTA. Computed from local date same as TaskRow.
  const overdueOpenCount = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return tasks.filter((t) => {
      if (t.status === 'done' || t.status === 'cancelled' || !t.due_date) return false
      const [y, m, d] = t.due_date.split('-').map(Number)
      return new Date(y, m - 1, d) < today
    }).length
  }, [tasks])

  return (
    <div className="space-y-4">
      {/* Saved views panel */}
      <SavedViewsPanel
        views={savedViews}
        entityType="tasks"
        currentFilters={currentFilters as Record<string, unknown>}
        onApply={applyFilters}
      />

      {/* Filter toolbar */}
      <div className="rounded-xl border bg-card px-4 py-3 space-y-3">
        {/* Status pills + secondary filters */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Status pills */}
          <div className="flex items-center gap-1">
            {STATUS_TABS.map(({ key, label }) => {
              const count = countForStatus(key)
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                    statusFilter === key
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {label}
                  <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
                </button>
              )
            })}
          </div>

          {/* Secondary filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
              className={SELECT_CLS}
            >
              <option value="all">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={dueDateFilter}
              onChange={(e) => setDueDateFilter(e.target.value as DueDateFilter)}
              className={SELECT_CLS}
            >
              <option value="all">Any due date</option>
              <option value="today">Due today</option>
              <option value="this_week">Due this week</option>
              <option value="overdue">Overdue</option>
            </select>

            {projects.length > 0 && (
              <select
                value={projectFilter ?? ''}
                onChange={(e) => setProjectFilter(e.target.value || null)}
                className={SELECT_CLS}
              >
                <option value="">All projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Tag filter bar (only if tags exist) */}
        {allTags.length > 0 && (
          <div className="pt-1 border-t border-border/40">
            <TagFilterBar tags={allTags} selected={tagFilter} onSelect={setTagFilter} />
          </div>
        )}
      </div>

      {/* Phase 11.E: Shutdown / Review linkage CTA — appears when overdue tasks exist */}
      {overdueOpenCount > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              {overdueOpenCount} overdue task{overdueOpenCount !== 1 ? 's' : ''} — consider handling them in your daily shutdown or weekly review
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/shutdown"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
            >
              <Moon className="h-3 w-3" />
              Daily Shutdown
            </Link>
            <Link
              href="/review"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-muted text-muted-foreground hover:bg-accent hover:text-foreground border border-border/50 transition-colors"
            >
              <TrendingUp className="h-3 w-3" />
              Weekly Review
            </Link>
          </div>
        </div>
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CheckSquare className="h-10 w-10 mb-3 opacity-20" />
          <p className="text-sm font-medium">
            {tasks.length === 0 ? 'No tasks yet' : 'No tasks match your filters'}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {tasks.length === 0
              ? 'Create your first task using the button above.'
              : 'Try adjusting the filters.'}
          </p>
        </div>
      ) : shouldGroup && groups ? (
        /* Grouped view */
        <div className="rounded-xl border bg-card overflow-hidden divide-y divide-border/40">
          {groups.map((group) => (
            <div key={group.key}>
              {/* Group header */}
              <div
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 border-b border-border/40',
                  group.isOverdue ? 'bg-destructive/[0.04]' : 'bg-muted/20'
                )}
              >
                {group.isOverdue && (
                  <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
                )}
                <span
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider',
                    group.isOverdue
                      ? 'text-destructive/70'
                      : group.key === 'done'
                      ? 'text-muted-foreground/50'
                      : 'text-muted-foreground/60'
                  )}
                >
                  {group.label}
                </span>
                <span
                  className={cn(
                    'text-[10px] tabular-nums ml-auto',
                    group.isOverdue ? 'text-destructive/40' : 'text-muted-foreground/40'
                  )}
                >
                  {group.count}
                </span>
              </div>

              {/* Tasks in group */}
              {group.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  projects={projects}
                  taskTags={tagsByTaskId[task.id] ?? []}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        /* Flat list (when filters are active) */
        <div className="rounded-xl border bg-card overflow-hidden">
          {filtered.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              projects={projects}
              taskTags={tagsByTaskId[task.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}
