/**
 * AI Feature Cards
 * @module quarry/ui/features/AIFeatureCards
 *
 * Feature cards showcasing AI Writing Assistant and Image Generation
 * for landing pages, feature lists, and marketing.
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  PenLine,
  ImagePlus,
  Sparkles,
  Keyboard,
  Palette,
  Zap,
  Check,
  ArrowRight,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface FeatureCardProps {
  title: string
  description: string
  icon: React.ReactNode
  features: string[]
  accentColor: string
  onLearnMore?: () => void
  onTryIt?: () => void
  badge?: string
  isDark?: boolean
}

export interface AIFeatureCardsProps {
  onStartWritingTour?: () => void
  onStartImageTour?: () => void
  onOpenSettings?: () => void
  isDark?: boolean
  variant?: 'full' | 'compact' | 'minimal'
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURE CARD COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

function FeatureCard({
  title,
  description,
  icon,
  features,
  accentColor,
  onLearnMore,
  onTryIt,
  badge,
  isDark = false,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`
        relative overflow-hidden rounded-2xl border p-6
        ${isDark
          ? 'bg-zinc-900 border-zinc-800'
          : 'bg-white border-zinc-200'
        }
      `}
    >
      {/* Badge */}
      {badge && (
        <div className={`
          absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-medium
          ${accentColor.includes('cyan')
            ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
          }
        `}>
          {badge}
        </div>
      )}

      {/* Icon */}
      <div className={`
        inline-flex p-3 rounded-xl mb-4
        ${accentColor}
      `}>
        {icon}
      </div>

      {/* Title & Description */}
      <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
        {title}
      </h3>
      <p className={`text-sm mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
        {description}
      </p>

      {/* Feature List */}
      <ul className="space-y-2 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
              accentColor.includes('cyan') ? 'text-cyan-500' : 'text-purple-500'
            }`} />
            <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* Actions */}
      <div className="flex gap-3">
        {onTryIt && (
          <button
            onClick={onTryIt}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
              font-medium text-sm transition-colors
              ${accentColor.includes('cyan')
                ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                : 'bg-purple-500 hover:bg-purple-600 text-white'
              }
            `}
          >
            <Sparkles className="w-4 h-4" />
            Try It
          </button>
        )}
        {onLearnMore && (
          <button
            onClick={onLearnMore}
            className={`
              flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
              font-medium text-sm transition-colors
              ${isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }
            `}
          >
            Learn More
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPACT FEATURE CARD
═══════════════════════════════════════════════════════════════════════════ */

function CompactFeatureCard({
  title,
  description,
  icon,
  accentColor,
  onClick,
  isDark = false,
}: {
  title: string
  description: string
  icon: React.ReactNode
  accentColor: string
  onClick?: () => void
  isDark?: boolean
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        flex items-start gap-4 p-4 rounded-xl border text-left transition-all
        ${isDark
          ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
          : 'bg-white border-zinc-200 hover:border-zinc-300'
        }
      `}
    >
      <div className={`p-2 rounded-lg flex-shrink-0 ${accentColor}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          {title}
        </h4>
        <p className={`text-sm mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          {description}
        </p>
      </div>
      <ArrowRight className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
    </motion.button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function AIFeatureCards({
  onStartWritingTour,
  onStartImageTour,
  onOpenSettings,
  isDark = false,
  variant = 'full',
}: AIFeatureCardsProps) {
  if (variant === 'minimal') {
    return (
      <div className="flex flex-wrap gap-2">
        <span className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
          ${isDark ? 'bg-cyan-900/30 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}
        `}>
          <PenLine className="w-3.5 h-3.5" />
          AI Writing
        </span>
        <span className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
          ${isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'}
        `}>
          <ImagePlus className="w-3.5 h-3.5" />
          AI Images
        </span>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="space-y-3">
        <CompactFeatureCard
          title="AI Writing Assistant"
          description="Ghost text suggestions as you type"
          icon={<PenLine className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
          accentColor={isDark ? 'bg-cyan-900/30' : 'bg-cyan-100'}
          onClick={onStartWritingTour}
          isDark={isDark}
        />
        <CompactFeatureCard
          title="AI Image Generation"
          description="Create images from text descriptions"
          icon={<ImagePlus className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
          accentColor={isDark ? 'bg-purple-900/30' : 'bg-purple-100'}
          onClick={onStartImageTour}
          isDark={isDark}
        />
      </div>
    )
  }

  // Full variant
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <FeatureCard
        title="AI Writing Assistant"
        description="Get intelligent ghost text suggestions as you type. The AI learns from your context and writing style."
        icon={<PenLine className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />}
        accentColor={isDark ? 'bg-cyan-900/30' : 'bg-cyan-100'}
        features={[
          'Auto-triggers after configurable pause',
          'Tab to accept, Escape to dismiss',
          'Ctrl+Space for manual trigger',
          'Adjustable suggestion length',
          'Works with OpenAI or Anthropic',
        ]}
        badge="AI Powered"
        onLearnMore={onStartWritingTour}
        onTryIt={onOpenSettings}
        isDark={isDark}
      />

      <FeatureCard
        title="AI Image Generation"
        description="Create custom images from text descriptions using DALL-E or Flux. Perfect for illustrations, diagrams, and more."
        icon={<ImagePlus className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
        accentColor={isDark ? 'bg-purple-900/30' : 'bg-purple-100'}
        features={[
          '7 style presets (Illustration, Photo, etc.)',
          'Square, Landscape, Portrait sizes',
          'Select text to use as prompt',
          '/image command in editor',
          'Insert directly into documents',
        ]}
        badge="DALL-E & Flux"
        onLearnMore={onStartImageTour}
        onTryIt={onOpenSettings}
        isDark={isDark}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS CARD
═══════════════════════════════════════════════════════════════════════════ */

interface ShortcutItem {
  keys: string[]
  action: string
}

const AI_SHORTCUTS: ShortcutItem[] = [
  { keys: ['Tab'], action: 'Accept AI suggestion' },
  { keys: ['Esc'], action: 'Dismiss suggestion' },
  { keys: ['Ctrl', 'Space'], action: 'Trigger suggestion' },
  { keys: ['Cmd', 'Shift', 'I'], action: 'Generate image' },
]

export function AIShortcutsCard({ isDark = false }: { isDark?: boolean }) {
  return (
    <div className={`
      rounded-xl border p-4
      ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}
    `}>
      <div className="flex items-center gap-2 mb-3">
        <Keyboard className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
        <h4 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          AI Keyboard Shortcuts
        </h4>
      </div>
      <div className="space-y-2">
        {AI_SHORTCUTS.map((shortcut, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {shortcut.action}
            </span>
            <div className="flex gap-1">
              {shortcut.keys.map((key, j) => (
                <kbd
                  key={j}
                  className={`
                    px-1.5 py-0.5 text-xs font-mono rounded
                    ${isDark
                      ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                      : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                    }
                  `}
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   STYLE PRESETS PREVIEW CARD
═══════════════════════════════════════════════════════════════════════════ */

const STYLE_PREVIEWS = [
  { id: 'illustration', name: 'Illustration', emoji: '🎨', color: 'bg-blue-500' },
  { id: 'photo', name: 'Photo', emoji: '📷', color: 'bg-green-500' },
  { id: 'diagram', name: 'Diagram', emoji: '📊', color: 'bg-amber-500' },
  { id: 'sketch', name: 'Sketch', emoji: '✏️', color: 'bg-orange-500' },
  { id: 'watercolor', name: 'Watercolor', emoji: '🌊', color: 'bg-cyan-500' },
  { id: '3d', name: '3D', emoji: '🧊', color: 'bg-purple-500' },
  { id: 'pixel', name: 'Pixel', emoji: '👾', color: 'bg-pink-500' },
]

export function StylePresetsCard({ isDark = false }: { isDark?: boolean }) {
  return (
    <div className={`
      rounded-xl border p-4
      ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}
    `}>
      <div className="flex items-center gap-2 mb-3">
        <Palette className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
        <h4 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Image Style Presets
        </h4>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {STYLE_PREVIEWS.map((style) => (
          <div
            key={style.id}
            className={`
              flex flex-col items-center gap-1 p-2 rounded-lg
              ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}
            `}
          >
            <span className="text-xl">{style.emoji}</span>
            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {style.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AIFeatureCards
