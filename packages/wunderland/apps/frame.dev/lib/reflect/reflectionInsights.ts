/**
 * Reflection Insights Engine
 * @module lib/reflect/reflectionInsights
 *
 * Multi-tier insight generation with LLM -> BERT -> NLP fallback.
 * Extracts themes, entities, sentiment, and patterns from reflections.
 */

import { z } from 'zod'
import { generateWithFallback, isLLMAvailable, LLMError } from '@/lib/llm'
import {
  extractKeywords,
  extractEntities,
  extractTechEntities,
  STOP_WORDS,
} from '@/lib/nlp'
import { getInsightSettings, DEFAULT_INSIGHT_SETTINGS } from './insightSettings'
import type {
  ReflectionInsights,
  InsightGenerationOptions,
  DetectedEntity,
  DetectedTheme,
  SentimentResult,
  SentimentType,
  InsightTier,
  WritingPatterns,
  Reflection,
  ReflectionTrends,
} from './types'

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum content length for insight generation */
const MIN_CONTENT_LENGTH = 50

/**
 * Template/placeholder text to filter out before analysis
 * These come from the StructuredReflectionEditor section headings and placeholders
 */
const PLACEHOLDER_PATTERNS = [
  // Section headers
  /^## Morning Intentions\s*$/gim,
  /^## Notes(?: & Thoughts)?\s*$/gim,
  /^## What Got Done\s*$/gim,
  /^## Evening Reflection\s*$/gim,
  // Placeholder text
  /What do I want to focus on today\??/gi,
  /What's on your mind\?? Capture any thoughts, ideas, or observations\.?/gi,
  /What did you accomplish\?? Celebrate your wins, big and small\.?/gi,
  /How was your day\?? What are you grateful for\??/gi,
  // Common prompts that might get included
  /My top 3 priorities today are\.{3}/gi,
  /Today I will focus on\.{3}/gi,
  /I want to feel .* by the end of the day/gi,
  /One thing I want to accomplish is\.{3}/gi,
  /I will make time for\.{3}/gi,
  /Today matters because\.{3}/gi,
  /My energy today will go toward\.{3}/gi,
  /I'm excited about\.{3}/gi,
  /Something I noticed today\.{3}/gi,
  /I'm thinking about\.{3}/gi,
  /An idea that came to me\.{3}/gi,
  /A conversation I had\.{3}/gi,
  /Something that surprised me\.{3}/gi,
  /A question on my mind\.{3}/gi,
  /What I learned today\.{3}/gi,
  /A small moment I want to remember\.{3}/gi,
  /Something I want to explore more\.{3}/gi,
  /Today I completed\.{3}/gi,
  /I'm proud that I\.{3}/gi,
  /Progress I made on\.{3}/gi,
  /Today I'm grateful for\.{3}/gi,
  /Tomorrow I want to\.{3}/gi,
]

/**
 * Filter out placeholder/template text from content before analysis
 */
function filterPlaceholderContent(content: string): string {
  let filtered = content

  for (const pattern of PLACEHOLDER_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0
    filtered = filtered.replace(pattern, '')
  }

  // Clean up extra whitespace and newlines left behind
  return filtered
    .replace(/\n{3,}/g, '\n\n')  // Multiple newlines to double
    .replace(/^\s+|\s+$/g, '')   // Trim start/end
    .trim()
}

/** LLM prompt for insight generation */
const INSIGHT_PROMPT = `Analyze this personal journal/reflection entry and extract structured insights.

<reflection>
{content}
</reflection>

User's selected mood: {mood}
Date: {date}

Extract the following in JSON format:
1. themes: Main topics (max 5), each with name, confidence (0-1), and supporting keywords
2. sentiment: Overall tone (positive/neutral/negative/mixed) with score (-1 to 1)
3. entities: People, places, projects, events, emotions, activities mentioned (with type and count)
4. keyPhrases: 3-5 notable phrases or expressions from the entry
5. suggestedTags: 3-5 lowercase tags for categorization
6. summary: 1-2 sentence summary
7. moodAlignment: Does the content match the user's selected mood?
8. actionItems: Any tasks, intentions, or commitments mentioned (as array of strings)
9. gratitudeItems: Things the person expressed gratitude for (as array of strings)
10. writingPatterns: emotional tone (reflective/analytical/emotional/neutral) and time orientation (past/present/future/mixed)

Respond with valid JSON only.`

/** Zod schema for LLM response validation */
const insightResponseSchema = z.object({
  themes: z.array(z.object({
    name: z.string(),
    confidence: z.number().min(0).max(1),
    keywords: z.array(z.string()),
  })).max(5),
  sentiment: z.object({
    overall: z.enum(['positive', 'neutral', 'negative', 'mixed']),
    score: z.number().min(-1).max(1),
  }),
  entities: z.array(z.object({
    type: z.enum(['person', 'place', 'event', 'project', 'emotion', 'activity']),
    name: z.string(),
    mentions: z.number().default(1),
  })).optional().default([]),
  keyPhrases: z.array(z.string()).max(5),
  suggestedTags: z.array(z.string()).max(5),
  summary: z.string().optional(),
  moodAlignment: z.object({
    matches: z.boolean(),
    explanation: z.string().optional(),
  }).optional(),
  actionItems: z.array(z.string()).optional().default([]),
  gratitudeItems: z.array(z.string()).optional().default([]),
  writingPatterns: z.object({
    emotionalTone: z.enum(['reflective', 'analytical', 'emotional', 'neutral']),
    timeOrientation: z.enum(['past', 'present', 'future', 'mixed']),
  }).optional(),
})

// ============================================================================
// SENTIMENT LEXICON (Tier 3 fallback)
// ============================================================================

const POSITIVE_WORDS = new Set([
  'happy', 'grateful', 'thankful', 'excited', 'joy', 'joyful', 'love', 'wonderful',
  'amazing', 'great', 'good', 'better', 'best', 'beautiful', 'peaceful',
  'calm', 'relaxed', 'accomplished', 'proud', 'hopeful', 'inspired',
  'motivated', 'energized', 'content', 'satisfied', 'blessed', 'fortunate',
  'appreciate', 'glad', 'delighted', 'thrilled', 'optimistic', 'positive',
  'fantastic', 'excellent', 'awesome', 'brilliant', 'lovely', 'kind',
  'generous', 'helpful', 'supportive', 'encouraging', 'uplifting', 'refreshing',
  'productive', 'successful', 'growth', 'progress', 'achievement', 'milestone',
  'breakthrough', 'clarity', 'insight', 'wisdom', 'learned', 'improved',
  'connected', 'loved', 'supported', 'understood', 'valued', 'cherished',
])

const NEGATIVE_WORDS = new Set([
  'sad', 'anxious', 'worried', 'stressed', 'frustrated', 'angry', 'upset',
  'tired', 'exhausted', 'overwhelmed', 'disappointed', 'hurt', 'lonely',
  'afraid', 'nervous', 'confused', 'stuck', 'lost', 'failed', 'difficult',
  'hard', 'struggle', 'struggling', 'pain', 'painful', 'suffering', 'depressed',
  'hopeless', 'helpless', 'desperate', 'terrible', 'awful', 'horrible',
  'miserable', 'unhappy', 'dissatisfied', 'regret', 'guilty', 'ashamed',
  'embarrassed', 'insecure', 'doubtful', 'uncertain', 'fearful', 'scared',
  'worried', 'concern', 'problem', 'issue', 'trouble', 'crisis', 'chaos',
  'conflict', 'argument', 'fight', 'tension', 'pressure', 'burden', 'weight',
  'drained', 'burned', 'burnout', 'broke', 'broken', 'damaged', 'ruined',
])

const INTENSIFIERS: Record<string, number> = {
  'very': 1.5, 'really': 1.3, 'so': 1.2, 'extremely': 1.8,
  'incredibly': 1.7, 'absolutely': 1.6, 'totally': 1.4, 'completely': 1.5,
  'quite': 1.1, 'fairly': 1.0, 'somewhat': 0.8, 'slightly': 0.6,
}

const NEGATORS = new Set(['not', "n't", 'never', 'no', 'without', 'none', 'neither', 'nor'])

// ============================================================================
// TIER 1: LLM-POWERED INSIGHTS
// ============================================================================

/**
 * Generate insights using LLM (cloud-based)
 */
async function generateLLMInsights(
  content: string,
  mood: string | undefined,
  date: string
): Promise<Partial<ReflectionInsights>> {
  const prompt = INSIGHT_PROMPT
    .replace('{content}', content)
    .replace('{mood}', mood || 'not specified')
    .replace('{date}', date)

  const result = await generateWithFallback(prompt, insightResponseSchema, {
    providerOrder: ['claude', 'openai', 'openrouter', 'mistral', 'ollama'],
    maxTokens: 1024,
    temperature: 0.3,
  })

  // Map to our type structure
  const data = result.data
  return {
    themes: data.themes as DetectedTheme[],
    entities: (data.entities || []) as DetectedEntity[],
    sentiment: {
      overall: data.sentiment.overall as SentimentType,
      score: data.sentiment.score,
    },
    keyPhrases: data.keyPhrases,
    suggestedTags: data.suggestedTags,
    summary: data.summary,
    moodAlignment: data.moodAlignment,
    actionItems: data.actionItems || [],
    gratitudeItems: data.gratitudeItems || [],
    writingPatterns: data.writingPatterns ? {
      avgSentenceLength: 0, // Not provided by LLM
      emotionalTone: data.writingPatterns.emotionalTone,
      timeOrientation: data.writingPatterns.timeOrientation,
      questionCount: 0,
      exclamationCount: 0,
    } : undefined,
    tier: 'llm',
  }
}

// ============================================================================
// TIER 2: LOCAL BERT INSIGHTS
// ============================================================================

// Singleton engine instance for BERT
let engineInstance: any | null = null

/**
 * Check if BERT/embedding engine is available
 */
async function checkBERTAvailability(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  try {
    // Check if embedding engine module exists and can be loaded
    const { HybridEmbeddingEngine } = await import('@/lib/search/embeddingEngine')
    if (!engineInstance) {
      engineInstance = new HybridEmbeddingEngine()
      await engineInstance.initialize()
    }
    // Check if we have a working backend (not just lexical fallback)
    const backend = engineInstance.getCurrentBackend()
    return backend.type !== 'none'
  } catch {
    return false
  }
}

/**
 * Generate insights using local BERT model
 */
async function generateBERTInsights(
  content: string
): Promise<Partial<ReflectionInsights>> {
  try {
    const { HybridEmbeddingEngine } = await import('@/lib/search/embeddingEngine')
    if (!engineInstance) {
      engineInstance = new HybridEmbeddingEngine()
      await engineInstance.initialize()
    }
    const engine = engineInstance

    // Split into sentences for semantic analysis
    const sentences = splitIntoSentences(content)
    if (sentences.length === 0) {
      return generateNLPInsights(content)
    }

    // Embed sentences for clustering
    const embeddings = await Promise.all(
      sentences.map(s => engine.embed(s))
    )

    // Simple theme extraction via sentence clustering
    const themes = await extractThemesBERT(sentences, embeddings, engine)

    // Use NLP for entities and sentiment (BERT is better for semantic similarity)
    const nlpInsights = generateNLPInsights(content)

    return {
      ...nlpInsights,
      themes: themes.length > 0 ? themes : nlpInsights.themes,
      tier: 'bert',
    }
  } catch (error) {
    console.warn('[ReflectionInsights] BERT fallback to NLP:', error)
    return generateNLPInsights(content)
  }
}

/**
 * Extract themes using BERT embeddings and clustering
 */
async function extractThemesBERT(
  sentences: string[],
  embeddings: number[][],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  engine: any
): Promise<DetectedTheme[]> {
  if (sentences.length < 2) {
    // Not enough sentences for clustering
    const keywords = extractKeywords(sentences.join(' '), 3)
    return keywords.map(k => ({
      name: k.word,
      confidence: Math.min(1, k.score / 10),
      keywords: [k.word],
    }))
  }

  // Group similar sentences using cosine similarity
  const clusters: Array<{ indices: number[]; centroid: number[] }> = []
  const assigned = new Set<number>()
  const SIMILARITY_THRESHOLD = 0.6

  for (let i = 0; i < embeddings.length; i++) {
    if (assigned.has(i)) continue

    const cluster: number[] = [i]
    assigned.add(i)

    for (let j = i + 1; j < embeddings.length; j++) {
      if (assigned.has(j)) continue

      const similarity = cosineSimilarity(embeddings[i], embeddings[j])
      if (similarity > SIMILARITY_THRESHOLD) {
        cluster.push(j)
        assigned.add(j)
      }
    }

    if (cluster.length > 0) {
      clusters.push({
        indices: cluster,
        centroid: embeddings[i], // Use first as centroid for simplicity
      })
    }
  }

  // Extract themes from clusters
  const themes: DetectedTheme[] = []
  for (const cluster of clusters.slice(0, 5)) {
    const clusterText = cluster.indices.map(i => sentences[i]).join(' ')
    const keywords = extractKeywords(clusterText, 3)

    if (keywords.length > 0) {
      themes.push({
        name: keywords[0].word,
        confidence: cluster.indices.length / sentences.length,
        keywords: keywords.map(k => k.word),
      })
    }
  }

  return themes.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}

/**
 * Split content into sentences
 */
function splitIntoSentences(content: string): string[] {
  return content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10) // Filter out very short fragments
}

// ============================================================================
// TIER 3: STATIC NLP INSIGHTS (always available)
// ============================================================================

/**
 * Generate insights using static NLP (no model required)
 */
function generateNLPInsights(content: string): Partial<ReflectionInsights> {
  // Extract keywords with TF-IDF
  const keywords = extractKeywords(content, 15)

  // Extract entities
  const entities = extractEntities(content)
  const techEntities = extractTechEntities(content)

  // Analyze sentiment
  const sentiment = analyzeSentimentLexicon(content)

  // Extract themes from keywords
  const themes = extractThemesFromKeywords(keywords)

  // Map entities to our format
  const mappedEntities = mapEntitiesToFormat(entities, techEntities)

  // Generate tag suggestions
  const suggestedTags = generateTagSuggestions(keywords, entities)

  // Analyze writing patterns
  const writingPatterns = analyzeWritingPatterns(content)

  // Extract action items and gratitude
  const actionItems = extractActionItems(content)
  const gratitudeItems = extractGratitudeItems(content)

  return {
    themes,
    entities: mappedEntities,
    sentiment,
    keyPhrases: keywords.slice(0, 5).map(k => k.word),
    suggestedTags,
    writingPatterns,
    actionItems,
    gratitudeItems,
    tier: 'nlp',
  }
}

/**
 * Analyze sentiment using lexicon matching
 */
function analyzeSentimentLexicon(content: string): SentimentResult {
  const words = content.toLowerCase().split(/\s+/)
  let positiveScore = 0
  let negativeScore = 0
  let totalSentimentWords = 0

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^\w'-]/g, '')
    const prevWord = i > 0 ? words[i - 1].replace(/[^\w'-]/g, '') : ''
    const isNegated = NEGATORS.has(prevWord) || prevWord.endsWith("n't")
    const intensifier = INTENSIFIERS[prevWord] || 1

    if (POSITIVE_WORDS.has(word)) {
      if (isNegated) {
        negativeScore += intensifier
      } else {
        positiveScore += intensifier
      }
      totalSentimentWords++
    } else if (NEGATIVE_WORDS.has(word)) {
      if (isNegated) {
        positiveScore += intensifier
      } else {
        negativeScore += intensifier
      }
      totalSentimentWords++
    }
  }

  const total = positiveScore + negativeScore || 1
  const score = (positiveScore - negativeScore) / Math.max(total, 5)

  let overall: SentimentType = 'neutral'
  if (score > 0.2) overall = 'positive'
  else if (score < -0.2) overall = 'negative'
  else if (positiveScore > 0 && negativeScore > 0) overall = 'mixed'

  return {
    overall,
    score: Math.max(-1, Math.min(1, score)),
    breakdown: {
      positive: total > 0 ? positiveScore / total : 0,
      negative: total > 0 ? negativeScore / total : 0,
      neutral: total > 0 ? 1 - (positiveScore + negativeScore) / total : 1,
    },
  }
}

/**
 * Extract themes from keywords
 */
function extractThemesFromKeywords(
  keywords: Array<{ word: string; score: number }>
): DetectedTheme[] {
  const themes: DetectedTheme[] = []
  const maxScore = keywords[0]?.score || 1

  // Group related keywords
  const used = new Set<string>()

  for (const kw of keywords.slice(0, 10)) {
    if (used.has(kw.word.toLowerCase())) continue

    // Find related keywords
    const related = keywords.filter(other => {
      if (other.word === kw.word) return false
      if (used.has(other.word.toLowerCase())) return false
      // Check if words are related (share prefix or are compound)
      return (
        other.word.toLowerCase().includes(kw.word.toLowerCase()) ||
        kw.word.toLowerCase().includes(other.word.toLowerCase())
      )
    })

    used.add(kw.word.toLowerCase())
    related.forEach(r => used.add(r.word.toLowerCase()))

    themes.push({
      name: kw.word,
      confidence: kw.score / maxScore,
      keywords: [kw.word, ...related.map(r => r.word)],
    })

    if (themes.length >= 5) break
  }

  return themes
}

/**
 * Map extracted entities to our format
 */
function mapEntitiesToFormat(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nlpEntities: any,
  techEntities: Record<string, string[]>
): DetectedEntity[] {
  const result: DetectedEntity[] = []
  const seen = new Set<string>()

  // Add people
  for (const person of nlpEntities.people || []) {
    if (seen.has(person.toLowerCase())) continue
    seen.add(person.toLowerCase())
    result.push({ type: 'person', name: person, mentions: 1 })
  }

  // Add places
  for (const location of nlpEntities.locations || []) {
    if (seen.has(location.toLowerCase())) continue
    seen.add(location.toLowerCase())
    result.push({ type: 'place', name: location, mentions: 1 })
  }

  // Add tech entities as projects
  for (const category of Object.values(techEntities)) {
    for (const entity of category) {
      if (seen.has(entity.toLowerCase())) continue
      seen.add(entity.toLowerCase())
      result.push({ type: 'project', name: entity, mentions: 1 })
    }
  }

  return result.slice(0, 20)
}

/**
 * Generate tag suggestions from keywords and entities
 */
function generateTagSuggestions(
  keywords: Array<{ word: string; score: number }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entities: any
): string[] {
  const tags = new Set<string>()

  // Add top keywords as tags
  for (const kw of keywords.slice(0, 5)) {
    const tag = kw.word.toLowerCase().replace(/\s+/g, '-')
    if (tag.length >= 2 && !STOP_WORDS.has(tag)) {
      tags.add(tag)
    }
  }

  // Add tech entities as tags
  for (const tech of entities.technologies || []) {
    tags.add(tech.toLowerCase().replace(/\s+/g, '-'))
  }

  return Array.from(tags).slice(0, 5)
}

/**
 * Analyze writing patterns
 */
function analyzeWritingPatterns(content: string): WritingPatterns {
  const sentences = splitIntoSentences(content)
  const words = content.split(/\s+/).filter(w => w.length > 0)

  // Average sentence length
  const avgSentenceLength = sentences.length > 0
    ? words.length / sentences.length
    : 0

  // Count questions and exclamations
  const questionCount = (content.match(/\?/g) || []).length
  const exclamationCount = (content.match(/!/g) || []).length

  // Determine emotional tone
  let emotionalTone: WritingPatterns['emotionalTone'] = 'neutral'
  if (questionCount > 2 || content.match(/why|how|what if/gi)) {
    emotionalTone = 'reflective'
  } else if (exclamationCount > 2 || content.match(/love|hate|amazing|terrible/gi)) {
    emotionalTone = 'emotional'
  } else if (content.match(/because|therefore|analysis|data|evidence/gi)) {
    emotionalTone = 'analytical'
  }

  // Determine time orientation
  let timeOrientation: WritingPatterns['timeOrientation'] = 'mixed'
  const pastIndicators = (content.match(/\b(was|were|did|had|yesterday|last|ago|before)\b/gi) || []).length
  const presentIndicators = (content.match(/\b(is|am|are|now|today|currently)\b/gi) || []).length
  const futureIndicators = (content.match(/\b(will|going to|tomorrow|next|plan|hope to)\b/gi) || []).length

  const total = pastIndicators + presentIndicators + futureIndicators
  if (total > 0) {
    if (pastIndicators > total * 0.5) timeOrientation = 'past'
    else if (presentIndicators > total * 0.5) timeOrientation = 'present'
    else if (futureIndicators > total * 0.5) timeOrientation = 'future'
  }

  return {
    avgSentenceLength,
    emotionalTone,
    timeOrientation,
    questionCount,
    exclamationCount,
  }
}

/**
 * Extract action items from content
 */
function extractActionItems(content: string): string[] {
  const patterns = [
    /(?:need to|have to|must|should|want to|going to|will)\s+([^.!?]+)/gi,
    /(?:todo|to-do|task):\s*([^.!?\n]+)/gi,
    /(?:reminder|don't forget):\s*([^.!?\n]+)/gi,
  ]

  const items: string[] = []
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const item = match[1].trim()
      if (item.length > 5 && item.length < 200) {
        items.push(item)
      }
    }
  }

  return items.slice(0, 10)
}

/**
 * Extract gratitude items from content
 */
function extractGratitudeItems(content: string): string[] {
  const patterns = [
    /(?:grateful|thankful|appreciate)\s+(?:for\s+)?([^.!?]+)/gi,
    /(?:gratitude|thanks)\s*(?:for|to)?\s*:?\s*([^.!?\n]+)/gi,
    /blessed\s+(?:to\s+have\s+)?([^.!?]+)/gi,
  ]

  const items: string[] = []
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const item = match[1].trim()
      if (item.length > 3 && item.length < 200) {
        items.push(item)
      }
    }
  }

  return items.slice(0, 10)
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generate insights for reflection content
 * Automatically falls back through tiers: LLM -> BERT -> NLP
 */
export async function generateInsights(
  content: string,
  options: InsightGenerationOptions & {
    mood?: string
    date: string
  }
): Promise<ReflectionInsights> {
  const startTime = Date.now()

  // Filter out placeholder/template text before analysis
  const filteredContent = filterPlaceholderContent(content)

  // Check content length after filtering
  if (!filteredContent || filteredContent.trim().length < MIN_CONTENT_LENGTH) {
    return {
      themes: [],
      entities: [],
      sentiment: { overall: 'neutral', score: 0 },
      keyPhrases: [],
      suggestedTags: [],
      tier: 'nlp',
      status: 'complete',
      generatedAt: new Date().toISOString(),
      generationTimeMs: Date.now() - startTime,
      error: filteredContent.length === 0
        ? 'No content to analyze (only template text detected)'
        : 'Content too short for insight generation',
    }
  }

  // Use filtered content for analysis
  const analysisContent = filteredContent

  // Get user settings
  const settings = getInsightSettings()

  // Determine tier availability
  const llmAvailable = !options.skipLLM && !settings.skipLLMForPrivacy && isLLMAvailable()
  const bertAvailable = !options.skipBERT && await checkBERTAvailability()

  let insights: Partial<ReflectionInsights> = {}
  let tier: InsightTier = 'nlp'

  try {
    // Try preferred tier first, then fall back
    if (options.preferredTier === 'llm' && llmAvailable) {
      insights = await generateLLMInsights(analysisContent, options.mood, options.date)
      tier = 'llm'
    } else if (options.preferredTier === 'bert' && bertAvailable) {
      insights = await generateBERTInsights(analysisContent)
      tier = 'bert'
    } else if (options.preferredTier === 'nlp') {
      insights = generateNLPInsights(analysisContent)
      tier = 'nlp'
    } else if (llmAvailable) {
      // Auto mode: try LLM first
      insights = await generateLLMInsights(analysisContent, options.mood, options.date)
      tier = 'llm'
    } else if (bertAvailable) {
      insights = await generateBERTInsights(analysisContent)
      tier = 'bert'
    } else {
      insights = generateNLPInsights(analysisContent)
      tier = 'nlp'
    }
  } catch (error) {
    console.warn('[ReflectionInsights] Error, falling back:', error)

    // Fallback chain on error
    try {
      if (tier === 'llm' && bertAvailable) {
        insights = await generateBERTInsights(analysisContent)
        tier = 'bert'
      } else {
        insights = generateNLPInsights(analysisContent)
        tier = 'nlp'
      }
    } catch (fallbackError) {
      // Final fallback to NLP
      insights = generateNLPInsights(analysisContent)
      tier = 'nlp'
    }
  }

  return {
    themes: insights.themes || [],
    entities: insights.entities || [],
    sentiment: insights.sentiment || { overall: 'neutral', score: 0 },
    keyPhrases: insights.keyPhrases || [],
    suggestedTags: insights.suggestedTags || [],
    summary: insights.summary,
    moodAlignment: insights.moodAlignment,
    writingPatterns: insights.writingPatterns,
    actionItems: insights.actionItems || [],
    gratitudeItems: insights.gratitudeItems || [],
    tier,
    status: 'complete',
    generatedAt: new Date().toISOString(),
    generationTimeMs: Date.now() - startTime,
  }
}

// ============================================================================
// CROSS-REFLECTION TRENDS
// ============================================================================

/**
 * Analyze trends across multiple reflections
 */
export async function analyzeReflectionTrends(
  reflections: Reflection[],
  period: 'week' | 'month' | 'year'
): Promise<ReflectionTrends> {
  const themeCount = new Map<string, number>()
  const entityCount = new Map<string, { type: string; count: number }>()
  const sentimentTimeline: Array<{ date: string; score: number }> = []
  const volumeTimeline: Array<{ date: string; wordCount: number }> = []

  for (const reflection of reflections) {
    // Get or generate insights for each reflection
    const insights = reflection.metadata?.insights || generateNLPInsights(reflection.content || '')

    // Aggregate themes
    for (const theme of insights.themes || []) {
      themeCount.set(theme.name, (themeCount.get(theme.name) || 0) + 1)
    }

    // Aggregate entities
    for (const entity of insights.entities || []) {
      const key = `${entity.type}:${entity.name}`
      const existing = entityCount.get(key)
      entityCount.set(key, {
        type: entity.type,
        count: (existing?.count || 0) + entity.mentions,
      })
    }

    // Timeline data
    sentimentTimeline.push({
      date: reflection.date,
      score: insights.sentiment?.score || 0,
    })
    volumeTimeline.push({
      date: reflection.date,
      wordCount: reflection.wordCount || 0,
    })
  }

  // Calculate theme trends
  const topThemes = Array.from(themeCount.entries())
    .map(([theme, count]) => ({ theme, count, trend: 'stable' as const }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Top entities
  const topEntities = Array.from(entityCount.entries())
    .map(([key, val]) => ({
      entity: key.split(':')[1],
      type: val.type,
      count: val.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    period,
    startDate: reflections[reflections.length - 1]?.date || '',
    endDate: reflections[0]?.date || '',
    topThemes,
    topEntities,
    sentimentTrend: sentimentTimeline,
    writingVolume: volumeTimeline,
    generatedAt: new Date().toISOString(),
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  generateNLPInsights,
  analyzeSentimentLexicon,
  checkBERTAvailability,
}

export default {
  generateInsights,
  analyzeReflectionTrends,
  generateNLPInsights,
  analyzeSentimentLexicon,
  checkBERTAvailability,
}
