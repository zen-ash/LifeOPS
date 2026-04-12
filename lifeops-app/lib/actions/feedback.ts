'use server'

import { createClient } from '@/lib/supabase/server'

const VALID_TYPES = ['bug', 'feature', 'general'] as const

export async function submitFeedback({
  feedbackType,
  message,
  route,
}: {
  feedbackType: string
  message: string
  route: string
}) {
  if (!VALID_TYPES.includes(feedbackType as typeof VALID_TYPES[number])) {
    return { error: 'Invalid feedback type' }
  }
  if (!message.trim()) return { error: 'Message is required' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('user_feedback').insert({
    user_id: user.id,
    feedback_type: feedbackType,
    message: message.trim(),
    route: route || '/',
  })

  if (error) return { error: error.message }
  return { success: true }
}
