'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

/**
 * Props for a single FAQ item.
 */
interface FAQItem {
  /** The question text */
  question: string
  /** The answer text */
  answer: string
}

/**
 * Props for the FAQAccordion component.
 */
interface FAQAccordionProps {
  /** Array of FAQ items to display */
  items: FAQItem[]
}

/**
 * Elegant, accessible accordion component for FAQ pages.
 * 
 * Features:
 * - Smooth expand/collapse animations
 * - Keyboard navigation (Enter/Space to toggle)
 * - Generous spacing and readable typography
 * - Subtle shadows and rounded corners
 * - Light/dark mode support
 * 
 * @component
 * @example
 * ```tsx
 * <FAQAccordion items={[
 *   { question: "What is Frame?", answer: "Frame is..." },
 *   { question: "How do I contribute?", answer: "You can..." }
 * ]} />
 * ```
 */
export default function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index
        
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={`group overflow-hidden relative transition-shadow duration-300
              ${isOpen
                ? 'shadow-xl'
                : 'shadow-sm hover:shadow-lg'}
              rounded-3xl border border-transparent bg-white/70 dark:bg-gray-900/60 backdrop-blur
            `}
            style={{
              borderImage: isOpen
                ? 'linear-gradient(135deg, rgba(6,182,212,0.6), rgba(34,197,94,0.6)) 1'
                : undefined,
            }}
          >
            {/* Accent ribbon */}
            <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-green-500 rounded-r"></span>
            <button
              onClick={() => toggleItem(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleItem(index)
                }
              }}
              className="w-full text-left px-6 py-5 md:py-6 flex items-start justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
              aria-expanded={isOpen}
            >
              <h3 className={`text-lg md:text-xl font-semibold leading-relaxed transition-colors ${
                isOpen 
                  ? 'text-cyan-900 dark:text-cyan-100' 
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {item.question}
              </h3>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="flex-shrink-0 mt-1"
              >
                <ChevronDown className={`w-6 h-6 transition-colors ${
                  isOpen 
                    ? 'text-cyan-600 dark:text-cyan-400' 
                    : 'text-gray-400 dark:text-gray-600'
                }`} />
              </motion.div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 pt-2">
                    <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
                      {item.answer}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </div>
  )
}

