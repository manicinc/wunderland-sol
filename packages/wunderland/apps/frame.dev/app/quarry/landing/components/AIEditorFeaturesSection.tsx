/**
 * AI Editor Features Landing Section
 * @module quarry/landing/components/AIEditorFeaturesSection
 *
 * Comprehensive showcase of AI writing suggestions and image generation
 * with interactive demos, visual diagrams, and feature comparisons.
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  PenLine,
  ImagePlus,
  Sparkles,
  Keyboard,
  Zap,
  Check,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Shield,
  Cpu,
  Cloud,
  Lock,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPING DEMO - Interactive Ghost Text Simulation
═══════════════════════════════════════════════════════════════════════════ */

const DEMO_SCENARIOS = [
  {
    typed: "The key to effective learning is ",
    suggestion: "spaced repetition, which helps transfer information from short-term to long-term memory.",
    accepted: true,
  },
  {
    typed: "React hooks provide a way to ",
    suggestion: "use state and other React features without writing a class component.",
    accepted: true,
  },
  {
    typed: "To improve your writing, you should ",
    suggestion: "read more, practice daily, and seek feedback from others.",
    accepted: false,
  },
]

function TypingDemo() {
  const [isPlaying, setIsPlaying] = useState(true)
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [suggestionAccepted, setSuggestionAccepted] = useState(false)
  const [phase, setPhase] = useState<'typing' | 'pause' | 'suggesting' | 'accepting' | 'done'>('typing')

  const scenario = DEMO_SCENARIOS[scenarioIndex]

  useEffect(() => {
    if (!isPlaying) return

    let timeout: NodeJS.Timeout

    if (phase === 'typing') {
      if (displayText.length < scenario.typed.length) {
        timeout = setTimeout(() => {
          setDisplayText(scenario.typed.slice(0, displayText.length + 1))
        }, 50 + Math.random() * 50) // Variable typing speed
      } else {
        timeout = setTimeout(() => setPhase('pause'), 300)
      }
    } else if (phase === 'pause') {
      timeout = setTimeout(() => {
        setShowSuggestion(true)
        setPhase('suggesting')
      }, 800)
    } else if (phase === 'suggesting') {
      timeout = setTimeout(() => {
        if (scenario.accepted) {
          setSuggestionAccepted(true)
          setPhase('accepting')
        } else {
          setPhase('done')
        }
      }, 1500)
    } else if (phase === 'accepting') {
      timeout = setTimeout(() => {
        setDisplayText(scenario.typed + scenario.suggestion)
        setShowSuggestion(false)
        setPhase('done')
      }, 500)
    } else if (phase === 'done') {
      timeout = setTimeout(() => {
        // Reset for next scenario
        setDisplayText('')
        setShowSuggestion(false)
        setSuggestionAccepted(false)
        setPhase('typing')
        setScenarioIndex((i) => (i + 1) % DEMO_SCENARIOS.length)
      }, 2000)
    }

    return () => clearTimeout(timeout)
  }, [isPlaying, phase, displayText, scenario, scenarioIndex])

  const reset = () => {
    setDisplayText('')
    setShowSuggestion(false)
    setSuggestionAccepted(false)
    setPhase('typing')
    setScenarioIndex(0)
    setIsPlaying(true)
  }

  return (
    <div className="relative">
      {/* Editor Chrome */}
      <div className="rounded-2xl overflow-hidden border border-gray-200/60 dark:border-gray-700/40 shadow-xl">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="ml-3 text-xs font-medium text-gray-500 dark:text-gray-400">
              Document.md
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label={isPlaying ? "Pause demo" : "Play demo"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-gray-500" aria-hidden="true" />
              ) : (
                <Play className="w-4 h-4 text-gray-500" aria-hidden="true" />
              )}
            </button>
            <button
              onClick={reset}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Reset demo"
            >
              <RotateCcw className="w-4 h-4 text-gray-500" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="p-6 min-h-[180px] bg-white dark:bg-gray-900 font-mono text-sm leading-relaxed">
          <span className="text-gray-900 dark:text-gray-100">{displayText}</span>

          {/* Blinking Cursor */}
          {phase !== 'done' && !suggestionAccepted && (
            <span className="inline-block w-0.5 h-5 bg-cyan-500 animate-pulse ml-0.5" />
          )}

          {/* Ghost Text Suggestion */}
          <AnimatePresence>
            {showSuggestion && !suggestionAccepted && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="text-gray-400 dark:text-gray-500 italic"
              >
                {scenario.suggestion}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 text-xs">
          <div className="flex items-center gap-3">
            {showSuggestion && !suggestionAccepted && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI suggestion ready</span>
              </motion.div>
            )}
            {suggestionAccepted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 text-green-600 dark:text-green-400"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Suggestion accepted</span>
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono">Tab</kbd> to accept</span>
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono">Esc</kbd> to dismiss</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI WRITING FLOW DIAGRAM
═══════════════════════════════════════════════════════════════════════════ */

function WritingFlowDiagram() {
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    { id: 'type', label: 'Type', icon: Keyboard, color: 'cyan' },
    { id: 'pause', label: 'Pause', icon: Zap, color: 'amber' },
    { id: 'suggest', label: 'Suggest', icon: Sparkles, color: 'purple' },
    { id: 'accept', label: 'Accept', icon: Check, color: 'green' },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((s) => (s + 1) % steps.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [steps.length])

  return (
    <div className="relative py-8">
      {/* Flow Line */}
      <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-cyan-200 via-purple-200 to-green-200 dark:from-cyan-800 dark:via-purple-800 dark:to-green-800 rounded-full transform -translate-y-1/2" />

      {/* Animated Progress */}
      <motion.div
        className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-green-500 rounded-full transform -translate-y-1/2"
        animate={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />

      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, i) => {
          const Icon = step.icon
          const isActive = i <= activeStep
          const isCurrent = i === activeStep

          return (
            <motion.div
              key={step.id}
              className="flex flex-col items-center"
              animate={{ scale: isCurrent ? 1.1 : 1 }}
            >
              <motion.div
                className={`
                  relative w-16 h-16 rounded-2xl flex items-center justify-center
                  ${isActive
                    ? `bg-${step.color}-500 text-white shadow-lg shadow-${step.color}-500/30`
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }
                  transition-all duration-300
                `}
                style={{
                  backgroundColor: isActive
                    ? step.color === 'cyan' ? '#06b6d4'
                    : step.color === 'amber' ? '#f59e0b'
                    : step.color === 'purple' ? '#a855f7'
                    : '#22c55e'
                    : undefined,
                  boxShadow: isActive ? `0 10px 30px -10px ${
                    step.color === 'cyan' ? 'rgb(6 182 212 / 0.5)'
                    : step.color === 'amber' ? 'rgb(245 158 11 / 0.5)'
                    : step.color === 'purple' ? 'rgb(168 85 247 / 0.5)'
                    : 'rgb(34 197 94 / 0.5)'
                  }` : undefined
                }}
              >
                <Icon className="w-7 h-7" />
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-current"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.div>
              <span className={`mt-3 text-sm font-medium ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   IMAGE GENERATION FLOW DIAGRAM
═══════════════════════════════════════════════════════════════════════════ */

function ImageGenFlowDiagram() {
  const [activePhase, setActivePhase] = useState(0)

  const phases = [
    {
      id: 'select',
      label: 'Select Text',
      desc: 'Highlight your description',
      icon: '📝'
    },
    {
      id: 'style',
      label: 'Choose Style',
      desc: 'Pick a visual preset',
      icon: '🎨'
    },
    {
      id: 'generate',
      label: 'Generate',
      desc: 'AI creates your image',
      icon: '✨'
    },
    {
      id: 'insert',
      label: 'Insert',
      desc: 'Add to your document',
      icon: '📄'
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActivePhase((p) => (p + 1) % phases.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [phases.length])

  return (
    <div className="grid grid-cols-4 gap-4">
      {phases.map((phase, i) => (
        <motion.div
          key={phase.id}
          className={`
            relative p-4 rounded-2xl text-center
            ${i === activePhase
              ? 'bg-purple-500/10 dark:bg-purple-500/20 border-2 border-purple-500'
              : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
            }
            transition-all duration-300
          `}
          animate={{ y: i === activePhase ? -5 : 0 }}
        >
          {/* Arrow between steps */}
          {i < phases.length - 1 && (
            <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 z-10">
              <ChevronRight className={`w-6 h-6 ${i < activePhase ? 'text-purple-500' : 'text-gray-300 dark:text-gray-600'}`} />
            </div>
          )}

          <motion.span
            className="text-3xl block mb-2"
            animate={{ scale: i === activePhase ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.5 }}
          >
            {phase.icon}
          </motion.span>
          <h4 className={`font-semibold text-sm ${i === activePhase ? 'text-purple-600 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}`}>
            {phase.label}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {phase.desc}
          </p>
        </motion.div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   STYLE PRESETS SHOWCASE
═══════════════════════════════════════════════════════════════════════════ */

const STYLE_PRESETS = [
  { id: 'illustration', name: 'Illustration', emoji: '🎨', desc: 'Clean editorial art', sample: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'photo', name: 'Photo', emoji: '📷', desc: 'Photorealistic imagery', sample: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { id: 'diagram', name: 'Diagram', emoji: '📊', desc: 'Technical explanatory', sample: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)' },
  { id: 'sketch', name: 'Sketch', emoji: '✏️', desc: 'Hand-drawn look', sample: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'watercolor', name: 'Watercolor', emoji: '🌊', desc: 'Soft artistic style', sample: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: '3d', name: '3D Render', emoji: '🧊', desc: 'Modern volumetric', sample: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { id: 'pixel', name: 'Pixel Art', emoji: '👾', desc: 'Retro game style', sample: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
]

function StylePresetsShowcase() {
  const [hoveredStyle, setHoveredStyle] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-7 gap-3">
      {STYLE_PRESETS.map((style) => (
        <motion.div
          key={style.id}
          onHoverStart={() => setHoveredStyle(style.id)}
          onHoverEnd={() => setHoveredStyle(null)}
          whileHover={{ scale: 1.05, y: -5 }}
          className="relative group cursor-pointer"
        >
          {/* Preview Card */}
          <div
            className="aspect-square rounded-2xl mb-2 flex items-center justify-center text-3xl shadow-lg"
            style={{ background: style.sample }}
          >
            {style.emoji}
          </div>

          {/* Label */}
          <div className="text-center">
            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {style.name}
            </h5>
          </div>

          {/* Tooltip */}
          <AnimatePresence>
            {hoveredStyle === style.id && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs whitespace-nowrap z-10"
              >
                {style.desc}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURES COMPARISON MATRIX
═══════════════════════════════════════════════════════════════════════════ */

const FEATURE_MATRIX = [
  { feature: 'Ghost text suggestions', writing: true, image: false, offline: 'Partial' },
  { feature: 'AI Selection Actions (improve, shorten, translate)', writing: true, image: false, offline: 'No' },
  { feature: 'Picture Book Mode (text + illustrations)', writing: false, image: true, offline: 'No' },
  { feature: 'Auto-trigger on pause', writing: true, image: false, offline: 'No' },
  { feature: 'Tab to accept', writing: true, image: false, offline: 'N/A' },
  { feature: '8 Visual style presets', writing: false, image: true, offline: 'N/A' },
  { feature: 'Multiple sizes (Square/Landscape/Portrait)', writing: false, image: true, offline: 'N/A' },
  { feature: 'Insert directly into document', writing: true, image: true, offline: 'N/A' },
  { feature: 'OpenAI / Anthropic support', writing: true, image: true, offline: 'No' },
  { feature: 'Context-aware suggestions', writing: true, image: false, offline: 'Yes' },
  { feature: 'Grammar fix, tone changes, translation', writing: true, image: false, offline: 'No' },
  { feature: 'Document Visualizer panel', writing: false, image: true, offline: 'No' },
]

function FeaturesMatrix() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Feature</th>
            <th className="text-center py-3 px-4 font-semibold text-cyan-600 dark:text-cyan-400">
              <div className="flex items-center justify-center gap-2">
                <PenLine className="w-4 h-4" />
                Writing
              </div>
            </th>
            <th className="text-center py-3 px-4 font-semibold text-purple-600 dark:text-purple-400">
              <div className="flex items-center justify-center gap-2">
                <ImagePlus className="w-4 h-4" />
                Image Gen
              </div>
            </th>
            <th className="text-center py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
              <div className="flex items-center justify-center gap-2">
                <Cpu className="w-4 h-4" />
                Offline
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {FEATURE_MATRIX.map((row, i) => (
            <tr
              key={i}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{row.feature}</td>
              <td className="py-3 px-4 text-center">
                {row.writing ? (
                  <Check className="w-5 h-5 text-cyan-500 mx-auto" />
                ) : (
                  <span className="text-gray-300 dark:text-gray-600">—</span>
                )}
              </td>
              <td className="py-3 px-4 text-center">
                {row.image ? (
                  <Check className="w-5 h-5 text-purple-500 mx-auto" />
                ) : (
                  <span className="text-gray-300 dark:text-gray-600">—</span>
                )}
              </td>
              <td className="py-3 px-4 text-center">
                {row.offline === 'Yes' ? (
                  <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                ) : row.offline === 'No' ? (
                  <Cloud className="w-4 h-4 text-gray-400 mx-auto" />
                ) : row.offline === 'Partial' ? (
                  <span className="text-amber-500 text-xs font-medium">Partial</span>
                ) : (
                  <span className="text-gray-300 dark:text-gray-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS DISPLAY
═══════════════════════════════════════════════════════════════════════════ */

const SHORTCUTS = [
  { keys: ['Tab'], action: 'Accept suggestion', category: 'writing' },
  { keys: ['Esc'], action: 'Dismiss suggestion', category: 'writing' },
  { keys: ['Ctrl', 'Space'], action: 'Trigger suggestion', category: 'writing' },
  { keys: ['Cmd', 'Shift', 'A'], action: 'AI Selection Actions', category: 'selection' },
  { keys: ['Cmd', 'Shift', 'V'], action: 'Document Visualizer', category: 'image' },
]

function KeyboardShortcutsDisplay() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {SHORTCUTS.map((shortcut, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
        >
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {shortcut.action}
          </span>
          <div className="flex items-center gap-1">
            {shortcut.keys.map((key, j) => (
              <React.Fragment key={j}>
                <kbd className="px-2 py-1 text-xs font-mono font-semibold rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 shadow-sm">
                  {key}
                </kbd>
                {j < shortcut.keys.length - 1 && (
                  <span className="text-gray-400 text-xs">+</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN SECTION COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function AIEditorFeaturesSection() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section
      ref={sectionRef}
      id="ai-editor"
      className="relative py-24 px-4 bg-gradient-to-b from-quarry-offwhite via-gray-50/50 to-quarry-offwhite dark:from-quarry-charcoal dark:via-quarry-charcoal-deep/50 dark:to-quarry-charcoal overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.015]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-100 to-purple-100 dark:from-cyan-900/30 dark:to-purple-900/30 border border-cyan-200/50 dark:border-cyan-700/30 mb-6">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">AI-Powered Editor</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-quarry-charcoal dark:text-quarry-offwhite mb-4">
            Write smarter.{' '}
            <span className="bg-gradient-to-r from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-400 bg-clip-text text-transparent">
              Create visually.
            </span>
          </h2>

          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            AI-powered ghost text suggestions as you type, plus instant image generation from your descriptions.
            Your ideas, amplified.
          </p>
        </motion.div>

        {/* Two Column Layout: Writing + Image Gen */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* AI Writing Assistant Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative p-8 rounded-3xl bg-gradient-to-br from-cyan-50 via-sky-50/50 to-blue-50/30 dark:from-cyan-950/40 dark:via-sky-950/30 dark:to-blue-950/20 border border-cyan-200/60 dark:border-cyan-700/40 overflow-hidden"
          >
            {/* Floating Icon */}
            <div className="absolute top-6 right-6">
              <div className="p-3 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/20">
                <PenLine className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              AI Writing Assistant
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
              Ghost text suggestions as you type. Select any text to improve, shorten, fix grammar, change tone, or translate. Like having a writing partner by your side.
            </p>

            {/* Flow Diagram */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">How it works</h4>
              <WritingFlowDiagram />
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Context-aware', icon: Zap },
                { label: 'Configurable delay', icon: Keyboard },
                { label: '3 length modes', icon: PenLine },
                { label: 'Your API keys', icon: Lock },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-cyan-200/30 dark:border-cyan-700/20"
                >
                  <item.icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* AI Image Generation Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative p-8 rounded-3xl bg-gradient-to-br from-purple-50 via-fuchsia-50/50 to-pink-50/30 dark:from-purple-950/40 dark:via-fuchsia-950/30 dark:to-pink-950/20 border border-purple-200/60 dark:border-purple-700/40 overflow-hidden"
          >
            {/* Floating Icon */}
            <div className="absolute top-6 right-6">
              <div className="p-3 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20">
                <ImagePlus className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              AI Document Visualizer
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
              Turn your writing into visual stories. Generate illustrations for each paragraph in Picture Book mode, or create standalone images from text descriptions.
            </p>

            {/* Flow Diagram */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">How it works</h4>
              <ImageGenFlowDiagram />
            </div>

            {/* Style Presets */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">7 Style Presets</h4>
              <StylePresetsShowcase />
            </div>
          </motion.div>
        </div>

        {/* Interactive Demo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              See it in action
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Watch how AI suggestions appear while you type
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <TypingDemo />
          </div>
        </motion.div>

        {/* Features Matrix & Shortcuts Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Feature Matrix */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-2 p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Feature Comparison
            </h3>
            <FeaturesMatrix />
          </motion.div>

          {/* Keyboard Shortcuts */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-cyan-500" />
              Shortcuts
            </h3>
            <KeyboardShortcutsDisplay />

            {/* Privacy Note */}
            <div className="mt-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-700/30">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">Your Keys, Your Data</h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                    API keys are encrypted locally. We never see or store your data.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default AIEditorFeaturesSection
