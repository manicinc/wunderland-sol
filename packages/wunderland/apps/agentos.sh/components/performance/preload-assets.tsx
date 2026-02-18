'use client'

import { useEffect } from 'react'

export function PreloadAssets() {
  useEffect(() => {
    // Preload critical fonts
    const fontUrls = [
      '/fonts/geist-variable.woff2',
      '/fonts/geist-mono-variable.woff2'
    ]
    
    fontUrls.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'font'
      link.type = 'font/woff2'
      link.href = url
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    })
    
    // Preconnect to external domains
    const domains = [
      'https://api.github.com',
      'https://fonts.googleapis.com'
    ]
    
    domains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = domain
      document.head.appendChild(link)
    })
    
    // Prefetch critical images
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            if (img.dataset.src) {
              img.src = img.dataset.src
              img.removeAttribute('data-src')
              imageObserver.unobserve(img)
            }
          }
        })
      })
      
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img)
      })
    }
  }, [])
  
  return null
}
