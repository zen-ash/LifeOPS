import { createClient } from '@/lib/supabase/server'
import { StudyBuddyView } from '@/components/study-buddy/StudyBuddyView'
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

  // Fetch all relationships involving the current user.
  // RLS automatically filters to rows where user is requester or addressee.
  const { data: rawRelationships } = await supabase
    .from('study_buddies')
    .select('*')
    .order('created_at', { ascending: false })

  const relationships = (rawRelationships as StudyBuddy[] | null) ?? []

  // Collect unique other-party user IDs
  const otherUserIds = [
    ...new Set(
      relationships.map((r) =>
        r.requester_user_id === user!.id ? r.addressee_user_id : r.requester_user_id
      )
    ),
  ]

  // Fetch profiles — visible via the "buddy profiles" RLS policy added in add_study_buddy.sql
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Study Buddy</h1>
        <p className="text-muted-foreground mt-1">
          Connect with friends and stay accountable together.
        </p>
      </div>

      <StudyBuddyView
        currentUserId={user!.id}
        relationships={relationships}
        profileMap={profileMap}
      />
    </div>
  )
}
