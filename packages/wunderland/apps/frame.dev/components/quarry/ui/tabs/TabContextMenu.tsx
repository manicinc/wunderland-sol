/**
 * Tab Context Menu
 * @module components/quarry/ui/tabs/TabContextMenu
 * 
 * Right-click context menu for tab actions.
 */

'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  XCircle, 
  ArrowRight, 
  Pin, 
  PinOff,
  Copy,
  FolderOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OpenTab, TabContextMenuItem } from './types'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface TabContextMenuProps {
  tab: OpenTab
  position: { x: number; y: number }
  isDark?: boolean
  onClose: () => void
  onCloseTab: () => void
  onCloseOthers: () => void
  onCloseToRight: () => void
  onTogglePin: () => void
  onCloseAll?: () => void
  onCopyPath?: () => void
  onRevealInSidebar?: () => void
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function TabContextMenu({
  tab,
  position,
  isDark = false,
  onClose,
  onCloseTab,
  onCloseOthers,
  onCloseToRight,
  onTogglePin,
  onCloseAll,
  onCopyPath,
  onRevealInSidebar,
}: TabContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])
  
  // Handle item click
  const handleItemClick = useCallback((action: () => void) => {
    action()
    onClose()
  }, [onClose])
  
  // Copy path to clipboard
  const handleCopyPath = useCallback(() => {
    navigator.clipboard.writeText(tab.path)
    onClose()
  }, [tab.path, onClose])
  
  // Menu items
  const items: TabContextMenuItem[] = [
    {
      id: 'close',
      label: 'Close',
      icon: X,
      shortcut: '⌘W',
      action: onCloseTab,
    },
    {
      id: 'close-others',
      label: 'Close Others',
      icon: XCircle,
      action: onCloseOthers,
    },
    {
      id: 'close-right',
      label: 'Close to the Right',
      icon: ArrowRight,
      action: onCloseToRight,
    },
    ...(onCloseAll ? [{
      id: 'close-all',
      label: 'Close All',
      action: onCloseAll,
      dividerAfter: true,
    }] : [{
      id: 'spacer',
      label: '',
      action: () => {},
      dividerAfter: true,
    }]),
    {
      id: 'toggle-pin',
      label: tab.isPinned ? 'Unpin Tab' : 'Pin Tab',
      icon: tab.isPinned ? PinOff : Pin,
      action: onTogglePin,
      dividerAfter: true,
    },
    {
      id: 'copy-path',
      label: 'Copy Path',
      icon: Copy,
      action: onCopyPath || handleCopyPath,
    },
    ...(onRevealInSidebar ? [{
      id: 'reveal',
      label: 'Reveal in Sidebar',
      icon: FolderOpen,
      action: onRevealInSidebar,
    }] : []),
  ].filter(item => item.id !== 'spacer' || !onCloseAll) as TabContextMenuItem[]
  
  // Calculate position (avoid going off-screen)
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - (items.length * 36 + 16)),
  }
  
  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className={cn(
          'fixed z-50 min-w-[180px] py-1 rounded-lg shadow-lg',
          'border backdrop-blur-sm',
          isDark
            ? 'bg-zinc-900/95 border-zinc-700'
            : 'bg-white/95 border-zinc-200'
        )}
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y,
        }}
        role="menu"
        aria-label="Tab context menu"
      >
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            {item.label && (
              <button
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left',
                  'transition-colors duration-100',
                  item.disabled && 'opacity-50 cursor-not-allowed',
                  !item.disabled && [
                    isDark
                      ? 'hover:bg-zinc-800 text-zinc-200'
                      : 'hover:bg-zinc-100 text-zinc-700',
                  ],
                  item.danger && [
                    isDark
                      ? 'text-red-400 hover:bg-red-500/20'
                      : 'text-red-600 hover:bg-red-50',
                  ]
                )}
                onClick={() => !item.disabled && handleItemClick(item.action)}
                disabled={item.disabled}
                role="menuitem"
              >
                {item.icon && (
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className={cn(
                    'text-xs',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}>
                    {item.shortcut}
                  </span>
                )}
              </button>
            )}
            {item.dividerAfter && index < items.length - 1 && (
              <div className={cn(
                'my-1 border-t',
                isDark ? 'border-zinc-700' : 'border-zinc-200'
              )} />
            )}
          </React.Fragment>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}




