// Phase 15.C: Co-Pilot natural-language command parsing.
//
// This route ONLY parses the user's intent into a structured tool call.
// It NEVER executes mutations. The client shows a preview and confirms
// before calling server actions.
//
// Flow:
//   1. Auth check
//   2. Fetch active tasks (max 15) for context — gives model real IDs + titles
//   3. Call OpenAI via Vercel AI SDK generateText with strict tool definitions
//   4. Return { tool, args } — client renders preview, user confirms execution

import { generateText, tool } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 15

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 500 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not authenticated.' }, { status: 401 })

  // ── Parse request body ────────────────────────────────────────────────────
  // Client sends localDate + localDayName + timezone — captured at click time
  // so relative phrases like "tomorrow" resolve to the user's local date, not
  // the server's UTC date.
  let prompt: string
  let localDate: string     // YYYY-MM-DD in user's local TZ
  let localDayName: string  // 'Monday', 'Tuesday', …
  let timezone: string      // IANA TZ, e.g. 'America/New_York'
  try {
    const body = await req.json()
    prompt      = String(body.prompt ?? '').trim()
    localDate   = String(body.localDate ?? '')
    localDayName = String(body.localDayName ?? '')
    timezone    = String(body.timezone ?? 'UTC')
    if (!prompt || !localDate || !localDayName) throw new Error('missing fields')
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // ── Fetch active tasks for context ────────────────────────────────────────
  // Capped at 15 to keep the token payload small. Ordered by due date so the
  // model can reason about which tasks are most urgent to reschedule.
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, due_date, priority')
    .eq('user_id', user.id)
    .in('status', ['todo', 'in_progress'])
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(15)

  const taskContext =
    tasks && tasks.length > 0
      ? tasks
          .map(
            (t) =>
              `- id:${t.id} | "${t.title}" | priority:${t.priority} | due:${t.due_date ?? 'none'}`
          )
          .join('\n')
      : 'No active tasks.'

  const systemPrompt = `You are a productivity assistant for a student using LifeOPS.
Today is ${localDayName}, ${localDate} (timezone: ${timezone}).
Use this as the reference for any relative phrases like "tomorrow", "next Friday", "this weekend".
Always output dates as YYYY-MM-DD — never relative strings.

The user's current active tasks (use these IDs and titles exactly — do not invent or modify them):
${taskContext}

Your job: parse the user's command into exactly ONE structured tool call.
Pick the single most appropriate tool. If the intent is ambiguous, make a reasonable best-guess.`

  // ── Call OpenAI with strict tool definitions ──────────────────────────────
  // toolChoice: 'required' guarantees the model always calls a tool instead of
  // returning free text. maxSteps: 1 prevents recursive/chained tool calls.
  try {
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt,
      toolChoice: 'required',
      maxSteps: 1,
      tools: {
        create_task: tool({
          description:
            'Create a new task. Use when the user says things like "add a task", "remind me to", "create a to-do for".',
          parameters: z.object({
            title: z
              .string()
              .describe('Concise, actionable task title.'),
            priority: z
              .enum(['low', 'medium', 'high', 'urgent'])
              .describe('Task priority. Default to "medium" if not specified.'),
            due_date: z
              .string()
              .nullable()
              .describe('Due date in YYYY-MM-DD format, or null if not stated.'),
            estimated_minutes: z
              .number()
              .int()
              .nullable()
              .describe('Estimated time in minutes, or null if not stated.'),
          }),
        }),

        reschedule_tasks: tool({
          description:
            'Move one or more existing tasks to a new due date. Use when the user says "reschedule", "push", "move", "delay", or "defer" tasks.',
          parameters: z.object({
            task_ids: z
              .array(z.string())
              .describe(
                'IDs of the tasks to reschedule. Must come from the active task list provided — never fabricate IDs.'
              ),
            task_titles: z
              .array(z.string())
              .describe(
                'Titles of the tasks (for preview display). Must match the titles from the task list exactly.'
              ),
            new_date: z
              .string()
              .describe('The new due date in YYYY-MM-DD format.'),
          }),
        }),
      },
    })

    const toolCall = result.toolCalls?.[0]
    if (!toolCall) {
      return Response.json({
        error: 'Could not parse that command. Try being more specific — e.g. "Create a task to finish the report by Friday".',
      })
    }

    // Return structured payload — client preview + confirm before execution
    return Response.json({ tool: toolCall.toolName, args: toolCall.args })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/copilot] error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
