'use client'

/**
 * Activity Log Page - View audit logs, undo history, and session activity
 * @module codex/activity/page
 */

import { Suspense, useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useTheme } from 'next-themes'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import AmbienceRightSidebar from '@/components/quarry/ui/sidebar/AmbienceRightSidebar'
import ActivityLeftSidebar from '@/components/quarry/ui/sidebar/ActivityLeftSidebar'
import ActivityLogViewer from './ActivityLogViewer'

// Metadata moved to layout.tsx for client component compatibility

function ActivityPageContent() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted ? resolvedTheme === 'dark' : false

  return (
    <QuarryPageLayout
      title="Activity"
      description="View your activity history, audit logs, and undo/redo stack"
      showRightPanel={true}
      rightPanelContent={<AmbienceRightSidebar />}
      rightPanelWidth={260}
      forceSidebarSmall={true}
      leftPanelContent={
        <ActivityLeftSidebar
          isDark={isDark}
          stats={{ total: 0, today: 0, thisWeek: 0 }}
        />
      }
    >
      <ActivityLogViewer />
    </QuarryPageLayout>
  )
}

export default function ActivityPage() {
  return (
    <Suspense fallback={
      <QuarryPageLayout title="Activity">
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      </QuarryPageLayout>
    }>
      <ActivityPageContent />
    </Suspense>
  )
}
