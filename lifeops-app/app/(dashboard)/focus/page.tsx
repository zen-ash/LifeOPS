import { createClient } from '@/lib/supabase/server'
import { FocusTimer } from '@/components/focus/FocusTimer'
import { SessionHistory } from '@/components/focus/SessionHistory'
import { Timer } from 'lucide-react'

export default async function FocusPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: sessions }, { data: tasks }, { data: projects }] =
    await Promise.all([
      supabase
        .from('focus_sessions')
        .select('*, tasks(title), projects(name, color)')
        .eq('user_id', user!.id)
        .order('started_at', { ascending: false })
        .limit(20),
      supabase
        .from('tasks')
        .select('id, title')
        .eq('user_id', user!.id)
        .not('status', 'in', '("done","cancelled")')
        .order('created_at', { ascending: false }),
      supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .order('name'),
    ])

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Page header */}
      <div className="rounded-xl border bg-card px-6 py-4 flex items-center gap-3 animate-fade-in-up">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <Timer className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight leading-tight">Focus Mode</h1>
          <p className="text-xs text-muted-foreground leading-tight mt-0.5">
            Deep work sessions — tracked and saved automatically
          </p>
        </div>
      </div>

      {/* Main grid: timer (3/5) + history (2/5) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <FocusTimer
            tasks={(tasks ?? []).map((t) => ({ id: t.id, name: t.title }))}
            projects={projects ?? []}
          />
        </div>

        <div className="lg:col-span-2">
          <SessionHistory sessions={sessions ?? []} />
        </div>
      </div>
    </div>
  )
}
