/**
 * Quarry Codex Privacy Page
 *
 * Explains the local-only analytics approach for Codex pages.
 * Differentiates from the main Frame.dev privacy policy.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Shield,
  ShieldCheck,
  Database,
  Eye,
  EyeOff,
  BarChart3,
  HardDrive,
  Lock,
  Trash2,
  ArrowLeft,
  Download,
  ExternalLink
} from 'lucide-react'
import FabricNavigation from '@/components/quarry/ui/misc/FabricNavigation'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Privacy | Quarry Codex',
  description:
    'How Quarry Codex handles your data with local-only, privacy-first analytics. No external tracking, no cookies for analytics.',
  keywords: [
    'quarry codex privacy',
    'local analytics',
    'privacy first notes',
    'no tracking notes app',
    'offline analytics',
  ],
  openGraph: {
    title: 'Privacy | Quarry Codex',
    description:
      'Local-only, privacy-first analytics. No external tracking on Codex pages.',
    url: 'https://frame.dev/quarry/privacy',
  },
}

const localDataTypes = [
  {
    icon: BarChart3,
    title: 'Content Growth Metrics',
    description:
      "Tracks how your knowledge base grows over time - strand counts, word counts, tag evolution.",
    stored: 'IndexedDB',
  },
  {
    icon: Eye,
    title: 'Reading History',
    description:
      "Records which strands you've visited and when, for quick access and progress tracking.",
    stored: 'IndexedDB',
  },
  {
    icon: Database,
    title: 'Bookmarks & Annotations',
    description:
      'Your personal bookmarks, highlights, and annotations on strands.',
    stored: 'IndexedDB',
  },
  {
    icon: HardDrive,
    title: 'Preferences & Settings',
    description: 'Theme, font size, sidebar mode, and other display preferences.',
    stored: 'localStorage',
  },
]

export default function CodexPrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <FabricNavigation />

      <main className="pt-20">
        {/* Hero */}
        <section className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
          <Link
            href="/quarry/about"
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to About
          </Link>

          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
              <Shield className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold">Privacy</h1>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                Quarry Codex
              </p>
            </div>
          </div>

          <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Quarry Codex is designed with privacy at its core. All analytics are
            local-only, stored in your browser, and never transmitted to external
            servers.
          </p>
        </section>

        {/* No External Tracking Banner */}
        <section className="bg-emerald-50 dark:bg-emerald-900/10 py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
                <EyeOff className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  No External Tracking on Codex Pages
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Unlike our marketing pages, Codex pages have{' '}
                  <strong>zero external analytics</strong>. No Google Analytics,
                  no Microsoft Clarity, no tracking cookies. Your reading habits
                  and knowledge exploration remain completely private.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What We Store Locally */}
        <section className="container mx-auto px-4 py-16 max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">
            What&apos;s Stored Locally
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {localDataTypes.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="p-6 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {item.description}
                      </p>
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-800 rounded">
                        Stored in: {item.stored}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Your Control */}
        <section className="bg-gray-50 dark:bg-gray-900/50 py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold mb-8 text-center">
              You&apos;re in Control
            </h2>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-center">
                <Lock className="w-8 h-8 text-purple-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Password Protection</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Optionally protect your local data with a password. API keys are
                  encrypted with AES-256-GCM.
                </p>
              </div>

              <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-center">
                <Download className="w-8 h-8 text-cyan-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Export Anytime</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Download all your local data as JSON. Move between browsers or
                  create backups.
                </p>
              </div>

              <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-center">
                <Trash2 className="w-8 h-8 text-red-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Delete Everything</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Clear all local data instantly from Settings. No server-side
                  data to worry about.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison with Marketing Pages */}
        <section className="container mx-auto px-4 py-16 max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Codex vs Marketing Pages
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-4 px-4 font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                    /quarry/* Pages
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-500">
                    Marketing Pages
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                <tr>
                  <td className="py-4 px-4">Google Analytics</td>
                  <td className="py-4 px-4 text-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">
                      Disabled
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-gray-500">
                    With consent
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-4">Microsoft Clarity</td>
                  <td className="py-4 px-4 text-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">
                      Disabled
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-gray-500">
                    With consent
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-4">Cookie Banner</td>
                  <td className="py-4 px-4 text-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">
                      Not shown
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-gray-500">Shown</td>
                </tr>
                <tr>
                  <td className="py-4 px-4">Usage Analytics</td>
                  <td className="py-4 px-4 text-center text-emerald-600 dark:text-emerald-400">
                    Local IndexedDB only
                  </td>
                  <td className="py-4 px-4 text-center text-gray-500">
                    External + Local
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-4">Data Location</td>
                  <td className="py-4 px-4 text-center text-emerald-600 dark:text-emerald-400">
                    Your device only
                  </td>
                  <td className="py-4 px-4 text-center text-gray-500">
                    Your device + GA/Clarity
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Questions about privacy? Check our{' '}
            <Link
              href="/privacy"
              className="text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              main privacy policy
            </Link>{' '}
            or{' '}
            <a
              href="mailto:privacy@frame.dev"
              className="text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              contact us
            </a>
            .
          </p>

          <Link
            href="/quarry"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
          >
            <ShieldCheck className="w-5 h-5" />
            Explore Codex Privately
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  )
}
