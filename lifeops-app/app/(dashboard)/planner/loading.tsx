export default function PlannerLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="h-7 w-36 bg-muted rounded-lg" />
        <div className="h-4 w-64 bg-muted/60 rounded" />
      </div>

      {/* Action bar */}
      <div className="flex gap-3">
        <div className="h-10 w-44 bg-muted rounded-md" />
      </div>

      {/* Day cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="rounded-xl border-2 border-border bg-card p-4 space-y-3">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-3 w-full bg-muted/70 rounded" />
            <div className="h-3 w-4/5 bg-muted/70 rounded" />
            <div className="h-3 w-3/4 bg-muted/60 rounded" />
            <div className="h-3 w-2/3 bg-muted/50 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
