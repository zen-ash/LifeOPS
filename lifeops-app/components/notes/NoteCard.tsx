'use client'

import { useState } from 'react'
import { Pin, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deleteNote, togglePin } from '@/lib/actions/notes'
import { NoteDialog } from './NoteDialog'
import { TagBadge } from '@/components/ui/tag-input'
import type { Tag } from '@/types'

interface NoteRow {
  id: string
  title: string
  content: string | null
  type: 'note' | 'journal'
  project_id: string | null
  project_name: string | null
  is_pinned: boolean
  created_at: string
  updated_at: string
}

interface Project {
  id: string
  name: string
}

interface NoteCardProps {
  note: NoteRow
  projects: Project[]
  noteTags: Tag[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function NoteCard({ note, projects, noteTags }: NoteCardProps) {
  const [editOpen, setEditOpen]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [pinning, setPinning]             = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await deleteNote(note.id)
    setDeleting(false)
  }

  async function handlePin() {
    setPinning(true)
    await togglePin(note.id, note.is_pinned)
    setPinning(false)
  }

  return (
    <>
      <div className="rounded-xl border bg-card p-4 flex flex-col gap-2.5 hover:shadow-sm transition-shadow">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {note.type === 'journal' && (
              <p className="text-[11px] text-primary font-medium mb-0.5">
                {formatDate(note.created_at)}
              </p>
            )}
            <p className="font-medium text-sm leading-snug">
              {note.title}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {note.type === 'note' && (
              <button
                type="button"
                onClick={handlePin}
                disabled={pinning}
                title={note.is_pinned ? 'Unpin' : 'Pin'}
                className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              >
                <Pin
                  className={cn(
                    'h-3.5 w-3.5',
                    note.is_pinned && 'fill-primary text-primary'
                  )}
                />
              </button>
            )}
            <span className="text-[11px] text-muted-foreground">
              {formatDate(note.updated_at)}
            </span>
          </div>
        </div>

        {/* Content excerpt */}
        {note.content && (
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {note.content}
          </p>
        )}

        {/* Tag chips */}
        {noteTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {noteTags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-0.5">
          <div>
            {note.project_name && (
              <span className="text-[11px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                {note.project_name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              title="Edit"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>

            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-[11px] text-destructive font-medium hover:underline disabled:opacity-50"
                >
                  {deleting ? '…' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-[11px] text-muted-foreground hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                title="Delete"
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <NoteDialog
        type={note.type}
        note={{
          id: note.id,
          title: note.title,
          content: note.content,
          project_id: note.project_id,
          is_pinned: note.is_pinned,
        }}
        noteTags={noteTags}
        projects={projects}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}
