'use client'

import { useState, useMemo } from 'react'
import { FolderOpen } from 'lucide-react'
import { ProjectCard } from './ProjectCard'
import { ProjectHubPanel } from './ProjectHubPanel'
import { TagFilterBar } from '@/components/ui/tag-input'
import { cn } from '@/lib/utils'
import type { Project, Tag } from '@/types'

// ── Filter types ──────────────────────────────────────────────────────────────

type StatusFilter = 'active' | 'completed' | 'archived' | 'all'
type TypeFilter   = 'all' | 'project' | 'area' | 'client'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'active',    label: 'Active'    },
  { key: 'completed', label: 'Completed' },
  { key: 'archived',  label: 'Archived'  },
  { key: 'all',       label: 'All'       },
]

const TYPE_PILLS: { key: TypeFilter; label: string }[] = [
  { key: 'all',     label: 'All'     },
  { key: 'project', label: 'Projects' },
  { key: 'area',    label: 'Areas'   },
  { key: 'client',  label: 'Clients' },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProjectsViewProps {
  projects: Project[]
  tagsByProjectId: Record<string, Tag[]>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProjectsView({ projects, tagsByProjectId }: ProjectsViewProps) {
  const [activeStatus,    setActiveStatus]    = useState<StatusFilter>('active')
  const [activeType,      setActiveType]      = useState<TypeFilter>('all')
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null)
  const [selectedId,      setSelectedId]      = useState<string | null>(null)

  // All unique tags across all projects — for the tag filter bar
  const allProjectTags = useMemo<Tag[]>(() => {
    const seen = new Set<string>()
    const result: Tag[] = []
    for (const tagList of Object.values(tagsByProjectId)) {
      for (const tag of tagList) {
        if (!seen.has(tag.id)) {
          seen.add(tag.id)
          result.push(tag)
        }
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name))
  }, [tagsByProjectId])

  // Filtered project list
  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (activeStatus !== 'all' && p.status !== activeStatus) return false
      if (activeType   !== 'all' && p.type   !== activeType)   return false
      if (activeTagFilter) {
        const names = (tagsByProjectId[p.id] ?? []).map((t) => t.name)
        if (!names.includes(activeTagFilter)) return false
      }
      return true
    })
  }, [projects, activeStatus, activeType, activeTagFilter, tagsByProjectId])

  // Count helpers for status tabs
  function countForStatus(key: StatusFilter) {
    if (key === 'all') return projects.length
    return projects.filter((p) => p.status === key).length
  }

  const selectedProject = selectedId
    ? projects.find((p) => p.id === selectedId) ?? null
    : null

  const emptyLabel =
    activeStatus === 'all'
      ? 'No projects yet'
      : `No ${activeStatus} projects`

  return (
    <div className="space-y-4">
      {/* ── Status tabs (primary) ─────────────────────────────────────── */}
      <div className="flex gap-1 border-b pb-0">
        {STATUS_TABS.map(({ key, label }) => {
          const count = countForStatus(key)
          return (
            <button
              key={key}
              onClick={() => setActiveStatus(key)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeStatus === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
              <span
                className={cn(
                  'ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                  activeStatus === key
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

      {/* ── Secondary filters row ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type pills */}
        <div className="flex items-center gap-1">
          {TYPE_PILLS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveType(key)}
              className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-full border transition-colors',
                activeType === key
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-input text-muted-foreground hover:text-foreground hover:border-foreground/30'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tag filter — only shown if any project has tags */}
        {allProjectTags.length > 0 && (
          <TagFilterBar
            tags={allProjectTags}
            selected={activeTagFilter}
            onSelect={setActiveTagFilter}
          />
        )}
      </div>

      {/* ── Project grid ─────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tags={tagsByProjectId[project.id] ?? []}
              onSelect={() =>
                setSelectedId((prev) =>
                  prev === project.id ? null : project.id
                )
              }
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
          <FolderOpen className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">{emptyLabel}</p>
          <p className="text-sm mt-1">
            {activeStatus === 'all' && activeType === 'all' && !activeTagFilter
              ? 'Create one using the button above.'
              : 'Try adjusting your filters.'}
          </p>
        </div>
      )}

      {/* ── Project hub panel (lazy, fixed overlay) ────────────────── */}
      {selectedProject && (
        <ProjectHubPanel
          project={selectedProject}
          initialTags={tagsByProjectId[selectedProject.id] ?? []}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
