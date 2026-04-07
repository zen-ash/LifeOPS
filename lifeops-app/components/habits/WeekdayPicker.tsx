'use client'

import { cn } from '@/lib/utils'

export const WEEKDAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
] as const

/** Sort and format an array of day strings for display: ['mon','fri'] → 'Mon Fri' */
export function formatWeekdays(days: string[]): string {
  if (days.length === 0) return ''
  const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  return days
    .slice()
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
    .join(' ')
}

interface WeekdayPickerProps {
  selected: string[]
  onChange: (days: string[]) => void
}

/**
 * Toggle buttons for Mon–Sun. Hidden inputs emit `selected_weekdays` fields
 * into the parent FormData so server actions can read via getAll().
 */
export function WeekdayPicker({ selected, onChange }: WeekdayPickerProps) {
  function toggle(day: string) {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day))
    } else {
      onChange([...selected, day])
    }
  }

  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {WEEKDAYS.map(({ value, label }) => {
          const active = selected.includes(value)
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium border transition-all',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-accent'
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
      {/* Hidden inputs so FormData includes the selected values */}
      {selected.map((day) => (
        <input key={day} type="hidden" name="selected_weekdays" value={day} />
      ))}
    </div>
  )
}
