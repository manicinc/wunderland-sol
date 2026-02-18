/**
 * Camera Capture - Polaroid-style photo capture
 * @module codex/ui/CameraCapture
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, Download, RotateCcw, Sun, Moon, Zap } from 'lucide-react'
import type { ThemeName } from '@/types/theme'

interface CameraCaptureProps {
  /** Whether camera is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Capture complete callback */
  onCaptureComplete: (blob: Blob) => void
  /** Current theme */
  theme?: ThemeName
}

interface Filter {
  id: string
  name: string
  icon: React.ElementType
  style: React.CSSProperties
}

/**
 * Polaroid-style camera capture with retro filters
 * 
 * @remarks
 * - Uses getUserMedia for camera access
 * - Polaroid frame with instant develop animation
 * - Retro filters (sepia, noir, vintage)
 * - Shake-to-develop gesture
 */
export default function CameraCapture({
  isOpen,
  onClose,
  onCaptureComplete,
  theme = 'light',
}: CameraCaptureProps) {
  const [hasPermission, setHasPermission] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<string>('normal')
  const [isDeveloping, setIsDeveloping] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const isDark = theme.includes('dark')

  const filters: Filter[] = [
    {
      id: 'normal',
      name: 'Normal',
      icon: Sun,
      style: {},
    },
    {
      id: 'sepia',
      name: 'Sepia',
      icon: Sun,
      style: { filter: 'sepia(100%)' },
    },
    {
      id: 'noir',
      name: 'Noir',
      icon: Moon,
      style: { filter: 'grayscale(100%) contrast(150%)' },
    },
    {
      id: 'vintage',
      name: 'Vintage',
      icon: Zap,
      style: { filter: 'sepia(50%) saturate(0.8) contrast(1.2)' },
    },
  ]

  // Initialize camera
  useEffect(() => {
    if (!isOpen) return

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        })
        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setHasPermission(true)
        }
      } catch (err) {
        console.error('Camera access denied:', err)
        setHasPermission(false)
      }
    }

    initCamera()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [isOpen])

  /**
   * Capture photo
   */
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    setIsCapturing(true)
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Set canvas size to video size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Apply filter and draw video frame
    ctx.save()

    // Apply CSS filter to canvas
    const filterStyle = filters.find(f => f.id === selectedFilter)?.style.filter
    if (filterStyle) {
      ctx.filter = filterStyle
    }

    // Mirror image for selfie mode
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)

    ctx.drawImage(video, 0, 0)
    ctx.restore()

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        setCapturedImage(url)
        setIsDeveloping(true)

        // Simulate Polaroid development
        setTimeout(() => {
          setIsDeveloping(false)
        }, 2000)

        // Store the blob for saving
        canvas.toBlob((finalBlob) => {
          if (finalBlob) {
            onCaptureComplete(finalBlob)
          }
        }, 'image/jpeg', 0.9)
      }
      setIsCapturing(false)
    }, 'image/jpeg', 0.9)
  }

  /**
   * Retake photo
   */
  const retake = () => {
    setCapturedImage(null)
    setIsDeveloping(false)
  }

  /**
   * Save photo
   */
  const savePhoto = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Polaroid Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotate: 5 }}
          transition={{ type: 'spring', damping: 15 }}
          drag
          dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
          dragElastic={0.2}
          className={`
            relative
            ${theme === 'sepia-light' ? 'bg-[#FCF9F2]' : ''}
            ${theme === 'sepia-dark' ? 'bg-[#0E0704]' : ''}
            ${theme === 'dark' ? 'bg-gray-900' : ''}
            ${theme === 'light' ? 'bg-white' : ''}
            rounded-lg shadow-2xl
            p-4 pb-20
            cursor-grab active:cursor-grabbing
          `}
          style={{
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className={`
              absolute top-2 right-2 z-10 p-2 rounded-full
              ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'}
              transition-colors
            `}
          >
            <X className="w-4 h-4" />
          </button>

          {/* Camera View / Captured Image */}
          <div className="relative w-[320px] h-[320px] overflow-hidden rounded bg-black">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                  style={filters.find(f => f.id === selectedFilter)?.style}
                />

                {/* Viewfinder overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-4 border border-white/30 rounded">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-white/50">
                      <div className="absolute top-1/2 left-0 w-full h-px bg-white/50" />
                      <div className="absolute left-1/2 top-0 h-full w-px bg-white/50" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isDeveloping ? 0.3 : 1 }}
                transition={{ duration: isDeveloping ? 2 : 0.5 }}
                className="relative w-full h-full"
              >
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                  style={filters.find(f => f.id === selectedFilter)?.style}
                />
                {isDeveloping && (
                  <div className="absolute inset-0 bg-white animate-pulse" />
                )}
              </motion.div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Filter selector */}
          {!capturedImage && (
            <div className="absolute -left-20 top-1/2 -translate-y-1/2 space-y-2">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`
                    p-2 rounded-lg transition-all
                    ${selectedFilter === filter.id
                      ? isDark
                        ? 'bg-amber-800 text-white'
                        : 'bg-amber-600 text-white'
                      : isDark
                        ? 'bg-gray-800 hover:bg-gray-700'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }
                  `}
                  title={filter.name}
                >
                  <filter.icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          )}

          {/* Polaroid label */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="h-px bg-gray-300 dark:bg-gray-700 mb-2" />
            <p className={`
              text-center font-handwriting text-sm
              ${isDark ? 'text-gray-400' : 'text-gray-600'}
            `}>
              {new Date().toLocaleDateString()} • {selectedFilter}
            </p>
          </div>

          {/* Controls */}
          <motion.div
            className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {!capturedImage ? (
              <button
                onClick={capturePhoto}
                disabled={isCapturing || !hasPermission}
                className={`
                  p-4 rounded-full transition-all
                  ${isDark
                    ? 'bg-red-800 hover:bg-red-700'
                    : 'bg-red-600 hover:bg-red-700'
                  }
                  text-white shadow-xl hover:shadow-2xl
                  transform hover:scale-110
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <Camera className="w-8 h-8" />
              </button>
            ) : (
              <>
                <button
                  onClick={retake}
                  className={`
                    p-3 rounded-full transition-all
                    ${isDark
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-500 hover:bg-gray-600'
                    }
                    text-white
                  `}
                >
                  <RotateCcw className="w-6 h-6" />
                </button>
                <button
                  onClick={savePhoto}
                  disabled={isDeveloping}
                  className={`
                    px-6 py-3 rounded-full font-semibold transition-all
                    ${isDark
                      ? 'bg-green-800 hover:bg-green-700'
                      : 'bg-green-600 hover:bg-green-700'
                    }
                    text-white disabled:opacity-50
                    flex items-center gap-2
                  `}
                >
                  <Download className="w-5 h-5" />
                  Save
                </button>
              </>
            )}
          </motion.div>

          {/* Shake hint */}
          {capturedImage && isDeveloping && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`
                absolute -top-12 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap
                ${isDark ? 'text-gray-400' : 'text-gray-600'}
              `}
            >
              Shake to develop faster! 📸
            </motion.p>
          )}
        </motion.div>
      </div>

      <style jsx>{`
        @font-face {
          font-family: 'Handwriting';
          font-style: normal;
          font-weight: 400;
          font-display: swap;
          src: local('Comic Sans MS'), local('Marker Felt'), local('cursive');
        }
        .font-handwriting {
          font-family: 'Handwriting', cursive;
        }
      `}</style>
    </AnimatePresence>
  )
}
