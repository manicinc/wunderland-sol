/**
 * Planner Mode Component
 * @module quarry/ui/planner/PlannerMode
 *
 * @description
 * Main container for Planner mode - task and calendar management.
 * Uses QuarryPageLayout for consistent navigation with other Quarry pages.
 * Left sidebar (240px): Calendar, daily notes, tasks, and widgets.
 * Right sidebar (240px): Clock, ambience, full task list with stats.
 */

'use client'

import React, { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import PlannerSidebarPanel from './PlannerSidebarPanel'
import PlannerRightSidebar from './PlannerRightSidebar'
import PlannerFullView from './PlannerFullView'
import { ToastProvider } from '../common/Toast'
import type { ThemeName } from '@/types/theme'

export default function PlannerMode() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const theme = (resolvedTheme || 'dark') as ThemeName

  // Navigate to strand
  const handleNavigateToStrand = useCallback((path: string) => {
    router.push(`/quarry?path=${encodeURIComponent(path)}`)
  }, [router])

  // Open preferences
  const handleOpenPreferences = useCallback(() => {
    router.push('/quarry/settings')
  }, [router])

  // Left sidebar - PlannerSidebarPanel with calendar and widgets (actionable items)
  const leftSidebarContent = (
    <PlannerSidebarPanel
      theme={theme}
      onNavigateToStrand={handleNavigateToStrand}
    />
  )

  // Right sidebar - Clock, tasks, jukebox
  const rightSidebarContent = (
    <PlannerRightSidebar theme={theme} />
  )

  return (
    <ToastProvider>
      <QuarryPageLayout
        title="Planner"
        description="Tasks, calendar, and scheduling"
        leftPanelContent={leftSidebarContent}
        rightPanelContent={rightSidebarContent}
        showRightPanel={true}
        forceSidebarSmall={true}
        rightPanelWidth={240}
      >
        <PlannerFullView
          theme={theme}
          onOpenPreferences={handleOpenPreferences}
          onNavigateToStrand={handleNavigateToStrand}
        />
      </QuarryPageLayout>
    </ToastProvider>
  )
}
