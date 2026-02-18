/**
 * Mobile sidebar toggle button (floating action button)
 * @module codex/ui/MobileToggle
 */

'use client'

import { X, Menu } from 'lucide-react'
import { motion } from 'framer-motion'

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
      className="md:hidden fixed bottom-6 right-6 z-50 p-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-full shadow-2xl transition-all touch-manipulation"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      style={{
        width: '56px',
        height: '56px',
      }}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isOpen ? 90 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </motion.div>
    </motion.button>
  )
}



