/**
 * Right Sidebar Plugin Widgets
 *
 * Renders plugin widgets in the right sidebar when the plugins mode
 * is not active in the left sidebar. This provides an alternative
 * location for plugin widgets to be displayed.
 *
 * @module codex/ui/RightSidebarPluginWidgets
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Puzzle, Maximize2, X, AlertTriangle, RefreshCw } from 'lucide-react'
import { pluginUIRegistry, quarryPluginManager, createPluginAPI } from '@/lib/plugins'
import type { WidgetProps } from '@/lib/plugins/types'

interface RightSidebarPluginWidgetsProps {
  /** Current theme */
  theme?: string
  /** Whether to show the plugin widgets (false when plugins mode is active in left sidebar) */
  show?: boolean
}

/**
 * Error Boundary for individual plugin widgets
 */
class WidgetErrorBoundary extends React.Component<
  { pluginId: string; children: React.ReactNode; theme?: string; onDisable: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { pluginId: string; children: React.ReactNode; theme?: string; onDisable: () => void }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[RightSidebarPlugin:${this.props.pluginId}] Error:`, error, errorInfo)
  }

  render() {
    const { theme = 'light', onDisable, children } = this.props
    const { hasError, error } = this.state
    const isDark = theme.includes('dark')

    if (hasError) {
      return (
        <div className={`p-2 rounded text-xs ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-[10px] ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                Widget Error
              </p>
              <p className={`mt-0.5 line-clamp-2 text-[9px] ${isDark ? 'text-red-400/80' : 'text-red-600/80'}`}>
                {error?.message || 'An error occurred'}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 mt-1.5">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ${
                isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-700 border border-zinc-200'
              }`}
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Retry
            </button>
            <button
              onClick={onDisable}
              className={`px-1.5 py-0.5 rounded text-[9px] ${
                isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-600'
              }`}
            >
              Disable
            </button>
          </div>
        </div>
      )
    }

    return children
  }
}

/**
 * Full Page Modal for expanded plugin widgets
 */
function PluginFullPageModal({
  pluginId,
  pluginName,
  theme,
  isDark,
  isOpen,
  onClose,
  children,
}: {
  pluginId: string
  pluginName: string
  theme: string
  isDark: boolean
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`fixed inset-4 sm:inset-8 md:inset-12 lg:inset-16 z-[101] rounded-xl overflow-hidden shadow-2xl flex flex-col ${
              isDark ? 'bg-zinc-900' : 'bg-white'
            }`}
          >
            <div className={`px-4 py-3 flex items-center justify-between shrink-0 border-b ${
              isDark ? 'border-zinc-700' : 'border-zinc-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {pluginName}
                </h2>
              </div>
              <button
                onClick={onClose}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <WidgetErrorBoundary pluginId={pluginId} theme={theme} onDisable={onClose}>
                {children}
              </WidgetErrorBoundary>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * Right Sidebar Plugin Widgets Component
 *
 * Shows plugin widgets in a collapsible section in the right sidebar
 * when the plugins tab is not active in the left sidebar.
 */
export default function RightSidebarPluginWidgets({
  theme = 'light',
  show = true,
}: RightSidebarPluginWidgetsProps) {
  const [widgets, setWidgets] = useState<typeof pluginUIRegistry.allWidgets>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const [expandedWidgets, setExpandedWidgets] = useState<Record<string, boolean>>({})
  const [expandedModalPluginId, setExpandedModalPluginId] = useState<string | null>(null)

  const isDark = theme.includes('dark')

  // Subscribe to widget changes
  useEffect(() => {
    setWidgets(pluginUIRegistry.allWidgets)
    return pluginUIRegistry.onChange(() => {
      setWidgets([...pluginUIRegistry.allWidgets])
    })
  }, [])

  // Initialize expanded state for new widgets
  useEffect(() => {
    setExpandedWidgets(prev => {
      const updated = { ...prev }
      widgets.forEach(({ pluginId }) => {
        if (updated[pluginId] === undefined) {
          updated[pluginId] = true
        }
      })
      return updated
    })
  }, [widgets])

  const toggleWidget = useCallback((pluginId: string) => {
    setExpandedWidgets(prev => ({ ...prev, [pluginId]: !prev[pluginId] }))
  }, [])

  const handleDisablePlugin = useCallback(async (pluginId: string) => {
    await quarryPluginManager.disablePlugin(pluginId)
    if (expandedModalPluginId === pluginId) {
      setExpandedModalPluginId(null)
    }
  }, [expandedModalPluginId])

  // Don't render if hidden or no widgets
  if (!show || widgets.length === 0) {
    return null
  }

  const expandedModalWidget = expandedModalPluginId
    ? widgets.find(w => w.pluginId === expandedModalPluginId)
    : null
  const expandedModalPlugin = expandedModalPluginId
    ? quarryPluginManager.getPlugin(expandedModalPluginId)
    : null

  return (
    <>
      {/* Collapsible Section */}
      <div className={`border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
        {/* Section Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full px-3 py-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide transition-colors ${
            isDark
              ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100/50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Puzzle className="w-3.5 h-3.5 text-purple-500" />
            <span>Plugins ({widgets.length})</span>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.div>
        </button>

        {/* Collapsible Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-2 pb-2 space-y-1.5">
                {widgets.map(({ pluginId, component: WidgetComponent }) => {
                  const plugin = quarryPluginManager.getPlugin(pluginId)
                  if (!plugin) return null

                  const widgetProps: WidgetProps = {
                    api: createPluginAPI(pluginId, () => plugin.settings),
                    settings: plugin.settings,
                    theme,
                    isDark,
                  }

                  const isWidgetExpanded = expandedWidgets[pluginId] ?? true

                  return (
                    <div
                      key={`${pluginId}-right-widget`}
                      className={`rounded-lg overflow-hidden ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}
                    >
                      {/* Widget Header */}
                      <div
                        className={`px-2 py-1 text-[9px] font-semibold uppercase tracking-wide flex items-center justify-between gap-1 ${
                          isDark ? 'bg-zinc-800/80 text-zinc-400' : 'bg-zinc-100/80 text-zinc-500'
                        }`}
                      >
                        <button
                          onClick={() => toggleWidget(pluginId)}
                          className={`flex items-center gap-1 flex-1 min-w-0 ${
                            isDark ? 'hover:text-zinc-200' : 'hover:text-zinc-700'
                          }`}
                        >
                          <span className="w-1 h-1 rounded-full bg-purple-500 flex-shrink-0" />
                          <span className="truncate">{plugin.manifest.name}</span>
                          <motion.div
                            animate={{ rotate: isWidgetExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-shrink-0"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </motion.div>
                        </button>
                        <button
                          onClick={() => setExpandedModalPluginId(pluginId)}
                          className={`p-0.5 rounded transition-colors flex-shrink-0 ${
                            isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'
                          }`}
                          title="Expand to full page"
                        >
                          <Maximize2 className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      {/* Widget Content */}
                      <AnimatePresence initial={false}>
                        {isWidgetExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <WidgetErrorBoundary
                              pluginId={pluginId}
                              theme={theme}
                              onDisable={() => handleDisablePlugin(pluginId)}
                            >
                              <WidgetComponent {...widgetProps} />
                            </WidgetErrorBoundary>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full-page modal */}
      {expandedModalWidget && expandedModalPlugin && (
        <PluginFullPageModal
          pluginId={expandedModalPluginId!}
          pluginName={expandedModalPlugin.manifest.name}
          theme={theme}
          isDark={isDark}
          isOpen={true}
          onClose={() => setExpandedModalPluginId(null)}
        >
          <expandedModalWidget.component
            api={createPluginAPI(expandedModalPluginId!, () => expandedModalPlugin.settings)}
            settings={expandedModalPlugin.settings}
            theme={theme}
            isDark={isDark}
            isExpanded={true}
          />
        </PluginFullPageModal>
      )}
    </>
  )
}
