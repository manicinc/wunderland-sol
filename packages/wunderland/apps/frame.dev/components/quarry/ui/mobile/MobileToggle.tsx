/**
 * Mobile sidebar toggle button (floating action button)
 * @module codex/ui/MobileToggle
 */

'use client'

import { X, Menu } from 'lucide-react'
import { motion } from 'framer-motion'
import { Z_INDEX } from '../../constants'

interface MobileToggleProps {
  /** Whether sidebar is open */
  isOpen: boolean
  /** Toggle callback */
  onToggle: () => void
}

/**
 * Floating action button for mobile sidebar toggle
 * 
 * @remarks
 * - Fixed position bottom-right
 * - 56px touch target (Material Design spec)
 * - Smooth icon transition
 * - Only visible on mobile (< md breakpoint)
 * - High z-index to stay above content
 * 
 * @example
 * ```tsx
 * <MobileToggle
 *   isOpen={sidebarOpen}
 *   onToggle={() => setSidebarOpen(v => !v)}
 * />
 * ```
 */
export default function MobileToggle({ isOpen, onToggle }: MobileToggleProps) {
  return (
    <motion.button
      onClick={onToggle}
      className="md:hidden fixed p-2.5 bg-purple-600/70 hover:bg-purple-700/80 active:bg-purple-800/90 text-white rounded-full shadow-lg transition-all touch-manipulation backdrop-blur-sm"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      style={{
        zIndex: Z_INDEX.MOBILE_TOGGLE,
        // Position above the bottom nav at the left side
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 60px)',
        left: '16px',
        width: '40px',
        height: '40px',
      }}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isOpen ? 90 : 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-center"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </motion.div>
    </motion.button>
  )
}



