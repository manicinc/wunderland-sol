/**
 * useCoverAnalyzer Hook
 * @module lib/workers/useCoverAnalyzer
 *
 * React hook for using the cover analyzer web worker.
 * Provides async analysis of content for cover suggestions.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CoverAnalysisJob,
  CoverAnalysisResult,
  WorkerMessage,
  WorkerResponse,
} from './coverAnalyzer.worker'

// ============================================================================
// TYPES
// ============================================================================

export interface UseCoverAnalyzerReturn {
  /** Analyze a single job */
  analyze: (job: CoverAnalysisJob) => Promise<CoverAnalysisResult>
  /** Analyze multiple jobs in batch */
  analyzeBatch: (jobs: CoverAnalysisJob[]) => Promise<CoverAnalysisResult[]>
  /** Whether worker is currently processing */
  isAnalyzing: boolean
  /** Current progress for batch operations */
  progress: { current: number; total: number } | null
  /** Any error that occurred */
  error: string | null
  /** Whether worker is ready */
  isReady: boolean
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useCoverAnalyzer(): UseCoverAnalyzerReturn {
  const workerRef = useRef<Worker | null>(null)
  const resolversRef = useRef<Map<string, {
    resolve: (result: CoverAnalysisResult) => void
    reject: (error: Error) => void
  }>>(new Map())
  const batchResolverRef = useRef<{
    resolve: (results: CoverAnalysisResult[]) => void
    reject: (error: Error) => void
  } | null>(null)

  const [isReady, setIsReady] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize worker
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      // Create worker from blob for better Next.js compatibility
      const workerCode = `
        ${WORKER_CODE}
      `
      const blob = new Blob([workerCode], { type: 'application/javascript' })
      const workerUrl = URL.createObjectURL(blob)
      
      workerRef.current = new Worker(workerUrl)
      
      workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { type, result, results, error: workerError, progress: prog, total } = event.data

        switch (type) {
          case 'result':
            if (result) {
              const resolver = resolversRef.current.get(result.id)
              if (resolver) {
                resolver.resolve(result)
                resolversRef.current.delete(result.id)
              }
              setIsAnalyzing(resolversRef.current.size > 0 || batchResolverRef.current !== null)
            }
            break

          case 'batch-complete':
            if (results && batchResolverRef.current) {
              batchResolverRef.current.resolve(results)
              batchResolverRef.current = null
              setIsAnalyzing(false)
              setProgress(null)
            }
            break

          case 'progress':
            if (prog !== undefined && total !== undefined) {
              setProgress({ current: prog, total })
            }
            break

          case 'error':
            setError(workerError || 'Unknown worker error')
            // Reject all pending
            resolversRef.current.forEach(resolver => {
              resolver.reject(new Error(workerError))
            })
            resolversRef.current.clear()
            if (batchResolverRef.current) {
              batchResolverRef.current.reject(new Error(workerError))
              batchResolverRef.current = null
            }
            setIsAnalyzing(false)
            break
        }
      }

      workerRef.current.onerror = (event) => {
        console.error('[useCoverAnalyzer] Worker error:', event)
        setError(event.message || 'Worker error')
      }

      setIsReady(true)

      return () => {
        workerRef.current?.terminate()
        URL.revokeObjectURL(workerUrl)
      }
    } catch (err) {
      console.error('[useCoverAnalyzer] Failed to create worker:', err)
      setError(err instanceof Error ? err.message : 'Failed to create worker')
    }
  }, [])

  // Analyze single job
  const analyze = useCallback((job: CoverAnalysisJob): Promise<CoverAnalysisResult> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        // Fallback to synchronous analysis if worker not available
        const result = analyzeFallback(job)
        resolve(result)
        return
      }

      setError(null)
      setIsAnalyzing(true)
      resolversRef.current.set(job.id, { resolve, reject })

      workerRef.current.postMessage({
        type: 'analyze',
        job,
      } as WorkerMessage)
    })
  }, [])

  // Analyze batch
  const analyzeBatch = useCallback((jobs: CoverAnalysisJob[]): Promise<CoverAnalysisResult[]> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        // Fallback to synchronous analysis
        const results = jobs.map(analyzeFallback)
        resolve(results)
        return
      }

      setError(null)
      setIsAnalyzing(true)
      setProgress({ current: 0, total: jobs.length })
      batchResolverRef.current = { resolve, reject }

      workerRef.current.postMessage({
        type: 'batch',
        jobs,
      } as WorkerMessage)
    })
  }, [])

  return {
    analyze,
    analyzeBatch,
    isAnalyzing,
    progress,
    error,
    isReady,
  }
}

// ============================================================================
// FALLBACK ANALYSIS (for SSR or when worker fails)
// ============================================================================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  technology: ['code', 'api', 'software', 'programming', 'developer'],
  science: ['research', 'study', 'experiment', 'analysis'],
  creative: ['design', 'art', 'creative', 'visual'],
  business: ['business', 'strategy', 'revenue', 'market'],
  personal: ['journal', 'reflection', 'thoughts', 'personal'],
  nature: ['nature', 'outdoor', 'travel', 'environment'],
  education: ['learn', 'tutorial', 'guide', 'course'],
  projects: ['project', 'task', 'milestone', 'roadmap'],
}

const PATTERNS: Record<string, string[]> = {
  technology: ['circuits', 'hexagons', 'mesh'],
  science: ['constellation', 'crystalline', 'topography'],
  creative: ['aurora', 'abstract', 'waves'],
  default: ['mesh', 'abstract', 'waves'],
}

const COLORS: Record<string, string[]> = {
  technology: ['#6366f1', '#3b82f6', '#06b6d4'],
  science: ['#8b5cf6', '#6366f1', '#14b8a6'],
  creative: ['#ec4899', '#f43f5e', '#8b5cf6'],
  default: ['#6366f1', '#8b5cf6', '#3b82f6'],
}

function analyzeFallback(job: CoverAnalysisJob): CoverAnalysisResult {
  const text = `${job.name} ${job.description || ''} ${job.content || ''}`.toLowerCase()
  
  let bestCategory = 'default'
  let bestScore = 0
  const matchedKeywords: string[] = []

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter(kw => text.includes(kw))
    if (matches.length > bestScore) {
      bestScore = matches.length
      bestCategory = category
      matchedKeywords.push(...matches)
    }
  }

  const patterns = PATTERNS[bestCategory] || PATTERNS.default
  const colors = COLORS[bestCategory] || COLORS.default
  const seed = job.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)

  return {
    id: job.id,
    category: bestCategory,
    confidence: Math.min(bestScore * 0.2, 1),
    suggestedPattern: patterns[seed % patterns.length],
    suggestedColor: colors[seed % colors.length],
    keywords: matchedKeywords.slice(0, 5),
  }
}

// ============================================================================
// INLINE WORKER CODE
// ============================================================================

const WORKER_CODE = `
const CATEGORY_KEYWORDS = {
  technology: {
    keywords: ['code', 'api', 'software', 'tech', 'developer', 'programming', 'framework', 'library', 'database', 'server', 'cloud', 'devops'],
    weight: 1.2
  },
  science: {
    keywords: ['research', 'study', 'experiment', 'theory', 'hypothesis', 'analysis', 'data', 'scientific', 'laboratory'],
    weight: 1.0
  },
  creative: {
    keywords: ['design', 'art', 'creative', 'visual', 'aesthetic', 'color', 'typography', 'illustration', 'animation', 'ui', 'ux'],
    weight: 1.1
  },
  business: {
    keywords: ['business', 'strategy', 'revenue', 'profit', 'market', 'sales', 'customer', 'product', 'startup'],
    weight: 1.0
  },
  personal: {
    keywords: ['journal', 'diary', 'reflection', 'thoughts', 'personal', 'life', 'goals', 'habits', 'wellness'],
    weight: 0.9
  },
  nature: {
    keywords: ['nature', 'outdoor', 'travel', 'environment', 'hiking', 'wildlife', 'garden', 'forest', 'ocean'],
    weight: 1.0
  },
  education: {
    keywords: ['learn', 'tutorial', 'guide', 'course', 'lesson', 'teach', 'student', 'education', 'training'],
    weight: 1.1
  },
  projects: {
    keywords: ['project', 'task', 'milestone', 'sprint', 'roadmap', 'planning', 'timeline', 'deadline'],
    weight: 1.0
  }
};

const PATTERNS = {
  technology: ['circuits', 'hexagons', 'mesh'],
  science: ['constellation', 'crystalline', 'topography'],
  creative: ['aurora', 'abstract', 'waves'],
  business: ['geometric', 'mesh', 'topography'],
  personal: ['waves', 'aurora', 'abstract'],
  nature: ['topography', 'waves', 'aurora'],
  education: ['constellation', 'geometric', 'hexagons'],
  projects: ['geometric', 'circuits', 'mesh'],
  default: ['mesh', 'abstract', 'waves']
};

const COLORS = {
  technology: ['#6366f1', '#3b82f6', '#06b6d4'],
  science: ['#8b5cf6', '#6366f1', '#14b8a6'],
  creative: ['#ec4899', '#f43f5e', '#8b5cf6'],
  business: ['#1e293b', '#64748b', '#3b82f6'],
  personal: ['#f97316', '#eab308', '#22c55e'],
  nature: ['#22c55e', '#14b8a6', '#3b82f6'],
  education: ['#6366f1', '#8b5cf6', '#06b6d4'],
  projects: ['#f97316', '#3b82f6', '#6366f1'],
  default: ['#6366f1', '#8b5cf6', '#3b82f6']
};

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\\s-]/g, ' ').split(/\\s+/).filter(w => w.length > 2);
}

function analyzeContent(job) {
  const fullText = [job.name, job.description || '', job.content || '', ...(job.existingTags || [])].join(' ');
  const tokens = tokenize(fullText);
  const tokenSet = new Set(tokens);
  
  let bestCategory = 'default';
  let bestScore = 0;
  let matchedKeywords = [];
  
  for (const [category, data] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    const matches = [];
    for (const keyword of data.keywords) {
      if (tokenSet.has(keyword)) {
        score += 2 * data.weight;
        matches.push(keyword);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
      matchedKeywords = matches;
    }
  }
  
  const category = bestScore > 1 ? bestCategory : 'default';
  const patterns = PATTERNS[category] || PATTERNS.default;
  const colors = COLORS[category] || COLORS.default;
  const seed = job.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  
  return {
    id: job.id,
    category,
    confidence: Math.min(bestScore / 10, 1),
    suggestedPattern: patterns[seed % patterns.length],
    suggestedColor: colors[seed % colors.length],
    keywords: matchedKeywords.slice(0, 5)
  };
}

self.onmessage = function(event) {
  const { type, job, jobs } = event.data;
  
  try {
    if (type === 'analyze' && job) {
      self.postMessage({ type: 'result', result: analyzeContent(job) });
    } else if (type === 'batch' && jobs) {
      const results = [];
      for (let i = 0; i < jobs.length; i++) {
        results.push(analyzeContent(jobs[i]));
        if ((i + 1) % 10 === 0 || i === jobs.length - 1) {
          self.postMessage({ type: 'progress', progress: i + 1, total: jobs.length });
        }
      }
      self.postMessage({ type: 'batch-complete', results });
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message });
  }
};
`

export default useCoverAnalyzer

