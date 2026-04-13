'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  X,
  Loader2,
  CheckSquare,
  FileText,
  Vault,
  Pin,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TagInput, TagBadge } from '@/components/ui/tag-input'
import { setProjectTags } from '@/lib/actions/tags'
import {
  getProjectHubData,
  type ProjectHubData,
  type HubTask,
  type HubDocument,
  type HubNote,
} from '@/lib/actions/projects'
import { cn } from '@/lib/utils'
import type { Project, Tag } from '@/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high:   'bg-orange-500',
  medium: 'bg-amber-400',
  low:    'bg-muted-foreground/30',
}

const STATUS_CHIP: Record<string, string> = {
  todo:        'bg-secondary text-secondary-foreground',
  in_progress: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  done:        'bg-green-500/10 text-green-600 dark:text-green-500',
  cancelled:   'bg-muted text-muted-foreground line-through',
}

const STATUS_LABEL: Record<string, string> = {
  todo:        'To do',
  in_progress: 'In progress',
  done:        'Done',
  cancelled:   'Cancelled',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({
  icon: Icon,
  label,
  count,
}: {
  icon: React.ElementType
  label: string
  count: number
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-xs text-muted-foreground/60">({count})</span>
    </div>
  )
}

function TaskRow({ task }: { task: HubTask }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/40 last:border-0">
      <span
        className={cn(
          'mt-1.5 h-2 w-2 rounded-full shrink-0',
          PRIORITY_DOT[task.priority] ?? 'bg-muted-foreground/30'
        )}
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm leading-snug truncate',
            task.status === 'done' && 'line-through text-muted-foreground',
            task.status === 'cancelled' && 'line-through text-muted-foreground/50'
          )}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
              STATUS_CHIP[task.status] ?? 'bg-secondary text-secondary-foreground'
            )}
          >
            {STATUS_LABEL[task.status] ?? task.status}
          </span>
          {task.due_date && (
            <span className="text-[10px] text-muted-foreground">
              Due {formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function DocRow({ doc }: { doc: HubDocument }) {
  const ext = doc.file_type?.split('/')[1]?.toUpperCase() ?? '—'
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-border/40 last:border-0">
      <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/8 shrink-0">
        <span className="text-[9px] font-bold text-primary">{ext.slice(0, 3)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{doc.name}</p>
        <p className="text-[10px] text-muted-foreground">{formatBytes(doc.file_size)}</p>
      </div>
    </div>
  )
}

function NoteRow({ note }: { note: HubNote }) {
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-border/40 last:border-0">
      {note.is_pinned && (
        <Pin className="h-3 w-3 text-primary shrink-0 fill-primary" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{note.title}</p>
        <p className="text-[10px] text-muted-foreground">
          Updated {formatDate(note.updated_at)}
        </p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface ProjectHubPanelProps {
  project: Project
  initialTags: Tag[]
  onClose: () => void
}

export function ProjectHubPanel({
  project,
  initialTags,
  onClose,
}: ProjectHubPanelProps) {
  const router = useRouter()

  const [hubData, setHubData] = useState<ProjectHubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [tagNames, setTagNames] = useState<string[]>(
    initialTags.map((t) => t.name)
  )
  const [savingTags, setSavingTags] = useState(false)
  const [tagsSaved, setTagsSaved] = useState(false)

  // Fetch hub data lazily on mount
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFetchError(null)
    getProjectHubData(project.id).then((result) => {
      if (cancelled) return
      if (result.error) {
        setFetchError(result.error)
      } else if (result.data) {
        setHubData(result.data)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [project.id])

  async function handleSaveTags() {
    setSavingTags(true)
    await setProjectTags(project.id, tagNames)
    setSavingTags(false)
    setTagsSaved(true)
    setTimeout(() => setTagsSaved(false), 2000)
    router.refresh()
  }

  const taskCount = hubData?.tasks.length ?? 0
  const docCount = hubData?.documents.length ?? 0
  const noteCount = hubData?.notes.length ?? 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-background border-l border-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div
          className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-border"
          style={{ borderTopColor: project.color, borderTopWidth: 3 }}
        >
          <span
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm leading-tight truncate">
              {project.name}
            </h2>
            {project.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {project.description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Tags section */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tags
              </span>
            </div>
            <TagInput
              value={tagNames}
              onChange={setTagNames}
              placeholder="Add a tag…"
            />
            <div className="flex items-center justify-end mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveTags}
                disabled={savingTags}
                className={cn(
                  'h-7 px-3 text-xs transition-colors',
                  tagsSaved && 'border-green-500 text-green-600 dark:text-green-500'
                )}
              >
                {savingTags ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : tagsSaved ? (
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Saved
                  </span>
                ) : (
                  'Save tags'
                )}
              </Button>
            </div>
          </section>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading…</span>
            </div>
          )}

          {/* Error state */}
          {fetchError && !loading && (
            <p className="text-sm text-destructive">{fetchError}</p>
          )}

          {/* Linked content */}
          {!loading && hubData && (
            <>
              {/* Tasks */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <SectionHeading
                    icon={CheckSquare}
                    label="Tasks"
                    count={taskCount}
                  />
                  {taskCount > 0 && (
                    <Link
                      href="/tasks"
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View all →
                    </Link>
                  )}
                </div>
                {taskCount === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No tasks linked to this project.
                  </p>
                ) : (
                  <div>
                    {hubData.tasks.map((task) => (
                      <TaskRow key={task.id} task={task} />
                    ))}
                  </div>
                )}
              </section>

              {/* Documents */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <SectionHeading
                    icon={Vault}
                    label="Documents"
                    count={docCount}
                  />
                  {docCount > 0 && (
                    <Link
                      href="/documents"
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View all →
                    </Link>
                  )}
                </div>
                {docCount === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No documents linked to this project.
                  </p>
                ) : (
                  <div>
                    {hubData.documents.map((doc) => (
                      <DocRow key={doc.id} doc={doc} />
                    ))}
                  </div>
                )}
              </section>

              {/* Notes */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <SectionHeading
                    icon={FileText}
                    label="Notes"
                    count={noteCount}
                  />
                  {noteCount > 0 && (
                    <Link
                      href="/notes"
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View all →
                    </Link>
                  )}
                </div>
                {noteCount === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No notes linked to this project.
                  </p>
                ) : (
                  <div>
                    {hubData.notes.map((note) => (
                      <NoteRow key={note.id} note={note} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </>
  )
}
