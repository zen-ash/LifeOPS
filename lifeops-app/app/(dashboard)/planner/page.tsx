import { createClient } from '@/lib/supabase/server'
import { PlannerView } from '@/components/planner/PlannerView'
import { BrainCircuit } from 'lucide-react'
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

  // Load the saved plan for this week (if any)
  const { data: savedRow } = await supabase
    .from('weekly_plans')
    .select('plan_json')
    .eq('user_id', user!.id)
    .eq('week_start_date', weekStart)
    .single()

  const savedPlan = (savedRow?.plan_json as GeneratedPlan) ?? null

  // Build week end label for display
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BrainCircuit className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">AI Planner</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Week of {weekStartLabel} – {weekEndLabel} ·{' '}
          <span className="text-foreground font-medium">
            {savedPlan ? 'Plan saved' : 'No saved plan'}
          </span>
        </p>
      </div>

      <PlannerView weekStart={weekStart} savedPlan={savedPlan} />
    </div>
  )
}
