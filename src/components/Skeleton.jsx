// Shimmering placeholder primitives + a full-screen app skeleton used while
// the app boots (cold start) and while data loads.

export function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} />
}

function CardSkeleton() {
  return (
    <div className="bg-bg-card border border-line-subtle rounded-xl p-4 sm:p-5">
      <Skeleton className="w-10 h-10 rounded-xl mb-3" />
      <Skeleton className="w-24 h-6 mb-2" />
      <Skeleton className="w-16 h-3" />
    </div>
  )
}

export default function AppSkeleton() {
  return (
    <div className="min-h-screen flex overflow-hidden">
      <div className="aurora" aria-hidden="true" />

      {/* Sidebar rail (desktop) */}
      <aside className="hidden lg:flex flex-col w-56 bg-bg-card border-r border-line-subtle p-5 gap-3">
        <div className="flex items-center gap-2.5 mb-4">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="w-14 h-3" />
            <Skeleton className="w-12 h-3" />
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-8 rounded-lg" style={{ opacity: 1 - i * 0.07 }} />
        ))}
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <div className="border-b border-line-subtle px-4 sm:px-8 py-3 flex items-center justify-between">
          <Skeleton className="w-28 h-5" />
          <div className="flex gap-2">
            <Skeleton className="w-24 h-9 rounded-lg" />
            <Skeleton className="w-36 h-9 rounded-lg" />
          </div>
        </div>

        <div className="px-4 sm:px-8 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="w-40 h-6" />
              <Skeleton className="w-56 h-3" />
            </div>
            <Skeleton className="w-24 h-8 rounded-lg" />
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>

          {/* Chart row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 bg-bg-card border border-line-subtle rounded-xl p-5">
              <Skeleton className="w-40 h-4 mb-5" />
              <Skeleton className="w-full h-48 rounded-lg" />
            </div>
            <div className="lg:col-span-2 bg-bg-card border border-line-subtle rounded-xl p-5">
              <Skeleton className="w-36 h-4 mb-5" />
              <Skeleton className="w-40 h-40 rounded-full mx-auto" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
