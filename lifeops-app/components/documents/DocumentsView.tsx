'use client'

import { useState, useMemo } from 'react'
import { Search, Vault } from 'lucide-react'
import { DocumentCard } from './DocumentCard'
import { DocumentUploadDialog } from './DocumentUploadDialog'
import { TagFilterBar } from '@/components/ui/tag-input'
import { SavedViewsPanel } from '@/components/saved-views/SavedViewsPanel'
import type { Tag, SavedView, DocViewFilters } from '@/types'

interface DocRow {
  id: string
  name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  project_id: string | null
  project_name: string | null
  created_at: string
}

interface Project { id: string; name: string }

type FileTypeFilter = 'all' | 'pdf' | 'image'

interface DocumentsViewProps {
  documents: DocRow[]
  projects: Project[]
  tagsByDocId: Record<string, Tag[]>
  savedViews: SavedView[]
}

const SELECT_CLS =
  'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function DocumentsView({ documents, projects, tagsByDocId, savedViews }: DocumentsViewProps) {
  const [search,          setSearch]          = useState('')
  const [tagFilter,       setTagFilter]       = useState<string | null>(null)
  const [fileTypeFilter,  setFileTypeFilter]  = useState<FileTypeFilter>('all')
  const [projectFilter,   setProjectFilter]   = useState<string | null>(null)

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
    setSearch((f.search       as string)         ?? '')
    setTagFilter((f.tagName      as string | null) ?? null)
    setFileTypeFilter((f.fileType     as FileTypeFilter) ?? 'all')
    setProjectFilter((f.projectId    as string | null) ?? null)
  }

  const hasActiveFilters = search.trim() || tagFilter || fileTypeFilter !== 'all' || projectFilter

  return (
    <div className="space-y-4">
      {/* Saved views panel */}
      <SavedViewsPanel
        views={savedViews}
        entityType="documents"
        currentFilters={currentFilters as Record<string, unknown>}
        onApply={applyFilters}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {/* File type filter */}
        <select
          value={fileTypeFilter}
          onChange={(e) => setFileTypeFilter(e.target.value as FileTypeFilter)}
          className={SELECT_CLS}
        >
          <option value="all">All types</option>
          <option value="pdf">PDFs only</option>
          <option value="image">Images only</option>
        </select>

        {/* Project filter */}
        {projects.length > 0 && (
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

        <DocumentUploadDialog projects={projects} />
      </div>

      {/* Tag filter bar */}
      <TagFilterBar tags={allTags} selected={tagFilter} onSelect={setTagFilter} />

      {/* Document list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
          <Vault className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium">
            {hasActiveFilters ? 'No documents match your filters.' : 'No documents uploaded yet.'}
          </p>
          {!hasActiveFilters && (
            <p className="text-sm mt-1">Upload PDFs and images to keep them organised.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              projects={projects}
              docTags={tagsByDocId[doc.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}
