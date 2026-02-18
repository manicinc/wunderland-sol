/**
 * Summarization Web Worker
 * @module public/workers/summarization.worker
 *
 * Background worker for BERT-powered extractive summarization.
 * Runs TextRank algorithm with BERT embeddings off the main thread
 * to prevent UI freezing during processing.
 *
 * Features:
 * - BERT embeddings via Transformers.js (lazy loaded)
 * - TF-IDF fallback when BERT unavailable
 * - Lead-first fast mode
 * - In-memory result caching
 * - Cancellation support
 */

import type {
  SummarizationWorkerMessage,
  SummarizationWorkerResponse,
  SummarizationTask,
  SummarizationProgress,
  SummarizationResult,
  SummarizationAlgorithm,
  SummarizationStage,
  SummarizationBlock,
} from '@/lib/summarization/workerTypes'

// ============================================================================
// WORKER STATE
// ============================================================================

let currentTaskId: string | null = null
let cancelled = false

// Simple in-memory cache for summaries
const summaryCache = new Map<string, { summary: string; timestamp: number }>()
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

// BERT model state (lazy loaded)
let bertModel: any = null
let bertTokenizer: any = null
let modelLoading = false
let modelLoadError: string | null = null

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.addEventListener('message', async (event: MessageEvent<SummarizationWorkerMessage>) => {
  const message = event.data

  switch (message.type) {
    case 'summarize':
      await handleSummarizeTask(message.task)
      break

    case 'cancel':
      handleCancellation(message.taskId)
      break

    case 'preload_model':
      await preloadBertModel()
      break

    case 'clear_cache':
      summaryCache.clear()
      postMessage({ type: 'cache_cleared' } as SummarizationWorkerResponse)
      break

    default:
      console.warn('[SummarizationWorker] Unknown message type:', message)
  }
})

// ============================================================================
// BERT MODEL LOADING
// ============================================================================

async function preloadBertModel(): Promise<void> {
  if (bertModel || modelLoading) return

  modelLoading = true
  const startTime = Date.now()

  try {
    // Import Transformers.js
    const { pipeline, env } = await import('@huggingface/transformers')

    // Configure for worker environment
    env.allowLocalModels = false
    env.useBrowserCache = true

    // Load feature extraction pipeline (MiniLM-L6-v2 for 384-dim embeddings)
    bertModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')

    const loadTimeMs = Date.now() - startTime
    console.log(`[SummarizationWorker] BERT model loaded in ${loadTimeMs}ms`)

    postMessage({
      type: 'model_ready',
      modelName: 'all-MiniLM-L6-v2',
      loadTimeMs,
    } as SummarizationWorkerResponse)
  } catch (error) {
    modelLoadError = error instanceof Error ? error.message : 'Unknown error'
    console.warn('[SummarizationWorker] Failed to load BERT model:', modelLoadError)
  } finally {
    modelLoading = false
  }
}

async function getBertEmbedding(text: string): Promise<Float32Array | null> {
  if (!bertModel) {
    await preloadBertModel()
  }

  if (!bertModel) return null

  try {
    // Get embeddings - returns tensor with shape [1, seq_len, 384]
    const output = await bertModel(text, { pooling: 'mean', normalize: true })
    return new Float32Array(output.data)
  } catch (error) {
    console.warn('[SummarizationWorker] Embedding failed:', error)
    return null
  }
}

// ============================================================================
// TASK HANDLERS
// ============================================================================

async function handleSummarizeTask(task: SummarizationTask): Promise<void> {
  currentTaskId = task.id
  cancelled = false
  const startTime = Date.now()
  let modelLoadTime = 0

  try {
    // Check cache first
    if (task.cacheKey) {
      const cached = summaryCache.get(task.cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        postComplete({
          taskId: task.id,
          summary: cached.summary,
          algorithm: task.algorithm || 'bert',
          durationMs: Date.now() - startTime,
          cached: true,
        })
        return
      }
    }

    const algorithm = task.algorithm || 'bert'
    const maxLength = task.maxLength || 200

    // Determine if we need BERT
    const needsBert = algorithm === 'bert'

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 1: Initialize and optionally load model
    // ─────────────────────────────────────────────────────────────────────────
    if (cancelled) return postCancelled(task.id)
    postProgress({
      taskId: task.id,
      progress: 5,
      stage: 'initializing',
      message: 'Initializing summarization...',
    })

    if (needsBert && !bertModel) {
      postProgress({
        taskId: task.id,
        progress: 10,
        stage: 'loading_model',
        message: 'Loading BERT model (first time only)...',
      })

      const modelStart = Date.now()
      await preloadBertModel()
      modelLoadTime = Date.now() - modelStart

      if (!bertModel) {
        console.warn('[SummarizationWorker] BERT unavailable, falling back to TF-IDF')
      }
    }

    await yieldToWorker()

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 2: Process content
    // ─────────────────────────────────────────────────────────────────────────
    if (cancelled) return postCancelled(task.id)

    let summary: string
    let actualAlgorithm: SummarizationAlgorithm = algorithm
    let blockSummaries: SummarizationResult['blockSummaries']

    if (task.blocks && task.blocks.length > 0) {
      // Block-level summarization
      const result = await summarizeBlocks(task.blocks, algorithm, maxLength, task.id)
      summary = result.documentSummary
      blockSummaries = result.blockSummaries
      actualAlgorithm = result.algorithm
    } else {
      // Full text summarization
      const result = await summarizeText(task.content, algorithm, maxLength, task.id)
      summary = result.summary
      actualAlgorithm = result.algorithm
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 3: Complete
    // ─────────────────────────────────────────────────────────────────────────
    if (cancelled) return postCancelled(task.id)

    const durationMs = Date.now() - startTime

    // Cache the result
    if (task.cacheKey) {
      summaryCache.set(task.cacheKey, {
        summary,
        timestamp: Date.now(),
      })

      // Prune old cache entries if needed
      if (summaryCache.size > 1000) {
        pruneCache()
      }
    }

    postComplete({
      taskId: task.id,
      summary,
      algorithm: actualAlgorithm,
      blockSummaries,
      durationMs,
      cached: false,
      modelLoadTimeMs: modelLoadTime > 0 ? modelLoadTime : undefined,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    postError(task.id, `Summarization failed: ${errorMessage}`)
  } finally {
    currentTaskId = null
  }
}

function handleCancellation(taskId: string): void {
  if (currentTaskId === taskId) {
    cancelled = true
  }
}

// ============================================================================
// SUMMARIZATION ALGORITHMS
// ============================================================================

async function summarizeText(
  content: string,
  algorithm: SummarizationAlgorithm,
  maxLength: number,
  taskId: string
): Promise<{ summary: string; algorithm: SummarizationAlgorithm }> {
  if (algorithm === 'lead-first') {
    return {
      summary: extractLeadSentences(content, maxLength),
      algorithm: 'lead-first',
    }
  }

  // Tokenize sentences
  postProgress({
    taskId,
    progress: 20,
    stage: 'tokenizing',
    message: 'Tokenizing sentences...',
  })

  const sentences = tokenizeSentences(content)
  if (sentences.length === 0) {
    return { summary: '', algorithm }
  }

  if (sentences.length === 1) {
    return {
      summary: sentences[0].slice(0, maxLength),
      algorithm,
    }
  }

  await yieldToWorker()

  // Get embeddings or TF-IDF vectors
  let embeddings: (Float32Array | null)[] = []
  let usedBert = false

  if (algorithm === 'bert' && bertModel) {
    postProgress({
      taskId,
      progress: 30,
      stage: 'computing_embeddings',
      message: 'Computing BERT embeddings...',
    })

    embeddings = await computeEmbeddings(sentences, taskId)
    usedBert = embeddings.every(e => e !== null)
  }

  await yieldToWorker()

  // Build similarity graph
  postProgress({
    taskId,
    progress: 60,
    stage: 'building_graph',
    message: 'Building similarity graph...',
  })

  const graph = usedBert
    ? buildBertGraph(sentences, embeddings as Float32Array[])
    : buildTfIdfGraph(sentences)

  await yieldToWorker()

  // Calculate TextRank scores
  postProgress({
    taskId,
    progress: 75,
    stage: 'ranking',
    message: 'Ranking sentences...',
  })

  const scores = calculateTextRankScores(graph, 20, 0.85)

  // Apply position bias
  const boostedScores = applyPositionBias(scores, sentences.length, 0.2)

  await yieldToWorker()

  // Select top sentences
  postProgress({
    taskId,
    progress: 90,
    stage: 'selecting',
    message: 'Selecting summary sentences...',
  })

  const summary = selectSummarySentences(sentences, boostedScores, maxLength)

  return {
    summary,
    algorithm: usedBert ? 'bert' : 'tfidf',
  }
}

async function summarizeBlocks(
  blocks: SummarizationBlock[],
  algorithm: SummarizationAlgorithm,
  maxLength: number,
  taskId: string
): Promise<{
  documentSummary: string
  blockSummaries: SummarizationResult['blockSummaries']
  algorithm: SummarizationAlgorithm
}> {
  const blockSummaries: SummarizationResult['blockSummaries'] = []
  const contentParts: string[] = []
  let usedBert = algorithm === 'bert' && bertModel !== null

  for (let i = 0; i < blocks.length; i++) {
    if (cancelled) break

    const block = blocks[i]
    postProgress({
      taskId,
      progress: 20 + (i / blocks.length) * 60,
      stage: 'computing_embeddings',
      message: `Processing block ${i + 1}/${blocks.length}...`,
      blocksProcessed: i,
      totalBlocks: blocks.length,
    })

    // Skip certain block types
    if (block.type === 'code' || block.type === 'table') {
      blockSummaries.push({
        blockId: block.id,
        summary: null,
        score: 0,
      })
      continue
    }

    // Get block summary
    const blockMaxLength = Math.min(150, maxLength)
    const result = await summarizeText(block.content, algorithm, blockMaxLength, taskId)

    blockSummaries.push({
      blockId: block.id,
      summary: result.summary || null,
      score: result.summary ? 1 : 0,
    })

    if (result.summary) {
      contentParts.push(result.summary)
    }

    if (result.algorithm === 'tfidf') {
      usedBert = false
    }

    await yieldToWorker()
  }

  // Generate document-level summary from block summaries
  const combinedContent = contentParts.join(' ')
  const docResult = combinedContent.length > maxLength
    ? await summarizeText(combinedContent, algorithm, maxLength, taskId)
    : { summary: combinedContent, algorithm }

  return {
    documentSummary: docResult.summary,
    blockSummaries,
    algorithm: usedBert ? 'bert' : 'tfidf',
  }
}

// ============================================================================
// TEXTRANK IMPLEMENTATION
// ============================================================================

function tokenizeSentences(text: string): string[] {
  if (!text?.trim()) return []

  // Common abbreviations
  const abbreviations = [
    'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'vs', 'etc', 'i\\.e', 'e\\.g',
    'Inc', 'Ltd', 'Corp', 'Co', 'Fig', 'Eq', 'No', 'Vol'
  ]

  let processed = text
  abbreviations.forEach((abbr, i) => {
    const regex = new RegExp(`\\b${abbr}\\.`, 'g')
    processed = processed.replace(regex, `<<ABBR${i}>>`)
  })

  // Protect URLs and decimals
  processed = processed.replace(/https?:\/\/[^\s]+/g, match => `<<URL${match}URL>>`)
  processed = processed.replace(/(\d+)\.(\d+)/g, '$1<<DOT>>$2')

  // Split on sentence boundaries
  const sentences = processed
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  // Restore protected patterns
  return sentences.map(sentence => {
    let restored = sentence
    abbreviations.forEach((abbr, i) => {
      restored = restored.replace(new RegExp(`<<ABBR${i}>>`, 'g'), `${abbr.replace('\\', '')}.`)
    })
    restored = restored.replace(/<<URL(.+?)URL>>/g, '$1')
    restored = restored.replace(/<<DOT>>/g, '.')
    return restored.trim()
  }).filter(s => s.length >= 10)
}

async function computeEmbeddings(
  sentences: string[],
  taskId: string
): Promise<(Float32Array | null)[]> {
  const embeddings: (Float32Array | null)[] = []

  for (let i = 0; i < sentences.length; i++) {
    if (cancelled) break

    if (i % 5 === 0) {
      postProgress({
        taskId,
        progress: 30 + (i / sentences.length) * 25,
        stage: 'computing_embeddings',
        message: `Computing embeddings (${i + 1}/${sentences.length})...`,
      })
      await yieldToWorker()
    }

    const embedding = await getBertEmbedding(sentences[i])
    embeddings.push(embedding)
  }

  return embeddings
}

function buildBertGraph(
  sentences: string[],
  embeddings: Float32Array[]
): Map<number, Map<number, number>> {
  const graph: Map<number, Map<number, number>> = new Map()
  const minSimilarity = 0.1

  for (let i = 0; i < sentences.length; i++) {
    graph.set(i, new Map())

    for (let j = 0; j < sentences.length; j++) {
      if (i === j) continue

      const similarity = cosineSimilarity(embeddings[i], embeddings[j])
      if (similarity >= minSimilarity) {
        graph.get(i)!.set(j, similarity)
      }
    }
  }

  return graph
}

function buildTfIdfGraph(sentences: string[]): Map<number, Map<number, number>> {
  const graph: Map<number, Map<number, number>> = new Map()
  const minSimilarity = 0.1

  // Build TF-IDF vectors
  const tfidfVectors = calculateTfIdf(sentences)

  for (let i = 0; i < sentences.length; i++) {
    graph.set(i, new Map())

    for (let j = 0; j < sentences.length; j++) {
      if (i === j) continue

      const vecA = tfidfVectors.get(sentences[i]) || []
      const vecB = tfidfVectors.get(sentences[j]) || []
      const similarity = cosineSimilarity(
        new Float32Array(vecA),
        new Float32Array(vecB)
      )

      if (similarity >= minSimilarity) {
        graph.get(i)!.set(j, similarity)
      }
    }
  }

  return graph
}

function calculateTfIdf(sentences: string[]): Map<string, number[]> {
  const wordCounts: Map<string, number>[] = []
  const docFreq: Map<string, number> = new Map()
  const vocabulary = new Set<string>()

  sentences.forEach(sentence => {
    const words = sentence.toLowerCase().split(/\W+/).filter(w => w.length > 2)
    const counts: Map<string, number> = new Map()
    const seen = new Set<string>()

    words.forEach(word => {
      vocabulary.add(word)
      counts.set(word, (counts.get(word) || 0) + 1)
      if (!seen.has(word)) {
        seen.add(word)
        docFreq.set(word, (docFreq.get(word) || 0) + 1)
      }
    })

    wordCounts.push(counts)
  })

  const vocabList = Array.from(vocabulary)
  const tfidfVectors: Map<string, number[]> = new Map()

  sentences.forEach((sentence, idx) => {
    const counts = wordCounts[idx]
    const vector = vocabList.map(word => {
      const tf = counts.get(word) || 0
      const df = docFreq.get(word) || 1
      const idf = Math.log(sentences.length / df)
      return tf * idf
    })
    tfidfVectors.set(sentence, vector)
  })

  return tfidfVectors
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
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

function calculateTextRankScores(
  graph: Map<number, Map<number, number>>,
  iterations: number,
  dampingFactor: number
): number[] {
  const n = graph.size
  if (n === 0) return []

  let scores = new Array(n).fill(1 / n)
  const d = dampingFactor

  for (let iter = 0; iter < iterations; iter++) {
    const newScores = new Array(n).fill((1 - d) / n)

    for (let i = 0; i < n; i++) {
      const edges = graph.get(i) || new Map()

      for (const [j, weight] of edges) {
        const outEdges = graph.get(j) || new Map()
        let outWeightSum = 0
        for (const w of outEdges.values()) {
          outWeightSum += w
        }

        if (outWeightSum > 0) {
          newScores[i] += d * (weight / outWeightSum) * scores[j]
        }
      }
    }

    scores = newScores
  }

  return scores
}

function applyPositionBias(
  scores: number[],
  totalSentences: number,
  weight: number
): number[] {
  return scores.map((score, i) => {
    const position = 1 - (i / totalSentences)
    return score * (1 - weight) + position * weight
  })
}

function selectSummarySentences(
  sentences: string[],
  scores: number[],
  maxLength: number
): string {
  // Create scored sentence pairs
  const scored = sentences.map((text, i) => ({
    text,
    index: i,
    score: scores[i],
  }))

  // Sort by score (descending)
  const ranked = [...scored].sort((a, b) => b.score - a.score)

  // Select sentences up to maxLength
  let summary = ''
  const selectedIndices: Set<number> = new Set()

  for (const sentence of ranked) {
    if (summary.length + sentence.text.length + 2 > maxLength) {
      if (selectedIndices.size === 0) {
        summary = sentence.text.slice(0, maxLength - 3) + '...'
        selectedIndices.add(sentence.index)
      }
      break
    }
    summary += (summary ? ' ' : '') + sentence.text
    selectedIndices.add(sentence.index)
  }

  // Reorder by original position for coherence
  const orderedSummary = [...selectedIndices]
    .sort((a, b) => a - b)
    .map(idx => scored[idx].text)
    .join(' ')

  return orderedSummary
}

function extractLeadSentences(content: string, maxLength: number): string {
  const sentences = tokenizeSentences(content)
  let summary = ''

  for (const sentence of sentences) {
    if (summary.length + sentence.length + 2 > maxLength) {
      if (!summary) {
        return sentence.slice(0, maxLength - 3) + '...'
      }
      break
    }
    summary += (summary ? ' ' : '') + sentence
  }

  return summary
}

// ============================================================================
// HELPERS
// ============================================================================

function yieldToWorker(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

function pruneCache(): void {
  const now = Date.now()
  const entries = Array.from(summaryCache.entries())
    .filter(([_, v]) => now - v.timestamp < CACHE_TTL)
    .sort((a, b) => b[1].timestamp - a[1].timestamp)
    .slice(0, 500)

  summaryCache.clear()
  entries.forEach(([k, v]) => summaryCache.set(k, v))
}

// ============================================================================
// MESSAGE SENDERS
// ============================================================================

function postProgress(data: SummarizationProgress): void {
  const message: SummarizationWorkerResponse = { type: 'progress', data }
  self.postMessage(message)
}

function postComplete(data: SummarizationResult): void {
  const message: SummarizationWorkerResponse = { type: 'complete', data }
  self.postMessage(message)
}

function postError(taskId: string, error: string): void {
  const message: SummarizationWorkerResponse = { type: 'error', taskId, error }
  self.postMessage(message)
}

function postCancelled(taskId: string): void {
  postError(taskId, 'Task cancelled by user')
}

// ============================================================================
// WORKER INITIALIZATION
// ============================================================================

console.log('[SummarizationWorker] Initialized and ready')
