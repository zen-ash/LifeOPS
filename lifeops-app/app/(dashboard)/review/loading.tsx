export default function ReviewLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-pulse">
      {/* Header card */}
      <div className="rounded-xl border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-28 bg-muted rounded" />
            <div className="h-3 w-44 bg-muted/60 rounded" />
          </div>
        </div>
        <div className="h-5 w-24 bg-muted/60 rounded-full" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card px-4 py-4 space-y-2">
            <div className="h-3 w-16 bg-muted/60 rounded" />
            <div className="h-6 w-10 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Content sections */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border bg-card px-5 py-4 space-y-3">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="space-y-2">
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-8 bg-muted/40 rounded-lg border border-border/30" />
            ))}
          </div>
        </div>
      ))}

      {/* AI summary placeholder */}
      <div className="rounded-xl border bg-card px-5 py-4 space-y-3">
        <div className="h-4 w-36 bg-muted rounded" />
        <div className="h-24 bg-muted/30 rounded-lg border border-border/30" />
        <div className="h-8 w-36 bg-muted/60 rounded-md" />
      </div>
    </div>
  )
}
