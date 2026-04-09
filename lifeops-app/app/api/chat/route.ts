import { streamText, tool } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  // Verify OPENAI_API_KEY is present before doing any work
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

  const today = new Date().toISOString().split('T')[0]

  // Fetch lightweight user context in parallel — all scoped to the logged-in user
  const [profileResult, tasksResult, habitsResult, habitLogsResult] = await Promise.all([
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
      .limit(15),
    supabase
      .from('habits')
      .select('id, title, frequency')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(10),
    supabase
      .from('habit_logs')
      .select('habit_id')
      .eq('user_id', user.id)
      .eq('logged_date', today),
  ])

  const profile = profileResult.data
  const tasks = tasksResult.data ?? []
  const habits = habitsResult.data ?? []
  const completedHabitIds = new Set(
    (habitLogsResult.data ?? []).map((l) => l.habit_id)
  )

  // Serialize context into plain text for the system prompt
  const taskContext =
    tasks.length === 0
      ? 'No incomplete tasks.'
      : tasks
          .map((t) => {
            const due = t.due_date ? ` (due ${t.due_date})` : ''
            return `- [${t.priority}] ${t.title}${due} [${t.status}]`
          })
          .join('\n')

  const habitContext =
    habits.length === 0
      ? 'No active habits.'
      : habits
          .map((h) => {
            const done = completedHabitIds.has(h.id) ? '✓' : '○'
            return `${done} ${h.title} (${h.frequency})`
          })
          .join('\n')

  const goalsText =
    profile?.goals?.length ? profile.goals.join(', ') : 'Not set'
  const prioritiesText =
    profile?.priorities?.length ? profile.priorities.join(', ') : 'Not set'
  const studyHours =
    profile?.study_hours_per_week != null
      ? `${profile.study_hours_per_week} hours/week`
      : 'Not set'

  const systemPrompt = `You are LifeOPS AI, a personal productivity coach for ${profile?.full_name ?? 'a student'}.

Today's date: ${today}

## User Context

### Goals
${goalsText}

### Priorities
${prioritiesText}

### Study Hours Per Week
${studyHours}

### Incomplete Tasks (up to 15, sorted by due date)
${taskContext}

### Today's Habits
${habitContext}

## Instructions
- Give practical, grounded advice based only on the user context above.
- Be concise and direct — bullet points where appropriate, not long essays.
- If the user asks you to create or schedule a task, use the create_task tool. Confirm the details before creating if ambiguous.
- Only invoke create_task when the user explicitly requests it.
- Do not invent tasks or goals beyond what is provided.
- When referencing tasks or habits, use the exact names from the context.`

  const body = await req.json()
  const messages = body.messages ?? []

  try {
    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages,
      tools: {
        create_task: tool({
          description:
            'Create a new task in LifeOPS for the user. Only call this when the user explicitly asks to create or schedule a task.',
          parameters: z.object({
            title: z
              .string()
              .min(1)
              .max(255)
              .describe('The task title — clear and actionable'),
            priority: z
              .enum(['low', 'medium', 'high', 'urgent'])
              .default('medium')
              .describe('Task priority'),
            due_date: z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/)
              .nullable()
              .optional()
              .describe('Due date in YYYY-MM-DD format, or null if not specified'),
          }),
          execute: async ({ title, priority, due_date }) => {
            const { data, error } = await supabase
              .from('tasks')
              .insert({
                user_id: user.id,
                title: title.trim(),
                priority,
                due_date: due_date ?? null,
                status: 'todo',
              })
              .select('id, title, priority, due_date')
              .single()

            if (error) return { success: false, error: error.message }
            return { success: true, task: data }
          },
        }),
      },
      // Allow up to 3 steps: user turn → tool call → tool result → final text
      maxSteps: 3,
    })

    return result.toDataStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/chat] streamText error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
