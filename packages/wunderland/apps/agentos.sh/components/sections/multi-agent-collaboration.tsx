'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import {
  Users,
  GitBranch,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Shield,
  Shuffle,
  GitMerge,
  List
} from 'lucide-react'

type CollaborationMode = 'consensus' | 'sequential' | 'parallel'

interface AgentRole {
  name: string
  role: string
  icon: React.ElementType
  color: string
}

interface CollaborationPattern {
  mode: CollaborationMode
  title: string
  description: string
  icon: React.ElementType
  agents: AgentRole[]
  workflow: {
    steps: string[]
    duration: string
    throughput: string
  }
  useCases: {
    title: string
    description: string
    metrics: { label: string; value: string }[]
  }[]
  proscons: {
    pros: string[]
    cons: string[]
  }
  codeExample: string
}

export function MultiAgentCollaboration() {
  const t = useTranslations('multiAgent')
  const [selectedPattern, setSelectedPattern] = useState<CollaborationMode>('consensus')
  const [activeUseCase, setActiveUseCase] = useState(0)
  const [showCode, setShowCode] = useState(false)

  const agents = useMemo<AgentRole[]>(() => [
    { name: t('agents.researcher'), role: 'Information gathering', icon: Users, color: '#00FFFF' },
    { name: t('agents.analyst'), role: 'Data processing', icon: GitBranch, color: '#FF00FF' },
    { name: t('agents.creator'), role: 'Content generation', icon: Layers, color: '#FFFF00' },
    { name: t('agents.critic'), role: 'Quality assurance', icon: Shield, color: '#00FF00' },
    { name: t('agents.executor'), role: 'Task implementation', icon: Zap, color: '#FF8800' },
    { name: t('agents.orchestrator'), role: 'Workflow management', icon: GitMerge, color: '#8800FF' }
  ], [t])

  const collaborationPatterns = useMemo<CollaborationPattern[]>(() => [
    {
      mode: 'consensus',
      title: t('patterns.consensus.title'),
      description: t('patterns.consensus.description'),
      icon: CheckCircle2,
      agents: agents.slice(0, 4),
      workflow: {
        steps: t.raw('patterns.consensus.workflow.steps') as string[],
        duration: t('patterns.consensus.workflow.duration'),
        throughput: t('patterns.consensus.workflow.throughput')
      },
      useCases: t.raw('patterns.consensus.useCases') as CollaborationPattern['useCases'],
      proscons: {
        pros: t.raw('patterns.consensus.proscons.pros') as string[],
        cons: t.raw('patterns.consensus.proscons.cons') as string[]
      },
      codeExample: `// Consensus-based decision making
const consensus = await orchestrator.decide({
  pattern: 'consensus',
  agents: ['researcher', 'analyst', 'critic'],
  input: userQuery,
  options: {
    threshold: 0.7,        // 70% agreement required
    weights: {
      researcher: 0.3,
      analyst: 0.5,
      critic: 0.2
    },
    timeout: 500,          // Max 500ms wait
    fallback: 'majority'   // Fallback to simple majority
  }
});

// Execute if consensus reached
if (consensus.agreement >= 0.7) {
  await executor.run(consensus.decision);
}`
    },
    {
      mode: 'sequential',
      title: t('patterns.sequential.title'),
      description: t('patterns.sequential.description'),
      icon: List,
      agents: agents.slice(0, 5),
      workflow: {
        steps: t.raw('patterns.sequential.workflow.steps') as string[],
        duration: t('patterns.sequential.workflow.duration'),
        throughput: t('patterns.sequential.workflow.throughput')
      },
      useCases: t.raw('patterns.sequential.useCases') as CollaborationPattern['useCases'],
      proscons: {
        pros: t.raw('patterns.sequential.proscons.pros') as string[],
        cons: t.raw('patterns.sequential.proscons.cons') as string[]
      },
      codeExample: `// Sequential processing pipeline
const pipeline = await orchestrator.pipeline({
  pattern: 'sequential',
  stages: [
    { agent: 'researcher', task: 'gather_context' },
    { agent: 'analyst', task: 'process_data' },
    { agent: 'creator', task: 'generate_solution' },
    { agent: 'critic', task: 'validate_output' },
    { agent: 'executor', task: 'implement' }
  ],
  input: userRequest,
  options: {
    passthrough: true,     // Pass all data between stages
    errorHandling: 'retry', // Retry failed stages
    maxRetries: 3,
    timeout: 2000          // 2 second total timeout
  }
});

// Access stage outputs
console.log(pipeline.stages.analyst.output);
return pipeline.final;`
    },
    {
      mode: 'parallel',
      title: t('patterns.parallel.title'),
      description: t('patterns.parallel.description'),
      icon: Shuffle,
      agents: agents,
      workflow: {
        steps: t.raw('patterns.parallel.workflow.steps') as string[],
        duration: t('patterns.parallel.workflow.duration'),
        throughput: t('patterns.parallel.workflow.throughput')
      },
      useCases: t.raw('patterns.parallel.useCases') as CollaborationPattern['useCases'],
      proscons: {
        pros: t.raw('patterns.parallel.proscons.pros') as string[],
        cons: t.raw('patterns.parallel.proscons.cons') as string[]
      },
      codeExample: `// Parallel multi-agent execution
const results = await orchestrator.parallel({
  pattern: 'parallel',
  agents: {
    researcher: { task: 'market_data', region: 'US' },
    analyst: { task: 'technical_analysis', timeframe: '1h' },
    creator: { task: 'generate_report', format: 'pdf' },
    critic: { task: 'risk_assessment', threshold: 0.05 },
    executor: { task: 'place_orders', mode: 'sandbox' }
  },
  options: {
    timeout: 300,           // 300ms max wait
    partial: true,          // Return partial results
    aggregation: 'merge',   // Merge all outputs
    errorTolerance: 0.2     // Allow 20% failure rate
  }
});

// Process aggregated results
const merged = orchestrator.merge(results);
await notifyClients(merged);`
    }
  ], [agents, t])

  const currentPattern = collaborationPatterns.find(p => p.mode === selectedPattern)!

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-muted max-w-3xl mx-auto mb-2">
            {t('subtitle')}
          </p>
          <p className="text-base text-muted max-w-2xl mx-auto">
            {t('description')}
          </p>
        </motion.div>

        {/* Pattern Selector */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {collaborationPatterns.map((pattern) => (
            <motion.button
              key={pattern.mode}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onMouseEnter={() => {
                setSelectedPattern(pattern.mode)
                setActiveUseCase(0)
                setShowCode(false)
              }}
              onClick={() => {
                setSelectedPattern(pattern.mode)
                setActiveUseCase(0)
                setShowCode(false)
              }}
              className={`px-6 py-4 rounded-lg backdrop-blur-xl flex items-center gap-3 transition-all duration-[var(--duration-smooth)] ${
                selectedPattern === pattern.mode
                  ? 'bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-[var(--color-text-on-accent)] shadow-lg shadow-[var(--color-accent-primary)]/30'
                  : 'bg-[var(--color-background-glass)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:border-[var(--color-border-interactive)]'
              }`}
            >
              <pattern.icon className={`w-5 h-5 ${selectedPattern === pattern.mode ? 'text-white' : 'text-[var(--color-accent-primary)]'}`} />
              <span className="font-semibold">{pattern.title}</span>
            </motion.button>
          ))}
        </div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedPattern}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.35 }}
          >
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left: Visualization */}
              <div className="space-y-6">
                {/* Agent Network Visualization */}
                <div className="holographic-card p-6 will-change-transform">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <currentPattern.icon className="w-5 h-5 text-accent-primary" />
                    {currentPattern.title}
                  </h3>

                  {/* Agent Flow Diagram */}
                  <div className="relative h-64 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 250">
                      {currentPattern.mode === 'consensus' && (
                        <>
                          {/* Central consensus point */}
                          <circle cx="200" cy="125" r="30" fill="var(--color-accent-primary)" opacity="0.2" />
                          {/* Agents around the center */}
                          {currentPattern.agents.map((agent, i) => {
                            const angle = (Math.PI * 2 / currentPattern.agents.length) * i - Math.PI / 2
                            const x = 200 + Math.cos(angle) * 80
                            const y = 125 + Math.sin(angle) * 80
                            return (
                              <g key={i}>
                                <line
                                  x1="200"
                                  y1="125"
                                  x2={x}
                                  y2={y}
                                  stroke={agent.color}
                                  strokeWidth="2"
                                  opacity="0.5"
                                />
                                <circle cx={x} cy={y} r="25" fill={agent.color} opacity="0.3" />
                                <circle cx={x} cy={y} r="20" fill={agent.color} opacity="0.5" />
                                <text
                                  x={x}
                                  y={y + 40}
                                  textAnchor="middle"
                                  className="text-xs fill-current"
                                >
                                  {agent.name}
                                </text>
                              </g>
                            )
                          })}
                        </>
                      )}
                      {currentPattern.mode === 'sequential' && (
                        <>
                          {/* Sequential flow */}
                          {currentPattern.agents.map((agent, i) => {
                            const x = 50 + (300 / (currentPattern.agents.length - 1)) * i
                            const y = 125
                            return (
                              <g key={i}>
                                {i < currentPattern.agents.length - 1 && (
                                  <line
                                    x1={x + 25}
                                    y1={y}
                                    x2={x + (300 / (currentPattern.agents.length - 1)) - 25}
                                    y2={y}
                                    stroke={agent.color}
                                    strokeWidth="2"
                                    opacity="0.5"
                                    markerEnd="url(#arrowhead)"
                                  />
                                )}
                                <circle cx={x} cy={y} r="25" fill={agent.color} opacity="0.3" />
                                <circle cx={x} cy={y} r="20" fill={agent.color} opacity="0.5" />
                                <text
                                  x={x}
                                  y={y + 40}
                                  textAnchor="middle"
                                  className="text-xs fill-current"
                                >
                                  {agent.name}
                                </text>
                              </g>
                            )
                          })}
                          <defs>
                            <marker
                              id="arrowhead"
                              markerWidth="10"
                              markerHeight="10"
                              refX="9"
                              refY="3"
                              orient="auto"
                            >
                              <polygon
                                points="0 0, 10 3, 0 6"
                                fill="var(--color-text-primary)"
                                opacity="0.5"
                              />
                            </marker>
                          </defs>
                        </>
                      )}
                      {currentPattern.mode === 'parallel' && (
                        <>
                          {/* Parallel execution */}
                          <rect x="170" y="20" width="60" height="210" fill="var(--color-accent-primary)" opacity="0.1" rx="5" />
                          {currentPattern.agents.map((agent, i) => {
                            const x = i < 3 ? 100 : 300
                            const y = 50 + ((i % 3) * 70)
                            return (
                              <g key={i}>
                                <line
                                  x1={x > 200 ? 230 : 170}
                                  y1={y}
                                  x2={x > 200 ? x - 25 : x + 25}
                                  y2={y}
                                  stroke={agent.color}
                                  strokeWidth="2"
                                  opacity="0.5"
                                  strokeDasharray={x > 200 ? "none" : "5,5"}
                                />
                                <circle cx={x} cy={y} r="20" fill={agent.color} opacity="0.3" />
                                <circle cx={x} cy={y} r="15" fill={agent.color} opacity="0.5" />
                                <text
                                  x={x}
                                  y={y + 35}
                                  textAnchor="middle"
                                  className="text-xs fill-current"
                                >
                                  {agent.name}
                                </text>
                              </g>
                            )
                          })}
                        </>
                      )}
                    </svg>
                  </div>

                  {/* Workflow Steps */}
                  <div className="mt-6 space-y-2">
                    <h4 className="text-sm font-medium text-muted mb-2">{t('ui.workflowSteps')}</h4>
                    {currentPattern.workflow.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-accent-primary mt-1">→</span>
                        <span className="text-sm">{step}</span>
                      </div>
                    ))}
                  </div>

                  {/* Performance Metrics */}
                  <div className="mt-4 pt-4 border-t border-glass-border grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted">{t('ui.latency')}</span>
                      <p className="font-medium">{currentPattern.workflow.duration}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted">{t('ui.throughput')}</span>
                      <p className="font-medium">{currentPattern.workflow.throughput}</p>
                    </div>
                  </div>
                </div>

                {/* Pros and Cons */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="holographic-card p-4 will-change-transform">
                    <h4 className="text-sm font-semibold text-green-500 mb-2">{t('ui.pros')}</h4>
                    <ul className="space-y-1">
                      {currentPattern.proscons.pros.map((pro, i) => (
                        <li key={i} className="text-xs flex items-start gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="holographic-card p-4 will-change-transform">
                    <h4 className="text-sm font-semibold text-orange-500 mb-2">{t('ui.cons')}</h4>
                    <ul className="space-y-1">
                      {currentPattern.proscons.cons.map((con, i) => (
                        <li key={i} className="text-xs flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 text-orange-500 mt-0.5 shrink-0" />
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Right: Use Cases and Code */}
              <div className="space-y-6">
                {/* Use Cases */}
                <div className="holographic-card p-6 will-change-transform">
                  <h3 className="text-lg font-semibold mb-4">{t('ui.useCases')}</h3>

                  {/* Use Case Tabs */}
                  <div className="flex gap-2 mb-4 overflow-x-auto">
                    {currentPattern.useCases.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveUseCase(i)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-[var(--duration-fast)] ${
                          activeUseCase === i
                            ? 'bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-[var(--color-text-on-accent)] shadow-lg'
                            : 'bg-[var(--color-background-glass)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-interactive)]'
                        }`}
                      >
                        {t('ui.case')} {i + 1}
                      </button>
                    ))}
                  </div>

                  {/* Active Use Case */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeUseCase}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-4"
                    >
                      <div>
                        <h4 className="font-medium mb-1">
                          {currentPattern.useCases[activeUseCase].title}
                        </h4>
                        <p className="text-sm text-muted">
                          {currentPattern.useCases[activeUseCase].description}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {currentPattern.useCases[activeUseCase].metrics.map((metric, i) => (
                          <div key={i} className="text-center p-3 rounded-lg bg-glass-surface">
                            <p className="text-xs text-muted mb-1">{metric.label}</p>
                            <p className="text-lg font-bold gradient-text">{metric.value}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Code Example */}
                <div className="holographic-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{t('ui.implementation')}</h3>
                    <button
                      onClick={() => setShowCode(!showCode)}
                      className="text-sm text-accent-primary hover:underline"
                    >
                      {showCode ? t('ui.hideCode') : t('ui.showCode')}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showCode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <pre className="bg-black/20 dark:bg-black/40 p-4 rounded-lg overflow-x-auto">
                          <code className="text-xs font-mono text-green-400">
                            {currentPattern.codeExample}
                          </code>
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!showCode && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted">
                        {t('ui.codePrompt', { pattern: currentPattern.title.toLowerCase() })}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-accent-primary" />
                        <span>{t('ui.setupTime')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="w-4 h-4 text-accent-primary" />
                        <span>{t('ui.performance')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
