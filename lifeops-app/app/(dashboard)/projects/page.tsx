import { createClient } from '@/lib/supabase/server'
import { AddProjectDialog } from '@/components/projects/AddProjectDialog'
import { ProjectsView } from '@/components/projects/ProjectsView'
import type { Tag } from '@/types'

type ProjectTagRow = {
  project_id: string
  tags: { id: string; name: string; color: string; user_id: string; created_at: string } | null
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: projects }, { data: rawProjectTags }] = await Promise.all([
    supabase
      .from('projects')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('project_tags')
      .select('project_id, tags(id, name, color, user_id, created_at)')
      .eq('user_id', user!.id),
  ])

  // Build project_id → Tag[] lookup — same pattern as tagsByTaskId on the tasks page
  const tagsByProjectId: Record<string, Tag[]> = {}
  for (const row of (rawProjectTags as ProjectTagRow[] | null) ?? []) {
    if (!row.tags) continue
    if (!tagsByProjectId[row.project_id]) tagsByProjectId[row.project_id] = []
    tagsByProjectId[row.project_id].push(row.tags as Tag)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage your projects, areas, and clients.
          </p>
        </div>
        <AddProjectDialog />
      </div>

      <ProjectsView projects={projects ?? []} tagsByProjectId={tagsByProjectId} />
    </div>
  )
}
