'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import {
  Flower2,
  Timer,
  Maximize2,
  Volume2,
  Image as ImageIcon,
  Layout,
  ArrowRight,
} from 'lucide-react'

/**
 * Deep Focus Mode Section
 * Showcases the Meditation/Focus productivity workspace
 */
export function DeepFocusSection() {
  const resolvePath = useQuarryPath()
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const features = [
    {
      icon: Timer,
      title: 'Pomodoro Timer',
      description: '25/5/15 technique with session tracking',
    },
    {
      icon: Volume2,
      title: 'Ambient Soundscapes',
      description: 'Rain, café, forest, ocean, and more',
    },
    {
      icon: ImageIcon,
      title: 'Dynamic Backgrounds',
      description: 'Curated images that match your soundscape',
    },
    {
      icon: Layout,
      title: 'Floating Widgets',
      description: 'Clock, stats, quick capture, AI copilot',
    },
  ]

  return (
    <section
      ref={ref}
      id="deep-focus"
      className="relative py-24 md:py-32 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950 overflow-hidden isolate"
    >
      {/* Subtle background pattern - contained */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none" style={{ zIndex: 0 }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8" style={{ zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300 text-sm font-medium mb-6">
            <Flower2 className="w-4 h-4" />
            <span>New Feature</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
            Deep Focus Mode
          </h2>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Transform your screen into an immersive productivity workspace.
            Ambient sounds, beautiful backgrounds, and powerful focus tools.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Features list */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -10 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 hover:border-fuchsia-300 dark:hover:border-fuchsia-700 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/40 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <Link
                href={resolvePath('/quarry/focus')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-medium rounded-lg transition-colors group"
              >
                Try Deep Focus Mode
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                <kbd className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono">
                  ⌘⇧F
                </kbd>{' '}
                to enter fullscreen
              </p>
            </motion.div>
          </motion.div>

          {/* Visual preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative"
          >
            {/* Mock window frame */}
            <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-900 shadow-2xl">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800 border-b border-zinc-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="ml-2 text-xs text-zinc-500">Deep Focus Mode</span>
              </div>

              {/* Simulated meditation page */}
              <div className="relative aspect-video bg-gradient-to-br from-slate-800 via-slate-900 to-zinc-900 overflow-hidden">
                {/* Background image simulation */}
                <div className="absolute inset-0 opacity-40">
                  <div className="absolute inset-0 bg-[url('/quarry-landing/meditation-preview.jpg')] bg-cover bg-center blur-[1px]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
                </div>

                {/* Floating widget mockups */}
                <div className="absolute top-4 right-4 px-4 py-3 bg-zinc-800/90 backdrop-blur rounded-lg border border-zinc-700/50 shadow-lg">
                  <div className="text-2xl font-mono text-white">25:00</div>
                  <div className="text-xs text-zinc-400 mt-1">Focus Session</div>
                </div>

                <div className="absolute bottom-4 left-4 px-4 py-2 bg-zinc-800/90 backdrop-blur rounded-lg border border-zinc-700/50 shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-fuchsia-500/30 flex items-center justify-center">
                      <Flower2 className="w-3 h-3 text-fuchsia-400" />
                    </div>
                    <span className="text-xs text-zinc-300">Rain Ambience</span>
                    <Volume2 className="w-3 h-3 text-zinc-500" />
                  </div>
                </div>

                {/* Soundscape visualization */}
                <div className="absolute bottom-4 right-4 flex items-end gap-0.5 h-8">
                  {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.3, 0.7, 0.5].map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-fuchsia-400/60 rounded-full"
                      animate={{
                        height: [`${h * 100}%`, `${h * 60}%`, `${h * 100}%`],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>

                {/* Center content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className="w-20 h-20 rounded-full border-2 border-fuchsia-400/40 flex items-center justify-center"
                    animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Maximize2 className="w-8 h-8 text-white/60" />
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Glow effect - contained within section */}
            <div className="absolute -inset-4 bg-gradient-to-r from-fuchsia-500/10 via-purple-500/10 to-fuchsia-500/10 blur-3xl opacity-50 pointer-events-none" style={{ zIndex: -1 }} />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

