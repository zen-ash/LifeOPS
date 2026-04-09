'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TagInput } from '@/components/ui/tag-input'
import { addNote, editNote } from '@/lib/actions/notes'
import { setNoteTags } from '@/lib/actions/tags'
import type { Tag } from '@/types'

const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

interface NoteForEdit {
  id: string
  title: string
  content: string | null
  project_id: string | null
  is_pinned: boolean
}

interface Project {
  id: string
  name: string
}

interface NoteDialogProps {
  type: 'note' | 'journal'
  note?: NoteForEdit      // if present → edit mode
  noteTags?: Tag[]        // existing tags for edit mode
  projects: Project[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function NoteDialog({
  type,
  note,
  noteTags,
  projects,
  open,
  onOpenChange,
}: NoteDialogProps) {
  const isEdit = !!note
  const formRef = useRef<HTMLFormElement>(null)

  const [title, setTitle]         = useState('')
  const [content, setContent]     = useState('')
  const [projectId, setProjectId] = useState('')
  const [isPinned, setIsPinned]   = useState(false)
  const [tagNames, setTagNames]   = useState<string[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Reset fields whenever the dialog opens
  useEffect(() => {
    if (open) {
      setTitle(note?.title ?? (type === 'journal' ? todayLabel() : ''))
      setContent(note?.content ?? '')
      setProjectId(note?.project_id ?? '')
      setIsPinned(note?.is_pinned ?? false)
      setTagNames((noteTags ?? []).map((t) => t.name))
      setError(null)
    }
  }, [open, note, noteTags, type])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData()
    fd.append('title', title)
    fd.append('content', content)
    fd.append('type', type)
    if (type === 'note') {
      if (projectId) fd.append('project_id', projectId)
      fd.append('is_pinned', String(isPinned))
    }

    if (isEdit) {
      const result = await editNote(note!.id, fd)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      // Sync tags (clears when tagNames is empty)
      await setNoteTags(note!.id, tagNames)
    } else {
      const result = await addNote(fd)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      if (result.noteId && tagNames.length > 0) {
        await setNoteTags(result.noteId, tagNames)
      }
    }

    setLoading(false)
    onOpenChange(false)
  }

  const dialogTitle  = isEdit
    ? type === 'journal' ? 'Edit journal entry' : 'Edit note'
    : type === 'journal' ? 'New journal entry'  : 'New note'
  const submitLabel  = isEdit ? 'Save' : type === 'journal' ? 'Save entry' : 'Save note'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {type === 'journal'
              ? 'Write a dated reflection or log entry.'
              : 'Write a general note, optionally linked to a project.'}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="note-title">
                {type === 'journal' ? 'Date / Title *' : 'Title *'}
              </Label>
              <Input
                id="note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === 'journal' ? 'April 7, 2026' : 'Note title…'}
                required
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="note-content">
                {type === 'journal' ? 'Entry' : 'Content'}
              </Label>
              <textarea
                id="note-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  type === 'journal'
                    ? 'Write your thoughts…'
                    : 'Add notes, details, or ideas…'
                }
                rows={7}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            {/* Notes-only fields */}
            {type === 'note' && (
              <>
                {projects.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="note-project">Link to project (optional)</Label>
                    <select
                      id="note-project"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className={SELECT_CLS}
                    >
                      <option value="">None</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    id="note-pinned"
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  <Label htmlFor="note-pinned" className="cursor-pointer font-normal">
                    Pin this note
                  </Label>
                </div>
              </>
            )}

            {/* Tags — available for both notes and journal */}
            <div className="space-y-2">
              <Label>Tags (optional)</Label>
              <TagInput
                value={tagNames}
                onChange={setTagNames}
                placeholder="Type a tag and press Enter…"
              />
              <p className="text-[11px] text-muted-foreground">Press Enter or comma to add each tag.</p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? 'Saving…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
