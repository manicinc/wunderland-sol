import { Metadata } from 'next'
import Link from 'next/link'
import { Code, ExternalLink, Book, Package, GitBranch, Bot, Database } from 'lucide-react'
import { getPackageVersions, type PackageVersions } from '@/lib/packageVersions'

export const metadata: Metadata = {
  title: 'API & Packages | Frame.dev',
  description: 'Frame.dev API documentation, NPM packages, and developer resources. Build with Quarry Codex, AgentOS, and OpenStrand.',
}

// Revalidate every hour to keep versions fresh
export const revalidate = 3600

export default async function APIPage() {
  const versions = await getPackageVersions()

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">API & Packages</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-12">
          Developer resources, NPM packages, and API documentation for the Frame ecosystem.
        </p>

        {/* NPM Packages */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Package className="w-6 h-6" />
            NPM Packages
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* AgentOS */}
            <div className="border-2 border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-emerald-500 dark:hover:border-emerald-400 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-xl font-bold">@framers/agentos</h3>
                </div>
                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 px-2 py-1 rounded-full">
                  v{versions.agentos}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Adaptive AI agency runtime for building agents with dynamic personas, tool orchestration, and emergent behaviors.
              </p>
              <div className="flex gap-3">
                <a
                  href="https://www.npmjs.com/package/@framers/agentos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  NPM <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://github.com/framersai/agentos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Source <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://agentos.sh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Docs <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Codex Viewer */}
            <div className="border-2 border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-cyan-500 dark:hover:border-cyan-400 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Book className="w-5 h-5 text-cyan-600" />
                  <h3 className="text-xl font-bold">@framers/codex-viewer</h3>
                </div>
                <span className="text-xs bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 px-2 py-1 rounded-full">
                  v{versions.codexViewer}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Embeddable GitHub-based knowledge viewer with analog paper styling, semantic search, and wiki features.
              </p>
              <div className="flex gap-3">
                <a
                  href="https://www.npmjs.com/package/@framers/codex-viewer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
                >
                  NPM <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://github.com/framersai/frame.dev/tree/master/packages/codex-viewer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Source <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* SQL Storage Adapter */}
            <div className="border-2 border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-purple-500 dark:hover:border-purple-400 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-600" />
                  <h3 className="text-xl font-bold">@framers/sql-storage-adapter</h3>
                </div>
                <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full">
                  v{versions.sqlStorageAdapter}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Universal SQL storage adapter for browser (IndexedDB/sql.js) and Node.js with migrations and queries.
              </p>
              <div className="flex gap-3">
                <a
                  href="https://www.npmjs.com/package/@framers/sql-storage-adapter"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                >
                  NPM <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://github.com/framersai/sql-storage-adapter"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Source <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* GitHub Repositories */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <GitBranch className="w-6 h-6" />
            Repositories
          </h2>
          
          <div className="grid gap-4">
            <a
              href="https://github.com/framersai/agentos"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-emerald-500 dark:hover:border-emerald-400 transition-colors block"
            >
              <h3 className="text-lg font-bold mb-2">agentos</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AgentOS core runtime - adaptive AI agency with personas, tools, guardrails, and cognitive orchestration.
              </p>
            </a>

            <a
              href="https://github.com/framersai/frame.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-cyan-500 dark:hover:border-cyan-400 transition-colors block"
            >
              <h3 className="text-lg font-bold mb-2">frame.dev</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Main website with Codex viewer, documentation, and blog. Monorepo containing all Frame packages.
              </p>
            </a>
            
            <a
              href="https://github.com/framersai/codex"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-amber-500 dark:hover:border-amber-400 transition-colors block"
            >
              <h3 className="text-lg font-bold mb-2">codex</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The canonical knowledge repository following OpenStrand schema. Example Codex with auto-indexing and search.
              </p>
            </a>
            
            <a
              href="https://github.com/framersai/codex-template"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-green-500 dark:hover:border-green-400 transition-colors block"
            >
              <h3 className="text-lg font-bold mb-2">codex-template</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Starter template for creating your own Codex. Pre-configured with OpenStrand schema, GitHub Actions, and examples.
              </p>
            </a>
          </div>
        </section>

        {/* API Documentation */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Code className="w-6 h-6" />
            API Documentation
          </h2>
          
          <div className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-6">
            <p className="text-sm text-amber-900 dark:text-amber-200 mb-4">
              Frame.dev currently uses static site generation. REST API endpoints are coming soon.
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              For now, use the NPM packages above for programmatic access to Codex viewing and storage.
            </p>
          </div>
        </section>

        {/* Back Link */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

