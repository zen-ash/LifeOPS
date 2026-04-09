'use client'

import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { TagInput } from '@/components/ui/tag-input'
import { createClient } from '@/lib/supabase/client'
import { addDocument } from '@/lib/actions/documents'
import { setDocumentTags } from '@/lib/actions/tags'

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

interface Project {
  id: string
  name: string
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, '')
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function DocumentUploadDialog({ projects }: { projects: Project[] }) {
  const [open, setOpen]           = useState(false)
  const [file, setFile]           = useState<File | null>(null)
  const [title, setTitle]         = useState('')
  const [projectId, setProjectId] = useState('')
  const [tagNames, setTagNames]   = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const fileInputRef              = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    if (!selected) return

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError('Only PDF, JPEG, PNG, and WebP files are supported.')
      setFile(null)
      return
    }
    if (selected.size > MAX_BYTES) {
      setError('File must be 5 MB or smaller.')
      setFile(null)
      return
    }

    setFile(selected)
    setTitle(stripExtension(selected.name))
    setError(null)
  }

  async function handleUpload() {
    if (!file) { setError('Please select a file.'); return }
    if (!title.trim()) { setError('Please enter a title.'); return }

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Not authenticated.')
      setUploading(false)
      return
    }

    const timestamp = Date.now()
    const safeName  = sanitizeFilename(file.name)
    const filePath  = `${user.id}/${timestamp}-${safeName}`

    // Upload to Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('vault')
      .upload(filePath, file, { contentType: file.type })

    if (storageError) {
      setError(storageError.message)
      setUploading(false)
      return
    }

    // Save metadata to database
    const result = await addDocument({
      name: title.trim(),
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      project_id: projectId || null,
    })

    if (result?.error) {
      // Clean up orphaned storage file
      await supabase.storage.from('vault').remove([filePath])
      setError(result.error)
      setUploading(false)
      return
    }

    // Assign tags if any
    if (result.documentId && tagNames.length > 0) {
      await setDocumentTags(result.documentId, tagNames)
    }

    // Reset and close
    setFile(null)
    setTitle('')
    setProjectId('')
    setTagNames([])
    setError(null)
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setOpen(false)
  }

  function handleOpenChange(next: boolean) {
    if (!uploading) {
      setOpen(next)
      if (!next) {
        setFile(null)
        setTitle('')
        setProjectId('')
        setTagNames([])
        setError(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="h-4 w-4 mr-1" />
          Upload file
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>
            PDF or image · max 5 MB. Files are stored privately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
              {error}
            </div>
          )}

          {/* File picker */}
          <div className="space-y-2">
            <Label htmlFor="doc-file">File *</Label>
            <input
              ref={fileInputRef}
              id="doc-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {file && (
              <p className="text-[11px] text-muted-foreground">
                {file.name} — {(file.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="doc-title">Title *</Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title…"
            />
          </div>

          {/* Project link */}
          {projects.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="doc-project">Link to project (optional)</Label>
              <select
                id="doc-project"
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

          {/* Tags */}
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

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !file || !title.trim()}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
