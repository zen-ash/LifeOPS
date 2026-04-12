import { createClient } from '@/lib/supabase/server'
import { NotesView } from '@/components/notes/NotesView'
import { FileText } from 'lucide-react'
import type { Tag, SavedView } from '@/types'

type NoteRow = {
  id: string
  title: string
  content: string | null
  type: 'note' | 'journal'
  project_id: string | null
  is_pinned: boolean
  created_at: string
  updated_at: string
  projects: { name: string } | null
}

type NoteTagRow = {
  note_id: string
  tags: { id: string; name: string; color: string; user_id: string; created_at: string } | null
}

type NoteLinkRow = {
  note_id: string
  task_id: string
}

export default async function NotesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [
    { data: rawNotes },
    { data: projects },
    { data: rawNoteTags },
    { data: rawSavedViews },
    { data: rawTasks },
    { data: rawNoteLinks },
  ] = await Promise.all([
    supabase
      .from('notes')
      .select('id, title, content, type, project_id, is_pinned, created_at, updated_at, projects(name)')
      .eq('user_id', user!.id)
      .eq('type', 'note')
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', user!.id)
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('note_tags')
      .select('note_id, tags(id, name, color, user_id, created_at)')
      .eq('user_id', user!.id),
    supabase
      .from('saved_views')
      .select('*')
      .eq('user_id', user!.id)
      .eq('entity_type', 'notes')
      .order('created_at', { ascending: true }),
    // Phase 13.B: active tasks for link selector
    supabase
      .from('tasks')
      .select('id, title')
      .eq('user_id', user!.id)
      .in('status', ['todo', 'in_progress'])
      .order('title'),
    // Phase 13.B: existing note→task links for this user
    supabase
      .from('note_task_links')
      .select('note_id, task_id')
      .eq('user_id', user!.id),
  ])

  // Build note_id → Tag[] lookup
  const tagsByNoteId: Record<string, Tag[]> = {}
  for (const row of (rawNoteTags as NoteTagRow[] | null) ?? []) {
    if (!row.tags) continue
    if (!tagsByNoteId[row.note_id]) tagsByNoteId[row.note_id] = []
    tagsByNoteId[row.note_id].push(row.tags as Tag)
  }

  // Phase 13.B: build note_id → task_id[] lookup
  const linkedTaskIdsByNoteId: Record<string, string[]> = {}
  for (const row of (rawNoteLinks as NoteLinkRow[] | null) ?? []) {
    if (!linkedTaskIdsByNoteId[row.note_id]) linkedTaskIdsByNoteId[row.note_id] = []
    linkedTaskIdsByNoteId[row.note_id].push(row.task_id)
  }

  const notes = (rawNotes as NoteRow[] | null ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    type: n.type,
    project_id: n.project_id,
    project_name: n.projects?.name ?? null,
    is_pinned: n.is_pinned,
    created_at: n.created_at,
    updated_at: n.updated_at,
  }))

  const tasks = (rawTasks ?? []) as { id: string; title: string }[]

  const noteCount = notes.length
  const pinnedCount = notes.filter(n => n.is_pinned).length

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Page header */}
      <div className="rounded-xl border bg-card px-6 py-4 flex items-center gap-3 animate-fade-in-up">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight leading-tight">Notes</h1>
          <p className="text-xs text-muted-foreground leading-tight mt-0.5">
            {noteCount === 0
              ? 'Capture ideas, references, and project notes'
              : pinnedCount > 0
              ? `${noteCount} note${noteCount === 1 ? '' : 's'} · ${pinnedCount} pinned`
              : `${noteCount} note${noteCount === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>

      <NotesView
        notes={notes}
        type="note"
        projects={projects ?? []}
        tagsByNoteId={tagsByNoteId}
        savedViews={(rawSavedViews as SavedView[] | null) ?? []}
        tasks={tasks}
        linkedTaskIdsByNoteId={linkedTaskIdsByNoteId}
      />
    </div>
  )
}
