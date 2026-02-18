/**
 * Voice Recorder - Retro cassette tape UI
 * @module codex/ui/VoiceRecorder
 *
 * Features:
 * - Real-time transcription using Web Speech API or Whisper
 * - Configurable STT engine selection
 * - Audio recording with WebM/Opus codec
 * - Retro cassette tape visualization
 * - Option to save original audio file
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Play, Pause, Download, Loader2, FileText, Settings, Check, ChevronDown, Monitor } from 'lucide-react'
import type { ThemeName } from '@/types/theme'
import { getSTTEngineInfo, transcribeAudio, type STTEngine, type STTEngineInfo } from '@/lib/stt'
import {
  getMediaCapturePreferences,
  updateVoiceRecordingPreferences,
  type VoiceRecordingPreferences,
} from '@/lib/localStorage'
import {
  AudioMixer,
  getSystemAudio,
  isSystemAudioAvailable,
  getAvailableCaptureDescription,
  type AudioCaptureMode,
} from '@/lib/audio'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

// Web Speech API types (not in TypeScript by default)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
}

interface VoiceRecorderProps {
  /** Whether recorder is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Recording complete callback with blob, transcript, duration, and options */
  onRecordingComplete: (
    blob: Blob,
    transcript?: string,
    duration?: number,
    options?: { saveOriginalAudio?: boolean }
  ) => void
  /** Current theme */
  theme?: ThemeName
}

interface Recording {
  blob: Blob
  url: string
  duration: number
  timestamp: Date
  transcript: string
}

/**
 * Retro cassette tape-styled voice recorder
 *
 * @remarks
 * - Records audio as WebM using MediaRecorder API
 * - Real-time transcription using Web Speech API
 * - Animated cassette reels during recording
 * - VU meter visualization
 * - Exports with transcript for markdown embedding
 */
export default function VoiceRecorder({
  isOpen,
  onClose,
  onRecordingComplete,
  theme = 'light',
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recording, setRecording] = useState<Recording | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [speechSupported, setSpeechSupported] = useState(true)

  // Settings state
  const [showSettings, setShowSettings] = useState(false)
  const [sttEngines, setSTTEngines] = useState<STTEngineInfo[]>([])
  const [selectedEngine, setSelectedEngine] = useState<STTEngine>('web-speech')
  const [saveOriginalAudio, setSaveOriginalAudio] = useState(false)

  // Audio source state
  const [audioSource, setAudioSource] = useState<'mic' | 'mic+system'>('mic')
  const [systemAudioAvailable, setSystemAudioAvailable] = useState(false)
  const [systemAudioDescription, setSystemAudioDescription] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const systemStreamRef = useRef<MediaStream | null>(null)
  const mixerRef = useRef<AudioMixer | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const finalTranscriptRef = useRef('')

  const isDark = theme.includes('dark')

  // Load preferences and check available STT engines
  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = getMediaCapturePreferences()
      setSelectedEngine(prefs.voice.sttEngine)
      setSaveOriginalAudio(prefs.voice.saveOriginalAudio)

      const engines = await getSTTEngineInfo()
      setSTTEngines(engines)

      // Check if selected engine is available, otherwise fallback
      const selectedAvailable = engines.find(e => e.engine === prefs.voice.sttEngine)?.available
      if (!selectedAvailable) {
        const firstAvailable = engines.find(e => e.available)
        if (firstAvailable) {
          setSelectedEngine(firstAvailable.engine)
        }
      }
    }
    loadPreferences()
  }, [])

  // Check for Speech Recognition support (for real-time display)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setSpeechSupported(!!SpeechRecognition)
  }, [])

  // Check for system audio availability
  useEffect(() => {
    setSystemAudioAvailable(isSystemAudioAvailable())
    setSystemAudioDescription(getAvailableCaptureDescription())
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (systemStreamRef.current) {
        systemStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (mixerRef.current) {
        mixerRef.current.dispose()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  /**
   * Start speech recognition for real-time transcription
   */
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = finalTranscriptRef.current

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript + ' '
          finalTranscriptRef.current = final
        } else {
          interim += result[0].transcript
        }
      }

      setLiveTranscript(final.trim())
      setInterimTranscript(interim)
    }

    recognition.onerror = (event) => {
      console.warn('[VoiceRecorder] Speech recognition error:', event)
    }

    recognition.onend = () => {
      // Restart if still recording (speech recognition auto-stops after silence)
      if (isRecording && !isPaused && recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch (e) {
          // Ignore - may already be running
        }
      }
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (e) {
      console.warn('[VoiceRecorder] Failed to start speech recognition:', e)
    }
  }, [isRecording, isPaused])

  /**
   * Stop speech recognition - use stop() not abort() to get final results
   */
  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      // Use stop() instead of abort() - stop() attempts to return final results
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
  }, [])

  /**
   * Visualize audio levels
   */
  const visualize = () => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
    setAudioLevel(average / 255)

    animationFrameRef.current = requestAnimationFrame(visualize)
  }

  /**
   * Start recording
   */
  const startRecording = async () => {
    try {
      // Reset transcript state
      setLiveTranscript('')
      setInterimTranscript('')
      finalTranscriptRef.current = ''

      // Request microphone access
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = micStream

      // Determine final stream to record
      let finalStream = micStream

      // If system audio is enabled, try to capture and mix
      if (audioSource === 'mic+system' && systemAudioAvailable) {
        try {
          const systemStream = await getSystemAudio('tab')
          if (systemStream) {
            systemStreamRef.current = systemStream

            // Create mixer to combine mic + system audio
            const mixer = new AudioMixer()
            mixer.addSource('mic', 'microphone', micStream, 1.0)
            mixer.addSource('system', 'tab', systemStream, 0.8)
            await mixer.resume()

            mixerRef.current = mixer
            finalStream = mixer.getOutputStream()
          }
        } catch (err) {
          console.warn('[VoiceRecorder] System audio capture failed, using mic only:', err)
          // Continue with mic-only recording
        }
      }

      // Setup audio analyser for VU meter
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(micStream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const mediaRecorder = new MediaRecorder(finalStream, {
        mimeType,
        audioBitsPerSecond: 128000,
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setRecording({
          blob,
          url,
          duration: finalDuration,
          timestamp: new Date(),
          transcript: finalTranscriptRef.current.trim(),
        })
      }

      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      startTimeRef.current = Date.now()

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 100)

      // Start visualization
      visualize()

      // Start speech recognition for transcription
      if (speechSupported) {
        startSpeechRecognition()
      }
    } catch (err) {
      console.error('Error starting recording:', err)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  /**
   * Stop recording
   */
  const stopRecording = () => {
    // Stop speech recognition first to capture final transcript
    stopSpeechRecognition()

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      // Clean up system audio stream
      if (systemStreamRef.current) {
        systemStreamRef.current.getTracks().forEach(track => track.stop())
        systemStreamRef.current = null
      }

      // Clean up mixer
      if (mixerRef.current) {
        mixerRef.current.dispose()
        mixerRef.current = null
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }

  /**
   * Pause/resume recording
   */
  const togglePause = () => {
    if (!mediaRecorderRef.current) return

    if (isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
    } else {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
    }
  }

  /**
   * Format duration as MM:SS
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Handle engine change
   */
  const handleEngineChange = (engine: STTEngine) => {
    setSelectedEngine(engine)
    updateVoiceRecordingPreferences({ sttEngine: engine })
  }

  /**
   * Handle save original audio toggle
   */
  const handleSaveOriginalToggle = () => {
    const newValue = !saveOriginalAudio
    setSaveOriginalAudio(newValue)
    updateVoiceRecordingPreferences({ saveOriginalAudio: newValue })
  }

  /**
   * Handle audio source toggle
   */
  const handleAudioSourceToggle = () => {
    setAudioSource(prev => prev === 'mic' ? 'mic+system' : 'mic')
  }

  /**
   * Handle save - passes blob, transcript, and duration to callback
   */
  const handleSave = async () => {
    if (!recording) return

    let finalTranscript = recording.transcript

    // If using Whisper and we don't have a transcript yet, transcribe now
    if (selectedEngine === 'whisper' && !finalTranscript) {
      setTranscribing(true)
      try {
        const result = await transcribeAudio(recording.blob, 'whisper')
        finalTranscript = result.transcript
      } catch (err) {
        console.error('[VoiceRecorder] Whisper transcription failed:', err)
        // Keep the Web Speech transcript if available
      } finally {
        setTranscribing(false)
      }
    }

    // Pass blob with transcript, duration, and options
    onRecordingComplete(
      recording.blob,
      finalTranscript,
      recording.duration,
      { saveOriginalAudio }
    )
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
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Cassette Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={`
            relative w-full max-w-md
            ${theme === 'sepia-light' ? 'bg-gradient-to-b from-amber-100 to-amber-50' : ''}
            ${theme === 'sepia-dark' ? 'bg-gradient-to-b from-gray-900 to-black' : ''}
            ${theme === 'dark' ? 'bg-gradient-to-b from-gray-900 to-gray-950' : ''}
            ${theme === 'light' ? 'bg-gradient-to-b from-gray-100 to-white' : ''}
            rounded-3xl shadow-2xl border-4
            ${isDark ? 'border-gray-800' : 'border-gray-300'}
            p-8
          `}
        >
          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`
              absolute top-4 right-4 p-2 rounded-full transition-all z-10
              ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}
              ${showSettings ? (isDark ? 'bg-gray-700' : 'bg-gray-200') : ''}
            `}
            title="Recording settings"
          >
            <Settings className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`
                  absolute inset-x-4 top-12 z-20
                  ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                  rounded-lg border shadow-lg p-4 space-y-4
                `}
              >
                {/* STT Engine Selection */}
                <div>
                  <label className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Transcription Engine
                  </label>
                  <div className="mt-2 space-y-2">
                    {sttEngines.map((engine) => (
                      <button
                        key={engine.engine}
                        onClick={() => engine.available && handleEngineChange(engine.engine)}
                        disabled={!engine.available}
                        className={`
                          w-full flex items-center justify-between px-3 py-2 rounded-lg text-left
                          transition-all
                          ${selectedEngine === engine.engine
                            ? isDark
                              ? 'bg-red-900/50 border-red-700 border'
                              : 'bg-red-50 border-red-200 border'
                            : isDark
                              ? 'hover:bg-gray-700 border border-transparent'
                              : 'hover:bg-gray-100 border border-transparent'
                          }
                          ${!engine.available ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <div>
                          <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            {engine.displayName}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {engine.available ? engine.description : engine.reason}
                          </p>
                        </div>
                        {selectedEngine === engine.engine && engine.available && (
                          <Check className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* System Audio Toggle */}
                {systemAudioAvailable && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleAudioSourceToggle}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 rounded-lg
                        transition-all
                        ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <Monitor className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        <div>
                          <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            Include system audio
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {systemAudioDescription}
                          </p>
                        </div>
                      </div>
                      <div className={`
                        w-10 h-6 rounded-full transition-colors relative
                        ${audioSource === 'mic+system'
                          ? isDark ? 'bg-blue-700' : 'bg-blue-500'
                          : isDark ? 'bg-gray-600' : 'bg-gray-300'
                        }
                      `}>
                        <div className={`
                          absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform
                          ${audioSource === 'mic+system' ? 'left-5' : 'left-1'}
                        `} />
                      </div>
                    </button>
                  </div>
                )}

                {/* Save Original Audio Toggle */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleSaveOriginalToggle}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-lg
                      transition-all
                      ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
                    `}
                  >
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        Save original audio
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Keep audio file alongside transcript
                      </p>
                    </div>
                    <div className={`
                      w-10 h-6 rounded-full transition-colors relative
                      ${saveOriginalAudio
                        ? isDark ? 'bg-red-700' : 'bg-red-500'
                        : isDark ? 'bg-gray-600' : 'bg-gray-300'
                      }
                    `}>
                      <div className={`
                        absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform
                        ${saveOriginalAudio ? 'left-5' : 'left-1'}
                      `} />
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cassette Label */}
          <div className={`
            absolute inset-x-8 top-8 h-24
            ${isDark ? 'bg-red-900' : 'bg-red-600'}
            rounded-lg shadow-inner
            flex items-center justify-center
            border-2 ${isDark ? 'border-red-950' : 'border-red-700'}
          `}>
            <div className="text-white text-center">
              <p className="text-xs uppercase tracking-wider opacity-70">Voice Recording</p>
              <p className="text-lg font-bold">{formatDuration(duration)}</p>
            </div>
          </div>

          {/* Cassette Reels */}
          <div className="mt-32 mb-8 flex justify-between px-12">
            <motion.div
              animate={isRecording && !isPaused ? { rotate: 360 } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className={`
                w-20 h-20 rounded-full
                ${isDark ? 'bg-gray-800' : 'bg-gray-700'}
                shadow-inner relative
              `}
            >
              <div className="absolute inset-2 rounded-full bg-gray-900 shadow-inner">
                <div className="absolute inset-2 rounded-full border-4 border-gray-700" />
              </div>
            </motion.div>
            
            <motion.div
              animate={isRecording && !isPaused ? { rotate: 360 } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className={`
                w-20 h-20 rounded-full
                ${isDark ? 'bg-gray-800' : 'bg-gray-700'}
                shadow-inner relative
              `}
            >
              <div className="absolute inset-2 rounded-full bg-gray-900 shadow-inner">
                <div className="absolute inset-2 rounded-full border-4 border-gray-700" />
              </div>
            </motion.div>
          </div>

          {/* VU Meter */}
          <div className="mb-4 px-8">
            <div className={`
              h-6 rounded-full overflow-hidden
              ${isDark ? 'bg-gray-800' : 'bg-gray-300'}
              shadow-inner
            `}>
              <motion.div
                animate={{ width: `${audioLevel * 100}%` }}
                transition={{ duration: 0.1 }}
                className={`
                  h-full
                  ${audioLevel > 0.8
                    ? 'bg-red-500'
                    : audioLevel > 0.5
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }
                `}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs opacity-50">
              <span>-40</span>
              <span>-20</span>
              <span>0</span>
              <span>+6</span>
              <span>+12</span>
            </div>
          </div>

          {/* Live Transcript */}
          {(isRecording || recording) && (
            <div className="mb-6 px-6">
              <div className={`
                flex items-start gap-2 p-3 rounded-lg text-sm
                ${isDark ? 'bg-gray-800/50' : 'bg-gray-200/50'}
                min-h-[60px] max-h-[100px] overflow-y-auto
              `}>
                <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-50" />
                <div className="flex-1">
                  {recording ? (
                    <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      {recording.transcript || (
                        <span className="italic opacity-50">No transcript available</span>
                      )}
                    </p>
                  ) : (
                    <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      {liveTranscript}
                      {interimTranscript && (
                        <span className="opacity-50"> {interimTranscript}</span>
                      )}
                      {!liveTranscript && !interimTranscript && (
                        <span className="italic opacity-50">
                          {speechSupported ? 'Listening...' : 'Speech recognition not supported'}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {!isRecording && !recording && (
              <button
                onClick={startRecording}
                className={`
                  p-6 rounded-full transition-all
                  ${isDark 
                    ? 'bg-red-800 hover:bg-red-700' 
                    : 'bg-red-600 hover:bg-red-700'
                  }
                  text-white shadow-xl hover:shadow-2xl
                  transform hover:scale-110
                `}
              >
                <Mic className="w-8 h-8" />
              </button>
            )}

            {isRecording && (
              <>
                <button
                  onClick={togglePause}
                  className={`
                    p-4 rounded-full transition-all
                    ${isDark 
                      ? 'bg-gray-700 hover:bg-gray-600' 
                      : 'bg-gray-500 hover:bg-gray-600'
                    }
                    text-white
                  `}
                >
                  {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                </button>
                <button
                  onClick={stopRecording}
                  className={`
                    p-4 rounded-full transition-all
                    ${isDark 
                      ? 'bg-gray-700 hover:bg-gray-600' 
                      : 'bg-gray-500 hover:bg-gray-600'
                    }
                    text-white
                  `}
                >
                  <Square className="w-6 h-6" />
                </button>
              </>
            )}

            {recording && !isRecording && (
              <>
                <audio
                  src={recording.url}
                  controls
                  className="h-12"
                />
                <button
                  onClick={handleSave}
                  disabled={transcribing}
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
                  {transcribing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Transcribing...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Save
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Status */}
          {isRecording && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm">
              <div className={`
                w-3 h-3 rounded-full animate-pulse
                ${isPaused ? 'bg-yellow-500' : 'bg-red-500'}
              `} />
              <span className="opacity-70">
                {isPaused ? 'Paused' : 'Recording'}
              </span>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
