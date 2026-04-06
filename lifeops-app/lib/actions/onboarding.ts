'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function completeOnboarding(data: {
  goals: string[]
  study_hours_per_week: number
  priorities: string[]
  timezone: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({
      goals: data.goals,
      study_hours_per_week: data.study_hours_per_week,
      priorities: data.priorities,
      timezone: data.timezone,
      is_onboarded: true,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  // Bust the dashboard cache so it picks up the new profile data
  revalidatePath('/dashboard')
  // redirect() throws a special Next.js error — this is intentional and correct
  redirect('/dashboard')
}
