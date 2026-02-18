'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function SuperintelligenceBanner() {
  return (
    <motion.section
      className="mt-16 mb-12 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-cyan-600/10"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          backgroundSize: '200% 200%',
        }}
      />

      <div className="relative bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 md:p-12 text-center border border-gray-200 dark:border-gray-800">
        {/* Animated SVG Icon */}
        <div className="mb-6 flex justify-center">
          <svg 
            className="w-24 h-24 md:w-32 md:h-32"
            viewBox="0 0 200 200" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Neural network animation */}
            <motion.circle
              cx="100"
              cy="100"
              r="40"
              stroke="url(#grad1)"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
            
            {/* Orbiting nodes */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <motion.g key={i}>
                <motion.circle
                  cx={100 + 60 * Math.cos((angle * Math.PI) / 180)}
                  cy={100 + 60 * Math.sin((angle * Math.PI) / 180)}
                  r="8"
                  fill="url(#grad2)"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.5,
                  }}
                />
                <motion.line
                  x1="100"
                  y1="100"
                  x2={100 + 60 * Math.cos((angle * Math.PI) / 180)}
                  y2={100 + 60 * Math.sin((angle * Math.PI) / 180)}
                  stroke="url(#grad3)"
                  strokeWidth="1"
                  opacity="0.3"
                  animate={{
                    opacity: [0.1, 0.5, 0.1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.5,
                  }}
                />
              </motion.g>
            ))}
            
            {/* Center core */}
            <motion.circle
              cx="100"
              cy="100"
              r="20"
              fill="url(#grad4)"
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 360],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
              <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
              <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
              <radialGradient id="grad4">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#EF4444" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        <p className="mb-3 text-sm font-medium text-ink-500 dark:text-paper-500">
          Quietly in development in the background.
        </p>

        <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-frame-green to-blue-600 bg-clip-text text-transparent">
          The Superintelligence Computer
        </h2>
        
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          We&apos;re building the future—a superintelligence computer that ingests all of Frame 
          to answer any question and perform any task. Powered by the Quarry Codex and designed 
          for open source SAFE superintelligence.
        </p>

        <div className="flex flex-wrap gap-4 justify-center items-center">
          <Link 
            href="/about#superintelligence" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-frame-green to-blue-600 text-white rounded-lg font-medium hover:from-frame-green/90 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
          >
            Learn More
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          
          <button 
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-frame-green text-frame-green dark:text-frame-green rounded-lg font-medium hover:bg-frame-green hover:text-white dark:hover:text-white transition-all"
            onClick={() => alert('Early access signup coming soon!')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Join Waitlist
          </button>
        </div>
      </div>
    </motion.section>
  )
}
