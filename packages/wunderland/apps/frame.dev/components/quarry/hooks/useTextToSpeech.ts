/**
 * Text-to-Speech Hook using Web Speech API
 * @module codex/hooks/useTextToSpeech
 * 
 * @remarks
 * Client-side, free text-to-speech using browser's native capabilities.
 * No API keys, no servers, works offline.
 * 
 * Supports:
 * - Multiple voices (system-dependent)
 * - Rate, pitch, volume control
 * - Play, pause, resume, stop
 * - Queue management for long content
 * - Progress tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface TTSVoice {
  name: string
  lang: string
  localService: boolean
  default: boolean
  voiceURI: string
}

export interface TTSSettings {
  voice: TTSVoice | null
  rate: number // 0.1 to 10, default 1
  pitch: number // 0 to 2, default 1
  volume: number // 0 to 1, default 1
}

export interface TTSState {
  speaking: boolean
  paused: boolean
  loading: boolean
  currentText: string
  progress: number // 0 to 100
  error: string | null
}

interface UseTextToSpeechResult {
  // State
  state: TTSState
  settings: TTSSettings
  availableVoices: TTSVoice[]
  isSupported: boolean
  
  // Actions
  speak: (text: string) => void
  pause: () => void
  resume: () => void
  stop: () => void
  
  // Settings
  setVoice: (voice: TTSVoice) => void
  setRate: (rate: number) => void
  setPitch: (pitch: number) => void
  setVolume: (volume: number) => void
  
  // Utilities
  readSelection: () => void
  readElement: (elementId: string) => void
}

/**
 * Text-to-Speech hook with Web Speech API
 * 
 * @example
 * ```tsx
 * function ReadAloudButton({ text }: { text: string }) {
 *   const { speak, stop, state, settings, setRate } = useTextToSpeech()
 *   
 *   return (
 *     <div>
 *       <button onClick={() => speak(text)}>
 *         {state.speaking ? 'Stop' : 'Read Aloud'}
 *       </button>
 *       <input
 *         type="range"
 *         min="0.5"
 *         max="2"
 *         step="0.1"
 *         value={settings.rate}
 *         onChange={(e) => setRate(parseFloat(e.target.value))}
 *       />
 *     </div>
 *   )
 * }
 * ```
 */
export function useTextToSpeech(): UseTextToSpeechResult {
  const [state, setState] = useState<TTSState>({
    speaking: false,
    paused: false,
    loading: false,
    currentText: '',
    progress: 0,
    error: null,
  })
  
  const [settings, setSettings] = useState<TTSSettings>({
    voice: null,
    rate: 1,
    pitch: 1,
    volume: 1,
  })
  
  const [availableVoices, setAvailableVoices] = useState<TTSVoice[]>([])
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Check if Web Speech API is supported
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  
  /**
   * Load available voices
   */
  useEffect(() => {
    if (!isSupported) return
    
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      const mappedVoices: TTSVoice[] = voices.map((voice) => ({
        name: voice.name,
        lang: voice.lang,
        localService: voice.localService,
        default: voice.default,
        voiceURI: voice.voiceURI,
      }))
      
      setAvailableVoices(mappedVoices)
      
      // Set default voice
      if (mappedVoices.length > 0 && !settings.voice) {
        const defaultVoice = mappedVoices.find((v) => v.default) || mappedVoices[0]
        setSettings((prev) => ({ ...prev, voice: defaultVoice }))
      }
    }
    
    // Voices might load asynchronously
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [isSupported])
  
  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel()
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [isSupported])
  
  /**
   * Track progress (approximate)
   */
  const startProgressTracking = useCallback((text: string, rate: number) => {
    const estimatedDuration = (text.length / 15) * (1 / rate) * 1000 // ~15 chars/sec at rate 1
    const startTime = Date.now()
    
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / estimatedDuration) * 100, 99)
      setState((prev) => ({ ...prev, progress }))
    }, 100)
  }, [])
  
  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }, [])
  
  /**
   * Speak text
   */
  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel()
    stopProgressTracking()
    
    // Clean text (remove markdown syntax, URLs, etc.)
    const cleanText = text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) -> text
      .replace(/[#*_~`]/g, '') // Remove markdown formatting
      .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
      .trim()
    
    if (!cleanText) {
      setState((prev) => ({ 
        ...prev, 
        error: 'No readable content found' 
      }))
      return
    }
    
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utteranceRef.current = utterance
    
    // Apply settings
    utterance.rate = settings.rate
    utterance.pitch = settings.pitch
    utterance.volume = settings.volume
    
    // Set voice
    if (settings.voice) {
      const systemVoices = window.speechSynthesis.getVoices()
      const voice = systemVoices.find((v) => v.voiceURI === settings.voice?.voiceURI)
      if (voice) utterance.voice = voice
    }
    
    // Event handlers
    utterance.onstart = () => {
      setState((prev) => ({
        ...prev,
        speaking: true,
        paused: false,
        currentText: cleanText,
        progress: 0,
        error: null,
      }))
      startProgressTracking(cleanText, settings.rate)
    }
    
    utterance.onend = () => {
      setState((prev) => ({
        ...prev,
        speaking: false,
        paused: false,
        currentText: '',
        progress: 100,
      }))
      stopProgressTracking()
    }
    
    utterance.onerror = (event) => {
      console.error('TTS error:', event)
      setState((prev) => ({
        ...prev,
        speaking: false,
        paused: false,
        error: event.error || 'Speech synthesis failed',
      }))
      stopProgressTracking()
    }
    
    utterance.onpause = () => {
      setState((prev) => ({ ...prev, paused: true }))
      stopProgressTracking()
    }
    
    utterance.onresume = () => {
      setState((prev) => ({ ...prev, paused: false }))
      startProgressTracking(cleanText, settings.rate)
    }
    
    // Speak
    window.speechSynthesis.speak(utterance)
  }, [isSupported, settings, startProgressTracking, stopProgressTracking])
  
  /**
   * Pause speech
   */
  const pause = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.pause()
  }, [isSupported])
  
  /**
   * Resume speech
   */
  const resume = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.resume()
  }, [isSupported])
  
  /**
   * Stop speech
   */
  const stop = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    stopProgressTracking()
    setState((prev) => ({
      ...prev,
      speaking: false,
      paused: false,
      currentText: '',
      progress: 0,
    }))
  }, [isSupported, stopProgressTracking])
  
  /**
   * Read selected text
   */
  const readSelection = useCallback(() => {
    const selection = window.getSelection()
    const text = selection?.toString()
    if (text) speak(text)
  }, [speak])
  
  /**
   * Read element content by ID
   */
  const readElement = useCallback((elementId: string) => {
    const element = document.getElementById(elementId)
    if (element) {
      const text = element.innerText || element.textContent || ''
      speak(text)
    }
  }, [speak])
  
  /**
   * Set voice
   */
  const setVoice = useCallback((voice: TTSVoice) => {
    setSettings((prev) => ({ ...prev, voice }))
  }, [])
  
  /**
   * Set speech rate
   */
  const setRate = useCallback((rate: number) => {
    const clampedRate = Math.max(0.1, Math.min(10, rate))
    setSettings((prev) => ({ ...prev, rate: clampedRate }))
  }, [])
  
  /**
   * Set pitch
   */
  const setPitch = useCallback((pitch: number) => {
    const clampedPitch = Math.max(0, Math.min(2, pitch))
    setSettings((prev) => ({ ...prev, pitch: clampedPitch }))
  }, [])
  
  /**
   * Set volume
   */
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    setSettings((prev) => ({ ...prev, volume: clampedVolume }))
  }, [])
  
  return {
    state,
    settings,
    availableVoices,
    isSupported,
    speak,
    pause,
    resume,
    stop,
    setVoice,
    setRate,
    setPitch,
    setVolume,
    readSelection,
    readElement,
  }
}

