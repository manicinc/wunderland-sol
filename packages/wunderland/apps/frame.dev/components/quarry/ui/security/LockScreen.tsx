'use client'

/**
 * Lock Screen Component
 * @module components/quarry/ui/security/LockScreen
 *
 * Full-screen overlay that blocks access when password protection is enabled
 * and the session is locked. Provides password entry, hint reveal, and lockout
 * messaging.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertTriangle,
  HelpCircle,
  KeyRound,
  Shield,
  Loader2,
  X,
  Check,
} from 'lucide-react'
import { useSecurity } from '@/lib/config/securityConfig'

// ═══════════════════════════════════════════════════════════════════════════
// LOCK SCREEN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function LockScreen() {
  const {
    unlock,
    session,
    config,
    verifySecurityAnswer,
  } = useSecurity()

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [error, setError] = useState('')
  const [showHintModal, setShowHintModal] = useState(false)
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [hintRevealed, setHintRevealed] = useState(false)
  const [answerError, setAnswerError] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Check if locked out
  const isLockedOut = session.lockedOutUntil
    ? new Date(session.lockedOutUntil).getTime() > Date.now()
    : false

  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0)

  // Update lockout timer
  useEffect(() => {
    if (!isLockedOut || !session.lockedOutUntil) return

    const updateTimer = () => {
      const remaining = Math.max(0, new Date(session.lockedOutUntil!).getTime() - Date.now())
      setLockoutRemaining(Math.ceil(remaining / 1000))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isLockedOut, session.lockedOutUntil])

  // Handle unlock attempt
  const handleUnlock = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!password.trim() || isUnlocking || isLockedOut) return

    setIsUnlocking(true)
    setError('')

    try {
      const success = await unlock(password)
      if (!success) {
        setError('Incorrect password')
        setPassword('')
        inputRef.current?.focus()
      }
    } catch (err) {
      setError('Failed to unlock')
    } finally {
      setIsUnlocking(false)
    }
  }, [password, isUnlocking, isLockedOut, unlock])

  // Handle security answer verification
  const handleVerifyAnswer = useCallback(() => {
    if (!securityAnswer.trim()) {
      setAnswerError('Please enter your answer')
      return
    }

    const isCorrect = verifySecurityAnswer(securityAnswer)
    if (isCorrect) {
      setHintRevealed(true)
      setAnswerError('')
    } else {
      setAnswerError('Incorrect answer')
    }
  }, [securityAnswer, verifySecurityAnswer])

  // Reset hint modal state
  const closeHintModal = useCallback(() => {
    setShowHintModal(false)
    setSecurityAnswer('')
    setHintRevealed(false)
    setAnswerError('')
  }, [])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/95 backdrop-blur-md">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(139, 92, 246) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Main lock card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-sm mx-4"
      >
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4 text-center border-b border-zinc-800 bg-gradient-to-b from-zinc-800/50 to-transparent">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4">
              <Lock className="w-8 h-8 text-violet-400" />
            </div>
            <h1 className="text-xl font-semibold text-zinc-100">Quarry Locked</h1>
            <p className="text-sm text-zinc-500 mt-1">Enter your password to continue</p>
          </div>

          {/* Body */}
          <form onSubmit={handleUnlock} className="p-6 space-y-4">
            {/* Lockout warning */}
            {isLockedOut && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
              >
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-red-400 font-medium">Too many failed attempts</p>
                  <p className="text-red-400/70 mt-0.5">
                    Try again in {Math.floor(lockoutRemaining / 60)}:{(lockoutRemaining % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Failed attempts warning */}
            {session.failedAttempts > 0 && session.failedAttempts < 5 && !isLockedOut && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-sm text-amber-400"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>{5 - session.failedAttempts} attempts remaining</span>
              </motion.div>
            )}

            {/* Password input */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={isLockedOut || isUnlocking}
                className={`
                  w-full pl-10 pr-12 py-3 rounded-lg border text-sm
                  bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500
                  focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
                `}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLockedOut || isUnlocking}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-sm text-red-400 text-center"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Unlock button */}
            <button
              type="submit"
              disabled={!password.trim() || isUnlocking || isLockedOut}
              className={`
                w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2
                transition-all duration-200
                ${isUnlocking || isLockedOut || !password.trim()
                  ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  : 'bg-violet-600 text-white hover:bg-violet-500 active:scale-[0.98]'
                }
              `}
            >
              {isUnlocking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Unlocking...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Unlock</span>
                </>
              )}
            </button>

            {/* Hint link */}
            {(config.passwordHint || config.securityQuestion) && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowHintModal(true)}
                  className="text-sm text-zinc-500 hover:text-violet-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Forgot password?</span>
                </button>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="px-6 py-3 bg-zinc-800/50 border-t border-zinc-800">
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-600">
              <Shield className="w-3.5 h-3.5" />
              <span>Protected by local password encryption</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Hint Modal */}
      <AnimatePresence>
        {showHintModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={closeHintModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm mx-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <h2 className="font-medium text-zinc-100">Password Recovery</h2>
                <button
                  onClick={closeHintModal}
                  className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-4 space-y-4">
                {hintRevealed ? (
                  /* Show revealed hint */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Check className="w-5 h-5" />
                      <span className="font-medium">Password Hint</span>
                    </div>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <p className="text-zinc-200">{config.passwordHint || 'No hint was set'}</p>
                    </div>
                    <button
                      onClick={closeHintModal}
                      className="w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      Close
                    </button>
                  </div>
                ) : config.securityQuestion ? (
                  /* Show security question */
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Security Question
                      </label>
                      <p className="text-zinc-400 text-sm bg-zinc-800 p-3 rounded-lg">
                        {config.securityQuestion}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Your Answer
                      </label>
                      <input
                        type="text"
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        placeholder="Enter your answer"
                        className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleVerifyAnswer()
                          }
                        }}
                      />
                      {answerError && (
                        <p className="text-sm text-red-400 mt-1.5">{answerError}</p>
                      )}
                    </div>
                    <button
                      onClick={handleVerifyAnswer}
                      disabled={!securityAnswer.trim()}
                      className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                    >
                      Reveal Hint
                    </button>
                  </div>
                ) : (
                  /* Show hint directly if no security question */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-violet-400">
                      <HelpCircle className="w-5 h-5" />
                      <span className="font-medium">Password Hint</span>
                    </div>
                    <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                      <p className="text-zinc-200">{config.passwordHint || 'No hint was set'}</p>
                    </div>
                    <button
                      onClick={closeHintModal}
                      className="w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCK SCREEN GATE - Wrapper for app layout
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gate component that shows the lock screen when password protection is active
 * and the session requires unlock. Wrap your app content with this.
 */
export function LockScreenGate({ children }: { children: React.ReactNode }) {
  const { requiresUnlock } = useSecurity()

  if (requiresUnlock) {
    return <LockScreen />
  }

  return <>{children}</>
}

export default LockScreen
