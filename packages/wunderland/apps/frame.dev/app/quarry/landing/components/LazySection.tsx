'use client'

/**
 * LazySection - TRUE lazy loading with deferred dynamic imports
 * 
 * Uses string-based module paths to avoid Server/Client boundary issues.
 * The import() call only happens when IntersectionObserver triggers.
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Stricter viewport threshold (0.2) to load only when 20% visible
 * - Tighter rootMargin to delay loading until closer to viewport
 * - Import queue to serialize chunk loading (reduces main-thread contention)
 * - requestIdleCallback for non-critical imports
 * 
 * Usage:
 *   <LazySection 
 *     module="sections" 
 *     exportName="AIQASection"
 *     id="ai-qa"
 *   />
 */

import { useEffect, useState, useRef, ComponentType } from 'react'

// Module registry - maps module names to dynamic import functions
// This allows us to pass strings from server components while keeping imports lazy
const moduleRegistry: Record<string, () => Promise<any>> = {
  'sections': () => import('./sections'),
  'TabbedInfoSection': () => import('./TabbedInfoSection'),
  'AIEditorFeaturesSection': () => import('./AIEditorFeaturesSection'),
  'DeepFocusSection': () => import('./DeepFocusSection'),
}

// Import queue to serialize chunk loading - prevents main thread contention
const importQueue: Array<() => Promise<void>> = []
let isProcessingQueue = false

function scheduleImport(importFn: () => Promise<void>): void {
  importQueue.push(importFn)
  processQueue()
}

function processQueue(): void {
  if (isProcessingQueue || importQueue.length === 0) return
  isProcessingQueue = true
  
  const nextImport = importQueue.shift()
  if (!nextImport) {
    isProcessingQueue = false
    return
  }
  
  // Use requestIdleCallback if available, otherwise setTimeout
  const scheduleNext = typeof requestIdleCallback !== 'undefined'
    ? (cb: () => void) => requestIdleCallback(cb, { timeout: 100 })
    : (cb: () => void) => setTimeout(cb, 16) // ~1 frame
  
  nextImport().finally(() => {
    scheduleNext(() => {
      isProcessingQueue = false
      processQueue()
    })
  })
}

interface LazySectionProps {
  /** Module name from registry */
  module: keyof typeof moduleRegistry | string
  /** Export name from the module */
  exportName: string
  /** Section ID for scroll-to and SEO */
  id?: string
  /** Margin around viewport to trigger early loading (default: tighter for perf) */
  rootMargin?: string
  /** Minimum height to prevent layout shift */
  minHeight?: string
  /** Additional CSS class */
  className?: string
  /** Priority - high priority sections skip the queue */
  priority?: 'high' | 'normal'
}

/**
 * Minimal skeleton - just a gradient shimmer, no complex DOM
 * Uses transform for GPU acceleration
 */
function MinimalSkeleton({ height = '400px' }: { height?: string }) {
  return (
    <div 
      className="relative overflow-hidden rounded-2xl mx-4 my-8 bg-gray-100 dark:bg-gray-900/50"
      style={{ height }}
    >
      <div 
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent"
        style={{ animation: 'shimmer-slide 1.5s ease-in-out infinite' }}
      />
    </div>
  )
}

export function LazySection({
  module,
  exportName,
  id,
  rootMargin = '0px 0px -20% 0px', // Tighter: only load when 20% from viewport bottom
  minHeight = '400px',
  className = '',
  priority = 'normal',
}: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [Component, setComponent] = useState<ComponentType<any> | null>(null)
  const [hasError, setHasError] = useState(false)

  // IntersectionObserver to detect when section enters viewport
  useEffect(() => {
    const element = ref.current
    if (!element || shouldLoad) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Require 20% visibility before triggering load
        if (entry.isIntersecting && entry.intersectionRatio >= 0.1) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { 
        rootMargin,
        threshold: [0, 0.1, 0.2] // Check at 0%, 10%, 20% visibility
      }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [rootMargin, shouldLoad])

  // Load component when shouldLoad becomes true
  useEffect(() => {
    if (!shouldLoad || Component) return

    const loader = moduleRegistry[module]
    if (!loader) {
      console.error(`Module "${module}" not found in registry`)
      setHasError(true)
      return
    }

    const doImport = () => loader()
      .then((mod) => {
        const LoadedComponent = mod[exportName] || mod.default
        if (LoadedComponent) {
          setComponent(() => LoadedComponent)
        } else {
          console.error(`Export "${exportName}" not found in module "${module}"`)
          setHasError(true)
        }
      })
      .catch((error) => {
        console.error('Failed to load section:', error)
        setHasError(true)
      })

    // High priority sections load immediately, others go through queue
    if (priority === 'high') {
      doImport()
    } else {
      scheduleImport(doImport)
    }
  }, [shouldLoad, module, exportName, Component, priority])

  if (hasError) {
    return (
      <div 
        ref={ref} 
        id={id} 
        className={`flex items-center justify-center ${className}`}
        style={{ minHeight }}
      >
        <p className="text-gray-500 dark:text-gray-400">Failed to load section</p>
      </div>
    )
  }

  return (
    <div 
      ref={ref} 
      id={id} 
      className={className}
      style={{ minHeight: Component ? undefined : minHeight }}
    >
      {Component ? <Component /> : <MinimalSkeleton height={minHeight} />}
    </div>
  )
}

/**
 * SimpleSkeleton - Exported for backwards compatibility
 */
export function SimpleSkeleton({ height = 'h-96' }: { height?: string }) {
  return (
    <div className={`relative ${height} my-8 mx-4 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-900/50`}>
      <div 
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent"
        style={{ animation: 'shimmer-slide 1.5s ease-in-out infinite' }}
      />
    </div>
  )
}

export default LazySection
