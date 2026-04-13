'use client'

import { useState, useMemo } from 'react'
import { Search, Vault } from 'lucide-react'
import { DocumentCard } from './DocumentCard'
import { TagFilterBar } from '@/components/ui/tag-input'
import { SavedViewsPanel } from '@/components/saved-views/SavedViewsPanel'
import { cn } from '@/lib/utils'
import type { Tag, SavedView, DocViewFilters } from '@/types'

interface DocRow {
  id: string
  name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  project_id: string | null
  project_name: string | null
  // Phase 15.B
  parse_status: 'none' | 'pending' | 'done' | 'no_text' | 'failed'
  created_at: string
}

interface Project { id: string; name: string }

// Phase 13.B — project_id added in Phase 16.B so DocumentCard can scope the task picker
interface TaskOption { id: string; title: string; project_id: string | null }

type FileTypeFilter = 'all' | 'pdf' | 'image'

interface DocumentsViewProps {
  documents: DocRow[]
  projects: Project[]
  tagsByDocId: Record<string, Tag[]>
  savedViews: SavedView[]
  // Phase 13.B: task linking
  tasks: TaskOption[]
  linkedTaskIdsByDocId: Record<string, string[]>
}

const FILE_TYPE_TABS: { key: FileTypeFilter; label: string }[] = [
  { key: 'all',   label: 'All' },
  { key: 'pdf',   label: 'PDFs' },
  { key: 'image', label: 'Images' },
]

function countForType(documents: DocRow[], key: FileTypeFilter): number {
  if (key === 'all') return documents.length
  if (key === 'pdf') return documents.filter(d => d.file_type === 'application/pdf').length
  return documents.filter(d => d.file_type?.startsWith('image/')).length
}

export function DocumentsView({ documents, projects, tagsByDocId, savedViews, tasks, linkedTaskIdsByDocId }: DocumentsViewProps) {
  const [search,         setSearch]         = useState('')
  const [tagFilter,      setTagFilter]      = useState<string | null>(null)
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>('all')
  const [projectFilter,  setProjectFilter]  = useState<string | null>(null)

  const allTags = useMemo(() => {
    const seen = new Set<string>()
    const result: Tag[] = []
    for (const tags of Object.values(tagsByDocId)) {
      for (const tag of tags) {
        if (!seen.has(tag.id)) { seen.add(tag.id); result.push(tag) }
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name))
  }, [tagsByDocId])

  const filtered = useMemo(() => {
    let result = documents
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (d) => d.name.toLowerCase().includes(q) || d.project_name?.toLowerCase().includes(q)
      )
    }
    if (fileTypeFilter !== 'all') {
      result = result.filter((d) =>
        fileTypeFilter === 'pdf'
          ? d.file_type === 'application/pdf'
          : d.file_type?.startsWith('image/')
      )
    }
    if (projectFilter) {
      result = result.filter((d) => d.project_id === projectFilter)
    }
    if (tagFilter) {
      result = result.filter((d) => (tagsByDocId[d.id] ?? []).some((tg) => tg.name === tagFilter))
    }
    return result
  }, [documents, search, fileTypeFilter, projectFilter, tagFilter, tagsByDocId])

  const currentFilters: DocViewFilters = {
    fileType:  fileTypeFilter,
    tagName:   tagFilter,
    search,
    projectId: projectFilter,
  }

  function applyFilters(f: Record<string, unknown>) {
    setSearch((f.search      as string)         ?? '')
    setTagFilter((f.tagName     as string | null) ?? null)
    setFileTypeFilter((f.fileType    as FileTypeFilter) ?? 'all')
    setProjectFilter((f.projectId   as string | null) ?? null)
  }

  const hasActiveFilters = !!(search.trim() || tagFilter || fileTypeFilter !== 'all' || projectFilter)

  return (
    <div className="space-y-4">
      {/* Saved views panel */}
      <SavedViewsPanel
        views={savedViews}
        entityType="documents"
        currentFilters={currentFilters as Record<string, unknown>}
        onApply={applyFilters}
      />

      {/* Filter toolbar card */}
      <div className="rounded-xl border bg-card px-4 py-3 space-y-3">
        {/* Search + project filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents…"
              className="flex h-8 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {projects.length > 0 && (
            <select
              value={projectFilter ?? ''}
              onChange={(e) => setProjectFilter(e.target.value || null)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-muted-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* File type pill tabs */}
        <div className="flex items-center gap-1 pt-2.5 border-t border-border/40">
          {FILE_TYPE_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFileTypeFilter(key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                fileTypeFilter === key
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {label}
              <span className="ml-1.5 tabular-nums opacity-60">
                {countForType(documents, key)}
              </span>
            </button>
          ))}
        </div>

        {/* Tag filter bar */}
        {allTags.length > 0 && (
          <div className="pt-2.5 border-t border-border/40">
            <TagFilterBar tags={allTags} selected={tagFilter} onSelect={setTagFilter} />
          </div>
        )}
      </div>

      {/* Document grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Vault className="h-10 w-10 mb-3 opacity-20" />
          <p className="text-sm font-medium">
            {hasActiveFilters ? 'No documents match your filters.' : 'No documents uploaded yet.'}
          </p>
          {!hasActiveFilters && (
            <p className="text-xs text-muted-foreground/60 mt-1">
              Upload PDFs and images to keep them organised.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              projects={projects}
              docTags={tagsByDocId[doc.id] ?? []}
              tasks={tasks}
              linkedTaskIds={linkedTaskIdsByDocId[doc.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}
