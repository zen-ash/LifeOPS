import { createClient } from '@/lib/supabase/server'
import { DocumentsView } from '@/components/documents/DocumentsView'
import type { Tag, SavedView } from '@/types'

type DocRow = {
  id: string
  name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  project_id: string | null
  created_at: string
  projects: { name: string } | null
}

type DocTagRow = {
  document_id: string
  tags: { id: string; name: string; color: string; user_id: string; created_at: string } | null
}

export default async function DocumentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: rawDocs }, { data: projects }, { data: rawDocTags }, { data: rawSavedViews }] =
    await Promise.all([
    supabase
      .from('documents')
      .select('id, name, file_path, file_type, file_size, project_id, created_at, projects(name)')
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
  ])

  // Build document_id → Tag[] lookup
  const tagsByDocId: Record<string, Tag[]> = {}
  for (const row of (rawDocTags as DocTagRow[] | null) ?? []) {
    if (!row.tags) continue
    if (!tagsByDocId[row.document_id]) tagsByDocId[row.document_id] = []
    tagsByDocId[row.document_id].push(row.tags as Tag)
  }

  const documents = (rawDocs as DocRow[] | null ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    file_path: d.file_path,
    file_type: d.file_type,
    file_size: d.file_size,
    project_id: d.project_id,
    project_name: d.projects?.name ?? null,
    created_at: d.created_at,
  }))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground mt-1">
          Securely store PDFs and images for your projects.
        </p>
      </div>

      <DocumentsView
        documents={documents}
        projects={projects ?? []}
        tagsByDocId={tagsByDocId}
        savedViews={(rawSavedViews as SavedView[] | null) ?? []}
      />
    </div>
  )
}
