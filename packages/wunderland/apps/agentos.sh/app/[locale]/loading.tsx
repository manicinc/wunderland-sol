"use client";

/**
 * Route-level fallback for the landing experience.
 * Provides a branded skeleton state while Next.js loads the main bundles.
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col transition-theme bg-[var(--color-background-primary)]" role="status" aria-live="polite">
      {/* Nav Skeleton */}
      <div className="w-full border-b border-white/5 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo Skeleton */}
          <div className="flex items-center gap-2">
            <div className="skeleton h-8 w-8 rounded-full" />
            <div className="skeleton h-6 w-24 rounded-lg" />
          </div>
          
          {/* Desktop Nav Links Skeleton */}
          <div className="hidden lg:flex items-center gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-4 w-20 rounded-md" />
            ))}
          </div>

          {/* Actions Skeleton */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block skeleton h-9 w-9 rounded-full" />
            <div className="hidden md:block skeleton h-9 w-24 rounded-xl" />
            <div className="skeleton h-9 w-9 rounded-xl md:hidden" />
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 px-6 pb-24 pt-20">
        <div className="mx-auto w-full max-w-7xl space-y-16">
          {/* Hero Skeleton */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="skeleton h-16 w-3/4 rounded-2xl" />
              <div className="skeleton h-20 w-full rounded-2xl" />
              <div className="flex gap-4">
                <div className="skeleton h-12 w-32 rounded-xl" />
                <div className="skeleton h-12 w-32 rounded-xl" />
              </div>
            </div>
            {/* Hero Image/Logo Skeleton */}
            <div className="hidden lg:flex justify-center">
              <div className="skeleton h-80 w-80 rounded-full opacity-20" />
            </div>
          </div>

          {/* Feature Cards Skeleton */}
          <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`feature-card-${index}`}
                className="holographic-card p-6 space-y-4"
                aria-hidden="true"
              >
                <div className="skeleton h-12 w-12 rounded-2xl" />
                <div className="skeleton h-6 w-3/4 rounded-full" />
                <div className="skeleton h-20 w-full rounded-2xl" />
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

