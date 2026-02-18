'use client'

/**
 * Login Page
 *
 * Provides authentication options:
 * - Google OAuth (recommended - enables calendar sync)
 * - Email/password login
 * - Guest access as Traveler
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

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme } = useTheme()
  const isDark = theme?.includes('dark')

  const {
    isLoading,
    isAuthenticated,
    loginWithEmail,
    loginWithGoogle,
    error,
    clearError,
  } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const redirectTo = searchParams.get('redirect') || '/quarry'

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push(redirectTo)
    }
  }, [isAuthenticated, isLoading, router, redirectTo])

  // Handle email login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    clearError()
    setIsSubmitting(true)

    try {
      await loginWithEmail(email, password)
      router.push(redirectTo)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setLocalError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Google login
  const handleGoogleLogin = async () => {
    setLocalError(null)
    clearError()
    setIsSubmitting(true)

    try {
      await loginWithGoogle()
      router.push(redirectTo)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google login failed'
      setLocalError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayError = localError || error

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
            Sign in to your account
          </p>
        </div>

        {/* Google Sign In (Recommended) */}
        <button
          onClick={handleGoogleLogin}
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

        {/* Google Benefits Tooltip */}
        <div className={`
          flex items-start gap-2 mt-3 p-3 rounded-lg text-xs
          ${isDark ? 'bg-violet-900/20 text-violet-300' : 'bg-violet-50 text-violet-700'}
        `}>
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Recommended:</span> Enables calendar sync,
            profile picture, and future Drive integration
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
        <form onSubmit={handleEmailLogin} className="space-y-4">
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
                placeholder="Enter your password"
                required
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
          </div>

          {/* Error */}
          {displayError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {displayError}
            </div>
          )}

          {/* Email Login Warning */}
          <div className={`
            flex items-start gap-2 p-3 rounded-lg text-xs
            ${isDark ? 'bg-amber-900/20 text-amber-300' : 'bg-amber-50 text-amber-700'}
          `}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Email login doesn&apos;t support Google Calendar integration.
              You can connect Google later in settings.
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !email || !password}
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
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Forgot Password */}
        <div className="text-center mt-4">
          <Link
            href="/quarry/login/reset"
            className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
          >
            Forgot your password?
          </Link>
        </div>

        {/* Sign Up Link */}
        <div className="text-center mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Don&apos;t have an account?{' '}
            <Link
              href={`/quarry/signup${redirectTo !== '/quarry' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
              className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Continue as Traveler */}
        <div className="text-center mt-4">
          <Link
            href="/quarry"
            className="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <Compass className="w-4 h-4" />
            Continue as Traveler
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
