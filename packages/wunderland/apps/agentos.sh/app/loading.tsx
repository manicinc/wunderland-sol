"use client";

/**
 * Route-level fallback for the landing experience.
 * Provides a branded skeleton state while Next.js loads the main bundles.
 */
export default function Loading() {
  return (
    <div className="min-h-screen px-6 pb-24 pt-20 transition-theme" role="status" aria-live="polite">
      <div className="mx-auto w-full max-w-7xl space-y-16">
        <header className="space-y-6 text-center">
          <span className="sr-only">Loading content…</span>
          <div className="skeleton mx-auto h-5 w-48 rounded-full" aria-hidden="true" />
          <div className="skeleton mx-auto h-16 w-3/4 rounded-2xl" aria-hidden="true" />
          <div className="skeleton mx-auto h-20 w-full max-w-2xl rounded-2xl" aria-hidden="true" />
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`hero-cta-${index}`}
                className="skeleton h-12 w-full max-w-xs rounded-full"
                aria-hidden="true"
              />
            ))}
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`feature-card-${index}`}
              className="glass-panel space-y-4 border-slate-200/60 dark:border-slate-800/80"
              aria-hidden="true"
            >
              <div className="skeleton h-12 w-12 rounded-2xl" />
              <div className="skeleton h-6 w-3/4 rounded-full" />
              <div className="skeleton h-20 w-full rounded-2xl" />
            </div>
          ))}
        </section>

        <section className="space-y-8">
          <div className="skeleton h-10 w-48 rounded-full" aria-hidden="true" />
          <div className="grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`metric-card-${index}`}
                className="glass-panel space-y-4 border-slate-200/60 dark:border-slate-800/80"
                aria-hidden="true"
              >
                <div className="skeleton h-5 w-24 rounded-full" />
                <div className="skeleton h-6 w-3/4 rounded-full" />
                <div className="skeleton h-16 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
