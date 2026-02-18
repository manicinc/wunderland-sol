import type { Metadata } from 'next'
import PageLayout from '@/components/page-layout'
import Link from 'next/link'
import Image from 'next/image'
import { Book, Code, Layers, Lightbulb, Search, Tag, MessageSquare, Github, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Quarry Documentation | AI Notes App Docs by Frame.dev',
  description:
    'Comprehensive documentation for Quarry Codex - your AI-powered notes app. Learn about the Fabric notetaking system, OpenStrand schema, knowledge graphs, and AI integration. Built by Frame.dev.',
  keywords: [
    'quarry codex documentation',
    'fabric notes docs',
    'fabric ai notes guide',
    'fabric knowledge management',
    'openstrand documentation',
    'fabric notetaking tutorial',
    'ai notes app documentation',
    'frame.dev docs',
  ],
}

const categories = [
  {
    name: 'Architecture',
    description: 'Deep dives into Quarry Codex schema, OpenStrand infrastructure, and the knowledge graph system design',
    icon: Layers,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    links: [
      { name: 'Quarry Codex Architecture', href: '/quarry/architecture' },
      { name: 'Weaves, Looms & Strands', href: '/blog/recursive-knowledge-schema' },
      { name: 'SQL Caching & NLP Indexing', href: '/blog/sql-cache-nlp-indexing' },
    ],
  },
  {
    name: 'Guides',
    description: 'Step-by-step tutorials for getting started with Quarry Codex and contributing to the project',
    icon: Book,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    links: [
      { name: 'Getting Started with Fabric', href: '/docs/guides/getting-started' },
      { name: 'Contributing to Codex', href: '/docs/guides/contributing' },
      { name: 'Self-Hosting Fabric', href: '/quarry/self-host' },
    ],
  },
  {
    name: 'API Reference',
    description: 'Complete API documentation for Quarry Codex endpoints, authentication, and OpenStrand schemas',
    icon: Code,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    links: [
      { name: 'REST API', href: '/quarry/api' },
      { name: 'GraphQL API', href: '/docs/api/graphql' },
      { name: 'OpenStrand Schema', href: '/quarry/api-docs' },
    ],
  },
  {
    name: 'Tutorials',
    description: 'Interactive examples and real-world use cases for building with Quarry Codex AI features',
    icon: Lightbulb,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    links: [
      { name: 'Build a Knowledge Graph', href: '/docs/tutorials/knowledge-graph' },
      { name: 'RAG with Quarry Codex', href: '/docs/tutorials/rag' },
      { name: 'Custom Looms & Weaves', href: '/docs/tutorials/custom-looms' },
    ],
  },
]

const popularTags = [
  'weave',
  'loom',
  'strand',
  'metadata',
  'indexing',
  'github-actions',
  'nlp',
  'sql-cache',
  'recursion',
  'graph-algorithms',
  'recommendations',
  'search',
]

export default function DocsPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 max-w-6xl pt-20 pb-20">
        {/* Header with Quarry Codex Branding */}
        <div className="text-center mb-16">
          {/* Fabric Logo */}
          <div className="flex justify-center mb-6">
            <Link href="/quarry" className="group flex items-center gap-3">
              <div className="relative w-14 h-14">
                <Image
                  src="/fabric-icon-light.svg"
                  alt="Fabric"
                  fill
                  className="object-contain block dark:hidden transition-transform group-hover:scale-110"
                />
                <Image
                  src="/fabric-icon-dark.svg"
                  alt="Fabric"
                  fill
                  className="object-contain hidden dark:block transition-transform group-hover:scale-110"
                />
              </div>
              <div className="flex flex-col items-start">
                <span 
                  className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white"
                  style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}
                >
                  Fabric
                  <span 
                    className="ml-2 text-xl font-semibold tracking-[0.08em] uppercase bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-transparent bg-clip-text"
                    style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}
                  >
                    Codex
                  </span>
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  by Frame.dev
                </span>
              </div>
            </Link>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 heading-gradient">
            Documentation
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Everything you need to get started with Quarry Codex—your AI-powered notes app for personal knowledge management. Architecture deep-dives, tutorials, and API reference.
          </p>
          
          {/* Quick CTA */}
          <div className="flex justify-center gap-4 mt-8">
            <Link
              href="/quarry"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              Try Quarry Codex
            </Link>
            <Link
              href="/quarry/landing"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documentation..."
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
            />
          </div>
        </div>

        {/* Category Cards */}
        <div className="grid gap-8 md:grid-cols-2 mb-16">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <div
                key={category.name}
                className="group relative overflow-hidden rounded-3xl border-2 border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 backdrop-blur hover:shadow-2xl transition-all duration-300"
              >
                {/* Accent gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative p-8">
                  {/* Icon */}
                  <div className={`inline-flex p-4 rounded-2xl ${category.bgColor} mb-6`}>
                    <Icon className={`w-8 h-8 ${category.color}`} />
                  </div>

                  {/* Title & Description */}
                  <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                    {category.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {category.description}
                  </p>

                  {/* Links */}
                  <ul className="space-y-3">
                    {category.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors group/link"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tag Cloud */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-purple-600" />
            Popular Topics
          </h2>
          <div className="flex flex-wrap gap-3">
            {popularTags.map((tag) => (
              <Link
                key={tag}
                href={`/quarry/search?q=${tag}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-colors text-sm font-medium"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </Link>
            ))}
          </div>
        </div>

        {/* Community Section */}
        <div className="rounded-3xl border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-8 md:p-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              Can't find what you're looking for?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Join our community to ask questions, share ideas, and collaborate with other Frame builders.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="https://discord.gg/VXXC4SJMKh"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl"
              >
                <MessageSquare className="w-5 h-5" />
                Join Discord
              </Link>
              <Link
                href="https://github.com/framersai/quarry/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl border-2 border-gray-200 dark:border-gray-700"
              >
                <Github className="w-5 h-5" />
                GitHub Discussions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

