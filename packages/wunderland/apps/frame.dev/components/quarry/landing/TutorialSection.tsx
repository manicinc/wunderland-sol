'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import {
  Compass,
  Search,
  Tag,
  Network,
  FilePlus,
  FolderInput,
  GraduationCap,
  Volume2,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

/**
 * Tutorial card data matching the TUTORIALS from tutorials/index.ts
 */
const tutorials = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of navigating your knowledge base',
    icon: Compass,
    color: 'emerald',
  },
  {
    id: 'semantic-search',
    title: 'Semantic Search',
    description: 'Find notes by meaning, not just keywords',
    icon: Search,
    color: 'cyan',
  },
  {
    id: 'block-tagging',
    title: 'Block-Level Tagging',
    description: 'Tag individual blocks with structured supertags',
    icon: Tag,
    color: 'pink',
  },
  {
    id: 'knowledge-graph',
    title: 'Knowledge Graph',
    description: 'Visualize connections between your notes',
    icon: Network,
    color: 'violet',
  },
  {
    id: 'strand-creation',
    title: 'Creating Notes',
    description: 'Create and organize new content',
    icon: FilePlus,
    color: 'teal',
  },
  {
    id: 'import-export',
    title: 'Import & Export',
    description: 'Bring in notes or back up your data',
    icon: FolderInput,
    color: 'blue',
  },
  {
    id: 'flashcards',
    title: 'Flashcards & Learning',
    description: 'Use spaced repetition to remember',
    icon: GraduationCap,
    color: 'amber',
  },
  {
    id: 'qa-ai',
    title: 'Q&A & AI Features',
    description: 'Get AI-powered answers with citations',
    icon: Sparkles,
    color: 'purple',
  },
]

const colorClasses: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    glow: 'group-hover:shadow-[0_0_40px_rgba(16,185,129,0.15)]',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-500',
    border: 'border-cyan-500/20 hover:border-cyan-500/40',
    glow: 'group-hover:shadow-[0_0_40px_rgba(6,182,212,0.15)]',
  },
  pink: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-500',
    border: 'border-pink-500/20 hover:border-pink-500/40',
    glow: 'group-hover:shadow-[0_0_40px_rgba(236,72,153,0.15)]',
  },
  violet: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-500',
    border: 'border-violet-500/20 hover:border-violet-500/40',
    glow: 'group-hover:shadow-[0_0_40px_rgba(139,92,246,0.15)]',
  },
  teal: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-500',
    border: 'border-teal-500/20 hover:border-teal-500/40',
    glow: 'group-hover:shadow-[0_0_40px_rgba(20,184,166,0.15)]',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    border: 'border-blue-500/20 hover:border-blue-500/40',
    glow: 'group-hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    border: 'border-amber-500/20 hover:border-amber-500/40',
    glow: 'group-hover:shadow-[0_0_40px_rgba(245,158,11,0.15)]',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-500',
    border: 'border-purple-500/20 hover:border-purple-500/40',
    glow: 'group-hover:shadow-[0_0_40px_rgba(168,85,247,0.15)]',
  },
}

export function TutorialSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section ref={sectionRef} className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Learn <span className="text-emerald-500">Everything</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Interactive guided tours help you master every feature. Start with the basics
            or dive into advanced topics.
          </p>
        </motion.div>

        {/* Tutorial Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tutorials.map((tutorial, i) => {
            const Icon = tutorial.icon
            const colors = colorClasses[tutorial.color]

            return (
              <motion.div
                key={tutorial.id}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Link
                  href={`/codex?tutorial=${tutorial.id}`}
                  className={`
                    group block p-6 rounded-2xl border transition-all duration-300
                    bg-white dark:bg-gray-900/80 backdrop-blur-sm
                    ${colors.border} ${colors.glow}
                    hover:shadow-lg hover:-translate-y-1
                  `}
                >
                  {/* Icon */}
                  <div
                    className={`
                      inline-flex p-3 rounded-xl mb-4 transition-transform
                      ${colors.bg} group-hover:scale-110
                    `}
                  >
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>

                  {/* Content */}
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-emerald-500 transition-colors">
                    {tutorial.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {tutorial.description}
                  </p>

                  {/* Start indicator */}
                  <div className="flex items-center gap-1 text-xs font-medium text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Start tutorial</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <Link
            href="/quarry"
            className="inline-flex items-center gap-2 text-emerald-500 font-medium hover:text-emerald-600 transition-colors"
          >
            <span>Or explore on your own</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

export default TutorialSection
