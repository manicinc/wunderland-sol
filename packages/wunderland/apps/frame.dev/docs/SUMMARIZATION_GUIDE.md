# Summarization Guide

Comprehensive documentation for Quarry's summarization features.

## Overview

Quarry provides **state-of-the-art extractive summarization** using a hybrid TextRank + BERT approach, plus optional **abstractive summarization** using LLM providers. All extractive processing runs **entirely client-side** using Web Workers and Transformers.js.

### Key Features

- **100% Client-Side AI**: BERT embeddings via Transformers.js - no server calls
- **Web Worker Processing**: Non-blocking background summarization
- **Smart Caching**: 7-day TTL with IndexedDB persistence
- **Multiple Algorithms**: TextRank (BERT), TF-IDF fallback, Lead-first fast mode
- **Block-Level Summaries**: Per-paragraph summaries with visibility controls
- **Document-Level Summaries**: Full document condensation

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Main Thread                               │
│  ┌─────────────────────┐    ┌──────────────────────────────────┐│
│  │ React Components    │───▶│ summarizationWorkerClient.ts     ││
│  │ (ReaderModePanel)   │    │ - postMessage to worker          ││
│  └─────────────────────┘    │ - handle responses               ││
│                              │ - manage cancellation            ││
│                              └──────────────────────────────────┘│
└─────────────────────────────┬───────────────────────────────────┘
                              │ postMessage
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Web Worker                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ public/workers/summarization.worker.ts                       ││
│  │                                                              ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  ││
│  │  │ Transformers │  │ TextRank     │  │ TF-IDF           │  ││
│  │  │ BERT Model   │  │ Algorithm    │  │ Fallback         │  ││
│  │  │ (MiniLM-L6)  │  │ + PageRank   │  │                  │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  ││
│  │                                                              ││
│  │  ┌──────────────────────────────────────────────────────┐  ││
│  │  │ In-Memory Cache (Map) - 7-day TTL                    │  ││
│  │  └──────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Algorithms

### 1. TextRank with BERT (Default)

The primary algorithm uses **TextRank** graph-based ranking enhanced with **BERT semantic embeddings**:

1. **Sentence Tokenization**: Robust boundary detection handling abbreviations
2. **BERT Embedding**: Each sentence encoded using `Xenova/all-MiniLM-L6-v2` (384 dimensions)
3. **Similarity Graph**: Cosine similarity between sentence embeddings
4. **PageRank Scoring**: Iterative ranking (20 iterations, 0.85 damping)
5. **Position Boost**: Early sentences receive slight boost
6. **Top-K Selection**: Select highest-ranked sentences

**Model Details**:
- Model: `Xenova/all-MiniLM-L6-v2`
- Dimensions: 384
- Size: ~22MB (lazy-loaded on first use)
- Quantized: Yes (for faster inference)

### 2. TF-IDF Fallback

When BERT is unavailable or disabled:

1. **Tokenization**: Word-level tokenization with stopword removal
2. **TF-IDF Vectors**: Term frequency-inverse document frequency
3. **Cosine Similarity**: Between sentence TF-IDF vectors
4. **TextRank**: Same graph-based ranking as BERT version

### 3. Lead-First (Fast Mode)

For maximum speed when quality is less critical:

- Simply extracts first N sentences
- No embedding or similarity computation
- Useful for previews and large document batches

## Configuration

### Environment Variables

```bash
# Algorithm selection (default: bert)
NEXT_PUBLIC_SUMMARIZATION_ALGORITHM=bert|tfidf|lead

# Auto-summarize on publish (default: true)
NEXT_PUBLIC_AUTO_SUMMARIZE_ON_PUBLISH=true

# Enable caching (default: true)
NEXT_PUBLIC_SUMMARIZATION_CACHING=true
```

### TypeScript Configuration

```typescript
import type { SummarizationConfig } from '@/lib/settings/summarySettings'

const config: SummarizationConfig = {
  enabled: true,
  algorithm: 'textrank',        // 'textrank' | 'tfidf' | 'lead'
  maxSentences: 3,              // Max sentences per summary
  minSentenceLength: 10,        // Min chars per sentence
  positionWeight: 0.1,          // Boost for early sentences
  useBertEmbeddings: true,      // Use BERT (vs TF-IDF)
  minSimilarity: 0.1,           // Min similarity threshold
}
```

### Block Visibility Settings

```typescript
import type { BlockVisibilityConfig } from '@/lib/settings/summarySettings'

const visibility: BlockVisibilityConfig = {
  showParagraphs: true,    // Show paragraph summaries (default: ON)
  showLists: true,         // Show list summaries (default: ON)
  showHeadings: false,     // Show heading summaries (default: OFF)
  showCode: false,         // Show code block summaries (default: OFF)
  showBlockquotes: true,   // Show blockquote summaries
  showTables: false,       // Show table summaries
}
```

## Usage

### Basic Usage

```typescript
import { summarizeText } from '@/lib/summarization/summarizationWorkerClient'

const summary = await summarizeText({
  content: 'Your long document text here...',
  maxSentences: 3,
  algorithm: 'textrank',
})

console.log(summary.text)
// "Most important sentence. Second key point. Third insight."
```

### React Hook

```typescript
import { useSummarization } from '@/lib/summarization/hooks/useSummarization'

function MyComponent() {
  const { summarize, summary, isLoading, error, progress } = useSummarization()

  const handleSummarize = async () => {
    await summarize({
      content: documentText,
      maxSentences: 3,
    })
  }

  return (
    <div>
      {isLoading && <p>Summarizing... {progress}%</p>}
      {summary && <p>{summary.text}</p>}
      {error && <p>Error: {error.message}</p>}
    </div>
  )
}
```

### Block-Level Summarization

```typescript
import { summarizeBlocks } from '@/lib/summarization/summarizationWorkerClient'

const blocks = [
  { id: '1', content: 'First paragraph...', type: 'paragraph' },
  { id: '2', content: 'Second paragraph...', type: 'paragraph' },
  { id: '3', content: 'Code block...', type: 'code' },
]

const blockSummaries = await summarizeBlocks(blocks, {
  maxSentences: 2,
  skipTypes: ['code'], // Skip code blocks
})

// Returns Map<blockId, summary>
```

### Cancellation

```typescript
import { summarizeText, cancelSummarization } from '@/lib/summarization/summarizationWorkerClient'

// Start summarization
const promise = summarizeText({ content: longText })

// Cancel if user navigates away
cancelSummarization()

// Promise will reject with CancellationError
```

## Caching

### Cache Behavior

- **Storage**: IndexedDB via `quarry-summarization-cache`
- **TTL**: 7 days (configurable)
- **Key**: Content hash + algorithm + settings
- **Automatic**: Cache check before every summarization

### Cache API

```typescript
import {
  getCachedSummary,
  cacheSummary,
  clearSummarizationCache,
  getCacheStats,
} from '@/lib/summarization/cache'

// Check cache
const cached = await getCachedSummary(cacheKey)
if (cached) {
  return cached
}

// Store result
await cacheSummary(cacheKey, result)

// Clear all cached summaries
await clearSummarizationCache()

// Get statistics
const stats = await getCacheStats()
// { totalEntries: 42, totalSize: 1234567, oldestEntry: '2024-12-01T...' }
```

## Web Worker Details

### Message Protocol

```typescript
// Request message
interface SummarizationRequest {
  type: 'summarize' | 'summarize-batch' | 'clear-cache'
  id: string
  content?: string
  blocks?: BlockContent[]
  config?: SummarizationConfig
}

// Response message
interface SummarizationResponse {
  type: 'result' | 'progress' | 'error' | 'cache-cleared'
  id: string
  result?: SummarizationResult
  progress?: number
  error?: string
}
```

### Worker Lifecycle

1. Worker is **lazily initialized** on first summarization request
2. BERT model is **downloaded once** and cached in browser storage
3. Worker stays alive for reuse (no cold start on subsequent requests)
4. Worker can be terminated with `terminateWorker()`

## Performance

### Benchmarks (M1 MacBook Pro)

| Document Size | BERT Time | TF-IDF Time | Lead Time |
|--------------|-----------|-------------|-----------|
| 500 words    | 150ms     | 30ms        | 5ms       |
| 2,000 words  | 400ms     | 100ms       | 10ms      |
| 10,000 words | 1.5s      | 350ms       | 25ms      |

### Optimization Tips

1. **Use Lead-First for Previews**: Quick previews don't need BERT quality
2. **Batch Similar Documents**: Process multiple docs in one worker message
3. **Pre-warm Worker**: Initialize worker on page load for instant first request
4. **Cache Aggressively**: 7-day TTL covers most re-visits

## Abstractive Summarization (LLM)

For AI-generated summaries that synthesize content (not just extract):

```typescript
import { generateAbstractiveSummary } from '@/lib/summarization/summarizer'

const summary = await generateAbstractiveSummary({
  content: documentText,
  provider: 'claude', // or 'openai', 'openrouter'
  style: 'concise',   // or 'detailed', 'bullet', 'academic'
})

// Returns AI-generated synthesis
```

**Note**: Abstractive summarization uses cloud APIs and incurs costs. See [COST_TRACKING_GUIDE.md](./COST_TRACKING_GUIDE.md).

## Troubleshooting

### BERT Model Not Loading

```typescript
// Check if worker is ready
import { isWorkerReady } from '@/lib/summarization/summarizationWorkerClient'

if (!isWorkerReady()) {
  console.log('Worker still initializing...')
}
```

### Out of Memory

Large documents may exceed worker memory:

```typescript
// Use chunked processing for very large docs
const chunks = splitIntoChunks(document, 5000) // 5000 word chunks
const summaries = await Promise.all(
  chunks.map(chunk => summarizeText({ content: chunk }))
)
const combined = combineSummaries(summaries)
```

### Cache Not Working

```typescript
// Check IndexedDB availability
if (!window.indexedDB) {
  console.warn('IndexedDB not available, caching disabled')
}

// Check cache stats
const stats = await getCacheStats()
console.log('Cache entries:', stats.totalEntries)
```

## Testing

Run summarization tests:

```bash
pnpm test __tests__/unit/summarization/
```

Tests cover:
- `textrank.test.ts` - TextRank algorithm and BERT integration
- `cache.test.ts` - Caching layer functionality

## Related Documentation

- [SEMANTIC_SEARCH_ARCHITECTURE.md](./SEMANTIC_SEARCH_ARCHITECTURE.md) - Embedding engine details
- [COST_TRACKING_GUIDE.md](./COST_TRACKING_GUIDE.md) - LLM cost tracking
- [NLP_GUIDE.md](./NLP_GUIDE.md) - Core NLP utilities
