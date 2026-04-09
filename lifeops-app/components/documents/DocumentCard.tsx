'use client'

import { useState } from 'react'
import { FileText, Image as ImageIcon, File, Download, Trash2, Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { deleteDocument, editDocument } from '@/lib/actions/documents'
import { setDocumentTags } from '@/lib/actions/tags'
import { TagBadge, TagInput } from '@/components/ui/tag-input'
import type { Tag } from '@/types'

const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

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

interface Project {
  id: string
  name: string
}

interface DocumentCardProps {
  doc: DocRow
  projects: Project[]
  docTags: Tag[]
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function FileIcon({ type }: { type: string | null }) {
  if (type === 'application/pdf') {
    return <FileText className="h-5 w-5 text-red-500 shrink-0" />
  }
  if (type?.startsWith('image/')) {
    return <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" />
  }
  return <File className="h-5 w-5 text-muted-foreground shrink-0" />
}

function TypeBadge({ type }: { type: string | null }) {
  if (type === 'application/pdf') {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 uppercase">
        PDF
      </span>
    )
  }
  if (type?.startsWith('image/')) {
    const ext = type.split('/')[1]?.toUpperCase() ?? 'IMG'
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 uppercase">
        {ext}
      </span>
    )
  }
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground uppercase">
      FILE
    </span>
  )
}

export function DocumentCard({ doc, projects, docTags }: DocumentCardProps) {
  const [downloading, setDownloading]     = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editOpen, setEditOpen]           = useState(false)
  const [editName, setEditName]           = useState('')
  const [editProjectId, setEditProjectId] = useState('')
  const [editTagNames, setEditTagNames]   = useState<string[]>([])
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  function openEdit() {
    setEditName(doc.name)
    setEditProjectId(doc.project_id ?? '')
    setEditTagNames(docTags.map((t) => t.name))
    setError(null)
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    if (!editName.trim()) return
    setSaving(true)
    setError(null)

    const result = await editDocument(doc.id, {
      name: editName.trim(),
      project_id: editProjectId || null,
    })

    if (result?.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    // Always sync tags (clears when empty)
    await setDocumentTags(doc.id, editTagNames)

    setSaving(false)
    setEditOpen(false)
  }

  async function handleDownload() {
    setDownloading(true)
    setError(null)
    const supabase = createClient()
    const { data, error: urlError } = await supabase.storage
      .from('vault')
      .createSignedUrl(doc.file_path, 3600)

    if (urlError || !data?.signedUrl) {
      setError('Could not generate download link.')
      setDownloading(false)
      return
    }

    window.open(data.signedUrl, '_blank')
    setDownloading(false)
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const result = await deleteDocument(doc.id)
    if (result?.error) {
      setError(result.error)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card hover:bg-accent/30 transition-colors">
        <FileIcon type={doc.file_type} />

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{doc.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <TypeBadge type={doc.file_type} />
            <span className="text-[11px] text-muted-foreground">{formatSize(doc.file_size)}</span>
            {doc.project_name && (
              <span className="text-[11px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                {doc.project_name}
              </span>
            )}
            {docTags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
            <span className="text-[11px] text-muted-foreground">{formatDate(doc.created_at)}</span>
          </div>
          {error && (
            <p className="text-[11px] text-destructive mt-0.5">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            title="View / Download"
            className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          >
            {downloading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={openEdit}
            title="Edit"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-4 w-4" />
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
              className={cn(
                'text-muted-foreground hover:text-destructive transition-colors',
                deleting && 'opacity-50 pointer-events-none'
              )}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Inline edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit document</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-doc-name">Title *</Label>
              <Input
                id="edit-doc-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Document title…"
              />
            </div>

            {projects.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="edit-doc-project">Link to project (optional)</Label>
                <select
                  id="edit-doc-project"
                  value={editProjectId}
                  onChange={(e) => setEditProjectId(e.target.value)}
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

            <div className="space-y-2">
              <Label>Tags (optional)</Label>
              <TagInput
                value={editTagNames}
                onChange={setEditTagNames}
                placeholder="Type a tag and press Enter…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={saving || !editName.trim()}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
