/**
 * Strand Creation Wizard - First-time User Onboarding
 * @module codex/ui/StrandCreationWizard
 * 
 * @description
 * Step-by-step wizard for first-time users creating strands.
 * Explains OpenStrand concepts, hierarchy rules, metadata fields,
 * and best practices.
 * 
 * @features
 * - First-time auto-show with "don't show again" option
 * - Reactivatable from help menu
 * - Step-by-step explanation of:
 *   - Topics vs Tags (critical distinction)
 *   - Folder hierarchy = topic specificity
 *   - Metadata fields and their purpose
 *   - Relationships and prerequisites
 * - Animated transitions between steps
 * - Keyboard navigation
 * - Progress persistence
 * 
 * @example
 * ```tsx
 * <StrandCreationWizard
 *   isOpen={showWizard}
 *   onClose={() => setShowWizard(false)}
 *   onNeverShowAgain={() => {
 *     setShowWizard(false)
 *     localStorage.setItem('wizard-never-show', 'true')
 *   }}
 * />
 * ```
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Lightbulb,
  Layers,
  Tag,
  FolderTree,
  FileText,
  GitBranch,
  BookOpen,
  Info,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  Eye,
  EyeOff,
  Play,
  ChevronDown,
  ChevronUp,
  Code,
} from 'lucide-react'
import { Z_INDEX } from '../../constants'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface StrandCreationWizardProps {
  /** Whether the wizard is open */
  isOpen: boolean
  /** Callback when wizard is closed */
  onClose: () => void
  /** Callback when user selects "don't show again" */
  onNeverShowAgain?: () => void
  /** Theme */
  theme?: string
}

interface WizardStep {
  id: string
  title: string
  icon: React.ReactNode
  content: React.ReactNode
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const WIZARD_STORAGE_KEY = 'codex-strand-wizard-completed'
const WIZARD_NEVER_SHOW_KEY = 'codex-strand-wizard-never-show'

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Check if wizard should show automatically (first time + not disabled)
 */
export function shouldShowWizard(): boolean {
  if (typeof window === 'undefined') return false
  const neverShow = localStorage.getItem(WIZARD_NEVER_SHOW_KEY)
  const completed = localStorage.getItem(WIZARD_STORAGE_KEY)
  return neverShow !== 'true' && completed !== 'true'
}

/**
 * Mark wizard as completed
 */
export function markWizardCompleted(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(WIZARD_STORAGE_KEY, 'true')
}

/**
 * Set "never show again" preference
 */
export function setWizardNeverShow(value: boolean): void {
  if (typeof window === 'undefined') return
  if (value) {
    localStorage.setItem(WIZARD_NEVER_SHOW_KEY, 'true')
  } else {
    localStorage.removeItem(WIZARD_NEVER_SHOW_KEY)
  }
}

/**
 * Reset wizard (show again next time)
 */
export function resetWizard(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(WIZARD_STORAGE_KEY)
  localStorage.removeItem(WIZARD_NEVER_SHOW_KEY)
}

/**
 * Check if wizard is disabled
 */
export function isWizardDisabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(WIZARD_NEVER_SHOW_KEY) === 'true'
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEP CONTENT COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

function WelcomeStep() {
  return (
    <div className="space-y-4">
      <p className="text-zinc-600 dark:text-zinc-300">
        Welcome to the <strong>Strand Creation Wizard</strong>! This guide will help you understand
        how to create well-structured content in OpenStrand.
      </p>
      
      <div className="p-4 bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-1">
              What you'll learn:
            </h4>
            <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
              <li>• The critical difference between Topics and Tags</li>
              <li>• How folder structure defines topic hierarchy</li>
              <li>• Essential metadata fields and their purpose</li>
              <li>• Best practices for relationships</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Security note */}
      <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-violet-700 dark:text-violet-300">
            <strong>Privacy first:</strong> All your data is encrypted with AES-256-GCM and stored locally. 
            Nothing leaves your device unless you explicitly use cloud AI features.
          </p>
        </div>
      </div>
      
      <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
        This wizard won't show again after completion, but you can always access it
        from the Help menu.
      </p>
    </div>
  )
}

function TopicsVsTagsStep() {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-amber-800 dark:text-amber-200 font-medium">
            This is the most important concept to understand!
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Topics */}
        <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-700">
          <div className="flex items-center gap-2 mb-3">
            <FolderTree className="w-5 h-5 text-cyan-600" />
            <h4 className="font-bold text-cyan-800 dark:text-cyan-200">Topics</h4>
          </div>
          <ul className="text-sm text-cyan-700 dark:text-cyan-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-cyan-500">→</span>
              <span><strong>Hierarchical</strong> - get more specific as you go deeper</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500">→</span>
              <span>Defined by <strong>folder structure</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500">→</span>
              <span>Child is always a <strong>subtopic</strong> of parent</span>
            </li>
          </ul>
        </div>
        
        {/* Tags */}
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-5 h-5 text-purple-600" />
            <h4 className="font-bold text-purple-800 dark:text-purple-200">Tags</h4>
          </div>
          <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-purple-500">→</span>
              <span><strong>Independent</strong> - flat labels, no hierarchy</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500">→</span>
              <span>Can be <strong>shared</strong> across any folder level</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500">→</span>
              <span>Used for <strong>cross-cutting concerns</strong></span>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        <strong>Example:</strong> A strand in <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">machine-learning/neural-networks/transformers/</code>{' '}
        inherits topics: ML → Neural Networks → Transformers. But it can have tags like{' '}
        <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">python</code>,{' '}
        <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">beginner</code>, or{' '}
        <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">tutorial</code> regardless of its location.
      </div>
    </div>
  )
}

function HierarchyStep() {
  return (
    <div className="space-y-4">
      <p className="text-zinc-600 dark:text-zinc-300">
        The folder structure in OpenStrand is <strong>semantic</strong>, not just organizational.
        Deeper folders mean more specific topics.
      </p>
      
      {/* Visual tree */}
      <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-mono text-sm overflow-x-auto">
        <div className="text-zinc-500 dark:text-zinc-400 mb-2">Loom: "Machine Learning Research"</div>
        <div className="space-y-1 text-zinc-700 dark:text-zinc-300">
          <div>├─ <span className="text-cyan-600">Neural Networks</span> <span className="text-zinc-400">← SUBTOPIC of ML</span></div>
          <div>│  ├─ <span className="text-cyan-600">Convolutional</span> <span className="text-zinc-400">← SUBTOPIC of NN</span></div>
          <div>│  │  └─ <span className="text-emerald-600">resnet.md</span> <span className="text-zinc-400">← Very specific</span></div>
          <div>│  └─ <span className="text-cyan-600">Recurrent</span> <span className="text-zinc-400">← SUBTOPIC of NN</span></div>
          <div>│     └─ <span className="text-emerald-600">lstm.md</span></div>
          <div>└─ <span className="text-cyan-600">Traditional</span></div>
          <div>   ├─ <span className="text-emerald-600">decision-trees.md</span></div>
          <div>   └─ <span className="text-emerald-600">svm.md</span></div>
        </div>
      </div>
      
      <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-700">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-rose-800 dark:text-rose-200 mb-1">
              ❌ Don't do this:
            </h4>
            <p className="text-sm text-rose-700 dark:text-rose-300">
              Don't put a strand about "Python basics" inside "Advanced Algorithms" folder.
              The folder path implies the content is an advanced subtopic.
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-1">
              ✓ Do this instead:
            </h4>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Place content in the folder that matches its topic specificity.
              Use tags for cross-cutting attributes like difficulty level.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetadataFieldsStep() {
  return (
    <div className="space-y-4">
      <p className="text-zinc-600 dark:text-zinc-300">
        Each strand has YAML frontmatter with essential metadata. Here's what each field means:
      </p>
      
      <div className="space-y-3">
        {[
          {
            field: 'title',
            required: true,
            description: 'Human-readable title displayed in navigation',
            example: '"Introduction to Neural Networks"',
          },
          {
            field: 'summary',
            required: false,
            description: 'Brief description for search results and previews',
            example: '"A beginner-friendly overview of neural network concepts"',
          },
          {
            field: 'tags',
            required: false,
            description: 'Independent labels for filtering (use YAML array syntax!)',
            example: '[python, beginner, tutorial]',
          },
          {
            field: 'difficulty',
            required: false,
            description: 'Content difficulty level',
            example: 'beginner | intermediate | advanced | expert',
          },
          {
            field: 'relationships.prerequisites',
            required: false,
            description: 'Strands that should be read before this one',
            example: '["basics/intro.md", "math/linear-algebra.md"]',
          },
          {
            field: 'relationships.references',
            required: false,
            description: 'Related strands (see also)',
            example: '["advanced/optimization.md"]',
          },
        ].map(({ field, required, description, example }) => (
          <div
            key={field}
            className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700"
          >
            <div className="flex items-center gap-2 mb-1">
              <code className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {field}
              </code>
              {required && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded">
                  REQUIRED
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">{description}</p>
            <code className="text-xs text-zinc-500 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
              {example}
            </code>
          </div>
        ))}
      </div>
      
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Pro tip:</strong> Tags must be a YAML array like <code>[tag1, tag2]</code>,
            not a comma-separated string like <code>"tag1, tag2"</code>.
          </p>
        </div>
      </div>
    </div>
  )
}

function ExecutableCodeTip() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="mt-4 border border-cyan-200 dark:border-cyan-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 hover:from-cyan-100 hover:to-blue-100 dark:hover:from-cyan-900/30 dark:hover:to-blue-900/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/40 rounded-lg">
            <Play className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <span className="font-semibold text-cyan-800 dark:text-cyan-200">
            Executable Code Blocks
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded">
            NEW
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 bg-white dark:bg-zinc-900 space-y-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Make your code blocks interactive by adding <code className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-emerald-600 dark:text-emerald-400">exec</code> after the language identifier:
              </p>

              <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg font-mono text-xs overflow-x-auto">
                <div className="text-zinc-500 dark:text-zinc-400">```javascript exec</div>
                <div className="text-blue-600 dark:text-blue-400">console.log("Hello, FABRIC!");</div>
                <div className="text-zinc-500 dark:text-zinc-400">```</div>
              </div>

              <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
                <p><strong>Supported languages:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <strong>JavaScript/TypeScript</strong> - Runs in browser
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <strong>Python/Bash</strong> - Requires backend server
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <strong>Go/Rust</strong> - Uses external playground APIs
                  </li>
                </ul>
              </div>

              <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>Best for:</strong> Self-contained examples that produce visible output.
                    Don't use on snippets that require external imports or won't run standalone.
                  </p>
                </div>
              </div>

              <a
                href="/wiki/tutorials/executable-code"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                <Code className="w-4 h-4" />
                Read the full guide
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function BestPracticesStep() {
  return (
    <div className="space-y-4">
      <p className="text-zinc-600 dark:text-zinc-300">
        Follow these best practices to create high-quality, discoverable content:
      </p>
      
      <div className="space-y-3">
        {[
          {
            icon: <FileText className="w-4 h-4" />,
            title: 'Clear titles',
            description: 'Use descriptive titles that indicate the topic and scope',
            color: 'blue',
          },
          {
            icon: <GitBranch className="w-4 h-4" />,
            title: 'Define relationships',
            description: 'Link prerequisites to help learners find the optimal path',
            color: 'purple',
          },
          {
            icon: <Tag className="w-4 h-4" />,
            title: 'Use specific tags',
            description: 'Include language, framework, and difficulty tags',
            color: 'emerald',
          },
          {
            icon: <Layers className="w-4 h-4" />,
            title: 'Respect hierarchy',
            description: 'Place content in the most specific applicable folder',
            color: 'amber',
          },
          {
            icon: <BookOpen className="w-4 h-4" />,
            title: 'Write summaries',
            description: 'Add a summary for search results and quick previews',
            color: 'cyan',
          },
        ].map(({ icon, title, description, color }) => (
          <div
            key={title}
            className={`flex items-start gap-3 p-3 rounded-lg bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-200 dark:border-${color}-700`}
          >
            <div className={`p-1.5 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600`}>
              {icon}
            </div>
            <div>
              <h4 className={`font-semibold text-${color}-800 dark:text-${color}-200 text-sm`}>
                {title}
              </h4>
              <p className={`text-xs text-${color}-700 dark:text-${color}-300`}>{description}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <h4 className="font-bold text-emerald-800 dark:text-emerald-200">
            You're ready!
          </h4>
        </div>
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          You now understand the key concepts for creating strands in OpenStrand.
          The smart auto-fill feature will help suggest tags and metadata as you write.
        </p>
      </div>

      {/* Expandable section for executable code blocks */}
      <ExecutableCodeTip />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Strand Creation Wizard
 * 
 * Step-by-step onboarding for first-time users creating strands.
 */
export default function StrandCreationWizard({
  isOpen,
  onClose,
  onNeverShowAgain,
  theme = 'light',
}: StrandCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [neverShow, setNeverShow] = useState(false)
  
  const isDark = theme.includes('dark')
  
  // Wizard steps
  const steps: WizardStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      icon: <Sparkles className="w-5 h-5" />,
      content: <WelcomeStep />,
    },
    {
      id: 'topics-vs-tags',
      title: 'Topics vs Tags',
      icon: <AlertTriangle className="w-5 h-5" />,
      content: <TopicsVsTagsStep />,
    },
    {
      id: 'hierarchy',
      title: 'Folder Hierarchy',
      icon: <FolderTree className="w-5 h-5" />,
      content: <HierarchyStep />,
    },
    {
      id: 'metadata',
      title: 'Metadata Fields',
      icon: <FileText className="w-5 h-5" />,
      content: <MetadataFieldsStep />,
    },
    {
      id: 'best-practices',
      title: 'Best Practices',
      icon: <CheckCircle className="w-5 h-5" />,
      content: <BestPracticesStep />,
    },
  ]
  
  const step = steps[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1
  const progress = ((currentStep + 1) / steps.length) * 100
  
  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      } else if (e.key === 'ArrowRight' && !isLast) {
        setCurrentStep(s => s + 1)
      } else if (e.key === 'ArrowLeft' && !isFirst) {
        setCurrentStep(s => s - 1)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentStep, isFirst, isLast])
  
  const handleNext = useCallback(() => {
    if (isLast) {
      markWizardCompleted()
      if (neverShow) {
        setWizardNeverShow(true)
        onNeverShowAgain?.()
      }
      onClose()
    } else {
      setCurrentStep(s => s + 1)
    }
  }, [isLast, neverShow, onClose, onNeverShowAgain])
  
  const handlePrev = useCallback(() => {
    if (!isFirst) {
      setCurrentStep(s => s - 1)
    }
  }, [isFirst])
  
  const handleClose = useCallback(() => {
    if (neverShow) {
      setWizardNeverShow(true)
      onNeverShowAgain?.()
    }
    onClose()
  }, [neverShow, onClose, onNeverShowAgain])
  
  if (!isOpen) return null
  
  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                   md:w-[640px] md:max-w-[90vw] md:max-h-[85vh]
                   bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl
                   flex flex-col overflow-hidden"
        style={{ zIndex: Z_INDEX.MODAL }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Strand Creation Guide</h2>
                <p className="text-sm text-white/80">Step {currentStep + 1} of {steps.length}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mt-3">
            {steps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(i)}
                className={`
                  p-1.5 rounded-full transition-all
                  ${i === currentStep 
                    ? 'bg-white text-emerald-600 scale-110' 
                    : i < currentStep
                      ? 'bg-white/40 text-white'
                      : 'bg-white/20 text-white/60'
                  }
                `}
                title={s.title}
              >
                {s.icon}
              </button>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                  {step.title}
                </h3>
              </div>
              
              {step.content}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Footer */}
        <div className={`p-4 border-t ${isDark ? 'border-zinc-800 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'}`}>
          <div className="flex items-center justify-between">
            {/* Don't show again checkbox */}
            <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={neverShow}
                onChange={(e) => setNeverShow(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-600 text-emerald-500 focus:ring-emerald-500"
              />
              Don't show this again
            </label>
            
            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
              >
                {isLast ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}







