'use client'

/**
 * Quick Capture Widget (Meditate)
 * @module components/quarry/ui/meditate/widgets/QuickCaptureWidgetMeditate
 * 
 * Voice/text capture widget that saves to inbox/ folder.
 * Features:
 * - Voice recording with waveform
 * - Transcription using selected STT provider
 * - Auto-save to inbox (unpublished)
 * - Quick tags
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  Square,
  Send,
  Trash2,
  Tag,
  StickyNote,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveStrand } from '@/lib/storage/localCodex'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme } from '@/types/theme'
import {
  getEffectiveSTTProvider,
  getSTTProvider,
} from '@/lib/voice/providers'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface QuickCaptureWidgetMeditateProps {
  theme: ThemeName
  onNavigate: (path: string) => void
}

interface CapturedNote {
  id: string
  content: string
  audioBlob?: Blob
  tags: string[]
  createdAt: string
  isPublished: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════════════════════════════════════ */

const INBOX_KEY = 'meditate-inbox-notes'

function loadInboxNotes(): CapturedNote[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const stored = localStorage.getItem(INBOX_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveInboxNote(note: CapturedNote): void {
  if (typeof localStorage === 'undefined') return
  try {
    const notes = loadInboxNotes()
    notes.unshift(note)
    // Keep last 100 notes
    localStorage.setItem(INBOX_KEY, JSON.stringify(notes.slice(0, 100)))
  } catch {
    // Ignore
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function QuickCaptureWidgetMeditate({
  theme,
  onNavigate,
}: QuickCaptureWidgetMeditateProps) {
  const isDark = isDarkTheme(theme)

  const [mode, setMode] = useState<'idle' | 'recording' | 'transcribing' | 'editing'>('idle')
  const [content, setContent] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [recentNotes, setRecentNotes] = useState<CapturedNote[]>(() => loadInboxNotes().slice(0, 3))

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)

  // Quick tags
  const quickTags = ['idea', 'todo', 'note', 'question', 'reminder']

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      // Set up audio visualization
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach((track) => track.stop())
        audioContext.close()

        // Transcribe
        setMode('transcribing')
        try {
          const providerType = await getEffectiveSTTProvider()
          const provider = getSTTProvider(providerType)
          const result = await provider.transcribe(blob)
          setContent(result.transcript)
          setMode('editing')
        } catch (error) {
          console.error('Transcription failed:', error)
          setContent('')
          setMode('editing')
        }
      }

      mediaRecorder.start(100)
      setMode('recording')

      // Start visualization
      drawWaveform()
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }, [])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mode === 'recording') {
      mediaRecorderRef.current.stop()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [mode])

  // Draw waveform
  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw)
      analyserRef.current!.getByteTimeDomainData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.beginPath()

      const sliceWidth = canvas.width / bufferLength
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * canvas.height) / 2

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }

        x += sliceWidth
      }

      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.strokeStyle = isDark ? 'rgba(139, 92, 246, 0.8)' : 'rgba(139, 92, 246, 1)'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    draw()
  }, [isDark])

  // Save note as a strand in the notes weave
  const saveNote = useCallback(async () => {
    if (!content.trim() || isSaving) return
    setIsSaving(true)

    try {
      const timestamp = Date.now()
      const now = new Date().toISOString()
      const title = content.trim().slice(0, 100)
      const primaryTag = selectedTags[0] || 'note'

      // Build frontmatter for supernote
      const frontmatterData = {
        title,
        strandType: 'supernote',
        isSupernote: true,
        primarySupertag: primaryTag,
        cardSize: '3x5',
        supernoteStyle: 'paper',
        tags: selectedTags,
        createdAt: now,
        updatedAt: now,
      }

      // Build full markdown content with frontmatter
      const frontmatterYaml = Object.entries(frontmatterData)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`
          }
          if (typeof value === 'string') {
            return `${key}: "${value}"`
          }
          return `${key}: ${value}`
        })
        .join('\n')

      const fullContent = `---\n${frontmatterYaml}\n---\n\n${content.trim()}`

      // Save to notes weave as a strand
      await saveStrand({
        path: `weaves/notes/note-${timestamp}.md`,
        title,
        content: fullContent,
        frontmatter: JSON.stringify(frontmatterData),
        tags: selectedTags.join(','),
      })

      // Also save to localStorage for quick recent notes display
      const note: CapturedNote = {
        id: timestamp.toString(),
        content: content.trim(),
        tags: selectedTags,
        createdAt: now,
        isPublished: true,
      }
      saveInboxNote(note)
      setRecentNotes((prev) => [note, ...prev.slice(0, 2)])

      // Reset UI
      setContent('')
      setAudioBlob(null)
      setSelectedTags([])
      setMode('idle')
    } catch (error) {
      console.error('[QuickCapture] Failed to save note:', error)
    } finally {
      setIsSaving(false)
    }
  }, [content, selectedTags, isSaving])

  // Clear
  const clearNote = useCallback(() => {
    setContent('')
    setAudioBlob(null)
    setSelectedTags([])
    setMode('idle')
  }, [])

  // Toggle tag
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    )
  }

  return (
    <div className="flex flex-col h-full p-4">
      {/* Recording / Input area */}
      <div className="flex-1 flex flex-col">
        {mode === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <button
              onClick={startRecording}
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center',
                'bg-purple-500/20 hover:bg-purple-500/30',
                'transition-all duration-200'
              )}
            >
              <Mic className="w-8 h-8 text-purple-400" />
            </button>
            <span className={cn(
              'text-sm',
              isDark ? 'text-white/50' : 'text-black/50'
            )}>
              Tap to start recording
            </span>
            <button
              onClick={() => setMode('editing')}
              className={cn(
                'text-xs',
                isDark ? 'text-white/40 hover:text-white/60' : 'text-black/40 hover:text-black/60'
              )}
            >
              or type a note
            </button>
          </div>
        )}

        {mode === 'recording' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <canvas
              ref={canvasRef}
              width={200}
              height={60}
              className="rounded-lg"
            />
            <motion.button
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              onClick={stopRecording}
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center',
                'bg-red-500/20 hover:bg-red-500/30',
                'transition-all duration-200'
              )}
            >
              <Square className="w-6 h-6 text-red-400" />
            </motion.button>
            <span className={cn(
              'text-sm',
              isDark ? 'text-white/50' : 'text-black/50'
            )}>
              Recording... tap to stop
            </span>
          </div>
        )}

        {mode === 'transcribing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 className={cn(
              'w-8 h-8 animate-spin',
              isDark ? 'text-white/50' : 'text-black/50'
            )} />
            <span className={cn(
              'text-sm',
              isDark ? 'text-white/50' : 'text-black/50'
            )}>
              Transcribing...
            </span>
          </div>
        )}

        {mode === 'editing' && (
          <div className="flex-1 flex flex-col gap-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className={cn(
                'flex-1 p-3 rounded-xl resize-none text-sm',
                'outline-none',
                isDark
                  ? 'bg-white/5 text-white placeholder:text-white/40'
                  : 'bg-black/5 text-black placeholder:text-black/40'
              )}
              autoFocus
            />

            {/* Quick tags */}
            <div className="flex flex-wrap gap-1.5">
              {quickTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'px-2 py-1 rounded-md text-xs',
                    'transition-all duration-200',
                    selectedTags.includes(tag)
                      ? 'bg-purple-500/30 text-purple-400'
                      : isDark
                        ? 'bg-white/10 text-white/60 hover:bg-white/15'
                        : 'bg-black/10 text-black/60 hover:bg-black/15'
                  )}
                >
                  #{tag}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={clearNote}
                className={cn(
                  'p-2 rounded-lg',
                  isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-black/5 text-black/60'
                )}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex-1" />
              <button
                onClick={saveNote}
                disabled={!content.trim() || isSaving}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg',
                  'transition-all duration-200',
                  content.trim() && !isSaving
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400'
                    : isDark
                      ? 'bg-white/5 text-white/30'
                      : 'bg-black/5 text-black/30'
                )}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <StickyNote className="w-4 h-4" />
                )}
                <span className="text-sm">{isSaving ? 'Saving...' : 'Save to Notes'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent notes */}
      {recentNotes.length > 0 && mode === 'idle' && (
        <div className={cn(
          'mt-4 pt-4 border-t',
          isDark ? 'border-white/10' : 'border-black/10'
        )}>
          <div className={cn(
            'text-xs font-medium mb-2',
            isDark ? 'text-white/50' : 'text-black/50'
          )}>
            Recent notes
          </div>
          <div className="space-y-1.5">
            {recentNotes.map((note) => (
              <div
                key={note.id}
                className={cn(
                  'p-2 rounded-lg text-xs',
                  isDark ? 'bg-white/5' : 'bg-black/5'
                )}
              >
                <div className={cn(
                  'line-clamp-1',
                  isDark ? 'text-white/80' : 'text-black/80'
                )}>
                  {note.content}
                </div>
                {note.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          'text-[10px]',
                          isDark ? 'text-purple-400/60' : 'text-purple-600/60'
                        )}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}





