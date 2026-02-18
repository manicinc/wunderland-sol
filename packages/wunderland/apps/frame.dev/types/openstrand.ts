/**
 * OpenStrand PKMS Type Definitions
 * 
 * Comprehensive type system for the enhanced knowledge management features
 * including relationships, flashcards, quizzes, roadmaps, and gamification.
 * 
 * @module types/openstrand
 */

// ============================================================================
// RELATIONSHIP SYSTEM
// ============================================================================

/**
 * All supported relationship types between strands
 */
export type RelationshipType =
  | 'follows'       // Prerequisite learning path
  | 'requires'      // Hard dependency
  | 'extends'       // Builds upon
  | 'contradicts'   // Opposing viewpoints
  | 'examples'      // Illustrative content
  | 'summarizes'    // Condensed version
  | 'implements'    // Practical application
  | 'questions'     // Raises inquiry about
  | 'references'    // General citation
  | 'related'       // Loosely related

/**
 * Visual representation for relationship types
 */
export interface RelationshipVisuals {
  lineStyle: 'solid' | 'dashed' | 'dotted'
  color: string
  arrowType: 'none' | 'forward' | 'backward' | 'both'
  label: string
  description: string
}

/**
 * Default visual configuration for each relationship type
 */
export const RELATIONSHIP_VISUALS: Record<RelationshipType, RelationshipVisuals> = {
  follows: {
    lineStyle: 'solid',
    color: '#00C896', // frame-green
    arrowType: 'forward',
    label: 'follows',
    description: 'This content should be learned after the target'
  },
  requires: {
    lineStyle: 'solid',
    color: '#FF6B6B', // frame-accent
    arrowType: 'forward',
    label: 'requires',
    description: 'This content depends on understanding the target'
  },
  extends: {
    lineStyle: 'dashed',
    color: '#4D96FF',
    arrowType: 'forward',
    label: 'extends',
    description: 'This content builds upon the target'
  },
  contradicts: {
    lineStyle: 'dotted',
    color: '#FF9F43',
    arrowType: 'both',
    label: 'contradicts',
    description: 'These contents present opposing viewpoints'
  },
  examples: {
    lineStyle: 'dashed',
    color: '#A855F7',
    arrowType: 'backward',
    label: 'examples',
    description: 'The target provides examples of this concept'
  },
  summarizes: {
    lineStyle: 'dotted',
    color: '#06B6D4',
    arrowType: 'backward',
    label: 'summarizes',
    description: 'This content is a summary of the target'
  },
  implements: {
    lineStyle: 'solid',
    color: '#10B981',
    arrowType: 'forward',
    label: 'implements',
    description: 'This content is a practical implementation of the target'
  },
  questions: {
    lineStyle: 'dotted',
    color: '#F59E0B',
    arrowType: 'forward',
    label: 'questions',
    description: 'This content raises questions about the target'
  },
  references: {
    lineStyle: 'dotted',
    color: '#6B7280',
    arrowType: 'forward',
    label: 'references',
    description: 'This content cites or references the target'
  },
  related: {
    lineStyle: 'dotted',
    color: '#9CA3AF',
    arrowType: 'none',
    label: 'related',
    description: 'These contents are loosely related'
  }
}

/**
 * Single relationship reference with metadata
 */
export interface RelationshipRef {
  /** Target strand identifier (slug or UUID) */
  targetSlug: string
  /** Type of relationship */
  type: RelationshipType
  /** Relationship strength (0.0 - 1.0) */
  strength?: number
  /** Whether this relationship is bidirectional */
  bidirectional?: boolean
  /** Type of the reverse relationship if bidirectional */
  reverseType?: RelationshipType
  /** Additional metadata */
  metadata?: {
    /** Learning path this relationship belongs to */
    learningPath?: string
    /** Estimated time to cover this relationship */
    estimatedTime?: string
    /** Custom notes about the relationship */
    notes?: string
    /** Priority order if multiple relationships exist */
    order?: number
  }
}

/**
 * Enhanced strand relationships structure
 */
export interface EnhancedRelationships {
  follows?: RelationshipRef[]
  requires?: RelationshipRef[]
  extends?: RelationshipRef[]
  contradicts?: RelationshipRef[]
  examples?: RelationshipRef[]
  summarizes?: RelationshipRef[]
  implements?: RelationshipRef[]
  questions?: RelationshipRef[]
  references?: RelationshipRef[]
  related?: RelationshipRef[]
}

/**
 * Graph node for visualization
 */
export interface GraphNode {
  id: string
  slug: string
  title: string
  level: 'fabric' | 'weave' | 'loom' | 'strand'
  /** Node position (if pre-computed) */
  x?: number
  y?: number
  /** Node size based on connections/importance */
  size?: number
  /** Color based on subject/topic */
  color?: string
  /** Current state */
  state?: 'default' | 'hovered' | 'selected' | 'highlighted' | 'dimmed'
  /** Metadata for tooltips */
  metadata?: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
    strandCount?: number
    tags?: string[]
  }
}

/**
 * Graph edge for visualization
 */
export interface GraphEdge {
  id: string
  source: string
  target: string
  type: RelationshipType
  strength: number
  visuals: RelationshipVisuals
  /** Current state */
  state?: 'default' | 'hovered' | 'highlighted' | 'dimmed'
}

/**
 * Complete graph data structure
 */
export interface KnowledgeGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  /** Computed clusters/communities */
  clusters?: {
    id: string
    nodeIds: string[]
    label: string
    color: string
  }[]
}

// ============================================================================
// FLASHCARD SYSTEM
// ============================================================================

/**
 * Flashcard content type
 */
export type FlashcardType = 
  | 'basic'           // Simple front/back
  | 'cloze'           // Fill-in-the-blank
  | 'image-occlusion' // Hidden image areas
  | 'audio'           // Audio-based

/**
 * How the flashcard was generated
 */
export type FlashcardSource = 
  | 'manual'          // User-created
  | 'static'          // NLP/rule-based generation
  | 'llm'             // LLM-generated

/**
 * FSRS (Free Spaced Repetition Scheduler) state
 * Based on FSRS-5 algorithm
 */
export interface FSRSState {
  /** Card difficulty (1-10, default 5) */
  difficulty: number
  /** Stability in days (time for 90% retrievability) */
  stability: number
  /** Current probability of recall (0-1) */
  retrievability: number
  /** Last review date (ISO string) */
  lastReview: string | null
  /** Next scheduled review (ISO string) */
  nextReview: string
  /** Total number of reviews */
  reps: number
  /** Number of times forgotten (rated 'Again') */
  lapses: number
  /** Current learning state */
  state: 'new' | 'learning' | 'review' | 'relearning'
}

/**
 * Rating options for flashcard review
 */
export type FlashcardRating = 1 | 2 | 3 | 4 // Again, Hard, Good, Easy

/**
 * Review history entry
 */
export interface ReviewEntry {
  date: string
  rating: FlashcardRating
  elapsedDays: number
  scheduledDays: number
  state: FSRSState['state']
}

/**
 * Single flashcard
 */
export interface Flashcard {
  /** Unique identifier (UUID) */
  id: string
  /** Parent strand slug */
  strandSlug: string
  /** Optional block reference within the strand */
  blockId?: string
  /** Card type */
  type: FlashcardType
  
  // Content
  /** Question/prompt side (markdown) */
  front: string
  /** Answer side (markdown) */
  back: string
  /** Progressive hints */
  hints?: string[]
  /** Extra notes visible after reveal */
  notes?: string
  
  // Generation metadata
  /** How this card was created */
  source: FlashcardSource
  /** Generation details */
  generation?: {
    method: 'keyword-extraction' | 'cloze-deletion' | 'question-generation' | 'definition-extraction' | 'cached' | 'llm' | 'llm-fallback'
    confidence: number
    sourceText?: string
  }
  
  // Spaced repetition
  fsrs: FSRSState
  
  // Review history
  history?: ReviewEntry[]
  
  // Organization
  tags: string[]
  /** Whether this card is suspended/disabled */
  suspended: boolean
  /** User-marked as a favorite */
  starred: boolean
  
  // Timestamps
  createdAt: string
  updatedAt: string
}

/**
 * Flashcard deck (collection of cards for a strand/loom/weave)
 */
export interface FlashcardDeck {
  id: string
  /** Parent entity (strand/loom/weave slug) */
  entitySlug: string
  entityType: 'strand' | 'loom' | 'weave'
  title: string
  description?: string
  
  /** Card IDs in this deck */
  cardIds: string[]
  
  /** Deck statistics */
  stats: {
    totalCards: number
    newCards: number
    learningCards: number
    reviewCards: number
    dueCards: number
    suspendedCards: number
    matureCards: number // Cards with stability > 21 days
    averageRetention: number
  }
  
  /** Last study session */
  lastStudied?: string
  
  createdAt: string
  updatedAt: string
}

// ============================================================================
// QUIZ SYSTEM
// ============================================================================

/**
 * Quiz question types
 */
export type QuizQuestionType = 
  | 'multiple-choice'
  | 'true-false'
  | 'short-answer'
  | 'matching'
  | 'ordering'

/**
 * Single quiz question
 */
export interface QuizQuestion {
  id: string
  type: QuizQuestionType
  /** Question text (markdown) */
  question: string
  /** Answer options (for multiple choice, matching, etc.) */
  options?: string[]
  /** Correct answer(s) */
  correctAnswer: string | string[]
  /** Explanation shown after answering */
  explanation?: string
  /** Difficulty level */
  difficulty: 'easy' | 'medium' | 'hard'
  /** How this question was generated */
  source: FlashcardSource
  /** Points awarded for correct answer */
  points: number
  /** Time limit in seconds (optional) */
  timeLimit?: number
  /** Hint text */
  hint?: string
}

/**
 * Quiz definition
 */
export interface Quiz {
  id: string
  strandSlug: string
  title: string
  description?: string
  questions: QuizQuestion[]
  
  /** Quiz settings */
  settings: {
    /** Minimum score to pass (0-100) */
    passingScore: number
    /** Total time limit in minutes */
    timeLimit?: number
    /** Shuffle question order */
    shuffleQuestions: boolean
    /** Shuffle answer options */
    shuffleOptions: boolean
    /** Show correct answers after each question */
    showAnswersImmediately: boolean
    /** Allow retries */
    allowRetry: boolean
    /** Maximum attempts */
    maxAttempts?: number
  }
  
  createdAt: string
  updatedAt: string
}

/**
 * Quiz attempt/submission
 */
export interface QuizAttempt {
  id: string
  quizId: string
  /** User's answers */
  answers: {
    questionId: string
    answer: string | string[]
    correct: boolean
    timeSpent: number // seconds
  }[]
  
  /** Results */
  score: number
  percentage: number
  passed: boolean
  totalTime: number // seconds
  
  /** XP earned for this attempt */
  xpEarned: number
  
  submittedAt: string
}

// ============================================================================
// LEARNING ROADMAP SYSTEM
// ============================================================================

/**
 * Milestone types in a roadmap
 */
export type MilestoneType = 'quiz' | 'project' | 'review' | 'checkpoint'

/**
 * Single strand reference in a roadmap
 */
export interface RoadmapStrandRef {
  strandSlug: string
  /** Override display title */
  customTitle?: string
  /** Instructor notes */
  notes?: string
  /** Whether this strand is required */
  required: boolean
  /** Estimated completion time in minutes */
  estimatedMinutes?: number
}

/**
 * External resource reference
 */
export interface ExternalResource {
  title: string
  url: string
  type: 'video' | 'article' | 'course' | 'documentation' | 'tool' | 'other'
  /** Estimated time in minutes */
  estimatedMinutes?: number
  /** Whether this is required or optional */
  required: boolean
}

/**
 * Roadmap stage/section
 */
export interface RoadmapStage {
  id: string
  title: string
  description: string
  order: number
  
  /** Required strands for this stage */
  strands: RoadmapStrandRef[]
  /** Optional deep-dive strands */
  optionalStrands?: RoadmapStrandRef[]
  /** External resources */
  externalResources?: ExternalResource[]
  
  /** Stage milestone */
  milestone?: {
    title: string
    type: MilestoneType
    /** Quiz ID if type is 'quiz' */
    quizId?: string
    /** Project description if type is 'project' */
    projectDescription?: string
    /** Minimum score to unlock next stage (for quiz milestones) */
    requiredScore?: number
  }
  
  /** Estimated hours for this stage */
  estimatedHours: number
  /** Whether this entire stage is optional */
  isOptional: boolean
}

/**
 * Learning roadmap
 */
export interface LearningRoadmap {
  id: string
  title: string
  description: string
  /** Cover image URL */
  coverImage?: string
  /** Author information */
  author: {
    name: string
    avatar?: string
    url?: string
  }
  
  /** Roadmap structure */
  stages: RoadmapStage[]
  
  /** Prerequisites (strands that should be completed first) */
  prerequisites: string[]
  /** Learning outcomes */
  outcomes: string[]
  
  /** Metadata */
  estimatedDuration: string // e.g., "3 months", "40 hours"
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  
  /** Visibility and sharing */
  visibility: 'private' | 'unlisted' | 'public'
  /** Number of times this roadmap was forked */
  forkCount: number
  /** Original roadmap if this is a fork */
  forkedFrom?: string
  
  createdAt: string
  updatedAt: string
}

/**
 * User progress through a roadmap
 */
export interface RoadmapProgress {
  roadmapId: string
  /** Current stage index */
  currentStageIndex: number
  /** Completed strand slugs */
  completedStrands: string[]
  /** Completed milestone IDs */
  completedMilestones: string[]
  /** Quiz attempts keyed by quiz ID */
  quizAttempts: Record<string, QuizAttempt[]>
  
  /** Progress percentage (0-100) */
  progressPercentage: number
  
  /** Timing */
  startedAt: string
  lastActivityAt: string
  /** Estimated completion date */
  estimatedCompletion?: string
}

// ============================================================================
// GAMIFICATION SYSTEM
// ============================================================================

/**
 * Achievement trigger types
 */
export type AchievementTriggerType = 
  | 'count'       // Reach a count (e.g., 100 cards reviewed)
  | 'streak'      // Maintain a streak (e.g., 7 day streak)
  | 'milestone'   // Hit a milestone (e.g., complete first roadmap)
  | 'collection'  // Collect items (e.g., complete all strands in a weave)
  | 'speed'       // Speed challenge (e.g., 50 cards in 5 minutes)
  | 'perfect'     // Perfect score (e.g., quiz with 100%)

/**
 * Achievement rarity levels
 */
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

/**
 * Achievement definition
 */
export interface Achievement {
  id: string
  title: string
  description: string
  /** Emoji or icon identifier */
  icon: string
  /** Badge image URL */
  badgeUrl?: string
  
  /** Unlock conditions */
  trigger: {
    type: AchievementTriggerType
    /** Target value to reach */
    target: number
    /** What metric to track */
    metric: string
    /** Additional conditions */
    conditions?: Record<string, unknown>
  }
  
  /** Rewards */
  xpReward: number
  /** Special reward (e.g., unlock a theme) */
  specialReward?: {
    type: 'theme' | 'badge' | 'title' | 'feature'
    value: string
  }
  
  /** Rarity affects visual presentation */
  rarity: AchievementRarity
  
  /** Whether this achievement is hidden until unlocked */
  secret: boolean
  
  /** Category for grouping */
  category: 'study' | 'creation' | 'exploration' | 'social' | 'special' | 'teaching' | 'habits'
}

/**
 * User's achievement progress
 */
export interface AchievementProgress {
  achievementId: string
  /** Current progress towards target */
  currentValue: number
  /** Whether unlocked */
  unlocked: boolean
  /** When unlocked */
  unlockedAt?: string
  /** Whether user has viewed the unlock notification */
  notificationSeen: boolean
}

/**
 * User profile with gamification data
 */
export interface UserProfile {
  // Identity
  id: string
  displayName: string
  avatar?: string
  bio?: string

  // Statistics
  stats: {
    strandsCreated: number
    strandsViewed: number
    flashcardsReviewed: number
    flashcardsCreated: number
    quizzesTaken: number
    quizzesPassed: number
    roadmapsStarted: number
    roadmapsCompleted: number
    currentStreak: number
    longestStreak: number
    totalStudyMinutes: number
    perfectQuizzes: number
    averageQuizScore: number
  }
  
  // Achievements
  achievements: AchievementProgress[]
  /** Achievement IDs to showcase on profile */
  featuredAchievements: string[]
  
  // Subject proficiency (0-100)
  subjectProficiency: Record<string, number>
  
  // Activity heatmap (study minutes per day)
  activityHeatmap: Record<string, number>
  
  // Preferences
  preferences: {
    dailyGoalMinutes: number
    studyReminders: boolean
    reminderTime?: string
    soundEffects: boolean
    celebrations: boolean
  }
  
  // Timestamps
  createdAt: string
  lastActiveAt: string
}

/**
 * Study session statistics
 */
export interface StudySession {
  id: string
  type: 'flashcard' | 'quiz' | 'review'
  startedAt: string
  endedAt?: string
  
  /** Cards/questions reviewed */
  itemsReviewed: number
  /** Correct answers */
  correctCount: number
  /** Time spent in seconds */
  duration: number
  
  /** XP earned */
  xpEarned: number
  
  /** Deck/quiz IDs studied */
  deckIds?: string[]
  quizId?: string
  
  /** Was streak maintained? */
  streakMaintained: boolean
}

// ============================================================================
// TEACH MODE (Feynman Technique)
// ============================================================================

/**
 * AI student persona types for Teach Mode
 * Each persona asks different types of questions to help identify knowledge gaps
 */
export type StudentPersona =
  | 'curious-child'    // "Why?" "What does that mean?" - ELI5 style
  | 'exam-prep'        // "Is this important?" - Focus on key testable facts
  | 'devils-advocate'  // "But what about..." - Challenges assumptions
  | 'visual-learner'   // "Can you give an example?" - Needs concrete instances
  | 'socratic'         // Only asks questions, never explains - Deep thinking

/**
 * Metadata for each student persona
 */
export interface StudentPersonaConfig {
  id: StudentPersona
  name: string
  description: string
  icon: string
  color: string
  systemPromptKey: string
}

/**
 * Available student personas with their configurations
 */
export const STUDENT_PERSONAS: StudentPersonaConfig[] = [
  {
    id: 'curious-child',
    name: 'Curious Child',
    description: 'Asks simple "why" questions, needs analogies and simple explanations',
    icon: '👶',
    color: 'sky',
    systemPromptKey: 'curious-child',
  },
  {
    id: 'exam-prep',
    name: 'Exam Prep',
    description: 'Focuses on key facts, definitions, and what might be tested',
    icon: '📝',
    color: 'amber',
    systemPromptKey: 'exam-prep',
  },
  {
    id: 'devils-advocate',
    name: "Devil's Advocate",
    description: 'Challenges your claims and assumptions, probes for weak points',
    icon: '😈',
    color: 'red',
    systemPromptKey: 'devils-advocate',
  },
  {
    id: 'visual-learner',
    name: 'Visual Learner',
    description: 'Asks for examples, diagrams, and real-world applications',
    icon: '🎨',
    color: 'purple',
    systemPromptKey: 'visual-learner',
  },
  {
    id: 'socratic',
    name: 'Socratic Teacher',
    description: 'Only asks questions, never gives answers - guides you to discover',
    icon: '🏛️',
    color: 'emerald',
    systemPromptKey: 'socratic',
  },
]

/**
 * A single message in a teach mode conversation
 */
export interface TeachMessage {
  id: string
  role: 'user' | 'student'
  content: string
  timestamp: string
  /** Whether this was voice input (vs typed) */
  isVoice: boolean
  /** Knowledge gaps identified in this message (for user messages) */
  gaps?: string[]
}

/**
 * Gap analysis report generated at end of teach session
 */
export interface GapReport {
  /** Key concepts the user successfully explained */
  covered: string[]
  /** Missing concepts the user didn't mention */
  gaps: string[]
  /** Suggested topics to study based on gaps */
  suggestions: string[]
  /** Percentage of key concepts covered (0-100) */
  coveragePercent: number
}

/**
 * A complete teach mode session
 */
export interface TeachSession {
  id: string
  /** Strand being taught about */
  strandSlug: string
  /** AI persona used */
  persona: StudentPersona
  /** Conversation messages */
  messages: TeachMessage[]
  /** Full transcript of user explanations */
  transcript: string
  /** Gap analysis (generated on session end) */
  gapReport: GapReport | null
  /** Coverage score 0-100 */
  coverageScore: number
  /** Duration in seconds */
  durationSeconds: number
  /** XP earned from this session */
  xpEarned: number
  /** Flashcard IDs generated from gaps */
  flashcardsGenerated: string[]
  /** ISO timestamp when session started */
  createdAt: string
  /** ISO timestamp when session completed */
  completedAt?: string
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Study data storage structure per strand
 */
export interface StrandStudyData {
  strandSlug: string
  flashcards: Flashcard[]
  quizzes: Quiz[]
  /** User progress (stored locally) */
  progress: {
    flashcardProgress: Record<string, FSRSState>
    quizAttempts: QuizAttempt[]
    lastStudied?: string
    totalStudyTime: number
  }
}

/**
 * FSRS algorithm parameters (v5 defaults)
 */
export const FSRS_PARAMETERS = {
  w: [
    0.4072, 0.7231, 3.1699, 14.8509,  // Initial stability
    5.2644, 1.1557, 0.9436, 0.0001,   // Difficulty
    1.5715, 0.1463, 1.0556, 0.0000,   // Recall
    0.0981, 0.3611, 1.2633, 0.2081,   // Lapse
    2.7709                             // Forget
  ],
  requestRetention: 0.9, // Target retention rate
  maximumInterval: 36500, // 100 years (effectively unlimited)
  easyBonus: 1.3,
  hardInterval: 1.2,
}

/**
 * XP rewards for various actions
 */
export const XP_REWARDS = {
  flashcardReview: 5,
  flashcardCorrect: 10,
  flashcardStreak: 2, // Per card in streak
  quizComplete: 50,
  quizPerfect: 100,
  strandComplete: 25,
  roadmapStageComplete: 100,
  roadmapComplete: 500,
  dailyGoalMet: 50,
  streakDay: 20, // Per day of streak
  createFlashcard: 5,
  createStrand: 50,
  // Teach Mode rewards
  teachSessionComplete: 75,    // Complete a teach session
  teachGapIdentified: 5,       // Per gap found and acknowledged
  teachFullCoverage: 150,      // Achieve 90%+ coverage
  teachStreak: 30,             // Per day of teaching streak
  teachFlashcardGenerated: 10, // Per flashcard generated from gaps
}

// ============================================================================
// DOCUMENT RATING SYSTEM
// ============================================================================

/**
 * Rating dimensions for documents
 * Users can rate overall or specific dimensions
 */
export type RatingDimension = 
  | 'quality'        // Overall content quality
  | 'completeness'   // How thorough/comprehensive
  | 'accuracy'       // Factual correctness
  | 'clarity'        // Writing clarity
  | 'relevance'      // Relevance to topic/subject
  | 'depth'          // Technical depth

/**
 * User rating for a strand (10-point scale)
 * Stored locally in SQLite for all users (guest and signed-in)
 */
export interface StrandUserRating {
  /** Unique identifier (UUID) */
  id: string
  /** Reference to the strand */
  strandId: string
  /** Strand path for easy lookup */
  strandPath: string
  /** Rating value 1-10 */
  rating: number
  /** Optional specific dimension being rated (null = overall) */
  dimension?: RatingDimension | null
  /** Optional user notes about this rating */
  notes?: string
  /** ISO timestamp when created */
  createdAt: string
  /** ISO timestamp when last updated */
  updatedAt: string
}

/**
 * Dimension scores for LLM-generated ratings
 */
export interface LLMRatingDimensions {
  /** Content quality score 1-10 */
  quality: number
  /** Thoroughness/comprehensiveness 1-10 */
  completeness: number
  /** Factual correctness 1-10 */
  accuracy: number
  /** Writing clarity 1-10 */
  clarity: number
  /** Topic relevance 1-10 */
  relevance: number
  /** Technical depth 1-10 */
  depth: number
}

/**
 * LLM-generated rating with dimensional breakdown
 * Auto-generated on strand save, can be re-requested on demand
 */
export interface StrandLLMRating {
  /** Unique identifier (UUID) */
  id: string
  /** Reference to the strand */
  strandId: string
  /** Strand path for easy lookup */
  strandPath: string
  /** Aggregate overall score 1-10 (weighted average of dimensions) */
  overallScore: number
  /** Individual dimension scores */
  dimensions: LLMRatingDimensions
  /** LLM's reasoning for the scores */
  reasoning: string
  /** Suggested improvements */
  suggestions?: string[]
  /** Other strand paths this was compared against */
  comparedTo?: string[]
  /** Which LLM model was used */
  modelUsed: string
  /** ISO timestamp when created */
  createdAt: string
  /** ISO timestamp when last updated */
  updatedAt: string
}

/**
 * Tooltips for rating dimensions in the UI
 */
export const RATING_DIMENSION_INFO: Record<RatingDimension, { label: string; description: string }> = {
  quality: {
    label: 'Quality',
    description: 'Overall quality of the content, writing, and presentation',
  },
  completeness: {
    label: 'Completeness',
    description: 'How thorough and comprehensive the coverage is',
  },
  accuracy: {
    label: 'Accuracy',
    description: 'Factual correctness and reliability of information',
  },
  clarity: {
    label: 'Clarity',
    description: 'How clear and easy to understand the writing is',
  },
  relevance: {
    label: 'Relevance',
    description: 'How relevant the content is to its topic/subject',
  },
  depth: {
    label: 'Depth',
    description: 'Level of technical depth and detail provided',
  },
}

/**
 * Default weights for calculating LLM overall score
 */
export const RATING_DIMENSION_WEIGHTS: Record<RatingDimension, number> = {
  quality: 0.25,
  completeness: 0.20,
  accuracy: 0.20,
  clarity: 0.15,
  relevance: 0.10,
  depth: 0.10,
}

