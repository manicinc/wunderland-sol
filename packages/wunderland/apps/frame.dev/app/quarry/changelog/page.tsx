import { Metadata } from 'next'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import CodexChangelogAnalytics from '@/components/codex-changelog-analytics'
import ToolPageLeftSidebar from '@/components/quarry/ui/sidebar/ToolPageLeftSidebar'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Quarry Changelog – Activity & Commit History',
  description: 'Explore Quarry Codex changelog: automated tracking of commits, issues, and pull requests with visual analytics.',
}

export default function CodexChangelogPage() {
  return (
    <QuarryPageLayout
      forceSidebarSmall={true}
      leftPanelContent={
        <ToolPageLeftSidebar
          isDark={true}
          title="Changelog"
          description="Track all commits, issues, and pull requests to the Quarry Codex."
          tips={[
            'Data is updated daily via GitHub Actions',
            'Stored in append-only JSONL format',
            'View raw data on GitHub'
          ]}
          relatedLinks={[
            { href: '/quarry/activity', label: 'Activity Log', icon: 'Activity' },
            { href: '/quarry/architecture', label: 'Architecture', icon: 'BookOpen' },
          ]}
        />
      }
    >
      <div className="container mx-auto px-4 max-w-6xl pt-20 pb-20">
        <Link
          href="/quarry"
          className="inline-flex items-center gap-2 text-sm text-ink-600 dark:text-paper-400 hover:text-frame-green mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Codex
        </Link>

        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 heading-display">
            Quarry Codex Changelog
          </h1>
          <p className="text-lg text-ink-600 dark:text-paper-400 max-w-3xl">
            Automated tracking of all commits, issues, and pull requests. Data is stored in append-only JSONL format
            and updated daily via GitHub Actions.
          </p>
        </header>

        <CodexChangelogAnalytics />

        <div className="mt-12 p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
          <h3 className="text-xl font-bold mb-3">About the Changelog System</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Quarry Codex uses an automated changelog system that parses git commits (conventional format) and GitHub
            activity (issues/PRs) into monthly JSONL files. This provides a complete, queryable history of all changes.
          </p>
          <div className="flex gap-4">
            <a
              href="https://github.com/framersai/quarry/tree/master/codex-history"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-sm font-medium"
            >
              View Raw Data →
            </a>
            <a
              href="https://github.com/framersai/quarry#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-sm font-medium"
            >
              Documentation →
            </a>
          </div>
        </div>
      </div>
    </QuarryPageLayout>
  )
}

