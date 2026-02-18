/**
 * Mobile Canvas Toolbar - Bottom-positioned touch-friendly toolbar
 * @module codex/ui/canvas/MobileCanvasToolbar
 *
 * @remarks
 * Touch-optimized toolbar for mobile canvas interactions:
 * - 48px minimum touch targets
 * - Bottom positioning (thumb-reachable)
 * - Safe area inset support
 * - Quick access to common tools
 */

'use client'

import React, { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MousePointer2,
  PenTool,
  Eraser,
  Square,
  Circle,
  Mic,
  Camera,
  Type,
  Undo2,
  Redo2,
  Hand,
} from 'lucide-react'
import type { Editor } from '@tldraw/tldraw'
import { useHaptics } from '../../hooks/useHaptics'
import type { ThemeName } from '@/types/theme'

interface ToolButton {
  id: string
  label: string
  icon: React.ReactNode
  toolId?: string
  onClick?: () => void
}

interface MobileCanvasToolbarProps {
  /** tldraw Editor instance */
  editor: Editor | null
  /** Current active tool */
  activeTool?: string
  /** Whether canvas can undo */
  canUndo?: boolean
  /** Whether canvas can redo */
  canRedo?: boolean
  /** Undo callback */
  onUndo?: () => void
  /** Redo callback */
  onRedo?: () => void
  /** Open voice recorder */
  onOpenVoice?: () => void
  /** Open camera */
  onOpenCamera?: () => void
  /** Current theme */
  theme?: ThemeName
  /** Whether toolbar is visible */
  visible?: boolean
}

/**
 * Bottom-positioned mobile toolbar for canvas
 *
 * @example
 * ```tsx
 * import MobileCanvasToolbar from './canvas/MobileCanvasToolbar'
 * import { useIsTouchDevice } from '../../hooks/useIsTouchDevice'
 *
 * function WhiteboardCanvas({ editor }) {
 *   const isMobile = useIsTouchDevice()
 *   const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false)
 *
 *   return (
 *     <>
 *       <Tldraw onMount={setEditor} />
 *
 *       <MobileCanvasToolbar
 *         editor={editor}
 *         activeTool={editor?.currentToolId}
 *         canUndo={editor?.canUndo}
 *         canRedo={editor?.canRedo}
 *         onOpenVoice={() => setVoiceRecorderOpen(true)}
 *         onOpenCamera={() => openCameraCapture()}
 *         theme="dark"
 *         visible={isMobile}
 *       />
 *     </>
 *   )
 * }
 * ```
 */
export default function MobileCanvasToolbar({
  editor,
  activeTool = 'select',
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onOpenVoice,
  onOpenCamera,
  theme = 'light',
  visible = true,
}: MobileCanvasToolbarProps) {
  const { haptic } = useHaptics()
  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')

  // Handle tool selection
  const handleToolSelect = useCallback(
    (toolId: string) => {
      if (!editor) return
      haptic('light')
      editor.setCurrentTool(toolId)
    },
    [editor, haptic]
  )

  // Handle undo
  const handleUndo = useCallback(() => {
    haptic('light')
    if (onUndo) {
      onUndo()
    } else if (editor) {
      editor.undo()
    }
  }, [editor, haptic, onUndo])

  // Handle redo
  const handleRedo = useCallback(() => {
    haptic('light')
    if (onRedo) {
      onRedo()
    } else if (editor) {
      editor.redo()
    }
  }, [editor, haptic, onRedo])

  // Tool definitions
  const tools: ToolButton[] = [
    {
      id: 'select',
      label: 'Select',
      icon: <MousePointer2 className="w-5 h-5" />,
      toolId: 'select',
    },
    {
      id: 'hand',
      label: 'Pan',
      icon: <Hand className="w-5 h-5" />,
      toolId: 'hand',
    },
    {
      id: 'draw',
      label: 'Draw',
      icon: <PenTool className="w-5 h-5" />,
      toolId: 'draw',
    },
    {
      id: 'eraser',
      label: 'Eraser',
      icon: <Eraser className="w-5 h-5" />,
      toolId: 'eraser',
    },
    {
      id: 'geo',
      label: 'Shape',
      icon: <Square className="w-5 h-5" />,
      toolId: 'geo',
    },
    {
      id: 'text',
      label: 'Text',
      icon: <Type className="w-5 h-5" />,
      toolId: 'text',
    },
  ]

  // Media tools (voice, camera)
  const mediaTools: ToolButton[] = [
    ...(onOpenVoice
      ? [
          {
            id: 'voice',
            label: 'Voice',
            icon: <Mic className="w-5 h-5" />,
            onClick: () => {
              haptic('medium')
              onOpenVoice()
            },
          },
        ]
      : []),
    ...(onOpenCamera
      ? [
          {
            id: 'camera',
            label: 'Camera',
            icon: <Camera className="w-5 h-5" />,
            onClick: () => {
              haptic('medium')
              onOpenCamera()
            },
          },
        ]
      : []),
  ]

  // Theme classes
  const bgClasses = isTerminal
    ? isDark
      ? 'bg-black/95 border-green-500/30'
      : 'bg-zinc-900/95 border-amber-500/30'
    : isDark
      ? 'bg-zinc-900/95 border-zinc-700/50'
      : 'bg-white/95 border-zinc-200/50'

  const activeClasses = isTerminal
    ? isDark
      ? 'bg-green-600 text-black'
      : 'bg-amber-500 text-black'
    : 'bg-cyan-500 text-white'

  const inactiveClasses = isTerminal
    ? isDark
      ? 'text-green-400 hover:bg-green-950/50'
      : 'text-amber-400 hover:bg-amber-950/50'
    : isDark
      ? 'text-zinc-400 hover:bg-zinc-800'
      : 'text-zinc-600 hover:bg-zinc-100'

  const disabledClasses = 'opacity-30 cursor-not-allowed'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`
            fixed bottom-0 left-0 right-0
            z-[201]
            pb-safe
          `}
        >
          <div
            className={`
              mx-4 mb-4 p-2 rounded-2xl
              border backdrop-blur-xl shadow-2xl
              ${bgClasses}
            `}
          >
            <div className="flex items-center justify-between gap-1">
              {/* Undo/Redo */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    transition-colors
                    ${canUndo ? inactiveClasses : disabledClasses}
                  `}
                  aria-label="Undo"
                >
                  <Undo2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    transition-colors
                    ${canRedo ? inactiveClasses : disabledClasses}
                  `}
                  aria-label="Redo"
                >
                  <Redo2 className="w-5 h-5" />
                </button>
              </div>

              {/* Separator */}
              <div
                className={`
                  w-px h-8
                  ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}
                `}
              />

              {/* Drawing Tools */}
              <div className="flex items-center gap-1 flex-1 justify-center overflow-x-auto">
                {tools.map((tool) => {
                  const isActive = activeTool === tool.toolId

                  return (
                    <button
                      key={tool.id}
                      onClick={() => tool.toolId && handleToolSelect(tool.toolId)}
                      className={`
                        w-12 h-12 rounded-xl flex items-center justify-center
                        transition-colors flex-shrink-0
                        ${isActive ? activeClasses : inactiveClasses}
                      `}
                      aria-label={tool.label}
                      aria-pressed={isActive}
                    >
                      {tool.icon}
                    </button>
                  )
                })}
              </div>

              {/* Separator */}
              {mediaTools.length > 0 && (
                <div
                  className={`
                    w-px h-8
                    ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}
                  `}
                />
              )}

              {/* Media Tools */}
              {mediaTools.length > 0 && (
                <div className="flex items-center gap-1">
                  {mediaTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={tool.onClick}
                      className={`
                        w-12 h-12 rounded-xl flex items-center justify-center
                        transition-colors
                        ${inactiveClasses}
                      `}
                      aria-label={tool.label}
                    >
                      {tool.icon}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
