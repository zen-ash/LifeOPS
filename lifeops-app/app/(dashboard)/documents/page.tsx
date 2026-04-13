import { createClient } from '@/lib/supabase/server'
import { DocumentsView } from '@/components/documents/DocumentsView'
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog'
import { Vault } from 'lucide-react'
import type { Tag, SavedView } from '@/types'

type DocRow = {
  id: string
  name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  project_id: string | null
  parse_status: string
  created_at: string
  projects: { name: string } | null
}

type DocTagRow = {
  document_id: string
  tags: { id: string; name: string; color: string; user_id: string; created_at: string } | null
}

type DocLinkRow = {
  document_id: string
  task_id: string
}

export default async function DocumentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [
    { data: rawDocs },
    { data: projects },
    { data: rawDocTags },
    { data: rawSavedViews },
    { data: rawTasks },
    { data: rawDocLinks },
  ] = await Promise.all([
    supabase
      .from('documents')
      .select('id, name, file_path, file_type, file_size, project_id, parse_status, created_at, projects(name)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', user!.id)
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('document_tags')
      .select('document_id, tags(id, name, color, user_id, created_at)')
      .eq('user_id', user!.id),
    supabase
      .from('saved_views')
      .select('*')
      .eq('user_id', user!.id)
      .eq('entity_type', 'documents')
      .order('created_at', { ascending: true }),
    // Phase 13.B: active tasks for link selector
    supabase
      .from('tasks')
      .select('id, title')
      .eq('user_id', user!.id)
      .in('status', ['todo', 'in_progress'])
      .order('title'),
    // Phase 13.B: existing document→task links for this user
    supabase
      .from('document_task_links')
      .select('document_id, task_id')
      .eq('user_id', user!.id),
  ])

  // Build document_id → Tag[] lookup
  const tagsByDocId: Record<string, Tag[]> = {}
  for (const row of (rawDocTags as DocTagRow[] | null) ?? []) {
    if (!row.tags) continue
    if (!tagsByDocId[row.document_id]) tagsByDocId[row.document_id] = []
    tagsByDocId[row.document_id].push(row.tags as Tag)
  }

  // Phase 13.B: build document_id → task_id[] lookup
  const linkedTaskIdsByDocId: Record<string, string[]> = {}
  for (const row of (rawDocLinks as DocLinkRow[] | null) ?? []) {
    if (!linkedTaskIdsByDocId[row.document_id]) linkedTaskIdsByDocId[row.document_id] = []
    linkedTaskIdsByDocId[row.document_id].push(row.task_id)
  }

  const documents = (rawDocs as DocRow[] | null ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    file_path: d.file_path,
    file_type: d.file_type,
    file_size: d.file_size,
    project_id: d.project_id,
    parse_status: (d.parse_status ?? 'none') as 'none' | 'pending' | 'done' | 'no_text' | 'failed',
    project_name: d.projects?.name ?? null,
    created_at: d.created_at,
  }))

  const tasks = (rawTasks ?? []) as { id: string; title: string }[]

  const docCount = documents.length

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Page header */}
      <div className="rounded-xl border bg-card px-6 py-4 flex items-center justify-between gap-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Vault className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-tight">Vault</h1>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              {docCount === 0
                ? 'Securely store PDFs and images for your projects'
                : `${docCount} document${docCount === 1 ? '' : 's'} stored securely`}
            </p>
          </div>
        </div>
        <DocumentUploadDialog projects={projects ?? []} />
      </div>

      <DocumentsView
        documents={documents}
        projects={projects ?? []}
        tagsByDocId={tagsByDocId}
        savedViews={(rawSavedViews as SavedView[] | null) ?? []}
        tasks={tasks}
        linkedTaskIdsByDocId={linkedTaskIdsByDocId}
      />
    </div>
  )
}
