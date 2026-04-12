// Phase 12.B: Static planner template definitions.
// Each template guides the AI's planning_emphasis — injected into the system prompt
// so the generated tasks, habits, and focus blocks reflect the chosen weekly mode.
// Never modify individual saved plans; the template only affects generation.

export interface PlannerTemplate {
  id: string
  title: string
  description: string       // 1-2 sentences shown in the picker card
  planning_emphasis: string // injected verbatim into the AI system prompt
  focus_areas: string[]     // shown as pills in the picker card (3 max)
  accentColor: string       // Tailwind color stem: 'orange' | 'blue' | 'violet' | 'emerald' | 'rose' | 'amber'
}

export const PLANNER_TEMPLATES: PlannerTemplate[] = [
  {
    id: 'exam_prep',
    title: 'Exam Prep Week',
    description:
      'Cram mode — heavy review sessions, active recall every day, and habits that protect performance under pressure.',
    planning_emphasis:
      'Schedule 2–3 long review sessions per day on exam topics. Front-load the hardest or highest-stakes subjects to Monday and Tuesday when mental energy is highest. Include daily active recall or practice problems as a dedicated focus block. Treat sleep routine and light exercise as non-negotiable — they are performance multipliers during exam week. Aggressively de-prioritize non-urgent tasks; mention them only at the end of the week or skip them entirely.',
    focus_areas: ['Deep review', 'Active recall', 'Sleep + recovery'],
    accentColor: 'orange',
  },
  {
    id: 'internship_hunt',
    title: 'Internship Hunt Sprint',
    description:
      'Treat every weekday like a job-search workday — applications, research, interview prep, and portfolio polish.',
    planning_emphasis:
      'Treat each weekday as a structured job-search workday. Schedule at least one job application or company research block per weekday. Include interview prep (behavioral questions, technical practice, portfolio work) as a dedicated focus block 3–4 days per week. Assign LinkedIn / networking outreach as a recurring daily task. Keep academic or personal tasks present but weighted lighter than the search process.',
    focus_areas: ['Applications', 'Interview prep', 'Networking'],
    accentColor: 'blue',
  },
  {
    id: 'coding_interview',
    title: 'Coding Interview Prep',
    description:
      'Structured like a mini bootcamp — daily algorithm practice, progressive topic coverage, and mock interviews.',
    planning_emphasis:
      'Structure the week as an interview bootcamp. Schedule 1–2 hours of LeetCode / algorithm practice as a required daily focus block. Assign data-structure and algorithm topics progressively across the week: arrays and strings on Monday, linked lists and trees mid-week, graphs and dynamic programming Thursday–Friday. Include at least one timed mock problem set or behavioral prep session. Add system-design reading or review on Thursday or Friday.',
    focus_areas: ['DSA practice', 'Mock interviews', 'System design'],
    accentColor: 'violet',
  },
  {
    id: 'deep_work',
    title: 'Deep Work Week',
    description:
      'Maximum focus depth — long uninterrupted blocks, one major task per day, and no shallow-work creep.',
    planning_emphasis:
      'Maximize long, uninterrupted focus blocks (aim for 90–120 minutes minimum per block). Assign only 1–2 major tasks per day — depth over breadth. Schedule the most cognitively demanding focus block in the morning. Group all reactive or administrative tasks into a single short daily slot (15–30 minutes). Protect at least one full-day block for the single most important project this week.',
    focus_areas: ['Long focus blocks', 'Single-task work', 'Minimal admin'],
    accentColor: 'emerald',
  },
  {
    id: 'gym_study',
    title: 'Gym + Study Balance',
    description:
      'Structured workouts anchored around productive study blocks — rest days planned, energy levels respected.',
    planning_emphasis:
      'Schedule morning workouts (Mon / Wed / Fri or Mon–Wed–Fri–Sat) as the first event of the day so they do not get dropped. Immediately after each workout, assign a lighter study or review slot to leverage the post-exercise focus window. Reserve the peak cognitive hours after workout recovery for the most demanding focus work. Keep workout-day evenings light. Plan active recovery (walk, stretch, yoga) as a habit on rest days.',
    focus_areas: ['Morning workouts', 'Peak-window study', 'Active recovery'],
    accentColor: 'rose',
  },
  {
    id: 'side_project',
    title: 'Side-Project Launch',
    description:
      'Ship-mode week — daily build sessions, concrete milestones per day, and momentum through visible progress.',
    planning_emphasis:
      'Treat the side project as the primary deliverable this week. Schedule a daily coding or building session as the first focus block. Break the project into concrete shippable milestones and assign each to a specific day. Include a brief demo or review session on Friday. Keep other tasks and habits present but clearly subordinate to the build sprint. End of week goal: ship something real — even if imperfect.',
    focus_areas: ['Daily build sessions', 'Milestone delivery', 'Friday demo'],
    accentColor: 'amber',
  },
]

// Convenience lookup by id
export const TEMPLATE_BY_ID = Object.fromEntries(
  PLANNER_TEMPLATES.map((t) => [t.id, t])
) as Record<string, PlannerTemplate>
