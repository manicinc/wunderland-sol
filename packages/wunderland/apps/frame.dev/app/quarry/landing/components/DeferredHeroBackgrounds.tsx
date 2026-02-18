'use client'

/**
 * DeferredHeroBackgrounds - Client component that loads heavy effects AFTER LCP
 * 
 * This component wraps the FabricBackground, FloatingElements, and KnowledgeFlowViz
 * to defer their loading until after the main content has painted.
 * 
 * Key optimizations:
 * - Uses useEffect to delay render by 100ms (after LCP)
 * - Respects prefers-reduced-motion
 * - Dynamically imports heavy components
 */

import { useEffect, useState, lazy, Suspense } from 'react'
import dynamic from 'next/dynamic'

// Lazy load heavy visualization components
const FabricBackground = dynamic(
  () => import('./FabricBackground').then(m => ({ default: m.FabricBackground })),
  { ssr: false }
)

const FloatingElements = dynamic(
  () => import('./FloatingElements').then(m => ({ default: m.FloatingElements })),
  { ssr: false }
)

const KnowledgeFlowViz = dynamic(
  () => import('./KnowledgeFlowViz').then(m => ({ default: m.KnowledgeFlowViz })),
  { ssr: false }
)

export function DeferredHeroBackgrounds() {
  const [showBackgrounds, setShowBackgrounds] = useState(false)
  const [showViz, setShowViz] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    
    // Defer background effects until after LCP (2000ms as per performance plan)
    // This ensures the H1 renders and paints before any heavy effects load
    const backgroundTimer = setTimeout(() => {
      setShowBackgrounds(true)
    }, 2000)
    
    // Defer visualization until after backgrounds (2500ms total)
    const vizTimer = setTimeout(() => {
      setShowViz(true)
    }, 2500)
    
    return () => {
      clearTimeout(backgroundTimer)
      clearTimeout(vizTimer)
    }
  }, [])

  return (
    <>
      {/* Deferred fabric background */}
      {showBackgrounds && (
        <Suspense fallback={null}>
          <FabricBackground variant="hero" opacity={0.08} intensity="medium" defer />
        </Suspense>
      )}
      
      {/* Deferred floating elements - skip on reduced motion */}
      {showBackgrounds && !prefersReducedMotion && (
        <Suspense fallback={null}>
          <FloatingElements variant="hero" opacity={0.6} mouseParallax parallaxIntensity={0.03} />
        </Suspense>
      )}

      {/* Desktop Knowledge Flow Visualization - deferred */}
      {showViz && (
        <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-[450px] z-0">
          <Suspense fallback={null}>
            <KnowledgeFlowViz />
          </Suspense>
        </div>
      )}

      {/* Mobile Background Visualization - Compact, translucent, behind content */}
      {showViz && (
        <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute inset-x-0 top-[30%] h-[300px] opacity-40">
            <Suspense fallback={null}>
              <KnowledgeFlowViz compact />
            </Suspense>
          </div>
        </div>
      )}
    </>
  )
}

export default DeferredHeroBackgrounds

