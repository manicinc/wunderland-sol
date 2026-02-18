'use client'

/**
 * Tool Page Left Sidebar
 * @module components/quarry/ui/sidebar/ToolPageLeftSidebar
 *
 * Reusable left sidebar for tool/utility pages with:
 * - Page description/help
 * - Quick navigation links
 * - Focus Timer widget
 * - Related pages
 */

import React from 'react'
import Link from 'next/link'
import * as LucideIcons from 'lucide-react'
import {
  Info,
  ChevronRight,
  HelpCircle,
  Sparkles,
  Clock,
  Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TimerSection } from './sections/TimerSection'
import { CollapsibleSidebarSection } from './sections/CollapsibleSidebarSection'

/**
 * Resolve icon name string to React component
 * Allows Server Components to pass icon names as strings
 */
function getIconComponent(iconName?: string): React.ElementType {
  if (!iconName) return ChevronRight
  const IconsRecord = LucideIcons as unknown as Record<string, React.ElementType>
  return IconsRecord[iconName] || ChevronRight
}

export interface ToolPageLeftSidebarProps {
  isDark: boolean
  /** Page title for context */
  title?: string
  /** Brief description of the page */
  description?: string
  /** Tips or help text */
  tips?: string[]
  /** Related navigation links - icon is a string name like 'BookOpen', 'Code2' */
  relatedLinks?: Array<{
    href: string
    label: string
    icon?: string
  }>
  /** Show focus timer widget */
  showTimer?: boolean
  /** Custom content to render at top */
  topContent?: React.ReactNode
  /** Custom content to render at bottom */
  bottomContent?: React.ReactNode
  className?: string
}

export default function ToolPageLeftSidebar({
  isDark,
  title,
  description,
  tips = [],
  relatedLinks = [],
  showTimer = true,
  topContent,
  bottomContent,
  className,
}: ToolPageLeftSidebarProps) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Custom Top Content */}
      {topContent}

      {/* Page Info */}
      {(title || description) && (
        <div className={cn(
          'p-3 border-b',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}>
          {title && (
            <h3 className={cn(
              'text-sm font-semibold mb-1',
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            )}>
              {title}
            </h3>
          )}
          {description && (
            <p className={cn(
              'text-xs leading-relaxed',
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            )}>
              {description}
            </p>
          )}
        </div>
      )}

      {/* Tips Section */}
      {tips.length > 0 && (
        <CollapsibleSidebarSection
          title="Tips"
          icon={Lightbulb}
          defaultExpanded={true}
          isDark={isDark}
        >
          <div className="p-3 space-y-2">
            {tips.map((tip, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-2 text-xs',
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                )}
              >
                <Sparkles className={cn(
                  'w-3 h-3 mt-0.5 flex-shrink-0',
                  isDark ? 'text-amber-400' : 'text-amber-500'
                )} />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </CollapsibleSidebarSection>
      )}

      {/* Focus Timer */}
      {showTimer && (
        <TimerSection
          isDark={isDark}
          defaultExpanded={false}
          defaultMinutes={25}
          maxMinutes={60}
          title="Focus Timer"
          showPomodoroMode={true}
        />
      )}

      {/* Related Links */}
      {relatedLinks.length > 0 && (
        <CollapsibleSidebarSection
          title="Related"
          icon={Info}
          defaultExpanded={true}
          isDark={isDark}
        >
          <div className="p-2 space-y-1">
            {relatedLinks.map((link) => {
              const Icon = getIconComponent(link.icon)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
                    isDark
                      ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{link.label}</span>
                  <ChevronRight className="w-3 h-3 opacity-50" />
                </Link>
              )
            })}
          </div>
        </CollapsibleSidebarSection>
      )}

      {/* Custom Bottom Content */}
      {bottomContent}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer */}
      <div className={cn(
        'p-3 text-[10px] text-center border-t',
        isDark ? 'border-zinc-800 text-zinc-600' : 'border-zinc-200 text-zinc-400'
      )}>
        <HelpCircle className="w-3 h-3 inline-block mr-1 opacity-50" />
        Press ? for help
      </div>
    </div>
  )
}

