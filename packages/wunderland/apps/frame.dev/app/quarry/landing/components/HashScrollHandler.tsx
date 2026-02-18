'use client'

/**
 * HashScrollHandler - Handles hash-based scroll navigation
 * 
 * This component handles scrolling to elements when navigating to
 * URLs with hash fragments (e.g., /landing#pricing)
 * 
 * Separated from main page to keep it a server component
 */

import { useEffect } from 'react'

export default function HashScrollHandler() {
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      // Retry scroll until element is found (lazy loading may delay render)
      const scrollToHash = (attempts = 0) => {
        const element = document.querySelector(hash)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        } else if (attempts < 10) {
          // Retry with increasing delay (100, 200, 300... up to 1000ms)
          setTimeout(() => scrollToHash(attempts + 1), 100 * (attempts + 1))
        }
      }
      // Initial delay to let React hydrate
      setTimeout(() => scrollToHash(), 200)
    }
  }, [])

  return null
}





