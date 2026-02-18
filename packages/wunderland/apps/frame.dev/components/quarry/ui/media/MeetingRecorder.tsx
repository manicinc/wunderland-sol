/**
 * Meeting Recorder
 * @module codex/ui/MeetingRecorder
 *
 * @description
 * Specialized recorder for meeting transcription with system audio capture.
 * Features mic + system audio mixing, live transcription, and meeting metadata.
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Mic,
  Square,
  Play,
  Pause,
  Download,
  Loader2,
  Monitor,
  Volume2,
  Clock,
  Calendar,
  Users,
  FileText,
} from 'lucide-react'
import type { ThemeName } from '@/types/theme'
import { getSTTEngineInfo, transcribeAudio, type STTEngine, type STTEngineInfo } from '@/lib/stt'
import {
  AudioMixer,
  getSystemAudio,
  getMicrophoneStream,
  enumerateMicrophones,
  getDefaultMicrophone,
  isSystemAudioAvailable,
  type AudioDevice,
  type AudioCaptureMode,
} from '@/lib/audio'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface MeetingRecorderProps {
  /** Whether recorder is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Recording complete callback */
  onRecordingComplete: (result: MeetingRecordingResult) => void
  /** Current theme */
  theme?: ThemeName
}

interface MeetingRecordingResult {
  /** Audio blob */
  blob: Blob
  /** Duration in seconds */
  duration: number
  /** Transcript if available */
  transcript?: string
  /** Meeting metadata */
  metadata: {
    title: string
    date: Date
    participants?: string[]
    audioSources: AudioCaptureMode
  }
}

interface TranscriptSegment {
  text: string
  timestamp: number
  isFinal: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   WEB SPEECH API TYPES
═══════════════════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function MeetingRecorder({
  isOpen,
  onClose,
  onRecordingComplete,
  theme = 'light',
}: MeetingRecorderProps) {
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [micLevel, setMicLevel] = useState(0)
  const [systemLevel, setSystemLevel] = useState(0)

  // Audio source state
  const [captureMode, setCaptureMode] = useState<AudioCaptureMode>('mic')
  const [microphones, setMicrophones] = useState<AudioDevice[]>([])
  const [selectedMicId, setSelectedMicId] = useState<string>('')
  const [systemAudioAvailable, setSystemAudioAvailable] = useState(false)

  // Gain controls
  const [micGain, setMicGain] = useState(1.0)
  const [systemGain, setSystemGain] = useState(0.8)

  // Transcript state
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([])
  const [interimText, setInterimText] = useState('')

  // Metadata state
  const [meetingTitle, setMeetingTitle] = useState('')
  const [participants, setParticipants] = useState('')

  // Result state
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null)
  const [transcribing, setTranscribing] = useState(false)

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const micStreamRef = useRef<MediaStream | null>(null)
  const systemStreamRef = useRef<MediaStream | null>(null)
  const mixerRef = useRef<AudioMixer | null>(null)
  const startTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const transcriptRef = useRef<TranscriptSegment[]>([])

  const isDark = theme.includes('dark')

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      // Check system audio availability
      setSystemAudioAvailable(isSystemAudioAvailable())

      // Load microphones
      try {
        const mics = await enumerateMicrophones()
        setMicrophones(mics)

        const defaultMic = await getDefaultMicrophone()
        if (defaultMic) {
          setSelectedMicId(defaultMic.deviceId)
        }
      } catch (err) {
        console.error('[MeetingRecorder] Failed to enumerate mics:', err)
      }

      // Set default title with today's date
      const today = new Date()
      setMeetingTitle(`Meeting - ${today.toLocaleDateString()}`)
    }

    if (isOpen) {
      init()
    }
  }, [isOpen])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop())
      micStreamRef.current = null
    }
    if (systemStreamRef.current) {
      systemStreamRef.current.getTracks().forEach(track => track.stop())
      systemStreamRef.current = null
    }
    if (mixerRef.current) {
      mixerRef.current.dispose()
      mixerRef.current = null
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
  }, [])

  // Start speech recognition
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const currentTime = Math.floor((Date.now() - startTimeRef.current) / 1000)

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          const segment: TranscriptSegment = {
            text: result[0].transcript,
            timestamp: currentTime,
            isFinal: true,
          }
          transcriptRef.current.push(segment)
          setTranscriptSegments([...transcriptRef.current])
          setInterimText('')
        } else {
          setInterimText(result[0].transcript)
        }
      }
    }

    recognition.onend = () => {
      if (isRecording && !isPaused && recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch {
          // Ignore
        }
      }
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch {
      console.warn('[MeetingRecorder] Failed to start speech recognition')
    }
  }, [isRecording, isPaused])

  // Start recording
  const startRecording = async () => {
    try {
      // Reset state
      setTranscriptSegments([])
      setInterimText('')
      transcriptRef.current = []
      chunksRef.current = []

      // Get microphone stream
      const micStream = await getMicrophoneStream(selectedMicId)
      micStreamRef.current = micStream

      let finalStream = micStream

      // If system audio enabled, capture and mix
      if (captureMode !== 'mic' && systemAudioAvailable) {
        try {
          const systemStream = await getSystemAudio('tab')
          if (systemStream) {
            systemStreamRef.current = systemStream

            // Create mixer
            const mixer = new AudioMixer({ micGain, systemGain })
            mixer.addSource('mic', 'microphone', micStream, micGain)
            mixer.addSource('system', 'tab', systemStream, systemGain)
            await mixer.resume()

            // Start level monitoring
            mixer.startLevelMonitoring((levels) => {
              setMicLevel(levels.get('mic') || 0)
              setSystemLevel(levels.get('system') || 0)
            })

            mixerRef.current = mixer
            finalStream = mixer.getOutputStream()
          }
        } catch (err) {
          console.warn('[MeetingRecorder] System audio failed:', err)
        }
      } else {
        // Single source level monitoring
        const audioContext = new AudioContext()
        const source = audioContext.createMediaStreamSource(micStream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)

        const updateLevel = () => {
          if (!isRecording) return
          const dataArray = new Uint8Array(analyser.frequencyBinCount)
          analyser.getByteFrequencyData(dataArray)
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
          setMicLevel(avg / 255)
          requestAnimationFrame(updateLevel)
        }
        updateLevel()
      }

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const mediaRecorder = new MediaRecorder(finalStream, {
        mimeType,
        audioBitsPerSecond: 128000,
      })

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setRecordingBlob(blob)
      }

      // Start recording
      mediaRecorder.start(100)
      setIsRecording(true)
      startTimeRef.current = Date.now()

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 100)

      // Start transcription
      startSpeechRecognition()
    } catch (err) {
      console.error('[MeetingRecorder] Failed to start:', err)
      alert('Could not start recording. Please check permissions.')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop()
    }

    if (mixerRef.current) {
      mixerRef.current.stopLevelMonitoring()
    }

    setIsRecording(false)
    setIsPaused(false)

    // Keep streams for playback, cleanup on close
  }

  // Toggle pause
  const togglePause = () => {
    if (!mediaRecorderRef.current) return

    if (isPaused) {
      mediaRecorderRef.current.resume()
      recognitionRef.current?.start()
      setIsPaused(false)
    } else {
      mediaRecorderRef.current.pause()
      recognitionRef.current?.stop()
      setIsPaused(true)
    }
  }

  // Format time
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format timestamp for transcript
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle save
  const handleSave = async () => {
    if (!recordingBlob) return

    const fullTranscript = transcriptRef.current
      .map(seg => `[${formatTimestamp(seg.timestamp)}] ${seg.text}`)
      .join('\n')

    onRecordingComplete({
      blob: recordingBlob,
      duration,
      transcript: fullTranscript,
      metadata: {
        title: meetingTitle,
        date: new Date(),
        participants: participants ? participants.split(',').map(p => p.trim()) : undefined,
        audioSources: captureMode,
      },
    })

    cleanup()
    onClose()
  }

  // Handle close
  const handleClose = () => {
    cleanup()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`
          relative w-full max-w-2xl max-h-[90vh] overflow-hidden
          rounded-2xl shadow-2xl
          ${isDark ? 'bg-gray-900' : 'bg-white'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`
          flex items-center justify-between px-6 py-4 border-b
          ${isDark ? 'border-gray-800' : 'border-gray-200'}
        `}>
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${isRecording
                ? isPaused ? 'bg-yellow-500' : 'bg-red-500'
                : isDark ? 'bg-gray-700' : 'bg-gray-100'
              }
            `}>
              {isRecording && !isPaused ? (
                <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
              ) : (
                <Mic className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
              )}
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Meeting Recorder
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {isRecording ? (isPaused ? 'Paused' : 'Recording') : 'Ready to record'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Metadata */}
          {!isRecording && !recordingBlob && (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Meeting Title
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className={`
                    w-full px-4 py-2 rounded-lg border
                    ${isDark
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                    }
                  `}
                  placeholder="e.g., Weekly Team Standup"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Participants (optional)
                </label>
                <input
                  type="text"
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  className={`
                    w-full px-4 py-2 rounded-lg border
                    ${isDark
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                    }
                  `}
                  placeholder="John, Jane, Bob (comma-separated)"
                />
              </div>

              {/* Audio Source Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Audio Source
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCaptureMode('mic')}
                    className={`
                      flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border
                      transition-colors
                      ${captureMode === 'mic'
                        ? isDark
                          ? 'bg-blue-900/50 border-blue-700 text-blue-300'
                          : 'bg-blue-50 border-blue-300 text-blue-700'
                        : isDark
                          ? 'border-gray-700 hover:bg-gray-800'
                          : 'border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Mic className="w-5 h-5" />
                    <span>Mic Only</span>
                  </button>

                  {systemAudioAvailable && (
                    <button
                      onClick={() => setCaptureMode('mic+tab')}
                      className={`
                        flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border
                        transition-colors
                        ${captureMode === 'mic+tab'
                          ? isDark
                            ? 'bg-blue-900/50 border-blue-700 text-blue-300'
                            : 'bg-blue-50 border-blue-300 text-blue-700'
                          : isDark
                            ? 'border-gray-700 hover:bg-gray-800'
                            : 'border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <Monitor className="w-5 h-5" />
                      <span>Mic + System</span>
                    </button>
                  )}
                </div>
                {captureMode !== 'mic' && (
                  <p className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    System audio will be captured from your browser tab. You&apos;ll be prompted to select which tab to share.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Recording View */}
          {(isRecording || recordingBlob) && (
            <>
              {/* Timer & Levels */}
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <p className={`text-4xl font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatTime(duration)}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Duration
                  </p>
                </div>
              </div>

              {/* VU Meters */}
              {isRecording && (
                <div className="space-y-3">
                  {/* Mic Level */}
                  <div className="flex items-center gap-3">
                    <Mic className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <div className={`flex-1 h-3 rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                      <motion.div
                        animate={{ width: `${micLevel * 100}%` }}
                        className={`h-full ${micLevel > 0.8 ? 'bg-red-500' : micLevel > 0.5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      />
                    </div>
                  </div>

                  {/* System Level */}
                  {captureMode !== 'mic' && (
                    <div className="flex items-center gap-3">
                      <Monitor className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                      <div className={`flex-1 h-3 rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                        <motion.div
                          animate={{ width: `${systemLevel * 100}%` }}
                          className={`h-full ${systemLevel > 0.8 ? 'bg-red-500' : systemLevel > 0.5 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Transcript */}
              <div>
                <div className={`flex items-center gap-2 mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">Live Transcript</span>
                </div>
                <div className={`
                  h-40 overflow-y-auto rounded-lg p-4 text-sm
                  ${isDark ? 'bg-gray-800' : 'bg-gray-50'}
                `}>
                  {transcriptSegments.length === 0 && !interimText ? (
                    <p className={`italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {isRecording ? 'Listening...' : 'No transcript yet'}
                    </p>
                  ) : (
                    <>
                      {transcriptSegments.map((seg, i) => (
                        <p key={i} className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          <span className={`text-xs mr-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            [{formatTimestamp(seg.timestamp)}]
                          </span>
                          {seg.text}
                        </p>
                      ))}
                      {interimText && (
                        <p className={`italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {interimText}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Controls */}
        <div className={`
          flex items-center justify-center gap-4 px-6 py-4 border-t
          ${isDark ? 'border-gray-800' : 'border-gray-200'}
        `}>
          {/* Pre-recording */}
          {!isRecording && !recordingBlob && (
            <button
              onClick={startRecording}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-full font-semibold
                bg-red-600 hover:bg-red-700 text-white
                transition-colors
              `}
            >
              <Mic className="w-5 h-5" />
              Start Recording
            </button>
          )}

          {/* Recording controls */}
          {isRecording && (
            <>
              <button
                onClick={togglePause}
                className={`
                  p-4 rounded-full transition-colors
                  ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}
                `}
              >
                {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
              </button>
              <button
                onClick={stopRecording}
                className={`
                  p-4 rounded-full bg-red-600 hover:bg-red-700 text-white
                  transition-colors
                `}
              >
                <Square className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Post-recording */}
          {recordingBlob && !isRecording && (
            <>
              <button
                onClick={() => {
                  setRecordingBlob(null)
                  setDuration(0)
                  setTranscriptSegments([])
                }}
                className={`
                  px-6 py-3 rounded-full font-medium
                  ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}
                `}
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={transcribing}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-full font-semibold
                  bg-green-600 hover:bg-green-700 text-white
                  transition-colors disabled:opacity-50
                `}
              >
                {transcribing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Save Recording
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
