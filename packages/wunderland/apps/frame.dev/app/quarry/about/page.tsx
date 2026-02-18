/**
 * Quarry Codex About Page
 * Information about Quarry Codex - AI-Native Knowledge Management by Frame.dev
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  Brain,
  Shield,
  ShieldCheck,
  Wifi,
  Sparkles,
  Layers,
  Search,
  GitBranch,
  Lock,
  Globe,
  Heart,
  ExternalLink,
  ArrowRight,
  BarChart3
} from 'lucide-react'
import QuarryNavigationLanding from '@/components/quarry/ui/quarry-core/QuarryNavigationLanding'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'About Quarry Codex | AI Notes App by Frame.dev',
  description:
    'Learn about Quarry Codex - your AI-powered personal knowledge management system. Discover our mission, core features, and the OpenStrand schema. Built by Frame.dev.',
  keywords: [
    'about quarry codex',
    'quarry notes about',
    'what is quarry codex',
    'quarry knowledge management',
    'frame.dev about',
    'ai notes app about',
    'openstrand about',
  ],
  openGraph: {
    title: 'About Quarry | AI Notes App by Frame.dev',
    description: 'Learn about Quarry - your AI-powered personal knowledge management system built by Frame.dev.',
    url: 'https://frame.dev/quarry/about',
    siteName: 'Quarry Codex by Frame.dev',
    type: 'website',
  },
}

const features = [
  {
    icon: Brain,
    title: 'AI-Native Design',
    description: 'Built from the ground up for AI integration. Semantic search, intelligent suggestions, and LLM-powered Q&A.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    icon: Wifi,
    title: 'Offline-First',
    description: 'Your notes work everywhere, even without internet. Full functionality offline with seamless sync when connected.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    icon: Shield,
    title: 'Privacy-Focused',
    description: 'Your data stays yours. Local-first architecture with optional encrypted sync. Self-host for complete control.',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  {
    icon: GitBranch,
    title: 'Open Source',
    description: 'Fully open source under permissive license. Audit the code, contribute features, or build your own extensions.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
]

const principles = [
  {
    icon: Lock,
    title: 'Data Sovereignty',
    description: 'Your notes are yours. We never access your data without permission.',
  },
  {
    icon: Layers,
    title: 'Interoperability',
    description: 'Standard Markdown files. Export anytime. No lock-in.',
  },
  {
    icon: Search,
    title: 'Findability',
    description: 'If you wrote it, you should find it. AI-powered search makes it possible.',
  },
  {
    icon: Heart,
    title: 'User-First',
    description: 'Built for power users who demand the best tools for thought.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <QuarryNavigationLanding />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24 max-w-5xl">
          <div className="text-center mb-16">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative w-20 h-20">
                <Image
                  src="/quarry-icon-mono-light.svg"
                  alt="Quarry"
                  fill
                  className="object-contain block dark:hidden"
                />
                <Image
                  src="/quarry-icon-mono-dark.svg"
                  alt="Quarry"
                  fill
                  className="object-contain hidden dark:block"
                />
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              About{' '}
              <span
                style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}
                className="bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-rose-400 dark:to-red-400 text-transparent bg-clip-text"
              >
                Quarry
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-4">
              AI-Native Personal Knowledge Management
            </p>
            <p className="text-lg text-gray-500 dark:text-gray-400">
              Built by{' '}
              <a
                href="https://frame.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Frame.dev
              </a>
            </p>
          </div>

          {/* Mission Statement */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-3xl p-8 md:p-12 mb-16 border border-emerald-200 dark:border-emerald-800">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">
              Our Mission
            </h2>
            <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 text-center max-w-3xl mx-auto leading-relaxed">
              We believe your notes should be as intelligent as you are. Quarry Codex combines the
              simplicity of Markdown with the power of AI to create a knowledge management system
              that actually helps you think, learn, and create.
            </p>
          </div>
        </section>

        {/* Core Features */}
        <section className="bg-gray-50 dark:bg-gray-900/50 py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
              Core Features
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <div
                    key={feature.title}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
                  >
                    <div className={`inline-flex p-3 rounded-xl ${feature.bgColor} mb-4`}>
                      <Icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* OpenStrand Schema */}
        <section className="container mx-auto px-4 py-16 md:py-24 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              The OpenStrand Schema
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Quarry Codex is built on OpenStrand—an open, AI-native schema for organizing knowledge.
            </p>
          </div>

          <div className="bg-gray-900 dark:bg-gray-800 rounded-2xl p-8 text-white">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="text-4xl font-bold text-emerald-400 mb-2">Weaves</div>
                <p className="text-gray-400">Top-level knowledge domains</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-teal-400 mb-2">Looms</div>
                <p className="text-gray-400">Thematic collections within weaves</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-cyan-400 mb-2">Strands</div>
                <p className="text-gray-400">Individual knowledge units</p>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-700 text-center">
              <Link
                href="/quarry/architecture"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Learn more about the architecture
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Guiding Principles */}
        <section className="bg-gray-50 dark:bg-gray-900/50 py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
              Guiding Principles
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              {principles.map((principle) => {
                const Icon = principle.icon
                return (
                  <div
                    key={principle.title}
                    className="flex gap-4 items-start"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">
                        {principle.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {principle.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Privacy-First Analytics Section */}
        <section className="container mx-auto px-4 py-16 md:py-24 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Privacy-First Analytics
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Quarry Codex uses local-only analytics that never leave your device.
            </p>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-8 border border-emerald-200 dark:border-emerald-800">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-800/50 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
                    No External Tracking
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Codex pages have zero external analytics. No Google Analytics, no Microsoft Clarity,
                    no cookies for tracking. Your reading habits stay private.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-800/50 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
                    Local-Only Metrics
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Content growth, reading activity, and tag analytics are stored in your browser&apos;s
                    local database (IndexedDB). This data never leaves your device.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-emerald-200 dark:border-emerald-700 text-center">
              <Link
                href="/quarry/privacy"
                className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              >
                Learn more about Codex privacy
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Frame.dev Section */}
        <section className="container mx-auto px-4 py-16 md:py-24 max-w-5xl">
          <div className="bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 md:p-12 text-center border border-gray-200 dark:border-gray-700">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              Built by Frame.dev
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
              Quarry Codex is part of the Frame ecosystem—building AI-native infrastructure
              for developers and knowledge workers.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://frame.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Visit Frame.dev
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href="https://frame.dev/about"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-semibold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                About Frame.dev
              </a>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to try Quarry Codex?</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Start organizing your knowledge with AI-powered tools.
          </p>
          <Link
            href="/quarry"
            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl"
          >
            <Sparkles className="w-5 h-5" />
            Try Quarry Codex
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  )
}

