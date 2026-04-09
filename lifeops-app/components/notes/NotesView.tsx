'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, FileText, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NoteCard } from './NoteCard'
import { NoteDialog } from './NoteDialog'
import { TagFilterBar } from '@/components/ui/tag-input'
import { SavedViewsPanel } from '@/components/saved-views/SavedViewsPanel'
import type { Tag, SavedView, NoteViewFilters, SavedViewEntityType } from '@/types'

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

interface Project { id: string; name: string }

interface NotesViewProps {
  notes: NoteRow[]
  type: 'note' | 'journal'
  projects: Project[]
  tagsByNoteId: Record<string, Tag[]>
  savedViews: SavedView[]
}

type NoteTab = 'all' | 'pinned'

const SELECT_CLS =
  'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function NotesView({ notes, type, projects, tagsByNoteId, savedViews }: NotesViewProps) {
  const [search,        setSearch]        = useState('')
  const [tab,           setTab]           = useState<NoteTab>('all')
  const [addOpen,       setAddOpen]       = useState(false)
  const [tagFilter,     setTagFilter]     = useState<string | null>(null)
  const [projectFilter, setProjectFilter] = useState<string | null>(null)

  const entityType: SavedViewEntityType = type === 'note' ? 'notes' : 'journal'

  const allTags = useMemo(() => {
    const seen = new Set<string>()
    const result: Tag[] = []
    for (const tags of Object.values(tagsByNoteId)) {
      for (const tag of tags) {
        if (!seen.has(tag.id)) { seen.add(tag.id); result.push(tag) }
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name))
  }, [tagsByNoteId])

  const filtered = useMemo(() => {
    let result = notes
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)
      )
    }
    if (type === 'note' && tab === 'pinned') {
      result = result.filter((n) => n.is_pinned)
    }
    if (tagFilter) {
      result = result.filter((n) => (tagsByNoteId[n.id] ?? []).some((tg) => tg.name === tagFilter))
    }
    if (projectFilter) {
      result = result.filter((n) => n.project_id === projectFilter)
    }
    return result
  }, [notes, search, tab, type, tagFilter, projectFilter, tagsByNoteId])

  const currentFilters: NoteViewFilters = {
    pinned:    tab === 'pinned',
    tagName:   tagFilter,
    search,
    projectId: projectFilter,
  }

  function applyFilters(f: Record<string, unknown>) {
    setSearch((f.search    as string)         ?? '')
    setTagFilter((f.tagName   as string | null) ?? null)
    setProjectFilter((f.projectId as string | null) ?? null)
    if (f.pinned === true)  setTab('pinned')
    if (f.pinned === false || f.pinned === undefined) setTab('all')
  }

  const EmptyIcon = type === 'journal' ? BookOpen : FileText
  const emptyLabel = type === 'journal' ? 'No journal entries yet.' : 'No notes yet.'
  const addLabel   = type === 'journal' ? 'New entry' : 'New note'

  return (
    <div className="space-y-4">
      {/* Saved views panel */}
      <SavedViewsPanel
        views={savedViews}
        entityType={entityType}
        currentFilters={currentFilters as Record<string, unknown>}
        onApply={applyFilters}
      />

      {/* Toolbar: search + project filter + add button */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={type === 'journal' ? 'Search entries…' : 'Search notes…'}
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {/* Project filter — notes only, when projects exist */}
        {type === 'note' && projects.length > 0 && (
          <select
            value={projectFilter ?? ''}
            onChange={(e) => setProjectFilter(e.target.value || null)}
            className={SELECT_CLS}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {addLabel}
        </button>
      </div>

      {/* Pinned tabs — notes only */}
      {type === 'note' && (
        <div className="flex gap-1 border-b">
          {(['all', 'pinned'] as NoteTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize',
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'all' ? 'All' : 'Pinned'}
            </button>
          ))}
        </div>
      )}

      {/* Tag filter bar */}
      <TagFilterBar tags={allTags} selected={tagFilter} onSelect={setTagFilter} />

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
          <EmptyIcon className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium">
            {search.trim() || tagFilter || projectFilter
              ? 'No matches found.'
              : tab === 'pinned'
              ? 'No pinned notes.'
              : emptyLabel}
          </p>
          {!search.trim() && !tagFilter && !projectFilter && tab === 'all' && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="text-sm mt-2 text-primary hover:underline"
            >
              {type === 'journal' ? 'Write your first entry →' : 'Create your first note →'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              projects={projects}
              noteTags={tagsByNoteId[note.id] ?? []}
            />
          ))}
        </div>
      )}

      <NoteDialog
        type={type}
        projects={projects}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </div>
  )
}
