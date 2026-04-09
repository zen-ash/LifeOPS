'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendBuddyRequest, respondToBuddyRequest, removeBuddy } from '@/lib/actions/studyBuddy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserPlus, UserCheck, UserX, Clock, Users } from 'lucide-react'
import type { StudyBuddy } from '@/types'

type ProfileRow = {
  id: string
  full_name: string | null
  email: string
}

interface StudyBuddyViewProps {
  currentUserId: string
  relationships: StudyBuddy[]
  profileMap: Record<string, ProfileRow>
}

export function StudyBuddyView({ currentUserId, relationships, profileMap }: StudyBuddyViewProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const incoming = relationships.filter(
    (r) => r.addressee_user_id === currentUserId && r.status === 'pending'
  )
  const outgoing = relationships.filter(
    (r) => r.requester_user_id === currentUserId && r.status === 'pending'
  )
  const accepted = relationships.filter((r) => r.status === 'accepted')

  function getOtherUserId(r: StudyBuddy) {
    return r.requester_user_id === currentUserId ? r.addressee_user_id : r.requester_user_id
  }

  function getDisplayName(userId: string) {
    const p = profileMap[userId]
    return p?.full_name ?? p?.email ?? 'Unknown User'
  }

  function getDisplayEmail(userId: string) {
    const p = profileMap[userId]
    // Only show email as subtitle when full_name is already shown as the primary label
    return p?.full_name ? p.email : null
  }

  function handleSend() {
    if (!email.trim()) return
    startTransition(async () => {
      const result = await sendBuddyRequest(email.trim())
      if ('error' in result && result.error) {
        setMessage({ type: 'error', text: result.error as string })
      } else {
        setMessage({ type: 'success', text: 'Buddy request sent!' })
        setEmail('')
        router.refresh()
      }
    })
  }

  function handleRespond(requestId: string, accept: boolean) {
    startTransition(async () => {
      await respondToBuddyRequest(requestId, accept)
      router.refresh()
    })
  }

  function handleRemove(requestId: string) {
    startTransition(async () => {
      await removeBuddy(requestId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {/* Add Buddy */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Add a Buddy</h2>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="friend@example.com"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setMessage(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1"
            disabled={isPending}
          />
          <Button onClick={handleSend} disabled={isPending || !email.trim()}>
            Send Request
          </Button>
        </div>
        {message && (
          <p
            className={`text-sm ${
              message.type === 'error'
                ? 'text-destructive'
                : 'text-green-600 dark:text-green-400'
            }`}
          >
            {message.text}
          </p>
        )}
      </div>

      {/* Incoming Requests */}
      {incoming.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Incoming Requests</h2>
            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {incoming.length}
            </span>
          </div>
          <div className="divide-y">
            {incoming.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {getDisplayName(r.requester_user_id)}
                  </p>
                  {getDisplayEmail(r.requester_user_id) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {getDisplayEmail(r.requester_user_id)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
                  <Button
                    size="sm"
                    onClick={() => handleRespond(r.id, true)}
                    disabled={isPending}
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRespond(r.id, false)}
                    disabled={isPending}
                  >
                    <UserX className="h-3.5 w-3.5 mr-1.5" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted Buddies */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Your Buddies</h2>
          <span className="ml-auto text-xs text-muted-foreground">{accepted.length}</span>
        </div>

        {accepted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No buddies yet — send a request above to get started!
          </p>
        ) : (
          <div className="divide-y">
            {accepted.map((r) => {
              const otherId = getOtherUserId(r)
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{getDisplayName(otherId)}</p>
                    {getDisplayEmail(otherId) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {getDisplayEmail(otherId)}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 ml-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemove(r.id)}
                    disabled={isPending}
                  >
                    Remove
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sent Requests (pending outgoing) */}
      {outgoing.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-muted-foreground">Sent Requests</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {outgoing.length} pending
            </span>
          </div>
          <div className="divide-y">
            {outgoing.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {getDisplayName(r.addressee_user_id)}
                  </p>
                  {getDisplayEmail(r.addressee_user_id) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {getDisplayEmail(r.addressee_user_id)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">Waiting for response…</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 ml-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemove(r.id)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
