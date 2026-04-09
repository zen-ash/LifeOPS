export default function DashboardLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-pulse">
      {/* Welcome banner */}
      <div className="space-y-2">
        <div className="h-8 w-56 bg-muted rounded-lg" />
        <div className="h-4 w-72 bg-muted/60 rounded" />
      </div>

      {/* Profile card */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="h-3 w-20 bg-muted rounded" />
        <div className="flex gap-2">
          {[80, 96, 64].map((w) => (
            <div key={w} className="h-6 bg-muted rounded-full" style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* Focus summary */}
      <div className="space-y-4">
        <div className="h-6 w-24 bg-muted rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-4 flex flex-col items-center gap-2">
              <div className="h-5 w-5 bg-muted rounded" />
              <div className="h-7 w-14 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted/60 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Habits widget skeleton */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="h-3 w-16 bg-muted rounded" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 bg-muted rounded-lg" />
          ))}
        </div>
      </div>

      {/* Upcoming tasks */}
      <div className="space-y-3">
        <div className="h-6 w-40 bg-muted rounded" />
        <div className="rounded-xl border bg-card divide-y">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-4 w-4 bg-muted rounded shrink-0" />
              <div className="flex-1 h-4 bg-muted rounded" />
              <div className="h-4 w-16 bg-muted/60 rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
