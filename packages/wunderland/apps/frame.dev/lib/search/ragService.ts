/**
 * RAG (Retrieval Augmented Generation) Service
 * @module lib/search/ragService
 * 
 * @description
 * AI-powered search enhancement with two modes:
 * 1. Re-rank: Reorder search results by relevance using LLM scoring
 * 2. Synthesize: Generate answers from search results (Perplexity-style)
 * 
 * Local-first: Always uses local semantic search first, then optionally
 * enhances with AI.
 */

import { generateWithFallback, z } from '@/lib/llm'
import { 
  withGracefulFailure, 
  AI_FEATURES,
  type RAGMode,
  type RAGOptions,
  type RAGSearchResult,
  type RAGCitation,
  showAIError,
} from '@/lib/ai'
import type { SearchResult } from './semanticSearch'

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const MAX_RERANK_RESULTS = 10
const MAX_SYNTHESIZE_SOURCES = 5
const MAX_CONTEXT_LENGTH = 8000 // chars

/* ═══════════════════════════════════════════════════════════════════════════
   RE-RANKING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Schema for re-ranking response
 */
const rerankSchema = z.object({
  rankings: z.array(z.object({
    index: z.number(),
    score: z.number().min(0).max(100),
    reasoning: z.string().optional(),
  })),
})

/**
 * Re-rank search results using LLM
 */
async function rerankResults(
  query: string,
  results: SearchResult[],
  signal?: AbortSignal
): Promise<RAGSearchResult['rerankedResults']> {
  const topResults = results.slice(0, MAX_RERANK_RESULTS)
  
  // Build prompt with results
  const resultsText = topResults.map((r, i) => 
    `[${i}] "${r.entry.title}"\nPath: ${r.entry.path}\nSnippet: ${r.snippet.slice(0, 300)}...`
  ).join('\n\n')
  
  const prompt = `You are a search relevance expert. Given a user query and search results, score each result's relevance to the query from 0-100.

Query: "${query}"

Results:
${resultsText}

Score each result based on:
- Direct relevance to the query
- Quality and depth of information
- How well it answers the user's likely intent

Return rankings for all ${topResults.length} results.`

  const response = await generateWithFallback(
    prompt,
    rerankSchema,
    {
      system: 'You are a search relevance scoring system. Output only valid JSON.',
      maxTokens: 1000,
      temperature: 0.1,
      signal,
    }
  )
  
  // Map rankings back to results
  const rankedResults = response.data.rankings
    .map(ranking => {
      const result = topResults[ranking.index]
      if (!result) return null
      return {
        path: result.entry.path,
        title: result.entry.title,
        snippet: result.snippet,
        originalScore: result.score,
        aiScore: ranking.score,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.aiScore - a.aiScore)
  
  return rankedResults
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANSWER SYNTHESIS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Schema for synthesized answer
 */
const synthesizeSchema = z.object({
  answer: z.string(),
  citations: z.array(z.object({
    index: z.number(),
    relevantQuote: z.string().optional(),
  })),
})

/**
 * Synthesize an answer from search results
 */
async function synthesizeAnswer(
  query: string,
  results: SearchResult[],
  signal?: AbortSignal
): Promise<RAGSearchResult['synthesizedAnswer']> {
  const topResults = results.slice(0, MAX_SYNTHESIZE_SOURCES)
  
  // Build context from results
  let contextLength = 0
  const sources: Array<{ index: number; title: string; path: string; content: string }> = []
  
  for (let i = 0; i < topResults.length; i++) {
    const result = topResults[i]
    const content = result.entry.content.slice(0, 1500) // Limit per source
    
    if (contextLength + content.length > MAX_CONTEXT_LENGTH) break
    
    sources.push({
      index: i + 1, // 1-based for display
      title: result.entry.title,
      path: result.entry.path,
      content,
    })
    contextLength += content.length
  }
  
  const sourcesText = sources.map(s => 
    `[${s.index}] "${s.title}" (${s.path})\n${s.content}`
  ).join('\n\n---\n\n')
  
  const prompt = `You are a helpful assistant answering questions based on a knowledge base.

Question: "${query}"

Sources:
${sourcesText}

Instructions:
1. Answer the question based ONLY on the provided sources
2. Use inline citations like [1], [2] when referencing information
3. If the sources don't contain enough information, say so
4. Be concise but thorough
5. Format your answer in clear paragraphs`

  const response = await generateWithFallback(
    prompt,
    synthesizeSchema,
    {
      system: 'You are a helpful knowledge assistant. Always cite your sources using [n] notation. Output valid JSON with answer and citations array.',
      maxTokens: 1500,
      temperature: 0.3,
      signal,
    }
  )
  
  // Build citations
  const citations: RAGCitation[] = response.data.citations
    .map(c => {
      const source = sources.find(s => s.index === c.index)
      if (!source) return null
      const result = topResults[c.index - 1]
      return {
        index: c.index,
        path: source.path,
        title: source.title,
        snippet: c.relevantQuote || result?.snippet || source.content.slice(0, 200),
        relevance: result?.score ? Math.round(result.score * 100) : 80,
      }
    })
    .filter((c): c is RAGCitation => c !== null)
  
  // Ensure all referenced citations are included
  const citedIndices = new Set(
    (response.data.answer.match(/\[(\d+)\]/g) || [])
      .map(m => parseInt(m.slice(1, -1)))
  )
  
  for (const idx of citedIndices) {
    if (!citations.find(c => c.index === idx)) {
      const source = sources.find(s => s.index === idx)
      const result = topResults[idx - 1]
      if (source) {
        citations.push({
          index: idx,
          path: source.path,
          title: source.title,
          snippet: result?.snippet || source.content.slice(0, 200),
          relevance: result?.score ? Math.round(result.score * 100) : 70,
        })
      }
    }
  }
  
  // Sort citations by index
  citations.sort((a, b) => a.index - b.index)
  
  return {
    answer: response.data.answer,
    citations,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN RAG SERVICE
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Perform RAG-enhanced search
 * 
 * @param query - User's search query
 * @param localResults - Results from local semantic search
 * @param options - RAG options
 * @returns Enhanced search results
 */
export async function ragSearch(
  query: string,
  localResults: SearchResult[],
  options: RAGOptions
): Promise<RAGSearchResult | null> {
  const { mode, signal } = options
  const startTime = Date.now()
  
  // If mode is 'local', just return null (no RAG enhancement)
  if (mode === 'local') {
    return null
  }
  
  // No results to enhance
  if (localResults.length === 0) {
    return null
  }
  
  try {
    let rerankedResults: RAGSearchResult['rerankedResults']
    let synthesizedAnswer: RAGSearchResult['synthesizedAnswer']
    
    // Re-rank mode
    if (mode === 'rerank') {
      rerankedResults = await withGracefulFailure(
        () => rerankResults(query, localResults, signal),
        {
          featureId: AI_FEATURES.RAG_RERANK,
          maxRetries: 1,
        }
      ) ?? undefined
    }

    // Synthesize mode
    if (mode === 'synthesize') {
      synthesizedAnswer = await withGracefulFailure(
        () => synthesizeAnswer(query, localResults, signal),
        {
          featureId: AI_FEATURES.RAG_SYNTHESIZE,
          maxRetries: 1,
        }
      ) ?? undefined
    }
    
    return {
      mode,
      rerankedResults: rerankedResults || undefined,
      synthesizedAnswer: synthesizedAnswer || undefined,
      latency: Date.now() - startTime,
      provider: 'auto', // Could track actual provider used
    }
  } catch (error) {
    console.warn('[RAG] Search enhancement failed:', error)
    showAIError('AI search enhancement unavailable')
    return null
  }
}

/**
 * Check if RAG is available (has API keys)
 */
export function isRAGAvailable(): boolean {
  try {
    const { isLLMAvailable } = require('@/lib/llm')
    return isLLMAvailable()
  } catch {
    return false
  }
}

/**
 * Get RAG mode from preferences
 */
export function getRAGModeFromPrefs(prefs: {
  enabled: boolean
  rerank: boolean
  synthesize: boolean
}): RAGMode {
  if (!prefs.enabled) return 'local'
  // Prefer synthesize if both are enabled
  if (prefs.synthesize) return 'synthesize'
  if (prefs.rerank) return 'rerank'
  return 'local'
}



