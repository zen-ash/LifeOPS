export default function LeaderboardLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="h-8 w-48 bg-muted rounded-lg" />
        <div className="h-4 w-72 bg-muted/60 rounded" />
      </div>

      {/* Score formula */}
      <div className="rounded-xl border bg-card px-5 py-4 space-y-3">
        <div className="h-3 w-28 bg-muted rounded" />
        <div className="flex gap-6">
          {[80, 60, 72].map((w) => (
            <div key={w} className="h-4 bg-muted/70 rounded" style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b bg-muted/40 px-5 py-3">
          <div className="h-3 w-32 bg-muted rounded" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b last:border-0">
            <div className="h-6 w-7 bg-muted rounded shrink-0" />
            <div className="flex-1 h-4 bg-muted rounded" />
            <div className="h-4 w-16 bg-muted/60 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
