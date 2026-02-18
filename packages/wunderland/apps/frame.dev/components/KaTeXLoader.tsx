'use client'

/**
 * KaTeXLoader - Loads KaTeX CSS and JS only on pages that need math rendering
 * 
 * PERFORMANCE: Keeps KaTeX off the landing page (~75KB+ CSS + 68KB JS savings)
 * 
 * IMPORTANT: This loads both CSS and JS files in the correct order:
 * 1. katex.min.css (styles)
 * 2. katex.min.js (main library)
 * 3. mhchem.min.js (chemistry extension - only after main library)
 * 
 * @example
 * import { KaTeXLoader } from '@/components/KaTeXLoader'
 * 
 * export default function MathPage() {
 *   return (
 *     <>
 *       <KaTeXLoader />
 *       <Content />
 *     </>
 *   )
 * }
 */

import { useEffect, useState } from 'react'

export function KaTeXLoader() {
  const [cssLoaded, setCssLoaded] = useState(false)
  const [jsLoaded, setJsLoaded] = useState(false)

  useEffect(() => {
    // Check if already loaded
    if (document.querySelector('link[href*="katex"]')) {
      setCssLoaded(true)
    }
    if ((window as any).katex) {
      setJsLoaded(true)
      return
    }

    // Load CSS first
    if (!cssLoaded) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'
      link.crossOrigin = 'anonymous'
      link.onload = () => setCssLoaded(true)
      document.head.appendChild(link)
    }

    // Load JS after CSS
    if (!jsLoaded && !(window as any).katex) {
      const katexScript = document.createElement('script')
      katexScript.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js'
      katexScript.crossOrigin = 'anonymous'
      katexScript.async = true
      
      katexScript.onload = () => {
        setJsLoaded(true)
        
        // Load mhchem extension ONLY after katex is ready
        const mhchemScript = document.createElement('script')
        mhchemScript.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/mhchem.min.js'
        mhchemScript.crossOrigin = 'anonymous'
        mhchemScript.async = true
        document.head.appendChild(mhchemScript)
      }
      
      document.head.appendChild(katexScript)
    }
  }, [cssLoaded, jsLoaded])

  return null
}

export default KaTeXLoader
