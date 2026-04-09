'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const VALID_FREQUENCIES = ['daily', 'weekly']

function revalidateHabitPaths() {
  revalidatePath('/dashboard')
  revalidatePath('/habits')
}

export async function addHabit(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const frequency = (formData.get('frequency') as string) || 'daily'
  const target_days_per_week = formData.get('target_days_per_week')
  const linked_project_id = (formData.get('linked_project_id') as string) || null
  // Only store weekdays for weekly habits; daily habits get an empty array
  const selected_weekdays =
    frequency === 'weekly' ? (formData.getAll('selected_weekdays') as string[]) : []

  if (!title?.trim()) return { error: 'Habit title is required' }
  if (!VALID_FREQUENCIES.includes(frequency)) return { error: 'Invalid frequency' }

  const { error } = await supabase.from('habits').insert({
    user_id: user.id,
    title: title.trim(),
    description: description?.trim() || null,
    frequency,
    target_days_per_week: target_days_per_week
      ? parseInt(target_days_per_week as string)
      : null,
    selected_weekdays,
    linked_project_id: linked_project_id || null,
  })

  if (error) return { error: error.message }

  revalidateHabitPaths()
  return { success: true }
}

export async function editHabit(habitId: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const frequency = (formData.get('frequency') as string) || 'daily'
  const target_days_per_week = formData.get('target_days_per_week')
  const linked_project_id = (formData.get('linked_project_id') as string) || null
  const is_active = formData.get('is_active') === 'true'
  const selected_weekdays =
    frequency === 'weekly' ? (formData.getAll('selected_weekdays') as string[]) : []

  if (!title?.trim()) return { error: 'Habit title is required' }
  if (!VALID_FREQUENCIES.includes(frequency)) return { error: 'Invalid frequency' }

  const { error } = await supabase
    .from('habits')
    .update({
      title: title.trim(),
      description: description?.trim() || null,
      frequency,
      target_days_per_week: target_days_per_week
        ? parseInt(target_days_per_week as string)
        : null,
      selected_weekdays,
      linked_project_id: linked_project_id || null,
      is_active,
    })
    .eq('id', habitId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateHabitPaths()
  return { success: true }
}

export async function deleteHabit(habitId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateHabitPaths()
  return { success: true }
}

export async function logHabit(habitId: string, date: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // ignoreDuplicates handles the UNIQUE(habit_id, logged_date) constraint
  const { error } = await supabase.from('habit_logs').upsert(
    { habit_id: habitId, user_id: user.id, logged_date: date },
    { onConflict: 'habit_id,logged_date', ignoreDuplicates: true }
  )

  if (error) return { error: error.message }

  revalidateHabitPaths()
  return { success: true }
}

export async function unlogHabit(habitId: string, date: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('habit_logs')
    .delete()
    .eq('habit_id', habitId)
    .eq('user_id', user.id)
    .eq('logged_date', date)

  if (error) return { error: error.message }

  revalidateHabitPaths()
  return { success: true }
}

export async function applyFreeze(habitId: string, date: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Check available freeze days and whether already frozen for this date
  const [{ data: habit, error: fetchError }, { data: existing }] = await Promise.all([
    supabase
      .from('habits')
      .select('freeze_days_available')
      .eq('id', habitId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('habit_freeze_logs')
      .select('id')
      .eq('habit_id', habitId)
      .eq('freeze_date', date)
      .maybeSingle(),
  ])

  if (fetchError || !habit) return { error: 'Habit not found' }
  if (existing) return { success: true } // already frozen, idempotent
  if (habit.freeze_days_available <= 0) return { error: 'No freeze days remaining' }

  // Insert freeze log
  const { error: insertError } = await supabase
    .from('habit_freeze_logs')
    .insert({ habit_id: habitId, user_id: user.id, freeze_date: date })

  if (insertError) return { error: insertError.message }

  // Decrement freeze days
  const { error: updateError } = await supabase
    .from('habits')
    .update({ freeze_days_available: habit.freeze_days_available - 1 })
    .eq('id', habitId)
    .eq('user_id', user.id)

  if (updateError) return { error: updateError.message }

  revalidateHabitPaths()
  return { success: true }
}

export async function convertHabitToTask(habitId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: habit, error: fetchError } = await supabase
    .from('habits')
    .select('title, linked_project_id')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !habit) return { error: 'Habit not found' }

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const { error } = await supabase.from('tasks').insert({
    user_id: user.id,
    title: habit.title,
    priority: 'medium',
    due_date: today,
    project_id: habit.linked_project_id ?? null,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/tasks')
  return { success: true }
}
