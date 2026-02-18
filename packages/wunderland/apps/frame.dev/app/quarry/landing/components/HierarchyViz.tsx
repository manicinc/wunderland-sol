'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Globe, Layers, Network, FileText, ArrowRight } from 'lucide-react'

/**
 * HierarchyViz - 3D Nested OpenStrand Hierarchy Visualization
 * Shows Fabric > Weave > Loom > Strand in an interactive 3D-style nested container
 */

interface HierarchyLevel {
  id: string
  name: string
  description: string
  example: string
  color: string
  gradient: string
  icon: typeof Globe
  depth: number
}

const hierarchyLevels: HierarchyLevel[] = [
  {
    id: 'fabric',
    name: 'Fabric',
    description: 'Your entire knowledge universe',
    example: 'my-knowledge-base/',
    color: 'emerald',
    gradient: 'from-emerald-500 to-emerald-600',
    icon: Globe,
    depth: 0,
  },
  {
    id: 'weave',
    name: 'Weave',
    description: 'Self-contained domains',
    example: 'weaves/technology/',
    color: 'teal',
    gradient: 'from-teal-500 to-teal-600',
    icon: Layers,
    depth: 1,
  },
  {
    id: 'loom',
    name: 'Loom',
    description: 'Organized modules',
    example: 'react/hooks/',
    color: 'cyan',
    gradient: 'from-cyan-500 to-cyan-600',
    icon: Network,
    depth: 2,
  },
  {
    id: 'strand',
    name: 'Strand',
    description: 'Atomic knowledge units',
    example: 'useState-guide.md',
    color: 'sky',
    gradient: 'from-sky-500 to-violet-500',
    icon: FileText,
    depth: 3,
  },
]

const colorMap: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  emerald: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
    text: 'text-emerald-500',
    glow: 'shadow-[0_0_60px_rgba(16,185,129,0.2)]',
  },
  teal: {
    border: 'border-teal-500',
    bg: 'bg-teal-500/5 dark:bg-teal-500/10',
    text: 'text-teal-500',
    glow: 'shadow-[0_0_40px_rgba(20,184,166,0.2)]',
  },
  cyan: {
    border: 'border-cyan-500',
    bg: 'bg-cyan-500/5 dark:bg-cyan-500/10',
    text: 'text-cyan-500',
    glow: 'shadow-[0_0_30px_rgba(6,182,212,0.2)]',
  },
  sky: {
    border: 'border-sky-500',
    bg: 'bg-sky-500/10 dark:bg-sky-500/15',
    text: 'text-sky-500',
    glow: 'shadow-[0_0_20px_rgba(14,165,233,0.25)]',
  },
}

export function HierarchyViz() {
  const [activeLevel, setActiveLevel] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  const getActiveInfo = () => {
    if (!activeLevel) return null
    return hierarchyLevels.find((l) => l.id === activeLevel)
  }

  const activeInfo = getActiveInfo()

  return (
    <div ref={ref} className="relative">
      {/* 3D Container with perspective */}
      <div className="relative aspect-square max-w-lg mx-auto" style={{ perspective: '1000px' }}>
        {/* Fabric - outermost */}
        <motion.div
          initial={{ opacity: 0, rotateX: -10 }}
          animate={isInView ? { opacity: 1, rotateX: 0 } : {}}
          transition={{ duration: 0.8, delay: 0 }}
          className={`absolute inset-0 rounded-3xl border-2 transition-all duration-300 cursor-pointer ${
            activeLevel === 'fabric' || !activeLevel
              ? `${colorMap.emerald.border} ${colorMap.emerald.bg} ${colorMap.emerald.glow}`
              : 'border-emerald-500/30 bg-emerald-500/[0.02]'
          }`}
          style={{ transformStyle: 'preserve-3d' }}
          onMouseEnter={() => setActiveLevel('fabric')}
          onMouseLeave={() => setActiveLevel(null)}
        >
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <Globe className={`w-4 h-4 ${colorMap.emerald.text}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${colorMap.emerald.text}`}>
              Fabric
            </span>
          </div>
        </motion.div>

        {/* Weave */}
        <motion.div
          initial={{ opacity: 0, rotateX: -10, scale: 0.95 }}
          animate={isInView ? { opacity: 1, rotateX: 0, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.15 }}
          className={`absolute inset-[12%] rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
            activeLevel === 'weave'
              ? `${colorMap.teal.border} ${colorMap.teal.bg} ${colorMap.teal.glow}`
              : 'border-teal-500/30 bg-teal-500/[0.02]'
          }`}
          style={{ transformStyle: 'preserve-3d', transform: 'translateZ(20px)' }}
          onMouseEnter={() => setActiveLevel('weave')}
          onMouseLeave={() => setActiveLevel(null)}
        >
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <Layers className={`w-4 h-4 ${colorMap.teal.text}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${colorMap.teal.text}`}>
              Weave
            </span>
          </div>
        </motion.div>

        {/* Loom */}
        <motion.div
          initial={{ opacity: 0, rotateX: -10, scale: 0.9 }}
          animate={isInView ? { opacity: 1, rotateX: 0, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className={`absolute inset-[24%] rounded-xl border-2 transition-all duration-300 cursor-pointer ${
            activeLevel === 'loom'
              ? `${colorMap.cyan.border} ${colorMap.cyan.bg} ${colorMap.cyan.glow}`
              : 'border-cyan-500/30 bg-cyan-500/[0.02]'
          }`}
          style={{ transformStyle: 'preserve-3d', transform: 'translateZ(40px)' }}
          onMouseEnter={() => setActiveLevel('loom')}
          onMouseLeave={() => setActiveLevel(null)}
        >
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <Network className={`w-3.5 h-3.5 ${colorMap.cyan.text}`} />
            <span className={`text-[11px] font-bold uppercase tracking-wider ${colorMap.cyan.text}`}>
              Loom
            </span>
          </div>
        </motion.div>

        {/* Strand - innermost */}
        <motion.div
          initial={{ opacity: 0, rotateX: -10, scale: 0.85 }}
          animate={isInView ? { opacity: 1, rotateX: 0, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.45 }}
          className={`absolute inset-[36%] rounded-lg border-2 transition-all duration-300 cursor-pointer flex items-center justify-center ${
            activeLevel === 'strand'
              ? `${colorMap.sky.border} ${colorMap.sky.bg} ${colorMap.sky.glow}`
              : 'border-sky-500/30 bg-sky-500/[0.05]'
          }`}
          style={{ transformStyle: 'preserve-3d', transform: 'translateZ(60px)' }}
          onMouseEnter={() => setActiveLevel('strand')}
          onMouseLeave={() => setActiveLevel(null)}
        >
          <div className="text-center p-4">
            <motion.div
              animate={activeLevel === 'strand' ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              <FileText className={`w-8 h-8 mx-auto mb-2 ${colorMap.sky.text}`} />
            </motion.div>
            <span className={`text-xs font-bold uppercase tracking-wider ${colorMap.sky.text}`}>
              Strand
            </span>
          </div>
        </motion.div>

        {/* Connection lines (animated) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: 'translateZ(30px)' }}
        >
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(14, 165, 233)" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {/* Diagonal connection line */}
          <motion.line
            x1="15%"
            y1="15%"
            x2="50%"
            y2="50%"
            stroke="url(#lineGradient)"
            strokeWidth="1"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={isInView ? { pathLength: 1 } : {}}
            transition={{ duration: 1.5, delay: 0.6 }}
          />
        </svg>
      </div>

      {/* Info panel below */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-8 h-24"
      >
        {activeInfo ? (
          <motion.div
            key={activeInfo.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <activeInfo.icon className={`w-5 h-5 ${colorMap[activeInfo.color].text}`} />
              <h4 className={`text-lg font-bold ${colorMap[activeInfo.color].text}`}>
                {activeInfo.name}
              </h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {activeInfo.description}
            </p>
            <code className="text-xs font-mono text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {activeInfo.example}
            </code>
          </motion.div>
        ) : (
          <div className="text-center text-gray-400 dark:text-gray-500">
            <p className="text-sm">Hover over a level to learn more</p>
          </div>
        )}
      </motion.div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="mt-6 flex flex-wrap justify-center gap-4"
      >
        {hierarchyLevels.map((level, i) => (
          <motion.div
            key={level.id}
            initial={{ opacity: 0, x: -10 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.3, delay: 0.9 + i * 0.1 }}
            className="flex items-center gap-1.5"
          >
            <level.icon className={`w-3.5 h-3.5 ${colorMap[level.color].text}`} />
            <span className="text-xs text-gray-600 dark:text-gray-400">{level.name}</span>
            {i < hierarchyLevels.length - 1 && (
              <ArrowRight className="w-3 h-3 text-gray-300 dark:text-gray-600 ml-2" />
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

export default HierarchyViz
