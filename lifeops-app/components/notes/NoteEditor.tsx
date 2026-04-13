'use client'

import { useState } from 'react'
import { Pin, Trash2, Check, ArrowLeft, X, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TagInput } from '@/components/ui/tag-input'
import { editNote, deleteNote, togglePin } from '@/lib/actions/notes'
import { setNoteTags } from '@/lib/actions/tags'
import { linkNoteToTask, unlinkNoteFromTask } from '@/lib/actions/links'
import { cn } from '@/lib/utils'
import type { Tag } from '@/types'

interface NoteForEdit {
  id: string
  title: string
  content: string | null
  project_id: string | null
  is_pinned: boolean
}

interface Project { id: string; name: string }

// Phase 13.B — project_id added in Phase 16.B so the picker can be scoped to the note's project
interface TaskOption { id: string; title: string; project_id: string | null }

interface NoteEditorProps {
  type: 'note' | 'journal'
  note: NoteForEdit
  noteTags: Tag[]
  projects: Project[]
  onDeleted: () => void
  onBack?: () => void
  // Phase 13.B: task linking
  tasks: TaskOption[]
  linkedTaskIds: string[]
}

export function NoteEditor({ type, note, noteTags, projects, onDeleted, onBack, tasks, linkedTaskIds }: NoteEditorProps) {
  const [title,         setTitle]         = useState(note.title)
  const [content,       setContent]       = useState(note.content ?? '')
  const [projectId,     setProjectId]     = useState(note.project_id ?? '')
  const [isPinned,      setIsPinned]      = useState(note.is_pinned)
  const [tagNames,      setTagNames]      = useState<string[]>(noteTags.map(t => t.name))
  const [saving,        setSaving]        = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pinning,       setPinning]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [savedFlash,    setSavedFlash]    = useState(false)

  // Phase 13.B: local linked task state (optimistic)
  const [localLinkedIds, setLocalLinkedIds] = useState<string[]>(linkedTaskIds)
  const [pickTaskId,     setPickTaskId]     = useState('')
  const [linking,        setLinking]        = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('title', title.trim())
      fd.append('content', content)
      fd.append('type', type)
      if (type === 'note') {
        if (projectId) fd.append('project_id', projectId)
        fd.append('is_pinned', String(isPinned))
      }
      const result = await editNote(note.id, fd)
      if (result?.error) {
        setError(result.error)
        return
      }
      await setNoteTags(note.id, tagNames)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    onDeleted()
    await deleteNote(note.id)
  }

  async function handlePinToggle() {
    setPinning(true)
    await togglePin(note.id, isPinned)
    setIsPinned(p => !p)
    setPinning(false)
  }

  // Phase 13.B: link a task
  async function handleLink() {
    if (!pickTaskId || localLinkedIds.includes(pickTaskId)) return
    setLinking(true)
    setLocalLinkedIds(prev => [...prev, pickTaskId])
    setPickTaskId('')
    await linkNoteToTask(note.id, pickTaskId)
    setLinking(false)
  }

  // Phase 13.B: unlink a task
  async function handleUnlink(taskId: string) {
    setLocalLinkedIds(prev => prev.filter(id => id !== taskId))
    await unlinkNoteFromTask(note.id, taskId)
  }

  // Phase 16.B: scope the picker to the note's currently selected project.
  // Already-linked tasks always remain visible — we only restrict what can be newly linked.
  // If no project is selected, all active tasks are available.
  const unlinkableTasks = tasks.filter((t) => {
    if (localLinkedIds.includes(t.id)) return false
    if (!projectId) return true
    return t.project_id === projectId
  })

  // Linked tasks with titles resolved from the tasks list
  const linkedTasks = localLinkedIds
    .map(id => tasks.find(t => t.id === id))
    .filter(Boolean) as TaskOption[]

  return (
    <div className="flex flex-col h-full">
      {/* Mobile: back to list */}
      {onBack && (
        <div className="shrink-0 px-4 pt-3 lg:hidden">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to notes
          </button>
        </div>
      )}

      {/* Scrollable editor area */}
      <div className="flex-1 flex flex-col px-6 pt-5 pb-3 overflow-y-auto min-h-0">
        {error && (
          <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
            {error}
          </div>
        )}

        {/* Borderless title input */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={type === 'journal' ? 'Date / Title…' : 'Title…'}
          className="text-xl font-bold bg-transparent border-none outline-none w-full placeholder:text-muted-foreground/25 caret-primary mb-3 focus:outline-none"
        />

        {/* Borderless content textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={type === 'journal' ? 'Write your thoughts…' : 'Add notes, details, or ideas…'}
          className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-foreground/90 placeholder:text-muted-foreground/25 leading-relaxed min-h-[200px] caret-primary focus:outline-none"
        />

        {/* Metadata */}
        <div className="flex flex-col gap-2.5 mt-4 pt-4 border-t border-border/40">
          {type === 'note' && projects.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground/60 w-14 shrink-0">Project</span>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value)
                  // Clear the pending task selection when project changes so the picker resets
                  setPickTaskId('')
                }}
                className="flex-1 h-7 rounded-lg border border-input bg-background px-2 text-xs text-muted-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">None</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-start gap-3">
            <span className="text-[11px] text-muted-foreground/60 w-14 shrink-0 pt-1">Tags</span>
            <div className="flex-1">
              <TagInput value={tagNames} onChange={setTagNames} placeholder="Add tags…" />
            </div>
          </div>

          {/* Phase 13.B: Linked tasks row */}
          {tasks.length > 0 && (
            <div className="flex items-start gap-3">
              <span className="text-[11px] text-muted-foreground/60 w-14 shrink-0 pt-1 flex items-center gap-0.5">
                <Link2 className="h-2.5 w-2.5" />
                Tasks
              </span>
              <div className="flex-1 flex flex-col gap-1.5">
                {/* Linked task chips — always shown regardless of current project selection */}
                {linkedTasks.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {linkedTasks.map(task => (
                      <span
                        key={task.id}
                        className="inline-flex items-center gap-1 text-[11px] bg-primary/8 text-primary border border-primary/20 px-1.5 py-0.5 rounded-md max-w-[200px]"
                      >
                        <span className="truncate">{task.title}</span>
                        <button
                          type="button"
                          onClick={() => handleUnlink(task.id)}
                          className="shrink-0 text-primary/60 hover:text-primary transition-colors"
                          aria-label={`Unlink ${task.title}`}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Link selector — scoped to selected project; hidden when picker is empty */}
                {unlinkableTasks.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={pickTaskId}
                      onChange={(e) => setPickTaskId(e.target.value)}
                      className="flex-1 h-7 rounded-lg border border-input bg-background px-2 text-xs text-muted-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Link a task…</option>
                      {unlinkableTasks.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleLink}
                      disabled={!pickTaskId || linking}
                      className={cn(
                        'h-7 px-2 rounded-lg text-xs font-medium transition-colors',
                        pickTaskId
                          ? 'bg-primary/10 text-primary hover:bg-primary/15'
                          : 'bg-muted text-muted-foreground/40 cursor-not-allowed'
                      )}
                    >
                      Link
                    </button>
                  </div>
                )}

                {/* Contextual hint when a project is selected but has no available tasks */}
                {projectId && unlinkableTasks.length === 0 && linkedTasks.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/50 italic">
                    No active tasks in this project.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer action bar */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-t border-border/40">
        <Button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          size="sm"
          className={cn(
            'transition-colors duration-150',
            savedFlash && 'bg-emerald-500 hover:bg-emerald-500 border-emerald-500 text-white'
          )}
        >
          {saving ? 'Saving…' : savedFlash
            ? <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5" />Saved</span>
            : 'Save'}
        </Button>

        {type === 'note' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePinToggle}
            disabled={pinning}
            className={cn('px-2', isPinned ? 'text-primary' : 'text-muted-foreground')}
            title={isPinned ? 'Unpin' : 'Pin'}
          >
            <Pin className={cn('h-3.5 w-3.5', isPinned && 'fill-primary')} />
          </Button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {confirmDelete ? (
            <>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? '…' : 'Delete'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
