import { createClient } from '@/lib/supabase/server'
import { Trophy, Timer, CheckSquare, Activity, Medal, Crown, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { LeaderboardEntry } from '@/types'

// Initials avatar for leaderboard rows
function Avatar({ name }: { name: string }) {
  const initial = name.trim()[0]?.toUpperCase() ?? '?'
  return (
    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
      <span className="text-xs font-semibold text-muted-foreground">{initial}</span>
    </div>
  )
}

// Rank cell: Crown for #1, colored numbers for top 3, muted for rest
function RankCell({ rank, isMe }: { rank: number; isMe: boolean }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10">
          <Crown className="h-3.5 w-3.5 text-yellow-500" />
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center">
      <span className={cn(
        'text-sm font-bold tabular-nums w-8 text-center',
        rank === 2 ? 'text-slate-400' :
        rank === 3 ? 'text-amber-600' :
        isMe ? 'text-primary' :
        'text-muted-foreground/50'
      )}>
        {rank}
      </span>
    </div>
  )
}

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user!.id)
    .single()

  const timezone = profile?.timezone ?? 'UTC'

  const { data: rawRows, error } = await supabase.rpc('get_weekly_leaderboard', {
    p_timezone: timezone,
  })

  const rows = (rawRows as LeaderboardEntry[] | null) ?? []
  const myEntry = rows.find((r) => r.user_id === user!.id)
  const hasBuddies = rows.length > 1

  const weekLabel = (() => {
    try {
      const now = new Date()
      const day = now.getDay()
      const diff = day === 0 ? -6 : 1 - day
      const monday = new Date(now)
      monday.setDate(now.getDate() + diff)
      return monday.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: timezone,
      })
    } catch {
      return 'This week'
    }
  })()

  const myRankColor =
    myEntry?.rank === 1 ? 'text-yellow-500' :
    myEntry?.rank === 2 ? 'text-slate-400' :
    myEntry?.rank === 3 ? 'text-amber-600' :
    'text-foreground'

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header card */}
      <div className="rounded-xl border bg-card px-6 py-4 flex items-center justify-between gap-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500/10 shrink-0">
            <Trophy className="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-tight">Leaderboard</h1>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              Week of {weekLabel} · {rows.length} competitor{rows.length !== 1 ? 's' : ''} · ranked by productivity
            </p>
          </div>
        </div>
        {/* Scoring formula — inline on desktop */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60">
            <Timer className="h-3 w-3 text-primary/70" />1pt/min
          </span>
          <span className="text-muted-foreground/30 text-[11px]">+</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60">
            <CheckSquare className="h-3 w-3 text-green-500/70" />20pts/task
          </span>
          <span className="text-muted-foreground/30 text-[11px]">+</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60">
            <Activity className="h-3 w-3 text-orange-500/70" />10pts/habit
          </span>
        </div>
      </div>

      {/* Your week at a glance — stat strip (only when user has data) */}
      {myEntry && (
        <div className="rounded-xl border bg-card overflow-hidden animate-fade-in-up">
          <div className="px-6 pt-4 pb-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Your week at a glance
            </p>
          </div>
          <div className="flex divide-x divide-border/40">
            {/* Rank */}
            <div className="flex-1 flex flex-col items-center py-4 px-2 gap-1 text-center min-w-0">
              {myEntry.rank === 1
                ? <Crown className="h-3.5 w-3.5 text-yellow-500" />
                : <Trophy className="h-3.5 w-3.5 text-muted-foreground/40" />
              }
              <p className={cn('text-2xl font-bold tabular-nums leading-none', myRankColor)}>
                #{myEntry.rank}
              </p>
              <p className="text-[11px] text-muted-foreground">Rank</p>
            </div>
            {/* Score */}
            <div className="flex-1 flex flex-col items-center py-4 px-2 gap-1 text-center min-w-0">
              <Medal className="h-3.5 w-3.5 text-yellow-500" />
              <p className="text-2xl font-bold tabular-nums leading-none">{myEntry.score.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Score</p>
            </div>
            {/* Focus */}
            <div className="flex-1 flex flex-col items-center py-4 px-2 gap-1 text-center min-w-0">
              <Timer className="h-3.5 w-3.5 text-primary" />
              <p className="text-2xl font-bold tabular-nums leading-none">{myEntry.focus_minutes}m</p>
              <p className="text-[11px] text-muted-foreground">Focus</p>
            </div>
            {/* Tasks */}
            <div className="flex-1 flex flex-col items-center py-4 px-2 gap-1 text-center min-w-0">
              <CheckSquare className="h-3.5 w-3.5 text-green-500" />
              <p className="text-2xl font-bold tabular-nums leading-none">{myEntry.completed_tasks}</p>
              <p className="text-[11px] text-muted-foreground">Tasks</p>
            </div>
            {/* Habits */}
            <div className="flex-1 flex flex-col items-center py-4 px-2 gap-1 text-center min-w-0">
              <Activity className="h-3.5 w-3.5 text-orange-500" />
              <p className="text-2xl font-bold tabular-nums leading-none">{myEntry.habit_completions}</p>
              <p className="text-[11px] text-muted-foreground">Habits</p>
            </div>
          </div>
          <div className="h-1" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          Could not load leaderboard. Make sure the SQL migration has been run.
        </div>
      )}

      {/* Empty state */}
      {!error && rows.length === 0 && (
        <div className="rounded-xl border bg-card flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Trophy className="h-10 w-10 opacity-20" />
          <div className="text-center">
            <p className="text-sm font-medium">No data yet this week</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Log focus sessions, complete tasks, and track habits to appear here.
            </p>
          </div>
        </div>
      )}

      {/* Rankings table */}
      {!error && rows.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2.5 text-left w-12">
                  <span className="text-xs font-semibold text-muted-foreground/50">#</span>
                </th>
                <th className="px-3 py-2.5 text-left">
                  <span className="text-xs font-semibold text-muted-foreground/50">Participant</span>
                </th>
                <th className="hidden sm:table-cell px-4 py-2.5 text-right w-24">
                  <span className="inline-flex items-center justify-end gap-1 text-xs font-semibold text-muted-foreground/50">
                    <Timer className="h-3 w-3" />Focus
                  </span>
                </th>
                <th className="hidden sm:table-cell px-4 py-2.5 text-right w-20">
                  <span className="inline-flex items-center justify-end gap-1 text-xs font-semibold text-muted-foreground/50">
                    <CheckSquare className="h-3 w-3" />Tasks
                  </span>
                </th>
                <th className="hidden sm:table-cell px-4 py-2.5 text-right w-20">
                  <span className="inline-flex items-center justify-end gap-1 text-xs font-semibold text-muted-foreground/50">
                    <Activity className="h-3 w-3" />Habits
                  </span>
                </th>
                <th className="px-5 py-2.5 text-right w-24">
                  <span className="text-xs font-semibold text-muted-foreground/50">Score</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rows.map((entry) => {
                const isMe = entry.user_id === user!.id
                return (
                  <tr
                    key={entry.user_id}
                    className={cn(
                      'transition-colors hover:bg-muted/30',
                      isMe
                        ? 'bg-primary/5'
                        : entry.rank === 1
                        ? 'bg-yellow-500/[0.04]'
                        : entry.rank === 2
                        ? 'bg-slate-400/[0.03]'
                        : entry.rank === 3
                        ? 'bg-amber-600/[0.03]'
                        : ''
                    )}
                  >
                    {/* Rank — with left border accent for current user */}
                    <td className={cn('px-4 py-3.5 w-12', isMe && 'border-l-2 border-l-primary')}>
                      <RankCell rank={entry.rank} isMe={isMe} />
                    </td>

                    {/* Avatar + Name */}
                    <td className="px-3 py-3.5 max-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={entry.display_name} />
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn('text-sm font-medium truncate', isMe && 'text-primary')}>
                            {entry.display_name}
                          </span>
                          {isMe && (
                            <span className="shrink-0 text-[10px] font-semibold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full leading-none">
                              you
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Focus */}
                    <td className="hidden sm:table-cell px-4 py-3.5 w-24 text-right">
                      <span className="tabular-nums text-sm text-muted-foreground">
                        {entry.focus_minutes}m
                      </span>
                    </td>

                    {/* Tasks */}
                    <td className="hidden sm:table-cell px-4 py-3.5 w-20 text-right">
                      <span className="tabular-nums text-sm text-muted-foreground">
                        {entry.completed_tasks}
                      </span>
                    </td>

                    {/* Habits */}
                    <td className="hidden sm:table-cell px-4 py-3.5 w-20 text-right">
                      <span className="tabular-nums text-sm text-muted-foreground">
                        {entry.habit_completions}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="px-5 py-3.5 w-24 text-right">
                      <span className={cn(
                        'font-bold tabular-nums',
                        entry.rank === 1 ? 'text-yellow-500' :
                        isMe ? 'text-primary' :
                        'text-foreground/80'
                      )}>
                        {entry.score.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* No buddies nudge — compact info card */}
      {!error && !hasBuddies && rows.length > 0 && (
        <div className="rounded-xl border bg-card px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
            <Users className="h-4 w-4 text-muted-foreground/50" />
          </div>
          <p className="flex-1 text-sm text-muted-foreground leading-snug">
            Add study buddies to compete on the leaderboard together.
          </p>
          <Link
            href="/study-buddy"
            className="shrink-0 text-xs font-medium text-primary hover:underline underline-offset-2"
          >
            Study Buddy →
          </Link>
        </div>
      )}
    </div>
  )
}
