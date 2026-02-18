'use client';

/**
 * PageSkeleton - Ultra-minimal, instant loading state
 * No heavy animations, no layout shift, matches hero structure
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-background-primary)] flex items-center">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-2xl">
          {/* Title placeholder */}
          <div className="space-y-2 mb-4">
            <div className="h-10 sm:h-12 w-80 bg-[var(--color-text-muted)]/8 rounded animate-pulse" />
            <div className="h-10 sm:h-12 w-64 bg-[var(--color-text-muted)]/8 rounded animate-pulse" />
          </div>
          
          {/* Subtitle */}
          <div className="h-5 w-96 max-w-full bg-[var(--color-text-muted)]/5 rounded mb-4 animate-pulse" />
          
          {/* Buttons */}
          <div className="flex gap-2 mb-4">
            <div className="h-10 w-28 bg-[var(--color-accent-primary)]/15 rounded-lg animate-pulse" />
            <div className="h-10 w-24 bg-[var(--color-border-primary)]/20 rounded-lg animate-pulse" />
          </div>
          
          {/* Install */}
          <div className="h-9 w-48 bg-[var(--color-text-muted)]/5 rounded mb-5 animate-pulse" />
          
          {/* Stats */}
          <div className="flex gap-4 mb-5">
            <div className="h-5 w-20 bg-[var(--color-text-muted)]/5 rounded animate-pulse" />
            <div className="h-5 w-16 bg-[var(--color-text-muted)]/5 rounded animate-pulse" />
          </div>
          
          {/* Feature cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-[var(--color-background-secondary)]/30 rounded-md animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
