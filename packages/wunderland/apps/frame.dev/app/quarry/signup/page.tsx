'use client'

/**
 * Signup Page
 *
 * Provides registration options:
 * - Google OAuth (recommended - enables calendar sync)
 * - Email/password signup
 */

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Info,
  Loader2,
  Compass,
  Calendar,
  Image as ImageIcon,
  ArrowRight,
  Check,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'

// Google icon component
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

// Password strength indicator
function PasswordStrength({ password }: { password: string }) {
  const checks = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  }

  const passedChecks = Object.values(checks).filter(Boolean).length

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`
              h-1 flex-1 rounded-full transition-colors
              ${passedChecks >= i
                ? passedChecks >= 3 ? 'bg-emerald-500' : 'bg-amber-500'
                : 'bg-zinc-200 dark:bg-zinc-700'
              }
            `}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1 text-[10px]">
        {[
          { key: 'length', label: '8+ characters' },
          { key: 'hasUpper', label: 'Uppercase' },
          { key: 'hasLower', label: 'Lowercase' },
          { key: 'hasNumber', label: 'Number' },
        ].map(({ key, label }) => (
          <div
            key={key}
            className={`
              flex items-center gap-1
              ${checks[key as keyof typeof checks]
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-zinc-400 dark:text-zinc-500'
              }
            `}
          >
            {checks[key as keyof typeof checks] ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme } = useTheme()
  const isDark = theme?.includes('dark')

  const {
    isLoading,
    isAuthenticated,
    signupWithEmail,
    loginWithGoogle,
    error,
    clearError,
  } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const redirectTo = searchParams.get('redirect') || '/quarry'

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push(redirectTo)
    }
  }, [isAuthenticated, isLoading, router, redirectTo])

  // Handle email signup
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setWarning(null)
    clearError()

    // Validate passwords match
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    // Validate password strength
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await signupWithEmail(email, password)
      if (result.warning) {
        setWarning(result.warning)
      }
      router.push(redirectTo)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed'
      setLocalError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Google signup
  const handleGoogleSignup = async () => {
    setLocalError(null)
    setWarning(null)
    clearError()
    setIsSubmitting(true)

    try {
      await loginWithGoogle()
      router.push(redirectTo)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google signup failed'
      setLocalError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayError = localError || error
  const passwordsMatch = password === confirmPassword || confirmPassword === ''

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          w-full max-w-md p-8 rounded-2xl
          ${isDark ? 'bg-zinc-900/80 border border-zinc-800' : 'bg-white border border-zinc-200 shadow-lg'}
        `}
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Compass className="w-8 h-8 text-violet-500" />
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              quarry.space
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Create your account
          </p>
        </div>

        {/* Google Sign Up (Recommended) */}
        <button
          onClick={handleGoogleSignup}
          disabled={isSubmitting}
          className={`
            w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
            font-medium transition-all
            ${isDark
              ? 'bg-white text-zinc-900 hover:bg-zinc-100'
              : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Continue with Google
        </button>

        {/* Google Benefits */}
        <div className={`
          flex items-start gap-2 mt-3 p-3 rounded-lg text-xs
          ${isDark ? 'bg-violet-900/20 text-violet-300' : 'bg-violet-50 text-violet-700'}
        `}>
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Recommended:</span> One-click signup with automatic
            calendar sync, profile picture, and future Drive integration
            <div className="flex items-center gap-4 mt-2 text-[10px] opacity-75">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Calendar
              </span>
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3" /> Profile
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">or</span>
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSignup} className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={`
                  w-full pl-10 pr-4 py-2.5 rounded-lg text-sm
                  ${isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
                  }
                  border focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500
                `}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                minLength={8}
                className={`
                  w-full pl-10 pr-10 py-2.5 rounded-lg text-sm
                  ${isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
                  }
                  border focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500
                `}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && <PasswordStrength password={password} />}
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                className={`
                  w-full pl-10 pr-10 py-2.5 rounded-lg text-sm
                  ${isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
                  }
                  ${!passwordsMatch ? 'border-red-500' : ''}
                  border focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500
                `}
              />
            </div>
            {!passwordsMatch && confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          {/* Error */}
          {displayError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {displayError}
            </div>
          )}

          {/* Warning */}
          {warning && (
            <div className={`
              flex items-start gap-2 p-3 rounded-lg text-xs
              ${isDark ? 'bg-amber-900/20 text-amber-300' : 'bg-amber-50 text-amber-700'}
            `}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{warning}</span>
            </div>
          )}

          {/* Email Signup Warning */}
          <div className={`
            flex items-start gap-2 p-3 rounded-lg text-xs
            ${isDark ? 'bg-amber-900/20 text-amber-300' : 'bg-amber-50 text-amber-700'}
          `}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Email signup doesn&apos;t support Google Calendar integration.
              You can connect Google later in settings.
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !email || !password || !confirmPassword || !passwordsMatch || password.length < 8}
            className={`
              w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
              font-medium text-sm transition-all
              bg-violet-600 text-white hover:bg-violet-700
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Create Account
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Sign In Link */}
        <div className="text-center mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Already have an account?{' '}
            <Link
              href={`/quarry/login${redirectTo !== '/quarry' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
              className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Terms */}
        <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-500 mt-4">
          By creating an account, you agree to our{' '}
          <Link href="/quarry/privacy" className="underline hover:text-zinc-600">
            Privacy Policy
          </Link>{' '}
          and{' '}
          <Link href="/quarry/terms" className="underline hover:text-zinc-600">
            Terms of Service
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
