import { createClient } from '@/lib/supabase/server'
import { PlannerView } from '@/components/planner/PlannerView'
import { BrainCircuit, CalendarDays } from 'lucide-react'
import type { GeneratedPlan } from '@/types'

// Returns ISO date string for Monday of the week containing `date`
function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export default async function PlannerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const weekStart = getMondayOfWeek(new Date())

  const { data: savedRow } = await supabase
    .from('weekly_plans')
    .select('plan_json')
    .eq('user_id', user!.id)
    .eq('week_start_date', weekStart)
    .single()

  const savedPlan = (savedRow?.plan_json as GeneratedPlan) ?? null

  const weekEndDate = new Date(weekStart)
  weekEndDate.setDate(weekEndDate.getDate() + 6)
  const weekEndLabel = weekEndDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const weekStartLabel = new Date(weekStart).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="rounded-xl border bg-card px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <BrainCircuit className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-tight">AI Planner</h1>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              Personalised weekly plan based on your tasks, habits & goals
            </p>
          </div>
        </div>

        {/* Week range + save status */}
        <div className="flex items-center gap-2.5 text-sm shrink-0">
          <CalendarDays className="h-4 w-4 text-muted-foreground/60" />
          <span className="text-muted-foreground text-xs">
            {weekStartLabel} – {weekEndLabel}
          </span>
          <span
            className={
              savedPlan
                ? 'text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20'
                : 'text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border/50'
            }
          >
            {savedPlan ? 'Saved' : 'No plan'}
          </span>
        </div>
      </div>

      <PlannerView weekStart={weekStart} savedPlan={savedPlan} />
    </div>
  )
}
