import { createClient } from '@/lib/supabase/server'
import { AddProjectDialog } from '@/components/projects/AddProjectDialog'
import { ProjectsView } from '@/components/projects/ProjectsView'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

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

      <ProjectsView projects={projects ?? []} />
    </div>
  )
}
