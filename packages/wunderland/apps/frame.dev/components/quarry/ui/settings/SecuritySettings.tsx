'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  KeyRound,
  Timer,
  HelpCircle,
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  Info,
  Database,
  Download,
  Upload,
  FileArchive,
  Cloud,
  HardDrive,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Fingerprint,
  Server,
} from 'lucide-react'
import {
  useSecurity,
  type SecurityConfig,
} from '@/lib/config/securityConfig'
import { isPublicAccess } from '@/lib/config/publicAccess'
import { useEncryptionStatus, useSyncMode } from '@/lib/crypto/hooks'

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

interface PasswordInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  showStrength?: boolean
  isDark: boolean
  className?: string
  autoFocus?: boolean
  id?: string
}

function PasswordInput({
  value,
  onChange,
  placeholder = 'Enter password',
  label,
  showStrength = false,
  isDark,
  className = '',
  autoFocus = false,
  id,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  
  const getStrength = (pwd: string): { level: number; label: string; color: string } => {
    if (pwd.length < 4) return { level: 0, label: 'Too short', color: 'bg-red-500' }
    if (pwd.length < 6) return { level: 1, label: 'Weak', color: 'bg-orange-500' }
    if (pwd.length < 8) return { level: 2, label: 'Fair', color: 'bg-yellow-500' }
    if (pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) {
      return { level: 4, label: 'Strong', color: 'bg-emerald-500' }
    }
    return { level: 3, label: 'Good', color: 'bg-blue-500' }
  }
  
  const strength = getStrength(value)
  
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`
            w-full pl-3 pr-10 py-2 rounded-lg border text-sm
            ${isDark
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-violet-500'
              : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-violet-500'
            }
            focus:outline-none focus:ring-2 focus:ring-violet-500/20
          `}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className={`
            absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded
            ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}
          `}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      
      {showStrength && value.length > 0 && (
        <div className="mt-2">
          <div className="flex gap-1 mb-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`
                  h-1 flex-1 rounded-full transition-colors
                  ${i <= strength.level ? strength.color : isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
                `}
              />
            ))}
          </div>
          <span className={`text-[10px] ${strength.level >= 3 ? 'text-emerald-500' : 'text-zinc-500'}`}>
            {strength.label}
          </span>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface SecuritySettingsProps {
  backendType?: 'local' | 'github' | 'hybrid'
  hasPAT?: boolean
}

export default function SecuritySettings({
  backendType = 'local',
  hasPAT = false,
}: SecuritySettingsProps) {
  const { theme } = useTheme()
  const isDark = theme?.includes('dark')
  
  const {
    config,
    session,
    isProtected,
    requiresUnlock,
    enablePasswordProtection,
    disablePasswordProtection,
    changePassword,
    setAutoLockMinutes,
    lock,
  } = useSecurity()
  
  // Check if PUBLIC_ACCESS mode blocks settings modification
  const publicAccessMode = isPublicAccess()

  // Form states
  const [mode, setMode] = useState<'view' | 'setup' | 'change' | 'disable'>('view')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [hint, setHint] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [autoLock, setAutoLock] = useState(config.autoLockMinutes)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Multi-step confirmation states (prevents accidental locking)
  // Step 1: Warning, Step 2: Form entry, Step 3: Final confirm
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1)
  const [disableStep, setDisableStep] = useState<1 | 2 | 3>(1)
  const [changeStep, setChangeStep] = useState<1 | 2 | 3>(1)
  
  // Sync auto-lock from config
  useEffect(() => {
    setAutoLock(config.autoLockMinutes)
  }, [config.autoLockMinutes])

  // Reset step counters when mode changes to view
  useEffect(() => {
    if (mode === 'view') {
      setSetupStep(1)
      setDisableStep(1)
      setChangeStep(1)
    }
  }, [mode])

  // Clear messages after timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])
  
  // Handlers
  const handleSetupPassword = useCallback(async () => {
    setError('')
    
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const success = await enablePasswordProtection(
        newPassword,
        hint || undefined,
        securityQuestion || undefined,
        securityAnswer || undefined
      )
      
      if (success) {
        setSuccess('Password protection enabled!')
        setMode('view')
        setNewPassword('')
        setConfirmPassword('')
        setHint('')
        setSecurityQuestion('')
        setSecurityAnswer('')
      } else {
        setError('Failed to enable password protection')
      }
    } catch (e) {
      setError('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }, [newPassword, confirmPassword, hint, securityQuestion, securityAnswer, enablePasswordProtection])
  
  const handleChangePassword = useCallback(async () => {
    setError('')
    
    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const success = await changePassword(currentPassword, newPassword, hint || undefined)
      
      if (success) {
        setSuccess('Password changed successfully!')
        setMode('view')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setHint('')
      } else {
        setError('Current password is incorrect')
      }
    } catch (e) {
      setError('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }, [currentPassword, newPassword, confirmPassword, hint, changePassword])
  
  const handleDisablePassword = useCallback(async () => {
    setError('')
    setIsSubmitting(true)
    
    try {
      const success = await disablePasswordProtection(currentPassword)
      
      if (success) {
        setSuccess('Password protection disabled')
        setMode('view')
        setCurrentPassword('')
      } else {
        setError('Incorrect password')
      }
    } catch (e) {
      setError('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }, [currentPassword, disablePasswordProtection])
  
  const handleAutoLockChange = useCallback((minutes: number) => {
    setAutoLock(minutes)
    setAutoLockMinutes(minutes)
  }, [setAutoLockMinutes])
  
  // Backend info notice
  const backendNotice = backendType === 'github' && !hasPAT ? (
    <div className={`
      flex items-start gap-2 p-3 rounded-lg mb-4
      ${isDark ? 'bg-amber-900/20 border border-amber-800/50' : 'bg-amber-50 border border-amber-200'}
    `}>
      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="text-xs text-amber-600 dark:text-amber-400">
        <strong>GitHub Backend:</strong> Your security settings are stored locally. 
        To sync settings across devices, add a Personal Access Token in Settings → GitHub Integration.
      </div>
    </div>
  ) : null

  // PUBLIC_ACCESS mode blocks all security settings modifications
  if (publicAccessMode) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Security & Privacy
          </h3>
        </div>

        {/* Public Access Mode Warning */}
        <div className={`
          p-4 rounded-xl border
          ${isDark ? 'bg-amber-900/10 border-amber-800/50' : 'bg-amber-50 border-amber-200'}
        `}>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Security Settings Locked
              </div>
              <div className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                Password protection cannot be modified in public access mode.
                This deployment is configured for public access.
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-3">
                Contact the administrator to change security settings or set{' '}
                <code className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded text-[10px]">
                  NEXT_PUBLIC_PUBLIC_ACCESS=false
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Current status (read-only) */}
        <div className={`
          p-4 rounded-xl border
          ${isProtected
            ? isDark ? 'bg-emerald-900/10 border-emerald-800/50' : 'bg-emerald-50/50 border-emerald-200'
            : isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
          }
        `}>
          <div className="flex items-center gap-3">
            {isProtected ? (
              <>
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Password Protection Enabled
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Settings are locked in public access mode
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <Unlock className="w-5 h-5 text-zinc-500" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    No Password Protection
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Password protection cannot be enabled in public access mode
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield className={`w-4 h-4 ${isProtected ? 'text-emerald-500' : 'text-zinc-500'}`} />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Security & Privacy
        </h3>
        {isProtected && (
          <span className="px-1.5 py-0.5 text-[9px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded">
            PROTECTED
          </span>
        )}
      </div>

      {backendNotice}
      
      {/* Status Card */}
      <div className={`
        p-4 rounded-xl border
        ${isProtected
          ? isDark ? 'bg-emerald-900/10 border-emerald-800/50' : 'bg-emerald-50/50 border-emerald-200'
          : isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
        }
      `}>
        <div className="flex items-center gap-3">
          {isProtected ? (
            <>
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Password Protection Enabled
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {config.autoLockMinutes > 0
                    ? `Auto-locks after ${config.autoLockMinutes} minutes of inactivity`
                    : 'Manual lock only'
                  }
                </div>
              </div>
              <button
                onClick={lock}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  ${isDark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-white text-zinc-700 hover:bg-zinc-100'
                  }
                  border ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
                  transition-colors
                `}
              >
                <Lock className="w-3.5 h-3.5" />
                Lock Now
              </button>
            </>
          ) : (
            <>
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Unlock className="w-5 h-5 text-zinc-500" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  No Password Protection
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Anyone with access to this device can view your data
                </div>
              </div>
              <button
                onClick={() => setMode('setup')}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-violet-500 hover:bg-violet-600 text-white
                  transition-colors
                `}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Enable
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Actions */}
      {isProtected && mode === 'view' && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMode('change')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              ${isDark
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700'
                : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-200'
              }
              border transition-colors
            `}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Change Password
          </button>
          <button
            onClick={() => setMode('disable')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              ${isDark
                ? 'text-red-400 hover:bg-red-900/20'
                : 'text-red-600 hover:bg-red-50'
              }
              transition-colors
            `}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Disable Protection
          </button>
        </div>
      )}
      
      {/* Forms */}
      <AnimatePresence mode="wait">
        {mode === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`
              p-4 rounded-xl border space-y-4
              ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'}
            `}
          >
            {/* Step indicator */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Set Up Password Protection
              </h4>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-zinc-500 mr-2">Step {setupStep}/3</span>
                <button
                  onClick={() => setMode('view')}
                  className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
            </div>

            {/* Step 1: Warning */}
            {setupStep === 1 && (
              <div className="space-y-4">
                <div className={`
                  p-4 rounded-lg flex items-start gap-3
                  ${isDark ? 'bg-amber-900/20 border border-amber-800/50' : 'bg-amber-50 border border-amber-200'}
                `}>
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">
                      Are you sure you want to enable password protection?
                    </h5>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                      This will lock the entire Quarry interface. You&apos;ll need to enter your password
                      each time you access it. Make sure you remember your password!
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setMode('view')}
                    className={`
                      flex-1 py-2 rounded-lg text-sm font-medium
                      ${isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}
                      transition-colors
                    `}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setSetupStep(2)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-violet-500 hover:bg-violet-600 text-white transition-colors"
                  >
                    Yes, Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Password Form */}
            {setupStep === 2 && (
              <div className="space-y-4">
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={setNewPassword}
                  label="Create Password"
                  placeholder="Enter a secure password"
                  showStrength
                  isDark={!!isDark}
                  autoFocus
                />

                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  isDark={!!isDark}
                />

                <div>
                  <label htmlFor="hint" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Password Hint (optional)
                  </label>
                  <input
                    id="hint"
                    type="text"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="A clue to help you remember"
                    className={`
                      w-full px-3 py-2 rounded-lg border text-sm
                      ${isDark
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                        : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
                      }
                      focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500
                    `}
                  />
                </div>

                <div className={`
                  p-3 rounded-lg border-l-2 border-violet-500
                  ${isDark ? 'bg-violet-900/10' : 'bg-violet-50'}
                `}>
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                        Security Question (optional)
                      </h5>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-2">
                        If you forget your password, answer this question to reveal your hint.
                      </p>

                      <input
                        type="text"
                        value={securityQuestion}
                        onChange={(e) => setSecurityQuestion(e.target.value)}
                        placeholder="e.g., What's your pet's name?"
                        className={`
                          w-full px-3 py-1.5 rounded border text-xs mb-2
                          ${isDark
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                            : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
                          }
                          focus:outline-none focus:ring-1 focus:ring-violet-500
                        `}
                      />

                      <input
                        type="text"
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        placeholder="Your answer"
                        className={`
                          w-full px-3 py-1.5 rounded border text-xs
                          ${isDark
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                            : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
                          }
                          focus:outline-none focus:ring-1 focus:ring-violet-500
                        `}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-500">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {error}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setSetupStep(1)}
                    className={`
                      flex-1 py-2 rounded-lg text-sm font-medium
                      ${isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}
                      transition-colors
                    `}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (newPassword.length < 4) {
                        setError('Password must be at least 4 characters')
                        return
                      }
                      if (newPassword !== confirmPassword) {
                        setError('Passwords do not match')
                        return
                      }
                      setError('')
                      setSetupStep(3)
                    }}
                    disabled={newPassword.length < 4}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Final Confirmation */}
            {setupStep === 3 && (
              <div className="space-y-4">
                <div className={`
                  p-4 rounded-lg flex items-start gap-3
                  ${isDark ? 'bg-emerald-900/20 border border-emerald-800/50' : 'bg-emerald-50 border border-emerald-200'}
                `}>
                  <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                      Ready to enable password protection
                    </h5>
                    <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                      Your password has been set. Click &quot;Enable Protection&quot; to lock the interface.
                      {hint && <span className="block mt-1">Hint: {hint}</span>}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-500">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {error}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setSetupStep(2)}
                    className={`
                      flex-1 py-2 rounded-lg text-sm font-medium
                      ${isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}
                      transition-colors
                    `}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSetupPassword}
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Enable Protection
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
        
        {mode === 'change' && (
          <motion.div
            key="change"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`
              p-4 rounded-xl border space-y-4
              ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'}
            `}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                Change Password
              </h4>
              <button
                onClick={() => setMode('view')}
                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
            
            <PasswordInput
              id="current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
              label="Current Password"
              placeholder="Enter current password"
              isDark={!!isDark}
              autoFocus
            />
            
            <PasswordInput
              id="new-password-change"
              value={newPassword}
              onChange={setNewPassword}
              label="New Password"
              placeholder="Enter new password"
              showStrength
              isDark={!!isDark}
            />
            
            <PasswordInput
              id="confirm-password-change"
              value={confirmPassword}
              onChange={setConfirmPassword}
              label="Confirm New Password"
              placeholder="Re-enter new password"
              isDark={!!isDark}
            />
            
            <div>
              <label htmlFor="hint-change" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Update Hint (optional)
              </label>
              <input
                id="hint-change"
                type="text"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder={config.passwordHint || 'A clue to help you remember'}
                className={`
                  w-full px-3 py-2 rounded-lg border text-sm
                  ${isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
                  }
                  focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500
                `}
              />
            </div>
            
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-500">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setMode('view')
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                  setHint('')
                }}
                className={`
                  flex-1 py-2 rounded-lg text-sm font-medium
                  ${isDark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }
                  transition-colors
                `}
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isSubmitting || newPassword.length < 4}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium
                  bg-violet-500 hover:bg-violet-600 text-white
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                `}
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Update Password
              </button>
            </div>
          </motion.div>
        )}
        
        {mode === 'disable' && (
          <motion.div
            key="disable"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`
              p-4 rounded-xl border space-y-4
              ${isDark ? 'bg-red-900/10 border-red-800/50' : 'bg-red-50/50 border-red-200'}
            `}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Disable Password Protection
              </h4>
              <button
                onClick={() => setMode('view')}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
            
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              This will remove password protection. Anyone with access to this device will be able to view your data.
            </p>
            
            <PasswordInput
              id="current-password-disable"
              value={currentPassword}
              onChange={setCurrentPassword}
              label="Enter Current Password to Confirm"
              placeholder="Enter your password"
              isDark={!!isDark}
              autoFocus
            />
            
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-500">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setMode('view')
                  setCurrentPassword('')
                }}
                className={`
                  flex-1 py-2 rounded-lg text-sm font-medium
                  ${isDark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
                  }
                  transition-colors
                `}
              >
                Cancel
              </button>
              <button
                onClick={handleDisablePassword}
                disabled={isSubmitting || currentPassword.length === 0}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium
                  bg-red-500 hover:bg-red-600 text-white
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                `}
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldAlert className="w-4 h-4" />
                )}
                Disable Protection
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Auto-Lock Settings */}
      {isProtected && mode === 'view' && (
        <div className={`
          p-4 rounded-xl border space-y-4
          ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'}
        `}>
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-zinc-500" />
            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Auto-Lock
            </h4>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="auto-lock" className="block text-xs text-zinc-600 dark:text-zinc-400">
              Lock automatically after inactivity
            </label>
            <select
              id="auto-lock"
              value={autoLock}
              onChange={(e) => handleAutoLockChange(Number(e.target.value))}
              className={`
                w-full px-3 py-2 rounded-lg border text-sm
                ${isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                  : 'bg-white border-zinc-300 text-zinc-900'
                }
                focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500
              `}
            >
              <option value={0}>Never (manual lock only)</option>
              <option value={1}>1 minute</option>
              <option value={5}>5 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </div>
        </div>
      )}
      
      {/* Recovery Info */}
      {isProtected && config.passwordHint && mode === 'view' && (
        <div className={`
          flex items-start gap-2 p-3 rounded-lg
          ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}
        `}>
          <Info className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-zinc-500">
            <strong>Password Hint:</strong> {config.passwordHint}
          </div>
        </div>
      )}
      
      {/* Success message */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400"
          >
            <Check className="w-4 h-4" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* How It Works Section */}
      <HowItWorksSection isDark={!!isDark} backendType={backendType} hasPAT={hasPAT} />
      
      {/* Data Management Section */}
      <DataManagementSection isDark={!!isDark} backendType={backendType} />

      {/* E2E Encryption Section */}
      <EncryptionSection isDark={!!isDark} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HOW IT WORKS SECTION
// ═══════════════════════════════════════════════════════════════════════════

interface HowItWorksSectionProps {
  isDark: boolean
  backendType: 'local' | 'github' | 'hybrid'
  hasPAT: boolean
}

function HowItWorksSection({ isDark, backendType, hasPAT }: HowItWorksSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <div className={`
      rounded-xl border overflow-hidden
      ${isDark ? 'bg-zinc-800/30 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}
    `}>
      {/* Header - clickable to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center justify-between px-4 py-3
          ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'}
          transition-colors
        `}
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            How Security & Privacy Works
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={`
              px-4 pb-4 space-y-4 border-t
              ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
            `}>
              {/* Local-First Architecture */}
              <div className="pt-4 space-y-3">
                <h5 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <Fingerprint className="w-3.5 h-3.5 text-violet-500" />
                  100% Local-First Privacy
                </h5>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-2">
                  <p>
                    <strong>Your password never leaves your device.</strong> All security data 
                    is stored in an encrypted SQLite database on your local machine.
                  </p>
                  <p>
                    Passwords are hashed using <strong>SHA-256</strong> with a unique salt 
                    before storage. The original password is never stored—only the hash.
                  </p>
                </div>
              </div>
              
              {/* Storage Backend Info */}
              <div className={`
                p-3 rounded-lg space-y-2
                ${isDark ? 'bg-zinc-900/50' : 'bg-white'}
              `}>
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Storage Backend
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {/* Local Storage */}
                  <div className={`
                    p-2 rounded-lg border text-[10px]
                    ${backendType === 'local' 
                      ? isDark ? 'border-emerald-700 bg-emerald-900/20' : 'border-emerald-300 bg-emerald-50'
                      : isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'
                    }
                  `}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <HardDrive className={`w-3 h-3 ${backendType === 'local' ? 'text-emerald-500' : 'text-zinc-400'}`} />
                      <span className={`font-medium ${backendType === 'local' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'}`}>
                        Local SQLite
                      </span>
                      {backendType === 'local' && (
                        <span className="px-1 py-0.5 text-[8px] bg-emerald-500 text-white rounded">ACTIVE</span>
                      )}
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400">
                      Data stored in browser's IndexedDB. Fully offline, private.
                    </p>
                  </div>
                  
                  {/* GitHub Storage */}
                  <div className={`
                    p-2 rounded-lg border text-[10px]
                    ${backendType === 'github'
                      ? isDark ? 'border-cyan-700 bg-cyan-900/20' : 'border-cyan-300 bg-cyan-50'
                      : isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'
                    }
                  `}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Cloud className={`w-3 h-3 ${backendType === 'github' ? 'text-cyan-500' : 'text-zinc-400'}`} />
                      <span className={`font-medium ${backendType === 'github' ? 'text-cyan-600 dark:text-cyan-400' : 'text-zinc-500'}`}>
                        GitHub Repo
                      </span>
                      {backendType === 'github' && (
                        <span className="px-1 py-0.5 text-[8px] bg-cyan-500 text-white rounded">ACTIVE</span>
                      )}
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400">
                      Syncs with GitHub repo. Requires PAT for changes.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* What's Protected */}
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  What Password Protection Covers
                </h5>
                <ul className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1 ml-5">
                  <li className="list-disc">All your notes, bookmarks, and reading history</li>
                  <li className="list-disc">Personal tags and annotations</li>
                  <li className="list-disc">AI-generated content (quizzes, flashcards, glossaries)</li>
                  <li className="list-disc">User profile and preferences</li>
                  <li className="list-disc">API keys (stored separately with encryption)</li>
                </ul>
              </div>
              
              {/* PAT Notice for GitHub mode */}
              {backendType === 'github' && (
                <div className={`
                  p-3 rounded-lg flex items-start gap-2
                  ${hasPAT 
                    ? isDark ? 'bg-emerald-900/20 border border-emerald-800/50' : 'bg-emerald-50 border border-emerald-200'
                    : isDark ? 'bg-amber-900/20 border border-amber-800/50' : 'bg-amber-50 border border-amber-200'
                  }
                `}>
                  {hasPAT ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        <strong>GitHub PAT Connected:</strong> Your security settings can sync across devices 
                        via your GitHub repository. Settings are stored in encrypted format.
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="text-[11px] text-amber-700 dark:text-amber-400">
                        <strong>No GitHub PAT:</strong> Security settings are stored locally only. 
                        To sync settings across devices, add a Personal Access Token in 
                        <strong> Settings → Content Source</strong>.
                        <a 
                          href="https://github.com/settings/tokens/new?description=FABRIC%20Codex&scopes=repo"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 ml-1 text-amber-600 dark:text-amber-300 hover:underline"
                        >
                          Generate PAT <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* Recovery Note */}
              <div className={`
                p-3 rounded-lg flex items-start gap-2 border-l-2 border-violet-500
                ${isDark ? 'bg-violet-900/10' : 'bg-violet-50'}
              `}>
                <HelpCircle className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  <strong className="text-zinc-700 dark:text-zinc-300">Forgot your password?</strong>
                  <p className="mt-0.5">
                    If you set a password hint or security question, these can help you remember. 
                    Otherwise, you can clear all local data to reset (this will erase your notes and history).
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA MANAGEMENT SECTION
// ═══════════════════════════════════════════════════════════════════════════

interface DataManagementSectionProps {
  isDark: boolean
  backendType: 'local' | 'github' | 'hybrid'
}

function DataManagementSection({ isDark, backendType }: DataManagementSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'done' | 'error'>('idle')
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'done' | 'error'>('idle')
  const [clearConfirm, setClearConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Export all local data
  const handleExportData = useCallback(async () => {
    setExportStatus('exporting')
    
    try {
      // Gather all localStorage and IndexedDB data
      const exportData: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        data: {}
      }
      
      // Get all quarry-codex prefixed localStorage items (also check legacy frame-codex)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('quarry-codex') || key.startsWith('frame-codex') || key.startsWith('fabric_'))) {
          try {
            const value = localStorage.getItem(key)
            if (value) {
              (exportData.data as Record<string, unknown>)[key] = JSON.parse(value)
            }
          } catch {
            // Non-JSON value, store as string
            const value = localStorage.getItem(key)
            if (value) {
              (exportData.data as Record<string, unknown>)[key] = value
            }
          }
        }
      }
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quarry-codex-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setExportStatus('done')
      setTimeout(() => setExportStatus('idle'), 2000)
    } catch (error) {
      console.error('Export failed:', error)
      setExportStatus('error')
      setTimeout(() => setExportStatus('idle'), 3000)
    }
  }, [])
  
  // Import data from file
  const handleImportData = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    setImportStatus('importing')
    
    try {
      const text = await file.text()
      const importData = JSON.parse(text)
      
      if (!importData.data || typeof importData.data !== 'object') {
        throw new Error('Invalid backup file format')
      }
      
      // Restore data to localStorage
      for (const [key, value] of Object.entries(importData.data)) {
        if (typeof value === 'string') {
          localStorage.setItem(key, value)
        } else {
          localStorage.setItem(key, JSON.stringify(value))
        }
      }
      
      setImportStatus('done')
      setTimeout(() => {
        setImportStatus('idle')
        // Reload to apply changes
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error('Import failed:', error)
      setImportStatus('error')
      setTimeout(() => setImportStatus('idle'), 3000)
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])
  
  // Clear all data
  const handleClearAllData = useCallback(() => {
    if (!clearConfirm) {
      setClearConfirm(true)
      setTimeout(() => setClearConfirm(false), 5000)
      return
    }
    
    // Clear all quarry-codex prefixed items (also clear legacy frame-codex)
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('quarry-codex') || key.startsWith('frame-codex') || key.startsWith('fabric_'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    // Clear IndexedDB
    if (typeof indexedDB !== 'undefined') {
      indexedDB.deleteDatabase('fabric_codex')
      indexedDB.deleteDatabase('fabric_security')
    }
    
    setClearConfirm(false)
    window.location.reload()
  }, [clearConfirm])
  
  return (
    <div className={`
      rounded-xl border overflow-hidden
      ${isDark ? 'bg-zinc-800/30 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}
    `}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center justify-between px-4 py-3
          ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'}
          transition-colors
        `}
      >
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-500" />
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Data Management
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={`
              px-4 pb-4 space-y-4 border-t
              ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
            `}>
              {/* Export/Import Section */}
              <div className="pt-4 space-y-3">
                <h5 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <FileArchive className="w-3.5 h-3.5 text-purple-500" />
                  Backup & Restore
                </h5>
                
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Export all your local data (bookmarks, notes, history, preferences) to a JSON file. 
                  Import to restore on another device or browser.
                </p>
                
                <div className="flex gap-2">
                  {/* Export Button */}
                  <button
                    onClick={handleExportData}
                    disabled={exportStatus !== 'idle'}
                    className={`
                      flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                      ${exportStatus === 'done'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : exportStatus === 'error'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : isDark
                            ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                            : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                      }
                      transition-colors disabled:opacity-50
                    `}
                  >
                    {exportStatus === 'exporting' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : exportStatus === 'done' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    {exportStatus === 'done' ? 'Exported!' : exportStatus === 'error' ? 'Error' : 'Export Backup'}
                  </button>
                  
                  {/* Import Button */}
                  <label className={`
                    flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer
                    ${importStatus === 'done'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : importStatus === 'error'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : isDark
                          ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                          : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                    }
                    transition-colors
                    ${importStatus !== 'idle' ? 'opacity-50 pointer-events-none' : ''}
                  `}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      className="hidden"
                      disabled={importStatus !== 'idle'}
                    />
                    {importStatus === 'importing' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : importStatus === 'done' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    {importStatus === 'done' ? 'Imported!' : importStatus === 'error' ? 'Error' : 'Import Backup'}
                  </label>
                </div>
              </div>
              
              {/* Storage Info */}
              <div className={`
                p-3 rounded-lg space-y-2
                ${isDark ? 'bg-zinc-900/50' : 'bg-white'}
              `}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-zinc-500" />
                    Current Storage
                  </span>
                  <span className={`
                    px-2 py-0.5 text-[10px] font-medium rounded-full
                    ${backendType === 'local'
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                      : backendType === 'github'
                        ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                        : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                    }
                  `}>
                    {backendType === 'local' ? 'Local SQLite' : backendType === 'github' ? 'GitHub Repo' : 'Hybrid'}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {backendType === 'local' && 'All data stored in browser IndexedDB. Fully private, never leaves your device.'}
                  {backendType === 'github' && 'Data synced with GitHub repository. Requires PAT for write access.'}
                  {backendType === 'hybrid' && 'Local cache with GitHub sync. Works offline after initial sync.'}
                </p>
              </div>
              
              {/* Danger Zone */}
              <div className={`
                p-3 rounded-lg border
                ${isDark ? 'border-red-800/50 bg-red-900/10' : 'border-red-200 bg-red-50/50'}
              `}>
                <h5 className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2 mb-2">
                  <Trash2 className="w-3.5 h-3.5" />
                  Danger Zone
                </h5>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mb-3">
                  Clear all local data including bookmarks, notes, history, and security settings. 
                  This cannot be undone. Export a backup first!
                </p>
                <button
                  onClick={handleClearAllData}
                  className={`
                    w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                    ${clearConfirm
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : isDark
                        ? 'bg-zinc-700 hover:bg-red-900/50 text-zinc-300 hover:text-red-300'
                        : 'bg-zinc-200 hover:bg-red-100 text-zinc-600 hover:text-red-600'
                    }
                    transition-colors
                  `}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {clearConfirm ? 'Click Again to Confirm Delete' : 'Clear All Local Data'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// E2E ENCRYPTION SECTION
// ═══════════════════════════════════════════════════════════════════════════

interface EncryptionSectionProps {
  isDark: boolean
}

// Feature flag check for cloud sync
const CLOUD_SYNC_ENABLED = false // Set to true when Quarry Sync backend launches

function EncryptionSection({ isDark }: EncryptionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { status, loading, refresh } = useEncryptionStatus()
  const { enableSync } = useSyncMode()
  const [serverUrl, setServerUrl] = useState('')
  const [showSyncSetup, setShowSyncSetup] = useState(false)
  
  // Cloud sync is disabled until backend is ready
  const cloudSyncAvailable = CLOUD_SYNC_ENABLED

  return (
    <div className={`
      rounded-xl border overflow-hidden
      ${isDark ? 'bg-zinc-800/30 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}
    `}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center justify-between px-4 py-3
          ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'}
          transition-colors
        `}
      >
        <div className="flex items-center gap-2">
          <Lock className={`w-4 h-4 ${status?.active ? 'text-emerald-500' : 'text-zinc-500'}`} />
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            End-to-End Encryption
          </span>
          {status?.active && (
            <span className="px-1.5 py-0.5 text-[9px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded">
              ACTIVE
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={`
              px-4 pb-4 space-y-4 border-t
              ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
            `}>
              {/* Encryption Status */}
              <div className="pt-4">
                <div className={`
                  p-4 rounded-xl border
                  ${status?.active
                    ? isDark ? 'bg-emerald-900/10 border-emerald-800/50' : 'bg-emerald-50/50 border-emerald-200'
                    : isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-100 border-zinc-200'
                  }
                `}>
                  <div className="flex items-start gap-3">
                    {loading ? (
                      <RefreshCw className="w-5 h-5 text-zinc-400 animate-spin" />
                    ) : status?.active ? (
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <Shield className="w-5 h-5 text-zinc-500" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {loading ? 'Checking encryption...' : status?.message || 'Encryption status unknown'}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {status?.mode === 'local' && 'Data encrypted with device key. Stays on this device.'}
                        {status?.mode === 'sync' && 'Data encrypted with your passphrase. Can sync across devices.'}
                      </div>
                      {status?.deviceId && (
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 font-mono">
                          Device: {status.deviceId.slice(0, 8)}...
                        </div>
                      )}
                    </div>
                    <button
                      onClick={refresh}
                      disabled={loading}
                      className={`
                        p-1.5 rounded-lg transition-colors
                        ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}
                      `}
                    >
                      <RefreshCw className={`w-4 h-4 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quarry Sync (Coming Soon) */}
              <div className={`
                p-4 rounded-xl border relative overflow-hidden
                ${isDark ? 'bg-zinc-800/30 border-zinc-700' : 'bg-white border-zinc-200'}
              `}>
                {/* Coming Soon overlay pattern */}
                {!cloudSyncAvailable && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-amber-500/5" />
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-cyan-500" />
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Quarry Sync
                    </span>
                    {!cloudSyncAvailable && (
                      <span className="px-1.5 py-0.5 text-[9px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded animate-pulse">
                        COMING SOON
                      </span>
                    )}
                  </div>
                  {/* Info tooltip */}
                  <div className="group relative">
                    <HelpCircle className="w-4 h-4 text-zinc-400 cursor-help" />
                    <div className={`
                      absolute right-0 top-6 w-64 p-3 rounded-lg shadow-lg z-50
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible
                      transition-all duration-200 transform group-hover:translate-y-0 translate-y-1
                      ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'}
                    `}>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        <strong className="text-zinc-800 dark:text-zinc-200">Quarry Sync</strong> will enable 
                        cross-device sync with end-to-end encryption. Your data is encrypted on-device 
                        before syncing — we never see your unencrypted data.
                      </p>
                      <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                        <p className="text-[10px] text-zinc-500">
                          ✓ AES-256-GCM encryption<br/>
                          ✓ Zero-knowledge architecture<br/>
                          ✓ Passphrase-based key derivation<br/>
                          ✓ Recovery key support
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                  {cloudSyncAvailable 
                    ? 'Sync your encrypted data across devices. Set a passphrase to derive your encryption key.'
                    : 'Cross-device sync with true end-to-end encryption. All Quarry editions will receive this as a free update when it launches.'
                  }
                </p>

                {/* Feature preview badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`
                    inline-flex items-center gap-1 px-2 py-1 rounded text-[10px]
                    ${isDark ? 'bg-zinc-700/50 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}
                  `}>
                    <Lock className="w-3 h-3" />
                    E2E Encrypted
                  </span>
                  <span className={`
                    inline-flex items-center gap-1 px-2 py-1 rounded text-[10px]
                    ${isDark ? 'bg-zinc-700/50 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}
                  `}>
                    <KeyRound className="w-3 h-3" />
                    Recovery Keys
                  </span>
                  <span className={`
                    inline-flex items-center gap-1 px-2 py-1 rounded text-[10px]
                    ${isDark ? 'bg-zinc-700/50 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}
                  `}>
                    <HardDrive className="w-3 h-3" />
                    Multi-Device
                  </span>
                </div>

                {cloudSyncAvailable ? (
                  // Real sync setup UI (enabled when backend is ready)
                  !showSyncSetup ? (
                    <button
                      onClick={() => setShowSyncSetup(true)}
                      className={`
                        w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                        bg-cyan-500 hover:bg-cyan-600 text-white transition-colors
                      `}
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      Enable Quarry Sync
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="url"
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                        placeholder="https://sync.quarry.app"
                        className={`
                          w-full px-3 py-2 rounded-lg border text-sm
                          ${isDark
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                            : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
                          }
                          focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500
                        `}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowSyncSetup(false)}
                          className={`
                            flex-1 py-2 rounded-lg text-xs font-medium
                            ${isDark ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}
                          `}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => enableSync(serverUrl)}
                          className="flex-1 py-2 rounded-lg text-xs font-medium bg-cyan-500 hover:bg-cyan-600 text-white transition-colors"
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  // Disabled placeholder (shown until backend is ready)
                  <button
                    disabled
                    className={`
                      w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium
                      cursor-not-allowed
                      ${isDark 
                        ? 'bg-zinc-700/50 text-zinc-500 border border-zinc-600/50' 
                        : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                      }
                    `}
                    title="Quarry Sync is coming soon! All editions will receive this as a free update."
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Coming Soon — Free for All Editions</span>
                  </button>
                )}
              </div>

              {/* How E2EE Works */}
              <div className={`
                p-3 rounded-lg border-l-2 border-violet-500
                ${isDark ? 'bg-violet-900/10' : 'bg-violet-50'}
              `}>
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    <strong className="text-zinc-700 dark:text-zinc-300">How it works:</strong>
                    <ul className="mt-1 space-y-1 ml-3">
                      <li className="list-disc">All data is encrypted with AES-256-GCM before storage</li>
                      <li className="list-disc">Encryption key is auto-generated and stored securely on device</li>
                      <li className="list-disc">Without cloud sync, data stays encrypted on this device only</li>
                      <li className="list-disc">Cloud sync (coming soon) will require a passphrase for multi-device access</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Devices (Available with Quarry Sync) */}
              <div className={`
                p-4 rounded-xl border transition-opacity
                ${cloudSyncAvailable ? '' : 'opacity-60'}
                ${isDark ? 'bg-zinc-800/30 border-zinc-700' : 'bg-white border-zinc-200'}
              `}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <HardDrive className={`w-4 h-4 ${cloudSyncAvailable ? 'text-cyan-500' : 'text-zinc-500'}`} />
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Synced Devices
                    </span>
                  </div>
                  {!cloudSyncAvailable && (
                    <span className={`
                      text-[10px] px-2 py-0.5 rounded
                      ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}
                    `}>
                      With Quarry Sync
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {cloudSyncAvailable 
                    ? 'Manage devices that have access to your encrypted data. Revoke access if a device is lost or compromised.'
                    : 'When Quarry Sync launches, you\'ll be able to manage which devices can access your encrypted data and revoke access remotely.'
                  }
                </p>
                {cloudSyncAvailable && (
                  <button className={`
                    mt-3 w-full py-2 rounded-lg text-xs font-medium transition-colors
                    ${isDark ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'}
                  `}>
                    Manage Devices
                  </button>
                )}
              </div>

              {/* Recovery Key (Available with Quarry Sync) */}
              <div className={`
                p-4 rounded-xl border transition-opacity
                ${cloudSyncAvailable ? '' : 'opacity-60'}
                ${isDark ? 'bg-zinc-800/30 border-zinc-700' : 'bg-white border-zinc-200'}
              `}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className={`w-4 h-4 ${cloudSyncAvailable ? 'text-amber-500' : 'text-zinc-500'}`} />
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Recovery Key
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!cloudSyncAvailable && (
                      <span className={`
                        text-[10px] px-2 py-0.5 rounded
                        ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}
                      `}>
                        With Quarry Sync
                      </span>
                    )}
                    {/* Info tooltip */}
                    <div className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-zinc-400 cursor-help" />
                      <div className={`
                        absolute right-0 top-5 w-56 p-2.5 rounded-lg shadow-lg z-50
                        opacity-0 invisible group-hover:opacity-100 group-hover:visible
                        transition-all duration-200
                        ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'}
                      `}>
                        <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          A 24-word recovery phrase that can restore your encryption key 
                          if you forget your passphrase. Store it securely offline — 
                          anyone with this phrase can access your data.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {cloudSyncAvailable 
                    ? 'Generate a 24-word recovery phrase to restore access if you forget your passphrase. Store it safely offline.'
                    : 'When Quarry Sync launches, you\'ll receive a 24-word recovery phrase to restore access to your encrypted data.'
                  }
                </p>
                {cloudSyncAvailable && (
                  <button className={`
                    mt-3 w-full py-2 rounded-lg text-xs font-medium transition-colors
                    ${isDark ? 'bg-amber-900/30 hover:bg-amber-900/50 text-amber-400' : 'bg-amber-50 hover:bg-amber-100 text-amber-700'}
                  `}>
                    Generate Recovery Key
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

