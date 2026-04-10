'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Flame, Activity } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { logHabit, unlogHabit } from '@/lib/actions/habits'

interface TodayHabit {
  id: string
  title: string
  frequency: 'daily' | 'weekly'
  streak: number
}

interface HabitsDashboardWidgetProps {
  activeCount: number
  completedTodayCount: number
  bestStreak: number
  todayHabits: TodayHabit[]
  today: string
  completedTodayIds: string[]
}

export function HabitsDashboardWidget({
  activeCount,
  bestStreak,
  todayHabits,
  today,
  completedTodayIds: initialIds,
}: HabitsDashboardWidgetProps) {
  const [completedIds, setCompletedIds] = useState(new Set(initialIds))
  const [pending, setPending] = useState<string | null>(null)

  async function handleToggle(habitId: string) {
    if (pending) return
    const done = completedIds.has(habitId)
    setCompletedIds((prev) => {
      const next = new Set(prev)
      if (done) next.delete(habitId)
      else next.add(habitId)
      return next
    })
    setPending(habitId)
    if (done) {
      await unlogHabit(habitId, today)
    } else {
      await logHabit(habitId, today)
    }
    setPending(null)
  }

  const todayHabitIdSet = new Set(todayHabits.map((h) => h.id))
  const completedNow = [...completedIds].filter((id) => todayHabitIdSet.has(id)).length
  const total = todayHabits.length
  const pct = total > 0 ? Math.round((completedNow / total) * 100) : 0

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground/60" />
          <span className="text-sm font-semibold">Habits</span>
          {bestStreak > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] font-medium text-orange-500">
              <Flame className="h-3 w-3" />
              {bestStreak}
            </span>
          )}
        </div>
        <Link
          href="/habits"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          All →
        </Link>
      </div>

      {activeCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Activity className="h-6 w-6 mb-2 opacity-20" />
          <p className="text-xs">No habits yet</p>
          <Link href="/habits" className="text-xs mt-1.5 text-primary hover:underline">
            Create one →
          </Link>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          {total > 0 && (
            <div className="px-5 pt-3 pb-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] text-muted-foreground">
                  {completedNow}/{total} done today
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">{pct}%</p>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Habit checklist */}
          {todayHabits.length > 0 && (
            <div className="pb-1.5">
              {todayHabits.map((habit) => {
                const done = completedIds.has(habit.id)
                return (
                  <div key={habit.id} className="flex items-center gap-2.5 px-5 py-2">
                    <button
                      type="button"
                      onClick={() => handleToggle(habit.id)}
                      disabled={pending === habit.id}
                      className="shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                      aria-label={done ? 'Unmark habit' : 'Mark habit done'}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>

                    <p
                      className={cn(
                        'flex-1 text-sm truncate',
                        done ? 'line-through text-muted-foreground' : 'font-medium'
                      )}
                    >
                      {habit.title}
                    </p>

                    {habit.streak > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-orange-500 font-medium shrink-0">
                        <Flame className="h-2.5 w-2.5" />
                        {habit.streak}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
