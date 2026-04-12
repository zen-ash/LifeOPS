'use client'

import { useState } from 'react'
import { Activity, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HabitCard, type HabitRow } from './HabitCard'

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

interface Project { id: string; name: string }

interface HabitsViewProps {
  habits: HabitRow[]
  logsMap: Record<string, string[]>
  freezeLogsMap: Record<string, string[]>
  skipLogsMap: Record<string, string[]>  // Phase 12.E
  today: string
  projects: Project[]
}

type TabValue = 'active' | 'daily' | 'weekly' | 'inactive'

const TABS: { value: TabValue; label: string }[] = [
  { value: 'active',   label: 'Active' },
  { value: 'daily',    label: 'Daily' },
  { value: 'weekly',   label: 'Weekly' },
  { value: 'inactive', label: 'Inactive' },
]

function countForTab(habits: HabitRow[], value: TabValue): number {
  if (value === 'daily')    return habits.filter(h => h.is_active && h.frequency === 'daily').length
  if (value === 'weekly')   return habits.filter(h => h.is_active && h.frequency === 'weekly').length
  if (value === 'inactive') return habits.filter(h => !h.is_active).length
  return habits.filter(h => h.is_active).length
}

export function HabitsView({ habits, logsMap, freezeLogsMap, skipLogsMap, today, projects }: HabitsViewProps) {
  const [tab, setTab] = useState<TabValue>('active')

  const yesterday = shiftDate(today, -1)
  const hourNow = new Date().getHours()

  const filtered = habits.filter((h) => {
    if (tab === 'daily')    return h.is_active && h.frequency === 'daily'
    if (tab === 'weekly')   return h.is_active && h.frequency === 'weekly'
    if (tab === 'inactive') return !h.is_active
    return h.is_active
  })

  // Today's progress across all active habits
  const activeHabits = habits.filter(h => h.is_active)
  const completedTodayCount = activeHabits.filter(
    h => (logsMap[h.id] ?? []).includes(today)
  ).length
  const progressPct =
    activeHabits.length > 0
      ? Math.round((completedTodayCount / activeHabits.length) * 100)
      : 0
  const allDone = activeHabits.length > 0 && completedTodayCount === activeHabits.length

  return (
    <div className="space-y-5">
      {/* Today's progress */}
      {activeHabits.length > 0 && (
        <div className="rounded-xl border bg-card px-5 py-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Flame
                className={cn(
                  'h-4 w-4 transition-colors',
                  allDone ? 'text-orange-400' : 'text-muted-foreground/30'
                )}
              />
              <span className="text-sm font-semibold">Today&apos;s Progress</span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {completedTodayCount} of {activeHabits.length}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out',
                allDone ? 'bg-emerald-500' : 'bg-primary'
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {allDone && (
            <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-1.5 font-medium">
              All habits done for today!
            </p>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="rounded-xl border bg-card px-4 py-3">
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                tab === value
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {label}
              <span className="ml-1.5 tabular-nums opacity-60">
                {countForTab(habits, value)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Card grid or empty state */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Activity className="h-10 w-10 mb-3 opacity-20" />
          <p className="text-sm font-medium">
            {tab === 'inactive' ? 'No inactive habits.' : 'No habits here yet.'}
          </p>
          {tab === 'active' && (
            <p className="text-xs text-muted-foreground/60 mt-1">
              Create your first habit using the button above.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              logs={logsMap[habit.id] ?? []}
              freezeDates={freezeLogsMap[habit.id] ?? []}
              skipDates={skipLogsMap[habit.id] ?? []}
              isCompletedToday={(logsMap[habit.id] ?? []).includes(today)}
              today={today}
              yesterday={yesterday}
              hourNow={hourNow}
              projects={projects}
            />
          ))}
        </div>
      )}
    </div>
  )
}
