'use client'

import { useState } from 'react'
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Moon,
  Sparkles,
  Loader2,
  Trophy,
  BookOpen,
  ArrowRight,
  Pencil,
  Zap,
  Minus,
  Battery,
} from 'lucide-react'
import { saveWeeklyReview } from '@/lib/actions/review'
import type { WeeklyMetrics, ReviewAISummary, WeeklyReview } from '@/types'

// Priority badge colour map — matches the rest of the app
const PRIORITY_CLASSES: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-600 dark:text-red-400',
  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  medium: 'bg-yellow-500/10 text-yellow-500',
  low: 'bg-muted text-muted-foreground',
}

const ENERGY_CONFIG = {
  high: { label: 'High', icon: Zap, cls: 'text-green-500' },
  medium: { label: 'Medium', icon: Minus, cls: 'text-yellow-500' },
  low: { label: 'Low', icon: Battery, cls: 'text-red-400' },
} as const

interface ReviewViewProps {
  weekStart: string
  weekEnd: string
  metrics: WeeklyMetrics
  existingReview: WeeklyReview | null
}

export function ReviewView({ weekStart, weekEnd, metrics, existingReview }: ReviewViewProps) {
  const [aiSummary, setAiSummary] = useState<ReviewAISummary | null>(
    existingReview?.ai_summary ?? null
  )
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [reflection, setReflection] = useState(existingReview?.reflection ?? '')
  const [saving, setSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(!!existingReview)

  async function handleGenerateSummary() {
    setGeneratingSummary(true)
    setSummaryError(null)
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics, weekStart, weekEnd }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setSummaryError(json.error ?? 'Failed to generate summary')
      } else {
        setAiSummary(json.summary as ReviewAISummary)
        setIsSaved(false)
      }
    } catch {
      setSummaryError('Network error — please try again')
    } finally {
      setGeneratingSummary(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    const result = await saveWeeklyReview({
      weekStart,
      weekEnd,
      metricsJson: metrics,
      aiSummary,
      reflection,
    })
    setSaving(false)
    if (!result.error) {
      setIsSaved(true)
    }
  }

  const overallHabitPct =
    metrics.habitConsistency.length === 0
      ? null
      : Math.round(
          (metrics.habitConsistency.reduce((s, h) => s + h.percentage, 0) /
            metrics.habitConsistency.length) *
            100
        )

  return (
    <div className="space-y-4">
      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Clock}
          label="Focus time"
          value={
            metrics.focusMinutes >= 60
              ? `${Math.floor(metrics.focusMinutes / 60)}h ${metrics.focusMinutes % 60}m`
              : `${metrics.focusMinutes}m`
          }
        />
        <StatCard
          icon={CheckCircle2}
          label="Tasks done"
          value={String(metrics.completedTaskCount)}
        />
        <StatCard
          icon={Activity}
          label="Habit rate"
          value={overallHabitPct !== null ? `${overallHabitPct}%` : '—'}
        />
        <StatCard
          icon={Moon}
          label="Shutdowns"
          value={`${metrics.shutdownDays}/7`}
        />
      </div>

      {/* ── Planned vs Actual ─────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card px-5 py-4 space-y-3 animate-fade-in-up">
        <p className="text-sm font-semibold">Planned vs Actual</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Planned */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Planned ({metrics.plannedTaskTitles.length})
            </p>
            {metrics.plannedTaskTitles.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No plan generated this week</p>
            ) : (
              <ul className="space-y-1">
                {metrics.plannedTaskTitles.map((title, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/50" />
                    {title}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Completed */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Completed ({metrics.completedTaskCount})
            </p>
            {metrics.completedTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No tasks completed this week</p>
            ) : (
              <ul className="space-y-1">
                {metrics.completedTasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-green-500" />
                    <span className="flex-1 leading-snug">{t.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${PRIORITY_CLASSES[t.priority] ?? PRIORITY_CLASSES.low}`}
                    >
                      {t.priority}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── Missed tasks ──────────────────────────────────────────────── */}
      {metrics.missedTasks.length > 0 && (
        <div className="rounded-xl border bg-card px-5 py-4 space-y-3 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
            <p className="text-sm font-semibold">Missed This Week ({metrics.missedTaskCount})</p>
          </div>
          <ul className="space-y-1.5">
            {metrics.missedTasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/40 border border-border/40"
              >
                <span className="flex-1 text-xs leading-snug">{t.title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${PRIORITY_CLASSES[t.priority] ?? PRIORITY_CLASSES.low}`}
                >
                  {t.priority}
                </span>
                {t.due_date && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    due {t.due_date}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Habit consistency ─────────────────────────────────────────── */}
      {metrics.habitConsistency.length > 0 && (
        <div className="rounded-xl border bg-card px-5 py-4 space-y-3 animate-fade-in-up">
          <p className="text-sm font-semibold">Habit Consistency</p>
          <ul className="space-y-3">
            {metrics.habitConsistency.map((h) => (
              <li key={h.habitId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{h.habitTitle}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {h.logsCount}/{h.expectedDays} days ({Math.round(h.percentage * 100)}%)
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(h.percentage * 100)}%`,
                      backgroundColor:
                        h.percentage >= 0.8
                          ? 'hsl(var(--primary))'
                          : h.percentage >= 0.5
                          ? '#eab308'
                          : '#f97316',
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Daily energy (from shutdowns) ─────────────────────────────── */}
      {metrics.energySummary.length > 0 && (
        <div className="rounded-xl border bg-card px-5 py-4 space-y-3 animate-fade-in-up">
          <p className="text-sm font-semibold">Daily Energy</p>
          <div className="flex flex-wrap gap-2">
            {metrics.energySummary.map((e) => {
              const cfg =
                e.energy && e.energy in ENERGY_CONFIG
                  ? ENERGY_CONFIG[e.energy as keyof typeof ENERGY_CONFIG]
                  : null
              const Icon = cfg?.icon ?? Minus
              return (
                <div
                  key={e.date}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/40"
                >
                  <Icon className={`h-3 w-3 shrink-0 ${cfg?.cls ?? 'text-muted-foreground'}`} />
                  <span className="text-[11px] font-medium">{e.date}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {cfg?.label ?? 'Not set'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── AI Weekly Summary ─────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card px-5 py-4 space-y-3 animate-fade-in-up">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm font-semibold">AI Weekly Summary</p>
          </div>
          {aiSummary && (
            <button
              onClick={handleGenerateSummary}
              disabled={generatingSummary}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <Pencil className="h-3 w-3" />
              Regenerate
            </button>
          )}
        </div>

        {aiSummary ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">{aiSummary.summary}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <AISummaryCard
                icon={Trophy}
                label="Top Win"
                text={aiSummary.topWin}
                colorClass="text-green-500"
              />
              <AISummaryCard
                icon={BookOpen}
                label="Key Learning"
                text={aiSummary.topLearning}
                colorClass="text-blue-500"
              />
              <AISummaryCard
                icon={ArrowRight}
                label="Next Week"
                text={aiSummary.nextWeekFocus}
                colorClass="text-primary"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs text-muted-foreground">
              Generate an AI summary of your week — wins, learnings, and what to focus on next.
            </p>
            {summaryError && (
              <p className="text-xs text-red-500">{summaryError}</p>
            )}
            <button
              onClick={handleGenerateSummary}
              disabled={generatingSummary}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {generatingSummary ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate AI Summary
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Your reflection + save ────────────────────────────────────── */}
      <div className="rounded-xl border bg-card px-5 py-4 space-y-3 animate-fade-in-up">
        <p className="text-sm font-semibold">Your Reflection</p>
        <textarea
          value={reflection}
          onChange={(e) => {
            setReflection(e.target.value)
            setIsSaved(false)
          }}
          placeholder="What would you change next week? Any adjustments to your plan or habits?"
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Review'
            )}
          </button>
          {isSaved && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Small helper sub-components ───────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
      <p className="text-lg font-bold tracking-tight">{value}</p>
    </div>
  )
}

function AISummaryCard({
  icon: Icon,
  label,
  text,
  colorClass,
}: {
  icon: React.ElementType
  label: string
  text: string
  colorClass: string
}) {
  return (
    <div className="rounded-lg bg-muted/30 border border-border/40 px-3 py-2.5 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${colorClass}`} />
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
      </div>
      <p className="text-xs leading-relaxed">{text}</p>
    </div>
  )
}
