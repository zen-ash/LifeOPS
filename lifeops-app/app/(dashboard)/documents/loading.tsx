export default function DocumentsLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-pulse">
      {/* Header card */}
      <div className="rounded-xl border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-12 bg-muted rounded" />
            <div className="h-3 w-44 bg-muted/60 rounded" />
          </div>
        </div>
        <div className="h-8 w-28 bg-muted rounded-md" />
      </div>

      {/* Filter toolbar */}
      <div className="rounded-xl border bg-card px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-8 flex-1 bg-muted/60 rounded-lg" />
          <div className="h-8 w-28 bg-muted/60 rounded-lg" />
        </div>
        <div className="flex items-center gap-1 pt-2.5 border-t border-border/40">
          <div className="h-7 w-14 bg-muted/60 rounded-lg" />
          <div className="h-7 w-16 bg-muted/60 rounded-lg" />
          <div className="h-7 w-20 bg-muted/60 rounded-lg" />
        </div>
      </div>

      {/* Document card grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          'bg-red-500/[0.07]',
          'bg-blue-500/[0.07]',
          'bg-red-500/[0.07]',
          'bg-muted/20',
          'bg-blue-500/[0.07]',
          'bg-red-500/[0.07]',
        ].map((zoneBg, i) => (
          <div key={i} className="flex flex-col rounded-xl border bg-card overflow-hidden">
            {/* Type zone */}
            <div className={`h-20 relative ${zoneBg}`}>
              <div className="absolute bottom-2.5 left-3 h-8 w-8 bg-muted/40 rounded-md" />
              <div className="absolute top-2.5 right-2.5 h-5 w-10 bg-muted/40 rounded" />
            </div>
            {/* Body */}
            <div className="px-3 pt-2.5 pb-2 space-y-1.5">
              <div className="h-4 bg-muted rounded" style={{ width: `${50 + (i % 3) * 20}%` }} />
              <div className="h-3 bg-muted/60 rounded w-16" />
            </div>
            {/* Action row */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-t border-border/30">
              <div className="h-3 w-12 bg-muted/40 rounded flex-1" />
              <div className="h-6 w-6 bg-muted/30 rounded" />
              <div className="h-6 w-6 bg-muted/30 rounded" />
              <div className="h-6 w-6 bg-muted/30 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
