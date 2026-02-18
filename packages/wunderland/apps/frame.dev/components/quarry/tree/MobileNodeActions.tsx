/**
 * Mobile-optimized node actions with swipe gestures and bottom sheet
 * @module codex/tree/MobileNodeActions
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  ExternalLink,
  FolderPlus,
  FileText,
  Link,
  Eye,
  ChevronUp,
  MoreHorizontal,
  X,
  Check,
} from 'lucide-react'
import type { CodexTreeNode } from './types'

interface MobileNodeActionsProps {
  /** Tree node data */
  node: CodexTreeNode
  /** Whether the node can have children */
  canHaveChildren: boolean
  /** Whether the action sheet is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Callback for edit/rename action */
  onEdit?: () => void
  /** Callback for delete action */
  onDelete?: () => void
  /** Callback for create new strand */
  onCreateStrand?: () => void
  /** Callback for create new folder */
  onCreateFolder?: () => void
  /** Callback for open in new tab */
  onOpenExternal?: () => void
  /** Callback for preview */
  onPreview?: () => void
  /** Callback for copy slug */
  onCopySlug?: () => void
  /** Callback for copy path */
  onCopyPath?: () => void
  /** Callback for copy markdown link */
  onCopyMarkdownLink?: () => void
  /** Whether dark mode is enabled */
  isDark?: boolean
}

interface SwipeableRowProps {
  /** Tree node data */
  node: CodexTreeNode
  /** Children content */
  children: React.ReactNode
  /** Swipe left action (delete) */
  onSwipeLeft?: () => void
  /** Swipe right action (quick action) */
  onSwipeRight?: () => void
  /** Long press to show actions */
  onLongPress?: () => void
  /** Whether dark mode is enabled */
  isDark?: boolean
}

/**
 * Swipeable row wrapper for mobile tree nodes
 */
export function SwipeableRow({
  node,
  children,
  onSwipeLeft,
  onSwipeRight,
  onLongPress,
  isDark = false,
}: SwipeableRowProps) {
  const controls = useAnimation()
  const [isSwipedLeft, setIsSwipedLeft] = useState(false)
  const [isSwipedRight, setIsSwipedRight] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const startPos = useRef({ x: 0, y: 0 })
  
  const SWIPE_THRESHOLD = 80
  const ACTION_WIDTH = 80
  
  // Reset swipe state
  const resetSwipe = useCallback(() => {
    controls.start({ x: 0 })
    setIsSwipedLeft(false)
    setIsSwipedRight(false)
  }, [controls])
  
  // Handle drag end
  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      const offset = info.offset.x
      const velocity = info.velocity.x
      
      // Fast swipe detection
      const isFastSwipe = Math.abs(velocity) > 500
      
      if (offset < -SWIPE_THRESHOLD || (isFastSwipe && velocity < 0)) {
        // Swiped left - reveal delete
        controls.start({ x: -ACTION_WIDTH })
        setIsSwipedLeft(true)
        setIsSwipedRight(false)
      } else if (offset > SWIPE_THRESHOLD || (isFastSwipe && velocity > 0)) {
        // Swiped right - quick action
        if (onSwipeRight) {
          controls.start({ x: ACTION_WIDTH })
          setIsSwipedRight(true)
          setIsSwipedLeft(false)
        } else {
          resetSwipe()
        }
      } else {
        resetSwipe()
      }
    },
    [controls, onSwipeRight, resetSwipe]
  )
  
  // Long press handling
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      startPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      }
      
      longPressTimer.current = setTimeout(() => {
        // Trigger haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(50)
        }
        onLongPress?.()
      }, 500)
    },
    [onLongPress]
  )
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const moveX = Math.abs(e.touches[0].clientX - startPos.current.x)
    const moveY = Math.abs(e.touches[0].clientY - startPos.current.y)
    
    // Cancel long press if user is scrolling or swiping
    if (moveX > 10 || moveY > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }
  }, [])
  
  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])
  
  return (
    <div className="relative overflow-hidden">
      {/* Left action (revealed on right swipe) - Quick Action */}
      {onSwipeRight && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center bg-emerald-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: isSwipedRight ? 1 : 0 }}
        >
          <button
            onClick={() => {
              onSwipeRight()
              resetSwipe()
            }}
            className="p-3 text-white"
          >
            <Plus className="w-6 h-6" />
          </button>
        </motion.div>
      )}
      
      {/* Right action (revealed on left swipe) - Delete */}
      {onSwipeLeft && (
        <motion.div
          className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-red-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: isSwipedLeft ? 1 : 0 }}
        >
          <button
            onClick={() => {
              onSwipeLeft()
              resetSwipe()
            }}
            className="p-3 text-white"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </motion.div>
      )}
      
      {/* Main content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -ACTION_WIDTH, right: onSwipeRight ? ACTION_WIDTH : 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative ${isDark ? 'bg-zinc-950' : 'bg-white'}`}
      >
        {children}
      </motion.div>
    </div>
  )
}

/**
 * Mobile action sheet (bottom sheet) for node actions
 */
export default function MobileNodeActions({
  node,
  canHaveChildren,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onCreateStrand,
  onCreateFolder,
  onOpenExternal,
  onPreview,
  onCopySlug,
  onCopyPath,
  onCopyMarkdownLink,
  isDark = false,
}: MobileNodeActionsProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null)
  
  const handleCopy = useCallback((text: string, label: string, action?: () => void) => {
    action?.()
    setCopiedText(label)
    setTimeout(() => setCopiedText(null), 2000)
  }, [])
  
  const ActionButton = ({
    icon: Icon,
    label,
    onClick,
    variant = 'default',
    showCopied = false,
  }: {
    icon: React.ElementType
    label: string
    onClick?: () => void
    variant?: 'default' | 'danger' | 'success'
    showCopied?: boolean
  }) => (
    <button
      onClick={() => {
        onClick?.()
        if (!showCopied) onClose()
      }}
      className={`
        flex items-center gap-4 w-full px-5 py-4 text-left
        active:bg-zinc-100 dark:active:bg-zinc-800
        transition-colors
        ${variant === 'danger' ? 'text-red-600 dark:text-red-400' : ''}
        ${variant === 'success' ? 'text-emerald-600 dark:text-emerald-400' : ''}
        ${variant === 'default' ? isDark ? 'text-zinc-200' : 'text-zinc-800' : ''}
      `}
    >
      {showCopied && copiedText === label ? (
        <Check className="w-5 h-5 text-emerald-500" />
      ) : (
        <Icon className="w-5 h-5" />
      )}
      <span className="text-base font-medium">{showCopied && copiedText === label ? 'Copied!' : label}</span>
    </button>
  )
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          
          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`
              fixed bottom-0 left-0 right-0 z-50
              rounded-t-3xl shadow-2xl
              pb-[env(safe-area-inset-bottom,0px)]
              ${isDark ? 'bg-zinc-900' : 'bg-white'}
            `}
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
            </div>
            
            {/* Header */}
            <div className={`
              px-5 pb-3 border-b
              ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
            `}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-semibold truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {node.name}
                  </h3>
                  <p className={`text-sm truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {node.path}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className={`
                    p-2 rounded-full ml-3
                    ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}
                  `}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Actions */}
            <div className="max-h-[60vh] overflow-y-auto">
              {/* View Actions */}
              {node.type === 'file' && onOpenExternal && (
                <ActionButton icon={ExternalLink} label="Open in New Tab" onClick={onOpenExternal} />
              )}
              {onPreview && (
                <ActionButton icon={Eye} label="Preview" onClick={onPreview} />
              )}
              
              {/* Create Actions */}
              {canHaveChildren && (
                <>
                  <div className={`h-px mx-5 my-1 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                  {onCreateStrand && (
                    <ActionButton icon={FileText} label="New Strand" onClick={onCreateStrand} variant="success" />
                  )}
                  {onCreateFolder && (
                    <ActionButton icon={FolderPlus} label="New Folder" onClick={onCreateFolder} variant="success" />
                  )}
                </>
              )}
              
              {/* Edit Actions */}
              <div className={`h-px mx-5 my-1 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
              {onEdit && (
                <ActionButton icon={Pencil} label="Rename" onClick={onEdit} />
              )}
              
              {/* Copy Actions */}
              <div className={`h-px mx-5 my-1 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
              {onCopySlug && (
                <ActionButton
                  icon={Copy}
                  label="Copy Slug"
                  onClick={() => handleCopy(node.path, 'Copy Slug', onCopySlug)}
                  showCopied
                />
              )}
              {onCopyPath && (
                <ActionButton
                  icon={Link}
                  label="Copy Path"
                  onClick={() => handleCopy(node.path, 'Copy Path', onCopyPath)}
                  showCopied
                />
              )}
              {onCopyMarkdownLink && (
                <ActionButton
                  icon={Link}
                  label="Copy Markdown Link"
                  onClick={() => handleCopy(node.path, 'Copy Markdown Link', onCopyMarkdownLink)}
                  showCopied
                />
              )}
              
              {/* Delete */}
              {onDelete && (
                <>
                  <div className={`h-px mx-5 my-1 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                  <ActionButton icon={Trash2} label="Delete" onClick={onDelete} variant="danger" />
                </>
              )}
            </div>
            
            {/* Cancel Button */}
            <div className={`p-4 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <button
                onClick={onClose}
                className={`
                  w-full py-3.5 rounded-xl font-semibold text-base
                  ${isDark
                    ? 'bg-zinc-800 text-white active:bg-zinc-700'
                    : 'bg-zinc-100 text-zinc-900 active:bg-zinc-200'
                  }
                  transition-colors
                `}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}





