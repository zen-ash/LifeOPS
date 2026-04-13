'use server'

import { createClient } from '@/lib/supabase/server'

export type ChatSessionRecord = {
  id: string
  title: string
  created_at: string
}

export type ChatMessageRecord = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export async function createChatSession(
  title: string
): Promise<{ sessionId: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { sessionId: null }

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ user_id: user.id, title: title.slice(0, 100) || 'New chat' })
    .select('id')
    .single()

  if (error || !data) return { sessionId: null }
  return { sessionId: data.id as string }
}

export async function saveChatMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !content.trim()) return

  await supabase.from('chat_messages').insert({
    session_id: sessionId,
    user_id: user.id,
    role,
    content,
  })

  // Bump updated_at so the session list sorts correctly
  await supabase
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', user.id)
}

export async function listChatSessions(): Promise<ChatSessionRecord[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20)

  return (data as ChatSessionRecord[]) ?? []
}

export async function loadChatMessages(
  sessionId: string
): Promise<ChatMessageRecord[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('chat_messages')
    .select('id, role, content')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return (data as ChatMessageRecord[]) ?? []
}
