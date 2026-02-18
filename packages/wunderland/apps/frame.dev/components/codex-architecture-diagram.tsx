'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, GitBranch, FileText } from 'lucide-react'

/**
 * Visual representation of Quarry Codex's three-tier knowledge architecture.
 * 
 * Provides an interactive, tab-based diagram illustrating how Weaves, Looms, and Strands
 * form a recursive hierarchy for organizing humanity's knowledge. Each view includes
 * animated SVG illustrations with relationships, metadata, and structural connections.
 * 
 * @component
 * @example
 * ```tsx
 * <CodexArchitectureDiagram />
 * ```
 */

type DiagramView = 'weave' | 'loom' | 'strand' | 'hierarchy'

export default function CodexArchitectureDiagram() {
  const [view, setView] = useState<DiagramView>('weave')

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Tab bar - responsive grid on mobile */}
      <div className="grid grid-cols-2 md:flex md:items-center md:justify-center gap-2 mb-8">
        <button
          onClick={() => setView('weave')}
          className={`px-4 md:px-6 py-3 rounded-xl font-semibold transition-all touch-manipulation ${
            view === 'weave'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center gap-2 justify-center">
            <Layers className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-sm md:text-base">Weave</span>
          </div>
        </button>
        <button
          onClick={() => setView('loom')}
          className={`px-4 md:px-6 py-3 rounded-xl font-semibold transition-all touch-manipulation ${
            view === 'loom'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center gap-2 justify-center">
            <GitBranch className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-sm md:text-base">Loom</span>
          </div>
        </button>
        <button
          onClick={() => setView('strand')}
          className={`px-4 md:px-6 py-3 rounded-xl font-semibold transition-all touch-manipulation ${
            view === 'strand'
              ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center gap-2 justify-center">
            <FileText className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-sm md:text-base">Strand</span>
          </div>
        </button>
        <button
          onClick={() => setView('hierarchy')}
          className={`px-4 md:px-6 py-3 rounded-xl font-semibold transition-all touch-manipulation col-span-2 md:col-span-1 ${
            view === 'hierarchy'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/50'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center gap-2 justify-center">
            <Layers className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-sm md:text-base">Full Hierarchy</span>
          </div>
        </button>
      </div>

      {/* Diagram canvas */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 rounded-3xl p-12 border border-gray-200 dark:border-gray-800 shadow-2xl"
          style={{
            minHeight: '600px',
          }}
        >
          {view === 'weave' && <WeaveView />}
          {view === 'loom' && <LoomView />}
          {view === 'strand' && <StrandView />}
          {view === 'hierarchy' && <HierarchyView />}
        </motion.div>
      </AnimatePresence>

      {/* Legend */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Layers className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-bold text-lg">Weave</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            A complete universe of knowledge. Self-contained, comprehensive collections that form the top-level organization.
          </p>
          <div className="mt-4 text-xs text-gray-500">
            Example: <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">weaves/openstrand/</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <GitBranch className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-lg">Loom</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Curated collections within a weave. Groups related strands by topic, purpose, or theme.
          </p>
          <div className="mt-4 text-xs text-gray-500">
            Example: <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">looms/architecture/</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-bold text-lg">Strand</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Individual knowledge units. Documents, guides, references—the atomic building blocks of the codex.
          </p>
          <div className="mt-4 text-xs text-gray-500">
            Example: <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">architecture.md</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Renders the Weave-level view of the architecture.
 * 
 * Shows a central weave node with orbiting loom nodes, illustrating how a weave
 * acts as the top-level container for multiple curated loom collections. Dashed
 * lines represent structural containment relationships.
 * 
 * @returns Animated SVG diagram with central weave and satellite looms
 */
function WeaveView() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <svg viewBox="0 0 400 400" className="w-full max-w-md">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <radialGradient id="weaveGrad">
            <stop offset="0%" stopColor="#9333EA" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.4"/>
          </radialGradient>
        </defs>
        
        {/* Central weave */}
        <motion.circle
          cx="200"
          cy="200"
          r="80"
          fill="url(#weaveGrad)"
          stroke="#9333EA"
          strokeWidth="2"
          filter="url(#glow)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
        />
        <text x="200" y="205" textAnchor="middle" className="fill-white font-bold text-xl">
          Weave
        </text>
        
        {/* Looms orbiting */}
        {[0, 120, 240].map((angle, i) => {
          const rad = (angle * Math.PI) / 180
          const x = 200 + Math.cos(rad) * 140
          const y = 200 + Math.sin(rad) * 140
          return (
            <motion.g
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
            >
              <circle cx={x} cy={y} r="40" fill="#3B82F6" fillOpacity="0.3" stroke="#3B82F6" strokeWidth="2" />
              <text x={x} y={y + 5} textAnchor="middle" className="fill-blue-700 dark:fill-blue-300 text-sm font-semibold">
                Loom {i + 1}
              </text>
              <line x1="200" y1="200" x2={x} y2={y} stroke="#9333EA" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            </motion.g>
          )
        })}
      </svg>
      
      <div className="mt-8 text-center max-w-lg">
        <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
          Weave: The Universe
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          A weave is the highest-level container. It represents a complete, self-contained knowledge domain. 
          Within each weave, multiple looms organize related content into coherent collections.
        </p>
      </div>
    </div>
  )
}

/**
 * Renders the Loom-level view of the architecture.
 * 
 * Displays a central loom node surrounded by strand nodes, demonstrating how looms
 * curate and organize individual knowledge units. Connection lines show the grouping
 * relationship between a loom and its constituent strands.
 * 
 * @returns Animated SVG diagram with central loom and surrounding strands
 */
function LoomView() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <svg viewBox="0 0 400 400" className="w-full max-w-md">
        <defs>
          <linearGradient id="loomGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.6"/>
          </linearGradient>
        </defs>
        
        {/* Central loom */}
        <motion.rect
          x="150"
          y="150"
          width="100"
          height="100"
          rx="12"
          fill="url(#loomGrad)"
          stroke="#3B82F6"
          strokeWidth="2"
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
        />
        <text x="200" y="205" textAnchor="middle" className="fill-white font-bold text-lg">
          Loom
        </text>
        
        {/* Strands */}
        {[
          { x: 80, y: 100 },
          { x: 320, y: 100 },
          { x: 80, y: 300 },
          { x: 320, y: 300 },
          { x: 200, y: 50 },
          { x: 200, y: 350 },
        ].map((pos, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
          >
            <rect
              x={pos.x - 20}
              y={pos.y - 15}
              width="40"
              height="30"
              rx="6"
              fill="#10B981"
              fillOpacity="0.3"
              stroke="#10B981"
              strokeWidth="1.5"
            />
            <text x={pos.x} y={pos.y + 5} textAnchor="middle" className="fill-green-700 dark:fill-green-300 text-xs font-medium">
              S{i + 1}
            </text>
            <line x1="200" y1="200" x2={pos.x} y2={pos.y} stroke="#3B82F6" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
          </motion.g>
        ))}
      </svg>
      
      <div className="mt-8 text-center max-w-lg">
        <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          Loom: The Collection
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Looms curate and organize strands within a weave. They group related knowledge by topic, purpose, or theme, 
          creating navigable pathways through the information space.
        </p>
      </div>
    </div>
  )
}

/**
 * Renders the full hierarchy view showing weave → loom → strand nesting.
 * 
 * Displays a complete example of how folders and YAML manifests work together
 * to create the three-tier structure. Shows physical directories alongside
 * virtual metadata layers, clarifying that looms can be both.
 * 
 * @returns Animated diagram with folder tree and manifest badges
 */
function HierarchyView() {
  return (
    <div className="flex flex-col lg:flex-row items-start justify-center gap-8 h-full py-8">
      {/* Folder structure */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-lg">
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-600" />
          Physical Structure
        </h3>
        <div className="font-mono text-sm space-y-1 text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <span className="text-purple-600 font-bold">📚 weaves/</span>
          </div>
          <div className="pl-4 flex items-center gap-2">
            <span className="text-purple-600 font-bold">openstrand/</span>
            <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">weave.yaml</span>
          </div>
          <div className="pl-8 flex items-center gap-2">
            <span className="text-blue-600 font-semibold">🧵 looms/</span>
          </div>
          <div className="pl-12 flex items-center gap-2">
            <span className="text-blue-600 font-semibold">architecture/</span>
            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">loom.yaml</span>
          </div>
          <div className="pl-16 flex items-center gap-2">
            <span className="text-green-600">📄 overview.md</span>
          </div>
          <div className="pl-16 flex items-center gap-2">
            <span className="text-green-600">📄 ingestion.md</span>
          </div>
          <div className="pl-16 flex items-center gap-2">
            <span className="text-green-600">📄 search.md</span>
          </div>
          <div className="pl-12 flex items-center gap-2 mt-2">
            <span className="text-blue-600 font-semibold">guides/</span>
            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">loom.yaml</span>
          </div>
          <div className="pl-16 flex items-center gap-2">
            <span className="text-green-600">📄 quickstart.md</span>
          </div>
          <div className="pl-16 flex items-center gap-2">
            <span className="text-green-600">📄 best-practices.md</span>
          </div>
        </div>
      </div>

      {/* Conceptual explanation */}
      <div className="flex-1 space-y-4">
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
          <h4 className="font-bold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Weave = Scope
          </h4>
          <p className="text-sm text-purple-800 dark:text-purple-200">
            Top-level namespace. Each weave is self-contained with its own looms and strands.
            The <code className="px-1 py-0.5 bg-purple-100 dark:bg-purple-900/50 rounded text-xs">weave.yaml</code> defines metadata, taxonomy, and scope rules.
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
          <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Loom = Collection + Metadata
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Looms are <strong>both</strong> physical folders and metadata layers.
            The <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded text-xs">loom.yaml</code> adds taxonomy, tags, and relationships on top of the contained strands.
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
          <h4 className="font-bold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Strand = Knowledge Unit
          </h4>
          <p className="text-sm text-green-800 dark:text-green-200">
            Individual <code className="px-1 py-0.5 bg-green-100 dark:bg-green-900/50 rounded text-xs">.md</code> files with YAML front-matter.
            Each strand has its own ID, version, tags, and explicit relationships to other strands.
          </p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800">
          <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-2">
            💡 Key Insight
          </h4>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            You can have <strong>multiple weaves</strong> (e.g., <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/50 rounded text-xs">openstrand/</code>, <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/50 rounded text-xs">agentos/</code>).
            Cross-weave references are explicit via the <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/50 rounded text-xs">relationships</code> field.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Renders the Strand-level view of the architecture.
 * 
 * Illustrates a single strand as a document with rich metadata (version, tags) and
 * explicit relationship arrows to other strands. Shows how strands are the atomic
 * building blocks of the codex, carrying provenance, taxonomy, and cross-references.
 * 
 * @returns Animated SVG diagram of a strand document with metadata and relationships
 */
function StrandView() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <svg viewBox="0 0 400 400" className="w-full max-w-md">
        <defs>
          <linearGradient id="strandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="#059669" stopOpacity="0.7"/>
          </linearGradient>
        </defs>
        
        {/* Central strand document */}
        <motion.g
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <rect
            x="120"
            y="100"
            width="160"
            height="200"
            rx="8"
            fill="url(#strandGrad)"
            stroke="#10B981"
            strokeWidth="2"
          />
          <rect x="140" y="130" width="120" height="4" rx="2" fill="white" fillOpacity="0.7" />
          <rect x="140" y="150" width="100" height="4" rx="2" fill="white" fillOpacity="0.6" />
          <rect x="140" y="170" width="110" height="4" rx="2" fill="white" fillOpacity="0.6" />
          <rect x="140" y="190" width="90" height="4" rx="2" fill="white" fillOpacity="0.5" />
          <rect x="140" y="210" width="100" height="4" rx="2" fill="white" fillOpacity="0.5" />
          <rect x="140" y="230" width="80" height="4" rx="2" fill="white" fillOpacity="0.4" />
          
          <text x="200" y="270" textAnchor="middle" className="fill-white font-bold text-base">
            Strand
          </text>
        </motion.g>
        
        {/* Metadata badges */}
        <motion.g
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <rect x="30" y="180" width="60" height="24" rx="12" fill="#8B5CF6" fillOpacity="0.2" stroke="#8B5CF6" strokeWidth="1" />
          <text x="60" y="196" textAnchor="middle" className="fill-purple-700 dark:fill-purple-300 text-xs font-medium">
            v1.0.0
          </text>
        </motion.g>
        
        <motion.g
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <rect x="310" y="180" width="60" height="24" rx="12" fill="#F59E0B" fillOpacity="0.2" stroke="#F59E0B" strokeWidth="1" />
          <text x="340" y="196" textAnchor="middle" className="fill-amber-700 dark:fill-amber-300 text-xs font-medium">
            #guide
          </text>
        </motion.g>
        
        {/* Relationship arrows */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <path d="M 200 320 Q 150 360 100 360" stroke="#6B7280" strokeWidth="2" fill="none" strokeDasharray="4 4" />
          <circle cx="100" cy="360" r="4" fill="#6B7280" />
          <text x="100" y="380" textAnchor="middle" className="fill-gray-500 text-xs">
            Related
          </text>
          
          <path d="M 200 320 Q 250 360 300 360" stroke="#6B7280" strokeWidth="2" fill="none" strokeDasharray="4 4" />
          <circle cx="300" cy="360" r="4" fill="#6B7280" />
          <text x="300" y="380" textAnchor="middle" className="fill-gray-500 text-xs">
            References
          </text>
        </motion.g>
      </svg>
      
      <div className="mt-8 text-center max-w-lg">
        <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
          Strand: The Knowledge Unit
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Strands are the atomic units of knowledge. Each strand is a self-contained document with rich metadata, 
          version tracking, and explicit relationships to other strands. They form the foundation of the entire codex.
        </p>
      </div>
    </div>
  )
}

