'use client'

import { useState } from 'react'
import { CheckSquare } from 'lucide-react'
import { TaskRow } from './TaskRow'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

type TaskWithProject = Task & {
  projects: { id: string; name: string; color: string } | null
}

type StatusFilter = 'all' | 'todo' | 'in_progress' | 'done'
type PriorityFilter = 'all' | 'urgent' | 'high' | 'medium' | 'low'

interface Project {
  id: string
  name: string
}

interface TasksViewProps {
  tasks: TaskWithProject[]
  projects: Project[]
}

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
]

export function TasksView({ tasks, projects }: TasksViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')

  const filtered = tasks.filter((t) => {
    const statusMatch = statusFilter === 'all' || t.status === statusFilter
    const priorityMatch = priorityFilter === 'all' || t.priority === priorityFilter
    return statusMatch && priorityMatch
  })

  function countForStatus(key: StatusFilter) {
    if (key === 'all') return tasks.length
    return tasks.filter((t) => t.status === key).length
  }

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Status tabs */}
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
                <span
                  className={cn(
                    'ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                    statusFilter === key
                      ? 'bg-primary/10 text-primary'
                      : 'bg-secondary text-secondary-foreground'
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Priority dropdown */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="all">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Task list */}
      {filtered.length > 0 ? (
        <div className="rounded-lg border bg-card px-3">
          {filtered.map((task) => (
            <TaskRow key={task.id} task={task} projects={projects} />
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
              : 'Try adjusting the status or priority filter.'}
          </p>
        </div>
      )}
    </div>
  )
}
