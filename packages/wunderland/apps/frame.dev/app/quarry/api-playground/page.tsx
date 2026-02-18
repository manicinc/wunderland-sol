import { Metadata } from 'next'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import ToolPageLeftSidebar from '@/components/quarry/ui/sidebar/ToolPageLeftSidebar'

const ApiPlayground = dynamic(
  () => import('@/components/quarry/ui/api/ApiPlayground'),
  { ssr: false }
)

export const metadata: Metadata = {
  title: 'API Playground | Quarry',
  description: 'Interactive API testing interface for the Quarry REST API. Test endpoints, manage tokens, and explore the API with live examples.',
}

export default function ApiPlaygroundPage() {
  return (
    <Suspense fallback={
      <QuarryPageLayout title="API Playground">
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      </QuarryPageLayout>
    }>
      <QuarryPageLayout
        title="API Playground"
        description="Interactive API testing interface"
        forceSidebarSmall={true}
        leftPanelContent={
          <ToolPageLeftSidebar
            isDark={true}
            title="API Playground"
            description="Test Quarry API endpoints with live examples and response previews."
            tips={[
              'Use your API token for authenticated requests',
              'Try different endpoints to explore the API',
              'Copy code snippets for your projects'
            ]}
            relatedLinks={[
              { href: '/quarry/architecture', label: 'Architecture', icon: 'BookOpen' },
              { href: '/quarry/graph', label: 'Knowledge Graph', icon: 'Network' },
            ]}
          />
        }
      >
        <div className="h-[calc(100vh-120px)]">
          <ApiPlayground />
        </div>
      </QuarryPageLayout>
    </Suspense>
  )
}

