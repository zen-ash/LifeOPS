'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendBuddyRequest(addresseeEmail: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const trimmedEmail = addresseeEmail.trim().toLowerCase()
  if (!trimmedEmail) return { error: 'Please enter an email address.' }

  // Secure lookup via SECURITY DEFINER function — cannot query auth.users directly
  const { data: found, error: lookupError } = await supabase
    .rpc('find_user_by_email', { search_email: trimmedEmail })

  if (lookupError) return { error: 'Lookup failed. Please try again.' }
  if (!found || (found as { id: string }[]).length === 0) {
    return { error: 'No user found with that email.' }
  }

  const addresseeId = (found as { id: string }[])[0].id

  if (addresseeId === user.id) {
    return { error: 'You cannot add yourself as a buddy.' }
  }

  // Check for an existing relationship in either direction.
  // RLS ensures this query only surfaces rows involving the current user,
  // so filtering by addresseeId covers both (me→them) and (them→me).
  const { data: existing } = await supabase
    .from('study_buddies')
    .select('id, status')
    .or(`requester_user_id.eq.${addresseeId},addressee_user_id.eq.${addresseeId}`)
    .maybeSingle()

  if (existing) {
    const s = (existing as { id: string; status: string }).status
    if (s === 'accepted') return { error: 'You are already buddies.' }
    if (s === 'pending') return { error: 'A buddy request already exists between you two.' }
    if (s === 'declined') return { error: 'This request was previously declined.' }
  }

  const { error } = await supabase
    .from('study_buddies')
    .insert({ requester_user_id: user.id, addressee_user_id: addresseeId, status: 'pending' })

  if (error) {
    if (error.code === '23505') return { error: 'A buddy request already exists.' }
    return { error: error.message }
  }

  revalidatePath('/study-buddy')
  return { success: true }
}

export async function respondToBuddyRequest(requestId: string, accept: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  if (accept) {
    const { error } = await supabase
      .from('study_buddies')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('addressee_user_id', user.id) // only the addressee can accept
    if (error) return { error: error.message }
  } else {
    // On decline, delete the row — keeps the table clean and allows re-request later
    const { error } = await supabase
      .from('study_buddies')
      .delete()
      .eq('id', requestId)
      .eq('addressee_user_id', user.id) // only the addressee can decline
    if (error) return { error: error.message }
  }

  revalidatePath('/study-buddy')
  return { success: true }
}

export async function removeBuddy(requestId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Either party can remove — RLS policy also enforces this
  const { error } = await supabase
    .from('study_buddies')
    .delete()
    .eq('id', requestId)

  if (error) return { error: error.message }

  revalidatePath('/study-buddy')
  return { success: true }
}
