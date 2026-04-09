import { createClient } from '@/lib/supabase/server'
import { Trophy, Timer, CheckSquare, Activity, Medal } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { LeaderboardEntry } from '@/types'

const RANK_STYLES: Record<number, string> = {
  1: 'text-yellow-500',
  2: 'text-slate-400',
  3: 'text-amber-600',
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl">🥇</span>
  if (rank === 2) return <span className="text-xl">🥈</span>
  if (rank === 3) return <span className="text-xl">🥉</span>
  return (
    <span className={cn('text-sm font-bold w-7 text-center tabular-nums', RANK_STYLES[rank] ?? 'text-muted-foreground')}>
      #{rank}
    </span>
  )
}

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get profile for the user's timezone so week boundaries are correct.
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

  // Determine the Monday date of the current week in the user's timezone for display.
  const weekLabel = (() => {
    try {
      const now = new Date()
      // Get Monday of this week in the user's locale
      const day = now.getDay() // 0=Sun
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="h-7 w-7 text-yellow-500" />
          Leaderboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Week of {weekLabel} · You + accepted buddies · ranked by productivity score
        </p>
      </div>

      {/* Score formula explainer */}
      <div className="rounded-xl border bg-card px-5 py-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Scoring formula
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 text-primary" />
            <span>1 pt / focus minute</span>
          </span>
          <span className="text-muted-foreground">+</span>
          <span className="flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5 text-green-500" />
            <span>20 pts / completed task</span>
          </span>
          <span className="text-muted-foreground">+</span>
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-orange-500" />
            <span>10 pts / habit log</span>
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Could not load leaderboard. Make sure the SQL migration has been run.
        </div>
      )}

      {!error && rows.length === 0 && (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          <Trophy className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No data yet</p>
          <p className="text-sm mt-1">Start tracking focus, tasks, and habits to appear here.</p>
        </div>
      )}

      {!error && rows.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/40">
                {/* Rank — fixed narrow */}
                <th className="px-5 py-2.5 text-left w-10">
                  <span className="text-xs font-semibold text-muted-foreground">#</span>
                </th>
                {/* Name — fills remaining space */}
                <th className="px-2 py-2.5 text-left">
                  <span className="text-xs font-semibold text-muted-foreground">Name</span>
                </th>
                {/* Metric columns — fixed width, right-aligned, hidden on mobile */}
                <th className="hidden sm:table-cell px-3 py-2.5 text-right w-24">
                  <span className="text-xs font-semibold text-muted-foreground">Focus</span>
                </th>
                <th className="hidden sm:table-cell px-3 py-2.5 text-right w-20">
                  <span className="text-xs font-semibold text-muted-foreground">Tasks</span>
                </th>
                <th className="hidden sm:table-cell px-3 py-2.5 text-right w-20">
                  <span className="text-xs font-semibold text-muted-foreground">Habits</span>
                </th>
                <th className="px-5 py-2.5 text-right w-24">
                  <span className="text-xs font-semibold text-muted-foreground">Score</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((entry) => {
                const isMe = entry.user_id === user!.id
                return (
                  <tr
                    key={entry.user_id}
                    className={cn(isMe && 'bg-primary/5')}
                  >
                    {/* Rank */}
                    <td className="px-5 py-3.5 w-10">
                      <div className="flex items-center justify-center w-7">
                        <RankBadge rank={entry.rank} />
                      </div>
                    </td>

                    {/* Name + optional "you" badge */}
                    <td className="px-2 py-3.5 max-w-0">
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
                    </td>

                    {/* Focus minutes */}
                    <td className="hidden sm:table-cell px-3 py-3.5 w-24 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Timer className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                        <span className="tabular-nums">{entry.focus_minutes}m</span>
                      </div>
                    </td>

                    {/* Completed tasks */}
                    <td className="hidden sm:table-cell px-3 py-3.5 w-20 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <CheckSquare className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                        <span className="tabular-nums">{entry.completed_tasks}</span>
                      </div>
                    </td>

                    {/* Habit completions */}
                    <td className="hidden sm:table-cell px-3 py-3.5 w-20 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Activity className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                        <span className="tabular-nums">{entry.habit_completions}</span>
                      </div>
                    </td>

                    {/* Score */}
                    <td className="px-5 py-3.5 w-24 text-right">
                      <span
                        className={cn(
                          'font-bold tabular-nums',
                          entry.rank === 1
                            ? 'text-yellow-500'
                            : entry.rank <= 3
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        )}
                      >
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

      {/* No buddies nudge */}
      {!error && !hasBuddies && (
        <p className="text-sm text-muted-foreground text-center">
          Add accepted buddies on the{' '}
          <Link href="/study-buddy" className="text-primary underline underline-offset-2">
            Study Buddy
          </Link>{' '}
          page to compete together.
        </p>
      )}

      {/* My stats summary card (only if I have data) */}
      {myEntry && (
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Your stats this week
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {[
              { label: 'Focus', value: `${myEntry.focus_minutes}m`, icon: Timer, color: 'text-primary' },
              { label: 'Tasks done', value: String(myEntry.completed_tasks), icon: CheckSquare, color: 'text-green-500' },
              { label: 'Habit logs', value: String(myEntry.habit_completions), icon: Activity, color: 'text-orange-500' },
              { label: 'Score', value: myEntry.score.toLocaleString(), icon: Medal, color: 'text-yellow-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex flex-col items-center text-center">
                <Icon className={cn('h-4 w-4 mb-1', color)} />
                <p className="text-lg font-bold tabular-nums">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
