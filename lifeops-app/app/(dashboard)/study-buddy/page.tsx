import { createClient } from '@/lib/supabase/server'
import { StudyBuddyView } from '@/components/study-buddy/StudyBuddyView'
import { Users2 } from 'lucide-react'
import type { StudyBuddy } from '@/types'

type ProfileRow = {
  id: string
  full_name: string | null
  email: string
}

export default async function StudyBuddyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: rawRelationships } = await supabase
    .from('study_buddies')
    .select('*')
    .order('created_at', { ascending: false })

  const relationships = (rawRelationships as StudyBuddy[] | null) ?? []

  const otherUserIds = [
    ...new Set(
      relationships.map((r) =>
        r.requester_user_id === user!.id ? r.addressee_user_id : r.requester_user_id
      )
    ),
  ]

  let profileMap: Record<string, ProfileRow> = {}
  if (otherUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', otherUserIds)
    for (const p of (profiles as ProfileRow[] | null) ?? []) {
      profileMap[p.id] = p
    }
  }

  const acceptedCount = relationships.filter(r => r.status === 'accepted').length
  const pendingCount  = relationships.filter(r => r.status === 'pending' && r.addressee_user_id === user!.id).length

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Page header */}
      <div className="rounded-xl border bg-card px-6 py-4 flex items-center justify-between gap-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Users2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-tight">Study Buddy</h1>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              {acceptedCount === 0
                ? 'Connect with friends and stay accountable together'
                : `${acceptedCount} buddy${acceptedCount !== 1 ? 's' : ''} connected${pendingCount > 0 ? ` · ${pendingCount} pending` : ''}`}
            </p>
          </div>
        </div>
      </div>

      <StudyBuddyView
        currentUserId={user!.id}
        relationships={relationships}
        profileMap={profileMap}
      />
    </div>
  )
}
