/**
 * Insight Facts Generator for Quarry Codex
 * @module lib/quarry/insightFacts
 * 
 * @description
 * Generates intelligent facts from user content:
 * - Entity recognition from notes (people, places, concepts)
 * - Recurring themes and patterns
 * - Connection discoveries
 * - Knowledge graph insights
 * 
 * Activity-based facts are now separate in ActivitySummary component.
 */

import type { HistoryEntry } from '@/lib/localStorage'
import { getLocalStorage, setLocalStorage } from '@/lib/localStorage'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface InsightFact {
  /** The insight text */
  text: string
  /** Category of insight */
  category: 'entity' | 'pattern' | 'connection' | 'discovery' | 'reminder'
  /** Entity type if applicable */
  entityType?: 'person' | 'place' | 'concept' | 'project' | 'topic'
  /** Entity name if applicable */
  entityName?: string
  /** Source strand paths */
  sourcePaths?: string[]
  /** Relevance score (0-1) */
  relevance: number
  /** Icon suggestion */
  icon?: string
}

export interface EntityMention {
  /** Entity name */
  name: string
  /** Entity type */
  type: InsightFact['entityType']
  /** Number of mentions */
  count: number
  /** Paths where mentioned */
  paths: string[]
  /** Last mentioned date */
  lastMentioned: string
  /** First mentioned date */
  firstMentioned: string
}

export interface InsightCache {
  /** ISO date string for cache validity */
  date: string
  /** Generated insights */
  insights: InsightFact[]
  /** Entity index */
  entities: EntityMention[]
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const INSIGHT_CACHE_KEY = 'fabric_insight_facts_cache'
const MAX_INSIGHTS = 5

// Knowledge-based fact templates
const ENTITY_TEMPLATES = {
  person: [
    "You've mentioned {name} in {count} strands. Perhaps it's time to reach out?",
    "{name} appears frequently in your notes — a key figure in your knowledge.",
    "Your notes on {name} span from {first} to {last}.",
  ],
  place: [
    "{name} appears in {count} of your strands. A significant location for you.",
    "You've documented experiences at {name} — what else could you add?",
  ],
  concept: [
    "The concept of {name} weaves through {count} strands in your Codex.",
    "{name} is a recurring theme in your writing. What new insights have you gained?",
    "Your understanding of {name} has grown over time — review your early notes.",
  ],
  project: [
    "Project {name} appears in {count} strands. How's progress going?",
    "Your {name} documentation spans multiple strands. Time for a summary?",
  ],
  topic: [
    "{name} is one of your most-explored topics with {count} mentions.",
    "You've been building knowledge around {name}. What's next?",
  ],
}

const CONNECTION_TEMPLATES = [
  "Your notes on {topicA} and {topicB} might have interesting overlaps.",
  "Consider connecting your thoughts on {topicA} with {topicB}.",
  "{topicA} and {topicB} both appear in your recent explorations.",
]

const DISCOVERY_TEMPLATES = [
  "You haven't written about {topic} in a while. Has your perspective changed?",
  "Your earliest strand on {topic} was {days} days ago. Time for a retrospective?",
  "Revisiting {topic} might reveal new insights with fresh eyes.",
]

const REMINDER_TEMPLATES = [
  "Your strand '{title}' from {days} days ago might benefit from an update.",
  "You bookmarked '{title}' — have you acted on those thoughts?",
  "'{title}' has been viewed {count} times. It seems important to you.",
]

// ═══════════════════════════════════════════════════════════════════════════
// ENTITY EXTRACTION (Simple heuristic - would be enhanced with NLP)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract potential entities from strand titles and paths
 * This is a simple heuristic - real implementation would use NLP
 */
function extractEntitiesFromHistory(history: HistoryEntry[]): EntityMention[] {
  const entityMap = new Map<string, EntityMention>()
  
  for (const entry of history) {
    // Extract from title
    const words = entry.title
      .replace(/[-_]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && /^[A-Z]/.test(w)) // Capitalized words
    
    for (const word of words) {
      const normalized = word.toLowerCase()
      const existing = entityMap.get(normalized)
      
      if (existing) {
        existing.count++
        if (!existing.paths.includes(entry.path)) {
          existing.paths.push(entry.path)
        }
        if (new Date(entry.viewedAt) > new Date(existing.lastMentioned)) {
          existing.lastMentioned = entry.viewedAt
        }
        if (new Date(entry.viewedAt) < new Date(existing.firstMentioned)) {
          existing.firstMentioned = entry.viewedAt
        }
      } else {
        entityMap.set(normalized, {
          name: word,
          type: guessEntityType(word, entry.path),
          count: 1,
          paths: [entry.path],
          lastMentioned: entry.viewedAt,
          firstMentioned: entry.viewedAt,
        })
      }
    }
    
    // Extract from path segments
    const pathParts = entry.path.split('/').filter(p => p.length > 0)
    for (const part of pathParts.slice(0, -1)) { // Exclude filename
      const normalized = part.toLowerCase().replace(/[-_]/g, ' ')
      if (normalized.length > 3 && !['weaves', 'looms', 'docs', 'notes'].includes(normalized)) {
        const existing = entityMap.get(normalized)
        if (existing) {
          existing.count++
        } else {
          entityMap.set(normalized, {
            name: part,
            type: 'topic',
            count: 1,
            paths: [entry.path],
            lastMentioned: entry.viewedAt,
            firstMentioned: entry.viewedAt,
          })
        }
      }
    }
  }
  
  return Array.from(entityMap.values())
    .filter(e => e.count >= 2) // Only entities mentioned multiple times
    .sort((a, b) => b.count - a.count)
}

/**
 * Guess entity type from context
 */
function guessEntityType(word: string, path: string): InsightFact['entityType'] {
  const lowerWord = word.toLowerCase()
  const lowerPath = path.toLowerCase()
  
  // Check path context
  if (lowerPath.includes('people') || lowerPath.includes('person') || lowerPath.includes('contact')) {
    return 'person'
  }
  if (lowerPath.includes('place') || lowerPath.includes('location') || lowerPath.includes('travel')) {
    return 'place'
  }
  if (lowerPath.includes('project') || lowerPath.includes('work')) {
    return 'project'
  }
  
  // Common name patterns
  if (/^(Mr|Ms|Dr|Prof)/.test(word)) return 'person'
  
  // Default to concept for capitalized words
  return 'concept'
}

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate insights from entities
 */
function generateEntityInsights(entities: EntityMention[]): InsightFact[] {
  const insights: InsightFact[] = []
  
  // Top entities by mention count
  const topEntities = entities.slice(0, 5)
  
  for (const entity of topEntities) {
    const templates = ENTITY_TEMPLATES[entity.type || 'concept'] || ENTITY_TEMPLATES.concept
    const template = templates[Math.floor(Math.random() * templates.length)]
    
    const daysSinceFirst = Math.floor(
      (Date.now() - new Date(entity.firstMentioned).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    const text = template
      .replace('{name}', entity.name)
      .replace('{count}', entity.count.toString())
      .replace('{first}', formatRelativeDate(entity.firstMentioned))
      .replace('{last}', formatRelativeDate(entity.lastMentioned))
    
    insights.push({
      text,
      category: 'entity',
      entityType: entity.type,
      entityName: entity.name,
      sourcePaths: entity.paths,
      relevance: Math.min(1, entity.count / 10),
      icon: getEntityIcon(entity.type),
    })
  }
  
  return insights
}

/**
 * Generate connection insights between entities
 */
function generateConnectionInsights(entities: EntityMention[]): InsightFact[] {
  const insights: InsightFact[] = []
  
  // Find entities that appear in overlapping paths
  for (let i = 0; i < Math.min(entities.length, 5); i++) {
    for (let j = i + 1; j < Math.min(entities.length, 5); j++) {
      const entityA = entities[i]
      const entityB = entities[j]
      
      // Check if they share paths
      const sharedPaths = entityA.paths.filter(p => entityB.paths.includes(p))
      
      if (sharedPaths.length === 0 && entityA.type !== entityB.type) {
        // Potentially interesting connection
        const template = CONNECTION_TEMPLATES[Math.floor(Math.random() * CONNECTION_TEMPLATES.length)]
        
        insights.push({
          text: template
            .replace('{topicA}', entityA.name)
            .replace('{topicB}', entityB.name),
          category: 'connection',
          sourcePaths: [...new Set([...entityA.paths.slice(0, 2), ...entityB.paths.slice(0, 2)])],
          relevance: 0.7,
          icon: '🔗',
        })
        
        if (insights.length >= 2) break
      }
    }
    if (insights.length >= 2) break
  }
  
  return insights
}

/**
 * Generate discovery insights for stale content
 */
function generateDiscoveryInsights(entities: EntityMention[], history: HistoryEntry[]): InsightFact[] {
  const insights: InsightFact[] = []
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  
  // Find entities not mentioned recently
  const staleEntities = entities.filter(e => 
    new Date(e.lastMentioned).getTime() < thirtyDaysAgo && e.count >= 3
  )
  
  for (const entity of staleEntities.slice(0, 2)) {
    const daysSinceLast = Math.floor(
      (now - new Date(entity.lastMentioned).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    const template = DISCOVERY_TEMPLATES[Math.floor(Math.random() * DISCOVERY_TEMPLATES.length)]
    
    insights.push({
      text: template
        .replace('{topic}', entity.name)
        .replace('{days}', daysSinceLast.toString()),
      category: 'discovery',
      entityName: entity.name,
      sourcePaths: entity.paths,
      relevance: 0.6,
      icon: '🔍',
    })
  }
  
  return insights
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

function getEntityIcon(type?: InsightFact['entityType']): string {
  switch (type) {
    case 'person': return '👤'
    case 'place': return '📍'
    case 'concept': return '💡'
    case 'project': return '📋'
    case 'topic': return '🏷️'
    default: return '✨'
  }
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get daily insights (cached for the day)
 */
export function getDailyInsights(history: HistoryEntry[]): InsightFact[] {
  const today = getTodayString()
  
  // Check cache
  const cached = getLocalStorage<InsightCache>(INSIGHT_CACHE_KEY)
  if (cached && cached.date === today && cached.insights.length > 0) {
    return cached.insights
  }
  
  // Generate new insights
  const entities = extractEntitiesFromHistory(history)
  
  const insights: InsightFact[] = [
    ...generateEntityInsights(entities).slice(0, 2),
    ...generateConnectionInsights(entities).slice(0, 1),
    ...generateDiscoveryInsights(entities, history).slice(0, 2),
  ]
  
  // Shuffle and limit
  const shuffled = insights.sort(() => Math.random() - 0.5).slice(0, MAX_INSIGHTS)
  
  // Cache
  const cache: InsightCache = {
    date: today,
    insights: shuffled,
    entities,
  }
  setLocalStorage(INSIGHT_CACHE_KEY, cache)
  
  return shuffled
}

/**
 * Get entities from cache or extract
 */
export function getKnownEntities(history: HistoryEntry[]): EntityMention[] {
  const cached = getLocalStorage<InsightCache>(INSIGHT_CACHE_KEY)
  if (cached && cached.date === getTodayString()) {
    return cached.entities
  }
  
  return extractEntitiesFromHistory(history)
}

/**
 * Clear insight cache (for testing)
 */
export function clearInsightCache(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(INSIGHT_CACHE_KEY)
  }
}



