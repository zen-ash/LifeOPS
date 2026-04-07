'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Flame, ArrowRight, Activity } from 'lucide-react'
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
  completedTodayCount,
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
    // Optimistic update
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

  // Count only completions for habits that are due today (in the quick list)
  const todayHabitIdSet = new Set(todayHabits.map((h) => h.id))
  const completedNow = [...completedIds].filter((id) => todayHabitIdSet.has(id)).length

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Habits</h2>
        <Link
          href="/habits"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          All habits
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {activeCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-xl text-muted-foreground">
          <Activity className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm font-medium">No habits yet</p>
          <Link href="/habits" className="text-xs mt-1 text-primary hover:underline">
            Create your first habit →
          </Link>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Active', value: String(activeCount), sub: 'habits', flame: false },
              {
                label: 'Today',
                value: `${completedNow}/${todayHabits.length}`,
                sub: 'completed',
                flame: false,
              },
              {
                label: 'Best streak',
                value: String(bestStreak),
                sub: bestStreak === 1 ? 'day / week' : 'days / weeks',
                flame: bestStreak > 0,
              },
            ].map(({ label, value, sub, flame }) => (
              <div
                key={label}
                className="rounded-xl border bg-card p-4 flex flex-col items-center text-center"
              >
                {flame ? (
                  <Flame className="h-5 w-5 text-orange-500 mb-2" />
                ) : (
                  <Activity className="h-5 w-5 text-primary mb-2" />
                )}
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                <p className="text-[10px] text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>

          {/* Quick check-off for today's habits */}
          {todayHabits.length > 0 && (
            <div className="rounded-xl border bg-card divide-y">
              {todayHabits.map((habit: TodayHabit) => {
                const done = completedIds.has(habit.id)
                return (
                  <div key={habit.id} className="flex items-center gap-3 px-4 py-2.5">
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
                        'flex-1 text-sm font-medium truncate',
                        done && 'line-through text-muted-foreground'
                      )}
                    >
                      {habit.title}
                    </p>

                    {habit.streak > 0 && (
                      <span className="flex items-center gap-0.5 text-[11px] text-orange-500 font-medium shrink-0">
                        <Flame className="h-3 w-3" />
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
    </section>
  )
}
