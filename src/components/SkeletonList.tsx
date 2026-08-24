const SKELETON_COUNT = 3

export function SkeletonList() {
  return (
    <div className="animate-pulse space-y-2" aria-busy="true" aria-label="加载中">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <div
          key={i}
          className="flex w-full items-center gap-3 rounded-lg border border-border bg-white p-3"
        >
          <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-primary/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-2/3 rounded bg-border" />
            <div className="h-3 w-1/2 rounded bg-border" />
          </div>
        </div>
      ))}
    </div>
  )
}
