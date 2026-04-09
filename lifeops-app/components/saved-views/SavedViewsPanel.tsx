'use client'

import { useState, useRef, useEffect } from 'react'
import { Bookmark, Plus, X, Pencil, Check } from 'lucide-react'
import { createSavedView, deleteSavedView, renameSavedView } from '@/lib/actions/savedViews'
import type { SavedView, SavedViewEntityType } from '@/types'

interface SavedViewsPanelProps {
  views: SavedView[]
  entityType: SavedViewEntityType
  currentFilters: Record<string, unknown>
  onApply: (filters: Record<string, unknown>) => void
}

export function SavedViewsPanel({
  views,
  entityType,
  currentFilters,
  onApply,
}: SavedViewsPanelProps) {
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [saveName, setSaveName]         = useState('')
  const [saving, setSaving]             = useState(false)
  const [renamingId, setRenamingId]     = useState<string | null>(null)
  const [renameValue, setRenameValue]   = useState('')
  const saveInputRef  = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Focus input when save form opens
  useEffect(() => {
    if (showSaveForm) saveInputRef.current?.focus()
  }, [showSaveForm])

  // Focus rename input when rename starts
  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus()
  }, [renamingId])

  async function handleSave() {
    if (!saveName.trim()) return
    setSaving(true)
    await createSavedView(saveName.trim(), entityType, currentFilters)
    setSaveName('')
    setShowSaveForm(false)
    setSaving(false)
  }

  async function handleDelete(view: SavedView, e: React.MouseEvent) {
    e.stopPropagation()
    await deleteSavedView(view.id, entityType)
  }

  function startRename(view: SavedView, e: React.MouseEvent) {
    e.stopPropagation()
    setRenamingId(view.id)
    setRenameValue(view.name)
  }

  async function commitRename() {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null)
      return
    }
    await renameSavedView(renamingId, renameValue.trim(), entityType)
    setRenamingId(null)
  }

  function cancelRename(e?: React.MouseEvent) {
    e?.stopPropagation()
    setRenamingId(null)
  }

  if (views.length === 0 && !showSaveForm) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowSaveForm(true)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Bookmark className="h-3.5 w-3.5" />
          Save this view
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Bookmark className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

      {/* Saved view chips */}
      {views.map((view) =>
        renamingId === view.id ? (
          // Rename mode
          <span
            key={view.id}
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-2 py-0.5"
          >
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') cancelRename()
              }}
              className="w-24 text-xs bg-transparent outline-none"
            />
            <button
              type="button"
              onClick={commitRename}
              className="text-primary hover:text-primary/80"
              aria-label="Confirm rename"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={cancelRename}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cancel rename"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ) : (
          // Normal chip
          <span
            key={view.id}
            className="group inline-flex items-center gap-1 rounded-full border border-input bg-background px-2.5 py-0.5 text-xs font-medium hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <button
              type="button"
              onClick={() => onApply(view.filters_json)}
              className="hover:text-primary transition-colors"
            >
              {view.name}
            </button>
            <button
              type="button"
              onClick={(e) => startRename(view, e)}
              aria-label={`Rename ${view.name}`}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
            >
              <Pencil className="h-2.5 w-2.5" />
            </button>
            <button
              type="button"
              onClick={(e) => handleDelete(view, e)}
              aria-label={`Delete ${view.name}`}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )
      )}

      {/* Save form or button */}
      {showSaveForm ? (
        <span className="inline-flex items-center gap-1.5">
          <input
            ref={saveInputRef}
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') { setShowSaveForm(false); setSaveName('') }
            }}
            placeholder="View name…"
            className="h-7 w-32 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !saveName.trim()}
            className="text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-40 transition-colors"
          >
            {saving ? '…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => { setShowSaveForm(false); setSaveName('') }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setShowSaveForm(true)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Save current filters as a view"
        >
          <Plus className="h-3.5 w-3.5" />
          Save view
        </button>
      )}
    </div>
  )
}
