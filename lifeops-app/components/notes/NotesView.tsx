'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, FileText, BookOpen, Pin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NoteCard } from './NoteCard'
import { NoteEditor } from './NoteEditor'
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

interface TaskOption { id: string; title: string }

interface NotesViewProps {
  notes: NoteRow[]
  type: 'note' | 'journal'
  projects: Project[]
  tagsByNoteId: Record<string, Tag[]>
  savedViews: SavedView[]
  // Phase 13.B: task linking
  tasks: TaskOption[]
  linkedTaskIdsByNoteId: Record<string, string[]>
}

type NoteTab = 'all' | 'pinned'

export function NotesView({ notes, type, projects, tagsByNoteId, savedViews, tasks, linkedTaskIdsByNoteId }: NotesViewProps) {
  const [search,          setSearch]          = useState('')
  const [tab,             setTab]             = useState<NoteTab>('all')
  const [addOpen,         setAddOpen]         = useState(false)
  const [tagFilter,       setTagFilter]       = useState<string | null>(null)
  const [projectFilter,   setProjectFilter]   = useState<string | null>(null)
  const [selectedNoteId,  setSelectedNoteId]  = useState<string | null>(null)

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

  // Selected note — look up in full notes list so it stays visible even when filtered out
  const selectedNote = notes.find(n => n.id === selectedNoteId) ?? null

  // Pinned / regular split for "all" tab in notes mode
  const pinnedNotes  = type === 'note' && tab === 'all' ? filtered.filter(n => n.is_pinned)  : []
  const regularNotes = type === 'note' && tab === 'all' ? filtered.filter(n => !n.is_pinned) : filtered

  const addLabel  = type === 'journal' ? 'New entry' : 'New note'
  const EmptyIcon = type === 'journal' ? BookOpen : FileText

  const hasFiltersActive = !!(search.trim() || tagFilter || projectFilter)

  const emptyMessage =
    hasFiltersActive      ? 'No matches found.'
    : tab === 'pinned'    ? 'No pinned notes.'
    : type === 'journal'  ? 'No journal entries yet.'
    :                       'No notes yet.'

  return (
    <div className="space-y-4">
      {/* Saved views panel — above split pane */}
      <SavedViewsPanel
        views={savedViews}
        entityType={entityType}
        currentFilters={currentFilters as Record<string, unknown>}
        onApply={applyFilters}
      />

      {/* Split-pane workspace */}
      <div className="rounded-xl border bg-card overflow-hidden flex min-h-[560px]">

        {/* ── LEFT PANE: note list ── */}
        <div
          className={cn(
            'flex flex-col border-r border-border/40 flex-shrink-0',
            'w-full lg:w-80 xl:w-96',
            // Mobile: hide list when a note is selected
            selectedNoteId ? 'hidden lg:flex' : 'flex'
          )}
        >
          {/* Filter header */}
          <div className="shrink-0 px-3 py-2.5 border-b border-border/40 space-y-2">
            {/* Search + New button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={type === 'journal' ? 'Search entries…' : 'Search notes…'}
                  className="flex h-8 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                {addLabel}
              </button>
            </div>

            {/* Notes-only: project filter + tab pills */}
            {type === 'note' && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all', 'pinned'] as NoteTab[]).map((t) => {
                  const count = t === 'all'
                    ? notes.length
                    : notes.filter(n => n.is_pinned).length
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150',
                        tab === t
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      {t === 'all' ? 'All' : 'Pinned'}
                      <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
                    </button>
                  )
                })}

                {projects.length > 0 && (
                  <select
                    value={projectFilter ?? ''}
                    onChange={(e) => setProjectFilter(e.target.value || null)}
                    className="ml-auto h-7 rounded-lg border border-input bg-background px-2 text-xs text-muted-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">All projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Tag filter */}
            {allTags.length > 0 && (
              <div className={cn(type !== 'note' && 'pt-0')}>
                <TagFilterBar tags={allTags} selected={tagFilter} onSelect={setTagFilter} />
              </div>
            )}
          </div>

          {/* Note list — scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-4">
                <EmptyIcon className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm font-medium text-center">{emptyMessage}</p>
                {!hasFiltersActive && tab === 'all' && (
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="text-xs mt-2 text-primary hover:underline"
                  >
                    {type === 'journal' ? 'Write your first entry →' : 'Create your first note →'}
                  </button>
                )}
              </div>
            ) : type === 'note' && tab === 'all' && pinnedNotes.length > 0 ? (
              /* Pinned + regular sections */
              <div className="p-2 space-y-1">
                {/* Pinned section */}
                <div className="px-2 pt-1.5 pb-0.5 flex items-center gap-1.5">
                  <Pin className="h-2.5 w-2.5 text-muted-foreground/40" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
                    Pinned
                  </span>
                </div>
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    noteTags={tagsByNoteId[note.id] ?? []}
                    isSelected={selectedNoteId === note.id}
                    onSelect={() => setSelectedNoteId(note.id)}
                  />
                ))}

                {/* Regular notes section */}
                {regularNotes.length > 0 && (
                  <>
                    <div className="px-2 pt-3 pb-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
                        Notes
                      </span>
                    </div>
                    {regularNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        noteTags={tagsByNoteId[note.id] ?? []}
                        isSelected={selectedNoteId === note.id}
                        onSelect={() => setSelectedNoteId(note.id)}
                      />
                    ))}
                  </>
                )}
              </div>
            ) : (
              /* Flat list (pinned tab, journal, or no pinned notes) */
              <div className="p-2 space-y-1">
                {filtered.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    noteTags={tagsByNoteId[note.id] ?? []}
                    isSelected={selectedNoteId === note.id}
                    onSelect={() => setSelectedNoteId(note.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANE: editor / empty state ── */}
        <div
          className={cn(
            'flex-1 flex flex-col min-w-0',
            // Mobile: only show when a note is selected
            selectedNoteId ? 'flex' : 'hidden lg:flex'
          )}
        >
          {selectedNote ? (
            <NoteEditor
              key={selectedNote.id}
              type={type}
              note={{
                id: selectedNote.id,
                title: selectedNote.title,
                content: selectedNote.content,
                project_id: selectedNote.project_id,
                is_pinned: selectedNote.is_pinned,
              }}
              noteTags={tagsByNoteId[selectedNote.id] ?? []}
              projects={projects}
              onDeleted={() => setSelectedNoteId(null)}
              onBack={() => setSelectedNoteId(null)}
              tasks={tasks}
              linkedTaskIds={linkedTaskIdsByNoteId[selectedNote.id] ?? []}
            />
          ) : (
            /* Empty right pane */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6">
              <EmptyIcon className="h-12 w-12 opacity-10" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  {notes.length === 0
                    ? `No ${type === 'journal' ? 'entries' : 'notes'} yet`
                    : `Select a ${type === 'journal' ? 'entry' : 'note'} to edit`}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {notes.length === 0
                    ? `Create your first ${type === 'journal' ? 'journal entry' : 'note'} to get started`
                    : 'Choose from the list on the left'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="text-xs text-primary hover:underline mt-1"
              >
                + {addLabel}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dialog for creating new notes */}
      <NoteDialog
        type={type}
        projects={projects}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </div>
  )
}
