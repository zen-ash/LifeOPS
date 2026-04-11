'use client'

import { useState } from 'react'
import { Pin, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deleteNote, togglePin } from '@/lib/actions/notes'
import { TagBadge } from '@/components/ui/tag-input'
import { Button } from '@/components/ui/button'
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

interface NoteCardProps {
  note: NoteRow
  noteTags: Tag[]
  isSelected?: boolean
  onSelect?: () => void
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function NoteCard({ note, noteTags, isSelected, onSelect }: NoteCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [pinning,       setPinning]       = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setDeleting(true)
    await deleteNote(note.id)
    setDeleting(false)
  }

  async function handlePin(e: React.MouseEvent) {
    e.stopPropagation()
    setPinning(true)
    await togglePin(note.id, note.is_pinned)
    setPinning(false)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.() } }}
      className={cn(
        'group relative rounded-xl border bg-card overflow-hidden',
        'cursor-pointer hover:border-border/80 hover:shadow-sm transition-all duration-150',
        note.is_pinned && note.type === 'note' && 'border-l-[3px] border-l-primary/60',
        isSelected && 'bg-accent/40 border-primary/50 shadow-sm ring-1 ring-primary/20'
      )}
    >
      {/* Hover-reveal action buttons */}
      <div
        className={cn(
          'absolute top-3 right-3 flex items-center gap-0.5 z-10 transition-opacity',
          confirmDelete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        {note.type === 'note' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-card/90 text-muted-foreground hover:text-primary hover:bg-accent backdrop-blur-sm"
            onClick={handlePin}
            disabled={pinning}
            title={note.is_pinned ? 'Unpin' : 'Pin'}
          >
            <Pin className={cn('h-3.5 w-3.5', note.is_pinned && 'fill-primary text-primary')} />
          </Button>
        )}

        {/* Edit opens in right pane */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 bg-card/90 text-muted-foreground hover:text-foreground hover:bg-accent backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); onSelect?.() }}
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>

        {confirmDelete ? (
          <div className="flex items-center gap-0.5 bg-card/95 border border-border/60 rounded-md px-1.5 py-0.5">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-[11px] text-destructive font-medium hover:underline disabled:opacity-50 px-0.5"
            >
              {deleting ? '…' : 'Delete'}
            </button>
            <span className="text-muted-foreground/40 text-[11px]">·</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
              className="text-[11px] text-muted-foreground hover:underline px-0.5"
            >
              Cancel
            </button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-card/90 text-muted-foreground hover:text-destructive hover:bg-destructive/10 backdrop-blur-sm"
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="p-4">
        {/* Journal: date header */}
        {note.type === 'journal' && (
          <p className="text-[11px] text-primary font-medium mb-1">
            {formatRelativeDate(note.created_at)}
          </p>
        )}

        {/* Title */}
        <p className="text-sm font-semibold leading-snug pr-20">
          {note.title}
        </p>

        {/* Content preview */}
        {note.content && (
          <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-2 leading-relaxed">
            {note.content}
          </p>
        )}

        {/* Tags */}
        {noteTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {noteTags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        )}

        {/* Footer metadata */}
        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border/30">
          <span className="text-[11px] text-muted-foreground/50 tabular-nums">
            {formatRelativeDate(note.updated_at)}
          </span>
          {note.project_name && (
            <span className="text-[11px] bg-muted text-muted-foreground border border-border/50 px-1.5 py-0.5 rounded truncate max-w-[120px]">
              {note.project_name}
            </span>
          )}
          {note.is_pinned && note.type === 'note' && (
            <span className="ml-auto">
              <Pin className="h-3 w-3 text-primary/50 fill-primary/30" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
