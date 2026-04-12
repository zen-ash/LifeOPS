import { createClient } from '@/lib/supabase/server'
import { NotesView } from '@/components/notes/NotesView'
import type { Tag, SavedView } from '@/types'

type JournalRow = {
  id: string
  title: string
  content: string | null
  type: 'note' | 'journal'
  project_id: string | null
  is_pinned: boolean
  created_at: string
  updated_at: string
}

type NoteTagRow = {
  note_id: string
  tags: { id: string; name: string; color: string; user_id: string; created_at: string } | null
}

export default async function JournalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: rawEntries }, { data: rawNoteTags }, { data: rawSavedViews }] = await Promise.all([
    supabase
      .from('notes')
      .select('id, title, content, type, project_id, is_pinned, created_at, updated_at')
      .eq('user_id', user!.id)
      .eq('type', 'journal')
      .order('created_at', { ascending: false }),
    supabase
      .from('note_tags')
      .select('note_id, tags(id, name, color, user_id, created_at)')
      .eq('user_id', user!.id),
    supabase
      .from('saved_views')
      .select('*')
      .eq('user_id', user!.id)
      .eq('entity_type', 'journal')
      .order('created_at', { ascending: true }),
  ])

  // Build note_id → Tag[] lookup (revalidatePath covers both note types so we get all)
  const tagsByNoteId: Record<string, Tag[]> = {}
  for (const row of (rawNoteTags as NoteTagRow[] | null) ?? []) {
    if (!row.tags) continue
    if (!tagsByNoteId[row.note_id]) tagsByNoteId[row.note_id] = []
    tagsByNoteId[row.note_id].push(row.tags as Tag)
  }

  const entries = (rawEntries as JournalRow[] | null ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    type: n.type,
    project_id: n.project_id,
    project_name: null,
    is_pinned: n.is_pinned,
    created_at: n.created_at,
    updated_at: n.updated_at,
  }))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Journal</h1>
        <p className="text-muted-foreground mt-1">
          Daily reflections and personal log entries.
        </p>
      </div>

      <NotesView
        notes={entries}
        type="journal"
        projects={[]}
        tagsByNoteId={tagsByNoteId}
        savedViews={(rawSavedViews as SavedView[] | null) ?? []}
        tasks={[]}
        linkedTaskIdsByNoteId={{}}
      />
    </div>
  )
}
