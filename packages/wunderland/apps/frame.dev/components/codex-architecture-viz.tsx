'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

export default function CodexArchitectureViz() {
  const [activeLayer, setActiveLayer] = useState<'weave' | 'loom' | 'strand' | null>(null)
  const [hoveredElement, setHoveredElement] = useState<string | null>(null)

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Main Visualization */}
      <div className="relative bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-green-950/20 rounded-3xl p-12 overflow-hidden">
        {/* Background Grid */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Central SVG Diagram */}
        <svg viewBox="0 0 800 600" className="w-full h-auto relative z-10">
          <defs>
            {/* Gradients */}
            <linearGradient id="weaveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.6" />
            </linearGradient>
            
            <linearGradient id="loomGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.6" />
            </linearGradient>
            
            <linearGradient id="strandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.6" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Connection patterns */}
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6B7280" />
            </marker>
          </defs>

          {/* Weave Layer (Universe) */}
          <motion.g
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            onMouseEnter={() => {
              setActiveLayer('weave')
              setHoveredElement('weave-main')
            }}
            onMouseLeave={() => {
              setActiveLayer(null)
              setHoveredElement(null)
            }}
          >
            {/* Outer cosmic ring */}
            <circle
              cx="400"
              cy="300"
              r="280"
              fill="none"
              stroke="url(#weaveGradient)"
              strokeWidth="3"
              strokeDasharray="10,5"
              opacity={activeLayer === 'weave' || !activeLayer ? 1 : 0.3}
              filter={activeLayer === 'weave' ? 'url(#glow)' : ''}
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="30"
                dur="3s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Weave label */}
            <text
              x="400"
              y="50"
              textAnchor="middle"
              className="fill-purple-600 dark:fill-purple-400 font-bold text-2xl"
              opacity={activeLayer === 'weave' || !activeLayer ? 1 : 0.3}
            >
              WEAVE
            </text>
            <text
              x="400"
              y="75"
              textAnchor="middle"
              className="fill-purple-500 dark:fill-purple-500 text-sm"
              opacity={activeLayer === 'weave' || !activeLayer ? 1 : 0.3}
            >
              Complete Universe
            </text>
          </motion.g>

          {/* Loom Layer (Collections) */}
          <motion.g
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {/* Loom 1 - Top */}
            <g
              onMouseEnter={() => {
                setActiveLayer('loom')
                setHoveredElement('loom-1')
              }}
              onMouseLeave={() => {
                setActiveLayer(null)
                setHoveredElement(null)
              }}
            >
              <circle
                cx="400"
                cy="180"
                r="80"
                fill="url(#loomGradient)"
                stroke="#3B82F6"
                strokeWidth="2"
                opacity={activeLayer === 'loom' || !activeLayer ? 0.9 : 0.2}
                filter={hoveredElement === 'loom-1' ? 'url(#glow)' : ''}
              />
              <text
                x="400"
                y="185"
                textAnchor="middle"
                className="fill-white font-semibold text-lg"
                opacity={activeLayer === 'loom' || !activeLayer ? 1 : 0.3}
              >
                Loom
              </text>
              
              {/* Thread pattern */}
              <path
                d="M 360 160 Q 400 140, 440 160"
                stroke="#60A5FA"
                strokeWidth="2"
                fill="none"
                opacity={activeLayer === 'loom' || !activeLayer ? 0.6 : 0.2}
              />
              <path
                d="M 360 180 Q 400 160, 440 180"
                stroke="#60A5FA"
                strokeWidth="2"
                fill="none"
                opacity={activeLayer === 'loom' || !activeLayer ? 0.6 : 0.2}
              />
              <path
                d="M 360 200 Q 400 180, 440 200"
                stroke="#60A5FA"
                strokeWidth="2"
                fill="none"
                opacity={activeLayer === 'loom' || !activeLayer ? 0.6 : 0.2}
              />
            </g>

            {/* Loom 2 - Left */}
            <g
              onMouseEnter={() => {
                setActiveLayer('loom')
                setHoveredElement('loom-2')
              }}
              onMouseLeave={() => {
                setActiveLayer(null)
                setHoveredElement(null)
              }}
            >
              <circle
                cx="250"
                cy="350"
                r="70"
                fill="url(#loomGradient)"
                stroke="#3B82F6"
                strokeWidth="2"
                opacity={activeLayer === 'loom' || !activeLayer ? 0.9 : 0.2}
                filter={hoveredElement === 'loom-2' ? 'url(#glow)' : ''}
              />
              <text
                x="250"
                y="355"
                textAnchor="middle"
                className="fill-white font-semibold"
                opacity={activeLayer === 'loom' || !activeLayer ? 1 : 0.3}
              >
                Loom
              </text>
            </g>

            {/* Loom 3 - Right */}
            <g
              onMouseEnter={() => {
                setActiveLayer('loom')
                setHoveredElement('loom-3')
              }}
              onMouseLeave={() => {
                setActiveLayer(null)
                setHoveredElement(null)
              }}
            >
              <circle
                cx="550"
                cy="350"
                r="70"
                fill="url(#loomGradient)"
                stroke="#3B82F6"
                strokeWidth="2"
                opacity={activeLayer === 'loom' || !activeLayer ? 0.9 : 0.2}
                filter={hoveredElement === 'loom-3' ? 'url(#glow)' : ''}
              />
              <text
                x="550"
                y="355"
                textAnchor="middle"
                className="fill-white font-semibold"
                opacity={activeLayer === 'loom' || !activeLayer ? 1 : 0.3}
              >
                Loom
              </text>
            </g>
          </motion.g>

          {/* Strand Layer (Individual Units) */}
          <motion.g
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            {/* Strands in Loom 1 */}
            {[
              { x: 370, y: 150, id: 's1' },
              { x: 400, y: 140, id: 's2' },
              { x: 430, y: 150, id: 's3' },
              { x: 385, y: 170, id: 's4' },
              { x: 415, y: 170, id: 's5' },
            ].map((strand) => (
              <g
                key={strand.id}
                onMouseEnter={() => {
                  setActiveLayer('strand')
                  setHoveredElement(strand.id)
                }}
                onMouseLeave={() => {
                  setActiveLayer(null)
                  setHoveredElement(null)
                }}
              >
                <circle
                  cx={strand.x}
                  cy={strand.y}
                  r="12"
                  fill="url(#strandGradient)"
                  stroke="#10B981"
                  strokeWidth="2"
                  opacity={activeLayer === 'strand' || !activeLayer ? 1 : 0.2}
                  filter={hoveredElement === strand.id ? 'url(#glow)' : ''}
                />
                {/* Document icon */}
                <path
                  d={`M ${strand.x - 4} ${strand.y - 4} L ${strand.x + 2} ${strand.y - 4} L ${strand.x + 4} ${strand.y - 2} L ${strand.x + 4} ${strand.y + 4} L ${strand.x - 4} ${strand.y + 4} Z`}
                  fill="white"
                  opacity={activeLayer === 'strand' || !activeLayer ? 1 : 0.3}
                />
              </g>
            ))}

            {/* Strands in Loom 2 */}
            {[
              { x: 230, y: 330, id: 's6' },
              { x: 250, y: 320, id: 's7' },
              { x: 270, y: 330, id: 's8' },
              { x: 240, y: 350, id: 's9' },
            ].map((strand) => (
              <g
                key={strand.id}
                onMouseEnter={() => {
                  setActiveLayer('strand')
                  setHoveredElement(strand.id)
                }}
                onMouseLeave={() => {
                  setActiveLayer(null)
                  setHoveredElement(null)
                }}
              >
                <circle
                  cx={strand.x}
                  cy={strand.y}
                  r="12"
                  fill="url(#strandGradient)"
                  stroke="#10B981"
                  strokeWidth="2"
                  opacity={activeLayer === 'strand' || !activeLayer ? 1 : 0.2}
                  filter={hoveredElement === strand.id ? 'url(#glow)' : ''}
                />
                <path
                  d={`M ${strand.x - 4} ${strand.y - 4} L ${strand.x + 2} ${strand.y - 4} L ${strand.x + 4} ${strand.y - 2} L ${strand.x + 4} ${strand.y + 4} L ${strand.x - 4} ${strand.y + 4} Z`}
                  fill="white"
                  opacity={activeLayer === 'strand' || !activeLayer ? 1 : 0.3}
                />
              </g>
            ))}

            {/* Strands in Loom 3 */}
            {[
              { x: 530, y: 330, id: 's10' },
              { x: 550, y: 320, id: 's11' },
              { x: 570, y: 330, id: 's12' },
              { x: 540, y: 350, id: 's13' },
              { x: 560, y: 360, id: 's14' },
            ].map((strand) => (
              <g
                key={strand.id}
                onMouseEnter={() => {
                  setActiveLayer('strand')
                  setHoveredElement(strand.id)
                }}
                onMouseLeave={() => {
                  setActiveLayer(null)
                  setHoveredElement(null)
                }}
              >
                <circle
                  cx={strand.x}
                  cy={strand.y}
                  r="12"
                  fill="url(#strandGradient)"
                  stroke="#10B981"
                  strokeWidth="2"
                  opacity={activeLayer === 'strand' || !activeLayer ? 1 : 0.2}
                  filter={hoveredElement === strand.id ? 'url(#glow)' : ''}
                />
                <path
                  d={`M ${strand.x - 4} ${strand.y - 4} L ${strand.x + 2} ${strand.y - 4} L ${strand.x + 4} ${strand.y - 2} L ${strand.x + 4} ${strand.y + 4} L ${strand.x - 4} ${strand.y + 4} Z`}
                  fill="white"
                  opacity={activeLayer === 'strand' || !activeLayer ? 1 : 0.3}
                />
              </g>
            ))}
          </motion.g>

          {/* Connection Lines */}
          <g opacity={activeLayer ? 0.8 : 0.4}>
            {/* Weave to Looms */}
            <line x1="400" y1="100" x2="400" y2="100" stroke="#8B5CF6" strokeWidth="2" markerEnd="url(#arrowhead)">
              <animate attributeName="y2" from="100" to="100" dur="1s" fill="freeze" />
            </line>
            <path d="M 400 100 Q 350 150, 320 280" stroke="#8B5CF6" strokeWidth="2" fill="none" strokeDasharray="5,5" opacity="0.6">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite" />
            </path>
            <path d="M 400 100 Q 450 150, 480 280" stroke="#8B5CF6" strokeWidth="2" fill="none" strokeDasharray="5,5" opacity="0.6">
              <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite" />
            </path>

            {/* Relationships between strands */}
            {activeLayer === 'strand' && (
              <>
                <line x1="400" y1="140" x2="385" y2="170" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
                <line x1="415" y1="170" x2="430" y2="150" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
                <line x1="250" y1="320" x2="240" y2="350" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
              </>
            )}
          </g>

          {/* Central Info Node */}
          <g>
            <circle cx="400" cy="300" r="40" fill="white" stroke="#8B5CF6" strokeWidth="3" filter="url(#glow)" />
            <text x="400" y="295" textAnchor="middle" className="fill-purple-600 font-bold text-sm">Frame</text>
            <text x="400" y="310" textAnchor="middle" className="fill-purple-500 text-xs">Codex</text>
          </g>

          {/* Animated particles */}
          {[...Array(20)].map((_, i) => (
            <circle
              key={`particle-${i}`}
              r="2"
              fill={i % 3 === 0 ? '#8B5CF6' : i % 3 === 1 ? '#3B82F6' : '#10B981'}
              opacity="0.4"
            >
              <animateMotion
                dur={`${10 + i * 2}s`}
                repeatCount="indefinite"
                path={`M ${100 + i * 30} ${100 + (i % 5) * 80} Q ${400 + Math.sin(i) * 100} ${300 + Math.cos(i) * 100}, ${700 - i * 30} ${500 - (i % 5) * 80}`}
              />
            </circle>
          ))}
        </svg>

        {/* Info Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-8 grid grid-cols-3 gap-6"
        >
          {/* Weave Card */}
          <div
            className={`bg-white dark:bg-gray-900 rounded-xl p-6 border-2 transition-all cursor-pointer ${
              activeLayer === 'weave' ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-gray-200 dark:border-gray-800'
            }`}
            onMouseEnter={() => setActiveLayer('weave')}
            onMouseLeave={() => setActiveLayer(null)}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                W
              </div>
              <div>
                <h3 className="font-bold text-lg">Weave</h3>
                <p className="text-xs text-gray-500">Universe</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A complete, self-contained knowledge universe. No relationships exist between different weaves.
            </p>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="text-xs text-gray-500">Example:</div>
              <code className="text-xs bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded mt-1 block">
                weaves/frame/
              </code>
            </div>
          </div>

          {/* Loom Card */}
          <div
            className={`bg-white dark:bg-gray-900 rounded-xl p-6 border-2 transition-all cursor-pointer ${
              activeLayer === 'loom' ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-gray-200 dark:border-gray-800'
            }`}
            onMouseEnter={() => setActiveLayer('loom')}
            onMouseLeave={() => setActiveLayer(null)}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                L
              </div>
              <div>
                <h3 className="font-bold text-lg">Loom</h3>
                <p className="text-xs text-gray-500">Collection</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A curated collection of related strands. Defines ordering and relationships within a topic.
            </p>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="text-xs text-gray-500">Example:</div>
              <code className="text-xs bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded mt-1 block">
                looms/openstrand/
              </code>
            </div>
          </div>

          {/* Strand Card */}
          <div
            className={`bg-white dark:bg-gray-900 rounded-xl p-6 border-2 transition-all cursor-pointer ${
              activeLayer === 'strand' ? 'border-green-500 shadow-lg shadow-green-500/20' : 'border-gray-200 dark:border-gray-800'
            }`}
            onMouseEnter={() => setActiveLayer('strand')}
            onMouseLeave={() => setActiveLayer(null)}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-xl">
                S
              </div>
              <div>
                <h3 className="font-bold text-lg">Strand</h3>
                <p className="text-xs text-gray-500">Unit</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              An atomic unit of knowledge. Can be a document, image, dataset, or any content type.
            </p>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="text-xs text-gray-500">Example:</div>
              <code className="text-xs bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded mt-1 block">
                architecture.md
              </code>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Detailed Relationship Diagram */}
      <div className="mt-12 bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800">
        <h3 className="text-2xl font-bold mb-6 text-center">Knowledge Flow & Relationships</h3>
        
        <svg viewBox="0 0 1000 400" className="w-full h-auto">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#6B7280" />
            </marker>
            <marker id="arrow-green" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#10B981" />
            </marker>
            <marker id="arrow-blue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#3B82F6" />
            </marker>
          </defs>

          {/* Weave Container */}
          <rect x="50" y="50" width="900" height="300" rx="20" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeDasharray="10,5" />
          <text x="500" y="35" textAnchor="middle" className="fill-purple-600 font-bold text-lg">WEAVE: Frame Ecosystem</text>

          {/* Loom 1: Getting Started */}
          <g>
            <rect x="100" y="100" width="220" height="220" rx="15" fill="#EEF2FF" stroke="#3B82F6" strokeWidth="2" />
            <text x="210" y="130" textAnchor="middle" className="fill-blue-600 font-semibold">Loom: Getting Started</text>
            
            {/* Strands */}
            <g>
              <rect x="120" y="150" width="180" height="40" rx="8" fill="#10B981" fillOpacity="0.2" stroke="#10B981" strokeWidth="1.5" />
              <text x="210" y="175" textAnchor="middle" className="fill-green-700 text-sm">Strand: Installation</text>
            </g>
            <g>
              <rect x="120" y="200" width="180" height="40" rx="8" fill="#10B981" fillOpacity="0.2" stroke="#10B981" strokeWidth="1.5" />
              <text x="210" y="225" textAnchor="middle" className="fill-green-700 text-sm">Strand: Quick Start</text>
            </g>
            <g>
              <rect x="120" y="250" width="180" height="40" rx="8" fill="#10B981" fillOpacity="0.2" stroke="#10B981" strokeWidth="1.5" />
              <text x="210" y="275" textAnchor="middle" className="fill-green-700 text-sm">Strand: Core Concepts</text>
            </g>

            {/* Sequential arrows */}
            <line x1="210" y1="190" x2="210" y2="200" stroke="#10B981" strokeWidth="2" markerEnd="url(#arrow-green)" />
            <line x1="210" y1="240" x2="210" y2="250" stroke="#10B981" strokeWidth="2" markerEnd="url(#arrow-green)" />
          </g>

          {/* Loom 2: Architecture */}
          <g>
            <rect x="370" y="100" width="220" height="220" rx="15" fill="#EEF2FF" stroke="#3B82F6" strokeWidth="2" />
            <text x="480" y="130" textAnchor="middle" className="fill-blue-600 font-semibold">Loom: Architecture</text>
            
            {/* Strands */}
            <g>
              <rect x="390" y="150" width="180" height="40" rx="8" fill="#10B981" fillOpacity="0.2" stroke="#10B981" strokeWidth="1.5" />
              <text x="480" y="175" textAnchor="middle" className="fill-green-700 text-sm">Strand: Overview</text>
            </g>
            <g>
              <rect x="390" y="200" width="180" height="40" rx="8" fill="#10B981" fillOpacity="0.2" stroke="#10B981" strokeWidth="1.5" />
              <text x="480" y="225" textAnchor="middle" className="fill-green-700 text-sm">Strand: Components</text>
            </g>
            <g>
              <rect x="390" y="250" width="180" height="40" rx="8" fill="#10B981" fillOpacity="0.2" stroke="#10B981" strokeWidth="1.5" />
              <text x="480" y="275" textAnchor="middle" className="fill-green-700 text-sm">Strand: Patterns</text>
            </g>
          </g>

          {/* Loom 3: API Reference */}
          <g>
            <rect x="640" y="100" width="220" height="220" rx="15" fill="#EEF2FF" stroke="#3B82F6" strokeWidth="2" />
            <text x="750" y="130" textAnchor="middle" className="fill-blue-600 font-semibold">Loom: API Reference</text>
            
            {/* Strands */}
            <g>
              <rect x="660" y="150" width="180" height="40" rx="8" fill="#10B981" fillOpacity="0.2" stroke="#10B981" strokeWidth="1.5" />
              <text x="750" y="175" textAnchor="middle" className="fill-green-700 text-sm">Strand: Endpoints</text>
            </g>
            <g>
              <rect x="660" y="200" width="180" height="40" rx="8" fill="#10B981" fillOpacity="0.2" stroke="#10B981" strokeWidth="1.5" />
              <text x="750" y="225" textAnchor="middle" className="fill-green-700 text-sm">Strand: Auth</text>
            </g>
          </g>

          {/* Cross-loom references (dashed) */}
          <path d="M 300 270 Q 400 280, 480 220" stroke="#F59E0B" strokeWidth="2" strokeDasharray="5,5" fill="none" opacity="0.5" markerEnd="url(#arrow)" />
          <text x="400" y="260" textAnchor="middle" className="fill-orange-600 text-xs">references</text>

          <path d="M 570 220 Q 650 180, 750 190" stroke="#F59E0B" strokeWidth="2" strokeDasharray="5,5" fill="none" opacity="0.5" markerEnd="url(#arrow)" />
          <text x="660" y="175" textAnchor="middle" className="fill-orange-600 text-xs">requires</text>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-8 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-6">
        <h4 className="font-semibold mb-4">Relationship Types</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <svg width="40" height="20">
              <line x1="0" y1="10" x2="40" y2="10" stroke="#8B5CF6" strokeWidth="2" />
            </svg>
            <span>Contains (Weave → Loom)</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="40" height="20">
              <line x1="0" y1="10" x2="40" y2="10" stroke="#10B981" strokeWidth="2" strokeDasharray="3,3" />
            </svg>
            <span>Sequential (Strand → Strand)</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="40" height="20">
              <line x1="0" y1="10" x2="40" y2="10" stroke="#F59E0B" strokeWidth="2" strokeDasharray="5,5" />
            </svg>
            <span>References (Cross-loom)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
