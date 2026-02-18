/**
 * Random Facts Generator for Quarry Codex
 * @module lib/quarry/facts
 * 
 * @description
 * Generates interesting random facts from user content including:
 * - Strand summaries and key insights
 * - Question/answer snippets
 * - Interesting metadata patterns
 * - Knowledge connections
 * - Study encouragement (when feature flags enable flashcards/quizzes)
 */

import type { HistoryEntry } from '@/lib/localStorage'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface RandomFact {
  /** The fact text */
  text: string
  /** Source strand path */
  sourcePath?: string
  /** Category of fact */
  category: 'insight' | 'summary' | 'question' | 'connection' | 'milestone' | 'encouragement'
  /** Relevance score (higher = more relevant) */
  relevance?: number
  /** Action type for clickable encouragements */
  actionType?: 'flashcards' | 'quiz' | 'glossary'
}

export interface StudyStats {
  /** Number of flashcard sessions completed */
  flashcardSessions?: number
  /** Number of quizzes taken */
  quizzesTaken?: number
  /** Number of glossary terms reviewed */
  glossaryTermsReviewed?: number
  /** Last study date */
  lastStudyDate?: string
}

export interface FactGeneratorOptions {
  /** Maximum number of facts to generate */
  maxFacts?: number
  /** Recent activity history for context */
  history?: HistoryEntry[]
  /** Total strands count */
  totalStrands?: number
  /** Categories to include */
  categories?: RandomFact['category'][]
  /** Study statistics for encouragement */
  studyStats?: StudyStats
  /** Feature flags for gated features */
  featureFlags?: {
    enableFlashcards?: boolean
    enableQuizzes?: boolean
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   FACT TEMPLATES
═══════════════════════════════════════════════════════════════════════════ */

const INSIGHT_TEMPLATES = [
  "Your most active topic this week appears to be {topic}.",
  "You've created {count} new strands in the past 7 days.",
  "Your writing tends to be {style} in nature.",
  "The concept of '{concept}' appears frequently in your notes.",
  "You seem particularly interested in {subject} lately.",
]

const MILESTONE_TEMPLATES = [
  "You've reached {count} total strands in your Codex!",
  "Your knowledge base now spans {count} different topics.",
  "You've been writing consistently for {days} days.",
  "Your longest strand has {words} words.",
  "You've created {count} weaves to organize your thoughts.",
]

const CONNECTION_TEMPLATES = [
  "'{strandA}' and '{strandB}' share similar themes.",
  "Your notes on {topic} connect to {count} other strands.",
  "The tag '{tag}' appears across {count} different strands.",
  "You might find interesting connections between {topicA} and {topicB}.",
]

const QUESTION_TEMPLATES = [
  "Have you explored how {topicA} relates to {topicB}?",
  "What new insights have you gained about {topic}?",
  "When was the last time you revisited your notes on {topic}?",
  "How has your understanding of {concept} evolved?",
]

const SUMMARY_TEMPLATES = [
  "From your recent writing: \"{summary}\"",
  "A key idea from '{strand}': \"{insight}\"",
  "You wrote about {topic}: \"{excerpt}\"",
]

/* ═══════════════════════════════════════════════════════════════════════════
   FALLBACK FACTS
═══════════════════════════════════════════════════════════════════════════ */

const FALLBACK_FACTS: RandomFact[] = [
  {
    text: "Writing helps crystallize your thoughts and deepen understanding.",
    category: 'insight',
  },
  {
    text: "Connecting ideas across different domains often leads to creative breakthroughs.",
    category: 'connection',
  },
  {
    text: "Regular journaling has been shown to improve clarity and reduce stress.",
    category: 'insight',
  },
  {
    text: "The act of explaining something in writing tests how well you truly understand it.",
    category: 'insight',
  },
  {
    text: "Great thinkers throughout history kept detailed notes of their ideas.",
    category: 'insight',
  },
  {
    text: "Revisiting old notes often reveals new perspectives you missed before.",
    category: 'question',
  },
  {
    text: "Knowledge compounds over time when you connect and build upon your ideas.",
    category: 'connection',
  },
  {
    text: "Your personal knowledge base is a reflection of your intellectual journey.",
    category: 'insight',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   STUDY ENCOURAGEMENT FACTS
═══════════════════════════════════════════════════════════════════════════ */

const FLASHCARD_ENCOURAGEMENTS: RandomFact[] = [
  {
    text: "🧠 You've been exploring great content! Try flashcards to lock it in your memory.",
    category: 'encouragement',
    relevance: 0.95,
    actionType: 'flashcards',
  },
  {
    text: "📚 Spaced repetition with flashcards can boost retention by 200%. Give it a try!",
    category: 'encouragement',
    relevance: 0.9,
    actionType: 'flashcards',
  },
  {
    text: "💡 Turn your reading into lasting knowledge — create flashcards from your recent strands.",
    category: 'encouragement',
    relevance: 0.88,
    actionType: 'flashcards',
  },
  {
    text: "🎯 Active recall beats passive reading. Ready to test yourself with flashcards?",
    category: 'encouragement',
    relevance: 0.85,
    actionType: 'flashcards',
  },
]

const QUIZ_ENCOURAGEMENTS: RandomFact[] = [
  {
    text: "🎮 You've been reading a lot! Take a quick quiz to solidify your understanding.",
    category: 'encouragement',
    relevance: 0.95,
    actionType: 'quiz',
  },
  {
    text: "🧪 Testing yourself is the fastest path to mastery. Try a quiz on what you've learned!",
    category: 'encouragement',
    relevance: 0.9,
    actionType: 'quiz',
  },
  {
    text: "🏆 Challenge yourself — quizzes reveal gaps in understanding you didn't know existed.",
    category: 'encouragement',
    relevance: 0.88,
    actionType: 'quiz',
  },
  {
    text: "📈 Learning science shows: retrieval practice (quizzes) outperforms re-reading 3x.",
    category: 'encouragement',
    relevance: 0.85,
    actionType: 'quiz',
  },
]

const COMBINED_STUDY_ENCOURAGEMENTS: RandomFact[] = [
  {
    text: "🌟 Great explorers also practice! Try flashcards or a quiz to reinforce your learning.",
    category: 'encouragement',
    relevance: 0.92,
  },
  {
    text: "🚀 You're on a knowledge journey! Level up with active learning tools.",
    category: 'encouragement',
    relevance: 0.87,
  },
]

/**
 * Check if user should receive study encouragement
 * Triggers when: browsed 5+ strands recently but hasn't studied
 */
function shouldShowStudyEncouragement(
  history: HistoryEntry[],
  studyStats?: StudyStats
): boolean {
  if (!history || history.length < 5) return false
  
  // Check if user has studied recently (within last 3 days)
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
  
  // If study stats exist and show recent activity, don't encourage
  if (studyStats?.lastStudyDate) {
    const lastStudy = new Date(studyStats.lastStudyDate).getTime()
    if (lastStudy > threeDaysAgo) return false
  }
  
  // User has been browsing but not studying - show encouragement
  const recentBrowsing = history.filter(h => 
    new Date(h.viewedAt).getTime() > threeDaysAgo
  ).length
  
  return recentBrowsing >= 5
}

/**
 * Get a study encouragement fact based on available features
 */
function getStudyEncouragement(
  enableFlashcards: boolean,
  enableQuizzes: boolean
): RandomFact | null {
  const pool: RandomFact[] = []
  
  if (enableFlashcards && enableQuizzes) {
    // Both enabled - use combined or pick randomly
    if (Math.random() > 0.7) {
      pool.push(...COMBINED_STUDY_ENCOURAGEMENTS)
    } else {
      pool.push(
        ...FLASHCARD_ENCOURAGEMENTS.slice(0, 2),
        ...QUIZ_ENCOURAGEMENTS.slice(0, 2)
      )
    }
  } else if (enableFlashcards) {
    pool.push(...FLASHCARD_ENCOURAGEMENTS)
  } else if (enableQuizzes) {
    pool.push(...QUIZ_ENCOURAGEMENTS)
  }
  
  if (pool.length === 0) return null
  
  return pool[Math.floor(Math.random() * pool.length)]
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get a random item from an array
 */
function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Shuffle an array in place (Fisher-Yates)
 */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Determine how many facts to show based on activity
 */
export function getFactCountByActivity(history: HistoryEntry[]): number {
  if (history.length === 0) return 1
  
  const now = Date.now()
  const oneDayAgo = now - 24 * 60 * 60 * 1000
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000
  
  const recentDayActivity = history.filter(h => 
    new Date(h.viewedAt).getTime() > oneDayAgo
  ).length
  
  const recentWeekActivity = history.filter(h => 
    new Date(h.viewedAt).getTime() > oneWeekAgo
  ).length
  
  // More recent activity = more facts
  if (recentDayActivity >= 5) return 3
  if (recentWeekActivity >= 10) return 2
  return 1
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate random facts from user content and activity
 */
export function generateRandomFacts(options: FactGeneratorOptions = {}): RandomFact[] {
  const { 
    maxFacts = 3, 
    history = [], 
    totalStrands = 0, 
    studyStats, 
    featureFlags 
  } = options
  
  const facts: RandomFact[] = []
  
  // Check for study encouragement first (highest priority when applicable)
  const enableFlashcards = featureFlags?.enableFlashcards ?? false
  const enableQuizzes = featureFlags?.enableQuizzes ?? false
  
  if ((enableFlashcards || enableQuizzes) && shouldShowStudyEncouragement(history, studyStats)) {
    const encouragement = getStudyEncouragement(enableFlashcards, enableQuizzes)
    if (encouragement) {
      facts.push(encouragement)
    }
  }
  
  // Add milestone facts if applicable
  if (totalStrands > 0) {
    if (totalStrands >= 100) {
      facts.push({
        text: `🎉 You've built an impressive collection of ${totalStrands} strands!`,
        category: 'milestone',
        relevance: 1,
      })
    } else if (totalStrands >= 50) {
      facts.push({
        text: `📚 Your Codex now contains ${totalStrands} strands of knowledge.`,
        category: 'milestone',
        relevance: 0.9,
      })
    } else if (totalStrands >= 10) {
      facts.push({
        text: `🌱 Your knowledge garden is growing with ${totalStrands} strands.`,
        category: 'milestone',
        relevance: 0.8,
      })
    }
  }
  
  // Add activity-based facts
  if (history.length > 0) {
    const recentPaths = history.slice(0, 5).map(h => h.path)
    const topics = recentPaths.map(p => {
      const parts = p.split('/')
      return parts[parts.length - 1]?.replace(/\.mdx?$/, '') || 'your notes'
    })
    
    if (topics.length > 0) {
      facts.push({
        text: `You've been exploring "${topics[0]}" recently. Great to see you diving deeper!`,
        category: 'insight',
        relevance: 0.85,
      })
    }
    
    if (history.length >= 10) {
      facts.push({
        text: `You've viewed ${history.length} different strands. Active engagement strengthens understanding.`,
        category: 'insight',
        relevance: 0.7,
      })
    }
  }
  
  // Fill remaining slots with fallback facts
  const shuffledFallbacks = shuffle([...FALLBACK_FACTS])
  while (facts.length < maxFacts && shuffledFallbacks.length > 0) {
    const fallback = shuffledFallbacks.pop()
    if (fallback) {
      facts.push(fallback)
    }
  }
  
  return facts.slice(0, maxFacts)
}

/**
 * Get daily facts (consistent for the day)
 */
export function getDailyFacts(options: FactGeneratorOptions = {}): string[] {
  const { maxFacts = 3 } = options
  const factCount = options.history 
    ? getFactCountByActivity(options.history) 
    : maxFacts
  
  const facts = generateRandomFacts({ ...options, maxFacts: factCount })
  return facts.map(f => f.text)
}

/**
 * Get personalized facts based on user content
 * This is a placeholder for future NLP-based fact extraction
 */
export async function getPersonalizedFacts(options: FactGeneratorOptions = {}): Promise<RandomFact[]> {
  // For now, use the synchronous generator
  // In the future, this could analyze strand content with NLP
  return generateRandomFacts(options)
}






