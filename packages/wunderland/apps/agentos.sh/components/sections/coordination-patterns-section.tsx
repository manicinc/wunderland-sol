'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GitMerge, GitBranch, Users, ArrowRight, Check, Sparkles } from 'lucide-react'

type CoordinationPattern = 'sequential' | 'parallel' | 'consensus'

interface PatternInfo {
  id: CoordinationPattern
  name: string
  tagline: string
  description: string
  icon: React.ElementType
  gradient: string
  useCase: string
  outcome: string
  steps: string[]
}

const patterns: PatternInfo[] = [
  {
    id: 'sequential',
    name: 'Sequential Coordination',
    tagline: 'Build on each step',
    description: 'Agents build on each other\'s work in a deterministic chain. Perfect for workflows where each stage depends on the previous output.',
    icon: GitMerge,
    gradient: 'from-blue-500 to-cyan-500',
    useCase: 'Research → Analysis → Draft → Review pipeline',
    outcome: 'Each agent refines the prior result; context flows forward with full lineage.',
    steps: [
      'Researcher gathers sources',
      'Analyst extracts key insights',
      'Creator drafts the article',
      'Critic reviews and flags issues',
      'Final output synthesized'
    ]
  },
  {
    id: 'parallel',
    name: 'Parallel Coordination',
    tagline: 'Work simultaneously',
    description: 'Agents work on decomposed subtasks simultaneously, then merge results. Ideal for independent workstreams that can run concurrently.',
    icon: GitBranch,
    gradient: 'from-purple-500 to-pink-500',
    useCase: 'Multi-source data ingestion + processing',
    outcome: 'All agents execute at once; orchestrator merges outputs with conflict resolution.',
    steps: [
      'Task decomposed into subtasks',
      'Agents assigned in parallel',
      'Each agent processes independently',
      'Results merged with deduplication',
      'Unified output delivered'
    ]
  },
  {
    id: 'consensus',
    name: 'Consensus Coordination',
    tagline: 'Reach agreement',
    description: 'Agents propose solutions and iteratively converge on consensus. Best for decisions requiring multiple perspectives and validation.',
    icon: Users,
    gradient: 'from-green-500 to-emerald-500',
    useCase: 'Policy decisions, content moderation, strategic planning',
    outcome: 'Agents debate proposals across rounds; consensus emerges or arbitrator decides.',
    steps: [
      'Each agent proposes a solution',
      'Proposals evaluated collectively',
      'Agents refine based on feedback',
      'Consensus threshold checked',
      'Final decision or arbitration'
    ]
  }
]

export function CoordinationPatternsSection() {
  const [activePattern, setActivePattern] = useState<CoordinationPattern>('sequential')
  const active = patterns.find(p => p.id === activePattern)!

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-background-secondary" aria-labelledby="coordination-heading">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, var(--color-accent-primary) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 id="coordination-heading" className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="gradient-text">Coordination Patterns</span>
          </h2>
          <p className="text-lg text-text-muted max-w-3xl mx-auto">
            Choose the right collaboration strategy for your use case. AgentOS supports sequential, parallel, and consensus patterns out of the box.
          </p>
        </motion.div>

        {/* Pattern Selector */}
        <div className="flex justify-center mb-10 overflow-x-auto">
          <div className="inline-flex gap-2 p-1 glass-morphism rounded-2xl min-w-min">
            {patterns.map((pattern) => {
              const Icon = pattern.icon
              return (
                <button
                  key={pattern.id}
                  onClick={() => setActivePattern(pattern.id)}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all duration-[var(--duration-smooth)] text-sm whitespace-nowrap ${
                    activePattern === pattern.id
                      ? `bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-[var(--color-text-on-accent)] shadow-lg shadow-[var(--color-accent-primary)]/20`
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-elevated)] border border-transparent hover:border-[var(--color-border-subtle)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{pattern.name}</span>
                  <span className="sm:hidden">{pattern.tagline}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Pattern Details */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePattern}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid lg:grid-cols-2 gap-8"
          >
            {/* Left: Description & Use Case */}
            <div className="space-y-6">
              <div className="surface-card p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${active.gradient} text-white shadow-lg`}>
                    <active.icon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-text-primary mb-2">{active.name}</h3>
                    <p className="text-sm text-text-muted italic">{active.tagline}</p>
                  </div>
                </div>
                <p className="text-text-secondary leading-relaxed mb-6">
                  {active.description}
                </p>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">Use Case</p>
                    <p className="text-base font-semibold text-text-primary">{active.useCase}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">Outcome</p>
                    <p className="text-sm text-text-secondary leading-relaxed">{active.outcome}</p>
                  </div>
                </div>
              </div>

              <div className="surface-card p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-4">Execution Steps</p>
                <ol className="space-y-3">
                  {active.steps.map((step, i) => (
                    <motion.li
                      key={step}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary text-white text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-sm text-text-secondary pt-0.5">{step}</span>
                    </motion.li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Right: Visual Diagram */}
            <div className="surface-card p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePattern}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="h-full flex items-center justify-center"
                >
                  {activePattern === 'sequential' && <SequentialDiagram />}
                  {activePattern === 'parallel' && <ParallelDiagram />}
                  {activePattern === 'consensus' && <ConsensusDiagram />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Emergent Intelligence Callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 rounded-3xl bg-gradient-to-br from-accent-primary/10 via-accent-secondary/10 to-[color:var(--color-accent-warm)]/10 border border-accent-primary/20 p-8 md:p-12"
        >
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 p-4 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary text-white shadow-lg">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-text-primary mb-3">Emergent Intelligence</h3>
              <p className="text-text-secondary leading-relaxed mb-4">
                When multiple GMIs collaborate, they produce <span className="font-semibold text-accent-primary">emergent intelligence</span>—insights 
                and solutions beyond what any single agent could achieve. AgentOS tracks cognitive emergence, creative breakthroughs, 
                and collective synergy across every coordination pattern.
              </p>
              <ul className="grid md:grid-cols-2 gap-3 text-sm text-text-secondary">
                {[
                  'Cognitive emergence: Novel understanding from agent debate',
                  'Creative emergence: Solutions no single agent proposed',
                  'Collective intelligence: Beyond individual capability',
                  'Synergy metrics: Measure multiplicative effects'
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-accent-primary flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <a
            href="https://docs.agentos.sh/coordination"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-[var(--color-text-on-accent)] shadow-lg shadow-[var(--color-accent-primary)]/20 hover:shadow-xl hover:brightness-110 transition-all duration-[var(--duration-fast)]"
          >
            Explore Coordination Docs
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}

function SequentialDiagram() {
  return (
    <svg viewBox="0 0 400 500" className="w-full h-full max-w-md mx-auto">
      <defs>
        <linearGradient id="seq-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--color-accent-primary)" />
          <stop offset="100%" stopColor="var(--color-accent-secondary)" />
        </linearGradient>
        <marker id="arrow-seq" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--color-accent-primary)" />
        </marker>
      </defs>

      {/* Agents in sequence */}
      {['Researcher', 'Analyst', 'Creator', 'Critic'].map((name, i) => (
        <g key={name}>
          <motion.rect
            x="100"
            y={80 + i * 100}
            width="200"
            height="60"
            rx="12"
            fill="var(--color-background-primary)"
            stroke="url(#seq-gradient)"
            strokeWidth="2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15, duration: 0.5 }}
          />
          <text x="200" y={110 + i * 100} textAnchor="middle" className="fill-text-primary font-semibold text-sm">
            {name}
          </text>

          {/* Arrow to next */}
          {i < 3 && (
            <motion.line
              x1="200"
              y1={140 + i * 100}
              x2="200"
              y2={80 + (i + 1) * 100}
              stroke="url(#seq-gradient)"
              strokeWidth="2"
              markerEnd="url(#arrow-seq)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: i * 0.15 + 0.3, duration: 0.4 }}
            />
          )}

          {/* Context label */}
          <motion.text
            x="320"
            y={110 + i * 100}
            className="fill-text-muted text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.15 + 0.5 }}
          >
            Context {i + 1}
          </motion.text>
        </g>
      ))}
    </svg>
  )
}

function ParallelDiagram() {
  return (
    <svg viewBox="0 0 400 500" className="w-full h-full max-w-md mx-auto">
      <defs>
        <linearGradient id="par-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--color-accent-primary)" />
          <stop offset="100%" stopColor="var(--color-accent-secondary)" />
        </linearGradient>
        <marker id="arrow-par" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--color-accent-primary)" />
        </marker>
      </defs>

      {/* Orchestrator at top */}
      <motion.rect
        x="125"
        y="40"
        width="150"
        height="60"
        rx="12"
        fill="var(--color-background-primary)"
        stroke="url(#par-gradient)"
        strokeWidth="2"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      />
      <text x="200" y="75" textAnchor="middle" className="fill-text-primary font-semibold text-sm">
        Orchestrator
      </text>

      {/* Parallel agents */}
      {['Researcher', 'Analyst', 'Creator', 'Executor'].map((name, i) => {
        const x = 50 + i * 80
        return (
          <g key={name}>
            <motion.line
              x1="200"
              y1="100"
              x2={x + 40}
              y2="200"
              stroke="url(#par-gradient)"
              strokeWidth="2"
              markerEnd="url(#arrow-par)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
            />

            <motion.rect
              x={x}
              y="200"
              width="80"
              height="60"
              rx="10"
              fill="var(--color-background-primary)"
              stroke="var(--color-border-primary)"
              strokeWidth="2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
            />
            <text x={x + 40} y="235" textAnchor="middle" className="fill-text-primary font-semibold text-xs">
              {name}
            </text>

            {/* Return arrow */}
            <motion.line
              x1={x + 40}
              y1="260"
              x2="200"
              y2="360"
              stroke="var(--color-accent-secondary)"
              strokeWidth="1.5"
              strokeDasharray="4,4"
              markerEnd="url(#arrow-par)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 1.5 + i * 0.1, duration: 0.4 }}
            />
          </g>
        )
      })}

      {/* Merge node */}
      <motion.rect
        x="125"
        y="360"
        width="150"
        height="60"
        rx="12"
        fill="var(--color-background-primary)"
        stroke="url(#par-gradient)"
        strokeWidth="2"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2, duration: 0.5 }}
      />
      <text x="200" y="395" textAnchor="middle" className="fill-text-primary font-semibold text-sm">
        Merged Result
      </text>
    </svg>
  )
}

function ConsensusDiagram() {
  return (
    <svg viewBox="0 0 400 500" className="w-full h-full max-w-md mx-auto">
      <defs>
        <linearGradient id="con-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-accent-primary)" />
          <stop offset="100%" stopColor="var(--color-accent-secondary)" />
        </linearGradient>
      </defs>

      {/* Central consensus node */}
      <motion.circle
        cx="200"
        cy="250"
        r="60"
        fill="var(--color-background-primary)"
        stroke="url(#con-gradient)"
        strokeWidth="3"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6 }}
      />
      <text x="200" y="245" textAnchor="middle" className="fill-text-primary font-semibold text-sm">
        Consensus
      </text>
      <text x="200" y="265" textAnchor="middle" className="fill-text-muted text-xs">
        Round 1-N
      </text>

      {/* Surrounding agents */}
      {['Agent 1', 'Agent 2', 'Agent 3', 'Agent 4', 'Agent 5'].map((name, i) => {
        const angle = (i / 5) * 2 * Math.PI - Math.PI / 2
        const x = 200 + 140 * Math.cos(angle)
        const y = 250 + 140 * Math.sin(angle)

        return (
          <g key={name}>
            {/* Bidirectional arrows */}
            <motion.line
              x1="200"
              y1="250"
              x2={x}
              y2={y}
              stroke="var(--color-accent-primary)"
              strokeWidth="1.5"
              strokeDasharray="4,4"
              opacity="0.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 1, 0] }}
              transition={{ delay: i * 0.2, duration: 2, repeat: Infinity, ease: 'linear' }}
            />

            <motion.circle
              cx={x}
              cy={y}
              r="35"
              fill="var(--color-background-primary)"
              stroke="var(--color-border-primary)"
              strokeWidth="2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
            />
            <text x={x} y={y + 5} textAnchor="middle" className="fill-text-primary font-semibold text-xs">
              {name}
            </text>
          </g>
        )
      })}

      {/* Proposal indicators */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * 2 * Math.PI - Math.PI / 2
        const x = 200 + 140 * Math.cos(angle)
        const y = 250 + 140 * Math.sin(angle)
        return (
          <motion.circle
            key={`prop-${i}`}
            cx={x}
            cy={y}
            r="4"
            fill="var(--color-accent-primary)"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.5, 0] }}
            transition={{ delay: 1 + i * 0.3, duration: 1.5, repeat: Infinity }}
          />
        )
      })}
    </svg>
  )
}

