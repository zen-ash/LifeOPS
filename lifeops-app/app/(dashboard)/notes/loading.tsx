export default function NotesLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-pulse">
      {/* Header card */}
      <div className="rounded-xl border bg-card px-6 py-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
        <div className="space-y-1.5">
          <div className="h-4 w-14 bg-muted rounded" />
          <div className="h-3 w-40 bg-muted/60 rounded" />
        </div>
      </div>

      {/* Split-pane workspace */}
      <div className="rounded-xl border bg-card overflow-hidden flex min-h-[560px]">

        {/* Left pane skeleton */}
        <div className="w-80 flex-shrink-0 border-r border-border/40 flex flex-col">
          {/* Filter header */}
          <div className="px-3 py-2.5 border-b border-border/40 space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 h-8 bg-muted/60 rounded-lg" />
              <div className="h-8 w-20 bg-muted/60 rounded-lg" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-7 w-10 bg-muted/60 rounded-lg" />
              <div className="h-7 w-16 bg-muted/60 rounded-lg" />
              <div className="h-7 w-24 bg-muted/60 rounded-lg ml-auto" />
            </div>
          </div>

          {/* Note list skeleton */}
          <div className="flex-1 p-2 space-y-1.5">
            {/* Pinned section label */}
            <div className="flex items-center gap-1.5 px-2 pt-1 pb-0.5">
              <div className="h-2 w-2 bg-muted/40 rounded" />
              <div className="h-2 w-10 bg-muted/40 rounded" />
            </div>
            {/* Pinned card skeletons */}
            {[0, 1].map((i) => (
              <div key={`p${i}`} className="rounded-xl border bg-card p-4 space-y-2 border-l-[3px] border-l-primary/15">
                <div className="h-4 bg-muted rounded" style={{ width: `${60 + i * 15}%` }} />
                <div className="space-y-1.5">
                  <div className="h-3 bg-muted/60 rounded w-full" />
                  <div className="h-3 bg-muted/60 rounded w-4/5" />
                </div>
                <div className="pt-2 border-t border-border/30 flex items-center gap-2">
                  <div className="h-2.5 w-10 bg-muted/40 rounded" />
                </div>
              </div>
            ))}

            {/* Regular notes section label */}
            <div className="px-2 pt-3 pb-0.5">
              <div className="h-2 w-10 bg-muted/40 rounded" />
            </div>
            {/* Regular card skeletons */}
            {[0, 1, 2, 3].map((i) => (
              <div key={`r${i}`} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="h-4 bg-muted rounded" style={{ width: `${45 + (i % 3) * 18}%` }} />
                <div className="h-3 bg-muted/60 rounded w-3/4" />
                <div className="pt-2 border-t border-border/30 flex items-center gap-2">
                  <div className="h-2.5 w-8 bg-muted/40 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right pane skeleton */}
        <div className="flex-1 flex flex-col p-6 gap-4">
          {/* Title placeholder */}
          <div className="h-7 w-2/3 bg-muted/50 rounded" />
          {/* Content lines */}
          <div className="flex-1 space-y-2.5">
            <div className="h-4 bg-muted/40 rounded w-full" />
            <div className="h-4 bg-muted/40 rounded w-11/12" />
            <div className="h-4 bg-muted/40 rounded w-4/5" />
            <div className="h-4 bg-muted/40 rounded w-full" />
            <div className="h-4 bg-muted/40 rounded w-3/4" />
          </div>
          {/* Footer bar */}
          <div className="flex items-center gap-2 pt-3 border-t border-border/30">
            <div className="h-8 w-16 bg-muted/50 rounded-md" />
            <div className="h-8 w-8 bg-muted/30 rounded-md" />
            <div className="h-8 w-8 bg-muted/30 rounded-md ml-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}
