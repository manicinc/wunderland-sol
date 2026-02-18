/**
 * Native Dialog Lightbox - Hook-free image viewer using <dialog> element
 * @module codex/ui/NativeDialogLightbox
 *
 * @description
 * Simple lightbox using native HTML <dialog> element.
 * No React hooks required - avoids React #311 errors from webpack bundling.
 * Uses CSS-only animations and native browser APIs.
 */

'use client'

import React, { useEffect, useRef } from 'react'
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react'
import type { StrandIllustration } from '../../types'

interface NativeDialogLightboxProps {
  /** Image to display (null = closed) */
  image: StrandIllustration | null
  /** All images for gallery navigation */
  images?: StrandIllustration[]
  /** Close callback */
  onClose: () => void
  /** Navigate to different image */
  onNavigate?: (image: StrandIllustration) => void
  /** Theme */
  theme?: string
}

/**
 * Native dialog lightbox - uses <dialog> element for modal behavior
 * No hooks except for dialog ref management
 */
export default function NativeDialogLightbox({
  image,
  images = [],
  onClose,
  onNavigate,
  theme = 'light',
}: NativeDialogLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')

  // Find current index for navigation
  const currentIndex = images.findIndex(img => img.src === image?.src)
  const hasMultiple = images.length > 1

  // Open/close dialog based on image prop
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (image && !dialog.open) {
      dialog.showModal()
    } else if (!image && dialog.open) {
      dialog.close()
    }
  }, [image])

  // Handle escape key
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }

    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose])

  const handlePrevious = () => {
    if (!hasMultiple || !onNavigate) return
    const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1
    onNavigate(images[prevIndex])
  }

  const handleNext = () => {
    if (!hasMultiple || !onNavigate) return
    const nextIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1
    onNavigate(images[nextIndex])
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      onClose()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={`
        fixed inset-0 z-[9999] w-full h-full max-w-none max-h-none
        bg-black/90 backdrop-blur-sm
        p-0 m-0 border-none
        ${isDark || isTerminal ? 'text-white' : 'text-white'}
      `}
      style={{
        // Override default dialog styles
        backgroundColor: 'transparent',
      }}
    >
      {image && (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={onClose}
            className={`
              absolute top-4 right-4 z-10
              p-2 rounded-full
              bg-black/50 hover:bg-black/70
              text-white
              transition-colors
            `}
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation buttons */}
          {hasMultiple && (
            <>
              <button
                onClick={handlePrevious}
                className={`
                  absolute left-4 top-1/2 -translate-y-1/2 z-10
                  p-2 rounded-full
                  bg-black/50 hover:bg-black/70
                  text-white
                  transition-colors
                `}
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNext}
                className={`
                  absolute right-4 top-1/2 -translate-y-1/2 z-10
                  p-2 rounded-full
                  bg-black/50 hover:bg-black/70
                  text-white
                  transition-colors
                `}
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Image */}
          <img
            src={image.src}
            alt={image.alt || image.caption || 'Image'}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            style={{
              // Smooth appearance
              animation: 'fadeIn 0.2s ease-out',
            }}
          />

          {/* Caption */}
          {(image.caption || image.alt) && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[80vw] text-center">
              <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-lg">
                {image.caption || image.alt}
              </p>
            </div>
          )}

          {/* Counter */}
          {hasMultiple && (
            <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}

      {/* CSS animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        dialog::backdrop {
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(4px);
        }
        dialog[open] {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </dialog>
  )
}
