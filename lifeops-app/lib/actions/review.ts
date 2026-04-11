'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/actions/activityLog'
import type { WeeklyMetrics, ReviewAISummary } from '@/types'

export async function saveWeeklyReview(input: {
  weekStart: string
  weekEnd: string
  metricsJson: WeeklyMetrics
  aiSummary: ReviewAISummary | null
  reflection: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('weekly_reviews').upsert(
    {
      user_id: user.id,
      week_start: input.weekStart,
      week_end: input.weekEnd,
      metrics_json: input.metricsJson,
      ai_summary: input.aiSummary,
      reflection: input.reflection.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,week_start' }
  )

  if (error) return { error: error.message }

  await logEvent(supabase, user.id, {
    event_type: 'weekly_review_completed',
    entity_type: 'weekly_review',
    payload: {
      week_start: input.weekStart,
      focus_minutes: input.metricsJson.focusMinutes,
      completed_tasks: input.metricsJson.completedTaskCount,
    },
  })

  revalidatePath('/review')
  revalidatePath('/dashboard')
  return { success: true }
}
