'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { GeneratedPlan } from '@/types'

export async function savePlan(weekStart: string, plan: GeneratedPlan) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('weekly_plans')
    .upsert(
      {
        user_id: user.id,
        week_start_date: weekStart,
        plan_json: plan,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_start_date' }
    )

  if (error) return { error: error.message }

  revalidatePath('/planner')
  return { success: true }
}
