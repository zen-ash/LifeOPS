import { createClient } from '@/lib/supabase/server'
import { FocusTimer } from '@/components/focus/FocusTimer'
import { SessionHistory } from '@/components/focus/SessionHistory'

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
    <div className="max-w-2xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Focus Mode</h1>
        <p className="text-muted-foreground mt-1">
          Run a focused work session and track your deep work time.
        </p>
      </div>

      {/* Timer */}
      <FocusTimer tasks={tasks ?? []} projects={projects ?? []} />

      {/* Session history */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Session History</h2>
        <SessionHistory sessions={sessions ?? []} />
      </section>
    </div>
  )
}
