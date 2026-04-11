export default function LeaderboardLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-pulse">
      {/* Header card */}
      <div className="rounded-xl border bg-card px-6 py-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-yellow-500/10 shrink-0" />
        <div className="space-y-1.5">
          <div className="h-4 w-28 bg-muted rounded" />
          <div className="h-3 w-56 bg-muted/60 rounded" />
        </div>
      </div>

      {/* Stat strip */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-6 pt-4 pb-1.5">
          <div className="h-3 w-36 bg-muted rounded" />
        </div>
        <div className="flex divide-x divide-border/40">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 flex flex-col items-center py-4 px-2 gap-2">
              <div className="h-3.5 w-3.5 bg-muted/60 rounded" />
              <div className="h-6 w-10 bg-muted rounded" />
              <div className="h-2.5 w-8 bg-muted/50 rounded" />
            </div>
          ))}
        </div>
        <div className="h-1" />
      </div>

      {/* Rankings table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 px-5 py-2.5 border-b bg-muted/30">
          <div className="h-3 w-4 bg-muted/60 rounded shrink-0" />
          <div className="h-3 w-20 bg-muted/60 rounded flex-1" />
          <div className="hidden sm:block h-3 w-12 bg-muted/50 rounded" />
          <div className="hidden sm:block h-3 w-10 bg-muted/50 rounded" />
          <div className="hidden sm:block h-3 w-12 bg-muted/50 rounded" />
          <div className="h-3 w-10 bg-muted/60 rounded" />
        </div>
        {/* Rows */}
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`flex items-center gap-4 px-5 py-4 border-b last:border-0 ${i === 0 ? 'bg-yellow-500/[0.04]' : ''}`}>
            <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="h-7 w-7 rounded-full bg-muted shrink-0" />
              <div className="h-4 bg-muted rounded" style={{ width: `${45 + (i % 3) * 20}%` }} />
            </div>
            <div className="hidden sm:block h-4 w-12 bg-muted/50 rounded" />
            <div className="hidden sm:block h-4 w-6 bg-muted/50 rounded" />
            <div className="hidden sm:block h-4 w-6 bg-muted/50 rounded" />
            <div className="h-4 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
