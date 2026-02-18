/**
 * Custom Callouts Plugin for FABRIC
 *
 * Add beautiful callout blocks to your markdown.
 * Syntax: :::type[title]
 *         content
 *         :::
 */

import React, { useState } from 'react'
import {
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  Info,
  FileText,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

// Base plugin class
class FabricPlugin {
  manifest: any
  api: any
  context: any
  async onLoad() {}
  async onUnload() {}
  protected log(message: string) {
    console.log(`[${this.manifest?.name}] ${message}`)
  }
}

// Types
type CalloutType = 'tip' | 'warning' | 'danger' | 'info' | 'note' | 'success' | 'error'

interface CalloutConfig {
  icon: React.ComponentType<{ className?: string }>
  colors: {
    bg: string
    border: string
    text: string
    iconBg: string
  }
  defaultTitle: string
}

// Callout configurations
const CALLOUT_CONFIGS: Record<CalloutType, CalloutConfig> = {
  tip: {
    icon: Lightbulb,
    colors: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-400 dark:border-amber-600',
      text: 'text-amber-900 dark:text-amber-100',
      iconBg: 'bg-amber-100 dark:bg-amber-800/50 text-amber-600 dark:text-amber-400',
    },
    defaultTitle: 'Tip',
  },
  warning: {
    icon: AlertTriangle,
    colors: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-400 dark:border-yellow-600',
      text: 'text-yellow-900 dark:text-yellow-100',
      iconBg: 'bg-yellow-100 dark:bg-yellow-800/50 text-yellow-600 dark:text-yellow-400',
    },
    defaultTitle: 'Warning',
  },
  danger: {
    icon: AlertOctagon,
    colors: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-400 dark:border-red-600',
      text: 'text-red-900 dark:text-red-100',
      iconBg: 'bg-red-100 dark:bg-red-800/50 text-red-600 dark:text-red-400',
    },
    defaultTitle: 'Danger',
  },
  info: {
    icon: Info,
    colors: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-400 dark:border-blue-600',
      text: 'text-blue-900 dark:text-blue-100',
      iconBg: 'bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-400',
    },
    defaultTitle: 'Info',
  },
  note: {
    icon: FileText,
    colors: {
      bg: 'bg-zinc-50 dark:bg-zinc-800/50',
      border: 'border-zinc-300 dark:border-zinc-600',
      text: 'text-zinc-900 dark:text-zinc-100',
      iconBg: 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300',
    },
    defaultTitle: 'Note',
  },
  success: {
    icon: CheckCircle,
    colors: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-400 dark:border-green-600',
      text: 'text-green-900 dark:text-green-100',
      iconBg: 'bg-green-100 dark:bg-green-800/50 text-green-600 dark:text-green-400',
    },
    defaultTitle: 'Success',
  },
  error: {
    icon: XCircle,
    colors: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-400 dark:border-red-600',
      text: 'text-red-900 dark:text-red-100',
      iconBg: 'bg-red-100 dark:bg-red-800/50 text-red-600 dark:text-red-400',
    },
    defaultTitle: 'Error',
  },
}

interface RendererProps {
  match: RegExpMatchArray
  api: any
  content: string
}

// Callout Renderer Component
function CalloutRenderer({ match, api }: RendererProps) {
  const settings = api.getContext().settings || {}
  const showIcons = settings.showIcons !== false
  const collapsible = settings.collapsible === true
  const defaultCollapsed = settings.defaultCollapsed === true

  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  // Parse match: :::type[title]\ncontent\n:::
  const fullMatch = match[0]
  const typeMatch = fullMatch.match(/^:::(\w+)(?:\[(.*?)\])?/)

  if (!typeMatch) return <div>{fullMatch}</div>

  const type = typeMatch[1].toLowerCase() as CalloutType
  const customTitle = typeMatch[2]

  // Get content between opening and closing :::
  const contentMatch = fullMatch.match(/^:::.*?\n([\s\S]*?)\n?:::$/m)
  const calloutContent = contentMatch ? contentMatch[1].trim() : ''

  // Get config or default to 'note'
  const config = CALLOUT_CONFIGS[type] || CALLOUT_CONFIGS.note
  const Icon = config.icon
  const title = customTitle || config.defaultTitle

  return (
    <div
      className={`
        callout callout-${type}
        my-4 rounded-lg border-l-4 overflow-hidden
        ${config.colors.bg} ${config.colors.border}
      `}
    >
      {/* Header */}
      <div
        className={`
          flex items-center gap-2 px-4 py-2
          ${collapsible ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''}
        `}
        onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
      >
        {/* Collapse indicator */}
        {collapsible && (
          <span className={`${config.colors.text} opacity-60`}>
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        )}

        {/* Icon */}
        {showIcons && (
          <span className={`p-1 rounded ${config.colors.iconBg}`}>
            <Icon className="w-4 h-4" />
          </span>
        )}

        {/* Title */}
        <span className={`font-semibold text-sm ${config.colors.text}`}>
          {title}
        </span>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div
          className={`px-4 pb-3 text-sm leading-relaxed ${config.colors.text} opacity-90`}
          dangerouslySetInnerHTML={{ __html: parseContent(calloutContent) }}
        />
      )}
    </div>
  )
}

// Simple markdown parsing for callout content
function parseContent(content: string): string {
  return content
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-sm font-mono">$1</code>')
    // Line breaks
    .replace(/\n/g, '<br />')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-500 hover:underline" target="_blank" rel="noopener">$1</a>')
}

// Plugin Class
class CustomCalloutsPlugin extends FabricPlugin {
  async onLoad() {
    // Register markdown renderer for callout syntax
    // Pattern matches :::type[title]\ncontent\n:::
    this.api.registerMarkdownRenderer({
      pattern: /^:::(\w+)(?:\[(.*?)\])?\s*\n([\s\S]*?)\n?:::$/gm,
      component: CalloutRenderer,
      priority: 5,
    })

    // Register command to insert callout
    this.api.registerCommand({
      id: 'callout:insert-tip',
      name: 'Insert Tip Callout',
      callback: () => {
        this.api.showNotice('Use :::tip[Title]\\nYour content\\n::: syntax', 'info')
      },
    })

    this.api.registerCommand({
      id: 'callout:insert-warning',
      name: 'Insert Warning Callout',
      callback: () => {
        this.api.showNotice('Use :::warning[Title]\\nYour content\\n::: syntax', 'info')
      },
    })

    this.log('Custom Callouts loaded!')
  }

  async onUnload() {
    this.log('Custom Callouts unloaded')
  }
}

export default CustomCalloutsPlugin
