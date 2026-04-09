'use client'

import { useState, useMemo } from 'react'
import { CheckSquare } from 'lucide-react'
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

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'todo',        label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done',        label: 'Done' },
]

const SELECT_CLS =
  'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

function matchesDueDate(task: TaskWithProject, filter: DueDateFilter): boolean {
  if (filter === 'all') return true
  if (!task.due_date) return false   // no due date → excluded from date-specific filters
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

export function TasksView({ tasks, projects, tagsByTaskId, savedViews }: TasksViewProps) {
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [tagFilter,      setTagFilter]      = useState<string | null>(null)
  const [dueDateFilter,  setDueDateFilter]  = useState<DueDateFilter>('all')
  const [projectFilter,  setProjectFilter]  = useState<string | null>(null)

  // Derive unique tags for the tag filter bar
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

  // Current filter snapshot for SavedViewsPanel
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

  return (
    <div className="space-y-4">
      {/* Saved views panel */}
      <SavedViewsPanel
        views={savedViews}
        entityType="tasks"
        currentFilters={currentFilters as Record<string, unknown>}
        onApply={applyFilters}
      />

      {/* Status tabs + priority dropdown */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 border-b pb-0">
          {STATUS_TABS.map(({ key, label }) => {
            const count = countForStatus(key)
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  statusFilter === key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
                <span className={cn(
                  'ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                  statusFilter === key ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

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
      </div>

      {/* Due date + project filters */}
      <div className="flex items-center gap-3 flex-wrap">
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

      {/* Tag filter bar */}
      <TagFilterBar tags={allTags} selected={tagFilter} onSelect={setTagFilter} />

      {/* Task list */}
      {filtered.length > 0 ? (
        <div className="rounded-lg border bg-card px-3">
          {filtered.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              projects={projects}
              taskTags={tagsByTaskId[task.id] ?? []}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
          <CheckSquare className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">
            {tasks.length === 0 ? 'No tasks yet' : 'No tasks match your filters'}
          </p>
          <p className="text-sm mt-1">
            {tasks.length === 0
              ? 'Create your first task using the button above.'
              : 'Try adjusting the filters.'}
          </p>
        </div>
      )}
    </div>
  )
}
