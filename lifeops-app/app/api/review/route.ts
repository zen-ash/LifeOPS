import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { WeeklyMetrics } from '@/types'

export const maxDuration = 30

const reviewSummarySchema = z.object({
  summary: z
    .string()
    .describe('2-3 sentence overview of how the week went, grounded in the actual data'),
  topWin: z
    .string()
    .describe('The biggest win or accomplishment this week (1 sentence, specific)'),
  topLearning: z
    .string()
    .describe('The most important insight or pattern from this week (1 sentence, specific)'),
  nextWeekFocus: z
    .string()
    .describe('The single most important thing to focus on or change next week (1-2 sentences)'),
})

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

  const body = await req.json()
  const metrics: WeeklyMetrics = body.metrics
  const weekStart: string = body.weekStart
  const weekEnd: string = body.weekEnd

  const completedText =
    metrics.completedTasks.length === 0
      ? 'No tasks completed.'
      : metrics.completedTasks.map((t) => `- [${t.priority}] ${t.title}`).join('\n')

  const missedText =
    metrics.missedTasks.length === 0
      ? 'No missed tasks.'
      : metrics.missedTasks.map((t) => `- [${t.priority}] ${t.title}`).join('\n')

  const habitText =
    metrics.habitConsistency.length === 0
      ? 'No habits tracked.'
      : metrics.habitConsistency
          .map(
            (h) =>
              `- ${h.habitTitle}: ${h.logsCount}/${h.expectedDays} days (${Math.round(h.percentage * 100)}%)`
          )
          .join('\n')

  const energyText =
    metrics.energySummary.length === 0
      ? 'No daily shutdowns recorded this week.'
      : metrics.energySummary.map((e) => `- ${e.date}: ${e.energy ?? 'not recorded'}`).join('\n')

  const prompt = `Weekly review for the week of ${weekStart} to ${weekEnd}.

## Stats
- Focus time: ${metrics.focusMinutes} minutes
- Tasks completed: ${metrics.completedTaskCount}
- Tasks missed (due but not done): ${metrics.missedTaskCount}
- Days with daily shutdown: ${metrics.shutdownDays}/7

## Completed Tasks
${completedText}

## Missed Tasks
${missedText}

## Habit Consistency
${habitText}

## Daily Energy Levels
${energyText}

Generate a grounded weekly review for this student based strictly on the data above.`

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: reviewSummarySchema,
      system: `You are LifeOPS AI, a personal productivity coach. Generate a specific, grounded weekly review based strictly on the user's actual data. Reference specific task and habit names when relevant. Be direct and encouraging but honest about gaps. Do not give generic advice — base everything on the numbers provided.`,
      prompt,
    })

    return Response.json({ summary: object })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/review] generateObject error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
