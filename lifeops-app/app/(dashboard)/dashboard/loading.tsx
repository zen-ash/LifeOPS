export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-8 animate-pulse">

      {/* Today Hero */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-10 bg-muted rounded" />
            <div className="h-7 w-48 bg-muted rounded-lg" />
          </div>
          <div className="flex gap-2">
            {[64, 64, 64, 64].map((w, i) => (
              <div key={i} className="rounded-lg bg-muted/50 px-4 py-2.5 w-16 h-[60px]" />
            ))}
          </div>
        </div>
        <div className="border-t border-border/50 px-6 py-2.5 flex items-center gap-2 bg-muted/20">
          <div className="h-3 w-10 bg-muted rounded" />
          <div className="h-5 w-20 bg-muted/70 rounded-full" />
          <div className="h-5 w-24 bg-muted/60 rounded-full" />
        </div>
      </div>

      {/* Main grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tasks panel */}
        <div className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-4 w-6 bg-muted/60 rounded-full" />
            </div>
            <div className="h-3 w-14 bg-muted/60 rounded" />
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-border/40 last:border-0">
              <div className="w-1.5 h-1.5 rounded-full bg-muted shrink-0" />
              <div className="flex-1 h-4 bg-muted rounded" />
              <div className="h-3 w-12 bg-muted/60 rounded shrink-0" />
            </div>
          ))}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Habits */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
              <div className="h-3 w-8 bg-muted/60 rounded" />
            </div>
            <div className="px-5 pt-3 pb-2">
              <div className="flex items-center justify-between mb-1.5">
                <div className="h-3 w-24 bg-muted/60 rounded" />
                <div className="h-3 w-8 bg-muted/60 rounded" />
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-1/3 bg-muted/70 rounded-full" />
              </div>
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2.5 px-5 py-2">
                <div className="h-4 w-4 bg-muted rounded-full shrink-0" />
                <div className="flex-1 h-4 bg-muted rounded" />
              </div>
            ))}
          </div>

          {/* Focus */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-muted rounded" />
                <div className="h-4 w-12 bg-muted rounded" />
              </div>
              <div className="h-3 w-12 bg-muted/60 rounded" />
            </div>
            <div className="grid grid-cols-3 divide-x divide-border/50">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col items-center py-4 gap-1.5">
                  <div className="h-6 w-10 bg-muted rounded" />
                  <div className="h-2.5 w-14 bg-muted/60 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/50">
              <div className="h-4 w-4 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
            <div className="divide-y divide-border/40">
              {[0, 1, 2].map((j) => (
                <div key={j} className="flex items-center justify-between px-5 py-2.5">
                  <div className="h-4 w-20 bg-muted/70 rounded" />
                  <div className="h-4 w-6 bg-muted/60 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3 h-28">
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted/60 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
