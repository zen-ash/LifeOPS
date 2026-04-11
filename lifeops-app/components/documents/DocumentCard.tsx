'use client'

import { useState } from 'react'
import {
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Trash2,
  Loader2,
  Pencil,
} from 'lucide-react'
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

function getFileConfig(type: string | null): {
  icon: React.ReactNode
  zoneBg: string
  badge: string
  badgeText: string
} {
  if (type === 'application/pdf') {
    return {
      icon: <FileText className="h-8 w-8 text-red-500/70" />,
      zoneBg: 'bg-red-500/[0.07]',
      badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
      badgeText: 'PDF',
    }
  }
  if (type?.startsWith('image/')) {
    const ext = type.split('/')[1]?.toUpperCase() ?? 'IMG'
    return {
      icon: <ImageIcon className="h-8 w-8 text-blue-500/70" />,
      zoneBg: 'bg-blue-500/[0.07]',
      badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
      badgeText: ext,
    }
  }
  return {
    icon: <File className="h-8 w-8 text-muted-foreground/40" />,
    zoneBg: 'bg-muted/20',
    badge: 'bg-muted text-muted-foreground border border-border/50',
    badgeText: 'FILE',
  }
}

export function DocumentCard({ doc, projects, docTags }: DocumentCardProps) {
  const [downloading,    setDownloading]    = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [editOpen,       setEditOpen]       = useState(false)
  const [editName,       setEditName]       = useState('')
  const [editProjectId,  setEditProjectId]  = useState('')
  const [editTagNames,   setEditTagNames]   = useState<string[]>([])
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState<string | null>(null)

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

  const { icon, zoneBg, badge, badgeText } = getFileConfig(doc.file_type)

  return (
    <>
      <div className="flex flex-col rounded-xl border bg-card overflow-hidden hover:border-border/80 hover:shadow-sm transition-all duration-150">
        {/* File type header zone */}
        <div className={cn('h-20 relative flex items-end px-3 pb-2.5', zoneBg)}>
          {icon}
          <span
            className={cn(
              'absolute top-2.5 right-2.5 text-[10px] font-semibold px-1.5 py-0.5 rounded',
              badge
            )}
          >
            {badgeText}
          </span>
        </div>

        {/* Card body */}
        <div className="px-3 pt-2.5 pb-2 flex-1">
          <p className="text-sm font-semibold leading-snug truncate" title={doc.name}>
            {doc.name}
          </p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5 tabular-nums">
            {formatSize(doc.file_size)}
          </p>

          {/* Project + tags */}
          {(doc.project_name || docTags.length > 0) && (
            <div className="flex flex-wrap items-center gap-1 mt-2">
              {doc.project_name && (
                <span className="text-[11px] bg-muted text-muted-foreground border border-border/50 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                  {doc.project_name}
                </span>
              )}
              {docTags.map((tag) => (
                <TagBadge key={tag.id} tag={tag} />
              ))}
            </div>
          )}

          {error && (
            <p className="text-[11px] text-destructive mt-1.5">{error}</p>
          )}
        </div>

        {/* Bottom action row */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-t border-border/30">
          <span className="text-[11px] text-muted-foreground/40 flex-1 tabular-nums pl-0.5">
            {formatRelativeDate(doc.created_at)}
          </span>

          {/* Download */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground/50 hover:text-primary hover:bg-accent"
            onClick={handleDownload}
            disabled={downloading}
            title="View / Download"
          >
            {downloading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Download className="h-3 w-3" />}
          </Button>

          {/* Edit */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground/50 hover:text-foreground hover:bg-accent"
            onClick={openEdit}
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </Button>

          {/* Delete */}
          {confirmDelete ? (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-[11px] text-destructive font-medium hover:underline disabled:opacity-50 px-1"
              >
                {deleting ? '…' : 'Del'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-[11px] text-muted-foreground hover:underline px-1"
              >
                No
              </button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmDelete(true)}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Edit dialog */}
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
                    <option key={p.id} value={p.id}>{p.name}</option>
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
