'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, Pencil, ChevronDown } from 'lucide-react'
import { deleteProject, updateProjectStatus } from '@/lib/actions/projects'
import { EditProjectDialog } from './EditProjectDialog'
import { TagBadge } from '@/components/ui/tag-input'
import { cn } from '@/lib/utils'
import type { Project, Tag } from '@/types'

const STATUS_SELECT_CLASS: Record<string, string> = {
  active:    'bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400',
  completed: 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400',
  archived:  'bg-muted text-muted-foreground border-border',
}

interface ProjectCardProps {
  project: Project
  tags?: Tag[]
  onSelect?: () => void
}

export function ProjectCard({ project, tags = [], onSelect }: ProjectCardProps) {
  const [deleting, setDeleting]       = useState(false)
  const [editOpen, setEditOpen]       = useState(false)
  const [localStatus, setLocalStatus] = useState(project.status)

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return
    setDeleting(true)
    await deleteProject(project.id)
    setDeleting(false)
  }

  function handleEditOpen(e: React.MouseEvent) {
    e.stopPropagation()
    setEditOpen(true)
  }

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation()
    const newStatus = e.target.value as 'active' | 'completed' | 'archived'
    setLocalStatus(newStatus) // optimistic
    const result = await updateProjectStatus(project.id, newStatus)
    if (result?.error) {
      setLocalStatus(project.status) // revert on failure
    }
  }

  return (
    <>
      <Card
        className={cn(
          'group relative hover:shadow-md transition-shadow',
          onSelect && 'cursor-pointer'
        )}
        onClick={onSelect}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                style={{ backgroundColor: project.color }}
              />
              <h3 className="font-semibold text-sm leading-tight truncate">
                {project.name}
              </h3>
            </div>
            {/* Action buttons — visible on hover */}
            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
                onClick={handleEditOpen}
                aria-label="Edit project"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Delete project"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2.5">
          {project.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}

          {/* Type badge + inline status dropdown */}
          <div
            className="flex items-center gap-2 flex-wrap"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border border-border bg-secondary text-secondary-foreground capitalize">
              {project.type}
            </span>

            {/* Inline status selector */}
            <div className="relative inline-flex items-center">
              <select
                value={localStatus}
                onChange={handleStatusChange}
                className={cn(
                  'appearance-none text-xs font-medium pl-2 pr-5 py-0.5 rounded-full border cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  STATUS_SELECT_CLASS[localStatus]
                )}
                aria-label="Project status"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 opacity-50" />
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div
              className="flex flex-wrap gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {tags.map((tag) => (
                <TagBadge key={tag.id} tag={tag} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditProjectDialog
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}
