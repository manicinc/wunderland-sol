/**
 * Mermaid Diagram Component
 * @module codex/ui/MermaidDiagram
 *
 * @remarks
 * Renders Mermaid diagrams with:
 * - Flowcharts, sequence diagrams, class diagrams
 * - Mindmaps (mermaid v10+)
 * - State diagrams, ER diagrams, Gantt charts
 * - Theme-aware styling
 * - Interactive pan/zoom
 * - Error handling with fallback
 * - Export to SVG/PNG
 */

'use client'

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  Download,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Code,
  Eye,
  Edit3
} from 'lucide-react'
import mermaid from 'mermaid'

interface MermaidDiagramProps {
  /** Mermaid diagram code */
  code: string
  /** Unique ID for the diagram */
  id?: string
  /** Current theme */
  theme?: 'light' | 'dark' | 'sepia-light' | 'sepia-dark'
  /** Show toolbar */
  showToolbar?: boolean
  /** Allow editing */
  editable?: boolean
  /** Callback when code changes */
  onCodeChange?: (code: string) => void
  /** Custom className */
  className?: string
  /** Max height constraint */
  maxHeight?: string
}

// Theme configurations for Mermaid
const MERMAID_THEMES = {
  'light': {
    theme: 'default',
    themeVariables: {
      primaryColor: '#10b981',
      primaryTextColor: '#1f2937',
      primaryBorderColor: '#059669',
      secondaryColor: '#06b6d4',
      tertiaryColor: '#f3f4f6',
      lineColor: '#6b7280',
      textColor: '#1f2937',
      mainBkg: '#ffffff',
      nodeBorder: '#059669',
      clusterBkg: '#f0fdf4',
      titleColor: '#111827',
      edgeLabelBackground: '#ffffff',
    },
  },
  'dark': {
    theme: 'dark',
    themeVariables: {
      primaryColor: '#34d399',
      primaryTextColor: '#f3f4f6',
      primaryBorderColor: '#10b981',
      secondaryColor: '#22d3ee',
      tertiaryColor: '#374151',
      lineColor: '#9ca3af',
      textColor: '#f3f4f6',
      mainBkg: '#1f2937',
      nodeBorder: '#10b981',
      clusterBkg: '#064e3b',
      titleColor: '#f9fafb',
      edgeLabelBackground: '#1f2937',
    },
  },
  'sepia-light': {
    theme: 'default',
    themeVariables: {
      primaryColor: '#d97706',
      primaryTextColor: '#78350f',
      primaryBorderColor: '#b45309',
      secondaryColor: '#a3622e',
      tertiaryColor: '#fef3c7',
      lineColor: '#92400e',
      textColor: '#78350f',
      mainBkg: '#fffbeb',
      nodeBorder: '#b45309',
      clusterBkg: '#fef3c7',
      titleColor: '#451a03',
      edgeLabelBackground: '#fffbeb',
    },
  },
  'sepia-dark': {
    theme: 'dark',
    themeVariables: {
      primaryColor: '#fbbf24',
      primaryTextColor: '#fef3c7',
      primaryBorderColor: '#f59e0b',
      secondaryColor: '#d97706',
      tertiaryColor: '#44403c',
      lineColor: '#a8a29e',
      textColor: '#fef3c7',
      mainBkg: '#292524',
      nodeBorder: '#f59e0b',
      clusterBkg: '#44403c',
      titleColor: '#fef3c7',
      edgeLabelBackground: '#292524',
    },
  },
}

/**
 * Mermaid Diagram Renderer with full features
 */
export default function MermaidDiagram(props: MermaidDiagramProps | null | undefined) {
  // Use nullish coalescing to provide defaults for all props
  // This handles cases where props or individual values are null/undefined
  const safeProps = props ?? {} as Partial<MermaidDiagramProps>
  const code = safeProps.code ?? ''
  const id = safeProps.id
  const theme = safeProps.theme ?? 'light'
  const showToolbar = safeProps.showToolbar ?? true
  const editable = safeProps.editable ?? false
  const onCodeChange = safeProps.onCodeChange
  const className = safeProps.className ?? ''
  const maxHeight = safeProps.maxHeight ?? '500px'

  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editCode, setEditCode] = useState(code)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const diagramId = useMemo(() => id || `mermaid-${Math.random().toString(36).slice(2, 9)}`, [id])
  const isDark = theme.includes('dark')

  // Initialize and render mermaid
  useEffect(() => {
    const renderDiagram = async () => {
      if (!code || !code.trim()) {
        setSvg('')
        setError(null)
        return
      }

      try {
        // Initialize mermaid with theme
        const themeConfig = MERMAID_THEMES[theme] || MERMAID_THEMES['light']

        mermaid.initialize({
          startOnLoad: false,
          theme: themeConfig.theme as 'default' | 'dark',
          themeVariables: themeConfig.themeVariables,
          securityLevel: 'loose',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
          },
          mindmap: {
            useMaxWidth: true,
            padding: 16,
          },
          sequence: {
            useMaxWidth: true,
            diagramMarginX: 20,
            diagramMarginY: 20,
          },
        })

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(diagramId, code)
        setSvg(renderedSvg)
        setError(null)
      } catch (err) {
        console.error('[MermaidDiagram] Render error:', err)
        setError(err instanceof Error ? err.message : 'Failed to render diagram')
        setSvg('')
      }
    }

    renderDiagram()
  }, [code, theme, diagramId])

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.25))
  }, [])

  const handleResetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  // Handle panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    }
  }, [isPanning, panStart])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom(prev => Math.max(0.25, Math.min(3, prev + delta)))
    }
  }, [])

  // Export functions
  const exportSVG = useCallback(() => {
    if (!svg) return

    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diagram-${diagramId}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }, [svg, diagramId])

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  // Handle code editing
  const handleApplyEdit = useCallback(() => {
    if (onCodeChange) {
      onCodeChange(editCode)
    }
    setIsEditing(false)
  }, [editCode, onCodeChange])

  const handleCancelEdit = useCallback(() => {
    setEditCode(code)
    setIsEditing(false)
  }, [code])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])

  // Detect diagram type for display
  const diagramType = useMemo(() => {
    if (!code) return 'Diagram'
    const firstLine = code.trim().split('\n')[0].toLowerCase()
    if (firstLine.includes('mindmap')) return 'Mindmap'
    if (firstLine.includes('flowchart') || firstLine.includes('graph')) return 'Flowchart'
    if (firstLine.includes('sequencediagram') || firstLine.includes('sequence')) return 'Sequence'
    if (firstLine.includes('classdiagram') || firstLine.includes('class')) return 'Class Diagram'
    if (firstLine.includes('statediagram') || firstLine.includes('state')) return 'State Diagram'
    if (firstLine.includes('erdiagram') || firstLine.includes('er')) return 'ER Diagram'
    if (firstLine.includes('gantt')) return 'Gantt Chart'
    if (firstLine.includes('pie')) return 'Pie Chart'
    if (firstLine.includes('journey')) return 'User Journey'
    if (firstLine.includes('gitgraph') || firstLine.includes('git')) return 'Git Graph'
    return 'Diagram'
  }, [code])

  const containerClasses = isFullscreen
    ? 'fixed inset-0 z-50 bg-white dark:bg-zinc-900'
    : `relative rounded-xl overflow-hidden border ${isDark ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-200 bg-white'} ${className}`

  return (
    <div className={containerClasses}>
      {/* Toolbar */}
      {showToolbar && (
        <div className={`
          flex items-center justify-between px-3 py-2 border-b
          ${isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'}
        `}>
          <div className="flex items-center gap-2">
            <span className={`
              px-2 py-0.5 rounded text-xs font-medium
              ${isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}
            `}>
              {diagramType}
            </span>
            <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Mermaid
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Zoom controls */}
            <button
              onClick={handleZoomOut}
              className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className={`text-xs w-12 text-center ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetView}
              className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}
              title="Reset view"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className={`w-px h-4 mx-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

            {/* Edit toggle */}
            {editable && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`p-1.5 rounded transition-colors ${
                  isEditing
                    ? isDark ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700'
                    : isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'
                }`}
                title={isEditing ? 'Preview' : 'Edit code'}
              >
                {isEditing ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              </button>
            )}

            {/* Copy code */}
            <button
              onClick={copyCode}
              className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}
              title="Copy code"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Code className="w-4 h-4" />}
            </button>

            {/* Export SVG */}
            <button
              onClick={exportSVG}
              disabled={!svg}
              className={`p-1.5 rounded transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}
              title="Export SVG"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div
        className={`relative ${isFullscreen ? 'h-[calc(100%-48px)]' : ''}`}
        style={{ maxHeight: isFullscreen ? undefined : maxHeight }}
      >
        <AnimatePresence mode="wait">
          {isEditing ? (
            /* Code Editor */
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              <textarea
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                className={`
                  flex-1 w-full p-4 font-mono text-sm resize-none outline-none
                  ${isDark
                    ? 'bg-zinc-900 text-zinc-100'
                    : 'bg-white text-zinc-900'
                  }
                `}
                placeholder="Enter Mermaid diagram code..."
                spellCheck={false}
              />
              <div className={`
                flex justify-end gap-2 p-3 border-t
                ${isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'}
              `}>
                <button
                  onClick={handleCancelEdit}
                  className={`
                    px-3 py-1.5 text-sm rounded-lg transition-colors
                    ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}
                  `}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyEdit}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                    ${isDark
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }
                  `}
                >
                  Apply Changes
                </button>
              </div>
            </motion.div>
          ) : error ? (
            /* Error State */
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`
                flex flex-col items-center justify-center p-8 text-center
                ${isDark ? 'text-red-400' : 'text-red-600'}
              `}
            >
              <AlertCircle className="w-8 h-8 mb-3" />
              <p className="font-medium mb-2">Failed to render diagram</p>
              <p className={`text-sm max-w-md ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {error}
              </p>
              <pre className={`
                mt-4 p-3 rounded-lg text-xs text-left max-w-full overflow-auto
                ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
              `}>
                {code}
              </pre>
            </motion.div>
          ) : svg ? (
            /* Rendered Diagram */
            <motion.div
              key="diagram"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              ref={containerRef}
              className="overflow-auto cursor-grab active:cursor-grabbing"
              style={{
                maxHeight: isFullscreen ? '100%' : maxHeight,
                height: isFullscreen ? '100%' : 'auto',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              <div
                className="p-6 min-w-max transition-transform duration-100"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transformOrigin: 'center center',
                }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </motion.div>
          ) : (
            /* Loading State */
            <div className="flex items-center justify-center p-8">
              <div className={`
                w-8 h-8 rounded-full border-2 animate-spin
                ${isDark ? 'border-zinc-600 border-t-emerald-400' : 'border-zinc-300 border-t-emerald-500'}
              `} />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/**
 * Inline Mermaid renderer for markdown code blocks
 * Smaller, simpler version without full toolbar
 */
export function InlineMermaid(props: {
  code: string
  theme?: 'light' | 'dark' | 'sepia-light' | 'sepia-dark'
} | null | undefined) {
  // Use nullish coalescing to provide defaults
  const safeProps = props ?? {} as { code?: string; theme?: string }
  const code = safeProps.code ?? ''
  const theme = (safeProps.theme ?? 'light') as 'light' | 'dark' | 'sepia-light' | 'sepia-dark'

  return (
    <MermaidDiagram
      code={code}
      theme={theme}
      showToolbar={true}
      editable={false}
      maxHeight="400px"
    />
  )
}

/**
 * Mermaid code block detector
 * Use this to check if a code block should be rendered as mermaid
 */
export function isMermaidCode(language: string): boolean {
  return ['mermaid', 'mmd'].includes(language.toLowerCase())
}

/**
 * Example mermaid diagrams for templates
 */
export const MERMAID_TEMPLATES = {
  flowchart: `flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[Deploy]`,

  mindmap: `mindmap
  root((Knowledge))
    Origins
      Long history
      Popularisation
        British popular psychology author Tony Buzan
    Research
      On effectiveness
        On memorization
        On reading
      On creation
    Tools
      Pen and paper
      Mermaid`,

  sequence: `sequenceDiagram
    participant U as User
    participant S as Server
    participant D as Database

    U->>S: Request data
    S->>D: Query
    D-->>S: Results
    S-->>U: Response`,

  classDiagram: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    class Cat {
        +String color
        +meow()
    }
    Animal <|-- Dog
    Animal <|-- Cat`,

  stateDiagram: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: Start
    Processing --> Success: Complete
    Processing --> Error: Fail
    Error --> Idle: Reset
    Success --> [*]`,

  erDiagram: `erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : includes`,

  gantt: `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Planning
        Research      :a1, 2024-01-01, 7d
        Design        :a2, after a1, 5d
    section Development
        Backend       :a3, after a2, 14d
        Frontend      :a4, after a2, 14d
    section Testing
        QA            :a5, after a3, 7d`,

  pie: `pie title Content Distribution
    "Articles" : 45
    "Videos" : 30
    "Podcasts" : 15
    "Other" : 10`,

  journey: `journey
    title User Onboarding Experience
    section Sign Up
        Visit homepage: 5: User
        Click sign up: 4: User
        Fill form: 3: User
        Verify email: 4: User
    section First Use
        Complete tutorial: 4: User
        Create first item: 5: User`,

  gitGraph: `gitGraph
    commit id: "Initial"
    branch develop
    commit id: "Feature A"
    branch feature-b
    commit id: "Feature B start"
    checkout develop
    commit id: "Feature A complete"
    checkout feature-b
    commit id: "Feature B complete"
    checkout develop
    merge feature-b
    checkout main
    merge develop`,
}
