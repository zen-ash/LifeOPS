'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
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

// Phase 15.A: added text/plain + text/markdown for .txt/.md files
const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'text/markdown',
  'text/x-markdown',  // some browsers report .md as this
]
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

// Phase 15.A: text files go to vault_media bucket; all others use vault
function bucketForType(mimeType: string): string {
  return mimeType.startsWith('text/') ? 'vault_media' : 'vault'
}

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
  const router = useRouter()

  const [open, setOpen]           = useState(false)
  const [file, setFile]           = useState<File | null>(null)
  const [title, setTitle]         = useState('')
  const [projectId, setProjectId] = useState('')
  const [tagNames, setTagNames]   = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState<'uploading' | 'processing'>('uploading')
  const [error, setError]         = useState<string | null>(null)
  // Phase 15.B: shown after upload when a PDF has no extractable text
  const [parseWarning, setParseWarning] = useState<string | null>(null)
  const fileInputRef              = useRef<HTMLInputElement>(null)

  const isPdf = file?.type === 'application/pdf'

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    if (!selected) return

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError('Supported formats: PDF, JPEG, PNG, WebP, TXT, MD.')
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
    setParseWarning(null)
  }

  async function handleUpload() {
    if (!file) { setError('Please select a file.'); return }
    if (!title.trim()) { setError('Please enter a title.'); return }

    setUploading(true)
    setUploadStep('uploading')
    setError(null)
    setParseWarning(null)

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

    // Phase 15.A: text files go to vault_media; PDF/images go to vault
    const bucket = bucketForType(file.type)

    // Upload to Supabase Storage
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { contentType: file.type })

    if (storageError) {
      setError(storageError.message)
      setUploading(false)
      return
    }

    // Save metadata to database
    // Phase 15.B: PDFs are inserted with parse_status 'pending'
    const result = await addDocument({
      name: title.trim(),
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      project_id: projectId || null,
      parse_status: isPdf ? 'pending' : 'none',
    })

    if (result?.error) {
      // Clean up orphaned storage file
      await supabase.storage.from(bucket).remove([filePath])
      setError(result.error)
      setUploading(false)
      return
    }

    // Assign tags if any
    if (result.documentId && tagNames.length > 0) {
      await setDocumentTags(result.documentId, tagNames)
    }

    // Phase 15.B: for PDFs, call the extraction endpoint before closing
    if (isPdf && result.documentId) {
      setUploadStep('processing')
      try {
        const res  = await fetch('/api/process-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: result.documentId, filePath }),
        })
        const data = await res.json()

        if (data.status === 'no_text') {
          // File saved but no readable text — keep dialog open with a warning
          setParseWarning(
            'File saved! However, no readable text was found — this PDF may be a scanned document. ' +
            'It is stored in your Vault but won\'t appear in Ask Vault search.'
          )
          setUploading(false)
          resetForm()
          router.refresh()
          return
        }
        if (data.status === 'failed' || !res.ok) {
          // File saved but extraction failed — warn, don't block
          setError(
            'File saved, but text extraction failed. The PDF may be encrypted or malformed. ' +
            'It is stored in your Vault but won\'t be searchable.'
          )
          setUploading(false)
          resetForm()
          router.refresh()
          return
        }
        // status === 'done' — fall through to normal close
      } catch {
        // Network error — file is already saved, just warn
        setError('File saved, but we could not process it for search. Try again later.')
        setUploading(false)
        resetForm()
        router.refresh()
        return
      }
    }

    // Happy path — reset, refresh, close
    resetForm()
    router.refresh()
    setUploading(false)
    setOpen(false)
  }

  function resetForm() {
    setFile(null)
    setTitle('')
    setProjectId('')
    setTagNames([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleOpenChange(next: boolean) {
    if (!uploading) {
      setOpen(next)
      if (!next) {
        resetForm()
        setError(null)
        setParseWarning(null)
      }
    }
  }

  const uploadLabel = uploading
    ? uploadStep === 'processing' ? 'Processing…' : 'Uploading…'
    : 'Upload'

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
            PDF, image, TXT, or MD · max 5 MB. Files are stored privately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
              {error}
            </div>
          )}

          {/* Phase 15.B: soft warning for no-text PDFs */}
          {parseWarning && (
            <div className="p-3 text-sm text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-md border border-amber-500/20">
              {parseWarning}
            </div>
          )}

          {/* Processing indicator for PDFs */}
          {uploading && uploadStep === 'processing' && (
            <p className="text-xs text-muted-foreground text-center py-1">
              Extracting text and preparing AI search…
            </p>
          )}

          {/* File picker */}
          <div className="space-y-2">
            <Label htmlFor="doc-file">File *</Label>
            <input
              ref={fileInputRef}
              id="doc-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.md"
              onChange={handleFileChange}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {file && (
              <p className="text-[11px] text-muted-foreground">
                {file.name} — {(file.size / 1024).toFixed(0)} KB
                {isPdf && (
                  <span className="ml-1.5 text-primary/70">· text will be extracted for AI search</span>
                )}
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
          {/* Show Close instead of Cancel when a parse warning/error is being shown */}
          {(parseWarning || (error && !uploading)) ? (
            <Button
              type="button"
              onClick={() => { setOpen(false); resetForm(); setError(null); setParseWarning(null) }}
            >
              Close
            </Button>
          ) : (
            <>
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
                {uploadLabel}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
