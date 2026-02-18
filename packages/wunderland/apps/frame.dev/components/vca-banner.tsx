'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, Sparkles, ChevronRight } from 'lucide-react'

export default function VCABanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check localStorage for banner state
    const bannerState = localStorage.getItem('vca-banner-state')
    const bannerTimestamp = localStorage.getItem('vca-banner-timestamp')
    
    if (bannerState === 'never') {
      setIsDismissed(true)
      return
    }
    
    if (bannerState === 'later' && bannerTimestamp) {
      const timestamp = parseInt(bannerTimestamp)
      const now = Date.now()
      const dayInMs = 24 * 60 * 60 * 1000
      
      if (now - timestamp < dayInMs) {
        setIsDismissed(true)
        return
      }
    }
    
    // Show banner after a short delay
    setTimeout(() => setIsVisible(true), 1000)
  }, [])

  const handleDismiss = (type: 'never' | 'later') => {
    setIsVisible(false)
    setIsDismissed(true)
    
    if (type === 'never') {
      localStorage.setItem('vca-banner-state', 'never')
    } else {
      localStorage.setItem('vca-banner-state', 'later')
      localStorage.setItem('vca-banner-timestamp', Date.now().toString())
    }
  }

  if (isDismissed) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="fixed bottom-4 right-4 z-40 max-w-md"
        >
          <div className="relative bg-gradient-to-r from-frame-green via-frame-green-dark to-frame-green rounded-xl shadow-paper-lifted overflow-hidden p-4">
            {/* Animated SVG Background */}
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="vca-animated" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="20" cy="20" r="2" fill="white">
                      <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" />
                    </circle>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#vca-animated)" />
              </svg>
            </div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-white animate-pulse" />
                  <h3 className="font-bold text-white">VCA Marketplace</h3>
                </div>
                <button
                  onClick={() => handleDismiss('never')}
                  className="p-1 text-white/70 hover:text-white hover:bg-white/20 rounded transition-all"
                  aria-label="Close permanently"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-white/90 text-sm mb-3">
                Discover free & advanced AI agents compatible with AgentOS
              </p>

              <div className="flex items-center justify-between">
                <a 
                  href="https://vca.chat" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-white font-semibold hover:underline"
                >
                  Explore now
                  <ChevronRight className="w-4 h-4" />
                </a>
                
                <button
                  onClick={() => handleDismiss('later')}
                  className="text-xs text-white/70 hover:text-white underline"
                >
                  Remind me later
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}