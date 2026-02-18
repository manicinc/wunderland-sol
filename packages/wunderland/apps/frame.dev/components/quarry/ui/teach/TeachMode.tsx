/**
 * Teach Mode Component
 *
 * Main orchestrator for Feynman Technique teaching sessions.
 * Manages the full flow: persona selection → session → gap report
 *
 * @module codex/ui/TeachMode
 */

'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, BookOpen, History, ChevronRight,
  Loader2, AlertTriangle, Sparkles, ArrowLeft,
} from 'lucide-react'
import type { StudentPersona, TeachSession, GapReport } from '@/types/openstrand'
import { STUDENT_PERSONAS } from '@/types/openstrand'
import { useTeachMode } from '../../hooks/useTeachMode'
import { StudentPersonaSelector } from '../misc/StudentPersonaSelector'
import { TeachModeSession } from './TeachModeSession'
import { TeachModeGapReport } from './TeachModeGapReport'
import {
  generateStudentResponse as aiGenerateStudentResponse,
  generateGreeting as aiGenerateGreeting,
  generateGapReport as aiGenerateGapReport,
  type TeachMessage,
} from '@/lib/teach/teachModeAI'
import { generateFlashcardsFromGaps } from '@/lib/flashcards/flashcardGenerator'

interface TeachModeProps {
  /** Current strand being studied */
  strandSlug: string
  /** Strand title for display */
  strandTitle: string
  /** Strand content for gap analysis */
  strandContent: string
  /** Theme */
  isDark?: boolean
  /** Callback when flashcards are generated */
  onFlashcardsGenerated?: (flashcardIds: string[]) => void
  /** Callback when session complete (for XP updates) */
  onSessionComplete?: (session: TeachSession) => void
}

type TeachModeView = 'select-persona' | 'session' | 'gap-report' | 'history'

/**
 * Session history card
 */
function SessionHistoryCard({
  session,
  isDark,
  onView,
}: {
  session: TeachSession
  isDark: boolean
  onView: () => void
}) {
  const personaConfig = STUDENT_PERSONAS.find(p => p.id === session.persona)
  const date = new Date(session.createdAt)

  return (
    <motion.button
      onClick={onView}
      className={`
        w-full p-4 rounded-xl border text-left transition-all
        ${isDark
          ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
          : 'bg-white border-zinc-200 hover:border-zinc-300'
        }
      `}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{personaConfig?.icon}</span>
          <div>
            <h4 className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              {personaConfig?.name}
            </h4>
            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className={`
          px-2 py-1 rounded-full text-xs font-medium
          ${session.coverageScore >= 80
            ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
            : session.coverageScore >= 50
              ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
              : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
          }
        `}>
          {Math.round(session.coverageScore)}% coverage
        </div>
      </div>

      {session.gapReport && (
        <div className={`mt-3 pt-3 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
          <div className="flex items-center gap-4 text-xs">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
              {session.gapReport.covered.length} concepts covered
            </span>
            <span className={isDark ? 'text-amber-400' : 'text-amber-600'}>
              {session.gapReport.gaps.length} gaps found
            </span>
            <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>
              +{session.xpEarned} XP
            </span>
          </div>
        </div>
      )}
    </motion.button>
  )
}

/**
 * Teach Mode Component
 *
 * Main teaching interface integrated into Learning Studio
 */
export function TeachMode({
  strandSlug,
  strandTitle,
  strandContent,
  isDark = false,
  onFlashcardsGenerated,
  onSessionComplete,
}: TeachModeProps) {
  const [view, setView] = useState<TeachModeView>('select-persona')
  const [selectedPersona, setSelectedPersona] = useState<StudentPersona | null>(null)
  const [sessionHistory, setSessionHistory] = useState<TeachSession[]>([])
  const [viewingSession, setViewingSession] = useState<TeachSession | null>(null)
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [gapsFound, setGapsFound] = useState(0)

  const sessionStartTime = useRef<Date>(new Date())

  const {
    status,
    session,
    messages,
    error,
    isLoading,
    startSession,
    sendMessage,
    receiveStudentResponse,
    endSession,
    cancelSession,
    getSessions,
  } = useTeachMode()

  // Load session history on mount
  useEffect(() => {
    getSessions(strandSlug).then(setSessionHistory)
  }, [getSessions, strandSlug])

  // Handle starting a new session
  const handleStartSession = useCallback(async () => {
    if (!selectedPersona) return

    sessionStartTime.current = new Date()
    await startSession(strandSlug, selectedPersona)
    setView('session')

    // Send initial AI greeting based on persona
    setIsAiThinking(true)
    try {
      const greeting = await aiGenerateGreeting(selectedPersona, strandTitle)
      receiveStudentResponse(greeting)
    } catch (error) {
      console.error('[TeachMode] Failed to generate greeting:', error)
      const fallbackGreeting = getPersonaGreeting(selectedPersona, strandTitle)
      receiveStudentResponse(fallbackGreeting)
    } finally {
      setIsAiThinking(false)
    }
  }, [selectedPersona, strandSlug, strandTitle, startSession, receiveStudentResponse])

  // Handle sending a user message
  const handleSendMessage = useCallback(async (content: string, isVoice: boolean) => {
    await sendMessage(content, isVoice)

    // Generate AI response using LLM
    setIsAiThinking(true)
    try {
      // Convert messages to TeachMessage format
      const teachMessages: TeachMessage[] = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'student',
        content: m.content,
      }))

      const response = await aiGenerateStudentResponse(
        selectedPersona!,
        content,
        strandContent,
        teachMessages
      )
      receiveStudentResponse(response.content, response.gaps)
      if (response.gaps && response.gaps.length > 0) {
        setGapsFound(prev => prev + response.gaps!.length)
      }
    } catch (error) {
      console.error('[TeachMode] Failed to generate response:', error)
      receiveStudentResponse("I'm having trouble understanding. Can you try explaining that differently?")
    } finally {
      setIsAiThinking(false)
    }
  }, [selectedPersona, strandContent, messages, sendMessage, receiveStudentResponse])

  // Handle ending the session
  const handleEndSession = useCallback(async () => {
    setIsAiThinking(true)

    try {
      // Generate gap report using AI analysis
      const userTranscript = messages.filter(m => m.role === 'user').map(m => m.content).join('\n')
      const gapReport = await aiGenerateGapReport(userTranscript, strandContent)

      const completedSession = await endSession(gapReport)
      setViewingSession(completedSession)
      setView('gap-report')

      // Notify parent
      onSessionComplete?.(completedSession)

      // Refresh history
      getSessions(strandSlug).then(setSessionHistory)
    } catch (error) {
      console.error('[TeachMode] Failed to generate gap report:', error)
      // Use fallback gap report
      const fallbackReport = generateGapReport(
        messages.filter(m => m.role === 'user').map(m => m.content).join('\n'),
        strandContent
      )
      const completedSession = await endSession(await fallbackReport)
      setViewingSession(completedSession)
      setView('gap-report')
    } finally {
      setIsAiThinking(false)
    }
  }, [messages, strandContent, endSession, onSessionComplete, getSessions, strandSlug])

  // Handle canceling the session
  const handleCancelSession = useCallback(() => {
    cancelSession()
    setView('select-persona')
    setSelectedPersona(null)
    setGapsFound(0)
  }, [cancelSession])

  // Handle flashcard generation from gap report
  const handleGenerateFlashcards = useCallback(async (gaps: string[]) => {
    try {
      console.log('[TeachMode] Generating flashcards for gaps:', gaps)
      const flashcards = await generateFlashcardsFromGaps(gaps, strandContent, {
        count: gaps.length,
      })

      // Return the generated flashcard IDs
      const flashcardIds = flashcards.map(fc => fc.id)
      onFlashcardsGenerated?.(flashcardIds)

      console.log('[TeachMode] Generated', flashcards.length, 'flashcards')
    } catch (error) {
      console.error('[TeachMode] Failed to generate flashcards:', error)
      onFlashcardsGenerated?.([])
    }
  }, [strandContent, onFlashcardsGenerated])

  // Handle viewing a historical session
  const handleViewSession = useCallback((session: TeachSession) => {
    setViewingSession(session)
    setView('gap-report')
  }, [])

  // Handle going back from gap report
  const handleBackFromReport = useCallback(() => {
    setViewingSession(null)
    setView('select-persona')
    setSelectedPersona(null)
    setGapsFound(0)
  }, [])

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
      {/* View: Persona Selection */}
      <AnimatePresence mode="wait">
        {view === 'select-persona' && (
          <motion.div
            key="select-persona"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 p-6 overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`
                  p-2 rounded-xl
                  ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}
                `}>
                  <GraduationCap className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    Teach Mode
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Explain "{strandTitle}" to an AI student
                  </p>
                </div>
              </div>

              {/* History button */}
              {sessionHistory.length > 0 && (
                <button
                  onClick={() => setView('history')}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                    ${isDark
                      ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      : 'bg-white text-zinc-700 hover:bg-zinc-100'
                    }
                    border ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
                  `}
                >
                  <History className="w-4 h-4" />
                  History ({sessionHistory.length})
                </button>
              )}
            </div>

            {/* Introduction */}
            <div className={`
              p-4 rounded-xl mb-6
              ${isDark ? 'bg-zinc-800/50' : 'bg-white'}
              border ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
            `}>
              <div className="flex items-start gap-3">
                <Sparkles className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                <div>
                  <h3 className={`font-medium mb-1 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    The Feynman Technique
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    If you can't explain it simply, you don't understand it well enough.
                    Choose an AI student below and explain this topic to them.
                    They'll ask questions to help you discover gaps in your understanding.
                  </p>
                </div>
              </div>
            </div>

            {/* Persona selector */}
            <StudentPersonaSelector
              selectedPersona={selectedPersona}
              onSelect={setSelectedPersona}
              isDark={isDark}
            />

            {/* Start button */}
            <div className="mt-6">
              <button
                onClick={handleStartSession}
                disabled={!selectedPersona || isLoading}
                className={`
                  w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  font-medium transition-all
                  ${selectedPersona
                    ? isDark
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                    : isDark
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  }
                `}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <BookOpen className="w-5 h-5" />
                    Start Teaching
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            {/* Error display */}
            {error && (
              <div className={`
                mt-4 p-3 rounded-lg flex items-center gap-2
                ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'}
              `}>
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* View: Active Session */}
        {view === 'session' && session && (
          <motion.div
            key="session"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1"
          >
            <TeachModeSession
              messages={messages}
              persona={session.persona}
              startTime={sessionStartTime.current}
              gapsFound={gapsFound}
              isDark={isDark}
              isAiThinking={isAiThinking}
              onSendMessage={handleSendMessage}
              onEndSession={handleEndSession}
              onCancel={handleCancelSession}
            />
          </motion.div>
        )}

        {/* View: Gap Report */}
        {view === 'gap-report' && viewingSession && (
          <motion.div
            key="gap-report"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 overflow-y-auto"
          >
            <div className="p-4">
              <button
                onClick={handleBackFromReport}
                className={`
                  flex items-center gap-2 mb-4 text-sm
                  ${isDark ? 'text-zinc-400 hover:text-zinc-300' : 'text-zinc-600 hover:text-zinc-800'}
                `}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Teach Mode
              </button>
            </div>
            <TeachModeGapReport
              session={viewingSession}
              strandTitle={strandTitle}
              isDark={isDark}
              onGenerateFlashcards={handleGenerateFlashcards}
              onStartNew={handleBackFromReport}
            />
          </motion.div>
        )}

        {/* View: Session History */}
        {view === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 p-6 overflow-y-auto"
          >
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setView('select-persona')}
                className={`
                  p-2 rounded-lg
                  ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}
                `}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  Teaching History
                </h2>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {sessionHistory.length} previous session{sessionHistory.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {sessionHistory.map((s) => (
                <SessionHistoryCard
                  key={s.id}
                  session={s}
                  isDark={isDark}
                  onView={() => handleViewSession(s)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// HELPER FUNCTIONS (Temporary - will be replaced with AI integration)
// ============================================================================

function getPersonaGreeting(persona: StudentPersona, topicTitle: string): string {
  const greetings: Record<StudentPersona, string> = {
    'curious-child': `Oh cool! You're going to teach me about "${topicTitle}"? I don't know anything about it yet. Can you start from the very beginning and explain what it is?`,
    'exam-prep': `I have a test on "${topicTitle}" coming up. What are the most important things I need to know? Start with the key concepts.`,
    'devils-advocate': `So you think you understand "${topicTitle}"? Let's see. Go ahead and explain it - I'll let you know if your reasoning holds up.`,
    'visual-learner': `I learn best with examples and pictures. Can you explain "${topicTitle}" using a real-world example I can visualize?`,
    'socratic': `Tell me about "${topicTitle}". What is it, fundamentally?`,
  }
  return greetings[persona]
}

async function generateStudentResponse(
  persona: StudentPersona,
  userMessage: string,
  _strandContent: string,
  _previousMessages: any[]
): Promise<{ content: string; gaps?: string[] }> {
  // TODO: Replace with real AI call
  // This is a placeholder that generates simple follow-up questions

  const questions: Record<StudentPersona, string[]> = {
    'curious-child': [
      "But why does that happen?",
      "What does that word mean?",
      "Can you explain that more simply?",
      "Like when...?",
      "Is that like [something I know]?",
    ],
    'exam-prep': [
      "Will that be on the test?",
      "What's the definition of that?",
      "How would I solve a problem about this?",
      "What's the formula for that?",
      "What are the key steps?",
    ],
    'devils-advocate': [
      "But what about the opposite case?",
      "That sounds too simple. What are the exceptions?",
      "How do you know that's actually true?",
      "What evidence supports that?",
      "Have you considered...?",
    ],
    'visual-learner': [
      "Can you draw that out for me?",
      "What does that look like in practice?",
      "Give me a concrete example.",
      "How would I see this in real life?",
      "Can you show me a diagram?",
    ],
    'socratic': [
      "And what follows from that?",
      "What assumptions are you making?",
      "How do you define that term?",
      "Is that always the case?",
      "What would happen if...?",
    ],
  }

  const personaQuestions = questions[persona]
  const randomQuestion = personaQuestions[Math.floor(Math.random() * personaQuestions.length)]

  // Simple gap detection (placeholder)
  const gaps: string[] = []
  if (userMessage.length < 50) {
    gaps.push('Explanation may be too brief')
  }

  return {
    content: randomQuestion,
    gaps: gaps.length > 0 ? gaps : undefined,
  }
}

async function generateGapReport(
  userTranscript: string,
  _strandContent: string
): Promise<GapReport> {
  // TODO: Replace with real AI analysis
  // This is a placeholder that generates a simple gap report

  // Simulate some analysis
  const wordCount = userTranscript.split(/\s+/).length
  const coveragePercent = Math.min(95, Math.max(30, wordCount / 5))

  return {
    covered: [
      'Basic concept introduction',
      'Key terminology',
      'Main principles',
    ],
    gaps: [
      'Detailed examples not provided',
      'Edge cases not discussed',
      'Historical context missing',
    ],
    suggestions: [
      'Review section on advanced applications',
      'Practice with more examples',
      'Explore related topics',
    ],
    coveragePercent,
  }
}

export default TeachMode
