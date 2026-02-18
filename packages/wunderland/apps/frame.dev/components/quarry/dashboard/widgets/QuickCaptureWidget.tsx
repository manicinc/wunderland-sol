/**
 * Quick Capture Widget
 *
 * Fast strand creation with minimal input and voice recording.
 * Supports inline voice memo with real-time waveform and STT transcription.
 * @module components/quarry/dashboard/widgets/QuickCaptureWidget
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Sparkles,
  FileText,
  Lightbulb,
  ListTodo,
  Send,
  Mic,
  Square,
  Loader2,
  Globe,
  Zap,
  Settings,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WidgetProps } from '../types'
import type { STTEngine } from '@/lib/stt/types'
import { transcribeAudio, getSTTEngineInfo, type STTEngineInfo } from '@/lib/stt'
import {
  getMediaCapturePreferences,
  updateVoiceRecordingPreferences,
} from '@/lib/localStorage'

type QuickCaptureType = 'note' | 'idea' | 'task'

const captureTypes: { type: QuickCaptureType; icon: typeof FileText; label: string; color: string }[] = [
  { type: 'note', icon: FileText, label: 'Note', color: 'text-blue-500' },
  { type: 'idea', icon: Lightbulb, label: 'Idea', color: 'text-yellow-500' },
  { type: 'task', icon: ListTodo, label: 'Task', color: 'text-emerald-500' },
]

// ============================================================================
// INLINE WAVEFORM COMPONENT
// ============================================================================

interface InlineWaveformProps {
  analyser: AnalyserNode | null
  isRecording: boolean
  isDark: boolean
}

function InlineWaveform({ analyser, isRecording, isDark }: InlineWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      if (!isRecording) {
        // Clear when not recording
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        return
      }

      if (analyser) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(dataArray)

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const barCount = 20
        const barWidth = canvas.width / barCount - 2
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
        gradient.addColorStop(0, '#f43f5e')
        gradient.addColorStop(1, '#fb7185')

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor((i / barCount) * dataArray.length * 0.5)
          const value = dataArray[dataIndex] / 255
          const barHeight = Math.max(2, value * canvas.height * 0.9)

          ctx.fillStyle = gradient
          ctx.fillRect(
            i * (barWidth + 2) + 1,
            (canvas.height - barHeight) / 2,
            barWidth,
            barHeight
          )
        }
      } else {
        // Fallback animation without analyser
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const barCount = 20
        const barWidth = canvas.width / barCount - 2

        for (let i = 0; i < barCount; i++) {
          const value = 0.3 + Math.random() * 0.5
          const barHeight = Math.max(2, value * canvas.height * 0.7)

          ctx.fillStyle = '#f43f5e'
          ctx.fillRect(
            i * (barWidth + 2) + 1,
            (canvas.height - barHeight) / 2,
            barWidth,
            barHeight
          )
        }
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    if (isRecording) {
      draw()
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [analyser, isRecording])

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={32}
      className={cn(
        'rounded-md',
        isDark ? 'bg-zinc-800/50' : 'bg-zinc-100/50'
      )}
    />
  )
}

// ============================================================================
// STT ENGINE TOGGLE
// ============================================================================

interface STTEngineToggleProps {
  engine: STTEngine
  onEngineChange: (engine: STTEngine) => void
  engines: STTEngineInfo[]
  isDark: boolean
  compact?: boolean
}

function STTEngineToggle({ engine, onEngineChange, engines, isDark, compact = false }: STTEngineToggleProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  
  const currentEngine = engines.find(e => e.engine === engine) || engines[0]
  const EngineIcon = engine === 'whisper' ? Zap : Globe

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors',
            engine === 'whisper'
              ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400'
              : 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400'
          )}
          title={`Using ${currentEngine?.displayName || engine}`}
        >
          <EngineIcon className="w-2.5 h-2.5" />
          <span>{engine === 'whisper' ? 'AI' : 'Browser'}</span>
          <ChevronDown className="w-2 h-2" />
        </button>
        
        <AnimatePresence>
          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowDropdown(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={cn(
                  'absolute top-full right-0 mt-1 py-1 rounded-lg shadow-lg border z-50 min-w-[140px]',
                  isDark
                    ? 'bg-zinc-800 border-zinc-700'
                    : 'bg-white border-zinc-200'
                )}
              >
                {engines.map((eng) => (
                  <button
                    key={eng.engine}
                    onClick={() => {
                      if (eng.available) {
                        onEngineChange(eng.engine)
                        setShowDropdown(false)
                      }
                    }}
                    disabled={!eng.available}
                    className={cn(
                      'w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 transition-colors',
                      eng.available
                        ? isDark
                          ? 'hover:bg-zinc-700'
                          : 'hover:bg-zinc-100'
                        : 'opacity-50 cursor-not-allowed',
                      eng.engine === engine && (isDark ? 'bg-zinc-700' : 'bg-zinc-100')
                    )}
                  >
                    {eng.engine === 'whisper' ? (
                      <Zap className="w-3 h-3 text-violet-500" />
                    ) : (
                      <Globe className="w-3 h-3 text-cyan-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={isDark ? 'text-zinc-200' : 'text-zinc-700'}>
                        {eng.displayName}
                      </div>
                      {!eng.available && eng.reason && (
                        <div className={cn('text-[9px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                          {eng.reason}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {engines.map((eng) => (
        <button
          key={eng.engine}
          onClick={() => eng.available && onEngineChange(eng.engine)}
          disabled={!eng.available}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            engine === eng.engine
              ? eng.engine === 'whisper'
                ? 'bg-violet-500 text-white'
                : 'bg-cyan-500 text-white'
              : isDark
                ? 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200',
            !eng.available && 'opacity-40 cursor-not-allowed'
          )}
          title={eng.available ? eng.displayName : `${eng.displayName}: ${eng.reason}`}
        >
          {eng.engine === 'whisper' ? (
            <Zap className="w-3.5 h-3.5" />
          ) : (
            <Globe className="w-3.5 h-3.5" />
          )}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QuickCaptureWidget({
  theme,
  size,
  onNavigate,
  compact = false,
}: WidgetProps) {
  const isDark = theme.includes('dark')
  const [title, setTitle] = useState('')
  const [selectedType, setSelectedType] = useState<QuickCaptureType>('note')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [sttEngine, setSTTEngine] = useState<STTEngine>('web-speech')
  const [sttEngines, setSTTEngines] = useState<STTEngineInfo[]>([])
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  // Audio refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Load STT engine info and preferences
  useEffect(() => {
    const loadEngineInfo = async () => {
      const info = await getSTTEngineInfo()
      setSTTEngines(info)

      // Load saved preference
      try {
        const prefs = getMediaCapturePreferences()
        if (prefs.voice.sttEngine) {
          setSTTEngine(prefs.voice.sttEngine)
        }
      } catch (e) {
        console.warn('[QuickCapture] Could not load STT preferences:', e)
      }
    }

    loadEngineInfo()
  }, [])

  // Handle engine change and persist
  const handleEngineChange = useCallback((engine: STTEngine) => {
    setSTTEngine(engine)
    try {
      updateVoiceRecordingPreferences({ sttEngine: engine })
    } catch (e) {
      console.warn('[QuickCapture] Could not save STT preference:', e)
    }
  }, [])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      })
      streamRef.current = stream

      // Set up audio context and analyser
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)

        // Transcribe
        setIsTranscribing(true)
        try {
          const result = await transcribeAudio(blob, sttEngine)
          if (result.transcript) {
            setTitle((prev) => (prev ? `${prev} ${result.transcript}` : result.transcript))
          }
        } catch (error) {
          console.error('[QuickCapture] Transcription failed:', error)
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      setRecordingDuration(0)

      // Duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1)
      }, 1000)
    } catch (error) {
      console.error('[QuickCapture] Failed to start recording:', error)
    }
  }, [sttEngine])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    setIsRecording(false)
    analyserRef.current = null
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [stopRecording])

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return

    setIsSubmitting(true)

    // Navigate to create new strand with pre-filled title and type
    const params = new URLSearchParams({
      action: 'create',
      title: title.trim(),
      type: selectedType,
    })

    // Small delay for visual feedback
    setTimeout(() => {
      onNavigate(`/quarry/new?${params.toString()}`)
      setTitle('')
      setIsSubmitting(false)
    }, 300)
  }, [title, selectedType, onNavigate])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (compact) {
    return (
      <button
        onClick={() => onNavigate('/quarry/new?action=create')}
        className={`
          w-full flex items-center justify-center gap-2 py-3 rounded-lg
          font-medium transition-all
          ${isDark
            ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
            : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
          }
        `}
      >
        <Plus className="w-5 h-5" />
        Quick Capture
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {/* Type selector */}
      <div className="flex gap-2">
        {captureTypes.map(({ type, icon: Icon, label, color }) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
              text-sm font-medium transition-all
              ${selectedType === type
                ? isDark
                  ? 'bg-zinc-700 border border-zinc-600'
                  : 'bg-white border border-zinc-200 shadow-sm'
                : isDark
                  ? 'hover:bg-zinc-700/50'
                  : 'hover:bg-zinc-50'
              }
            `}
          >
            <Icon className={`w-4 h-4 ${selectedType === type ? color : isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            <span className={selectedType === type ? (isDark ? 'text-zinc-200' : 'text-zinc-700') : isDark ? 'text-zinc-500' : 'text-zinc-400'}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Recording indicator with waveform */}
      <AnimatePresence>
        {(isRecording || isTranscribing) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg',
              isDark ? 'bg-rose-500/10 border border-rose-500/30' : 'bg-rose-50 border border-rose-200'
            )}
          >
            {isRecording ? (
              <>
                {/* Pulsing record indicator */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-3 h-3 rounded-full bg-rose-500"
                />
                
                {/* Waveform */}
                <InlineWaveform
                  analyser={analyserRef.current}
                  isRecording={isRecording}
                  isDark={isDark}
                />
                
                {/* Duration */}
                <span className={cn(
                  'text-sm font-mono tabular-nums',
                  isDark ? 'text-rose-400' : 'text-rose-600'
                )}>
                  {formatDuration(recordingDuration)}
                </span>
                
                {/* Stop button */}
                <button
                  onClick={stopRecording}
                  className="p-1.5 rounded-md bg-rose-500 text-white hover:bg-rose-600 transition-colors ml-auto"
                  title="Stop recording"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                <span className={cn('text-sm', isDark ? 'text-rose-400' : 'text-rose-600')}>
                  Transcribing with {sttEngine === 'whisper' ? 'AI' : 'Browser'}...
                </span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input field with mic button */}
      <div className="relative">
        <div className="flex gap-2">
          {/* Mic button */}
          <motion.button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing}
            className={cn(
              'flex items-center justify-center w-11 h-11 rounded-lg transition-all flex-shrink-0',
              isRecording
                ? 'bg-rose-500 text-white animate-pulse'
                : isDark
                  ? 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-rose-400'
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-rose-500',
              isTranscribing && 'opacity-50 cursor-not-allowed'
            )}
            whileTap={{ scale: 0.95 }}
            title={isRecording ? 'Stop recording' : 'Start voice memo'}
          >
            {isRecording ? (
              <Square className="w-5 h-5" />
            ) : isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </motion.button>

          {/* Text input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`New ${selectedType}...`}
              disabled={isRecording}
              className={cn(
                'w-full px-4 py-3 pr-12 rounded-lg outline-none',
                'text-sm transition-all',
                isDark
                  ? 'bg-zinc-700 text-zinc-100 placeholder-zinc-500 border border-zinc-600 focus:border-rose-500'
                  : 'bg-zinc-50 text-zinc-800 placeholder-zinc-400 border border-zinc-200 focus:border-rose-500',
                isRecording && 'opacity-50'
              )}
            />
            <motion.button
              onClick={handleSubmit}
              disabled={!title.trim() || isSubmitting || isRecording}
              className={`
                absolute right-2 top-1/2 -translate-y-1/2
                p-2 rounded-lg transition-all
                ${title.trim() && !isRecording
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : isDark ? 'bg-zinc-600 text-zinc-500' : 'bg-zinc-200 text-zinc-400'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              whileTap={{ scale: 0.95 }}
            >
              {isSubmitting ? (
                <Sparkles className="w-4 h-4 animate-pulse" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Footer with STT toggle and hint */}
      <div className="flex items-center justify-between">
        <STTEngineToggle
          engine={sttEngine}
          onEngineChange={handleEngineChange}
          engines={sttEngines}
          isDark={isDark}
          compact={true}
        />
        <p className={`text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
          Press Enter or tap mic
        </p>
      </div>
    </div>
  )
}

export default QuickCaptureWidget
