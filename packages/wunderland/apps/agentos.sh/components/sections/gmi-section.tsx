'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Network, GitBranch, Cpu, Activity, Code, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function GMISection() {
  const t = useTranslations('gmiSection')
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const hoverTimerRef = useRef<number | undefined>(undefined)

  // Automatic parallel detail cycle (2 agents at a time)
  const [autoAgents, setAutoAgents] = useState<string[]>([])

  const agents = useMemo(() => ([
    { id: 'researcher', name: t('agents.researcher.name'), icon: Brain, description: t('agents.researcher.description'),
      examples: ['Web search and source ranking', 'Literature survey (PDFs, arXiv)', 'Fact extraction to memory'],
      tools: ['WebBrowser', 'PDFReader', 'Search API'], persona: t('agents.researcher.persona') },
    { id: 'analyst', name: t('agents.analyst.name'), icon: Activity, description: t('agents.analyst.description'),
      examples: ['Summarize and compare sources', 'Quant/qual trend analysis', 'Sanity checks and flags'],
      tools: ['DataFrame', 'Calculator', 'Validator'], persona: t('agents.analyst.persona') },
    { id: 'creator', name: t('agents.creator.name'), icon: Code, description: t('agents.creator.description'),
      examples: ['Drafts and revisions', 'Artifact generation (docs, code)', 'Style adaptation'],
      tools: ['Writer', 'Formatter', 'TemplateKit'], persona: t('agents.creator.persona') },
    { id: 'executor', name: t('agents.executor.name'), icon: Cpu, description: t('agents.executor.description'),
      examples: ['Call external APIs', 'Create issues/PRs', 'Schedule tasks'],
      tools: ['HTTP', 'GitHub', 'Scheduler'], persona: t('agents.executor.persona') },
    { id: 'orchestrator', name: t('agents.orchestrator.name'), icon: Network, description: t('agents.orchestrator.description'),
      examples: ['Route tasks to roles', 'Resolve conflicts', 'Approve/reject gates'],
      tools: ['Router', 'Guardrails', 'PolicyEngine'], persona: t('agents.orchestrator.persona') }
  ]), [t])

  const gmiSnapshots = [
    {
      useCase: t('snapshots.0.useCase'),
      outcome: t('snapshots.0.outcome')
    },
    {
      useCase: t('snapshots.1.useCase'),
      outcome: t('snapshots.1.outcome')
    },
    {
      useCase: t('snapshots.2.useCase'),
      outcome: t('snapshots.2.outcome')
    }
  ] as const

  useEffect(() => {
    let idx = 0
    const tick = () => {
      setAutoAgents([agents[idx % agents.length].id, agents[(idx + 1) % agents.length].id])
      idx = (idx + 2) % agents.length
    }
    tick()
    const t = setInterval(tick, 8000) // slow paced
    return () => clearInterval(t)
  }, [agents])

  // helper to position tooltip with minimal layout thrash
  function computeTooltipPosition(target: Element) {
    const svgElement =
      (target as SVGGraphicsElement).ownerSVGElement ??
      target.closest('svg')
    if (!svgElement) {
      // fallback to basic positioning relative to viewport if SVG context missing
      const rect = target.getBoundingClientRect()
      return { x: rect.left, y: rect.top }
    }
    const svgRect = svgElement.getBoundingClientRect()
    const rect = target.getBoundingClientRect()
    const tooltipWidth = 240
    const left = rect.left - svgRect.left + rect.width / 2 - tooltipWidth / 2
    const top = rect.top - svgRect.top - 16
    return { x: Math.max(8, left), y: Math.max(8, top) }
  }

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveNode(null)
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [])

  const architectureNodes = [
    {
      id: 'ui',
      label: t('architecture.ui.label'),
      subtitle: t('architecture.ui.subtitle'),
      x: 20, y: 40, w: 160, h: 80,
      details: t('architecture.ui.details'),
      example: t('architecture.ui.example'),
      outcome: t('architecture.ui.outcome')
    },
    {
      id: 'gateway',
      label: t('architecture.gateway.label'),
      subtitle: t('architecture.gateway.subtitle'),
      x: 210, y: 40, w: 160, h: 80,
      details: t('architecture.gateway.details'),
      example: t('architecture.gateway.example'),
      outcome: t('architecture.gateway.outcome')
    },
    {
      id: 'orchestrator',
      label: t('architecture.orchestrator.label'),
      subtitle: t('architecture.orchestrator.subtitle'),
      x: 390, y: 30, w: 190, h: 100,
      details: t('architecture.orchestrator.details'),
      example: t('architecture.orchestrator.example'),
      outcome: t('architecture.orchestrator.outcome')
    },
    {
      id: 'agents',
      label: t('architecture.agents.label'),
      subtitle: t('architecture.agents.subtitle'),
      x: 600, y: 10, w: 270, h: 140,
      details: t('architecture.agents.details'),
      example: t('architecture.agents.example'),
      outcome: t('architecture.agents.outcome')
    },
    {
      id: 'memory',
      label: t('architecture.memory.label'),
      subtitle: t('architecture.memory.subtitle'),
      x: 390, y: 160, w: 200, h: 90,
      details: t('architecture.memory.details'),
      example: t('architecture.memory.example'),
      outcome: t('architecture.memory.outcome')
    },
    {
      id: 'events',
      label: t('architecture.events.label'),
      subtitle: t('architecture.events.subtitle'),
      x: 610, y: 170, w: 180, h: 80,
      details: t('architecture.events.details'),
      example: t('architecture.events.example'),
      outcome: t('architecture.events.outcome')
    }
  ] as const

  const [selectedNodeId, setSelectedNodeId] = useState<(typeof architectureNodes)[number]['id']>(architectureNodes[0].id)
  const selectedArchitectureNode = architectureNodes.find((node) => node.id === selectedNodeId)

  function InteractiveArchitecture() {
    return (
      <div className="relative w-full overflow-x-auto">
        <svg viewBox="0 0 900 280" className="min-w-[800px] w-full h-auto">
          <defs>
            <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-accent-primary)" />
              <stop offset="100%" stopColor="var(--color-accent-secondary)" />
            </linearGradient>
            <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="var(--color-accent-primary)" />
            </marker>
          </defs>

          {/* Ambient blobs */}
          <g opacity="0.25" filter="url(#soft-glow)">
            <circle cx="140" cy="30" r="80" fill="var(--color-accent-primary)" />
            <circle cx="760" cy="260" r="90" fill="var(--color-accent-secondary)" />
          </g>

          {/* Flows (bezier) */}
          <g stroke="url(#flow-gradient)" strokeWidth="2" fill="none" markerEnd="url(#arrow)" opacity="0.9">
            <path d="M180,80 C195,80 205,80 210,80" />
            <path d="M370,80 C380,60 385,60 390,80" />
            <path d="M580,70 C590,40 595,40 600,70" />
            <path d="M485,130 C485,145 490,150 490,160" />
            <path d="M590,205 C600,205 606,205 610,205" />
            <path d="M780,150 C820,150 820,180 790,170" />
          </g>

          {/* Streaming dots */}
          {[
            { x: [180, 210], y: [80, 80], delay: 0 },
            { x: [370, 390], y: [70, 80], delay: 0.4 },
            { x: [580, 600], y: [65, 70], delay: 0.8 },
            { x: [485, 490], y: [130, 160], delay: 1.2 },
            { x: [590, 610], y: [205, 205], delay: 1.6 },
            { x: [780, 790], y: [150, 170], delay: 2.0 },
          ].map((seg, i) => (
            <motion.circle
              key={`spark-${i}`}
              r="3"
              fill="var(--color-accent-primary)"
              initial={{ cx: seg.x[0], cy: seg.y[0] }}
              animate={{ cx: seg.x[1], cy: seg.y[1] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', delay: seg.delay }}
            />
          ))}

          {/* Nodes with interactive tooltips (click to select) */}
          {architectureNodes.map((n) => (
            <g key={n.id}>
              {/* glow plate for selected state */}
              {selectedNodeId === n.id && (
                <rect x={n.x - 8} y={n.y - 8} width={n.w + 16} height={n.h + 16} rx="22"
                      fill="var(--color-accent-primary)" opacity="0.15" 
                      className="animate-pulse" />
              )}
              <rect x={n.x - 6} y={n.y - 6} width={n.w + 12} height={n.h + 12} rx="20"
                    fill="var(--color-accent-primary)" opacity="0.05" />
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx="16"
                fill={selectedNodeId === n.id ? "var(--color-background-secondary)" : "var(--color-background-primary)"}
                stroke={selectedNodeId === n.id ? "var(--color-accent-primary)" : "var(--color-border-primary)"}
                strokeWidth={selectedNodeId === n.id ? 2 : 1}
                className="cursor-pointer transition-all"
                onMouseEnter={(e) => {
                  // debounce hover reveal; measure in rAF to avoid sync reflow after state change
                  if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current)
                  const target = e.currentTarget as Element
                  hoverTimerRef.current = window.setTimeout(() => {
                    requestAnimationFrame(() => {
                    setActiveNode(n.id)
                      setTooltipPos(computeTooltipPosition(target))
                    })
                  }, 100)
                }}
                onMouseLeave={() => {
                  if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current)
                  setActiveNode((prev) => (prev === n.id ? null : prev))
                }}
                tabIndex={0}
                role="button"
                aria-label={`${n.label}. ${n.subtitle}. ${n.details}`}
                aria-pressed={selectedNodeId === n.id}
                onClick={() => setSelectedNodeId(n.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    const target = e.currentTarget as Element
                    setActiveNode(n.id)
                    setTooltipPos(computeTooltipPosition(target))
                    setSelectedNodeId(n.id)
                  }
                }}
              />
              <text x={n.x + n.w / 2} y={n.y + 40} textAnchor="middle" 
                    className={`font-semibold ${selectedNodeId === n.id ? 'fill-accent-primary' : 'fill-text-primary'}`}>
                {n.label}
              </text>
              <text x={n.x + n.w / 2} y={n.y + 60} textAnchor="middle" className="fill-text-muted text-xs">
                {n.subtitle}
              </text>
            </g>
          ))}
        </svg>

        {/* Portal-like tooltip (positioned absolute over SVG container) */}
        <AnimatePresence>
          {activeNode && (() => {
            const n = architectureNodes.find((x) => x.id === activeNode)!
            const pos = tooltipPos ?? { x: n.x + n.w + 8, y: n.y + 8 }
            return (
              <motion.div
                key={`tt-${n.id}`}
                id={`tt-${n.id}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="diagram-tooltip"
                style={{ left: pos.x, top: pos.y }}
                role="tooltip"
              >
                <div className="text-xs uppercase tracking-wide text-text-muted mb-1">{n.label}</div>
                <div className="text-sm text-text-primary font-semibold">{n.details}</div>
                <div className="text-xs text-text-secondary mt-2">
                  <span className="font-semibold text-accent-primary">Example:</span> {n.example}
                </div>
              </motion.div>
            )
          })()}
        </AnimatePresence>
      </div>
    )
  }
  return (
    <section id="gmis" className="py-12 sm:py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-theme section-gradient" aria-labelledby="gmi-heading">
      {/* Subtle organic gradient */}
      <div className="absolute inset-0 organic-gradient opacity-20" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <h2 id="gmi-heading" className="text-4xl sm:text-5xl font-extrabold mb-4">
            <span className="gradient-text">{t('title')}</span>
          </h2>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            {t('subtitle')}
          </p>
                    </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          className="grid md:grid-cols-3 gap-4 mb-10"
        >
          {gmiSnapshots.map((snapshot) => (
            <div key={snapshot.useCase} className="p-5 rounded-2xl bg-background-glass border border-border-subtle/60 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('useCaseTitle')}</p>
              <p className="text-base font-semibold text-text-primary mb-3">{snapshot.useCase}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('outcomeTitle')}</p>
              <p className="text-sm text-text-secondary leading-relaxed">{snapshot.outcome}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 rounded-3xl border border-border-subtle/70 bg-white/80 dark:bg-white/5 dark:border-white/10 p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-2 w-10 rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary" />
            <p className="text-sm font-semibold uppercase tracking-wide text-text-muted">{t('whatYouGetTitle')}</p>
          </div>
          <ul className="grid md:grid-cols-3 gap-3 text-sm text-text-secondary leading-relaxed">
            {(t.raw('whatYouGetItems') as string[]).map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent-primary" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Interactive Agent Network Diagram (slower, more detailed, visible popovers) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="glass-morphism rounded-3xl p-8 shadow-modern-lg">
            <h3 className="text-2xl sm:text-3xl font-bold text-center mb-2 text-text-primary">Multi‑Agent Collaboration Network</h3>
            <p className="text-center text-text-muted mb-8">Researcher, Analyst, Creator, Critic, Executor stream insights in parallel; Orchestrator routes, memory persists.</p>

            <div className="relative aspect-square max-w-2xl mx-auto">
              <svg viewBox="0 0 500 500" className="w-full h-full">
                <defs>
                  <radialGradient id="agent-gradient">
                    <stop offset="0%" stopColor="var(--color-accent-primary)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--color-accent-secondary)" stopOpacity="0.1" />
                  </radialGradient>
                  <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--color-accent-primary)" />
                    <stop offset="100%" stopColor="var(--color-accent-secondary)" />
                  </linearGradient>
                </defs>

                {/* Central hub */}
                <motion.circle
                  cx="250"
                  cy="250"
                  r="60"
                  fill="url(#agent-gradient)"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.8 }}
                />
                <text x="250" y="250" textAnchor="middle" className="fill-text-primary font-bold text-sm" dy="5">
                  Agency Core
                </text>

                {/* Agent nodes */}
                {[
                  ...agents,
                  { id: 'critic', name: t('agents.critic.name'), icon: Activity, description: t('agents.critic.description') },
                ].map((agent, i) => {
                  const angle = (i / agents.length) * 2 * Math.PI
                  const x = 250 + 150 * Math.cos(angle)
                  const y = 250 + 150 * Math.sin(angle)

                  return (
                    <g key={agent.id}>
                      {/* Connection lines */}
                      <motion.line
                        x1="250"
                        y1="250"
                        x2={x}
                        y2={y}
                        stroke="url(#flow-gradient)"
                        strokeWidth="1"
                        strokeDasharray="5,5"
                        opacity="0.35"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2.2, delay: i * 0.05 }}
                      />

                      {/* Agent node */}
                      <motion.g
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.7, delay: i * 0.05 }}
                      >
                        <circle
                          cx={x}
                          cy={y}
                          r="40"
                          fill="var(--color-background-primary)"
                          stroke={autoAgents.includes(agent.id) ? "var(--color-accent-primary)" : "var(--color-border-primary)"}
                          strokeWidth="2"
                        />
                        <text x={x} y={y - 5} textAnchor="middle" className="fill-text-primary font-semibold text-xs">
                          {agent.name}
                        </text>
                        <text x={x} y={y + 10} textAnchor="middle" className="fill-text-muted text-xs">
                          GMI
                        </text>
                      </motion.g>

                      {/* Data flow animation */}
                      <motion.circle
                        r="3"
                        fill="var(--color-accent-primary)"
                        initial={{ x: 250, y: 250 }}
                        animate={{
                          x: [250, x, 250],
                          y: [250, y, 250]
                        }}
                        transition={{
                          duration: 8,
                          delay: i * 0.3,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />
                    </g>
                  )
                })}
              </svg>

              {/* Automatic parallel agent info boxes */}
              <AnimatePresence>
                {autoAgents.map((aid) => {
                  const agent = agents.find((a) => a.id === aid)!
                  const i = agents.findIndex((a) => a.id === aid)
                  const angle = (i / agents.length) * 2 * Math.PI
                  const x = 250 + 150 * Math.cos(angle)
                  const y = 250 + 150 * Math.sin(angle)
                  const cardX = x > 250 ? x - 140 : x + 20
                  const cardY = y > 250 ? y - 120 : y + 20
                  return (
                    <motion.div
                      key={aid}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 0.95, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className="absolute z-20 w-60 surface-card p-4 border border-border-subtle rounded-2xl shadow-modern"
                      style={{ left: cardX, top: cardY }}
                    >
                      <div className="font-semibold text-text-primary mb-1 text-sm text-center">{agent.name}</div>
                      <div className="text-xs text-text-secondary mb-2 text-center">{agent.description}</div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Custom Architecture Diagram (SVG) with interactive tooltips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="glass-morphism rounded-3xl p-8 shadow-modern-lg">
            <h3 className="text-2xl sm:text-3xl font-bold mb-6 text-text-primary">{t('architectureTitle')}</h3>
            <InteractiveArchitecture />
            <motion.div
              key={selectedNodeId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-8"
            >
              {selectedArchitectureNode && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-border-subtle/70 bg-gradient-to-br from-accent-primary/5 to-transparent p-4">
                    <h3 className="text-sm font-semibold text-accent-primary mb-2">{selectedArchitectureNode.label}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{selectedArchitectureNode.details}</p>
                  </div>
                  <div className="rounded-xl border border-border-subtle/70 bg-white/50 dark:bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">{t('exampleTitle')}</p>
                    <p className="text-sm text-text-primary">{selectedArchitectureNode.example}</p>
                  </div>
                  <div className="rounded-xl border border-border-subtle/70 bg-white/50 dark:bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">{t('outcomeTitle')}</p>
                    <p className="text-sm text-text-primary">{selectedArchitectureNode.outcome}</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <a
            href="https://docs.agentos.sh/concepts/gmi"
            className="btn-primary inline-flex items-center gap-2"
          >
            <GitBranch className="w-5 h-5" />
            {t('ctaExploreDocs')}
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}