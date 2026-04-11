export default function HabitsLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-pulse">
      {/* Header card */}
      <div className="rounded-xl border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-3 w-36 bg-muted/60 rounded" />
          </div>
        </div>
        <div className="h-8 w-28 bg-muted rounded-md" />
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border bg-card px-5 py-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-3 w-10 bg-muted/60 rounded" />
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-2/5 rounded-full bg-muted/60" />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="rounded-xl border bg-card px-4 py-3">
        <div className="flex items-center gap-1">
          {[48, 44, 52, 56].map((w, i) => (
            <div key={i} className="h-7 bg-muted/60 rounded-lg" style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* Card grid — 2 columns, 4 skeleton cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col rounded-xl border bg-card overflow-hidden">
            {/* Title area */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-muted rounded" style={{ width: `${55 + (i % 3) * 15}%` }} />
                  <div className="h-3 bg-muted/60 rounded w-3/4" />
                </div>
                <div className="h-5 w-12 bg-muted/60 rounded-full shrink-0" />
              </div>
            </div>

            {/* History strip */}
            <div className="px-4 py-2.5 border-y border-border/40 bg-muted/10">
              <div className="flex items-end gap-1">
                {Array.from({ length: 7 }).map((_, j) => (
                  <div key={j} className="flex flex-col items-center gap-1 flex-1">
                    <div className="h-2 w-2 bg-muted/40 rounded-sm" />
                    <div className={`w-full h-3 rounded-sm ${j % 3 === 0 ? 'bg-muted' : 'bg-muted/50'}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom area */}
            <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-muted/60 rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
              <div className="h-10 bg-muted/40 rounded-lg border border-border/30" />
              <div className="h-px bg-border/30 mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
