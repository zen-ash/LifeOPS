'use client'

import { useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { ProjectCard } from './ProjectCard'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'

type TypeFilter = 'all' | 'project' | 'area' | 'client'

const TABS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'project', label: 'Projects' },
  { key: 'area', label: 'Areas' },
  { key: 'client', label: 'Clients' },
]

interface ProjectsViewProps {
  projects: Project[]
}

export function ProjectsView({ projects }: ProjectsViewProps) {
  const [activeFilter, setActiveFilter] = useState<TypeFilter>('all')

  const filtered =
    activeFilter === 'all'
      ? projects
      : projects.filter((p) => p.type === activeFilter)

  function countFor(key: TypeFilter) {
    if (key === 'all') return projects.length
    return projects.filter((p) => p.type === key).length
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1 border-b pb-0">
        {TABS.map(({ key, label }) => {
          const count = countFor(key)
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeFilter === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
              <span
                className={cn(
                  'ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                  activeFilter === key
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

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
          <FolderOpen className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">
            {activeFilter === 'all'
              ? 'No projects yet'
              : `No ${activeFilter}s yet`}
          </p>
          <p className="text-sm mt-1">Create one using the button above.</p>
        </div>
      )}
    </div>
  )
}
