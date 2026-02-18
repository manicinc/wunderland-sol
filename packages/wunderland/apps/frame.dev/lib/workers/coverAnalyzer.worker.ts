/**
 * Cover Analyzer Web Worker
 * @module lib/workers/coverAnalyzer
 *
 * Runs NLP analysis in background to suggest cover patterns and colors
 * based on content semantics. Uses keyword matching and TF-IDF-like scoring.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CoverAnalysisJob {
  id: string
  name: string
  description?: string
  content?: string
  existingTags?: string[]
}

export interface CoverAnalysisResult {
  id: string
  category: string
  confidence: number
  suggestedPattern: string
  suggestedColor: string
  keywords: string[]
}

export interface WorkerMessage {
  type: 'analyze' | 'batch' | 'cancel'
  jobs?: CoverAnalysisJob[]
  job?: CoverAnalysisJob
  jobId?: string
}

export interface WorkerResponse {
  type: 'result' | 'batch-complete' | 'error' | 'progress'
  result?: CoverAnalysisResult
  results?: CoverAnalysisResult[]
  error?: string
  progress?: number
  total?: number
}

// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================

const CATEGORY_KEYWORDS: Record<string, { keywords: string[]; weight: number }> = {
  technology: {
    keywords: [
      'code', 'api', 'software', 'tech', 'developer', 'programming', 'framework',
      'library', 'database', 'server', 'cloud', 'devops', 'backend', 'frontend',
      'javascript', 'typescript', 'python', 'react', 'node', 'docker', 'kubernetes',
      'algorithm', 'data structure', 'git', 'deployment', 'microservice', 'rest',
      'graphql', 'websocket', 'authentication', 'security', 'testing', 'ci/cd'
    ],
    weight: 1.2,
  },
  science: {
    keywords: [
      'research', 'study', 'experiment', 'theory', 'hypothesis', 'analysis',
      'data', 'scientific', 'laboratory', 'discovery', 'physics', 'chemistry',
      'biology', 'mathematics', 'statistics', 'model', 'simulation', 'observation',
      'methodology', 'peer review', 'publication', 'citation', 'evidence'
    ],
    weight: 1.0,
  },
  creative: {
    keywords: [
      'design', 'art', 'creative', 'visual', 'aesthetic', 'color', 'typography',
      'illustration', 'animation', 'ui', 'ux', 'graphic', 'photography', 'video',
      'music', 'sound', 'composition', 'style', 'brand', 'portfolio', 'sketch',
      'wireframe', 'prototype', 'figma', 'canvas'
    ],
    weight: 1.1,
  },
  business: {
    keywords: [
      'business', 'strategy', 'revenue', 'profit', 'market', 'sales', 'customer',
      'product', 'startup', 'enterprise', 'roi', 'kpi', 'metric', 'growth',
      'acquisition', 'retention', 'funnel', 'conversion', 'analytics', 'report',
      'quarterly', 'stakeholder', 'investment', 'funding'
    ],
    weight: 1.0,
  },
  personal: {
    keywords: [
      'journal', 'diary', 'reflection', 'thoughts', 'personal', 'life', 'goals',
      'habits', 'wellness', 'mindfulness', 'meditation', 'gratitude', 'dream',
      'memory', 'story', 'experience', 'feeling', 'emotion', 'growth', 'self'
    ],
    weight: 0.9,
  },
  nature: {
    keywords: [
      'nature', 'outdoor', 'travel', 'environment', 'hiking', 'wildlife', 'garden',
      'forest', 'ocean', 'mountain', 'river', 'lake', 'landscape', 'sunset',
      'sunrise', 'weather', 'climate', 'ecosystem', 'conservation', 'sustainability'
    ],
    weight: 1.0,
  },
  education: {
    keywords: [
      'learn', 'tutorial', 'guide', 'course', 'lesson', 'teach', 'student',
      'education', 'training', 'skill', 'curriculum', 'exam', 'certificate',
      'workshop', 'lecture', 'assignment', 'syllabus', 'academic', 'study'
    ],
    weight: 1.1,
  },
  projects: {
    keywords: [
      'project', 'task', 'milestone', 'sprint', 'roadmap', 'planning', 'timeline',
      'deadline', 'deliverable', 'scope', 'requirement', 'specification', 'feature',
      'release', 'version', 'backlog', 'kanban', 'agile', 'scrum', 'jira'
    ],
    weight: 1.0,
  },
}

const CATEGORY_PATTERNS: Record<string, string[]> = {
  technology: ['circuits', 'hexagons', 'mesh'],
  science: ['constellation', 'crystalline', 'topography'],
  creative: ['aurora', 'abstract', 'waves'],
  business: ['geometric', 'mesh', 'topography'],
  personal: ['waves', 'aurora', 'abstract'],
  nature: ['topography', 'waves', 'aurora'],
  education: ['constellation', 'geometric', 'hexagons'],
  projects: ['geometric', 'circuits', 'mesh'],
  default: ['mesh', 'abstract', 'waves'],
}

const CATEGORY_COLORS: Record<string, string[]> = {
  technology: ['#6366f1', '#3b82f6', '#06b6d4'],
  science: ['#8b5cf6', '#6366f1', '#14b8a6'],
  creative: ['#ec4899', '#f43f5e', '#8b5cf6'],
  business: ['#1e293b', '#64748b', '#3b82f6'],
  personal: ['#f97316', '#eab308', '#22c55e'],
  nature: ['#22c55e', '#14b8a6', '#3b82f6'],
  education: ['#6366f1', '#8b5cf6', '#06b6d4'],
  projects: ['#f97316', '#3b82f6', '#6366f1'],
  default: ['#6366f1', '#8b5cf6', '#3b82f6'],
}

// ============================================================================
// NLP UTILITIES
// ============================================================================

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2)
}

/**
 * Calculate keyword score for a category
 */
function calculateCategoryScore(
  tokens: string[],
  category: string,
  categoryData: { keywords: string[]; weight: number }
): { score: number; matchedKeywords: string[] } {
  const tokenSet = new Set(tokens)
  const matchedKeywords: string[] = []
  let score = 0

  for (const keyword of categoryData.keywords) {
    const keywordTokens = keyword.toLowerCase().split(/\s+/)
    
    // Check for exact match or all tokens present
    if (keywordTokens.every(kt => tokenSet.has(kt))) {
      matchedKeywords.push(keyword)
      // Longer keywords are more specific, give them more weight
      score += keywordTokens.length * 2
    } else if (keywordTokens.some(kt => tokenSet.has(kt))) {
      // Partial match - lower score
      score += 0.5
    }
  }

  // Apply category weight
  score *= categoryData.weight

  return { score, matchedKeywords }
}

/**
 * Analyze text content and determine best category
 */
function analyzeContent(job: CoverAnalysisJob): CoverAnalysisResult {
  // Combine all text sources
  const fullText = [
    job.name,
    job.description || '',
    job.content || '',
    ...(job.existingTags || []),
  ].join(' ')

  const tokens = tokenize(fullText)
  
  // Score each category
  const categoryScores: Array<{
    category: string
    score: number
    matchedKeywords: string[]
  }> = []

  for (const [category, categoryData] of Object.entries(CATEGORY_KEYWORDS)) {
    const { score, matchedKeywords } = calculateCategoryScore(tokens, category, categoryData)
    categoryScores.push({ category, score, matchedKeywords })
  }

  // Sort by score descending
  categoryScores.sort((a, b) => b.score - a.score)

  // Get best match
  const bestMatch = categoryScores[0]
  const totalScore = categoryScores.reduce((sum, c) => sum + c.score, 0)
  const confidence = totalScore > 0 ? Math.min(bestMatch.score / totalScore, 1) : 0

  // Use default if no good match
  const category = bestMatch.score > 1 ? bestMatch.category : 'default'
  const patterns = CATEGORY_PATTERNS[category] || CATEGORY_PATTERNS.default
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.default

  // Generate deterministic selection based on name
  const seed = job.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

  return {
    id: job.id,
    category,
    confidence: Math.round(confidence * 100) / 100,
    suggestedPattern: patterns[seed % patterns.length],
    suggestedColor: colors[seed % colors.length],
    keywords: bestMatch.matchedKeywords.slice(0, 5),
  }
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.onmessage = function(event: MessageEvent<WorkerMessage>) {
  const { type, job, jobs, jobId } = event.data

  try {
    switch (type) {
      case 'analyze':
        if (job) {
          const result = analyzeContent(job)
          self.postMessage({
            type: 'result',
            result,
          } as WorkerResponse)
        }
        break

      case 'batch':
        if (jobs && jobs.length > 0) {
          const results: CoverAnalysisResult[] = []
          
          for (let i = 0; i < jobs.length; i++) {
            results.push(analyzeContent(jobs[i]))
            
            // Report progress every 10 items
            if ((i + 1) % 10 === 0 || i === jobs.length - 1) {
              self.postMessage({
                type: 'progress',
                progress: i + 1,
                total: jobs.length,
              } as WorkerResponse)
            }
          }

          self.postMessage({
            type: 'batch-complete',
            results,
          } as WorkerResponse)
        }
        break

      case 'cancel':
        // In a real implementation, we'd have a way to cancel ongoing work
        break

      default:
        self.postMessage({
          type: 'error',
          error: `Unknown message type: ${type}`,
        } as WorkerResponse)
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as WorkerResponse)
  }
}

// Export types for TypeScript
export {}

