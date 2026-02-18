/**
 * Landing page loading skeleton
 * Shows while the landing page is loading for better UX
 */

export default function LandingLoading() {
  return (
    <div className="min-h-screen bg-quarry-offwhite dark:bg-quarry-charcoal">
      {/* Navigation skeleton */}
      <div className="fixed top-0 left-0 right-0 z-50 h-16 bg-quarry-offwhite/80 dark:bg-quarry-charcoal/80 backdrop-blur-md border-b border-gray-200/20 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="w-32 h-8 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
          <div className="hidden md:flex items-center gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-16 h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            ))}
          </div>
          <div className="w-24 h-9 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Hero section skeleton */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 pt-28 pb-20">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content skeleton */}
            <div className="text-center lg:text-left space-y-6">
              {/* Headline skeleton */}
              <div className="space-y-4">
                <div className="h-12 md:h-16 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse w-3/4 mx-auto lg:mx-0" />
                <div className="h-12 md:h-16 bg-gradient-to-r from-emerald-200 to-cyan-200 dark:from-emerald-900 dark:to-cyan-900 rounded-lg animate-pulse w-full" />
              </div>

              {/* Subtitle skeleton */}
              <div className="space-y-3 max-w-xl mx-auto lg:mx-0">
                <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-full" />
                <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-5/6" />
              </div>

              {/* Badges skeleton */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
                <div className="h-10 w-56 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
              </div>

              {/* CTA buttons skeleton */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <div className="h-12 w-40 bg-gray-900 dark:bg-white rounded-xl animate-pulse opacity-50" />
                <div className="h-12 w-36 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
                <div className="h-12 w-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
              </div>
            </div>

            {/* Right: App preview skeleton */}
            <div className="relative hidden lg:block">
              <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse shadow-2xl" />
              {/* Floating elements */}
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-emerald-200/50 dark:bg-emerald-900/50 rounded-xl animate-pulse" />
              <div className="absolute -bottom-4 -right-4 w-32 h-20 bg-cyan-200/50 dark:bg-cyan-900/50 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Below fold sections skeleton */}
      <div className="space-y-8 px-4 pb-20">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="max-w-6xl mx-auto">
            <div className="h-96 bg-gray-100/50 dark:bg-gray-900/50 rounded-2xl animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
