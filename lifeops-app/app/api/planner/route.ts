import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/actions/activityLog'
import { TEMPLATE_BY_ID } from '@/lib/templates'
import type { GeneratedPlan, PlanDay } from '@/types'

export const maxDuration = 30

// V2 structured day schema — Phase 11.D
// tasks / habits / focus_blocks are separate arrays; rationale explains the scheduling decision.
const daySchema = z.object({
  day: z.string().describe('Day name, e.g. Monday'),
  focus_blocks: z
    .array(z.string())
    .describe(
      '1-2 specific focus work activities for this day. Use the actual task or course names — never just "study".'
    ),
  tasks: z
    .array(z.string())
    .describe(
      '2-3 task titles taken directly from the task list. Assign earlier-deadline tasks to earlier days.'
    ),
  habits: z
    .array(z.string())
    .describe(
      'Habit names the student should do today based on their frequency config. Daily habits appear every day; weekly habits only on their selected weekdays.'
    ),
  rationale: z
    .string()
    .describe(
      '1-2 sentences explaining why these specific tasks are assigned today. Reference actual due dates, priority levels, or goal alignment. No generic motivational filler.'
    ),
})

const planSchema = z.object({
  weekStart: z.string().describe('ISO date string for Monday of this week (YYYY-MM-DD)'),
  days: z.array(daySchema),
  // Phase 13.A: tasks explicitly deferred when the workload exceeds available time
  deferredTasks: z
    .array(z.string())
    .optional()
    .describe(
      'Task titles that cannot be scheduled this week because the available time is genuinely full. Only populate this when tasks truly cannot fit. Each entry is a task title string. Omit or leave empty when all tasks are scheduled.'
    ),
})

// Ordered day names for rebuild-rest-of-week range computation
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Returns the ISO date string for Monday of the week containing `date`
function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

// Serialize a day from an existing plan into a compact summary string for context passing
function serializeDaySummary(d: PlanDay): string {
  const tasks = d.tasks ?? d.topTasks ?? []
  const habits = d.habits ?? (d.habitReminder ? [d.habitReminder] : [])
  const focusBlocks = d.focus_blocks ?? (d.focusBlock ? [d.focusBlock] : [])
  const parts: string[] = []
  if (focusBlocks.length) parts.push(`Focus: ${focusBlocks.join('; ')}`)
  if (tasks.length) parts.push(`Tasks: ${tasks.join(', ')}`)
  if (habits.length) parts.push(`Habits: ${habits.join(', ')}`)
  return parts.join(' | ')
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: 'OPENAI_API_KEY is not configured on this server.' },
      { status: 500 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse optional body — default to full-week generation
  const body = await req.json().catch(() => ({}))
  const mode: 'full' | 'rebuild_day' | 'rebuild_rest_of_week' = body.mode ?? 'full'
  const targetDay: string | undefined = body.targetDay
  const currentPlan: GeneratedPlan | undefined = body.currentPlan
  // Phase 12.B: optional template id — resolved to planning_emphasis text
  const templateId: string | undefined = body.templateId
  const template = templateId ? TEMPLATE_BY_ID[templateId] : undefined

  // Phase 13.A: optional repair context from the client's realism computation
  const repairContext: {
    overloadedDays?: string[]
    atRiskTaskTitles?: string[]
    availableMinutesPerDay?: number
  } | undefined = body.repairContext

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const weekStart = getMondayOfWeek(now)

  const weekEndDate = new Date(weekStart)
  weekEndDate.setDate(weekEndDate.getDate() + 6)
  const weekEnd = weekEndDate.toISOString().split('T')[0]

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const todayName = dayNames[now.getDay()]
  const todayIndex = DAY_ORDER.indexOf(todayName) // -1 if somehow not found

  const weekStartISO = new Date(weekStart + 'T00:00:00Z').toISOString()

  // Build remaining / past day lists for rebuild modes
  const remainingDays =
    todayIndex >= 0 ? DAY_ORDER.slice(todayIndex) : DAY_ORDER
  const pastDays =
    todayIndex > 0 ? DAY_ORDER.slice(0, todayIndex) : []

  // Fetch user context in parallel — always needed
  const [profileResult, tasksResult, habitsResult, focusResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, goals, priorities, study_hours_per_week')
      .eq('id', user.id)
      .single(),
    supabase
      .from('tasks')
      .select('title, priority, due_date, status')
      .eq('user_id', user.id)
      .in('status', ['todo', 'in_progress'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(20),
    supabase
      .from('habits')
      .select('title, frequency, selected_weekdays')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(10),
    supabase
      .from('focus_sessions')
      .select('actual_minutes, duration_minutes')
      .eq('user_id', user.id)
      .gte('started_at', weekStartISO),
  ])

  // For rebuild modes: also fetch overdue / slipped tasks to surface in the repair prompt
  let overdueTasksText = ''
  if (mode !== 'full') {
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('title, priority, due_date')
      .eq('user_id', user.id)
      .in('status', ['todo', 'in_progress'])
      .lt('due_date', today)
      .order('due_date', { ascending: true })
      .limit(8)

    overdueTasksText =
      overdueTasks && overdueTasks.length > 0
        ? `## Overdue / Slipped Tasks (must be rescheduled this week)\n${overdueTasks.map((t) => `- [${t.priority}] ${t.title} (was due ${t.due_date})`).join('\n')}`
        : '## Overdue Tasks\nNone.'
  }

  const profile = profileResult.data
  const tasks = tasksResult.data ?? []
  const habits = habitsResult.data ?? []
  const focusSessions = focusResult.data ?? []

  const focusMinutesThisWeek = focusSessions.reduce(
    (sum, s) => sum + (s.actual_minutes ?? s.duration_minutes ?? 0),
    0
  )

  // Serialize task context
  const taskContext =
    tasks.length === 0
      ? 'No incomplete tasks.'
      : tasks
          .map((t) => {
            const due = t.due_date ? ` (due ${t.due_date})` : ' (no due date)'
            return `- [${t.priority}] ${t.title}${due}`
          })
          .join('\n')

  // Serialize habit context including weekday schedules
  const habitContext =
    habits.length === 0
      ? 'No active habits.'
      : habits
          .map((h) => {
            const days =
              h.frequency === 'daily'
                ? 'every day'
                : h.selected_weekdays?.length
                ? h.selected_weekdays.join(', ')
                : 'weekly'
            return `- ${h.title} (${days})`
          })
          .join('\n')

  const goalsText = profile?.goals?.length ? profile.goals.join(', ') : 'Not specified'
  const prioritiesText = profile?.priorities?.length ? profile.priorities.join(', ') : 'Not specified'
  const studyHours =
    profile?.study_hours_per_week != null
      ? `${profile.study_hours_per_week} hours`
      : 'Not specified'

  // Build mode-specific context block for the system prompt
  let modeContext = ''
  if (mode === 'rebuild_day' && targetDay) {
    const otherDays = (currentPlan?.days ?? []).filter((d) => d.day !== targetDay)
    const otherDaysText =
      otherDays.length > 0
        ? otherDays.map((d) => `- ${d.day}: ${serializeDaySummary(d)}`).join('\n')
        : 'No other days in plan.'

    modeContext = `
## Rebuild Mode: Single Day
You are repairing ONLY ${targetDay}. Generate exactly 1 day in your response: ${targetDay}.
Do not generate any other days.

## Other Days Already Planned (for context only — do not change):
${otherDaysText}

${overdueTasksText}

Prioritize overdue tasks when assigning work to ${targetDay}.`
  } else if (mode === 'rebuild_rest_of_week') {
    const pastDayPlans = (currentPlan?.days ?? []).filter((d) => pastDays.includes(d.day))
    const pastDaysText =
      pastDayPlans.length > 0
        ? pastDayPlans.map((d) => `- ${d.day}: ${serializeDaySummary(d)}`).join('\n')
        : 'No past days recorded.'

    modeContext = `
## Rebuild Mode: Rest of Week
You are repairing the plan from today (${todayName}) through Sunday.
Generate ONLY these ${remainingDays.length} days: ${remainingDays.join(', ')}.
Do not generate any other days.

## Past Days Already Completed (for context only — do not generate):
${pastDaysText}

${overdueTasksText}

Distribute overdue tasks across ${remainingDays.filter((d) => !['Saturday', 'Sunday'].includes(d)).join(', ')} — keep weekends lighter.`
  }

  // Phase 12.B: template emphasis block — injected only when a template is selected
  const templateSection = template
    ? `\n## Weekly Template: ${template.title}\nThis plan is optimised for a "${template.title}" week. Apply the following emphasis throughout:\n${template.planning_emphasis}\n`
    : ''

  // Phase 13.A: repair context block — injected when client detects overload or deadline risk
  const repairSection = repairContext
    ? `
## Workload Realism Warning — Read Before Planning
Available time per weekday: ~${repairContext.availableMinutesPerDay ?? 360} minutes.
Each task = ~30 min; each focus block = ~45 min. A typical day fits 2-3 tasks and 1-2 focus blocks.
${repairContext.overloadedDays?.length ? `Days flagged as overloaded: ${repairContext.overloadedDays.join(', ')}.` : ''}
${
  repairContext.atRiskTaskTitles?.length
    ? `Deadline-risk tasks (due within 3 days — prioritise these FIRST):\n${repairContext.atRiskTaskTitles.map((t) => `- ${t}`).join('\n')}`
    : ''
}

Repair rules:
- Schedule deadline-risk tasks in the nearest available day first.
- Keep each day within the available time limit — reduce tasks or focus blocks if needed.
- If the remaining workload genuinely cannot fit the remaining days, place the lowest-priority, undated tasks in the top-level deferredTasks array.
- Every pending task must appear EITHER in a day's tasks array OR in deferredTasks — never silently omit a task.
`
    : ''

  const systemPrompt = `You are a productivity planner for a university student named ${profile?.full_name ?? 'the student'}.

Today is ${todayName}, ${today}.
Plan the week from Monday ${weekStart} to Sunday ${weekEnd}.

## Student Profile
Goals: ${goalsText}
Priorities: ${prioritiesText}
Available study hours per week: ${studyHours}
Focus time logged so far this week: ${focusMinutesThisWeek} minutes

## Incomplete Tasks (sorted by due date — assign earlier-deadline tasks to earlier days)
${taskContext}

## Active Habits (with their schedule)
${habitContext}
${modeContext}${templateSection}${repairSection}
## Planning Rules
- tasks: Pick 2-3 task titles directly from the task list above. Match due date order — earlier deadlines go to earlier days. Use the exact task title.
- focus_blocks: 1-2 specific work activities (name the actual subject or project, not just "study" or "work").
- habits: List only habits actually scheduled today based on their frequency (daily = every day; weekly = only on their named weekdays).
- rationale: 1-2 sentences explaining why these tasks are here today — reference due dates, priorities, or goals. No generic motivational advice.
- Weekend days: tasks max 2, focus_blocks max 1, lighter load overall.
- Do not invent tasks or habits that are not in the lists above.`

  // Build the generation prompt based on mode
  let generationPrompt: string
  if (mode === 'rebuild_day' && targetDay) {
    generationPrompt = `Repair the plan for ${targetDay} only. Return exactly 1 day object: ${targetDay}.`
  } else if (mode === 'rebuild_rest_of_week') {
    generationPrompt = `Repair the plan from ${todayName} through Sunday. Return exactly ${remainingDays.length} days: ${remainingDays.join(', ')}.`
  } else {
    generationPrompt = `Generate a complete 7-day weekly plan for all 7 days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. Week starts ${weekStart}.`
  }

  try {
    const { object: plan } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: planSchema,
      system: systemPrompt,
      prompt: generationPrompt,
    })

    await logEvent(supabase, user.id, {
      event_type: 'plan_generated',
      entity_type: 'weekly_plan',
      payload: { week_start: weekStart, mode, template_id: templateId ?? null },
    })

    return Response.json({ plan })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/planner] generateObject error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
