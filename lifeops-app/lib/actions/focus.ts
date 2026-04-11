'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/actions/activityLog'

interface SaveSessionInput {
  goal: string | null
  type: 'pomodoro' | 'free'
  duration_minutes: number
  actual_minutes: number
  completed: boolean
  started_at: string   // ISO string recorded on the client when Start was clicked
  ended_at: string     // ISO string recorded on the client when session ended
  task_id: string | null
  project_id: string | null
  from_planner?: boolean // Phase 11.F: true when launched via Planner → Focus handoff
}

export async function saveSession(input: SaveSessionInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: user.id,
      goal: input.goal?.trim() || null,
      type: input.type,
      duration_minutes: input.duration_minutes,
      actual_minutes: input.actual_minutes,
      completed: input.completed,
      started_at: input.started_at,
      ended_at: input.ended_at,
      task_id: input.task_id || null,
      project_id: input.project_id || null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await logEvent(supabase, user.id, {
    event_type: input.completed ? 'focus_session_completed' : 'focus_session_stopped_early',
    entity_type: 'focus_session',
    entity_id: data.id,
    payload: {
      duration_minutes: input.duration_minutes,
      actual_minutes: input.actual_minutes,
      type: input.type,
      goal: input.goal ?? null,
      from_planner: input.from_planner ?? false,
    },
  })

  revalidatePath('/focus')
  revalidatePath('/dashboard')
  return { success: true, id: data.id }
}

export async function deleteSession(sessionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('focus_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/focus')
  revalidatePath('/dashboard')
  return { success: true }
}
