# Developer Guide: Offline Categorization System

Complete guide for developers extending, customizing, or integrating the categorization system.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Extending the System](#extending-the-system)
4. [Custom Processors](#custom-processors)
5. [Algorithm Customization](#algorithm-customization)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Testing](#testing)
9. [Performance Optimization](#performance-optimization)
10. [Contributing](#contributing)

## Architecture Overview

### System Layers

```
┌─────────────────────────────────────────────────────┐
│                    UI Layer                          │
│  CategorizationReviewPanel, ActionQueue, Toolbar    │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│                   Hook Layer                         │
│    usePendingCategorizations, useActionQueue        │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│                 Service Layer                        │
│  jobQueue, githubSync, database utilities           │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│                Processing Layer                      │
│      Web Worker, Algorithm, Job Processor           │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│                 Storage Layer                        │
│        SQL/IndexedDB, Settings, Cache               │
└─────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action
    ↓
Job Creation (jobQueue.createJob)
    ↓
Job Processor (categorizationProcessor)
    ↓
Web Worker Spawn (categorization.worker.ts)
    ↓
Algorithm Execution (categorizeStrand)
    ↓
Results Storage (categorization_results table)
    ↓
UI Update (usePendingCategorizations hook)
    ↓
User Review (CategorizationReviewPanel)
    ↓
Approval/Rejection (database.ts updates)
    ↓
Action Creation (categorization_actions table)
    ↓
GitHub Sync (githubSync.syncCategorizationActions)
    ↓
PR Creation (GitHub API)
```

## Core Components

### 1. Algorithm (`lib/categorization/algorithm.ts`)

**Purpose**: Browser-compatible categorization logic

**Key Functions**:
```typescript
// Categorize single document
categorizeStrand(input: CategorizationInput): Promise<CategoryResult>

// Batch categorization
categorizeStrands(inputs: CategorizationInput[]): Promise<CategoryResult[]>

// Keyword extraction
extractKeywords(content: string): string[]

// Frontmatter parsing
parseFrontmatter(content: string): { metadata, body }
```

**Customization Points**:
- Add custom scoring logic
- Implement ML-based categorization
- Add language-specific analysis
- Custom metadata extraction

### 2. Web Worker (`public/workers/categorization.worker.ts`)

**Purpose**: Background processing without blocking UI

**Message Protocol**:
```typescript
// Input
interface CategorizationTask {
  id: string
  inputs: CategorizationInput[]
  config: CategorizationConfig
}

// Output
interface CategorizationTaskResult {
  taskId: string
  success: boolean
  results: CategoryResult[]
  statistics: { ... }
}
```

**Extension Points**:
- Add preprocessing steps
- Implement result caching
- Add progress throttling
- Custom error handling

### 3. Job Processor (`lib/jobs/processors/categorization.ts`)

**Purpose**: Orchestrates categorization workflow

**Lifecycle**:
1. Validate payload
2. Load configuration
3. Load files from storage
4. Spawn worker
5. Handle progress updates
6. Store results
7. Create actions
8. Return summary

**Customization**:
```typescript
export const customCategorizationProcessor: JobProcessor = async (
  job,
  onProgress
) => {
  // Your custom logic
  onProgress(10, 'Custom step 1')

  // Call original or replace
  const result = await categorizationProcessor(job, onProgress)

  // Post-processing
  onProgress(100, 'Done!')
  return result
}

// Register
jobQueue.registerProcessor('categorization', customCategorizationProcessor)
```

### 4. GitHub Sync (`lib/categorization/githubSync.ts`)

**Purpose**: Sync approved actions to GitHub

**Extension Points**:
```typescript
// Custom action handler
async function syncCustomAction(
  action: CategorizationAction,
  config: GitHubConfig
): Promise<void> {
  // Your GitHub API logic
}

// Hook into sync
const originalSync = syncCategorizationActions
syncCategorizationActions = async (limit) => {
  const result = await originalSync(limit)
  // Post-sync hook
  await onSyncComplete(result)
  return result
}
```

### 5. Database Utilities (`lib/categorization/database.ts`)

**Purpose**: Type-safe database operations

**Usage**:
```typescript
import {
  createCategorizationResult,
  listCategorizationResults,
  updateCategorizationResult,
  getCategorizationStatistics,
} from '@/lib/categorization/database'

// Create result
const id = await createCategorizationResult({
  job_id: 'job-123',
  strand_path: 'weaves/inbox/doc.md',
  current_category: 'inbox/',
  suggested_category: 'wiki/tutorials/',
  confidence: 0.85,
  reasoning: 'Tutorial keywords found',
  alternatives: [],
})

// Query with filters
const results = await listCategorizationResults({
  status: ['pending', 'approved'],
  minConfidence: 0.8,
  limit: 50,
})

// Get statistics
const stats = await getCategorizationStatistics()
console.log(`Avg confidence: ${stats.avgConfidence}`)
```

## Extending the System

### Custom Category Types

Add new category definition properties:

```typescript
// types.ts
export interface CategoryDefinition {
  path: string
  label: string
  description: string
  keywords: string[]
  weight?: number
  // NEW FIELDS
  icon?: string
  color?: string
  requiredFields?: string[]
  customScoring?: (content: string) => number
}

// algorithm.ts
function scoreCategory(category: CategoryDefinition, ...args) {
  let score = 0

  // Original scoring
  score += keywordMatches * (category.weight || 1.0)

  // Custom scoring
  if (category.customScoring) {
    score += category.customScoring(content)
  }

  return score
}
```

### Custom Metadata Extractors

Add support for custom frontmatter fields:

```typescript
// algorithm.ts
export function parseCustomMetadata(content: string): Record<string, any> {
  const { metadata, body } = parseFrontmatter(content)

  // Extract custom fields
  const customData = {
    ...metadata,
    readingTime: calculateReadingTime(body),
    complexity: analyzeComplexity(body),
    audience: extractAudience(metadata),
  }

  return customData
}

// Use in categorization
export async function categorizeStrand(input: CategorizationInput) {
  const customMetadata = parseCustomMetadata(input.content)
  // Use customMetadata in scoring
}
```

### LLM Integration

Add AI-powered categorization fallback:

```typescript
// lib/categorization/llmCategorizer.ts
export async function llmCategorize(
  content: string,
  categories: CategoryDefinition[]
): Promise<CategorySuggestion> {
  const prompt = `
    Categorize this document into one of these categories:
    ${categories.map(c => `- ${c.path}: ${c.description}`).join('\n')}

    Document:
    ${content.slice(0, 1000)}

    Return JSON: { category, confidence, reasoning }
  `

  const response = await fetch('/api/llm/categorize', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  })

  return response.json()
}

// Use in algorithm
export async function categorizeStrand(input: CategorizationInput) {
  // Try keyword-based first
  const keywordResult = suggestCategory(input)

  // Fallback to LLM if low confidence
  if (keywordResult.confidence < 0.5) {
    return llmCategorize(input.content, input.config.categories)
  }

  return keywordResult
}
```

### Analytics & Metrics

Track categorization accuracy:

```typescript
// lib/categorization/analytics.ts
export interface CategorizationMetrics {
  totalProcessed: number
  avgConfidence: number
  approvalRate: number
  rejectionRate: number
  topCategories: Array<{ category: string; count: number }>
  accuracy: number  // Based on user corrections
}

export async function calculateMetrics(
  timeRange: { start: Date; end: Date }
): Promise<CategorizationMetrics> {
  const db = await getDb()

  const results = await db.all<CategorizationResult[]>(
    `SELECT * FROM categorization_results
     WHERE created_at BETWEEN ? AND ?`,
    [timeRange.start.toISOString(), timeRange.end.toISOString()]
  )

  // Calculate metrics
  const totalProcessed = results.length
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / totalProcessed
  const approved = results.filter(r => r.status === 'approved').length
  const rejected = results.filter(r => r.status === 'rejected').length

  return {
    totalProcessed,
    avgConfidence,
    approvalRate: approved / totalProcessed,
    rejectionRate: rejected / totalProcessed,
    topCategories: calculateTopCategories(results),
    accuracy: calculateAccuracy(results),
  }
}

// Dashboard component
export function CategorizationDashboard() {
  const [metrics, setMetrics] = useState<CategorizationMetrics>()

  useEffect(() => {
    calculateMetrics({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    }).then(setMetrics)
  }, [])

  return (
    <div>
      <h2>Categorization Metrics (Last 30 Days)</h2>
      <div>Total Processed: {metrics?.totalProcessed}</div>
      <div>Avg Confidence: {(metrics?.avgConfidence * 100).toFixed(1)}%</div>
      <div>Approval Rate: {(metrics?.approvalRate * 100).toFixed(1)}%</div>
    </div>
  )
}
```

## Custom Processors

### Creating a Custom Processor

```typescript
// lib/jobs/processors/smartCategorization.ts
import type { JobProcessor } from '../jobQueue'
import { categorizeStrand } from '@/lib/categorization/algorithm'
import { llmCategorize } from '@/lib/categorization/llmCategorizer'

export const smartCategorizationProcessor: JobProcessor = async (
  job,
  onProgress
) => {
  const { inboxPaths } = job.payload

  onProgress(0, 'Starting smart categorization...')

  const results = []

  for (let i = 0; i < inboxPaths.length; i++) {
    const path = inboxPaths[i]

    // Try keyword-based
    let result = await categorizeStrand({ path, ... })

    // If low confidence, use LLM
    if (result.suggestion.confidence < 0.7) {
      onProgress(
        (i / inboxPaths.length) * 100,
        `Using AI for ${path}...`
      )
      result = await llmCategorize(path)
    }

    results.push(result)
    onProgress((i + 1) / inboxPaths.length * 100, `Processed ${i + 1}/${inboxPaths.length}`)
  }

  return {
    filesProcessed: results.length,
    autoApplied: results.filter(r => r.action === 'auto-apply').length,
    pendingReview: results.filter(r => r.action !== 'auto-apply').length,
    failed: 0,
    resultIds: results.map(r => r.id),
  }
}

// Register
jobQueue.registerProcessor('smart_categorization', smartCategorizationProcessor)
```

### Processor Hooks

Add lifecycle hooks:

```typescript
// lib/categorization/hooks.ts
export interface ProcessorHooks {
  beforeProcess?: (job: Job) => Promise<void>
  afterProcess?: (job: Job, result: JobResult) => Promise<void>
  onError?: (job: Job, error: Error) => Promise<void>
}

let hooks: ProcessorHooks = {}

export function registerHooks(newHooks: ProcessorHooks) {
  hooks = { ...hooks, ...newHooks }
}

// In processor
export const categorizationProcessor: JobProcessor = async (job, onProgress) => {
  await hooks.beforeProcess?.(job)

  try {
    const result = await processCategorizationJob(job, onProgress)
    await hooks.afterProcess?.(job, result)
    return result
  } catch (error) {
    await hooks.onError?.(job, error)
    throw error
  }
}

// Usage
registerHooks({
  beforeProcess: async (job) => {
    console.log('Starting job', job.id)
    // Send analytics event
  },
  afterProcess: async (job, result) => {
    console.log('Job complete', result)
    // Update dashboard
  },
})
```

## Algorithm Customization

### Custom Scoring Functions

```typescript
// lib/categorization/scorers.ts
export interface CustomScorer {
  name: string
  weight: number
  score: (content: string, category: CategoryDefinition) => number
}

export const tfidfScorer: CustomScorer = {
  name: 'TF-IDF',
  weight: 1.5,
  score: (content, category) => {
    // Implement TF-IDF algorithm
    return calculateTFIDF(content, category.keywords)
  },
}

export const semanticScorer: CustomScorer = {
  name: 'Semantic',
  weight: 2.0,
  score: (content, category) => {
    // Use embedding similarity
    return calculateSemanticSimilarity(content, category.description)
  },
}

// Register scorers
export function suggestCategoryWithScorers(
  input: CategorizationInput,
  scorers: CustomScorer[]
): CategorySuggestion {
  const scores = []

  for (const category of input.config.categories) {
    let totalScore = 0

    // Apply each scorer
    for (const scorer of scorers) {
      const score = scorer.score(input.content, category)
      totalScore += score * scorer.weight
    }

    scores.push({ category, score: totalScore })
  }

  // Return best match
  scores.sort((a, b) => b.score - a.score)
  return {
    category: scores[0].category.path,
    confidence: scores[0].score,
    reasoning: `Matched using: ${scorers.map(s => s.name).join(', ')}`,
    alternatives: scores.slice(1, 4),
  }
}
```

### Multi-Language Support

```typescript
// lib/categorization/languages.ts
export interface LanguageProcessor {
  detectLanguage(content: string): string
  extractKeywords(content: string, language: string): string[]
  stemWords(words: string[], language: string): string[]
}

export const multilingualCategorizer = {
  async categorize(input: CategorizationInput) {
    const language = detectLanguage(input.content)

    // Use language-specific keyword extraction
    const keywords = extractKeywordsForLanguage(input.content, language)

    // Use language-specific category keywords
    const localizedCategories = input.config.categories.map(cat => ({
      ...cat,
      keywords: translateKeywords(cat.keywords, language),
    }))

    return suggestCategory({
      ...input,
      config: {
        ...input.config,
        categories: localizedCategories,
      },
    })
  },
}
```

## Database Schema

### Extending Tables

Add custom fields:

```sql
-- Migration: Add custom fields to categorization_results
ALTER TABLE categorization_results ADD COLUMN custom_metadata TEXT;
ALTER TABLE categorization_results ADD COLUMN processing_time_ms INTEGER;
ALTER TABLE categorization_results ADD COLUMN algorithm_version TEXT;

-- Create custom indexes
CREATE INDEX idx_categorization_results_algorithm
  ON categorization_results(algorithm_version);
```

TypeScript types:

```typescript
// types.ts
export interface ExtendedCategorizationResult extends CategorizationResult {
  custom_metadata?: string
  processing_time_ms?: number
  algorithm_version?: string
}

// database.ts
export async function createExtendedResult(
  dto: CreateCategorizationResultDTO & {
    custom_metadata?: Record<string, any>
    processing_time_ms?: number
  }
): Promise<string> {
  const db = await getDb()
  const id = uuidv4()

  await db.run(
    `INSERT INTO categorization_results (..., custom_metadata, processing_time_ms)
     VALUES (..., ?, ?)`,
    [
      ...standardFields,
      JSON.stringify(dto.custom_metadata),
      dto.processing_time_ms,
    ]
  )

  return id
}
```

### Custom Queries

Add utility queries:

```typescript
// database.ts
export async function getCategorizationTrends(
  days: number = 30
): Promise<Array<{ date: string; count: number; avgConfidence: number }>> {
  const db = await getDb()

  return db.all(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as count,
      AVG(confidence) as avgConfidence
    FROM categorization_results
    WHERE created_at >= DATE('now', '-${days} days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `)
}

export async function getCategoryDistribution(): Promise<
  Array<{ category: string; count: number; percentage: number }>
> {
  const db = await getDb()

  const total = await db.get<{ count: number }>(
    'SELECT COUNT(*) as count FROM categorization_results'
  )

  const distribution = await db.all<Array<{ category: string; count: number }>>(
    `SELECT suggested_category as category, COUNT(*) as count
     FROM categorization_results
     GROUP BY suggested_category
     ORDER BY count DESC`
  )

  return distribution.map(d => ({
    ...d,
    percentage: (d.count / total.count) * 100,
  }))
}
```

## API Reference

See [API_REFERENCE.md](API_REFERENCE.md) for complete API documentation.

## Testing

### Unit Tests

```typescript
// __tests__/algorithm.test.ts
import { categorizeStrand, extractKeywords } from '../algorithm'

describe('categorizeStrand', () => {
  it('should categorize tutorial correctly', async () => {
    const result = await categorizeStrand({
      path: 'inbox/test.md',
      title: 'React Tutorial',
      content: 'Learn React step by step...',
      config: DEFAULT_CONFIG,
    })

    expect(result.suggestion.category).toBe('weaves/wiki/tutorials/')
    expect(result.suggestion.confidence).toBeGreaterThan(0.8)
    expect(result.action).toBe('auto-apply')
  })
})

describe('extractKeywords', () => {
  it('should extract keywords from content', () => {
    const keywords = extractKeywords('This is a tutorial about React hooks')
    expect(keywords).toContain('tutorial')
    expect(keywords).toContain('react')
    expect(keywords).toContain('hooks')
  })
})
```

### Integration Tests

```typescript
// __tests__/categorization.integration.test.ts
import { jobQueue } from '@/lib/jobs/jobQueue'
import { getDb } from '@/lib/storage/localCodex'

describe('Categorization Integration', () => {
  it('should complete full categorization workflow', async () => {
    // Create job
    const job = await jobQueue.createJob('categorization', {
      inboxPaths: ['inbox/test.md'],
    })

    // Wait for completion
    await new Promise(resolve => {
      jobQueue.on('job:completed', (event) => {
        if (event.job.id === job.id) resolve(event)
      })
    })

    // Check results
    const db = await getDb()
    const results = await db.all(
      'SELECT * FROM categorization_results WHERE job_id = ?',
      [job.id]
    )

    expect(results).toHaveLength(1)
    expect(results[0].confidence).toBeGreaterThan(0)
  })
})
```

## Performance Optimization

### Batch Processing

```typescript
// Process in smaller batches for better responsiveness
const BATCH_SIZE = 10

for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
  const batch = inputs.slice(i, i + BATCH_SIZE)
  const batchResults = await Promise.all(
    batch.map(input => categorizeStrand(input))
  )
  results.push(...batchResults)

  // Small delay to prevent blocking
  await new Promise(resolve => setTimeout(resolve, 50))
}
```

### Caching

```typescript
// lib/categorization/cache.ts
const categoryCache = new Map<string, CategorySuggestion>()

export async function categorizeWithCache(
  input: CategorizationInput
): Promise<CategoryResult> {
  const cacheKey = `${input.path}-${input.title}`

  if (categoryCache.has(cacheKey)) {
    return categoryCache.get(cacheKey)!
  }

  const result = await categorizeStrand(input)
  categoryCache.set(cacheKey, result)

  return result
}

// Clear cache periodically
setInterval(() => categoryCache.clear(), 60 * 60 * 1000) // 1 hour
```

### Worker Pool

```typescript
// Use multiple workers for parallel processing
const workerPool = []
const MAX_WORKERS = navigator.hardwareConcurrency || 4

for (let i = 0; i < MAX_WORKERS; i++) {
  workerPool.push(new Worker('/workers/categorization.worker.js'))
}

// Distribute tasks across workers
let workerIndex = 0
for (const input of inputs) {
  const worker = workerPool[workerIndex]
  worker.postMessage({ type: 'categorize', task: input })
  workerIndex = (workerIndex + 1) % workerPool.length
}
```

## Contributing

### Code Style

- Follow existing TypeScript conventions
- Add JSDoc comments to public functions
- Use meaningful variable names
- Keep functions small and focused

### Pull Request Process

1. Create feature branch: `feature/your-feature-name`
2. Write tests for new functionality
3. Update documentation
4. Run linter: `npm run lint`
5. Run tests: `npm run test`
6. Submit PR with clear description

### Areas for Contribution

- 🎯 LLM integration
- 📊 Analytics dashboard
- 🌐 Multi-language support
- 🧪 More test coverage
- 📝 Documentation improvements
- 🎨 UI enhancements
- ⚡ Performance optimizations

---

**Questions?**
- 📧 Open an issue on GitHub
- 💬 Join the discussion
- 📖 Read the [User Guide](USER_GUIDE.md)
