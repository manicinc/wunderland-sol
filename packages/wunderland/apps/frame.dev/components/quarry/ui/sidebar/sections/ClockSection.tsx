/**
 * Clock Section
 * 
 * Compact analog clock section for sidebars.
 * Uses ClockWidget in compact mode.
 * @module components/quarry/ui/sidebar/sections/ClockSection
 */

'use client'

import React from 'react'
import { Clock } from 'lucide-react'
import { CollapsibleSidebarSection } from './CollapsibleSidebarSection'
import { ClockWidget } from '@/components/quarry/dashboard/widgets/ClockWidget'

export interface ClockSectionProps {
  /** Current theme */
  theme: string
  /** Whether in dark mode */
  isDark: boolean
  /** Whether expanded by default */
  defaultExpanded?: boolean
  /** Navigation handler */
  onNavigate?: (path: string) => void
}

export function ClockSection({
  theme,
  isDark,
  defaultExpanded = true,
  onNavigate = () => {},
}: ClockSectionProps) {
  return (
    <CollapsibleSidebarSection
      title="Clock"
      icon={Clock}
      defaultExpanded={defaultExpanded}
      isDark={isDark}
    >
      <div className="p-3">
        <ClockWidget 
          theme={theme} 
          size="small" 
          compact 
          onNavigate={onNavigate} 
        />
      </div>
    </CollapsibleSidebarSection>
  )
}

export default ClockSection

