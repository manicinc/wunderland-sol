/**
 * New strand page loading skeleton
 * Shows while the creation wizard loads
 */

export default function NewStrandLoading() {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto w-full">
        <div className="h-10 w-64 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-2" />
        <div className="h-5 w-96 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-8" />

        {/* Steps indicator */}
        <div className="flex items-center gap-4 mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
              <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Form skeleton */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 mt-8">
          <div className="h-10 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-10 w-32 bg-emerald-200/50 dark:bg-emerald-900/50 rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}
