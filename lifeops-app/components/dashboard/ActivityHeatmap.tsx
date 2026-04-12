import { Activity } from 'lucide-react'

export type HeatmapDay = { date: string; count: number }

// Tailwind static strings — must be explicit so JIT includes them
function cellColor(count: number): string {
  if (count === 0) return 'bg-muted/50'
  if (count <= 2)  return 'bg-primary/25'
  if (count <= 5)  return 'bg-primary/55'
  return 'bg-primary/85'
}

function formatTitle(date: string, count: number): string {
  const label = new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  if (count === 0) return `${label} · No activity`
  return `${label} · ${count} ${count === 1 ? 'activity' : 'activities'}`
}

// Row 0 = Sun, 1 = Mon, …, 6 = Sat. Show Mon and Thu only to keep it compact.
const ROW_LABELS = ['', 'Mon', '', '', 'Thu', '', '']

// Grid height in px. Row height ≈ (GRID_H - 6 gaps × 2px) / 7 ≈ 10.9px per row.
const GRID_H = 88
const GAP = 2

export function ActivityHeatmap({ days }: { days: HeatmapDay[] }) {
  // weekCount drives how many 1fr columns the grid creates.
  // Computed from the data so the component works for any window length.
  const weekCount = Math.ceil(days.length / 7)

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground/60" />
          <span className="text-sm font-semibold">Activity</span>
          <span className="text-[11px] text-muted-foreground/50">last 52 weeks</span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
          <span>Less</span>
          <div className="flex gap-0.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-muted/50" />
            <div className="h-2.5 w-2.5 rounded-sm bg-primary/25" />
            <div className="h-2.5 w-2.5 rounded-sm bg-primary/55" />
            <div className="h-2.5 w-2.5 rounded-sm bg-primary/85" />
          </div>
          <span>More</span>
        </div>
      </div>

      {/* ── Grid area ───────────────────────────────────────────────── */}
      <div className="px-5 py-4">
        <div className="flex gap-2 items-start">

          {/* Day-of-week labels — same grid row sizes as the heatmap so Mon/Thu align */}
          <div
            className="shrink-0"
            style={{
              display: 'grid',
              gridTemplateRows: `repeat(7, 1fr)`,
              gap: GAP,
              height: GRID_H,
            }}
          >
            {ROW_LABELS.map((label, i) => (
              <div key={i} className="flex items-center">
                <span className="text-[9px] text-muted-foreground/40 leading-none w-6">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Heatmap — fills available width on desktop, scrolls on mobile */}
          <div className="overflow-x-auto min-w-0 flex-1">
            {/*
              min-w-[600px] triggers horizontal scroll before cells become
              too small to see. On any screen wider than ~640px the grid
              stretches to fill the card.
            */}
            <div
              className="min-w-[600px]"
              style={{
                display: 'grid',
                gridTemplateRows: `repeat(7, 1fr)`,
                gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))`,
                gridAutoFlow: 'column',
                gap: GAP,
                height: GRID_H,
              }}
            >
              {days.map(({ date, count }) => (
                <div
                  key={date}
                  title={formatTitle(date, count)}
                  className={`rounded-sm cursor-default ${cellColor(count)}`}
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
