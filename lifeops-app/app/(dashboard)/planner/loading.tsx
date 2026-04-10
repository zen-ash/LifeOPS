export default function PlannerLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-pulse">
      {/* Header card */}
      <div className="rounded-xl border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-3 w-64 bg-muted/60 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-4 w-4 bg-muted/60 rounded" />
          <div className="h-3 w-28 bg-muted/60 rounded" />
          <div className="h-5 w-14 bg-muted/50 rounded-full" />
        </div>
      </div>

      {/* Empty state card skeleton */}
      <div className="rounded-xl border bg-card">
        <div className="flex flex-col items-center text-center px-8 py-16 max-w-lg mx-auto gap-5">
          <div className="h-16 w-16 rounded-2xl bg-muted" />
          <div className="space-y-2 w-full">
            <div className="h-6 w-3/4 bg-muted rounded mx-auto" />
            <div className="h-4 w-full bg-muted/60 rounded" />
            <div className="h-4 w-5/6 bg-muted/50 rounded mx-auto" />
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            {[64, 72, 60].map((w) => (
              <div key={w} className="h-7 rounded-full bg-muted/60" style={{ width: w }} />
            ))}
          </div>
          <div className="h-10 w-44 bg-muted rounded-md" />
        </div>
      </div>
    </div>
  )
}
