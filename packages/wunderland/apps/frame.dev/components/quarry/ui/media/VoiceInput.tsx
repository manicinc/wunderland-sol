/**
 * Voice Input - Speech-to-text for Q&A
 * @module codex/ui/VoiceInput
 */

'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, X } from 'lucide-react'

interface VoiceInputProps {
  /** Whether voice input is active */
  isOpen: boolean
  /** Callback when closed */
  onClose: () => void
  /** Callback with transcript */
  onTranscript: (text: string) => void
  /** Theme */
  theme?: string
}

/**
 * Voice input interface with real-time transcription
 */
export default function VoiceInput({
  isOpen,
  onClose,
  onTranscript,
  theme = 'light',
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [volume, setVolume] = useState(0)
  const recognitionRef = useRef<any>(null)
  const animationRef = useRef<number>()
  
  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')

  useEffect(() => {
    if (!isOpen) return

    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported')
      return
    }

    // Initialize recognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }

      setInterimTranscript(interim)
      if (final) {
        setTranscript(prev => prev + ' ' + final)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    // Start listening automatically
    try {
      recognition.start()
    } catch (error) {
      console.error('Failed to start recognition:', error)
    }

    // Simulate volume levels (in production, use Web Audio API)
    const animateVolume = () => {
      if (isListening) {
        setVolume(Math.random() * 100)
        animationRef.current = requestAnimationFrame(animateVolume)
      }
    }
    animateVolume()

    return () => {
      recognition.stop()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isOpen, isListening])

  const handleStop = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }

  const handleSubmit = () => {
    const finalTranscript = transcript + ' ' + interimTranscript
    if (finalTranscript.trim()) {
      onTranscript(finalTranscript.trim())
    }
    handleClose()
  }

  const handleClose = () => {
    handleStop()
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Voice Input Modal */}
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className={`
            relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden
            ${isDark ? 'bg-gray-900' : 'bg-white'}
            ${isTerminal ? 'terminal-frame' : ''}
          `}
        >
          {/* Header */}
          <div className={`
            px-6 py-4 border-b
            ${isDark ? 'border-gray-700' : 'border-gray-200'}
          `}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Voice Input</h3>
              <button
                onClick={handleClose}
                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Microphone Animation */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <motion.div
                  animate={{
                    scale: isListening ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: 2,
                    repeat: isListening ? Infinity : 0,
                    ease: 'easeInOut',
                  }}
                  className={`
                    p-8 rounded-full
                    ${isListening 
                      ? 'bg-red-500' 
                      : isDark ? 'bg-gray-700' : 'bg-gray-200'
                    }
                  `}
                >
                  {isListening ? (
                    <Mic className="w-12 h-12 text-white" />
                  ) : (
                    <MicOff className="w-12 h-12" />
                  )}
                </motion.div>

                {/* Volume indicator rings */}
                {isListening && (
                  <>
                    <motion.div
                      animate={{
                        scale: [1, 1.5],
                        opacity: [0.5, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeOut',
                      }}
                      className="absolute inset-0 rounded-full border-2 border-red-500"
                    />
                    <motion.div
                      animate={{
                        scale: [1, 1.5],
                        opacity: [0.5, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        delay: 0.5,
                        repeat: Infinity,
                        ease: 'easeOut',
                      }}
                      className="absolute inset-0 rounded-full border-2 border-red-500"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="text-center mb-4">
              <p className="text-sm font-medium">
                {isListening ? 'Listening...' : 'Click the microphone to start'}
              </p>
              {isListening && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Volume2 className="w-4 h-4 opacity-50" />
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          height: isListening ? volume / 100 * 20 + 4 : 4,
                        }}
                        className={`
                          w-1 bg-gradient-to-t from-green-500 to-red-500
                          rounded-full
                        `}
                        style={{ minHeight: 4 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Transcript */}
            <div className={`
              min-h-[100px] p-4 rounded-lg mb-4
              ${isDark ? 'bg-gray-800' : 'bg-gray-100'}
            `}>
              <p className="text-sm">
                {transcript}
                <span className="opacity-50">{interimTranscript}</span>
              </p>
              {!transcript && !interimTranscript && (
                <p className="text-sm opacity-50">
                  Your speech will appear here...
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {isListening ? (
                <button
                  onClick={handleStop}
                  className={`
                    flex-1 px-4 py-2 rounded-lg font-medium
                    bg-red-500 hover:bg-red-600 text-white
                  `}
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={() => recognitionRef.current?.start()}
                  className={`
                    flex-1 px-4 py-2 rounded-lg font-medium
                    ${isDark 
                      ? 'bg-gray-700 hover:bg-gray-600' 
                      : 'bg-gray-200 hover:bg-gray-300'
                    }
                  `}
                >
                  Start Recording
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={!transcript && !interimTranscript}
                className={`
                  flex-1 px-4 py-2 rounded-lg font-medium
                  ${transcript || interimTranscript
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-300 dark:bg-gray-700 opacity-50 cursor-not-allowed'
                  }
                `}
              >
                Use Transcript
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
