export default function StudyBuddyLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-pulse">
      {/* Header card */}
      <div className="rounded-xl border bg-card px-6 py-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
        <div className="space-y-1.5">
          <div className="h-4 w-28 bg-muted rounded" />
          <div className="h-3 w-52 bg-muted/60 rounded" />
        </div>
      </div>

      {/* Add buddy card */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-muted shrink-0" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
        <div className="h-3 w-64 bg-muted/60 rounded" />
        <div className="flex gap-2">
          <div className="flex-1 h-10 bg-muted/60 rounded-md" />
          <div className="h-10 w-28 bg-muted/60 rounded-md" />
        </div>
      </div>

      {/* Buddies list card */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-muted shrink-0" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
        <div className="divide-y divide-border/40">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="h-3.5 bg-muted rounded" style={{ width: `${40 + i * 20}%` }} />
                <div className="h-3 w-36 bg-muted/60 rounded" />
              </div>
              <div className="h-7 w-16 bg-muted/50 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
