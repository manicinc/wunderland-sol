/**
 * Widget Plugin Template for Quarry
 *
 * This is a starting point for creating your own widget plugin.
 * Customize the MyWidget component and plugin class as needed.
 */

import React, { useState, useEffect } from 'react'

// ============================================================================
// TYPES
// ============================================================================

interface WidgetProps {
  api: any
  settings: Record<string, any>
  theme: string
  isDark: boolean
}

// ============================================================================
// BASE CLASS (included for standalone development)
// ============================================================================

class QuarryPlugin {
  manifest: any
  api: any
  context: any
  async onLoad() {}
  async onUnload() {}
  protected log(message: string) {
    console.log(`[${this.manifest?.name}] ${message}`)
  }
}

// ============================================================================
// WIDGET COMPONENT
// ============================================================================

function MyWidget({ api, settings, theme, isDark }: WidgetProps) {
  const [data, setData] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  // Refresh on interval if configured
  useEffect(() => {
    if (settings.refreshInterval > 0) {
      const interval = setInterval(loadData, settings.refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [settings.refreshInterval])

  async function loadData() {
    setLoading(true)
    try {
      // Replace with your data fetching logic
      await new Promise((resolve) => setTimeout(resolve, 500))
      setData('Hello from your widget!')
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`p-3 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}
    >
      {/* Header */}
      {settings.showHeader && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">My Widget</h3>
          <button
            onClick={loadData}
            className={`
              p-1 rounded text-xs
              ${isDark
                ? 'hover:bg-zinc-700 text-zinc-400'
                : 'hover:bg-zinc-200 text-zinc-600'
              }
            `}
            title="Refresh"
          >
            ↻
          </button>
        </div>
      )}

      {/* Content */}
      <div
        className={`
          rounded-lg p-3 text-sm
          ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
        `}
      >
        {loading ? (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
          </div>
        ) : (
          <p>{data}</p>
        )}
      </div>

      {/* Display mode indicator */}
      <div
        className={`
          mt-2 text-[10px] uppercase tracking-wide
          ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
        `}
      >
        Mode: {settings.displayMode}
      </div>
    </div>
  )
}

// ============================================================================
// PLUGIN CLASS
// ============================================================================

class MyWidgetPlugin extends QuarryPlugin {
  async onLoad() {
    // Register the sidebar widget
    this.api.registerSidebarWidget(MyWidget)

    // Register a command
    this.api.registerCommand({
      id: 'my-widget:refresh',
      name: 'Refresh My Widget',
      callback: () => {
        this.api.showNotice('Widget refreshed!', 'success')
      },
    })

    this.log('My Widget Plugin loaded!')
  }

  async onUnload() {
    this.log('My Widget Plugin unloaded')
  }

  onSettingsChange(key: string, value: any) {
    this.log(`Setting changed: ${key} = ${value}`)
  }
}

export default MyWidgetPlugin
