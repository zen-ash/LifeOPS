export default function TasksLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-pulse">
      {/* Header card */}
      <div className="rounded-xl border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-3 w-32 bg-muted/60 rounded" />
          </div>
        </div>
        <div className="h-8 w-24 bg-muted rounded-md" />
      </div>

      {/* Filter toolbar */}
      <div className="rounded-xl border bg-card px-4 py-3 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1">
            {[40, 48, 72, 40].map((w, i) => (
              <div key={i} className="h-7 bg-muted/60 rounded-lg" style={{ width: w }} />
            ))}
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-28 bg-muted/60 rounded-lg" />
            <div className="h-8 w-28 bg-muted/60 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Task list — grouped */}
      <div className="rounded-xl border bg-card overflow-hidden divide-y divide-border/40">
        {/* Overdue group */}
        <div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-destructive/[0.04] border-b border-border/40">
            <div className="h-3 w-14 bg-destructive/20 rounded" />
          </div>
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 pl-3 pr-2 py-3 border-b border-border/30">
              <div className="w-0.5 h-8 bg-muted/60 rounded-full" />
              <div className="h-5 w-5 bg-muted/60 rounded-[5px]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-muted rounded w-2/3" />
              </div>
              <div className="h-5 w-14 bg-destructive/20 rounded" />
            </div>
          ))}
        </div>

        {/* Upcoming group */}
        <div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/20 border-b border-border/40">
            <div className="h-3 w-16 bg-muted/60 rounded" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 pl-3 pr-2 py-3 border-b border-border/30 last:border-b-0">
              <div className="w-0.5 h-8 bg-muted/60 rounded-full" />
              <div className="h-5 w-5 bg-muted/60 rounded-[5px]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-muted rounded" style={{ width: `${55 + i * 10}%` }} />
              </div>
              <div className="h-5 w-16 bg-muted/60 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
