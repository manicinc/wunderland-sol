'use client'

import { motion } from 'framer-motion'
import {
  Download,
  ChevronRight,
  MessageCircle,
  Twitter,
  Instagram,
  Youtube,
  Music,
  Facebook,
  Linkedin,
  MessageSquare,
  AtSign,
  Check,
} from 'lucide-react'

const PLATFORM_ICONS = [
  { icon: MessageCircle, color: '#FF4500', name: 'Reddit' },
  { icon: Twitter, color: '#1DA1F2', name: 'Twitter' },
  { icon: Instagram, color: '#E4405F', name: 'Instagram' },
  { icon: Youtube, color: '#FF0000', name: 'YouTube' },
  { icon: Music, color: '#000000', name: 'TikTok' },
  { icon: Facebook, color: '#1877F2', name: 'Facebook' },
  { icon: Linkedin, color: '#0A66C2', name: 'LinkedIn' },
  { icon: MessageSquare, color: '#6364FF', name: 'Mastodon' },
  { icon: AtSign, color: '#000000', name: 'Threads' },
]

const FEATURES = [
  'Auto-detect platform',
  'Preserve attribution',
  'Extract hashtags',
  'Track engagement',
]

export default function SocialImportBanner() {
  return (
    <motion.div
      className="relative w-full max-w-5xl mx-auto mt-12 mb-8 px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
    >
      {/* Gradient background */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent blur-3xl" />

      <motion.div
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-paper-50 to-paper-100 dark:from-ink-900 dark:to-ink-950 border border-ink-200/20 dark:border-white/10 shadow-2xl"
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Animated gradient overlay */}
        <motion.div
          className="absolute inset-0 opacity-50"
          initial={{ backgroundPosition: '0% 0%' }}
          animate={{ backgroundPosition: '100% 100%' }}
          transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
          style={{
            background:
              'radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)',
            backgroundSize: '200% 200%',
          }}
        />

        {/* Glass morphism layer */}
        <div className="absolute inset-0 backdrop-blur-[2px] bg-white/5 dark:bg-black/5" />

        <div className="relative p-8 lg:p-12">
          {/* Header */}
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Left side - Icon */}
            <div className="flex-shrink-0">
              <motion.div
                className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <Download className="w-12 h-12 lg:w-16 lg:h-16 text-white" />
              </motion.div>
            </div>

            {/* Center - Content */}
            <div className="flex-1 text-center lg:text-left">
              <motion.h2
                className="text-3xl lg:text-4xl font-bold mb-4 heading-display"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  Import From Anywhere
                </span>
              </motion.h2>

              <motion.p
                className="text-lg text-ink-700 dark:text-paper-300 mb-6 leading-relaxed max-w-2xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                Capture content from 10+ social platforms with one click. Preserve attribution,
                engagement metrics, and media — all organized in your knowledge base.
              </motion.p>

              {/* Platform icons row */}
              <motion.div
                className="flex flex-wrap gap-2 mb-6 justify-center lg:justify-start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {PLATFORM_ICONS.map(({ icon: Icon, color, name }, index) => (
                  <motion.div
                    key={name}
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-paper-100 dark:bg-ink-800 border border-ink-200/20 dark:border-white/10"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    whileHover={{ scale: 1.1, backgroundColor: color, color: '#fff' }}
                    title={name}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </motion.div>
                ))}
                <motion.div
                  className="w-10 h-10 rounded-lg flex items-center justify-center bg-paper-100 dark:bg-ink-800 border border-ink-200/20 dark:border-white/10 text-xs font-medium text-ink-500"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + PLATFORM_ICONS.length * 0.05 }}
                >
                  +1
                </motion.div>
              </motion.div>

              {/* Features grid */}
              <motion.div
                className="grid grid-cols-2 gap-3 mb-6 max-w-md mx-auto lg:mx-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {FEATURES.map((feature, index) => (
                  <motion.div
                    key={feature}
                    className="flex items-center gap-2 text-sm text-ink-600 dark:text-paper-400"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <Check className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* CTA */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <motion.a
                  href="/quarry?settings=true&tab=social"
                  className="group relative inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all overflow-hidden"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Download className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Try Social Import</span>
                  <ChevronRight className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                </motion.a>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
