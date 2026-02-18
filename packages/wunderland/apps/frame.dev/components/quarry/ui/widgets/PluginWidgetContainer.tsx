/**
 * Plugin Widget Container
 *
 * Renders sidebar widgets from enabled plugins.
 * Wraps each widget in an error boundary for isolation.
 *
 * @module codex/ui/PluginWidgetContainer
 */

'use client'

import React, { useState, useEffect, useCallback, Component, type ErrorInfo, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, RefreshCw, ChevronDown, Maximize2, X } from 'lucide-react'
import { pluginUIRegistry, quarryPluginManager, createPluginAPI } from '@/lib/plugins'
import type { WidgetProps } from '@/lib/plugins/types'

interface PluginWidgetContainerProps {
  /** Current theme */
  theme?: string
}

interface WidgetErrorBoundaryProps {
  pluginId: string
  children: ReactNode
  theme?: string
  onDisable: () => void
}

interface WidgetErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary for individual plugin widgets
 */
class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[PluginWidget:${this.props.pluginId}] Error:`, error, errorInfo)
  }

  render() {
    const { theme = 'light', pluginId, onDisable, children } = this.props
    const { hasError, error } = this.state
    const isDark = theme.includes('dark')

    if (hasError) {
      return (
        <div className={`
          p-3 rounded-lg text-xs
          ${isDark ? 'bg-red-900/20 border border-red-800/50' : 'bg-red-50 border border-red-200'}
        `}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                Widget Error
              </p>
              <p className={`mt-1 line-clamp-2 ${isDark ? 'text-red-400/80' : 'text-red-600/80'}`}>
                {error?.message || 'An error occurred'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className={`
                flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium
                ${isDark
                  ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
                  : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
                }
              `}
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
            <button
              onClick={onDisable}
              className={`
                px-2 py-1 rounded text-[10px] font-medium
                ${isDark
                  ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70'
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
                }
              `}
            >
              Disable Plugin
            </button>
          </div>
        </div>
      )
    }

    return children
  }
}

/**
 * Collapsible Widget Wrapper
 */
function CollapsibleWidget({
  pluginId,
  pluginName,
  theme,
  isDark,
  isExpanded,
  onToggle,
  onExpand,
  onDisable,
  children,
}: {
  pluginId: string
  pluginName: string
  theme: string
  isDark: boolean
  isExpanded: boolean
  onToggle: () => void
  onExpand: () => void
  onDisable: () => void
  children: ReactNode
}) {
  return (
    <WidgetErrorBoundary
      pluginId={pluginId}
      theme={theme}
      onDisable={onDisable}
    >
      <div className={`
        rounded-lg overflow-hidden
        ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}
      `}>
        {/* Collapsible header */}
        <div
          className={`
            px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide
            flex items-center justify-between gap-1.5 transition-colors
            ${isDark
              ? 'bg-zinc-800/80 text-zinc-400'
              : 'bg-zinc-100/80 text-zinc-500'
            }
          `}
        >
          {/* Left side - toggle button */}
          <button
            onClick={onToggle}
            className={`
              flex items-center gap-1.5 flex-1 min-w-0
              ${isDark ? 'hover:text-zinc-200' : 'hover:text-zinc-700'}
            `}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
            <span className="truncate">{pluginName}</span>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.div>
          </button>

          {/* Right side - expand button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onExpand()
            }}
            className={`
              p-1 rounded transition-colors flex-shrink-0
              ${isDark
                ? 'hover:bg-zinc-700 hover:text-zinc-200'
                : 'hover:bg-zinc-200 hover:text-zinc-700'
              }
            `}
            title="Expand to full page"
            aria-label="Expand widget to full page"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>

        {/* Collapsible content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </WidgetErrorBoundary>
  )
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
  children: ReactNode
}) {
  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    // Prevent body scroll when modal is open
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`
              fixed inset-4 sm:inset-8 md:inset-12 lg:inset-16 z-[101]
              rounded-xl overflow-hidden shadow-2xl
              flex flex-col
              ${isDark ? 'bg-zinc-900' : 'bg-white'}
            `}
          >
            {/* Modal Header */}
            <div className={`
              px-4 py-3 flex items-center justify-between shrink-0
              border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
            `}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {pluginName}
                </h2>
              </div>
              <button
                onClick={onClose}
                className={`
                  p-1.5 rounded-lg transition-colors
                  ${isDark
                    ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'
                  }
                `}
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-4">
              <WidgetErrorBoundary
                pluginId={pluginId}
                theme={theme}
                onDisable={onClose}
              >
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
 * Plugin Widget Container Component
 */
export default function PluginWidgetContainer({ theme = 'light' }: PluginWidgetContainerProps) {
  const [widgets, setWidgets] = useState<typeof pluginUIRegistry.allWidgets>([])
  const [expandedWidgets, setExpandedWidgets] = useState<Record<string, boolean>>({})
  const [expandedModalPluginId, setExpandedModalPluginId] = useState<string | null>(null)

  const isDark = theme.includes('dark')

  // Subscribe to widget changes
  useEffect(() => {
    setWidgets(pluginUIRegistry.allWidgets)

    const unsubscribe = pluginUIRegistry.onChange(() => {
      setWidgets([...pluginUIRegistry.allWidgets])
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Initialize expanded state for new widgets (default to expanded)
  useEffect(() => {
    setExpandedWidgets(prev => {
      const updated = { ...prev }
      widgets.forEach(({ pluginId }) => {
        if (updated[pluginId] === undefined) {
          updated[pluginId] = true // Default expanded
        }
      })
      return updated
    })
  }, [widgets])

  // Toggle individual widget collapse/expand
  const toggleWidget = useCallback((pluginId: string) => {
    setExpandedWidgets(prev => ({
      ...prev,
      [pluginId]: !prev[pluginId]
    }))
  }, [])

  // Open widget in full-page modal
  const expandWidgetModal = useCallback((pluginId: string) => {
    setExpandedModalPluginId(pluginId)
  }, [])

  // Close full-page modal
  const closeWidgetModal = useCallback(() => {
    setExpandedModalPluginId(null)
  }, [])

  // Handle disabling a plugin
  const handleDisablePlugin = useCallback(async (pluginId: string) => {
    await quarryPluginManager.disablePlugin(pluginId)
    // Close modal if this plugin was expanded
    if (expandedModalPluginId === pluginId) {
      setExpandedModalPluginId(null)
    }
  }, [expandedModalPluginId])

  // No widgets, don't render
  if (widgets.length === 0) {
    return null
  }

  // Find the expanded modal widget
  const expandedModalWidget = expandedModalPluginId
    ? widgets.find(w => w.pluginId === expandedModalPluginId)
    : null
  const expandedModalPlugin = expandedModalPluginId
    ? quarryPluginManager.getPlugin(expandedModalPluginId)
    : null

  return (
    <>
      <div className={`border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
        {/* Header */}
        <div className={`
          px-3 py-2 text-[10px] font-semibold uppercase
          ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
        `}>
          Widgets ({widgets.length})
        </div>

        {/* Widgets - Each individually collapsible */}
        <div className="px-2 pb-2 space-y-2">
          {widgets.map(({ pluginId, component: WidgetComponent }) => {
            const plugin = quarryPluginManager.getPlugin(pluginId)
            if (!plugin) return null

            // Create widget props
            const widgetProps: WidgetProps = {
              api: createPluginAPI(pluginId, () => plugin.settings),
              settings: plugin.settings,
              theme,
              isDark,
            }

            return (
              <CollapsibleWidget
                key={`${pluginId}-widget`}
                pluginId={pluginId}
                pluginName={plugin.manifest.name}
                theme={theme}
                isDark={isDark}
                isExpanded={expandedWidgets[pluginId] ?? true}
                onToggle={() => toggleWidget(pluginId)}
                onExpand={() => expandWidgetModal(pluginId)}
                onDisable={() => handleDisablePlugin(pluginId)}
              >
                <WidgetComponent {...widgetProps} />
              </CollapsibleWidget>
            )
          })}
        </div>
      </div>

      {/* Full-page modal for expanded widget */}
      {expandedModalWidget && expandedModalPlugin && (
        <PluginFullPageModal
          pluginId={expandedModalPluginId!}
          pluginName={expandedModalPlugin.manifest.name}
          theme={theme}
          isDark={isDark}
          isOpen={true}
          onClose={closeWidgetModal}
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

/**
 * Hook to use plugin widgets in other components
 */
export function usePluginWidgets() {
  const [widgets, setWidgets] = useState(pluginUIRegistry.allWidgets)

  useEffect(() => {
    setWidgets(pluginUIRegistry.allWidgets)
    return pluginUIRegistry.onChange(() => {
      setWidgets([...pluginUIRegistry.allWidgets])
    })
  }, [])

  return widgets
}
