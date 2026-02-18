/**
 * Dashboard Page (/app/dashboard on quarry.space)
 */
'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Loader2 } from 'lucide-react'
import { ToastProvider } from '@/components/quarry/ui/common/Toast'
import { InstanceConfigProvider } from '@/lib/config'
import { Dashboard } from '@/components/quarry/dashboard'
import { DashboardLeftSidebar } from '@/components/quarry/dashboard/DashboardLeftSidebar'
import { DashboardRightSidebar } from '@/components/quarry/dashboard/DashboardRightSidebar'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'

function DashboardContent() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const theme = resolvedTheme || 'dark'

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  return (
    <QuarryPageLayout
      title="Dashboard"
      description="Customizable widget-based productivity dashboard"
      forceSidebarSmall={true}
      leftPanelWidth={240}
      rightPanelWidth={200}
      showRightPanel={true}
      leftPanelContent={<DashboardRightSidebar theme={theme} onNavigate={handleNavigate} />}
      rightPanelContent={<DashboardLeftSidebar theme={theme} onNavigate={handleNavigate} />}
    >
      <div className="h-[calc(100vh-120px)]">
        <Dashboard
          theme={theme}
          onNavigate={handleNavigate}
          showSidebar={false}
        />
      </div>
    </QuarryPageLayout>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <QuarryPageLayout title="Dashboard">
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        </div>
      </QuarryPageLayout>
    }>
      <InstanceConfigProvider>
        <ToastProvider>
          <DashboardContent />
        </ToastProvider>
      </InstanceConfigProvider>
    </Suspense>
  )
}
