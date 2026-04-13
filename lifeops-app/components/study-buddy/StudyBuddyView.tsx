'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendBuddyRequest, respondToBuddyRequest, removeBuddy } from '@/lib/actions/studyBuddy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserPlus, UserCheck, UserX, Clock, Users, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
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

// Initials avatar shared within this component
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initial = name.trim()[0]?.toUpperCase() ?? '?'
  return (
    <div className={cn(
      'rounded-full bg-muted flex items-center justify-center shrink-0',
      size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
    )}>
      <span className={cn(
        'font-semibold text-muted-foreground',
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}>
        {initial}
      </span>
    </div>
  )
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

  function handleRemove(requestId: string, displayName: string) {
    if (!confirm(
      `Remove ${displayName} as a study buddy?\n\nYou'll lose shared leaderboard visibility. You can re-invite them any time.`
    )) return
    startTransition(async () => {
      await removeBuddy(requestId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* ── Add Buddy ── */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 shrink-0">
            <UserPlus className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="text-sm font-semibold">Add a Buddy</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter your friend&apos;s email address to send them a buddy request.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="friend@example.com"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setMessage(null) }}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1"
            disabled={isPending}
          />
          <Button onClick={handleSend} disabled={isPending || !email.trim()}>
            Send Request
          </Button>
        </div>
        {message && (
          <p className={cn(
            'text-sm',
            message.type === 'error' ? 'text-destructive' : 'text-green-600 dark:text-green-400'
          )}>
            {message.text}
          </p>
        )}
      </div>

      {/* ── Incoming Requests ── */}
      {incoming.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 shrink-0">
              <Clock className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-semibold">Incoming Requests</h2>
            <span className="ml-auto text-[11px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {incoming.length}
            </span>
          </div>
          <div className="divide-y divide-border/50">
            {incoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={getDisplayName(r.requester_user_id)} />
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
                </div>
                <div className="flex gap-2 shrink-0">
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

      {/* ── Accepted Buddies ── */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 shrink-0">
            <Users className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="text-sm font-semibold">Your Buddies</h2>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">{accepted.length}</span>
        </div>

        {accepted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
            <Users className="h-10 w-10 opacity-15" />
            <div className="text-center">
              <p className="text-sm font-medium">No buddies yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Send a request above to get started. Accepted buddies appear on the leaderboard together.
              </p>
            </div>
            <Link
              href="/leaderboard"
              className="text-xs text-primary hover:underline underline-offset-2 inline-flex items-center gap-1"
            >
              <Trophy className="h-3 w-3" />
              View leaderboard
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {accepted.map((r) => {
              const otherId = getOtherUserId(r)
              return (
                <div key={r.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={getDisplayName(otherId)} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{getDisplayName(otherId)}</p>
                      {getDisplayEmail(otherId) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {getDisplayEmail(otherId)}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemove(r.id, getDisplayName(otherId))}
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

      {/* ── Sent Requests ── */}
      {outgoing.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
              <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
            </div>
            <h2 className="text-sm font-semibold text-muted-foreground">Sent Requests</h2>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {outgoing.length} pending
            </span>
          </div>
          <div className="divide-y divide-border/50">
            {outgoing.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={getDisplayName(r.addressee_user_id)} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {getDisplayName(r.addressee_user_id)}
                    </p>
                    {getDisplayEmail(r.addressee_user_id) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {getDisplayEmail(r.addressee_user_id)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/60 mt-0.5">Waiting for response…</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemove(r.id, getDisplayName(r.addressee_user_id))}
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
