'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/actions/activityLog'
import type { ShutdownDecision, ShutdownTomorrowItem, ShutdownEnergyLevel } from '@/types'

function getTomorrow(todayStr: string): string {
  const d = new Date(todayStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().split('T')[0]
}

export async function completeShutdown(input: {
  shutdownDate: string
  completedTasks: Array<{ id: string; title: string; priority: string }>
  slippedDecisions: ShutdownDecision[]
  tomorrowTop3: ShutdownTomorrowItem[]
  reflection: string
  energy: ShutdownEnergyLevel | null
  focusMinutes: number
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const tomorrow = getTomorrow(input.shutdownDate)

  // Apply task decisions — best-effort: failures are tolerated so the shutdown
  // record is always saved with the declared intent.
  for (const d of input.slippedDecisions) {
    if (d.action === 'carry') {
      await supabase
        .from('tasks')
        .update({ due_date: tomorrow })
        .eq('id', d.task_id)
        .eq('user_id', user.id)
    } else if (d.action === 'reschedule' && d.new_date) {
      await supabase
        .from('tasks')
        .update({ due_date: d.new_date })
        .eq('id', d.task_id)
        .eq('user_id', user.id)
    } else if (d.action === 'drop') {
      await supabase
        .from('tasks')
        .update({ status: 'cancelled' })
        .eq('id', d.task_id)
        .eq('user_id', user.id)
    }
    // 'leave': no action
  }

  // Upsert the shutdown record — if the user re-submits today, overwrite
  const { error } = await supabase.from('daily_shutdowns').upsert(
    {
      user_id: user.id,
      shutdown_date: input.shutdownDate,
      completed_tasks: input.completedTasks,
      slipped_decisions: input.slippedDecisions,
      tomorrow_top3: input.tomorrowTop3,
      reflection: input.reflection.trim() || null,
      energy: input.energy,
      focus_minutes: input.focusMinutes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,shutdown_date' }
  )

  if (error) return { error: error.message }

  await logEvent(supabase, user.id, {
    event_type: 'shutdown_completed',
    payload: {
      shutdown_date: input.shutdownDate,
      focus_minutes: input.focusMinutes,
      completed_count: input.completedTasks.length,
      slipped_count: input.slippedDecisions.length,
    },
  })

  revalidatePath('/shutdown')
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { success: true }
}
