'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Volume2, VolumeX, Maximize, Upload, Sparkles } from 'lucide-react'
import { useTheme } from 'next-themes'

interface HolographicVideoPlayerProps {
  videoUrl?: string
  placeholder?: boolean
  title?: string
  description?: string
}

/*
type ShapeType = 'cube' | 'pyramid' | 'sphere' | 'torus'

interface HolographicShape {
  type: ShapeType
  x: number
  y: number
  z: number
  size: number
  rotationX: number
  rotationY: number
  rotationSpeed: number
  floatSpeed: number
  color: string
  opacity: number
}
*/

export function HolographicVideoPlayer({
  videoUrl,
  placeholder = true,
  title = "AgentOS Demo",
  description = "Experience the future of multi-agent orchestration"
}: HolographicVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // const animationRef = useRef<number>()
  const { resolvedTheme } = useTheme()
  // const prefersReducedMotion = useReducedMotion()
  const isDark = resolvedTheme === 'dark'

  // Holographic placeholder animation
  useEffect(() => {
    if (!placeholder || !canvasRef.current) return

    // Skip animation if we want a clean frame (user requested "no background effects")
    // We will just keep the canvas transparent or simple
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // If placeholder is true but we want to minimize effects as per user request
    // "just frame th evideo player like a hologram but no background effects ther"
    // We can just draw a subtle grid or nothing at all.
    // Let's just clear it and return to stop the complex particle animation
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return; 
    
    /* 
    // Original complex animation code commented out for "no background effects"
    // let frame = 0
    // const shapes: HolographicShape[] = []
    // ... rest of the animation code ...
    */
  }, [placeholder, isDark])

  const togglePlay = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleProgressUpdate = () => {
    if (!videoRef.current) return
    const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100
    setProgress(progress)
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
        className="holographic-card rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-glass-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold gradient-text flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                {title}
              </h3>
              <p className="text-sm text-muted mt-1">{description}</p>
            </div>
          </div>
        </div>

        {/* Video Container */}
        <div className="relative aspect-video bg-black/5 dark:bg-black/20">
          {placeholder && !videoUrl ? (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ background: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)' }}
            />
          ) : videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full"
              onTimeUpdate={handleProgressUpdate}
              onClick={togglePlay}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <Upload className="w-16 h-16 mx-auto mb-4 text-accent-primary opacity-50" />
                <p className="text-muted">Upload a demo video to showcase AgentOS</p>
              </div>
            </div>
          )}

          {/* Holographic overlay effect */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/5 dark:to-black/5" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/5 dark:to-black/5" />
            <div className="absolute inset-0 holographic-gradient opacity-10 mix-blend-screen" />
          </div>

          {/* Play button overlay */}
          {videoUrl && !isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center group"
            >
              <div className="neumorphic-button rounded-full p-4 group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-white fill-white" />
              </div>
            </button>
          )}
        </div>

        {/* Controls */}
        {videoUrl && (
          <div className="p-4 border-t border-glass-border">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="neumorphic-button rounded-full p-2"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>

              <div className="flex-1">
                <div className="relative h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-accent-primary to-accent-secondary"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <button
                onClick={toggleMute}
                className="neumorphic-button rounded-full p-2"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <button className="neumorphic-button rounded-full p-2">
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}