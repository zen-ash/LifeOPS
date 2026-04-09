import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

// Zod schema for the generated weekly plan — must match GeneratedPlan in types/index.ts
const planSchema = z.object({
  weekStart: z.string().describe('ISO date string for Monday of this week (YYYY-MM-DD)'),
  days: z.array(
    z.object({
      day: z.string().describe('Day name, e.g. Monday'),
      focusBlock: z
        .string()
        .describe('A specific 1–2 hour focus activity for this day'),
      topTasks: z
        .array(z.string())
        .describe('2–3 concrete tasks from the task list that fit this day'),
      habitReminder: z
        .string()
        .describe('Which habits to prioritize today based on their schedule'),
      notes: z
        .string()
        .describe('One practical tip or motivational note for this day'),
    })
  ),
})

// Returns the ISO date string for Monday of the week containing `date`
function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export async function POST() {
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

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const weekStart = getMondayOfWeek(now)

  // Build week end date (Sunday)
  const weekEndDate = new Date(weekStart)
  weekEndDate.setDate(weekEndDate.getDate() + 6)
  const weekEnd = weekEndDate.toISOString().split('T')[0]

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const todayName = dayNames[now.getDay()]

  // Week boundaries for focus stats
  const weekStartISO = new Date(weekStart + 'T00:00:00Z').toISOString()

  // Fetch lightweight context in parallel — all scoped to the logged-in user
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

  const profile = profileResult.data
  const tasks = tasksResult.data ?? []
  const habits = habitsResult.data ?? []
  const focusSessions = focusResult.data ?? []

  const focusMinutesThisWeek = focusSessions.reduce(
    (sum, s) => sum + (s.actual_minutes ?? s.duration_minutes ?? 0),
    0
  )

  // Serialize context into readable text
  const taskContext =
    tasks.length === 0
      ? 'No incomplete tasks.'
      : tasks
          .map((t) => {
            const due = t.due_date ? ` (due ${t.due_date})` : ' (no due date)'
            return `- [${t.priority}] ${t.title}${due}`
          })
          .join('\n')

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

  const goalsText =
    profile?.goals?.length ? profile.goals.join(', ') : 'Not specified'
  const prioritiesText =
    profile?.priorities?.length ? profile.priorities.join(', ') : 'Not specified'
  const studyHours =
    profile?.study_hours_per_week != null
      ? `${profile.study_hours_per_week} hours`
      : 'Not specified'

  const systemPrompt = `You are a productivity planner for a university student named ${profile?.full_name ?? 'the student'}.

Today is ${todayName}, ${today}.
Plan the week from Monday ${weekStart} to Sunday ${weekEnd}.

## Student Profile
Goals: ${goalsText}
Priorities: ${prioritiesText}
Available study hours per week: ${studyHours}
Focus time logged so far this week: ${focusMinutesThisWeek} minutes

## Incomplete Tasks (sorted by priority and due date)
${taskContext}

## Active Habits
${habitContext}

## Planning Rules
- Assign tasks by their due dates — tasks due earlier in the week must appear in earlier days
- Spread work evenly — no day should have more than 3 tasks
- Weekend days (Saturday, Sunday) should be lighter: 1–2 tasks max, shorter focus blocks
- Reference the student's actual task titles and habit names directly — do not invent new ones
- focusBlock should name a specific topic or activity, not just "study"
- topTasks should be 2–3 items picked from the task list above, matching due date proximity
- habitReminder should name the specific habits scheduled for that day
- notes should be one practical, encouraging tip (1–2 sentences max)
- If tasks is empty, suggest general study or review blocks relevant to the student's goals`

  try {
    const { object: plan } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: planSchema,
      system: systemPrompt,
      prompt: `Generate a complete 7-day weekly plan for all 7 days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. Week starts ${weekStart}.`,
    })

    return Response.json({ plan })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/planner] generateObject error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
