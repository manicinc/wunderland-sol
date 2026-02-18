/**
 * Settings page loading skeleton
 * Shows while the settings page loads
 */

export default function SettingsLoading() {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 p-6">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-2" />
        <div className="h-5 w-64 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-8" />

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          {['General', 'Appearance', 'API Keys', 'Vault'].map((tab) => (
            <div
              key={tab}
              className="h-9 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"
            />
          ))}
        </div>

        {/* Settings sections */}
        <div className="space-y-8">
          {[1, 2, 3].map((section) => (
            <div key={section} className="space-y-4">
              <div className="h-6 w-40 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="space-y-3">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                      <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                    </div>
                    <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
