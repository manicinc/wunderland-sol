'use client'

import { motion, useInView, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { isQuarryDomain } from '@/lib/utils/deploymentMode'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import { FloatingElements } from './FloatingElements'

/**
 * Get the correct URL for static assets that are hosted on frame.dev
 * On quarry.space, we need to use absolute URLs pointing to frame.dev
 */
function getAssetUrl(path: string): string {
  if (typeof window === 'undefined') return path
  if (isQuarryDomain()) {
    return `https://frame.dev${path}`
  }
  return path
}
import {
  Brain,
  Search,
  Network,
  Link2,
  FileText,
  Zap,
  Globe,
  Shield,
  Palette,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Github,
  Check,
  Sparkles,
  Terminal,
  Cpu,
  Layers,
  Play,
  Users,
  Building2,
  GraduationCap,
  Code2,
  Database,
  GitBranch,
  X,
  Cloud,
  Smartphone,
  Eye,
  Tag,
  Tags,
  Filter,
  Bot,
  PenTool,
  BookOpen,
  Workflow,
  FolderTree,
  Hash,
  Timer,
  Calendar,
  Clock,
  Bell,
  GripVertical,
  CalendarDays,
  Repeat,
  LayoutList,
  Flame,
  Infinity as InfinityIcon,
  Move,
  Share2,
  Scale,
  Star,
  Lock,
  History,
  KeyRound,
  FileJson,
  Key,
  ScrollText,
  Sunrise,
  RotateCcw,
  Info,
  Crown,
  User,
} from 'lucide-react'
import { useGithubTree } from '@/components/quarry/hooks/useGithubTree'
import { TUTORIALS } from '@/components/quarry/tutorials'
import { InfoTooltip } from './ui'

/* ═══════════════════════════════════════════════════════════════════════════════
   MODERN HERO SECTION
   Clean, minimal, powerful typography
   ═══════════════════════════════════════════════════════════════════════════════ */

import { FabricBackground } from './FabricBackground'
import { KnowledgeFlowViz } from './KnowledgeFlowViz'
import { FlashcardDemo } from './FlashcardDemo'

/* ═══════════════════════════════════════════════════════════════════════════════
   NLP EXPLAINER COMPONENT
   Expandable accordion explaining NLP techniques
   ═══════════════════════════════════════════════════════════════════════════════ */

const nlpTechniques = [
  {
    id: 'nlp-intro',
    title: 'What is NLP?',
    content: 'Natural Language Processing enables computers to understand, interpret, and generate human language. Quarry uses NLP entirely offline — no data ever leaves your device.',
    icon: Brain,
  },
  {
    id: 'tfidf',
    title: 'TF-IDF Weighting',
    content: 'Term Frequency-Inverse Document Frequency identifies the most important words in your notes by measuring how often they appear relative to your entire knowledge base.',
    icon: Filter,
  },
  {
    id: 'embeddings',
    title: 'Semantic Embeddings',
    content: 'Words and sentences are converted to numerical vectors that capture meaning. Similar concepts cluster together, enabling semantic search beyond keyword matching.',
    icon: Network,
  },
  {
    id: 'entity',
    title: 'Entity Recognition',
    content: 'Automatically detects people, places, organizations, dates, and technical terms. These become tags and connections without manual effort.',
    icon: Tag,
  },
  {
    id: 'vocabulary',
    title: 'Dynamic Vocabulary',
    content: 'Goes beyond hardcoded keywords using WordNet synonyms, hypernyms, and 384-dimensional embeddings. Classifies text into subjects, topics, skills, and difficulty levels with semantic understanding.',
    icon: BookOpen,
  },
]

function NLPExplainer() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="mt-4 pt-4 border-t border-emerald-200/50 dark:border-emerald-700/30">
      <button
        onClick={() => setExpandedId(expandedId ? null : 'nlp-intro')}
        className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
      >
        <Brain className="w-3.5 h-3.5" />
        <span className="font-medium">How does offline NLP work?</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${expandedId ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {expandedId && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2">
              {nlpTechniques.map((tech) => {
                const Icon = tech.icon
                const isExpanded = expandedId === tech.id

                return (
                  <motion.div
                    key={tech.id}
                    className={`
                      rounded-lg border transition-all cursor-pointer
                      ${isExpanded
                        ? 'bg-white dark:bg-white/5 border-emerald-300 dark:border-emerald-600'
                        : 'bg-white/50 dark:bg-white/[0.02] border-emerald-200/50 dark:border-emerald-700/30 hover:border-emerald-300 dark:hover:border-emerald-600'
                      }
                    `}
                    onClick={() => setExpandedId(isExpanded ? null : tech.id)}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div className={`
                        w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0
                        ${isExpanded
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                        }
                      `}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-xs font-medium flex-1 ${isExpanded ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        {tech.title}
                      </span>
                      <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="px-3 pb-3 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            {tech.content}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SPIRAL LEARNING SECTION
   Explains spiral curriculum with citations and interactive diagram
   ═══════════════════════════════════════════════════════════════════════════════ */

export function SpiralLearningSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 })
  const [activeNode, setActiveNode] = useState<number | null>(null)

  const spiralNodes = [
    { level: 1, label: 'Foundation', desc: 'Core concepts introduced simply' },
    { level: 2, label: 'Exploration', desc: 'Deeper dive with connections' },
    { level: 3, label: 'Application', desc: 'Practical examples & exercises' },
    { level: 4, label: 'Integration', desc: 'Cross-topic synthesis' },
    { level: 5, label: 'Mastery', desc: 'Advanced understanding' },
  ]

  return (
    <section
      ref={sectionRef}
      id="spiral-learning"
      className="relative py-24 px-4 bg-gradient-to-b from-transparent via-violet-50/20 to-gray-50/30 dark:from-transparent dark:via-violet-950/15 dark:to-gray-900/30 overflow-hidden"
    >
      {/* Glass overlay for smooth blending */}
      <div className="absolute inset-0 backdrop-blur-[0.5px] bg-gradient-to-b from-white/5 via-transparent to-white/5 dark:from-black/5 dark:via-transparent dark:to-black/5 pointer-events-none" />
      {/* Spiral strand background */}
      <FabricBackground variant="spiral" opacity={0.06} />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-quarry-charcoal dark:text-quarry-offwhite mb-4">
            Spiral Learning{' '}
            <span className="text-violet-600 dark:text-violet-400">Curriculum</span>
          </h2>

          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Your notes organize themselves into optimal learning paths. Concepts are revisited at increasing depth, building mastery through natural progression.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Spiral Diagram */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative aspect-square max-w-md mx-auto"
          >
            <svg viewBox="0 0 400 400" className="w-full h-full">
              {/* Spiral path */}
              <defs>
                <linearGradient id="spiralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Animated spiral */}
              <motion.path
                d="M200 200
                   Q200 180 220 180
                   Q260 180 260 220
                   Q260 280 200 280
                   Q120 280 120 200
                   Q120 100 200 100
                   Q320 100 320 200
                   Q320 340 200 340
                   Q60 340 60 200"
                fill="none"
                stroke="url(#spiralGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={isInView ? { pathLength: 1 } : {}}
                transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
              />

              {/* Level nodes */}
              {spiralNodes.map((node, i) => {
                const angles = [0, 72, 144, 216, 288]
                const radii = [40, 70, 100, 130, 160]
                const x = 200 + radii[i] * Math.cos((angles[i] - 90) * Math.PI / 180)
                const y = 200 + radii[i] * Math.sin((angles[i] - 90) * Math.PI / 180)
                const isActive = activeNode === i

                return (
                  <g key={i}>
                    {/* Connection line to center */}
                    <motion.line
                      x1="200"
                      y1="200"
                      x2={x}
                      y2={y}
                      stroke={isActive ? '#7c3aed' : '#e5e7eb'}
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      initial={{ opacity: 0 }}
                      animate={isInView ? { opacity: 0.5 } : {}}
                      transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
                      className="dark:stroke-gray-700"
                    />

                    {/* Node circle */}
                    <motion.circle
                      cx={x}
                      cy={y}
                      r={isActive ? 28 : 24}
                      fill={isActive ? '#7c3aed' : '#f5f3ff'}
                      stroke={isActive ? '#7c3aed' : '#c4b5fd'}
                      strokeWidth="2"
                      className={`cursor-pointer transition-all ${isActive ? '' : 'dark:fill-violet-900/50 dark:stroke-violet-600'}`}
                      initial={{ scale: 0 }}
                      animate={isInView ? { scale: 1 } : {}}
                      transition={{ duration: 0.4, delay: 1 + i * 0.15, type: "spring" }}
                      onMouseEnter={() => setActiveNode(i)}
                      onMouseLeave={() => setActiveNode(null)}
                    />

                    {/* Level number */}
                    <motion.text
                      x={x}
                      y={y + 5}
                      textAnchor="middle"
                      fill={isActive ? 'white' : '#7c3aed'}
                      fontSize="14"
                      fontWeight="bold"
                      className="pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={isInView ? { opacity: 1 } : {}}
                      transition={{ duration: 0.3, delay: 1.2 + i * 0.15 }}
                    >
                      {node.level}
                    </motion.text>
                  </g>
                )
              })}

              {/* Center hub */}
              <motion.circle
                cx="200"
                cy="200"
                r="30"
                fill="#7c3aed"
                initial={{ scale: 0 }}
                animate={isInView ? { scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.3, type: "spring" }}
              />
              <motion.text
                x="200"
                y="205"
                textAnchor="middle"
                fill="white"
                fontSize="10"
                fontWeight="bold"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ duration: 0.3, delay: 0.6 }}
              >
                CORE
              </motion.text>
            </svg>

            {/* Active node tooltip */}
            <AnimatePresence>
              {activeNode !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 px-4 py-2 bg-violet-600 text-white rounded-lg shadow-lg"
                >
                  <p className="text-sm font-semibold">{spiralNodes[activeNode].label}</p>
                  <p className="text-xs text-violet-200">{spiralNodes[activeNode].desc}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right: Features & Citation */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            {/* Features */}
            <div className="space-y-4 mb-8">
              {[
                {
                  icon: BookOpen,
                  title: 'Auto-Generated Study Guides',
                  desc: 'AI analyzes your notes and creates structured guides with prerequisites, key concepts, and review questions.',
                },
                {
                  icon: FolderTree,
                  title: 'Self-Organizing Notes',
                  desc: 'Content flows into spiral curriculum automatically based on complexity and dependencies.',
                },
                {
                  icon: Timer,
                  title: 'Spaced Repetition (FSRS)',
                  desc: 'Free Spaced Repetition Scheduler optimizes review timing for maximum retention.',
                },
              ].map((feature, i) => {
                const Icon = feature.icon
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                    className="flex gap-4 p-4 rounded-xl bg-white dark:bg-white/5 border border-violet-200/50 dark:border-violet-800/30"
                  >
                    <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-quarry-charcoal dark:text-quarry-offwhite mb-1 text-base">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {feature.desc}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Citation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 1 }}
              className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200/50 dark:border-violet-800/30"
            >
              <p className="text-sm italic text-gray-600 dark:text-gray-400 mb-2">
                "A curriculum in which the same topics are taught at different levels of depth at different stages."
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                — Jerome Bruner, <em>The Process of Education</em> (1960)
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Research shows spiral learning improves retention by 40% compared to linear curricula.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 pt-28 pb-20 overflow-hidden bg-quarry-offwhite dark:bg-quarry-charcoal">
      {/* Dynamic fabric weave background with organic strands */}
      <FabricBackground variant="hero" opacity={0.08} intensity="medium" />
      
      {/* Mouse-following floating elements - skip on reduced motion */}
      {!prefersReducedMotion && (
      <FloatingElements variant="hero" opacity={0.6} mouseParallax parallaxIntensity={0.03} />
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="text-center lg:text-left">
            {/* Hero tagline - Static for performance (removed 40+ motion elements) */}
            <div className="mb-4 h-10 relative animate-fade-in animation-delay-200">
              <span className="font-handwriting text-xl sm:text-2xl md:text-3xl text-gray-600 dark:text-gray-300 inline-block">
                The productivity app that does{' '}
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400">
                  everything
                </span>
              </span>
            </div>

            {/* Main Hero Headline - NO motion wrapper for fast LCP */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in-up">
              <span className="text-quarry-charcoal dark:text-quarry-offwhite">Take notes that</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400">
                organize themselves
              </span>
            </h1>

            {/* Subtitle with privacy-focused messaging - CSS animation */}
            <div className="mb-6 animate-fade-in-up animation-delay-100">
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-xl leading-relaxed mb-3">
                AI-native. AI-optional. <strong className="text-quarry-charcoal dark:text-quarry-offwhite">100% offline</strong>. Tags, connections, and summaries emerge automatically — <strong className="text-quarry-green-700 dark:text-quarry-green-50">no cloud, no API keys</strong>. MIT Licensed.
              </p>
              {/* Privacy-focused badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border border-emerald-200/50 dark:border-emerald-800/50 animate-fade-in animation-delay-300">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Privacy-focused
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                <Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  E2E encryption for cloud sync
                </span>
              </div>
            </div>

            {/* Edition badges - Neuromorphic style - CSS animation */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-sm mb-8 animate-fade-in-up animation-delay-200">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 px-4 py-2 rounded-full bg-quarry-offwhite dark:bg-quarry-charcoal-deep shadow-neuro-sm-light dark:shadow-neuro-sm-dark border border-gray-200/30 dark:border-white/5 hover-scale">
                <Check className="w-4 h-4 text-quarry-green-700 dark:text-quarry-green-50" />
                <span><strong className="text-quarry-charcoal dark:text-quarry-offwhite">Community</strong> — Free & MIT Licensed</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 px-4 py-2 rounded-full bg-quarry-offwhite dark:bg-quarry-charcoal-deep shadow-neuro-sm-light dark:shadow-neuro-sm-dark border border-gray-200/30 dark:border-white/5 hover-scale">
                <Sparkles className="w-4 h-4 text-quarry-green-500" />
                <span><strong className="text-quarry-charcoal dark:text-quarry-offwhite">Premium</strong> — <span className="line-through text-gray-400 dark:text-gray-500">$79.99</span> <span className="text-quarry-green-600 dark:text-quarry-green-400 font-semibold">$49.99 Launch</span></span>
              </div>
            </div>

            {/* CTA buttons - CSS animation, static SVG icon */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center mb-8 animate-fade-in-up animation-delay-300">
              {/* GitHub Star Button - Prominent with star icon */}
              <Link
                href="https://github.com/framersai/quarry"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <Github className="w-5 h-5" />
                <span>Star on GitHub</span>
                <Star className="w-4 h-4 text-amber-400 dark:text-amber-500 group-hover:scale-110 transition-transform" />
              </Link>

              {/* Premium Button - Green accent glow on hover with static icon */}
              <Link
                href="#pricing"
                className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-quarry-charcoal dark:bg-quarry-offwhite text-quarry-offwhite dark:text-quarry-charcoal font-semibold shadow-neuro-light dark:shadow-neuro-dark hover:shadow-[0_0_20px_rgba(45,184,106,0.4)] dark:hover:shadow-[0_0_20px_rgba(125,219,163,0.3)] hover:-translate-y-0.5 transition-all"
              >
                {/* Static Premium Icon - Diamond */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L3 9L12 22L21 9L12 2Z" className="fill-quarry-green-400 dark:fill-quarry-green-600" />
                  <path d="M12 5L7 9L12 17L17 9L12 5Z" className="fill-quarry-green-200 dark:fill-quarry-green-400 opacity-80" />
                </svg>
                <span className="flex items-center gap-1.5">
                  <span style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}>Get Premium</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-quarry-green-500/20 dark:bg-quarry-green-600/30 text-quarry-green-100 dark:text-quarry-green-700 font-bold">
                    $49
                  </span>
                </span>
              </Link>
            </div>

            {/* Account Sign In Link - CSS animation */}
            <div className="text-center lg:text-left text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in animation-delay-400">
              <span className="inline-flex items-center gap-2">
                Already have an account?{' '}
                <Link
                  href="/quarry/login"
                  className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  Sign In
                </Link>
              </span>
            </div>

            {/* Launch Price Info - CSS animation */}
            <p className="text-center lg:text-left text-xs text-gray-500 dark:text-gray-400 mb-6 animate-fade-in animation-delay-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-quarry-green-500 animate-pulse" />
                <span><strong className="text-quarry-green-700 dark:text-quarry-green-400">Pro:</strong> $9/mo (grandfathered) or $199 lifetime</span>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span>$69 students • $49 early bird</span>
              </span>
            </p>

            {/* Stats row - Neuromorphic inset style - CSS animation */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 text-center animate-fade-in-up animation-delay-500">
              {[
                { value: '100%', label: 'Offline' },
                { value: 'MIT', label: 'Licensed' },
                { value: 'Auto', label: 'Organization' },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="cursor-default px-4 py-3 rounded-xl bg-quarry-offwhite dark:bg-quarry-charcoal-deep shadow-neuro-inset-light dark:shadow-neuro-inset-dark hover-scale"
                >
                  <div className="text-xl md:text-2xl font-bold text-quarry-charcoal dark:text-quarry-offwhite">{stat.value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* LLM footnote - CSS animation */}
            <p className="mt-6 text-xs text-gray-400 dark:text-gray-500 max-w-md animate-fade-in animation-delay-500">
              Core features (auto-tagging, connections, flashcard generation) work 100% offline. Optional LLM enhancements available via OpenAI, Claude, or local Ollama.{' '}
              <Link href="/quarry/faq#llm" className="text-quarry-green-700 dark:text-quarry-green-50 hover:text-quarry-green-500 underline underline-offset-2">
                Learn more →
              </Link>
            </p>
          </div>

          {/* Right: Knowledge Flow Visualization - Desktop - CSS animation */}
          <div className="hidden lg:block relative h-[400px] lg:h-[450px] animate-fade-in animation-delay-200">
            <KnowledgeFlowViz />
          </div>
        </div>
      </div>

      {/* Mobile Background Visualization - Compact, translucent, behind content */}
      <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-x-0 top-[30%] h-[300px] opacity-40 animate-fade-in animation-delay-300">
          <KnowledgeFlowViz compact />
        </div>
      </div>

      {/* Scroll indicator - CSS animation with bounce effect */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-fade-in animation-delay-500">
        <Link
          href="#quarry"
          className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-quarry-green-500 transition-colors"
          aria-label="Scroll to learn more about Quarry"
        >
          <span className="sr-only">Scroll down to learn more</span>
          <div className="relative animate-bounce">
            <ChevronDown className="w-6 h-6" aria-hidden="true" />
          </div>
        </Link>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   AI Q&A SECTION
   "The notetaking app that answers your questions"
   Explains LLM integration, offline capabilities, auto-generated questions
   ═══════════════════════════════════════════════════════════════════════════════ */

export function AIQASection() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section
      ref={sectionRef}
      id="ai-qa"
      className="relative py-24 px-4 bg-gradient-to-b from-gray-50/30 via-gray-100/40 to-cyan-50/20 dark:from-gray-900/30 dark:via-gray-900/50 dark:to-cyan-950/20 overflow-hidden"
    >
      {/* Glass overlay for smooth blending */}
      <div className="absolute inset-0 backdrop-blur-[0.5px] bg-gradient-to-b from-white/5 via-transparent to-white/5 dark:from-black/5 dark:via-transparent dark:to-black/5 pointer-events-none" />
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-quarry-charcoal dark:text-quarry-offwhite mb-4">
            Built-in intelligence,{' '}
            <span className="text-quarry-green-700 dark:text-quarry-green-50">no API required</span>
          </h2>

          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Quarry's NLP engine powers auto-tagging, connection discovery, and flashcard generation — all 100% offline. Add LLM providers for enhanced Q&A when you want more.
          </p>
        </motion.div>

        {/* Intelligence Architecture - Premium 2-Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Left: On-Device Intelligence (Primary) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative p-8 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-cyan-50/30 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-cyan-950/20 border border-emerald-200/60 dark:border-emerald-700/40 overflow-hidden"
          >
            {/* Animated Neural Network SVG Background */}
            <div className="absolute top-0 right-0 w-64 h-64 opacity-20 dark:opacity-10">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {/* Neural nodes with pulse animation */}
                <g className="animate-pulse" style={{ animationDuration: '3s' }}>
                  <circle cx="40" cy="40" r="8" fill="currentColor" className="text-emerald-500" />
                  <circle cx="100" cy="30" r="6" fill="currentColor" className="text-teal-500" />
                  <circle cx="160" cy="50" r="7" fill="currentColor" className="text-emerald-400" />
                  <circle cx="30" cy="100" r="5" fill="currentColor" className="text-cyan-500" />
                  <circle cx="100" cy="100" r="10" fill="currentColor" className="text-emerald-600" />
                  <circle cx="170" cy="110" r="6" fill="currentColor" className="text-teal-400" />
                  <circle cx="50" cy="160" r="7" fill="currentColor" className="text-emerald-500" />
                  <circle cx="110" cy="170" r="5" fill="currentColor" className="text-cyan-400" />
                  <circle cx="160" cy="160" r="8" fill="currentColor" className="text-teal-500" />
                </g>
                {/* Connecting lines with dash animation */}
                <g stroke="currentColor" strokeWidth="1.5" fill="none" className="text-emerald-400/50 dark:text-emerald-500/30">
                  <path d="M40 40 L100 100" strokeDasharray="4 4" className="animate-[dash_2s_linear_infinite]" />
                  <path d="M100 30 L100 100" strokeDasharray="4 4" className="animate-[dash_2.5s_linear_infinite]" />
                  <path d="M160 50 L100 100" strokeDasharray="4 4" className="animate-[dash_3s_linear_infinite]" />
                  <path d="M30 100 L100 100" strokeDasharray="4 4" className="animate-[dash_2s_linear_infinite]" />
                  <path d="M100 100 L170 110" strokeDasharray="4 4" className="animate-[dash_2.5s_linear_infinite]" />
                  <path d="M100 100 L50 160" strokeDasharray="4 4" className="animate-[dash_3s_linear_infinite]" />
                  <path d="M100 100 L110 170" strokeDasharray="4 4" className="animate-[dash_2s_linear_infinite]" />
                  <path d="M100 100 L160 160" strokeDasharray="4 4" className="animate-[dash_2.5s_linear_infinite]" />
                </g>
              </svg>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 tracking-wide uppercase">No API Required</span>
            </div>

            <h3 className="text-2xl font-bold text-quarry-charcoal dark:text-quarry-offwhite mb-3">
              On-Device Intelligence
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
              Your knowledge, processed locally. Zero latency, complete privacy, works offline.
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Auto-Tagging', icon: (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                )},
                { label: 'Connections', icon: (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="5" r="3" />
                    <circle cx="5" cy="19" r="3" />
                    <circle cx="19" cy="19" r="3" />
                    <path d="M12 8v4M9.5 14.5l-3 3M14.5 14.5l3 3" />
                  </svg>
                )},
                { label: 'Flashcards', icon: (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="14" rx="2" />
                    <path d="M12 8v4M10 10h4" />
                  </svg>
                )},
              ].map((feature) => (
                <motion.div
                  key={feature.label}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-emerald-200/50 dark:border-emerald-700/30"
                >
                  <div className="text-emerald-600 dark:text-emerald-400">
                    {feature.icon}
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{feature.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Tech Stack */}
            <div className="flex items-center gap-3 pt-4 border-t border-emerald-200/50 dark:border-emerald-700/30">
              <span className="text-xs text-gray-500 dark:text-gray-500">Powered by</span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-[10px] rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-mono">TensorFlow.js</span>
                <span className="px-2 py-1 text-[10px] rounded-md bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 font-mono">ONNX</span>
                <span className="px-2 py-1 text-[10px] rounded-md bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 font-mono">WebGPU</span>
              </div>
            </div>

            {/* NLP Explainer Accordion */}
            <NLPExplainer />
          </motion.div>

          {/* Right: LLM Options */}
          <div className="flex flex-col gap-6">
            {/* Desktop: Local LLMs */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex-1 p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden"
            >
              {/* Animated Desktop SVG */}
              <div className="absolute top-4 right-4 w-24 h-24 opacity-20 dark:opacity-15">
                <svg viewBox="0 0 80 80" className="w-full h-full">
                  {/* Monitor */}
                  <rect x="10" y="10" width="60" height="40" rx="4" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600 dark:text-gray-400" />
                  {/* Screen glow */}
                  <rect x="14" y="14" width="52" height="32" rx="2" className="text-emerald-500 animate-pulse" style={{ animationDuration: '2s' }} fill="currentColor" opacity="0.3" />
                  {/* Stand */}
                  <path d="M30 50 L50 50 L45 60 L35 60 Z" fill="currentColor" className="text-gray-500" />
                  <rect x="25" y="60" width="30" height="4" rx="2" fill="currentColor" className="text-gray-500" />
                  {/* Privacy shield icon on screen */}
                  <path d="M40 22 L48 26 L48 34 C48 38 44 42 40 44 C36 42 32 38 32 34 L32 26 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-600 dark:text-emerald-400" />
                  <path d="M37 32 L39 34 L44 29" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-600 dark:text-emerald-400" />
                </svg>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-bold text-quarry-charcoal dark:text-quarry-offwhite">Local LLMs</h3>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-medium">100% Private</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Run Ollama on your desktop for complete offline AI. Your data never leaves your machine.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800/50">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Ollama</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-500">Desktop Only</span>
              </div>
            </motion.div>

            {/* Cloud: API Options */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex-1 p-6 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200/60 dark:border-violet-700/40 overflow-hidden"
            >
              {/* Animated Cloud SVG */}
              <div className="absolute top-4 right-4 w-24 h-24 opacity-20 dark:opacity-15">
                <svg viewBox="0 0 80 80" className="w-full h-full">
                  {/* Cloud shape */}
                  <path
                    d="M60 45 C65 45 70 40 70 35 C70 28 64 22 57 22 C57 14 50 8 42 8 C34 8 27 14 25 21 C18 21 12 27 12 35 C12 43 18 49 26 49 L60 49 C60 48 60 46 60 45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-violet-500 dark:text-violet-400"
                  />
                  {/* Animated data streams */}
                  <g className="animate-pulse" style={{ animationDuration: '1.5s' }}>
                    <circle cx="30" cy="60" r="2" fill="currentColor" className="text-violet-400" />
                    <circle cx="40" cy="65" r="2" fill="currentColor" className="text-purple-400" />
                    <circle cx="50" cy="58" r="2" fill="currentColor" className="text-violet-400" />
                  </g>
                  {/* Connection lines */}
                  <path d="M30 55 L30 49" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" className="text-violet-400/50" />
                  <path d="M40 60 L40 49" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" className="text-violet-400/50" />
                  <path d="M50 53 L50 49" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" className="text-violet-400/50" />
                </svg>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-bold text-quarry-charcoal dark:text-quarry-offwhite">Cloud LLMs</h3>
                <InfoTooltip
                  term={<span className="px-2 py-0.5 text-[10px] rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 font-medium">BYOK</span>}
                  explanation="Bring Your Own Key — Use your own API keys for OpenAI, Claude, and other LLM providers. Your keys stay on your device."
                  ariaLabel="BYOK"
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Connect your API keys for OpenAI or Claude. Works everywhere, including mobile.
              </p>
              <div className="flex items-center gap-3">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10"
                >
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">OpenAI</span>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10"
                >
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-amber-500" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Claude</span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Premium Feature Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="relative overflow-hidden"
        >
          {/* Premium Ribbon Header */}
          <div className="relative mb-0">
            <div className="flex items-center justify-center gap-4 py-4 px-6 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-t-3xl">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAwTDQwIDQwTTQwIDBMMCA0MCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] opacity-30" />
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </motion.div>
              <span className="text-white font-bold text-lg tracking-wide">Premium Feature</span>
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </motion.div>
            </div>
          </div>

          {/* Content Card */}
          <div className="p-8 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border border-t-0 border-amber-200/50 dark:border-amber-800/30 rounded-b-3xl">
            <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-quarry-charcoal dark:text-quarry-offwhite mb-4">
                Auto-Generated Questions & Flashcards
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Quarry automatically analyzes each document and generates study questions based on the content. These questions power our flashcard and quiz system using the FSRS spaced repetition algorithm.
              </p>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-quarry-charcoal dark:text-quarry-offwhite">Smart question generation</strong> — AI analyzes your notes and creates relevant study questions
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-quarry-charcoal dark:text-quarry-offwhite">FSRS algorithm</strong> — Science-backed spaced repetition for optimal memory retention
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-quarry-charcoal dark:text-quarry-offwhite">Quiz mode</strong> — Test yourself with generated quizzes across your entire knowledge base
                  </span>
                </li>
              </ul>
            </div>

            {/* Interactive Flashcard Demo */}
            <div className="relative">
              <FlashcardDemo />
            </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FABRIC ARCHITECTURE SECTION
   Nested visualization showing Fabric > Weave > Loom > Strand hierarchy
   ═══════════════════════════════════════════════════════════════════════════════ */

const fabricLevels = [
  {
    id: 'fabric',
    name: 'FABRIC',
    subtitle: 'The Complete Corpus',
    description: 'Your entire knowledge base unified. The Fabric encompasses all domains, topics, and atomic knowledge units in a single traversable graph.',
    details: [
      'Unified namespace across all content',
      'Global semantic search & embeddings',
      'Cross-domain relationship discovery',
      'Single source of truth for AI agents'
    ],
    color: 'emerald',
    icon: Globe,
  },
  {
    id: 'weave',
    name: 'WEAVE',
    subtitle: 'Self-Contained Domains',
    description: 'Independent universes of knowledge. Each Weave is a complete domain that can be published, forked, or composed with other Weaves.',
    details: [
      'Domain isolation with clear boundaries',
      'Version-controlled via Git',
      'Composable with other Weaves',
      'Custom theming & branding'
    ],
    color: 'teal',
    icon: Layers,
  },
  {
    id: 'loom',
    name: 'LOOM',
    subtitle: 'Curated Modules',
    description: 'Organized collections within a Weave. Looms group related Strands into learnable, navigable modules with defined learning paths.',
    details: [
      'Topic-focused organization',
      'Learning path definitions',
      'Module-level metadata',
      'Hierarchical navigation'
    ],
    color: 'cyan',
    icon: Network,
  },
  {
    id: 'strand',
    name: 'STRAND',
    subtitle: 'Atomic Knowledge Units',
    description: 'The smallest unit of knowledge. Each Strand is a single concept with rich metadata, typed relationships, and AI instructions.',
    details: [
      'OpenStrand Protocol metadata',
      'LLM behavior instructions',
      'Typed semantic relationships',
      'Auto-generated embeddings'
    ],
    color: 'sky',
    icon: FileText,
  },
]

export function FabricSection() {
  const [activeLevel, setActiveLevel] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section ref={sectionRef} id="quarry" className="py-24 px-4 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            The <span className="text-emerald-500">Fabric</span> of Knowledge
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            A four-tier hierarchy designed for both human intuition and AI traversal.
            Hover over each level to understand how knowledge flows.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Nested visualization */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-square max-w-lg mx-auto">
              {/* Fabric - outermost */}
              <motion.div
                className={`absolute inset-0 rounded-3xl border-2 transition-all duration-300 ${
                  activeLevel === 'fabric' || !activeLevel
                    ? 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_60px_rgba(16,185,129,0.15)]'
                    : 'border-emerald-500/20 bg-emerald-500/2'
                }`}
                onMouseEnter={() => setActiveLevel('fabric')}
                onMouseLeave={() => setActiveLevel(null)}
              >
                <span className="absolute top-4 left-4 text-xs font-bold text-emerald-500 uppercase tracking-wider">Fabric</span>
              </motion.div>

              {/* Weave */}
              <motion.div
                className={`absolute inset-[12%] rounded-2xl border-2 transition-all duration-300 ${
                  activeLevel === 'weave'
                    ? 'border-teal-500 bg-teal-500/5 shadow-[0_0_40px_rgba(20,184,166,0.15)]'
                    : 'border-teal-500/20 bg-teal-500/2'
                }`}
                onMouseEnter={() => setActiveLevel('weave')}
                onMouseLeave={() => setActiveLevel(null)}
              >
                <span className="absolute top-3 left-3 text-xs font-bold text-teal-500 uppercase tracking-wider">Weave</span>
              </motion.div>

              {/* Loom */}
              <motion.div
                className={`absolute inset-[24%] rounded-xl border-2 transition-all duration-300 ${
                  activeLevel === 'loom'
                    ? 'border-cyan-500 bg-cyan-500/5 shadow-[0_0_30px_rgba(6,182,212,0.15)]'
                    : 'border-cyan-500/20 bg-cyan-500/2'
                }`}
                onMouseEnter={() => setActiveLevel('loom')}
                onMouseLeave={() => setActiveLevel(null)}
              >
                <span className="absolute top-2 left-2 text-xs font-bold text-cyan-500 uppercase tracking-wider">Loom</span>
              </motion.div>

              {/* Strand - innermost */}
              <motion.div
                className={`absolute inset-[36%] rounded-lg border-2 transition-all duration-300 flex items-center justify-center ${
                  activeLevel === 'strand'
                    ? 'border-sky-500 bg-sky-500/10 shadow-[0_0_20px_rgba(14,165,233,0.2)]'
                    : 'border-sky-500/20 bg-sky-500/5'
                }`}
                onMouseEnter={() => setActiveLevel('strand')}
                onMouseLeave={() => setActiveLevel(null)}
              >
                <div className="text-center p-4">
                  <FileText className="w-8 h-8 text-sky-500 mx-auto mb-2" />
                  <span className="text-xs font-bold text-sky-500 uppercase tracking-wider">Strand</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Level cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-4"
          >
            {fabricLevels.map((level, i) => {
              const Icon = level.icon
              const isActive = activeLevel === level.id
              const colorClasses = {
                emerald: { border: 'border-emerald-500', bg: 'bg-emerald-500', text: 'text-emerald-500' },
                teal: { border: 'border-teal-500', bg: 'bg-teal-500', text: 'text-teal-500' },
                cyan: { border: 'border-cyan-500', bg: 'bg-cyan-500', text: 'text-cyan-500' },
                sky: { border: 'border-sky-500', bg: 'bg-sky-500', text: 'text-sky-500' },
              }[level.color]!

              return (
                <motion.div
                  key={level.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                  onMouseEnter={() => setActiveLevel(level.id)}
                  onMouseLeave={() => setActiveLevel(null)}
                  className={`
                    relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300
                    ${isActive 
                      ? `${colorClasses.border} bg-white dark:bg-gray-900 shadow-lg` 
                      : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700'
                    }
                  `}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl ${isActive ? colorClasses.bg + '/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <Icon className={`w-5 h-5 ${isActive ? colorClasses.text : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-bold ${isActive ? colorClasses.text : 'text-gray-900 dark:text-white'}`}>
                          {level.name}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">— {level.subtitle}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {level.description}
                      </p>
                      
                      {/* Expanded details on hover */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.ul
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1.5"
                          >
                            {level.details.map((detail, j) => (
                              <li key={j} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                <Check className={`w-3.5 h-3.5 ${colorClasses.text}`} />
                                {detail}
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   STORAGE OPTIONS SECTION
   Dual storage model: Local + GitHub as SEPARATE data buckets
   ═══════════════════════════════════════════════════════════════════════════════ */

export function StorageOptionsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section ref={sectionRef} id="storage" className="relative py-24 px-4 bg-quarry-offwhite dark:bg-quarry-charcoal overflow-hidden">
      {/* Minimal dots background */}
      <FabricBackground variant="minimal" opacity={0.03} />
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-quarry-charcoal dark:text-quarry-offwhite mb-4">
            Two Storage Options.<br/>
            <span className="text-quarry-green-700 dark:text-quarry-green-50">Both Separate. Both Yours.</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Choose local-first offline storage or GitHub cloud sync. Each is an independent data bucket —
            switch between them anytime in Settings. Manage both simultaneously.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Local Storage Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative p-8 rounded-2xl bg-quarry-offwhite dark:bg-quarry-charcoal-deep shadow-neuro-light dark:shadow-neuro-dark border border-gray-200/30 dark:border-white/5"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-quarry-charcoal dark:bg-quarry-offwhite shadow-neuro-sm-light dark:shadow-neuro-sm-dark">
                <Database className="w-6 h-6 text-quarry-offwhite dark:text-quarry-charcoal" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-quarry-charcoal dark:text-quarry-offwhite">Local Storage</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Offline-First, Zero Cloud</p>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {[
                { text: '~/Documents/Quarry folder', highlight: 'Your filesystem' },
                { text: 'SQLite database + Markdown files', highlight: 'Portable data' },
                { text: 'Instant offline access', highlight: 'No internet needed' },
                { text: 'Zero cloud dependency', highlight: '100% private' },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-quarry-green-700 dark:text-quarry-green-50 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400">
                    <strong className="text-quarry-charcoal dark:text-quarry-offwhite">{item.highlight}:</strong> {item.text}
                  </span>
                </li>
              ))}
            </ul>

            <div className="p-4 rounded-xl bg-quarry-charcoal/5 dark:bg-white/5 shadow-neuro-inset-light dark:shadow-neuro-inset-dark">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono text-center">
                ~/Documents/Quarry/weaves/*.md
              </p>
            </div>
          </motion.div>

          {/* GitHub Remote Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative p-8 rounded-2xl bg-quarry-offwhite dark:bg-quarry-charcoal-deep shadow-neuro-light dark:shadow-neuro-dark border border-gray-200/30 dark:border-white/5"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-quarry-charcoal dark:bg-quarry-offwhite shadow-neuro-sm-light dark:shadow-neuro-sm-dark">
                <Github className="w-6 h-6 text-quarry-offwhite dark:text-quarry-charcoal" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-quarry-charcoal dark:text-quarry-offwhite">GitHub Remote</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Read Any Repo, Share Instantly</p>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {[
                { text: 'Hook into any public repo URL instantly', highlight: 'Open access' },
                { text: 'Private repos with Personal Access Token', highlight: 'Secure auth' },
                { text: 'Load any Quarry library on-the-fly, on-demand', highlight: 'Just paste URL' },
                { text: 'Automatic syncing & backups on GitHub infrastructure', highlight: 'High availability' },
                { text: 'Share your knowledge garden with a link', highlight: 'Auto-sharing' },
                { text: 'Full Git version control — developer-friendly', highlight: 'Source control' },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-quarry-green-700 dark:text-quarry-green-50 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400">
                    <strong className="text-quarry-charcoal dark:text-quarry-offwhite">{item.highlight}:</strong> {item.text}
                  </span>
                </li>
              ))}
            </ul>

            <div className="p-4 rounded-xl bg-quarry-charcoal/5 dark:bg-white/5 shadow-neuro-inset-light dark:shadow-neuro-inset-dark">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono text-center">
                github.com/anyone/their-quarry-library
              </p>
            </div>
          </motion.div>
        </div>

        {/* Developer-Friendly Sharing Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mb-12 p-6 rounded-2xl bg-gradient-to-r from-quarry-charcoal/5 via-quarry-green-500/5 to-quarry-charcoal/5 dark:from-white/5 dark:via-quarry-green-50/10 dark:to-white/5 border border-gray-200/30 dark:border-white/5"
        >
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <div className="p-3 rounded-xl bg-quarry-green-500/10 dark:bg-quarry-green-50/10">
              <Globe className="w-6 h-6 text-quarry-green-700 dark:text-quarry-green-50" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-quarry-charcoal dark:text-quarry-offwhite mb-1">
                Share Your Knowledge Garden Instantly
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Anyone can load your Quarry library just by pasting your GitHub repo URL. Public repos work immediately — private repos just need a PAT. It's that simple.
              </p>
            </div>
            <div className="shrink-0">
              <code className="text-xs px-3 py-2 rounded-lg bg-quarry-charcoal dark:bg-quarry-offwhite text-quarry-offwhite dark:text-quarry-charcoal font-mono">
                /codex?repo=github.com/you/notes
              </code>
            </div>
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-4 p-4 rounded-2xl bg-quarry-offwhite dark:bg-quarry-charcoal-deep shadow-neuro-light dark:shadow-neuro-dark border border-gray-200/30 dark:border-white/5">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-quarry-charcoal/5 dark:bg-white/5">
              <Database className="w-4 h-4 text-quarry-green-700 dark:text-quarry-green-50" />
              <span className="text-sm font-medium text-quarry-charcoal dark:text-quarry-offwhite">Local</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <span className="text-lg">⇄</span>
              <span className="text-xs uppercase tracking-wider">Switch in Settings</span>
              <span className="text-lg">⇄</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-quarry-charcoal/5 dark:bg-white/5">
              <Cloud className="w-4 h-4 text-quarry-green-700 dark:text-quarry-green-50" />
              <span className="text-sm font-medium text-quarry-charcoal dark:text-quarry-offwhite">GitHub</span>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Each storage is a separate data bucket. Your notes are never mixed.
          </p>
        </motion.div>

        {/* Quarry Sync Coming Soon Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative p-8 rounded-2xl bg-gradient-to-r from-quarry-green-900/20 via-quarry-green-700/10 to-quarry-green-900/20 dark:from-quarry-green-50/10 dark:via-quarry-green-100/5 dark:to-quarry-green-50/10 border border-quarry-green-700/30 dark:border-quarry-green-50/20 shadow-neuro-light dark:shadow-neuro-dark overflow-hidden"
        >
          {/* Decorative corner flourishes */}
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-quarry-green-700/40 dark:border-quarry-green-50/30 rounded-tl-2xl" />
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-quarry-green-700/40 dark:border-quarry-green-50/30 rounded-tr-2xl" />
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-quarry-green-700/40 dark:border-quarry-green-50/30 rounded-bl-2xl" />
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-quarry-green-700/40 dark:border-quarry-green-50/30 rounded-br-2xl" />

          <div className="relative text-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-quarry-green-700/20 dark:bg-quarry-green-50/20 text-quarry-green-700 dark:text-quarry-green-50 text-sm font-semibold mb-4"
            >
              <Sparkles className="w-4 h-4" />
              <span>COMING SOON</span>
            </motion.div>
            <h3 className="text-2xl font-bold text-quarry-charcoal dark:text-quarry-offwhite mb-2" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}>
              Quarry Sync
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-4">
              Cross-device sync powered by Quarry. All the convenience of cloud sync with <strong className="text-quarry-green-700 dark:text-quarry-green-50">true end-to-end encryption</strong>.
            </p>
            
            {/* E2EE Details */}
            <div className="flex flex-wrap justify-center gap-3 mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-quarry-charcoal/5 dark:bg-white/5 text-sm">
                <Lock className="w-3.5 h-3.5 text-quarry-green-700 dark:text-quarry-green-50" />
                <span className="text-gray-600 dark:text-gray-400">AES-256-GCM encryption</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-quarry-charcoal/5 dark:bg-white/5 text-sm">
                <Shield className="w-3.5 h-3.5 text-quarry-green-700 dark:text-quarry-green-50" />
                <span className="text-gray-600 dark:text-gray-400">Zero-knowledge architecture</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-quarry-charcoal/5 dark:bg-white/5 text-sm">
                <Key className="w-3.5 h-3.5 text-quarry-green-700 dark:text-quarry-green-50" />
                <span className="text-gray-600 dark:text-gray-400">Keys never leave your device</span>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-500 max-w-lg mx-auto">
              Your notes are encrypted on-device before syncing. We can&apos;t read your data — ever.
              <strong className="text-quarry-green-700 dark:text-quarry-green-50"> All editions of Quarry</strong> will receive this feature as a free auto-update when it launches.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   COMPETITOR COMPARISON SECTION
   Transparent feature matrix vs other note apps
   ═══════════════════════════════════════════════════════════════════════════════ */

type FeatureStatus = '✓' | '○' | '—' // ✓ = Yes, ○ = Coming Soon, — = No

interface Competitor {
  name: string
  features: Record<string, FeatureStatus>
}

const featureCategories = {
  'Core': ['Markdown', 'Offline-first', 'Local storage', 'Cloud sync'],
  'Organization': ['Folders', 'Tags', 'Backlinks', 'Graph view', 'Auto-tagging', 'Content licensing'],
  'AI': ['AI Q&A', 'Semantic search', 'Auto-categorization', 'LLM integration'],
  'Learning': ['Flashcards/SRS', 'Spaced repetition', 'Progress tracking', 'Habit tracking'],
  'Platform': ['Web', 'Desktop', 'Mobile'],
  'Pricing': ['Free tier', 'One-time purchase'],
}

const competitors: Competitor[] = [
  {
    name: 'Quarry',
    features: {
      'Markdown': '✓', 'Offline-first': '✓', 'Local storage': '✓', 'Cloud sync': '✓',
      'Folders': '✓', 'Tags': '✓', 'Backlinks': '✓', 'Graph view': '✓', 'Auto-tagging': '✓', 'Content licensing': '✓',
      'AI Q&A': '✓', 'Semantic search': '✓', 'Auto-categorization': '✓', 'LLM integration': '✓',
      'Flashcards/SRS': '✓', 'Spaced repetition': '✓', 'Progress tracking': '✓', 'Habit tracking': '✓',
      'Web': '✓', 'Desktop': '○', 'Mobile': '○',
      'Free tier': '✓', 'One-time purchase': '✓',
    }
  },
  {
    name: 'Obsidian',
    features: {
      'Markdown': '✓', 'Offline-first': '✓', 'Local storage': '✓', 'Cloud sync': '✓',
      'Folders': '✓', 'Tags': '✓', 'Backlinks': '✓', 'Graph view': '✓', 'Auto-tagging': '—', 'Content licensing': '—',
      'AI Q&A': '—', 'Semantic search': '—', 'Auto-categorization': '—', 'LLM integration': '—',
      'Flashcards/SRS': '—', 'Spaced repetition': '—', 'Progress tracking': '—', 'Habit tracking': '—',
      'Web': '—', 'Desktop': '✓', 'Mobile': '✓',
      'Free tier': '✓', 'One-time purchase': '—',
    }
  },
  {
    name: 'Logseq',
    features: {
      'Markdown': '✓', 'Offline-first': '✓', 'Local storage': '✓', 'Cloud sync': '✓',
      'Folders': '—', 'Tags': '✓', 'Backlinks': '✓', 'Graph view': '✓', 'Auto-tagging': '—', 'Content licensing': '—',
      'AI Q&A': '—', 'Semantic search': '—', 'Auto-categorization': '—', 'LLM integration': '—',
      'Flashcards/SRS': '✓', 'Spaced repetition': '✓', 'Progress tracking': '—', 'Habit tracking': '—',
      'Web': '—', 'Desktop': '✓', 'Mobile': '✓',
      'Free tier': '✓', 'One-time purchase': '—',
    }
  },
  {
    name: 'Notion',
    features: {
      'Markdown': '✓', 'Offline-first': '—', 'Local storage': '—', 'Cloud sync': '✓',
      'Folders': '✓', 'Tags': '✓', 'Backlinks': '✓', 'Graph view': '—', 'Auto-tagging': '—', 'Content licensing': '—',
      'AI Q&A': '✓', 'Semantic search': '—', 'Auto-categorization': '—', 'LLM integration': '✓',
      'Flashcards/SRS': '—', 'Spaced repetition': '—', 'Progress tracking': '—', 'Habit tracking': '—',
      'Web': '✓', 'Desktop': '✓', 'Mobile': '✓',
      'Free tier': '✓', 'One-time purchase': '—',
    }
  },
  {
    name: 'Roam',
    features: {
      'Markdown': '✓', 'Offline-first': '—', 'Local storage': '—', 'Cloud sync': '✓',
      'Folders': '—', 'Tags': '✓', 'Backlinks': '✓', 'Graph view': '✓', 'Auto-tagging': '—', 'Content licensing': '—',
      'AI Q&A': '—', 'Semantic search': '—', 'Auto-categorization': '—', 'LLM integration': '—',
      'Flashcards/SRS': '✓', 'Spaced repetition': '✓', 'Progress tracking': '—', 'Habit tracking': '—',
      'Web': '✓', 'Desktop': '—', 'Mobile': '—',
      'Free tier': '—', 'One-time purchase': '—',
    }
  },
  {
    name: 'Apple Notes',
    features: {
      'Markdown': '—', 'Offline-first': '✓', 'Local storage': '✓', 'Cloud sync': '✓',
      'Folders': '✓', 'Tags': '✓', 'Backlinks': '—', 'Graph view': '—', 'Auto-tagging': '—', 'Content licensing': '—',
      'AI Q&A': '—', 'Semantic search': '—', 'Auto-categorization': '—', 'LLM integration': '—',
      'Flashcards/SRS': '—', 'Spaced repetition': '—', 'Progress tracking': '—', 'Habit tracking': '—',
      'Web': '✓', 'Desktop': '✓', 'Mobile': '✓',
      'Free tier': '✓', 'One-time purchase': '✓',
    }
  },
]

export function CompetitorComparisonSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const allFeatures = Object.values(featureCategories).flat()

  return (
    <section ref={sectionRef} id="comparison" className="py-24 px-4 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-quarry-charcoal dark:text-quarry-offwhite mb-4">
            How Quarry Compares
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            An honest comparison with other note-taking and PKM tools.
            We show what we have, what's coming, and what we don't have.
          </p>
          <div className="flex justify-center gap-6 mt-6 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-quarry-green-500/20 text-quarry-green-700 dark:text-quarry-green-50 flex items-center justify-center font-bold">✓</span>
              <span className="text-gray-600 dark:text-gray-400">Available</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">○</span>
              <span className="text-gray-600 dark:text-gray-400">Coming Soon</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 flex items-center justify-center font-bold">—</span>
              <span className="text-gray-600 dark:text-gray-400">Not Available</span>
            </span>
          </div>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="overflow-x-auto rounded-2xl shadow-neuro-light dark:shadow-neuro-dark border border-gray-200/30 dark:border-white/5"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-quarry-offwhite dark:bg-quarry-charcoal-deep">
                <th className="text-left p-4 font-semibold text-quarry-charcoal dark:text-quarry-offwhite border-b border-gray-200 dark:border-gray-800 sticky left-0 bg-quarry-offwhite dark:bg-quarry-charcoal-deep z-10">
                  Feature
                </th>
                {competitors.map((comp, i) => (
                  <th
                    key={comp.name}
                    className={`p-4 font-semibold text-center border-b border-gray-200 dark:border-gray-800 ${
                      i === 0
                        ? 'bg-quarry-green-500/10 text-quarry-green-700 dark:text-quarry-green-50'
                        : 'text-quarry-charcoal dark:text-quarry-offwhite'
                    }`}
                  >
                    {comp.name}
                    {i === 0 && <span className="block text-xs font-normal text-quarry-green-500">(This one)</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(featureCategories).map(([category, features], catIndex) => (
                <>
                  <tr key={category} className="bg-gray-50 dark:bg-gray-900/50">
                    <td
                      colSpan={competitors.length + 1}
                      className="p-3 font-bold text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800"
                    >
                      {category}
                    </td>
                  </tr>
                  {features.map((feature, featureIndex) => (
                    <tr
                      key={feature}
                      className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                    >
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-950 z-10">
                        {feature}
                      </td>
                      {competitors.map((comp, compIndex) => {
                        const status = comp.features[feature]
                        return (
                          <td
                            key={`${comp.name}-${feature}`}
                            className={`p-4 text-center ${compIndex === 0 ? 'bg-quarry-green-500/5' : ''}`}
                          >
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-lg font-bold ${
                                status === '✓'
                                  ? 'bg-quarry-green-500/20 text-quarry-green-700 dark:text-quarry-green-50'
                                  : status === '○'
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Transparency Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8"
        >
          * Comparison as of December 2024. Some apps may have plugins/extensions that add features.
          We strive for accuracy — <a href="https://github.com/framersai/quarry/issues" target="_blank" rel="noopener noreferrer" className="text-quarry-green-700 dark:text-quarry-green-50 underline underline-offset-2">let us know</a> if anything needs updating.
        </motion.p>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SCHEMA SECTION
   OpenStrand Protocol visualization
   ═══════════════════════════════════════════════════════════════════════════════ */

export function SchemaSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const codeExample = `# OpenStrand Protocol Example
id: "550e8400-e29b-41d4-a716"
slug: "introduction-to-react"
version: "1.0.0"

# AI Agent Instructions
llm:
  tone: "educational"
  detail: "comprehensive"
  agentInstructions:
    traversal: "depth-first"
    citation: "always-source"

# Semantic Relationships
relationships:
  - target: "javascript-basics"
    type: "requires"
  - target: "react-hooks"
    type: "extends"`

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Code preview */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden bg-gray-900 dark:bg-black shadow-2xl border border-gray-800">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="ml-2 text-xs text-gray-400 font-mono">strand.yml</span>
              </div>
              <pre className="p-6 text-sm font-mono overflow-x-auto">
                <code className="text-gray-300">
                  {codeExample.split('\n').map((line, i) => (
                    <div key={i} className="leading-relaxed">
                      {line.startsWith('#') ? (
                        <span className="text-gray-500">{line}</span>
                      ) : line.includes(':') ? (
                        <>
                          <span className="text-cyan-400">{line.split(':')[0]}:</span>
                          <span className="text-emerald-400">{line.split(':').slice(1).join(':')}</span>
                        </>
                      ) : (
                        <span>{line}</span>
                      )}
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </motion.div>

          {/* Explanation */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              The <span className="text-cyan-500">OpenStrand</span> Protocol
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Every Strand is born with the OpenStrand Protocol—a universal schema we created and open-sourced that makes your content AI-native. It teaches
              AI agents how to read, understand, and summarize your knowledge.
            </p>
            <p className="text-base text-gray-500 dark:text-gray-500 mb-8">
              Natural language queries with sourced citations, semantic search by meaning not keywords, and intelligent traversal of your knowledge graph—all running locally via WebAssembly. This is the foundation we build all our knowledge apps on.
            </p>

            <div className="space-y-4">
              {[
                { icon: Brain, title: 'AI-First Metadata', desc: 'Define how LLMs interpret, summarize, and present knowledge. Control tone and detail level.' },
                { icon: Link2, title: 'Typed Relationships', desc: 'Beyond hyperlinks. Define semantic connections like "requires", "extends", or "contradicts".' },
                { icon: GitBranch, title: 'Version Controlled', desc: 'Every change tracked. Full history, branching, and collaborative editing via Git.' },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="p-2 rounded-lg bg-cyan-500/10">
                      <Icon className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* GitHub link */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 }}
              className="mt-6"
            >
              <Link
                href="https://github.com/framersai/openstrand"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-cyan-500 hover:text-cyan-600 font-medium transition-colors"
              >
                <Github className="w-5 h-5" />
                <span>View OpenStrand on GitHub</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   OFFLINE SECTION
   Local-first architecture
   ═══════════════════════════════════════════════════════════════════════════════ */

export function OfflineSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  // Get actual counts from GitHub tree
  const { totalStrands, totalWeaves, totalLooms, loading } = useGithubTree()

  return (
    <section ref={sectionRef} className="relative py-24 px-4 overflow-hidden">
      {/* Woven mesh background for interconnected NLP concepts */}
      <FabricBackground variant="woven" opacity={0.05} />
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            {/* Terminal mockup */}
            <div className="rounded-2xl overflow-hidden bg-gray-900 dark:bg-black shadow-2xl border border-gray-800">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
                <Terminal className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400 font-mono">terminal</span>
              </div>
              <div className="p-6 font-mono text-sm">
                <div className="mb-3">
                  <span className="text-emerald-400">➜</span> <span className="text-cyan-400">~</span> codex query "authentication patterns"
                </div>
                <div className="mb-3 text-gray-400">
                  <div className="flex items-center gap-2 mb-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block"
                    >
                      ⚡
                    </motion.span>
                    Indexing Fabric...
                  </div>
                  <div className="ml-4 text-gray-500 text-xs">
                    {loading ? (
                      <>Found looms & strands...</>
                    ) : (
                      <>Found {totalWeaves} weaves • {totalLooms} looms • {totalStrands.toLocaleString()} strands</>
                    )}<br/>
                    Generated embeddings (2.1MB)
                  </div>
                </div>
                <div className="text-gray-300">
                  <span className="text-emerald-400">✔</span> Results found locally:<br/><br/>
                  <span className="text-cyan-400">1.</span> JWT-based authentication <span className="text-gray-500">(auth/jwt-patterns)</span><br/>
                  <span className="text-cyan-400">2.</span> Session management <span className="text-gray-500">(auth/session-handling)</span><br/>
                  <span className="text-cyan-400">3.</span> OAuth2 integration <span className="text-gray-500">(auth/oauth-providers)</span>
                </div>
                <div className="mt-3">
                  <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse" />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="order-1 lg:order-2"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              No LLMs Required.<br/>
              <span className="text-gray-500 dark:text-gray-300">No Token Generation.</span>
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-400 mb-4">
              100% offline AI powered by BERT and Transformers.js. TextRank summaries, semantic embeddings, and entity extraction—all processed client-side in Web Workers without LLM APIs.
            </p>
            <p className="text-base text-gray-600 dark:text-gray-500 mb-8">
              State-of-the-art NLP runs entirely in your browser. BERT-based semantic analysis, TextRank summarization, and TF-IDF keyword extraction—all with zero server calls. LLM enhancements are <strong className="text-gray-700 dark:text-gray-300">optional</strong>—use them when you want, skip them when you don't.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="text-xl font-bold text-emerald-500 mb-1">BERT</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Transformers.js</p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="text-xl font-bold text-cyan-500 mb-1">TextRank</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Smart Summaries</p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="text-xl font-bold text-violet-500 mb-1">100%</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Client-Side</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>BERT semantic embeddings via Transformers.js</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>TextRank + PageRank graph-based summarization</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Auto-tagging with dynamic code artifact filtering</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-gray-700 dark:text-gray-300">Optional LLM enhancements when desired</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DYNAMIC DOCUMENTS SECTION
   Inspired by Ink & Switch Embark research - mentions, formulas, embeddable views
   ═══════════════════════════════════════════════════════════════════════════════ */

export function DynamicDocumentsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })
  const [activeFeature, setActiveFeature] = useState(0)
  const [mentionQuery, setMentionQuery] = useState('')
  const [formulaResult, setFormulaResult] = useState<number | null>(null)

  const features = [
    { id: 'mentions', label: '@Mentions', icon: Link2, color: 'cyan' },
    { id: 'formulas', label: 'Formulas', icon: Zap, color: 'amber' },
    { id: 'views', label: 'Views', icon: Eye, color: 'purple' },
    { id: 'enrich', label: 'AI Enrich', icon: Sparkles, color: 'emerald' },
  ]

  // Simulated mentions for autocomplete
  const mentionables = [
    { type: 'person', name: 'Sarah Chen', icon: '👤', meta: 'AI Researcher' },
    { type: 'place', name: 'San Francisco', icon: '📍', meta: 'California, USA' },
    { type: 'date', name: 'June 15, 2025', icon: '📅', meta: 'Next Monday' },
    { type: 'document', name: 'Project Roadmap', icon: '📄', meta: 'planning/' },
  ]

  const filteredMentions = mentionQuery.length > 0 
    ? mentionables.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : mentionables

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [features.length])

  // Animate formula calculation
  useEffect(() => {
    if (activeFeature === 1) {
      setFormulaResult(null)
      const timeout = setTimeout(() => setFormulaResult(2550), 800)
      return () => clearTimeout(timeout)
    }
  }, [activeFeature])

  return (
    <section ref={sectionRef} id="dynamic-documents" className="py-24 px-4 bg-gradient-to-b from-cyan-50/20 via-cyan-50/30 to-amber-50/20 dark:from-cyan-950/20 dark:via-cyan-900/15 dark:to-amber-950/15 relative overflow-hidden">
      {/* Glass overlay for smooth blending */}
      <div className="absolute inset-0 backdrop-blur-[0.5px] bg-gradient-to-b from-white/5 via-transparent to-white/5 dark:from-black/5 dark:via-transparent dark:to-black/5 pointer-events-none" />
      {/* Subtle mesh background */}
      <FabricBackground variant="flowing" opacity={0.03} />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cyan-600 via-purple-600 to-amber-500 bg-clip-text text-transparent">
              Dynamic Documents
            </span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Your notes become living software. Link structured data with <strong>@mentions</strong>, 
            compute with <strong>formulas</strong>, visualize with <strong>embeddable views</strong>.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Based on <a href="https://www.inkandswitch.com/embark/" target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:underline">Embark: Dynamic Documents as Personal Software</a>
          </p>
        </motion.div>

        {/* Feature Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center gap-2 mb-12"
        >
          {features.map((feature, i) => {
            const Icon = feature.icon
            const isActive = activeFeature === i
            return (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  isActive
                    ? `bg-${feature.color}-500 text-white shadow-lg`
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                style={isActive ? { 
                  backgroundColor: feature.color === 'cyan' ? '#06b6d4' : 
                                   feature.color === 'amber' ? '#f59e0b' :
                                   feature.color === 'purple' ? '#a855f7' : '#10b981'
                } : {}}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{feature.label}</span>
              </button>
            )
          })}
        </motion.div>

        {/* Feature Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Interactive Demo */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="min-h-[420px]"
          >
            <AnimatePresence mode="wait">
              {/* @Mentions Demo */}
              {activeFeature === 0 && (
                <motion.div
                  key="mentions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">@mention demo</span>
                  </div>
                  <div className="p-6">
                    <div className="mb-4 text-gray-700 dark:text-gray-300">
                      <span>Meeting with </span>
                      <span className="relative">
                        <span className="px-2 py-1 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 rounded font-medium">
                          @{mentionQuery || '_'}
                        </span>
                        <motion.span
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-cyan-500"
                        />
                      </span>
                    </div>

                    {/* Autocomplete dropdown */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
                      {filteredMentions.map((mention, i) => (
                        <motion.div
                          key={mention.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            i === 0 ? 'bg-cyan-50 dark:bg-cyan-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                          onClick={() => setMentionQuery(mention.name)}
                        >
                          <span className="text-xl">{mention.icon}</span>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">{mention.name}</div>
                            <div className="text-xs text-gray-500">{mention.type} · {mention.meta}</div>
                          </div>
                          {i === 0 && (
                            <span className="text-xs px-2 py-0.5 rounded bg-cyan-500 text-white">Select</span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Formulas Demo */}
              {activeFeature === 1 && (
                <motion.div
                  key="formulas"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">formula calculation</span>
                  </div>
                  <div className="p-6 font-mono text-sm">
                    <div className="space-y-2 mb-6 text-gray-600 dark:text-gray-400">
                      <div>• Rent: <span className="text-amber-600 dark:text-amber-400">$1500</span></div>
                      <div>• Utilities: <span className="text-amber-600 dark:text-amber-400">$200</span></div>
                      <div>• Food: <span className="text-amber-600 dark:text-amber-400">$400</span></div>
                      <div>• Transport: <span className="text-amber-600 dark:text-amber-400">$150</span></div>
                      <div>• Entertainment: <span className="text-amber-600 dark:text-amber-400">$300</span></div>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                      <div className="text-gray-500 dark:text-gray-400 mb-2">
                        <span className="text-amber-600 dark:text-amber-400">=</span>ADD(1500, 200, 400, 150, 300)
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">Total:</span>
                        <motion.span
                          key={formulaResult}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-2xl font-bold text-amber-600 dark:text-amber-400"
                        >
                          {formulaResult !== null ? `$${formulaResult.toLocaleString()}` : (
                            <span className="flex items-center gap-2">
                              <motion.span
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              >
                                ⚡
                              </motion.span>
                              <span className="text-sm text-gray-400">calculating...</span>
                            </span>
                          )}
                        </motion.span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Views Demo */}
              {activeFeature === 2 && (
                <motion.div
                  key="views"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">embedded view</span>
                    <div className="flex gap-1">
                      <span className="px-2 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">view-map</span>
                    </div>
                  </div>
                  <div className="p-6">
                    {/* Mini map visualization */}
                    <div className="relative h-48 bg-gradient-to-br from-emerald-100 to-cyan-100 dark:from-emerald-900/20 dark:to-cyan-900/20 rounded-xl overflow-hidden">
                      {/* Map grid pattern */}
                      <div className="absolute inset-0 opacity-20">
                        <svg width="100%" height="100%">
                          <defs>
                            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>
                      </div>
                      
                      {/* Map pins */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="absolute top-8 left-1/4 flex flex-col items-center"
                      >
                        <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold shadow-lg">1</div>
                        <div className="text-xs mt-1 font-medium text-gray-700 dark:text-gray-300">Paris</div>
                      </motion.div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="absolute top-16 right-1/4 flex flex-col items-center"
                      >
                        <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold shadow-lg">2</div>
                        <div className="text-xs mt-1 font-medium text-gray-700 dark:text-gray-300">London</div>
                      </motion.div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.6 }}
                        className="absolute bottom-12 left-1/2 flex flex-col items-center"
                      >
                        <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold shadow-lg">3</div>
                        <div className="text-xs mt-1 font-medium text-gray-700 dark:text-gray-300">Berlin</div>
                      </motion.div>

                      {/* Route lines */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <motion.path
                          d="M 100 50 Q 180 80 200 90"
                          stroke="#a855f7"
                          strokeWidth="2"
                          strokeDasharray="4"
                          fill="none"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ delay: 0.8, duration: 0.5 }}
                        />
                        <motion.path
                          d="M 200 90 Q 180 130 150 145"
                          stroke="#a855f7"
                          strokeWidth="2"
                          strokeDasharray="4"
                          fill="none"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ delay: 1, duration: 0.5 }}
                        />
                      </svg>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                      <span>3 places from @mentions</span>
                      <span className="flex gap-2">
                        <button className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">🗺️ Map</button>
                        <button className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">📅 Cal</button>
                        <button className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">📊 Chart</button>
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* AI Enrichment Demo */}
              {activeFeature === 3 && (
                <motion.div
                  key="enrich"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">AI suggestions</span>
                  </div>
                  <div className="p-6 space-y-4">
                    {/* Tags suggestion */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
                    >
                      <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-2">Suggested Tags</div>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 text-xs rounded-full bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300">+ machine-learning</span>
                        <span className="px-2 py-1 text-xs rounded-full bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300">+ neural-networks</span>
                        <span className="px-2 py-1 text-xs rounded-full bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300">+ python</span>
                      </div>
                    </motion.div>

                    {/* Category suggestion */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    >
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">Suggested Category</div>
                      <div className="flex items-center gap-2">
                        <FolderTree className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Engineering → Machine Learning → Tutorials</span>
                      </div>
                    </motion.div>

                    {/* View suggestion */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                      className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
                    >
                      <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-2">Suggested View</div>
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-purple-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Add Chart View — numeric data detected</span>
                      </div>
                    </motion.div>

                    {/* Related docs */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                      className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Related Documents</div>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          <span>Neural Network Basics</span>
                          <span className="ml-auto text-xs text-emerald-500">89%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          <span>TensorFlow Tutorial</span>
                          <span className="ml-auto text-xs text-emerald-500">84%</span>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right: Explanation */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {activeFeature === 0 && 'Link Anything with @Mentions'}
              {activeFeature === 1 && 'Compute with Formulas'}
              {activeFeature === 2 && 'Visualize with Views'}
              {activeFeature === 3 && 'Enrich with AI'}
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              {activeFeature === 0 && 'Reference people, places, dates, and documents inline. Each mention links to structured data with typed properties. Build a knowledge graph as you write.'}
              {activeFeature === 1 && 'Spreadsheet-like formulas work directly in your notes. Sum expenses, calculate routes, query mention properties. Results update automatically.'}
              {activeFeature === 2 && 'Embed maps, calendars, charts, and tables inline. Views extract data from your mentions and structured fields, rendering rich visualizations where you write.'}
              {activeFeature === 3 && 'Client-side NLP analyzes your content and suggests tags, categories, views, and related documents. All processing happens locally—your data stays private.'}
            </p>

            <div className="space-y-4">
              {activeFeature === 0 && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                      <Link2 className="w-4 h-4 text-cyan-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-base">Entity Types</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Person, Place, Date, Document, Tag, Task — each with typed properties</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Search className="w-4 h-4 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-base">Smart Autocomplete</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Type @ to search. Fuzzy matching. Create new entities on the fly.</p>
                    </div>
                  </div>
                </>
              )}
              {activeFeature === 1 && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <Zap className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-base">Built-in Functions</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">ADD, MULTIPLY, SUM, AVERAGE, ROUTE, WEATHER, GET_FIELD, and more</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <Database className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-base">Supertag Integration</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Define computed fields in supertag schemas. Auto-calculate totals, durations, derived values.</p>
                    </div>
                  </div>
                </>
              )}
              {activeFeature === 2 && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Eye className="w-4 h-4 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-base">5 View Types</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Map, Calendar, Table, Chart, List — each configurable with JSON</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                      <Layers className="w-4 h-4 text-cyan-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-base">Data Extraction</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Views pull from children, descendants, or entire documents. Filter by type, supertag, or custom query.</p>
                    </div>
                  </div>
                </>
              )}
              {activeFeature === 3 && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <Brain className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-base">Client-Side NLP</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">BERT embeddings, TF-IDF keywords, entity extraction — all via WebAssembly</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Bot className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-base">Oracle Commands</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">"Suggest tags for this document" — natural language enrichment via AI assistant</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* CTA */}
            <div className="mt-8">
              <Link 
                href="/docs/frame-architecture/DYNAMIC_DOCUMENTS_GUIDE"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:from-cyan-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <BookOpen className="w-4 h-4" />
                Read the Architecture Guide
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   AI AGENT COMPATIBILITY SECTION
   Claude Code, Cursor, Gemini CLI integration
   ═══════════════════════════════════════════════════════════════════════════════ */

export function AIAgentSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const agents = [
    { name: 'Claude Code', logo: '/claude-icon.svg', desc: 'Anthropic\'s AI assistant for coding and analysis' },
    { name: 'Cursor', logo: '/cursor-icon.svg', desc: 'AI-powered code editor with chat interface' },
    { name: 'Gemini CLI', logo: '/gemini-icon.svg', desc: 'Google\'s AI assistant for terminal workflows' },
    { name: 'GitHub Copilot', logo: '/copilot-icon.svg', desc: 'AI pair programmer from GitHub' },
  ]

  return (
    <section ref={sectionRef} id="ai-agents" className="py-24 px-4 bg-gradient-to-b from-amber-50/20 via-amber-50/30 to-blue-50/20 dark:from-amber-950/15 dark:via-amber-900/20 dark:to-blue-950/15">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Your Notes, Your AI.<br/>
              <span className="text-amber-500">No Extra Subscriptions.</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              Use the AI tools you already pay for. Claude Code, Cursor, Gemini CLI, and other AI assistants can directly read and edit your knowledge base.
            </p>
            <p className="text-base text-gray-500 dark:text-gray-500 mb-8">
              Every Codex installation includes <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm">llms.txt</code> and <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm">AGENTS.md</code> documentation files that teach AI agents how to navigate and edit your OpenStrand structure.
            </p>
            
            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Local Filesystem Mode</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Point AI agents directly to your weaves folder on disk</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Schema Documentation</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Bundled llms.txt explains frontmatter, naming, and structure</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Automatic Sync</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Changes made by AI agents appear instantly in Codex viewer</p>
                </div>
              </div>
            </div>

            <Link
              href="/quarry/weaves/frame/looms/getting-started/strands/ai-integration"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors"
            >
              <span>Learn More</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Agent Integration Terminal Mockup */}
            <div className="rounded-2xl overflow-hidden bg-gray-900 dark:bg-black shadow-2xl border border-gray-800">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
                <Bot className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-gray-400 font-mono">claude-code session</span>
              </div>
              <div className="p-6 font-mono text-sm space-y-4">
                <div>
                  <span className="text-gray-500"># Point Claude to your knowledge base</span>
                </div>
                <div>
                  <span className="text-cyan-400">claude&gt;</span> <span className="text-white">Read the llms.txt file at ~/quarry/weaves/</span>
                </div>
                <div className="pl-4 text-gray-400 text-xs">
                  <div className="text-emerald-400">✓ Found OpenStrand schema documentation</div>
                  <div className="text-emerald-400">✓ Understanding Fabric → Weave → Loom → Strand hierarchy</div>
                  <div className="text-emerald-400">✓ Loaded frontmatter schema reference</div>
                </div>
                <div>
                  <span className="text-cyan-400">claude&gt;</span> <span className="text-white">Create a new strand about React hooks in web-dev/react-patterns</span>
                </div>
                <div className="pl-4 text-gray-400 text-xs">
                  <div className="text-amber-400">📝 Creating weaves/web-dev/looms/react-patterns/strands/hooks.md</div>
                  <div className="text-emerald-400">✓ Added OpenStrand frontmatter</div>
                  <div className="text-emerald-400">✓ Generated taxonomy tags</div>
                  <div className="text-emerald-400">✓ Linked related strands</div>
                </div>
                <div>
                  <span className="text-cyan-400">claude&gt;</span> <span className="text-white">Summarize my authentication notes</span>
                </div>
                <div className="text-gray-300 pl-4 border-l-2 border-amber-500/50">
                  Found 3 strands in <span className="text-cyan-400">auth/</span>:<br/>
                  • JWT patterns → session management<br/>
                  • OAuth2 → multi-provider setup<br/>
                  • RBAC → permission hierarchy...
                </div>
                <div className="mt-2">
                  <span className="inline-block w-2 h-4 bg-amber-500 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Compatible Agents Grid */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {agents.map((agent, i) => (
                <motion.div
                  key={agent.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{agent.name}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{agent.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   GAMIFICATION SECTION
   Spiral curriculum, FSFRS, quizzes, flashcards, glossaries
   ═══════════════════════════════════════════════════════════════════════════════ */

export function GamificationSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const gamificationFeatures = [
    {
      icon: Layers,
      title: 'Spiral Curriculum',
      desc: 'Content builds on itself in expanding loops. Each revisit deepens understanding through progressive complexity.',
      color: 'violet',
    },
    {
      icon: Sparkles,
      title: 'FSFRS Algorithm',
      desc: 'Free Spaced Repetition Scheduler optimizes review timing for maximum retention with minimum effort.',
      color: 'amber',
    },
    {
      icon: Zap,
      title: 'Auto-Generated Quizzes',
      desc: 'Every document can become a quiz. Test yourself on key concepts extracted automatically.',
      color: 'emerald',
    },
    {
      icon: FileText,
      title: 'Smart Flashcards',
      desc: 'Generate flashcards from your notes. Review on desktop or mobile with spaced repetition.',
      color: 'cyan',
    },
  ]

  return (
    <section ref={sectionRef} className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Learn, Don't Just Store
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Fabric integrates the spiral curriculum and FSFRS spaced repetition to transform passive notes into active learning. Auto-generated glossaries for every document.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {gamificationFeatures.map((feature, i) => {
            const Icon = feature.icon
            const colorMap: Record<string, string> = {
              violet: 'bg-violet-500/10 text-violet-500',
              amber: 'bg-amber-500/10 text-amber-500',
              emerald: 'bg-emerald-500/10 text-emerald-500',
              cyan: 'bg-cyan-500/10 text-cyan-500',
            }
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-violet-500/50 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl ${colorMap[feature.color]} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
              </motion.div>
            )
          })}
        </div>

        {/* Glossary highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500 text-white flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Auto-Generated Glossaries</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Every document automatically gets a glossary of key terms and definitions. No manual work required—Fabric extracts and organizes terminology as you write.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TAGGING SYSTEM SECTION
   Topics > Subjects > Tags hierarchy, block-level tags
   ═══════════════════════════════════════════════════════════════════════════════ */

export function TaggingSystemSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Visual hierarchy */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
              {/* Topics level */}
              <div className="mb-4">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Topics</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">Computer Science</span>
                  <span className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium">Philosophy</span>
                </div>
              </div>

              {/* Subjects level */}
              <div className="mb-4 ml-4 pl-4 border-l-2 border-emerald-500/30">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subjects</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-medium text-sm">React</span>
                  <span className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-medium text-sm">TypeScript</span>
                  <span className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-medium text-sm">AI/ML</span>
                </div>
              </div>

              {/* Tags level */}
              <div className="ml-8 pl-4 border-l-2 border-teal-500/30">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tags</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs">#hooks</span>
                  <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs">#state-management</span>
                  <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs">#generics</span>
                </div>
              </div>

              {/* Block-level indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.3 }}
                className="absolute -bottom-4 -right-4 px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-bold shadow-lg"
              >
                Block-Level Tags
              </motion.div>
            </div>
          </motion.div>

          {/* Explanation */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="order-1 lg:order-2"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Write. That&apos;s It.<br/>
              <span className="text-teal-500">Auto-Everything.</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Forget manual organizing. Every note you write is automatically tagged, categorized, and connected — intelligently updated with each edit. Just write; Quarry handles the rest.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">Document & Block-Level Tags</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Two tagging systems work together: document tags for high-level organization, block-level tags for granular content discovery. Both auto-generated or manually edited.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">AI-Powered Auto-Tagging</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tags generated based on worthiness scoring and confidence levels. Review suggestions, accept with one click, or add your own via selection toolbar.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">Manual Control When Needed</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Select text → click Tag icon → add tags with autocomplete. Full control over what gets tagged, with smart suggestions from your existing taxonomy.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">Living Connections</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Links and relationships update with every edit. Your knowledge graph grows and evolves as you write.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FILE INGESTION SECTION
   Bulk upload, smart detection, Markdown source of truth
   ═══════════════════════════════════════════════════════════════════════════════ */

export function IngestionSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section ref={sectionRef} className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              No Faster Way to<br/>
              <span className="text-orange-500">Ingest & Analyze</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Bulk upload files with smart detection for licenses, metadata, and source attribution. Everything converts to Markdown—your single source of truth.
            </p>
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">Bulk File Upload</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Drag and drop entire folders. PDFs, DOCX, HTML, TXT—all supported.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  <Search className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">Smart Detection</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Automatic license detection, metadata extraction, and source attribution.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">AI Assistant Compatible</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Navigable by Claude Code, Copilot, and other AI assistants. Schemas stored as files.</p>
                </div>
              </div>
            </div>

            {/* Highlight box */}
            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong className="text-orange-600 dark:text-orange-400">LLMs can read it natively.</strong> Everything—including catalog schemas—is stored in Markdown files. No Fabric UI needed for AI to understand your knowledge base.
              </p>
            </div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
                <FileText className="w-4 h-4" />
                <span>Ingestion Pipeline</span>
              </div>
              <div className="space-y-3">
                {['research_paper.pdf', 'lecture_notes.docx', 'code_snippets.md'].map((file, i) => (
                  <motion.div
                    key={file}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                  >
                    <div className="w-8 h-8 rounded bg-orange-500/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-orange-500" />
                    </div>
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{file}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
                    <span className="text-xs font-medium text-emerald-500">.md</span>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>3 files processed • Markdown as source of truth</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   GITHUB INTEGRATION SECTION
   Free storage, offline mode, PAT support
   ═══════════════════════════════════════════════════════════════════════════════ */

export function GitHubIntegrationSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Free Storage with GitHub
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Use public or private repositories for free storage. Or go fully offline with local Markdown + SQLite. Your choice.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* GitHub Storage */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-900 dark:bg-white flex items-center justify-center mb-4">
              <Github className="w-6 h-6 text-white dark:text-gray-900" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">GitHub Storage</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Point Fabric to any OpenStrand-compatible repo or any repo with Markdown files. Public or private (with PAT).
            </p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Free unlimited storage</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Version control built-in</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Edit locally, push to GitHub</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> PAT support for private repos</li>
            </ul>
          </motion.div>

          {/* Offline Storage */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center mb-4">
              <Database className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Fully Offline Mode</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Everything saves locally in Markdown AND SQLite. Catalog, flashcards, glossaries—all stored locally.
            </p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Markdown for documents</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> SQLite for catalog & metadata</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> No internet required</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Export as ZIP anytime</li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FABRIC SYNC SECTION
   Cross-device sync with zero-knowledge encryption
   ═══════════════════════════════════════════════════════════════════════════════ */

export function FabricSyncSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section ref={sectionRef} id="sync" className="py-24 px-4 bg-gradient-to-b from-transparent via-blue-50/30 to-cyan-50/20 dark:from-transparent dark:via-blue-950/20 dark:to-cyan-950/10">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 mb-6">
            <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Premium Feature</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Sync Across All <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">Your Devices</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Zero-knowledge encryption means your notes are encrypted <strong>before</strong> they leave your device. We never see your data — only you can decrypt it.
          </p>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-base">Zero-Knowledge</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">AES-256-GCM encryption. Server only stores encrypted blobs.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-base">Real-Time Sync</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">WebSocket-powered instant sync across all connected devices.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center mb-4">
              <Layers className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-base">Conflict Resolution</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Vector clocks ensure consistent merging. No data loss.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-base">Unlimited Devices</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Premium users can sync across unlimited devices.</p>
          </motion.div>
        </div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5 }}
          className="p-8 rounded-2xl bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-emerald-500/10 border border-blue-200/50 dark:border-blue-700/50"
        >
          <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-6">How Zero-Knowledge Sync Works</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center mx-auto mb-3">1</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-base">Encrypt Locally</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your data is encrypted on your device using your recovery key</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-cyan-500 text-white font-bold flex items-center justify-center mx-auto mb-3">2</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-base">Store Encrypted</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Only encrypted blobs are stored on our servers — we can't read them</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center mx-auto mb-3">3</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-base">Decrypt on Device</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Other devices decrypt locally using your recovery key</p>
            </div>
          </div>
        </motion.div>

        {/* Optional Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8"
        >
          Sync is completely optional. Quarry works 100% offline without an account — your data stays local unless you choose to sync.
        </motion.p>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DEVELOPER SECTION
   Code executables, scripting
   ═══════════════════════════════════════════════════════════════════════════════ */

export function DeveloperSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Code example */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            <div className="relative bg-gray-900 rounded-2xl p-6 shadow-xl overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 text-xs text-gray-500">fabric-script.ts</span>
              </div>
              <pre className="text-sm font-mono text-gray-300 leading-relaxed">
{`// Execute code blocks in your notes
import { fabric } from '@fabric/sdk'

// Process all strands with code blocks
const strands = await fabric.getStrands({
  hasCodeBlocks: true
})

for (const strand of strands) {
  const result = await strand.executeCode()
  console.log(\`Executed: \${strand.id}\`)
}`}
              </pre>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="order-1 lg:order-2"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Code Executables<br/>
              <span className="text-purple-500">& Scripting</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Fabric supports executable code blocks and scripting. Run code snippets from your notes, automate workflows, and integrate with development tools.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Check className="w-5 h-5 text-emerald-500" />
                <span>Execute TypeScript/JavaScript code blocks</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Check className="w-5 h-5 text-emerald-500" />
                <span>Fabric SDK for automation</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Check className="w-5 h-5 text-emerald-500" />
                <span>Git integration for version control</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Check className="w-5 h-5 text-emerald-500" />
                <span>Works with Claude Code, Copilot, IDEs</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   REST API SECTION
   Free API access for developers
   ═══════════════════════════════════════════════════════════════════════════════ */

export function RestApiSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section ref={sectionRef} id="api" className="py-24 px-4 bg-gradient-to-b from-blue-50/20 via-blue-50/25 to-gray-50/30 dark:from-blue-950/15 dark:via-blue-900/15 dark:to-gray-900/30">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Build with our<br/>
              <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">Open API</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Access your FABRIC knowledge base programmatically. Search content, generate flashcards, 
              create integrations — all with a simple REST API and automatic token authentication.
            </p>
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Check className="w-5 h-5 text-emerald-500" />
                <span>Full CRUD for weaves, looms, and strands</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Check className="w-5 h-5 text-emerald-500" />
                <span>AI-powered flashcard &amp; quiz generation</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Check className="w-5 h-5 text-emerald-500" />
                <span>Secure token auth with automatic rotation</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Check className="w-5 h-5 text-emerald-500" />
                <span>OpenAPI/Swagger documentation</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Check className="w-5 h-5 text-emerald-500" />
                <span>Rate-limited, free for personal use</span>
              </div>
            </div>
            <Link
              href="/quarry/api-docs"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
            >
              <span>View API Documentation</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Code example */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative bg-gray-900 rounded-2xl p-6 shadow-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-2 text-xs text-gray-500">fetch-strands.ts</span>
                </div>
                <pre className="text-sm font-mono text-gray-300 leading-relaxed overflow-x-auto">
{`// Access your knowledge via REST API
const API_BASE = 'http://localhost:3847/api/v1'

// Fetch all strands in a weave
const response = await fetch(
  \`\${API_BASE}/strands?weave=my-notes\`,
  {
    headers: {
      'Authorization': 'Bearer fdev_...'
    }
  }
)

const { data: strands } = await response.json()

// Generate flashcards from content
const cards = await fetch(\`\${API_BASE}/generate/flashcards\`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer fdev_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ strandSlug: 'my-topic' })
})

console.log(await cards.json())`}
                </pre>
              </div>
            </div>

            {/* API Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-blue-500">25+</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Endpoints</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-emerald-500">100</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Req/min</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-amber-500">Free</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Forever</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ILLUSTRATION GENERATION SECTION
   PDF to graphic novel, style presets
   ═══════════════════════════════════════════════════════════════════════════════ */

export function IllustrationSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section ref={sectionRef} className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            On-Demand Graphic Novels
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Turn any PDF, book, or document into a graphic novel or informative slideshow. Style presets optimized for cohesiveness, aesthetics, and cost.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { style: 'Graphic Novel', desc: 'Comic book style with panels and speech bubbles', color: 'pink' },
            { style: 'Infographic', desc: 'Data visualization and informative layouts', color: 'cyan' },
            { style: 'Slideshow', desc: 'Clean presentation slides with key points', color: 'violet' },
          ].map((preset, i) => (
            <motion.div
              key={preset.style}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center"
            >
              <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 bg-${preset.color}-500/10 flex items-center justify-center`}>
                <Palette className={`w-8 h-8 text-${preset.color}-500`} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{preset.style}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{preset.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-500/20 flex items-center gap-6"
        >
          <div className="hidden sm:block">
            <div className="w-16 h-16 rounded-xl bg-pink-500 text-white flex items-center justify-center">
              <Eye className="w-8 h-8" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Preview Before Generation</h3>
            <p className="text-gray-600 dark:text-gray-400">
              See a preview of your illustration before finalizing. Optimize for style cohesiveness and generation costs. Never pay for something you don't want.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FEATURES GRID
   ═══════════════════════════════════════════════════════════════════════════════ */

const features = [
  { icon: Sparkles, title: 'Prompt Explorer', desc: '222 writing prompts with cover images. Bento grid gallery, mood-based sections, and category filters.', color: 'amber' },
  { icon: Timer, title: 'Focus Timer', desc: 'Radial dial timer with drag-to-select presets (5-90 min). Ambient soundscapes and mood sync.', color: 'cyan' },
  { icon: Bot, title: 'AI Agent Ready', desc: 'Works with Claude Code, Cursor, and Gemini CLI. Use your existing AI subscriptions.', color: 'amber' },
  { icon: Brain, title: 'AI Q&A', desc: 'Ask questions and get answers from your notes with context-aware responses.', color: 'emerald', premium: true },
  { icon: LayoutList, title: 'Kanban Board', desc: 'Visual task management with drag-and-drop columns. Track To Do, In Progress, and Done at a glance.', color: 'blue' },
  { icon: Layers, title: 'VS Code-style Tabs', desc: 'Single-click previews, double-click to pin. Drag strands from sidebar to tab bar. Just like your IDE.', color: 'sky' },
  { icon: Tags, title: 'Supertags', desc: 'Tana-inspired structured data on blocks. Define schemas for people, meetings, tasks, and more.', color: 'blue' },
  { icon: Filter, title: 'Query Builder', desc: 'Powerful search with operators, field filters, and magic presets. Save queries for instant access.', color: 'violet' },
  { icon: BookOpen, title: 'Auto Glossary', desc: 'Automatically extract key terms and definitions. Background processing keeps UI smooth.', color: 'rose', premium: true },
  { icon: FolderTree, title: 'Smart Categories', desc: 'AI-powered categorization organizes your content. No manual tagging required.', color: 'indigo', premium: true },
  { icon: Search, title: 'Semantic Search', desc: 'Find by meaning, not just keywords. WordNet synonym matching included.', color: 'cyan' },
  { icon: BookOpen, title: 'Dynamic Vocabulary', desc: 'Real NLP with WordNet synonyms/hypernyms and 384-dim embeddings. Auto-classifies subjects, topics, skills, difficulty. No hardcoded keywords.', color: 'lime' },
  { icon: Network, title: 'Knowledge Graph', desc: 'Visualize connections between ideas in an interactive 3D graph.', color: 'teal' },
  { icon: Link2, title: 'Bidirectional Links', desc: 'Every connection goes both ways. Discover unexpected relationships.', color: 'sky' },
  { icon: Workflow, title: 'BERT Summarization', desc: 'TextRank + BERT via Transformers.js in Web Workers. State-of-the-art summaries, 100% client-side.', color: 'lime', premium: true },
  { icon: Timer, title: 'FSRS Flashcards', desc: 'Spaced repetition with the latest algorithm. Learn efficiently, retain forever.', color: 'amber', premium: true },
  { icon: FileText, title: 'Markdown Native', desc: 'Standard formats you already know. No lock-in, ever.', color: 'orange' },
  { icon: PenTool, title: 'Inline Canvas', desc: 'Sketch diagrams and drawings directly in your notes. Exports automatically.', color: 'pink' },
  { icon: InfinityIcon, title: 'Knowledge Canvas', desc: 'Infinite whiteboard for visual knowledge organization. Drag strands, apply layouts, see connections.', color: 'cyan' },
  { icon: Cpu, title: 'Local LLMs', desc: 'Run Llama, Mistral, or custom models entirely on your machine.', color: 'purple', premium: true },
  { icon: Palette, title: 'Beautiful Themes', desc: 'Multiple themes including paper, dark, sepia, and terminal modes.', color: 'fuchsia' },
  { icon: Hash, title: 'Auto-Tagging', desc: 'Smart NLP extracts tech entities and keywords. Dynamic filtering removes code artifacts automatically.', color: 'emerald' },
  { icon: Shield, title: 'Open Source (Community Edition)', desc: 'MIT licensed. Your data stays yours. Forever.', color: 'slate' },
  { icon: Lock, title: 'Password Protection', desc: 'Lock your Quarry behind a password. SHA-256 hashing, auto-lock, lockout protection. 100% local.', color: 'violet', premium: true },
  { icon: KeyRound, title: 'E2E Encryption', desc: 'AES-256-GCM encrypts all data at rest. Device-bound keys auto-generated. Zero-knowledge—even we can\'t read your notes.', color: 'emerald', premium: true },
  { icon: Database, title: 'SQLite Storage', desc: 'Full offline database. Works without internet, syncs when online.', color: 'rose', premium: true },
  { icon: Flame, title: 'Habit Tracking', desc: 'Build streaks with gamified habits. Grace periods, freezes, and 40+ templates.', color: 'orange', premium: true },
  { icon: Share2, title: 'Social Import', desc: 'Paste URLs from Reddit, Twitter, Pinterest, YouTube & more. Auto-extract metadata & engagement.', color: 'pink' },
  { icon: Scale, title: 'Content Licensing', desc: 'Auto-detect CC, MIT, Apache, GPL from imports. Track permissions, attributions. SPDX-compatible export.', color: 'violet' },
  { icon: Star, title: 'Quality Ratings', desc: 'Rate content 1-5 stars. Optional AI analysis scores 6 dimensions: quality, completeness, accuracy, clarity, relevance, depth.', color: 'amber', premium: true },
  { icon: History, title: 'Evolution Timeline', desc: 'Track PKM growth over time. Three-panel Journey view with branching tree, lifecycle decay, and activity heatmaps. Zoom from years to weeks.', color: 'teal' },
  { icon: RotateCcw, title: 'Lifecycle Decay', desc: 'Notes naturally fade when unused. Fresh → Active → Faded. Nothing lost—resurface anytime with one click.', color: 'emerald' },
  { icon: Sunrise, title: 'Morning/Evening Rituals', desc: 'Start and end your day intentionally. Surface relevant notes, set intentions, capture reflections.', color: 'amber' },
  { icon: Code2, title: 'REST API', desc: 'Full OpenAPI docs with Swagger UI. Token auth, rate limiting, and audit logging. Other apps can use your data.', color: 'sky', premium: true },
]

export function FeaturesGridSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-500',
    cyan: 'bg-cyan-500/10 text-cyan-500',
    violet: 'bg-violet-500/10 text-violet-500',
    teal: 'bg-teal-500/10 text-teal-500',
    amber: 'bg-amber-500/10 text-amber-500',
    pink: 'bg-pink-500/10 text-pink-500',
    purple: 'bg-purple-500/10 text-purple-500',
    orange: 'bg-orange-500/10 text-orange-500',
    rose: 'bg-rose-500/10 text-rose-500',
    indigo: 'bg-indigo-500/10 text-indigo-500',
    sky: 'bg-sky-500/10 text-sky-500',
    lime: 'bg-lime-500/10 text-lime-600',
    fuchsia: 'bg-fuchsia-500/10 text-fuchsia-500',
    slate: 'bg-slate-500/10 text-slate-500',
    blue: 'bg-blue-500/10 text-blue-500',
  }

  return (
    <section ref={sectionRef} id="features" className="py-24 px-4 bg-gradient-to-b from-gray-50/30 via-gray-100/40 to-gray-50/20 dark:from-gray-900/30 dark:via-gray-800/40 dark:to-gray-900/20 relative overflow-hidden">
      {/* Glass overlay for smooth blending */}
      <div className="absolute inset-0 backdrop-blur-[0.5px] bg-gradient-to-b from-white/5 via-transparent to-white/5 dark:from-black/5 dark:via-transparent dark:to-black/5 pointer-events-none" />
      {/* Background SVG decoration - floating shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large circle top-right */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isInView ? { opacity: 0.03, scale: 1 } : {}}
          transition={{ duration: 1 }}
          className="absolute -top-20 -right-20 w-96 h-96"
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.5" fill="none" className="text-quarry-green-500" />
            <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.3" fill="none" className="text-quarry-green-500" />
            <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="0.2" fill="none" className="text-quarry-green-500" />
          </svg>
        </motion.div>
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '48px 48px' }} />
        {/* Floating hexagon left */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 0.04, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.3 }}
          className="absolute top-1/3 -left-16 w-64 h-64 rotate-12"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full text-quarry-green-600">
            <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" stroke="currentColor" strokeWidth="0.4" fill="none" />
          </svg>
        </motion.div>
        {/* Small dots scattered */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 0.1 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="absolute top-1/4 right-1/4"
        >
          <div className="w-2 h-2 rounded-full bg-quarry-green-500" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 0.08 } : {}}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="absolute bottom-1/3 left-1/3"
        >
          <div className="w-3 h-3 rounded-full bg-quarry-green-400" />
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-quarry-charcoal dark:text-quarry-offwhite mb-4">
            Everything You Need, Ever
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            A complete toolkit for building and navigating your personal knowledge universe. Background processing keeps everything smooth.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="group relative p-5 rounded-2xl bg-white dark:bg-quarry-charcoal-deep border border-gray-200/50 dark:border-white/5 shadow-neuro-sm-light dark:shadow-neuro-sm-dark hover:shadow-neuro-light dark:hover:shadow-neuro-dark transition-all duration-300"
              >
                {'premium' in feature && feature.premium && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Pro
                  </span>
                )}
                <div className={`inline-flex p-3 rounded-xl ${colorMap[feature.color]} mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-quarry-charcoal dark:text-quarry-offwhite mb-1.5">{feature.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom highlight bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6 }}
          className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-quarry-green-500/5 via-quarry-green-500/10 to-quarry-green-500/5 border border-quarry-green-500/20 flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-quarry-green-500/10">
              <Zap className="w-5 h-5 text-quarry-green-600 dark:text-quarry-green-400" />
            </div>
            <span className="text-quarry-charcoal dark:text-quarry-offwhite font-medium">
              All NLP runs locally in Web Workers — no cloud, no lag, no limits.
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SUPERTAGS SHOWCASE SECTION
   Tana-inspired structured data on any block
   ═══════════════════════════════════════════════════════════════════════════════ */

export function SupertagsShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })
  const [activeField, setActiveField] = useState(0)

  const supertag = {
    name: 'person',
    icon: '👤',
    color: 'blue',
    fields: [
      { name: 'Name', value: 'Sarah Chen', type: 'text', required: true },
      { name: 'Company', value: 'Anthropic', type: 'text', required: false },
      { name: 'Role', value: 'AI Researcher', type: 'text', required: false },
      { name: 'Email', value: 'sarah@example.com', type: 'email', required: false },
    ],
  }

  // Animate through fields
  useState(() => {
    const interval = setInterval(() => {
      setActiveField((prev) => (prev + 1) % supertag.fields.length)
    }, 2000)
    return () => clearInterval(interval)
  })

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-gradient-to-b from-gray-50/20 via-white/50 to-amber-50/15 dark:from-gray-900/20 dark:via-gray-900/40 dark:to-orange-950/10">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Visual Demo */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
              {/* Supertag Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{supertag.icon}</span>
                  <span className="font-bold text-gray-900 dark:text-white">#{supertag.name}</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    Supertag
                  </span>
                </div>
              </div>

              {/* Fields */}
              <div className="p-4 space-y-3">
                {supertag.fields.map((field, i) => (
                  <motion.div
                    key={field.name}
                    className={`p-3 rounded-lg border transition-all ${
                      activeField === i
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {field.name}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">
                        {field.type}
                      </span>
                    </div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-gray-900 dark:text-white font-medium"
                    >
                      {field.value}
                    </motion.div>
                  </motion.div>
                ))}
              </div>

              {/* Validation indicator */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5 }}
                className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-t border-emerald-200 dark:border-emerald-800"
              >
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                  <span>All required fields filled</span>
                </div>
              </motion.div>

              {/* Floating badges */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.3 }}
                className="absolute -top-3 -right-3 px-3 py-1.5 rounded-full bg-purple-500 text-white text-xs font-bold shadow-lg"
              >
                Structured Data
              </motion.div>
            </div>
          </motion.div>

          {/* Explanation */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="order-1 lg:order-2"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-4">
              <Tags className="w-4 h-4" />
              Tana-Inspired
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Supertags.<br/>
              <span className="text-blue-500">Structured Knowledge.</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Turn any block into structured data. Define schemas once, apply everywhere. Auto-generated icons and colors. Required field validation. Your notes become a queryable database.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Hash className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">Built-in Schemas</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Person, Meeting, Task, Book, Article, Project, Idea, Question, Decision, Event — ready to use out of the box.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">Auto-Prompted Fields</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">When you apply a supertag with fields, the editor shows a form to fill in. Required fields are validated before saving.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Filter className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">Query by Fields</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Find all people at a company, meetings from last week, or tasks with a specific status. Your knowledge becomes queryable.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Palette className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">Smart Styling</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Each supertag gets auto-generated icon and color based on its name. Customize or let the system pick. Visual consistency across your notes.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SUPERNOTES & ZETTELKASTEN SECTION
   Atomic notes with index card styling for knowledge networking
   ═══════════════════════════════════════════════════════════════════════════════ */

const supernoteFeatures = [
  {
    icon: FileText,
    title: 'Atomic Notes',
    description: 'Each supernote captures one idea, making it reusable and linkable across your knowledge base.',
    color: 'orange',
  },
  {
    icon: Tag,
    title: 'Required Supertags',
    description: 'Structure your notes with supertags like #task, #idea, #book, #person for consistent organization.',
    color: 'teal',
  },
  {
    icon: Link2,
    title: 'Bidirectional Links',
    description: 'Connect notes with [[wikilinks]] to build a personal knowledge graph.',
    color: 'blue',
  },
  {
    icon: Layers,
    title: 'Canvas Integration',
    description: 'Drag supernotes onto the infinite canvas for spatial thinking and visual organization.',
    color: 'purple',
  },
]

const writingModes = [
  {
    title: 'Long-form Writing',
    description: 'Full strands for articles, guides, and documentation',
    icon: BookOpen,
    features: ['Rich markdown editor', 'Chapters & sections', 'Images & embeds', 'Block-level tagging'],
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    title: 'Index Card Notes',
    description: 'Supernotes for quick ideas, tasks, and concepts',
    icon: FileText,
    features: ['Compact notecards', 'Required supertags', 'Visual styling', 'Canvas-first design'],
    gradient: 'from-orange-500 to-amber-500',
  },
]

// Example supernotes for showcase
const exampleSupernotes = [
  {
    supertag: 'task',
    supertagColor: '#ef4444',
    title: 'Review PR #127',
    content: 'Check the new auth flow implementation and test edge cases.',
    fields: { status: 'In Progress', priority: 'High', due: 'Today' },
    tags: ['code-review', 'auth'],
  },
  {
    supertag: 'idea',
    supertagColor: '#8b5cf6',
    title: 'AI-Powered Note Linking',
    content: 'Use embeddings to suggest related notes as you write. Could improve discovery.',
    fields: { status: 'Raw', category: 'Product' },
    tags: ['ai', 'feature'],
  },
  {
    supertag: 'book',
    supertagColor: '#0ea5e9',
    title: 'Thinking, Fast and Slow',
    content: 'System 1 vs System 2 thinking. Great insights on cognitive biases.',
    fields: { author: 'Daniel Kahneman', rating: '⭐⭐⭐⭐⭐', status: 'Read' },
    tags: ['psychology', 'decision-making'],
  },
  {
    supertag: 'meeting',
    supertagColor: '#10b981',
    title: 'Sprint Planning - Week 23',
    content: 'Discussed roadmap priorities. Focus on canvas features.',
    fields: { date: 'Dec 30, 2024', attendees: '5 people', action_items: '3' },
    tags: ['sprint', 'planning'],
  },
  {
    supertag: 'concept',
    supertagColor: '#f59e0b',
    title: 'Zettelkasten Method',
    content: 'Atomic notes + bidirectional links = emergent knowledge.',
    fields: { type: 'Framework', domain: 'PKM' },
    tags: ['note-taking', 'productivity'],
  },
  {
    supertag: 'quote',
    supertagColor: '#ec4899',
    title: '"The best time to plant a tree..."',
    content: 'The best time to plant a tree was 20 years ago. The second best time is now.',
    fields: { source: 'Chinese Proverb', context: 'Motivation' },
    tags: ['wisdom', 'motivation'],
  },
]

// Use cases table data
const supernoteUseCases = [
  {
    useCase: 'Personal Knowledge Base',
    supertags: ['#concept', '#idea', '#quote'],
    example: 'Capture insights from books, articles, and conversations',
    benefits: 'Build a searchable second brain with interconnected ideas',
  },
  {
    useCase: 'Task Management',
    supertags: ['#task', '#project', '#goal'],
    example: 'Track todos with status, priority, and due dates',
    benefits: 'Structured tasks that link to related notes and projects',
  },
  {
    useCase: 'Research & Learning',
    supertags: ['#paper', '#book', '#course'],
    example: 'Annotate papers with key findings and citations',
    benefits: 'Literature review with automatic backlinks to sources',
  },
  {
    useCase: 'Meeting Notes',
    supertags: ['#meeting', '#person', '#decision'],
    example: 'Log meetings with attendees, decisions, and action items',
    benefits: 'Never lose context—link to people, projects, and follow-ups',
  },
  {
    useCase: 'CRM & Contacts',
    supertags: ['#person', '#company', '#interaction'],
    example: 'Track relationships with notes about each interaction',
    benefits: 'Personal CRM with full history and connection mapping',
  },
  {
    useCase: 'Content Creation',
    supertags: ['#draft', '#outline', '#snippet'],
    example: 'Collect ideas, quotes, and outlines for future content',
    benefits: 'Reusable snippets that can be embedded in long-form writing',
  },
]

// Comparison: Strand Types (all are Strands - Supernotes are a specialized type)
const strandTypeComparison = [
  { feature: 'Strand Type', strand: 'File-Strand or Folder-Strand', supernote: 'Supernote (specialized strand)' },
  { feature: 'Content Length', strand: 'Unlimited (articles, guides, docs)', supernote: 'Compact (index card format)' },
  { feature: 'Structure', strand: 'Flexible markdown with sections', supernote: 'Required supertag with schema' },
  { feature: 'Supertags', strand: 'Optional enhancement', supernote: 'Required (defines structure)' },
  { feature: 'Canvas View', strand: 'Thumbnail preview', supernote: 'Full card with fields visible' },
  { feature: 'Best For', strand: 'Deep dives, tutorials, documentation', supernote: 'Quick capture, atomic ideas, tasks' },
  { feature: 'Card Sizes', strand: 'N/A', supernote: '3×5, 4×6, 5×7, A7, Square, Compact' },
]

export function SupernotesSection() {
  const resolvePath = useQuarryPath()
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'examples' | 'usecases' | 'comparison'>('examples')

  // Theme-aware color map for feature cards
  const colorMap: Record<string, string> = {
    orange: 'bg-orange-500/10 text-orange-500 dark:bg-orange-400/10 dark:text-orange-400',
    teal: 'bg-teal-500/10 text-teal-500 dark:bg-teal-400/10 dark:text-teal-400',
    blue: 'bg-blue-500/10 text-blue-500 dark:bg-blue-400/10 dark:text-blue-400',
    purple: 'bg-purple-500/10 text-purple-500 dark:bg-purple-400/10 dark:text-purple-400',
  }

  // Keyboard navigation for tabs
  const handleTabKeyDown = (e: React.KeyboardEvent, tabId: 'examples' | 'usecases' | 'comparison') => {
    const tabs: ('examples' | 'usecases' | 'comparison')[] = ['examples', 'usecases', 'comparison']
    const currentIndex = tabs.indexOf(activeTab)
    
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (currentIndex + 1) % tabs.length
      setActiveTab(tabs[nextIndex])
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length
      setActiveTab(tabs[prevIndex])
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setActiveTab(tabId)
    }
  }

  return (
    <section 
      ref={sectionRef} 
      id="supernotes" 
      aria-labelledby="supernotes-heading"
      className="py-16 sm:py-20 md:py-24 px-4 bg-gradient-to-b from-amber-50/15 via-amber-50/25 to-indigo-50/20 dark:from-orange-950/10 dark:via-amber-950/15 dark:to-indigo-950/15 relative overflow-hidden"
    >
      {/* Glass overlay for smooth blending */}
      <div className="absolute inset-0 backdrop-blur-[0.5px] bg-gradient-to-b from-white/5 via-transparent to-white/5 dark:from-black/5 dark:via-transparent dark:to-black/5 pointer-events-none" />
      {/* Decorative index card background - hidden on mobile for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block" aria-hidden="true">
        {/* Floating cards decoration - reduced motion for accessibility */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, rotate: -5 + i * 3 }}
            animate={isInView ? { 
              opacity: 0.05, 
              rotate: [-5 + i * 3, -3 + i * 3, -5 + i * 3],
              y: [0, -10, 0]
            } : {}}
            transition={{ 
              duration: 4 + i, 
              repeat: Infinity, 
              delay: i * 0.3 
            }}
            className="absolute bg-orange-200 dark:bg-orange-800 rounded-lg shadow-lg motion-reduce:animate-none"
            style={{
              width: 80 + i * 20,
              height: 60 + i * 15,
              left: `${10 + i * 18}%`,
              top: `${10 + (i % 3) * 30}%`,
              transformOrigin: 'center',
            }}
          />
        ))}
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header - SEO optimized with proper hierarchy */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 
            id="supernotes-heading"
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Supernotes + Long-form
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Two modes, one system. Write detailed articles <em>or</em> capture quick ideas as index cards. 
            Both connect seamlessly in your knowledge graph.
          </p>
        </motion.header>

        {/* Writing Modes Comparison */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {writingModes.map((mode, index) => {
            const Icon = mode.icon
            return (
              <motion.div
                key={mode.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.1 + index * 0.15 }}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`
                  relative p-6 rounded-2xl border-2 transition-all duration-300
                  ${hoveredCard === index 
                    ? 'border-transparent shadow-xl scale-[1.02]' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                  bg-white dark:bg-gray-800/50
                `}
              >
                {/* Gradient border on hover */}
                {hoveredCard === index && (
                  <div className={`absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br ${mode.gradient} opacity-20 blur-xl`} />
                )}
                
                {/* Header with icon */}
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${mode.gradient} text-white`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{mode.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{mode.description}</p>
                  </div>
                </div>

                {/* Feature list */}
                <ul className="space-y-2">
                  {mode.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Corner fold for supernotes card */}
                {index === 1 && (
                  <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden rounded-tr-2xl">
                    <div className="absolute top-0 right-0 w-0 h-0 border-l-[32px] border-l-transparent border-t-[32px] border-t-orange-400 dark:border-t-orange-600" />
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TABBED CONTENT: Examples, Use Cases, Comparison */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          {/* Tab Navigation - Accessible with ARIA, keyboard nav, touch-friendly */}
          <nav aria-label="Supernote content sections" className="flex justify-center mb-6 sm:mb-8">
            <div 
              role="tablist" 
              aria-label="Content tabs"
              className="inline-flex flex-wrap justify-center gap-1 sm:gap-0 p-1 sm:p-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              {[
                { id: 'examples' as const, label: 'Examples', fullLabel: 'Live Examples', icon: FileText },
                { id: 'usecases' as const, label: 'Use Cases', fullLabel: 'Use Cases', icon: Layers },
                { id: 'comparison' as const, label: 'Types', fullLabel: 'Strand Types', icon: ArrowRight },
              ].map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    id={`supernotes-tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls={`supernotes-panel-${tab.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                    className={`
                      flex items-center justify-center gap-1.5 sm:gap-2 
                      px-3 sm:px-4 py-2.5 sm:py-3 
                      min-h-touch min-w-[80px] sm:min-w-[100px]
                      rounded-lg text-xs sm:text-sm font-medium 
                      transition-all duration-200
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2
                      active:scale-[0.98] touch-manipulation
                      ${isActive 
                        ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    {/* Short label on mobile, full label on larger screens */}
                    <span className="sm:hidden">{tab.label}</span>
                    <span className="hidden sm:inline">{tab.fullLabel}</span>
                  </button>
                )
              })}
            </div>
          </nav>
          
          {/* Mobile swipe hint */}
          <div className="sm:hidden text-center text-xs text-gray-500 dark:text-gray-500 mb-4 flex items-center justify-center gap-1" aria-hidden="true">
            <span>←</span>
            <span>Swipe to scroll tables</span>
            <span>→</span>
          </div>

          {/* Tab Content - Accessible panels */}
          <AnimatePresence mode="wait">
            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* EXAMPLES TAB: Interactive Supernote Cards */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {activeTab === 'examples' && (
              <motion.div
                key="examples"
                role="tabpanel"
                id="supernotes-panel-examples"
                aria-labelledby="supernotes-tab-examples"
                tabIndex={0}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="focus:outline-none"
              >
                <div className="text-center mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Supernotes in Action
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    Each supernote has a required supertag that defines its structure and fields
                  </p>
                </div>
                
                {/* Responsive grid: 1 col mobile, 2 cols tablet, 3 cols desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {exampleSupernotes.map((note, index) => (
                    <motion.article
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className="relative bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 shadow-sm hover:shadow-lg active:shadow-md transition-shadow group touch-manipulation"
                      aria-label={`${note.supertag} supernote: ${note.title}`}
                    >
                      {/* Corner fold - decorative */}
                      <div className="absolute top-0 right-0 w-5 sm:w-6 h-5 sm:h-6 overflow-hidden rounded-tr-xl" aria-hidden="true">
                        <div 
                          className="absolute top-0 right-0 w-0 h-0 border-l-[20px] sm:border-l-[24px] border-l-transparent border-t-[20px] sm:border-t-[24px]"
                          style={{ borderTopColor: note.supertagColor }}
                        />
                      </div>
                      
                      {/* Supertag badge - touch target size */}
                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <span 
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white min-h-[28px]"
                          style={{ backgroundColor: note.supertagColor }}
                        >
                          <Tag className="w-3 h-3" aria-hidden="true" />
                          <span>#{note.supertag}</span>
                        </span>
                      </div>
                      
                      {/* Title */}
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1.5 sm:mb-2 line-clamp-1">
                        {note.title}
                      </h3>
                      
                      {/* Content preview */}
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 line-clamp-2 leading-relaxed">
                        {note.content}
                      </p>
                      
                      {/* Supertag fields - structured data */}
                      <dl className="space-y-1 sm:space-y-1.5 mb-2 sm:mb-3 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        {Object.entries(note.fields).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <dt className="text-gray-500 dark:text-gray-500 capitalize">{key.replace('_', ' ')}</dt>
                            <dd className="text-gray-700 dark:text-gray-300 font-medium">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1" aria-label="Tags">
                        {note.tags.map((tag) => (
                          <span 
                            key={tag} 
                            className="px-1.5 py-0.5 rounded text-[10px] sm:text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </motion.article>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* USE CASES TAB: Table of Applications */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {activeTab === 'usecases' && (
              <motion.div
                key="usecases"
                role="tabpanel"
                id="supernotes-panel-usecases"
                aria-labelledby="supernotes-tab-usecases"
                tabIndex={0}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="focus:outline-none"
              >
                <div className="text-center mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Supernote Use Cases
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    From personal knowledge management to team collaboration
                  </p>
                </div>
                
                {/* Mobile: Card view | Desktop: Table view */}
                {/* Mobile card layout */}
                <div className="sm:hidden space-y-3">
                  {supernoteUseCases.map((row, index) => (
                    <article
                      key={index}
                      className="p-4 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2 text-base">
                        <span className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                        {row.useCase}
                      </h3>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {row.supertags.map((tag) => (
                          <span 
                            key={tag}
                            className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Example:</span> {row.example}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Benefits:</span> {row.benefits}
                      </p>
                    </article>
                  ))}
                </div>

                {/* Desktop table layout */}
                <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <table className="w-full border-collapse" aria-label="Supernote use cases comparison">
                    <thead>
                      <tr className="bg-orange-50 dark:bg-orange-950/30">
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-orange-200 dark:border-orange-900/50">
                          Use Case
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-orange-200 dark:border-orange-900/50">
                          Supertags
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-orange-200 dark:border-orange-900/50 hidden md:table-cell">
                          Example
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-orange-200 dark:border-orange-900/50">
                          Benefits
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {supernoteUseCases.map((row, index) => (
                        <tr 
                          key={index} 
                          className={`
                            ${index % 2 === 0 ? 'bg-white dark:bg-gray-800/30' : 'bg-gray-50 dark:bg-gray-800/50'}
                            hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors
                          `}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 whitespace-nowrap">
                            {row.useCase}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex flex-wrap gap-1">
                              {row.supertags.map((tag) => (
                                <span 
                                  key={tag}
                                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 whitespace-nowrap"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 hidden md:table-cell">
                            {row.example}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                            {row.benefits}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* COMPARISON TAB: Strands vs Supernotes */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {activeTab === 'comparison' && (
              <motion.div
                key="comparison"
                role="tabpanel"
                id="supernotes-panel-comparison"
                aria-labelledby="supernotes-tab-comparison"
                tabIndex={0}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="focus:outline-none"
              >
                <div className="text-center mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Strand Types Compared
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    All content is a Strand — choose the right format
                  </p>
                </div>
                
                {/* Mobile: Stacked cards | Desktop: Table */}
                {/* Mobile comparison cards */}
                <div className="sm:hidden space-y-4">
                  {strandTypeComparison.map((row, index) => (
                    <div key={index} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{row.feature}</span>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                        <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20">
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-1">
                            <BookOpen className="w-3 h-3" aria-hidden="true" />
                            <span>Strand</span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{row.strand}</p>
                        </div>
                        <div className="p-3 bg-orange-50/50 dark:bg-orange-950/20">
                          <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 text-xs font-medium mb-1">
                            <FileText className="w-3 h-3" aria-hidden="true" />
                            <span>Supernote</span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{row.supernote}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <table className="w-full border-collapse" aria-label="Comparison between strand types">
                    <thead>
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 w-1/4">
                          Feature
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-900/50">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                            <span>File/Folder Strands</span>
                          </div>
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white bg-orange-50 dark:bg-orange-950/30 border-b border-orange-200 dark:border-orange-900/50">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-orange-500" aria-hidden="true" />
                            <span>Supernotes</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {strandTypeComparison.map((row, index) => (
                        <tr 
                          key={index}
                          className={index % 2 === 0 ? 'bg-white dark:bg-gray-800/30' : 'bg-gray-50 dark:bg-gray-800/50'}
                        >
                          <th scope="row" className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 text-left">
                            {row.feature}
                          </th>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                            {row.strand}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 bg-orange-50/50 dark:bg-orange-950/10">
                            {row.supernote}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Clarification note */}
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4 flex items-center justify-center gap-1.5">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                  <span>Supernotes are a specialized strand type — all content in Quarry is a Strand.</span>
                </p>

                {/* Quick decision guide - touch-friendly cards */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <article className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
                    <h3 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2 text-sm sm:text-base">
                      <BookOpen className="w-4 h-4" aria-hidden="true" />
                      <span>Use Strands When...</span>
                    </h3>
                    <ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <span>Writing articles, guides, or documentation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <span>Content needs chapters or sections</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <span>Including images, code blocks, or embeds</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <span>Creating reference material</span>
                      </li>
                    </ul>
                  </article>
                  <article className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50">
                    <h3 className="font-semibold text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-2 text-sm sm:text-base">
                      <FileText className="w-4 h-4" aria-hidden="true" />
                      <span>Use Supernotes When...</span>
                    </h3>
                    <ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <span>Capturing quick ideas or tasks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <span>Building a Zettelkasten-style knowledge base</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <span>Organizing on the infinite canvas</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <span>Creating structured entities (people, books, etc.)</span>
                      </li>
                    </ul>
                  </article>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Supernote Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="text-center mb-8 mt-16"
        >
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Why Supernotes?
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Inspired by the Zettelkasten method and digital tools like Supernotes & Tana
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {supernoteFeatures.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="p-5 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <div className={`inline-flex p-2.5 rounded-lg ${colorMap[feature.color]} mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-base">{feature.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
              </motion.div>
            )
          })}
        </div>

        {/* Zettelkasten Explainer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7 }}
          className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border border-orange-200 dark:border-orange-900/50"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex-shrink-0">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-base">
                What is Zettelkasten?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                The Zettelkasten ("slip-box") method was developed by sociologist Niklas Luhmann, 
                who used it to write over 70 books and 400 articles. The core principles:
              </p>
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-orange-500">①</span>
                  <span className="text-gray-700 dark:text-gray-300">One idea per note</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-500">②</span>
                  <span className="text-gray-700 dark:text-gray-300">Link notes together</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-500">③</span>
                  <span className="text-gray-700 dark:text-gray-300">Emerge new connections</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8 }}
          className="text-center mt-12"
        >
          <Link
            href={resolvePath('/quarry/new?type=supernote')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <FileText className="w-4 h-4" />
            Create Your First Supernote
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   COLLECTIONS SECTION
   Cross-cutting organization with visual bento grid and generated covers
   ═══════════════════════════════════════════════════════════════════════════════ */

export function CollectionsSection() {
  const resolvePath = useQuarryPath()
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })
  const [activePattern, setActivePattern] = useState(0)
  const [activeFaq, setActiveFaq] = useState<number | null>(null)

  const coverPatterns = [
    { id: 'geometric', name: 'Geometric', desc: 'Overlapping polygons', color: '#8b5cf6' },
    { id: 'waves', name: 'Waves', desc: 'Flowing wave patterns', color: '#3b82f6' },
    { id: 'aurora', name: 'Aurora', desc: 'Northern lights effect', color: '#22c55e' },
    { id: 'circuits', name: 'Circuits', desc: 'Tech circuit board', color: '#06b6d4' },
    { id: 'constellation', name: 'Constellation', desc: 'Star connections', color: '#6366f1' },
    { id: 'hexagons', name: 'Hexagons', desc: 'Honeycomb grid', color: '#f59e0b' },
  ]

  const faqs = [
    {
      q: 'How are collections different from looms?',
      a: 'Looms are hierarchical containers within a weave. Collections are cross-cutting—you can add any strand from any weave to any collection, enabling flexible project-based or thematic grouping.',
    },
    {
      q: 'Can a strand be in multiple collections?',
      a: 'Yes! Strands can belong to unlimited collections. This is perfect for cross-referencing content across different projects or themes.',
    },
    {
      q: 'What are smart collections?',
      a: 'Smart collections auto-update based on filters like tags, subjects, or date ranges. Define the criteria once, and matching strands are automatically included.',
    },
    {
      q: 'How do generated covers work?',
      a: 'Each collection gets a unique SVG cover generated from 10 patterns (geometric, waves, aurora, etc.) based on the collection name and color. No external images needed!',
    },
  ]

  return (
    <section
      ref={sectionRef}
      className="py-24 md:py-32 bg-gradient-to-b from-indigo-50/20 via-indigo-50/25 to-gray-50/30 dark:from-indigo-950/15 dark:via-indigo-900/15 dark:to-gray-900/30 relative overflow-hidden"
      aria-labelledby="collections-title"
    >
      {/* Glass overlay for smooth blending */}
      <div className="absolute inset-0 backdrop-blur-[0.5px] bg-gradient-to-b from-white/5 via-transparent to-white/5 dark:from-black/5 dark:via-transparent dark:to-black/5 pointer-events-none" />
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30 dark:opacity-20">
        <div className="absolute top-20 left-10 w-64 h-64 bg-indigo-200 dark:bg-indigo-800 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-violet-200 dark:bg-violet-800 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2
            id="collections-title"
            className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Collections
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Group any strands together, regardless of hierarchy. Beautiful visual organization with generated SVG covers.
          </p>
        </motion.div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Features */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="grid gap-4">
              {[
                { icon: FolderTree, title: 'Cross-Weave Grouping', desc: 'Add strands from any weave to any collection' },
                { icon: Palette, title: '10 Cover Patterns', desc: 'Geometric, waves, aurora, circuits, and more' },
                { icon: Star, title: 'Pin Favorites', desc: 'Quick access to important collections' },
                { icon: Network, title: 'Connection Discovery', desc: 'Auto-detect related strands via shared tags' },
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex gap-4 p-4 rounded-xl bg-white dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700/50 shadow-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Cover pattern selector */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.6 }}
              className="p-6 rounded-2xl bg-white dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700/50"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Generated Cover Patterns
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {coverPatterns.map((pattern, i) => (
                  <button
                    key={pattern.id}
                    onClick={() => setActivePattern(i)}
                    className={`p-3 rounded-lg text-center transition-all text-sm ${
                      activePattern === i
                        ? 'bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-indigo-500'
                        : 'bg-gray-50 dark:bg-zinc-700/50 hover:bg-gray-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    <span className="font-medium text-gray-900 dark:text-white">{pattern.name}</span>
                  </button>
                ))}
              </div>
              <div 
                className="h-20 rounded-xl overflow-hidden"
                style={{ 
                  background: `linear-gradient(135deg, ${coverPatterns[activePattern].color}40, ${coverPatterns[activePattern].color}20)`,
                  boxShadow: `inset 0 0 60px ${coverPatterns[activePattern].color}30`,
                }}
              >
                <div className="w-full h-full flex items-center justify-center text-white/80 text-sm">
                  {coverPatterns[activePattern].desc}
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Bento preview + FAQ */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            {/* Bento grid mockup */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { title: 'ML Research', strands: 12, color: '#8b5cf6', size: 'lg' },
                { title: 'Reading List', strands: 5, color: '#3b82f6', size: 'sm' },
                { title: 'Project X', strands: 8, color: '#22c55e', size: 'sm' },
                { title: 'Ideas', strands: 23, color: '#f59e0b', size: 'md' },
              ].map((col, i) => (
                <motion.div
                  key={col.title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className={`rounded-xl border border-gray-200 dark:border-zinc-700/50 overflow-hidden ${
                    col.size === 'lg' ? 'col-span-2 row-span-2' : col.size === 'md' ? 'col-span-2' : ''
                  }`}
                  style={{ 
                    background: `linear-gradient(135deg, ${col.color}15, transparent)`,
                  }}
                >
                  <div 
                    className="h-12"
                    style={{ background: `linear-gradient(135deg, ${col.color}40, ${col.color}20)` }}
                  />
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm">{col.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{col.strands} strands</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* FAQ accordion */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Frequently Asked Questions
              </h3>
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="rounded-xl border border-gray-100 dark:border-zinc-700/50 overflow-hidden"
                >
                  <button
                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left bg-white dark:bg-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors"
                    aria-expanded={activeFaq === i}
                  >
                    <span className="font-medium text-gray-900 dark:text-white text-sm">{faq.q}</span>
                    {activeFaq === i ? (
                      <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                  </button>
                  <AnimatePresence>
                    {activeFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-zinc-800/30"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1 }}
          className="text-center mt-12"
        >
          <Link
            href={resolvePath('/quarry/collections')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <Layers className="w-4 h-4" />
            Browse Collections
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   BLOCK TAGGING & CROSSLINKS SECTION
   Showcase block-level tagging, transclusion, and backlinks
   ═══════════════════════════════════════════════════════════════════════════════ */

export function BlockTaggingSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })
  const [activeExample, setActiveExample] = useState(0)

  const examples = [
    { 
      syntax: '#important',
      description: 'Inline block tag',
      preview: 'This paragraph is tagged as important #important',
      color: 'teal'
    },
    {
      syntax: '[[strand#block-id]]',
      description: 'Link to specific block',
      preview: 'See [[research/ml-notes#key-insight]]',
      color: 'blue'
    },
    {
      syntax: '![[strand#block-id]]',
      description: 'Embed block inline',
      preview: '![[library/quotes#einstein-creativity]]',
      color: 'purple'
    },
    {
      syntax: '^[[strand#block-id]]',
      description: 'Citation reference',
      preview: 'As noted in ^[[papers/attention-is-all-you-need#abstract]]',
      color: 'amber'
    },
  ]

  // Auto-cycle through examples
  useState(() => {
    const interval = setInterval(() => {
      setActiveExample((prev) => (prev + 1) % examples.length)
    }, 3000)
    return () => clearInterval(interval)
  })

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-gradient-to-b from-gray-50/30 via-gray-100/35 to-gray-50/25 dark:from-gray-900/30 dark:via-gray-800/35 dark:to-gray-900/25">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Explanation */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-sm font-medium mb-4">
              <Tag className="w-4 h-4" />
              Granular Knowledge
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Block-Level Tagging.<br/>
              <span className="text-teal-500">Connect Everything.</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Tag individual paragraphs, headings, and code blocks — not just documents. Reference, embed, cite, or mirror any block across your entire knowledge base. See all backlinks at a glance.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                  <Hash className="w-4 h-4 text-teal-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">Hybrid Block Tagging</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Write #inline-tags naturally in your content (100% confidence), or let the NLP pipeline auto-suggest. Worthiness scoring prioritizes important content. Optional AI enhancement with chain-of-thought reasoning.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Link2 className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">Transclusion</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Link, embed, cite, or mirror blocks with [[strand#block-id]] syntax. Four reference types for different use cases.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Network className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">Backlink Explorer</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">See every reference to any block. Context snippets show exactly where and how blocks are referenced. Inverted tag index for instant lookup.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Filter className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">Worthiness Scoring</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Topic shift, entity density, semantic novelty, and structural importance combine into a worthiness score. Filter by type, tags, or score in the Blocks tab.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Visual Demo */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-teal-500/10 to-blue-500/10">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-teal-500" />
                  <span className="font-bold text-gray-900 dark:text-white">Block Reference Syntax</span>
                </div>
              </div>

              {/* Syntax examples */}
              <div className="p-4 space-y-3">
                {examples.map((example, i) => (
                  <motion.div
                    key={example.syntax}
                    className={`p-3 rounded-lg border transition-all ${
                      activeExample === i
                        ? `border-${example.color}-500 bg-${example.color}-50 dark:bg-${example.color}-900/20 ring-2 ring-${example.color}-500/20`
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    style={activeExample === i ? {
                      borderColor: example.color === 'teal' ? '#14b8a6' : 
                                   example.color === 'blue' ? '#3b82f6' :
                                   example.color === 'purple' ? '#a855f7' : '#f59e0b',
                      backgroundColor: example.color === 'teal' ? 'rgba(20, 184, 166, 0.1)' :
                                      example.color === 'blue' ? 'rgba(59, 130, 246, 0.1)' :
                                      example.color === 'purple' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(245, 158, 11, 0.1)'
                    } : {}}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                        {example.syntax}
                      </code>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">
                        {example.description}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                      {example.preview}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Backlinks preview */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5 }}
                className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <Network className="w-3.5 h-3.5" />
                  <span className="font-medium">Backlinks to this block</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['research/ml-basics', 'projects/thesis', 'daily/2024-01-15'].map((link) => (
                    <span key={link} className="text-[10px] px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      {link}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.3 }}
                className="absolute -top-3 -right-3 px-3 py-1.5 rounded-full bg-teal-500 text-white text-xs font-bold shadow-lg"
              >
                Block-Level
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PLANNER SECTION
   Showcase the time blocking, drag-drop, and calendar features
   ═══════════════════════════════════════════════════════════════════════════════ */

const plannerFeatures = [
  {
    icon: Clock,
    title: 'Streamlined Day View',
    description: 'Premium vertical timeline with animated event cards. See your day at a glance with current time indicator and day phase icons.',
    color: 'emerald',
  },
  {
    icon: LayoutList,
    title: 'Kanban Board',
    description: 'Visual task management with drag-and-drop columns. Track To Do, In Progress, and Done. Priority badges and overdue indicators.',
    color: 'blue',
  },
  {
    icon: Flame,
    title: 'Accomplishment Tracking',
    description: 'Track completed tasks, subtasks, and habits. View daily, weekly, and monthly achievements with gamified completion streaks.',
    color: 'amber',
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    description: 'Browser push notifications and sound alerts. Set reminders at 5, 10, 15, or 30 minutes before events.',
    color: 'cyan',
  },
  {
    icon: Repeat,
    title: 'Recurrence Patterns',
    description: 'Daily, weekly, monthly, yearly patterns. Weekday-only scheduling. Custom intervals with end dates.',
    color: 'violet',
  },
  {
    icon: CalendarDays,
    title: '6 Views + Google Sync',
    description: 'Day, Week, Month, Agenda, Timeline, and Kanban views. Two-way Google Calendar sync. Works offline.',
    color: 'rose',
  },
]

export function PlannerSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-500',
    cyan: 'bg-cyan-500/10 text-cyan-500',
    violet: 'bg-violet-500/10 text-violet-500',
    amber: 'bg-amber-500/10 text-amber-500',
    blue: 'bg-blue-500/10 text-blue-500',
    rose: 'bg-rose-500/10 text-rose-500',
  }

  return (
    <section ref={sectionRef} id="planner" className="py-24 px-4 bg-gradient-to-b from-gray-50/25 via-gray-100/35 to-blue-50/15 dark:from-gray-900/25 dark:via-gray-800/35 dark:to-blue-950/15 relative overflow-hidden">
      {/* Glass overlay for smooth blending */}
      <div className="absolute inset-0 backdrop-blur-[0.5px] bg-gradient-to-b from-white/5 via-transparent to-white/5 dark:from-black/5 dark:via-transparent dark:to-black/5 pointer-events-none" />
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Timeline-inspired vertical lines */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 0.03 } : {}}
          transition={{ duration: 1 }}
          className="absolute left-1/4 top-0 bottom-0 w-px bg-quarry-green-500"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 0.02 } : {}}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute right-1/3 top-0 bottom-0 w-px bg-quarry-green-500"
        />
        {/* Clock-like circle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -30 }}
          animate={isInView ? { opacity: 0.04, scale: 1, rotate: 0 } : {}}
          transition={{ duration: 1.2 }}
          className="absolute -top-10 right-10 w-72 h-72"
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.5" fill="none" className="text-quarry-green-500" />
            {/* Hour markers */}
            {[...Array(12)].map((_, i) => (
              <line
                key={i}
                x1="100"
                y1="25"
                x2="100"
                y2="30"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-quarry-green-500"
                transform={`rotate(${i * 30} 100 100)`}
              />
            ))}
          </svg>
        </motion.div>
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '48px 48px' }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-quarry-charcoal dark:text-quarry-offwhite mb-4">
            Plan Your Day, Your Way
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Time blocking, habit tracking, and calendar sync — all integrated with your knowledge base. Tasks from notes become events on your timeline.
          </p>
        </motion.div>

        {/* Two-column layout: Visual demo + Features */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Timeline Demo Visual */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative"
          >
            {/* Mock timeline card */}
            <div className="bg-white dark:bg-quarry-charcoal-deep rounded-2xl shadow-neuro-light dark:shadow-neuro-dark border border-gray-200/50 dark:border-white/5 p-6 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-quarry-green-600 dark:text-quarry-green-400" />
                  <span className="font-semibold text-quarry-charcoal dark:text-quarry-offwhite">Today</span>
                </div>
                <div className="flex gap-1">
                  {['D', 'W', 'M'].map((v, i) => (
                    <span key={v} className={`px-2 py-0.5 text-xs rounded ${i === 0 ? 'bg-quarry-green-500 text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                      {v}
                    </span>
                  ))}
                </div>
              </div>

              {/* Timeline spine */}
              <div className="relative pl-8">
                {/* Vertical spine line */}
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

                {/* Time blocks */}
                {[
                  { time: '9:00 AM', title: 'Morning standup', color: 'bg-blue-500', duration: '30m' },
                  { time: '10:00 AM', title: 'Code review', color: 'bg-violet-500', duration: '1h' },
                  { time: '12:00 PM', title: 'Lunch break', color: 'bg-amber-500', duration: '1h', current: true },
                  { time: '2:00 PM', title: 'Deep work session', color: 'bg-emerald-500', duration: '2h' },
                ].map((block, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="relative mb-4 last:mb-0"
                  >
                    {/* Time marker dot */}
                    <div className={`absolute left-[-22px] top-2 w-3 h-3 rounded-full ${block.color} ring-2 ring-white dark:ring-quarry-charcoal-deep`} />

                    {/* Event card */}
                    <div className={`
                      p-3 rounded-xl border transition-all
                      ${block.current
                        ? 'bg-quarry-green-50 dark:bg-quarry-green-900/20 border-quarry-green-200 dark:border-quarry-green-700'
                        : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10'
                      }
                    `}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{block.time}</div>
                          <div className="font-medium text-quarry-charcoal dark:text-quarry-offwhite text-sm">{block.title}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{block.duration}</span>
                          {block.current && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-quarry-green-500 text-white font-medium">
                              NOW
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bottom hint */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.8 }}
                className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-center gap-2 text-xs text-gray-400"
              >
                <GripVertical className="w-3 h-3" />
                <span>Drag to reschedule • Click to edit</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Feature cards grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {plannerFeatures.map((feature, i) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="group p-4 rounded-xl bg-white dark:bg-quarry-charcoal-deep border border-gray-200/50 dark:border-white/5 shadow-neuro-sm-light dark:shadow-neuro-sm-dark hover:shadow-neuro-light dark:hover:shadow-neuro-dark transition-all duration-300"
                >
                  <div className={`inline-flex p-2.5 rounded-lg ${colorMap[feature.color]} mb-3 group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-quarry-charcoal dark:text-quarry-offwhite mb-1 text-sm">{feature.title}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.9 }}
          className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-quarry-green-500/5 via-quarry-green-500/10 to-quarry-green-500/5 border border-quarry-green-500/20 flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-quarry-green-500/10">
              <Zap className="w-5 h-5 text-quarry-green-600 dark:text-quarry-green-400" />
            </div>
            <span className="text-quarry-charcoal dark:text-quarry-offwhite font-medium">
              Habits, streaks, and Google Calendar — all synced locally with full offline support.
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   USE CASES SECTION
   ═══════════════════════════════════════════════════════════════════════════════ */

const useCases = [
  {
    icon: Users,
    title: 'For Teams',
    subtitle: 'Collaborative Knowledge Base',
    description: 'Build a shared source of truth across your organization. AI-powered search helps everyone find answers instantly.',
    image: '/images/placeholder-team.png',
    features: ['Shared workspaces', 'Permission controls', 'Activity feeds', 'Real-time sync']
  },
  {
    icon: GraduationCap,
    title: 'For Learners',
    subtitle: 'Personal Study System',
    description: 'Create flashcards, track progress, and build lasting knowledge with spaced repetition and AI tutoring.',
    image: '/images/placeholder-learning.png',
    features: ['FSRS flashcards', 'Progress tracking', 'AI tutoring', 'Mind maps']
  },
  {
    icon: Code2,
    title: 'For Developers',
    subtitle: 'Documentation Platform',
    description: 'Write docs in Markdown, get semantic search for free. AI agents can traverse and answer questions about your codebase.',
    image: '/images/placeholder-dev.png',
    features: ['Code highlighting', 'API docs', 'Search index', 'MCP integration']
  },
  {
    icon: Building2,
    title: 'For Enterprises',
    subtitle: 'AI-Ready Knowledge',
    description: 'Prepare your institutional knowledge for the AI era. OpenStrand protocol ensures your content works with any AI system.',
    image: '/images/placeholder-enterprise.png',
    features: ['Self-hosted', 'SSO/SAML', 'Audit logs', 'Custom LLMs']
  },
]

export function UseCasesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })
  const [activeCase, setActiveCase] = useState(0)

  return (
    <section ref={sectionRef} className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Built for Everyone
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            From personal notes to enterprise documentation, FABRIC scales with your needs.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Tabs */}
          <div className="lg:col-span-4 space-y-3">
            {useCases.map((uc, i) => {
              const Icon = uc.icon
              const isActive = activeCase === i
              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setActiveCase(i)}
                  className={`
                    w-full text-left p-4 rounded-xl border-2 transition-all duration-300
                    ${isActive 
                      ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className={`font-semibold ${isActive ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>
                        {uc.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{uc.subtitle}</div>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Content */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCase}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800"
              >
                {/* Placeholder for screenshot/video */}
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center relative">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 shadow-lg flex items-center justify-center mx-auto mb-4">
                      <Play className="w-8 h-8 text-emerald-500" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Demo video coming soon</p>
                  </div>
                  {/* Overlay badge */}
                  <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium">
                    Interactive Demo
                  </div>
                </div>

                {/* Description */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {useCases[activeCase].subtitle}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {useCases[activeCase].description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {useCases[activeCase].features.map((f, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-300">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FEATURE COMPARISON MATRIX - Community vs Premium Edition
   ═══════════════════════════════════════════════════════════════════════════════ */

export function FeatureMatrixSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const editions = ['Community', 'Premium']
  const featureRows = [
    { name: 'Semantic Search', community: true, premium: true, category: 'core' },
    { name: 'Knowledge Graph', community: true, premium: true, category: 'core' },
    { name: 'All 6 Themes', community: true, premium: true, category: 'core' },
    { name: 'Bookmarks & Reading Progress', community: true, premium: true, category: 'core' },
    { name: 'GitHub Integration', community: true, premium: true, category: 'core' },
    { name: 'Auto-Tagging & Organization', community: true, premium: true, category: 'core' },
    { name: 'Accomplishment Tracking & Streaks', community: true, premium: true, category: 'core' },
    { name: 'AI Q&A with Citations', community: false, premium: true, category: 'ai' },
    { name: 'Quiz Generation', community: false, premium: true, category: 'ai' },
    { name: 'Flashcards (FSRS)', community: false, premium: true, category: 'ai' },
    { name: 'Image & Podcast Generation', community: false, premium: true, category: 'ai' },
    { name: 'Full Offline SQLite Storage', community: false, premium: true, category: 'offline' },
    { name: 'Works Without GitHub Repo', community: false, premium: true, category: 'offline' },
    { name: 'ZIP Export/Import', community: false, premium: true, category: 'offline' },
    { name: 'Desktop & Mobile Apps', community: false, premium: true, category: 'offline' },
  ]

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Edition <span className="text-emerald-500">Comparison</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Community Edition is free forever. Premium unlocks AI features and full offline capability.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-4 font-semibold text-gray-500 dark:text-gray-400">Feature</th>
                {editions.map((e, i) => (
                  <th
                    key={e}
                    className={`p-4 font-semibold text-center ${i === 1 ? 'text-emerald-500 bg-emerald-500/5' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    <div>{e}</div>
                    <div className="text-xs font-normal mt-1">
                      {i === 0 ? 'Free' : '$149 one-time'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Core Features Header */}
              <tr className="bg-gray-100 dark:bg-gray-700/50">
                <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Core Features
                </td>
              </tr>
              {featureRows.filter(r => r.category === 'core').map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{row.name}</td>
                  <td className="p-4 text-center">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                  <td className="p-4 text-center bg-emerald-500/5">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                </tr>
              ))}

              {/* AI Features Header */}
              <tr className="bg-gray-100 dark:bg-gray-700/50">
                <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  AI Features
                </td>
              </tr>
              {featureRows.filter(r => r.category === 'ai').map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{row.name}</td>
                  <td className="p-4 text-center">
                    <X className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                  </td>
                  <td className="p-4 text-center bg-emerald-500/5">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                </tr>
              ))}

              {/* Offline Features Header */}
              <tr className="bg-gray-100 dark:bg-gray-700/50">
                <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Offline & Export
                </td>
              </tr>
              {featureRows.filter(r => r.category === 'offline').map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{row.name}</td>
                  <td className="p-4 text-center">
                    <X className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                  </td>
                  <td className="p-4 text-center bg-emerald-500/5">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* CTA under table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="https://github.com/framersai/codex"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            <Github className="w-5 h-5" />
            Get Community (Free)
          </Link>
          <Link
            href="#pricing"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-all"
          >
            <Sparkles className="w-5 h-5" />
            Get Pro ($9/mo)
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   NLP PIPELINE SECTION
   ═══════════════════════════════════════════════════════════════════════════════ */

export function NLPPipelineSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const steps = [
    { step: 1, title: 'Ingestion', desc: 'Parse Markdown with gray-matter, remark-gfm', icon: FileText, color: 'emerald' },
    { step: 2, title: 'NLP Analysis', desc: 'Extract keywords, entities via compromise.js', icon: Brain, color: 'cyan' },
    { step: 3, title: 'Embeddings', desc: 'Generate vectors via ONNX Runtime WebGPU', icon: Cpu, color: 'violet' },
    { step: 4, title: 'Index & Cache', desc: 'Store in IndexedDB for instant offline search', icon: Database, color: 'amber' },
  ]

  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-500 text-emerald-500',
    cyan: 'border-cyan-500 text-cyan-500',
    violet: 'border-violet-500 text-violet-500',
    amber: 'border-amber-500 text-amber-500',
  }

  return (
    <section ref={sectionRef} className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            The <span className="text-cyan-500">Intelligence</span> Pipeline
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Static NLP first, LLM assistance when needed. All running locally in your browser.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500 via-cyan-500 to-amber-500 hidden md:block" />

          <div className="space-y-8 md:space-y-0">
            {steps.map((s, i) => {
              const Icon = s.icon
              const isEven = i % 2 === 0
              return (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: i * 0.15 }}
                  className={`relative flex items-center md:gap-8 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                >
                  {/* Step number */}
                  <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 z-10">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold border-2 bg-white dark:bg-gray-900 ${colorMap[s.color]}`}>
                      {s.step}
                    </div>
                  </div>

                  {/* Card */}
                  <div className={`flex-1 md:w-[45%] ${isEven ? 'md:pr-16 md:text-right' : 'md:pl-16'}`}>
                    <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className={`inline-flex items-center gap-3 mb-3 ${isEven ? 'md:flex-row-reverse' : ''}`}>
                        <div className={`md:hidden w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${colorMap[s.color]}`}>
                          {s.step}
                        </div>
                        <Icon className={`w-6 h-6 ${colorMap[s.color].split(' ')[1]}`} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{s.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400">{s.desc}</p>
                    </div>
                  </div>

                  {/* Spacer */}
                  <div className="hidden md:block flex-1 md:w-[45%]" />
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   GITHUB REPOS SECTION
   ═══════════════════════════════════════════════════════════════════════════════ */

export function GitHubReposSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const repos = [
    { name: 'quarry', desc: 'The main Quarry app. Your AI-native personal knowledge base.', color: 'emerald' },
    { name: 'codex', desc: 'GitHub-powered backend. Free NLP & indexing via GitHub Actions—no server needed.', color: 'cyan' },
    { name: 'quarry-plugins', desc: 'Official + community plugins. Extend Quarry with new capabilities.', color: 'violet' },
    { name: 'quarry-templates', desc: 'Strand templates for research, journaling, projects, and more.', color: 'amber' },
    { name: 'openstrand', desc: 'The universal knowledge schema protocol.', color: 'rose' },
  ]

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Open <span className="text-violet-500">Source</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-6">
            Fork, extend, self-host—it's all yours. MIT licensed.
          </p>

          {/* Developer-focused badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-700/50">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
              11,700+ tests
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/50">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
              99% pass rate
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-700/50">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              E2E encrypted
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200/50 dark:border-violet-700/50">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
              PRs welcome
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-700/50">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              Issues welcome
            </span>
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {repos.map((repo, i) => (
            <motion.a
              key={repo.name}
              href={`https://github.com/framersai/${repo.name}`}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <Github className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                <span className="font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                  {repo.name}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{repo.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">framersai/{repo.name}</span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.a>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="mt-10 text-center"
        >
          <Link
            href="/quarry/architecture"
            className="inline-flex items-center gap-2 text-emerald-500 font-medium hover:text-emerald-600 transition-colors"
          >
            <Layers className="w-5 h-5" />
            <span>View Full Architecture Guide</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LAUNCH PRICE BANNER
   Beta launch banner with urgency messaging and clear pricing
   ═══════════════════════════════════════════════════════════════════════════════ */

export function LaunchPriceBanner() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section ref={sectionRef} className="py-16 px-4 bg-quarry-offwhite dark:bg-quarry-charcoal overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative p-8 md:p-14 rounded-3xl bg-quarry-offwhite dark:bg-quarry-charcoal-deep shadow-neuro-light dark:shadow-neuro-dark border border-gray-200/30 dark:border-white/5 overflow-hidden"
        >
          {/* Ornate corner flourishes */}
          <svg className="absolute top-0 left-0 w-24 h-24 text-quarry-green-700/30 dark:text-quarry-green-50/20" viewBox="0 0 100 100" fill="none">
            <path d="M0 0 L0 100 Q25 75, 50 50 Q75 25, 100 0 Z" fill="currentColor" />
            <circle cx="20" cy="20" r="3" fill="currentColor" opacity="0.6" />
            <circle cx="35" cy="10" r="2" fill="currentColor" opacity="0.4" />
            <circle cx="10" cy="35" r="2" fill="currentColor" opacity="0.4" />
          </svg>
          <svg className="absolute top-0 right-0 w-24 h-24 text-quarry-green-700/30 dark:text-quarry-green-50/20 rotate-90" viewBox="0 0 100 100" fill="none">
            <path d="M0 0 L0 100 Q25 75, 50 50 Q75 25, 100 0 Z" fill="currentColor" />
            <circle cx="20" cy="20" r="3" fill="currentColor" opacity="0.6" />
            <circle cx="35" cy="10" r="2" fill="currentColor" opacity="0.4" />
            <circle cx="10" cy="35" r="2" fill="currentColor" opacity="0.4" />
          </svg>
          <svg className="absolute bottom-0 left-0 w-24 h-24 text-quarry-green-700/30 dark:text-quarry-green-50/20 -rotate-90" viewBox="0 0 100 100" fill="none">
            <path d="M0 0 L0 100 Q25 75, 50 50 Q75 25, 100 0 Z" fill="currentColor" />
            <circle cx="20" cy="20" r="3" fill="currentColor" opacity="0.6" />
            <circle cx="35" cy="10" r="2" fill="currentColor" opacity="0.4" />
            <circle cx="10" cy="35" r="2" fill="currentColor" opacity="0.4" />
          </svg>
          <svg className="absolute bottom-0 right-0 w-24 h-24 text-quarry-green-700/30 dark:text-quarry-green-50/20 rotate-180" viewBox="0 0 100 100" fill="none">
            <path d="M0 0 L0 100 Q25 75, 50 50 Q75 25, 100 0 Z" fill="currentColor" />
            <circle cx="20" cy="20" r="3" fill="currentColor" opacity="0.6" />
            <circle cx="35" cy="10" r="2" fill="currentColor" opacity="0.4" />
            <circle cx="10" cy="35" r="2" fill="currentColor" opacity="0.4" />
          </svg>

          {/* Decorative border lines */}
          <div className="absolute inset-4 border border-quarry-green-700/20 dark:border-quarry-green-50/10 rounded-2xl pointer-events-none" />
          <div className="absolute inset-6 border border-dashed border-quarry-green-700/10 dark:border-quarry-green-50/5 rounded-xl pointer-events-none" />

          <div className="relative text-center">
            {/* BETA Badge */}
            <motion.div
              animate={{
                scale: [1, 1.02, 1],
                boxShadow: [
                  '0 0 0 rgba(245,158,11,0)',
                  '0 0 30px rgba(245,158,11,0.3)',
                  '0 0 0 rgba(245,158,11,0)'
                ]
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold uppercase tracking-wider mb-4"
            >
              <Sparkles className="w-4 h-4" />
              <span>BETA Launch</span>
              <Sparkles className="w-4 h-4" />
            </motion.div>

            {/* Urgency message */}
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-6">
              We're in BETA — Buy now and lock in launch pricing forever
            </p>

            {/* Price display */}
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {/* Original price struck through */}
                <span className="text-2xl md:text-3xl text-gray-400 line-through">$199</span>
                {/* Beta price - large and prominent */}
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                  className="relative"
                >
                  <motion.span
                    animate={{
                      textShadow: [
                        '0 0 20px rgba(245,158,11,0.3)',
                        '0 0 40px rgba(245,158,11,0.5)',
                        '0 0 20px rgba(245,158,11,0.3)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-6xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent"
                    style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}
                  >
                    $99
                  </motion.span>
                  <span className="text-xl md:text-2xl text-amber-600/70 dark:text-amber-400/70 font-medium ml-2">lifetime</span>
                </motion.div>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-4">
                <span className="font-semibold text-quarry-charcoal dark:text-quarry-offwhite">Quarry Pro</span> • Pay once, yours forever
              </p>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-4 text-sm">
                <span className="px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                  <code className="font-mono">EARLYBIRD</code> → $49 (499 copies)
                </span>
                <span className="px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                  Student → $69 (.edu email)
                </span>
              </div>
            </div>

            {/* Features - Desktop focus */}
            <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-8">
              {['Windows', 'Mac', 'Linux', 'Calendar Sync', 'Free Updates'].map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-full bg-quarry-charcoal/5 dark:bg-white/5 shadow-neuro-inset-light dark:shadow-neuro-inset-dark"
                >
                  <Check className="w-4 h-4 text-quarry-green-700 dark:text-quarry-green-50" />
                  <span className="text-sm font-medium text-quarry-charcoal dark:text-quarry-offwhite">{feature}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <Link
              href="/checkout?plan=lifetime"
              className="inline-flex items-center gap-3 px-6 md:px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base md:text-lg shadow-lg hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:-translate-y-1 transition-all w-full sm:w-auto justify-center"
            >
              <span style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}>Get Pro - $99 Lifetime (Beta)</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Goes to $199 after beta. Free updates for life.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   QUICK FAQ SECTION
   ═══════════════════════════════════════════════════════════════════════════════ */

const quickFaqItems = [
  {
    question: 'Does Quarry work completely offline?',
    answer: 'Yes! All core features work 100% offline including semantic search, NLP block tagging, worthiness scoring, and the knowledge graph. Only optional AI enhancement (like Claude/OpenAI) needs internet—or run completely locally with Ollama.',
  },
  {
    question: 'What makes this different from Notion or Obsidian?',
    answer: 'Quarry auto-organizes your knowledge with NLP and AI—no manual folder structures needed. Block-level tagging with worthiness scoring, semantic search, spaced repetition flashcards, knowledge graphs, and Google Calendar sync in one app. Plus it\'s open source and works offline.',
  },
  {
    question: 'Is my data private and encrypted?',
    answer: 'Yes! All your data is encrypted with AES-256-GCM before storage—the same encryption used by banks and governments. Your encryption key is auto-generated and never leaves your device. We can\'t read your data, even if we wanted to.',
  },
  {
    question: 'What about AI and cloud features?',
    answer: 'Your data stays local by default. Block tags are generated by offline NLP heuristics. Optional AI enhancement uses chain-of-thought prompting to refine tags. When using cloud LLMs, only the specific block you\'re asking about is sent—not your entire knowledge base. You control which provider to use, or run fully local with Ollama.',
  },
  {
    question: 'What\'s the difference between Free, Pro Monthly, and Lifetime?',
    answer: 'Free ($0) has semantic search, knowledge graph, and auto-organization. Pro Monthly ($9/mo with BYOK, grandfathered forever) adds cloud sync and AI. Lifetime ($99 beta, $199 after) includes everything plus free updates forever and $3/mo cloud sync. Students get $69—email team@frame.dev from .edu.',
  },
  {
    question: 'What does "grandfathered pricing" mean?',
    answer: 'If you subscribe now, you keep your price forever—even after we raise prices. Pro Monthly at $9/mo stays $9/mo (normally $18). Lifetime at $99 beta price stays $99 even when we go to $199. Buy now and lock in launch pricing for life.',
  },
  {
    question: 'What is BYOK (Bring Your Own Keys)?',
    answer: 'BYOK means you use your own API keys from providers like OpenAI, Anthropic (Claude), or run locally with Ollama. You control AI costs directly. Pro Monthly includes cloud sync but requires BYOK for AI features.',
  },
  {
    question: 'Does Quarry sync with Google Calendar?',
    answer: 'Yes! Quarry features bidirectional Google Calendar sync. Your tasks and events sync both ways—create in Quarry and see it in Google Calendar, or add in Google and it appears in your Planner. Changes sync automatically in real-time.',
  },
  {
    question: 'What are templates and how do I use them?',
    answer: 'Templates are pre-built structures for your notes with smart form fields. Choose from 50+ templates across 8 categories—from quick notes to research documentation. Just select a template, fill in the fields, and start writing.',
  },
  {
    question: 'Can I create my own templates?',
    answer: 'Absolutely! The Template Builder lets you create custom templates with 16 field types, validation rules, conditional fields, and markdown formatting. You can also sync templates from community repositories.',
  },
  {
    question: 'How does the Kanban board work?',
    answer: 'The Planner includes a beautiful Kanban view for visual task management. Drag tasks between columns (To Do, In Progress, Done), see priority indicators, overdue alerts, and filter by status. Tasks sync with your day/week/month views.',
  },
  {
    question: 'What planner views are available?',
    answer: 'Six views: Day (vertical timeline), Week (7-day grid), Month (calendar), Agenda (list), Timeline (horizontal), and Kanban (visual boards). Switch instantly with the view switcher. All views share the same task data.',
  },
  {
    question: 'Can I import from other apps?',
    answer: 'Yes! Import from markdown files, GitHub repos, social media URLs (Reddit, Twitter, YouTube), Google Calendar, and more. Export to JSON, Markdown, or HTML. The Social Import feature auto-extracts metadata and attributions. All with source tracking.',
  },
  {
    question: 'How do I get started with tutorials?',
    answer: 'Visit the Learn section for interactive guides covering everything from your first strand to advanced template creation. Interactive tours guide you through features step-by-step with helpful tooltips and examples.',
  },
  {
    question: 'What is the Prompt Explorer?',
    answer: 'The Prompt Explorer is a visual gallery of 222 writing prompts with cover images. Browse prompts in a beautiful bento grid layout, filter by category (Creative, Reflection, Journaling, etc.), and see personalized suggestions based on your current mood.',
  },
  {
    question: 'How does the Focus Timer work?',
    answer: 'The Focus Timer features a radial dial where you can drag or click to select presets (5, 10, 15, 25, 45, 60, or 90 minutes). It includes ambient soundscapes, visual progress tracking, and syncs with your mood settings for a personalized writing session.',
  },
  {
    question: 'Does Quarry have a REST API?',
    answer: 'Yes! Quarry includes a full REST API with OpenAPI/Swagger documentation at localhost:3847/api/v1/docs. Create API tokens with automatic rotation, rate limiting (100 req/min), and complete audit logging. Build integrations, automate workflows, or access your knowledge base from other apps.',
  },
  {
    question: 'What is the Journey Timeline?',
    answer: 'The Journey Timeline is a three-panel branching view that tracks your personal growth across different life areas. Create colored branches (School, Work, Personal), add entries for key moments, and see your entire journey unfold chronologically. Think of it as a personal timeline crossed with a mind map.',
  },
  {
    question: 'How do I organize entries in the Journey view?',
    answer: 'The Journey view has three panels: Timeline (chronological list by year/month), Branches (tree visualization with colored themes), and Editor (rich content for each entry). Entries can be grouped into sections within branches, and everything syncs automatically with your strands and rituals.',
  },
  {
    question: 'What is Lifecycle Decay?',
    answer: 'Lifecycle Decay is a gentle reminder system for forgotten notes. Notes you haven\'t visited automatically fade over time, helping you focus on what matters. Nothing is ever deleted—faded notes can resurface when they become relevant again, and you control the decay rate in settings.',
  },
  {
    question: 'How does cloud sync work?',
    answer: 'Cloud sync is included with Pro Monthly ($9/mo) or available as a $3/mo add-on for Lifetime users. All data is encrypted on-device before syncing—we use zero-knowledge architecture, meaning we can\'t read your data. You can also self-host the sync service with the included repo code.',
  },
  {
    question: 'How do I backup my data?',
    answer: 'You can export your entire knowledge base as JSON, Markdown, or HTML anytime. For encryption keys, go to Settings → Security → Export Keys. We recommend keeping backups of both your data and encryption keys in a secure location.',
  },
  {
    question: 'What is block-level tagging?',
    answer: 'Block-level tagging adds granular metadata to individual headings, paragraphs, and code blocks—not just documents. An NLP pipeline auto-detects topics, calculates worthiness scores (topic shift, entity density, semantic novelty, structural importance), and suggests tags. Optional AI enhancement refines suggestions with chain-of-thought reasoning. View and filter by blocks in the Blocks tab.',
  },
  {
    question: 'How does worthiness scoring work?',
    answer: 'Worthiness scoring (0-1) prioritizes which blocks deserve tags. It combines four signals: Topic Shift (how different from previous content), Entity Density (named entities per word), Semantic Novelty (distance from document centroid), and Structural Importance (heading level, position). Blocks scoring ≥0.5 are prioritized for tagging. You can filter by worthiness in the Blocks tab.',
  },
  {
    question: 'Can I contribute to the knowledge base?',
    answer: 'Yes! Quarry uses the open-source Codex repository. You can suggest block tag improvements which generate GitHub issues or PRs. The NLP pipeline processes contributions, validates against the controlled vocabulary, and optionally enhances with AI. View the contribution guide in the Codex docs.',
  },
]

export function QuickFAQSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section
      ref={sectionRef}
      id="faq"
      className="relative py-24 md:py-32 overflow-hidden"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Common Questions
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Quick answers to the most asked questions about Quarry.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="space-y-3">
            {quickFaqItems.map((item, index) => (
              <FAQAccordionItem key={index} question={item.question} answer={item.answer} />
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/quarry/faq"
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              View all FAQs
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function FAQAccordionItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/30 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 md:p-5 text-left group"
      >
        <span className="text-sm md:text-base font-medium text-gray-800 dark:text-gray-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors pr-4">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-4 md:px-5 pb-4 md:pb-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PRICING SECTION
   3-tier pricing: Free, Pro Monthly ($9/mo BYOK), Lifetime ($99 beta)
   ═══════════════════════════════════════════════════════════════════════════════ */

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const plans = [
    {
      name: 'Free',
      badge: 'Open Source',
      price: '$0',
      period: 'forever',
      description: 'Local-first knowledge base with full offline power.',
      features: [
        'Semantic search & knowledge graph',
        'Auto-tagging & categorization',
        'All 6 themes',
        'Desktop & web apps',
        'ZIP export/import',
        'Self-host option',
        'MIT licensed',
      ],
      limitations: [
        'No cloud sync',
        'No AI features',
      ],
      cta: 'Get Started Free',
      href: 'https://github.com/framersai/quarry',
      highlighted: false,
      tier: 'free' as const,
    },
    {
      name: 'Pro Monthly',
      badge: 'BYOK',
      price: '$9',
      period: '/month',
      description: 'Cloud sync included. Bring Your Own Keys for AI.',
      grandfatheredNote: 'Subscribe now = $9/mo FOREVER (goes to $18 after launch)',
      features: [
        'Everything in Free',
        'Cloud sync included',
        'Google Calendar sync',
        'BYOK for AI (Claude, OpenAI, Ollama)',
        'Windows, Mac, Linux apps',
        'iOS & Android apps',
        'Web access',
        'Priority support',
      ],
      limitations: [
        'BYOK required for AI',
      ],
      cta: 'Subscribe - $9/month',
      href: '/checkout?plan=monthly',
      highlighted: false,
      tier: 'monthly' as const,
    },
    {
      name: 'Lifetime',
      badge: 'Best Value',
      price: '$99',
      originalPrice: '$199',
      period: 'beta price',
      description: 'Pay once, yours forever. All updates included for life.',
      betaNote: 'Goes to $199 after beta. Free updates forever.',
      features: [
        'Everything in Free',
        'All updates free forever',
        'Windows, Mac, Linux apps',
        'iOS, Android, Web access',
        'Google Calendar sync',
        'Team features (coming free)',
        'Cloud sync: $3/mo (vs $9)',
        'Self-host sync option',
        'Learning Studio',
        'AI Q&A with citations',
        'FSRS flashcards',
        'Quiz generation',
        'Priority support',
      ],
      aiFeatures: ['Learning Studio', 'AI Q&A with citations', 'FSRS flashcards', 'Quiz generation'],
      cta: 'Get Lifetime - $99',
      href: '/checkout?plan=lifetime',
      highlighted: true,
      tier: 'lifetime' as const,
    },
  ]

  return (
    <section ref={sectionRef} id="pricing" className="relative py-24 px-4 overflow-hidden">
      {/* Vertical strands background for structured pricing */}
      <FabricBackground variant="vertical" opacity={0.04} />
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1 mb-4 text-xs font-bold uppercase tracking-wider rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            BETA PRICING
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Simple <span className="text-emerald-500">Pricing</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Start free, upgrade when you need cloud sync and AI features.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1 }}
              className={`
                relative p-6 md:p-8 rounded-2xl border-2 transition-all flex flex-col
                ${plan.highlighted
                  ? 'border-emerald-500 bg-gradient-to-b from-emerald-500/5 to-emerald-500/10 dark:from-emerald-500/10 dark:to-emerald-500/5 shadow-lg shadow-emerald-500/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }
              `}
            >
              {/* Badge */}
              <div className="absolute -top-3 left-6">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  plan.highlighted
                    ? 'bg-emerald-500 text-white'
                    : plan.tier === 'monthly'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {plan.badge}
                </span>
              </div>

              {/* Lifetime crown icon */}
              {plan.tier === 'lifetime' && (
                <div className="absolute -top-3 right-6">
                  <span className="px-2 py-1 rounded-full text-xs bg-amber-400 text-amber-900">
                    <Crown className="w-3 h-3 inline" />
                  </span>
                </div>
              )}

              <div className="mb-6 pt-4">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 flex-wrap">
                  {'originalPrice' in plan && plan.originalPrice && (
                    <span className="text-lg text-gray-400 line-through mr-1">{plan.originalPrice}</span>
                  )}
                  <span className={`text-4xl md:text-5xl font-bold ${
                    plan.tier === 'lifetime'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent'
                      : plan.tier === 'monthly'
                      ? 'text-blue-500'
                      : 'text-emerald-500'
                  }`}>
                    {plan.price}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    {plan.period}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">{plan.description}</p>
                {'grandfatheredNote' in plan && plan.grandfatheredNote && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                    {plan.grandfatheredNote}
                  </p>
                )}
                {'betaNote' in plan && plan.betaNote && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                    {plan.betaNote}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 md:space-y-3 mb-6 flex-1">
                {plan.features.map((f, j) => {
                  const isAiFeature = 'aiFeatures' in plan && plan.aiFeatures?.includes(f)
                  return (
                    <li key={j} className={`flex items-start gap-2 text-sm ${
                      isAiFeature
                        ? 'text-amber-600 dark:text-amber-400 font-medium'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                        isAiFeature ? 'text-amber-500' : 'text-emerald-500'
                      }`} />
                      <span>{f}</span>
                      {isAiFeature && <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                    </li>
                  )
                })}
              </ul>

              {/* Limitations */}
              {'limitations' in plan && plan.limitations && plan.limitations.length > 0 && (
                <ul className="space-y-2 mb-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {plan.limitations.map((l, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                      <X className="w-4 h-4 flex-shrink-0" />
                      {l}
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href={plan.href}
                target={plan.tier === 'free' ? '_blank' : undefined}
                rel={plan.tier === 'free' ? 'noopener noreferrer' : undefined}
                className={`
                  block w-full py-3 rounded-xl text-center font-semibold transition-all mt-auto
                  ${plan.tier === 'lifetime'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25'
                    : plan.tier === 'monthly'
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Promo codes & callouts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center space-y-4"
        >
          {/* Launch promo codes */}
          <div className="inline-flex flex-wrap justify-center gap-2 sm:gap-3 text-sm">
            <span className="px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
              <code className="font-mono">EARLYBIRD</code> → $49 (499 copies)
            </span>
            <span className="px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
              Student → $69 lifetime
            </span>
          </div>

          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            Student? Email{' '}
            <Link href="mailto:team@frame.dev?subject=Student%20Discount" className="text-emerald-500 hover:text-emerald-600 font-medium">
              team@frame.dev
            </Link>{' '}
            from your .edu address
          </p>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            Need team features or enterprise?{' '}
            <Link href="mailto:team@frame.dev?subject=Enterprise%20Inquiry" className="text-emerald-500 hover:text-emerald-600 font-medium">
              Contact us
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════════════════════════════════════════ */

export function FinalCTASection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section ref={sectionRef} className="py-32 px-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px]" />
      </div>
      
      {/* Mouse-following floating elements */}
      <FloatingElements variant="cta" opacity={0.5} mouseParallax parallaxIntensity={0.02} />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Animated CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="flex flex-col sm:flex-row gap-6 justify-center items-center"
        >
          {/* Community Edition Button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative group"
          >
            {/* Animated border gradient */}
            <motion.div
              className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-gray-400 via-gray-500 to-gray-400 opacity-50 group-hover:opacity-75 blur-sm transition-opacity"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{ backgroundSize: '200% 200%' }}
            />
            <Link
              href="https://github.com/framersai/codex"
              target="_blank"
              rel="noopener noreferrer"
              className="relative flex flex-col items-center gap-2 px-10 py-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <Github className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">Community Edition</span>
              </div>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Free Forever</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">MIT Licensed • Open Source</span>
              <motion.div
                className="mt-2 flex items-center gap-2 text-gray-600 dark:text-gray-300"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span className="text-sm font-medium">View on GitHub</span>
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            </Link>
          </motion.div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-32 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
          <div className="block sm:hidden h-px w-32 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />

          {/* Premium Edition Button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative group"
          >
            {/* Animated shimmer border */}
            <motion.div
              className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-75 group-hover:opacity-100 blur-md transition-opacity"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{ backgroundSize: '200% 200%' }}
            />
            {/* Inner glow pulse */}
            <motion.div
              className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-emerald-500/50 to-cyan-500/50 blur-xl"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [0.98, 1.02, 0.98],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <Link
              href="#pricing"
              className="relative flex flex-col items-center gap-2 px-10 py-6 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-2xl shadow-emerald-500/30"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-6 h-6 text-white" />
                </motion.div>
                <span className="text-xl font-bold text-white">Premium Edition</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">$199</span>
                <span className="text-sm text-white/80">Lifetime</span>
              </div>
              <div className="flex gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs text-white font-medium">$99 Launch</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs text-white font-medium">$69 Students</span>
              </div>
              <motion.div
                className="mt-2 flex items-center gap-2 text-white font-medium"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span>Get Lifetime Access</span>
                <ArrowRight className="w-4 h-4" />
              </motion.div>
              {/* Floating particles */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-white/60"
                    style={{
                      left: `${15 + i * 15}%`,
                      bottom: '10%',
                    }}
                    animate={{
                      y: [0, -40, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 2 + i * 0.3,
                      repeat: Infinity,
                      delay: i * 0.4,
                    }}
                  />
                ))}
              </div>
            </Link>
          </motion.div>
        </motion.div>

        {/* Bottom info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.4 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-gray-500 dark:text-gray-400"
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>No subscription required</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Lifetime updates included</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Discord community access</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TUTORIAL SECTION
   Interactive guided tours
   ═══════════════════════════════════════════════════════════════════════════════ */

const tutorialItems = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of navigating your knowledge base',
    icon: Play,
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
    title: 'Auto-Tagging',
    description: 'Tags generated automatically — zero manual effort',
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
    icon: FileText,
    color: 'teal',
  },
  {
    id: 'import-export',
    title: 'Import & Export',
    description: 'Bring in notes or back up your data',
    icon: Database,
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

const tutorialColorClasses: Record<string, { bg: string; text: string; border: string; glow: string }> = {
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
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleToggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

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
            Click any topic to see detailed steps. Master every feature at your own pace.
          </p>
        </motion.div>

        {/* Tutorial Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tutorialItems.map((tutorial, i) => {
            const Icon = tutorial.icon
            const colors = tutorialColorClasses[tutorial.color]
            const isExpanded = expandedId === tutorial.id
            const tutorialData = TUTORIALS[tutorial.id as keyof typeof TUTORIALS]

            return (
              <motion.div
                key={tutorial.id}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                layout
                className={isExpanded ? 'col-span-1 sm:col-span-2 lg:col-span-4' : ''}
              >
                <motion.button
                  onClick={() => handleToggle(tutorial.id)}
                  layout
                  className={`
                    group w-full text-left p-6 rounded-2xl border transition-all duration-300
                    bg-white dark:bg-gray-900/80 backdrop-blur-sm
                    ${colors.border} ${colors.glow}
                    ${isExpanded ? 'shadow-xl' : 'hover:shadow-lg hover:-translate-y-1'}
                  `}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Icon */}
                      <div
                        className={`
                          inline-flex p-3 rounded-xl mb-4 transition-transform
                          ${colors.bg} ${!isExpanded && 'group-hover:scale-110'}
                        `}
                      >
                        <Icon className={`w-6 h-6 ${colors.text}`} />
                      </div>

                      {/* Content */}
                      <h3 className={`font-semibold text-gray-900 dark:text-white mb-2 transition-colors ${!isExpanded && 'group-hover:text-emerald-500'}`}>
                        {tutorial.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {tutorial.description}
                      </p>
                    </div>

                    {/* Expand/Collapse indicator */}
                    <div className={`p-2 rounded-lg transition-colors ${colors.bg}`}>
                      {isExpanded ? (
                        <ChevronUp className={`w-5 h-5 ${colors.text}`} />
                      ) : (
                        <ChevronDown className={`w-5 h-5 ${colors.text}`} />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content - Tutorial Steps */}
                  <AnimatePresence>
                    {isExpanded && tutorialData && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {tutorialData.steps.map((step, stepIndex) => (
                              <div
                                key={step.id}
                                className="flex gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                              >
                                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${colors.bg} ${colors.text}`}>
                                  {stepIndex + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                                    {step.title}
                                  </h3>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {step.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Try in App CTA */}
                          <div className="mt-6 flex justify-center">
                            <Link
                              href="/quarry/app"
                              onClick={(e) => e.stopPropagation()}
                              className={`
                                inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                                bg-gradient-to-r from-emerald-500 to-teal-500 text-white
                                hover:from-emerald-600 hover:to-teal-600 transition-all
                                shadow-md hover:shadow-lg
                              `}
                            >
                              <Play className="w-4 h-4" />
                              Try in Quarry
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
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
            href="/quarry/app"
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

/* ═══════════════════════════════════════════════════════════════════════════════
   RESEARCH SHOWCASE SECTION
   Academic research tools: search providers, citations, AI summarization
   ═══════════════════════════════════════════════════════════════════════════════ */

import { CitationDemo } from './CitationDemo'

const searchProviders = [
  { name: 'Brave', color: 'orange', free: '2K/mo' },
  { name: 'Semantic Scholar', color: 'blue', free: 'Free' },
  { name: 'DuckDuckGo', color: 'red', free: 'Free' },
  { name: 'Serper', color: 'purple', free: '2.5K' },
]

const researchFeatures = [
  {
    title: 'Multi-Provider Search',
    description: 'Fallback chain across Brave, Semantic Scholar, DuckDuckGo, and more',
    icon: Search,
    color: 'emerald',
  },
  {
    title: 'Academic Detection',
    description: 'Auto-detects arXiv, DOI, PubMed and enriches with citation data',
    icon: GraduationCap,
    color: 'blue',
  },
  {
    title: 'AI Summarization',
    description: 'Digest, abstract, key-points, and comparison modes with streaming',
    icon: Sparkles,
    color: 'purple',
  },
  {
    title: 'Session Linking',
    description: 'Tag, link, and merge research sessions with suggestions',
    icon: Link2,
    color: 'teal',
  },
]

export function ResearchShowcaseSection() {
  const resolvePath = useQuarryPath()
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section
      ref={sectionRef}
      id="research"
      className="relative py-24 px-4 bg-gradient-to-b from-blue-50/15 via-gray-50/30 to-gray-100/35 dark:from-blue-950/15 dark:via-gray-900/30 dark:to-gray-800/35 overflow-hidden"
    >
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
        <div className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/10 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-quarry-charcoal dark:text-quarry-offwhite mb-4">
            Research-grade{' '}
            <span className="text-blue-600 dark:text-blue-400">citation management</span>
          </h2>

          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Built for academics and lifelong learners. Multi-source search, 9 citation styles,
            AI summarization, and intelligent session linking.
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Features + Providers */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            {/* Feature Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {researchFeatures.map((feature, i) => {
                const Icon = feature.icon
                const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
                  emerald: {
                    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
                    text: 'text-emerald-600 dark:text-emerald-400',
                    border: 'border-emerald-200 dark:border-emerald-800/50',
                  },
                  blue: {
                    bg: 'bg-blue-100 dark:bg-blue-900/30',
                    text: 'text-blue-600 dark:text-blue-400',
                    border: 'border-blue-200 dark:border-blue-800/50',
                  },
                  purple: {
                    bg: 'bg-purple-100 dark:bg-purple-900/30',
                    text: 'text-purple-600 dark:text-purple-400',
                    border: 'border-purple-200 dark:border-purple-800/50',
                  },
                  teal: {
                    bg: 'bg-teal-100 dark:bg-teal-900/30',
                    text: 'text-teal-600 dark:text-teal-400',
                    border: 'border-teal-200 dark:border-teal-800/50',
                  },
                }
                const colors = colorClasses[feature.color]

                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                    className={`p-5 rounded-xl border ${colors.border} bg-white dark:bg-gray-800/50 hover:shadow-lg transition-shadow`}
                  >
                    <div className={`inline-flex p-2.5 rounded-lg ${colors.bg} mb-3`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </motion.div>
                )
              })}
            </div>

            {/* Search Provider Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50"
            >
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                Search Providers
              </p>
              <div className="flex flex-wrap gap-2">
                {searchProviders.map((provider) => {
                  const bgColors: Record<string, string> = {
                    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
                    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
                    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
                  }
                  return (
                    <div
                      key={provider.name}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${bgColors[provider.color]}`}
                    >
                      <span className="font-medium">{provider.name}</span>
                      <span className="text-xs opacity-75">{provider.free}</span>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Auto-fallback chain ensures results even without API keys
              </p>
            </motion.div>

            {/* Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="grid grid-cols-3 gap-4"
            >
              <div className="text-center p-4 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">18+</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Academic Domains</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">9</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Citation Styles</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">5</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Summary Types</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Citation Demo */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <CitationDemo />

            {/* AI Summary Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="mt-6 p-5 rounded-xl border border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800/50"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">AI Summarization</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Digest', 'Abstract', 'Key Points', 'Compare', 'Executive'].map((type) => (
                  <span
                    key={type}
                    className="px-2.5 py-1 rounded-md bg-white dark:bg-gray-700 border border-purple-200 dark:border-purple-700 text-xs text-gray-700 dark:text-gray-300"
                  >
                    {type}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                Stream summaries with Claude or OpenAI. Results cached for 24 hours.
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 1 }}
          className="mt-16 text-center"
        >
          <Link
            href={resolvePath('/quarry/research')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            <Search className="w-4 h-4" />
            <span>Try Research Tools</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DIVIDER
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Neumorphic Divider
 * Organic flowing section separator with subtle glow and depth
 */
export function Divider({ variant = 'flow' }: { variant?: 'flow' | 'orb' | 'diamond' | 'inset' }) {
  if (variant === 'orb') {
    return (
      <div className="neo-divider my-8 sm:my-12">
        <div className="neo-divider-orb" />
      </div>
    )
  }
  
  if (variant === 'diamond') {
    return (
      <div className="neo-divider-diamond my-8 sm:my-12">
        <div className="diamond" />
      </div>
    )
  }
  
  if (variant === 'inset') {
    return (
      <div className="neo-divider-inset my-6 sm:my-10" />
    )
  }
  
  // Default: flowing gradient
  return (
    <div className="neo-divider-flow my-8 sm:my-16" />
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TEMPLATE SHOWCASE SECTION
   Highlights template system with category cards and interactive preview
   ═══════════════════════════════════════════════════════════════════════════════ */

const templateCategories = [
  { id: 'general', name: 'General', icon: FileText, color: 'cyan', count: 6, desc: 'Notes, checklists, trackers' },
  { id: 'technical', name: 'Technical', icon: Code2, color: 'blue', desc: 'Docs, tutorials, references' },
  { id: 'creative', name: 'Creative', icon: PenTool, color: 'purple', desc: 'Stories, characters, worlds' },
  { id: 'personal', name: 'Personal', icon: Users, color: 'rose', desc: 'Journals, goals, habits' },
  { id: 'business', name: 'Business', icon: Building2, color: 'amber', desc: 'Meetings, plans, cases' },
  { id: 'learning', name: 'Learning', icon: GraduationCap, color: 'emerald', desc: 'Study notes, flashcards' },
  { id: 'lifestyle', name: 'Lifestyle', icon: Calendar, color: 'orange', desc: 'Recipes, workouts, travel' },
  { id: 'research', name: 'Research', icon: Search, color: 'indigo', desc: 'Literature, experiments' },
]

const templateHighlights = [
  { icon: Zap, text: 'One-click creation from 50+ templates' },
  { icon: Layers, text: 'Smart field types with validation' },
  { icon: Cloud, text: 'Sync from community template repos' },
  { icon: PenTool, text: 'Build your own custom templates' },
]

export function TemplateShowcaseSection() {
  const resolvePath = useQuarryPath()
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  const categoryColors: Record<string, string> = {
    cyan: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    rose: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  }

  return (
    <section
      ref={sectionRef}
      id="templates"
      className="relative py-24 px-4 overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg className="absolute -top-20 -right-20 w-80 h-80 text-cyan-500/5 dark:text-cyan-400/5" viewBox="0 0 200 200">
          <defs>
            <pattern id="template-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="1" height="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="200" height="200" fill="url(#template-grid)" />
        </svg>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gradient-to-t from-cyan-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-sm font-medium mb-6">
            <FileText className="w-4 h-4" />
            Template Library
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Start with{' '}
            <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              50+ Templates
            </span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            From quick notes to complex research documentation. Every template includes
            smart fields, validation, and beautiful formatting.
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Category Cards */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Browse by Category
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {templateCategories.map((cat, i) => {
                const Icon = cat.icon
                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.05 }}
                    className={`p-4 rounded-xl border ${categoryColors[cat.color]} hover:scale-[1.02] transition-transform cursor-pointer`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <div>
                        <p className="font-medium">{cat.name}</p>
                        <p className="text-xs opacity-75">{cat.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Highlights */}
            <div className="mt-8 p-5 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wide">
                Template Features
              </p>
              <div className="space-y-3">
                {templateHighlights.map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                      <Icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      <span className="text-sm">{item.text}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>

          {/* Right: Template Preview Demo */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-6"
          >
            {/* Mock Template Card */}
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 shadow-lg">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-base">Tutorial Guide</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                      Featured
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Step-by-step guide with learning objectives and exercises
                  </p>
                </div>
              </div>

              {/* Form Fields Preview */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Title</span>
                  <span className="ml-auto text-xs text-gray-400">text</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Difficulty</span>
                  <span className="ml-auto text-xs text-gray-400">select</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Prerequisites</span>
                  <span className="ml-auto text-xs text-gray-400">tags</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  education
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  structured
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  beginner-friendly
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">50+</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Templates</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">8</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Categories</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">16</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Field Types</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <Link
            href={resolvePath('/quarry/new')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            <FileText className="w-4 h-4" />
            <span>Explore Templates</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   API SHOWCASE SECTION
   REST API with OpenAPI documentation and Swagger UI
   ═══════════════════════════════════════════════════════════════════════════════ */

export function APIShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })
  // Initialize with absolute URL to avoid 404 on quarry.space domain
  const [screenshotSrc, setScreenshotSrc] = useState('https://frame.dev/screenshots/api-docs-swagger.svg')
  
  // Handle cross-domain asset loading - use relative path on frame.dev for better caching
  useEffect(() => {
    if (typeof window !== 'undefined' && !isQuarryDomain()) {
      setScreenshotSrc('/screenshots/api-docs-swagger.svg')
    }
  }, [])

  const apiFeatures = [
    {
      icon: FileJson,
      title: 'OpenAPI 3.1',
      desc: 'Auto-generated Swagger UI docs',
      color: 'sky'
    },
    {
      icon: Key,
      title: 'Token Auth',
      desc: 'Secure API keys with usage tracking',
      color: 'emerald'
    },
    {
      icon: ScrollText,
      title: 'Audit Logging',
      desc: 'Track all API access and events',
      color: 'violet'
    }
  ]

  const colorMap: Record<string, string> = {
    sky: 'bg-sky-500/10 text-sky-500 dark:text-sky-400',
    emerald: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
    violet: 'bg-violet-500/10 text-violet-500 dark:text-violet-400'
  }

  return (
    <section ref={sectionRef} id="api" className="py-24 px-4 bg-gradient-to-b from-gray-100/35 via-gray-50/30 to-transparent dark:from-gray-800/35 dark:via-gray-900/30 dark:to-transparent relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1 mb-4 text-xs font-medium tracking-wider uppercase rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            Developer API
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-quarry-charcoal dark:text-quarry-offwhite mb-4">
            REST API & Developer Access
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Other apps can integrate with your knowledge base via our full-featured REST API with OpenAPI documentation.
          </p>
        </motion.div>

        {/* Screenshot Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12 rounded-2xl overflow-hidden border border-gray-200/50 dark:border-white/10 shadow-2xl shadow-sky-500/10 dark:shadow-sky-500/5"
        >
          <div className="relative aspect-[16/9] bg-gray-100 dark:bg-gray-800">
            <Image
              src={screenshotSrc}
              alt="Quarry REST API - Swagger UI Documentation"
              fill
              className="object-contain"
              priority
              unoptimized={screenshotSrc.startsWith('https://')}
            />
            {/* Fallback gradient if image doesn't exist */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-violet-500/5 pointer-events-none" />
          </div>
        </motion.div>

        {/* Feature Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {apiFeatures.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="p-6 rounded-2xl bg-white dark:bg-quarry-charcoal-deep border border-gray-200/50 dark:border-white/5 shadow-neuro-sm-light dark:shadow-neuro-sm-dark hover:shadow-neuro-light dark:hover:shadow-neuro-dark transition-all duration-300"
              >
                <div className={`inline-flex p-3 rounded-xl ${colorMap[feature.color]} mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg text-quarry-charcoal dark:text-quarry-offwhite mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.desc}
                </p>
              </motion.div>
            )
          })}
        </motion.div>

        {/* API Endpoints Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 p-6 rounded-2xl bg-gray-900 dark:bg-gray-950 border border-gray-800"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-4 text-gray-400 text-sm font-mono">API Endpoints</span>
          </div>
          <div className="font-mono text-sm space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">GET</span>
              <span className="text-gray-300">/api/v1/strands</span>
              <span className="text-gray-500 ml-auto">List all strands</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-xs font-bold">POST</span>
              <span className="text-gray-300">/api/v1/generate/flashcards</span>
              <span className="text-gray-500 ml-auto">AI flashcard generation</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">GET</span>
              <span className="text-gray-300">/api/v1/search</span>
              <span className="text-gray-500 ml-auto">Full-text search</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">GET</span>
              <span className="text-gray-300">/api/v1/audit/api</span>
              <span className="text-gray-500 ml-auto">API audit events</span>
            </div>
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-12 text-center"
        >
          <a
            href="http://localhost:3847/api/v1/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            <FileJson className="w-4 h-4" />
            <span>View API Documentation</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
