# Dynamic Vocabulary System Guide

> Deep technical documentation for Quarry's semantic vocabulary classification system.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Environment-Aware Engines](#environment-aware-engines)
- [Pre-computed Embeddings](#pre-computed-embeddings)
- [VocabularyService API](#vocabularyservice-api)
- [How Classification Works](#how-classification-works)
- [WordNet Integration](#wordnet-integration)
- [Embedding Similarity](#embedding-similarity)
- [Taxonomy Utilities](#taxonomy-utilities)
- [Build System](#build-system)
- [Performance](#performance)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Dynamic Vocabulary System provides intelligent text classification using real NLP instead of hardcoded keyword lists. It works seamlessly in both browser (Codex) and server environments with environment-specific optimizations.

### Key Capabilities

| Feature | Description |
|---------|-------------|
| **Semantic Classification** | Classifies text into subjects, topics, skills, and difficulty levels |
| **Synonym Expansion** | Expands terms using WordNet synonyms and hypernyms |
| **Embedding Similarity** | Finds semantically related terms using vector embeddings |
| **Fuzzy Matching** | Catches typos and variations using Soundex, Metaphone, Levenshtein |
| **Acronym Expansion** | Resolves 150+ tech acronyms (AI → artificial intelligence) |
| **Environment-Aware** | Different engines for browser vs server with graceful fallbacks |

### Before vs After

```
BEFORE (Hardcoded):
- 150 fixed terms
- No synonyms
- No semantic understanding
- Simple string matching

AFTER (Dynamic):
- 228+ terms with semantic expansion
- 435+ WordNet synonyms
- Embedding similarity search
- Phonetic fuzzy matching
- Acronym resolution
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VocabularyService                                 │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Unified API: classify(), expandTerm(), findSimilarTerms()         │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                    ┌───────────────┴───────────────┐                       │
│                    ▼                               ▼                        │
│  ┌─────────────────────────────┐   ┌─────────────────────────────┐        │
│  │   ServerVocabularyEngine    │   │   BrowserVocabularyEngine   │        │
│  │   ───────────────────────   │   │   ─────────────────────────  │        │
│  │   • WordNet (natural.js)    │   │   • Pre-computed embeddings │        │
│  │   • Live embedding model    │   │   • Pre-computed synonyms   │        │
│  │   • Full taxonomy utils     │   │   • Taxonomy utilities      │        │
│  │   • Real-time expansion     │   │   • Compromise.js NER       │        │
│  └─────────────────────────────┘   └─────────────────────────────┘        │
│                    │                               │                        │
│                    └───────────────┬───────────────┘                       │
│                                    ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │            Shared: vocabulary-embeddings.json (2.6MB)               │    │
│  │   228 terms × 384-dim embeddings + WordNet synonyms/hypernyms       │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Environment-Aware Engines

### Engine Selection

The system automatically selects the appropriate engine:

```typescript
import { getVocabularyService } from '@/lib/indexer/vocabularyService'

const service = getVocabularyService()
await service.initialize()

// Same API works everywhere
const result = await service.classify(text)
```

### ServerVocabularyEngine

Used in Node.js environments (API routes, build scripts, CLI tools):

```typescript
// lib/indexer/engines/serverEngine.ts

class ServerVocabularyEngine implements VocabularyEngine {
  // Full WordNet access via natural.js
  async expandTerm(term: string): Promise<string[]> {
    const synonyms = await getSynonyms(term)      // WordNet
    const hypernyms = await getHypernyms(term, 2) // WordNet
    const acronyms = expandAcronym(term)          // Dictionary
    return [...new Set([term, ...synonyms, ...hypernyms, ...acronyms])]
  }

  // Live embedding generation
  async findSimilarTerms(text: string): Promise<ScoredTerm[]> {
    const embedding = await generateEmbedding(text)  // MiniLM-L6-v2
    return this.findNearestNeighbors(embedding)
  }
}
```

**Capabilities:**
- Live WordNet lookups (synonyms, hypernyms, hyponyms)
- Real-time embedding generation with MiniLM-L6-v2
- Full taxonomy similarity (Soundex, Metaphone, Levenshtein)
- Acronym expansion (150+ tech terms)

### BrowserVocabularyEngine

Used in browser environments (Codex app, React components):

```typescript
// lib/indexer/engines/browserEngine.ts

class BrowserVocabularyEngine implements VocabularyEngine {
  private embeddingsData: VocabularyEmbeddingsData

  async initialize() {
    // Load pre-computed embeddings from JSON
    this.embeddingsData = await loadVocabularyEmbeddings()
  }

  async expandTerm(term: string): Promise<string[]> {
    // Use pre-computed synonyms from JSON
    const embedding = findEmbeddingByTerm(this.embeddingsData, term)
    return [term, ...(embedding?.synonyms || [])]
  }

  async findSimilarTerms(text: string): Promise<ScoredTerm[]> {
    // Compare against pre-computed embeddings
    const textEmbed = await generateEmbedding(text)
    return this.cosineSimilaritySearch(textEmbed)
  }
}
```

**Capabilities:**
- Pre-computed synonyms from JSON (no WordNet needed)
- Pre-computed embeddings for fast similarity search
- Taxonomy utilities (Soundex, Metaphone, Levenshtein)
- Compromise.js for entity extraction
- Works offline, no server required

---

## Pre-computed Embeddings

### Data Structure

```typescript
// vocabulary-embeddings.json structure
interface VocabularyEmbeddingsData {
  version: string                    // "1.0.0"
  generatedAt: string                // ISO timestamp
  model: string                      // "Xenova/all-MiniLM-L6-v2"
  dimensions: number                 // 384
  embeddings: VocabularyEmbedding[]  // Array of term data
  stats: {
    totalTerms: number       // 228
    subjects: number         // 81
    topics: number           // 57
    skills: number           // 59
    difficulty: number       // 31
    synonymExpansions: number // 435
  }
}

interface VocabularyEmbedding {
  term: string                       // "machine-learning"
  category: 'subject' | 'topic' | 'skill' | 'difficulty'
  subcategory: string                // "ai"
  embedding: number[]                // 384-dimensional vector
  synonyms?: string[]                // ["ml", "statistical learning"]
  hypernyms?: string[]               // ["artificial intelligence"]
}
```

### Loading Embeddings

```typescript
// lib/indexer/vocabulary-embeddings.ts

export async function loadVocabularyEmbeddings(): Promise<VocabularyEmbeddingsData | null> {
  try {
    const response = await fetch('/data/vocabulary-embeddings.json')
    if (!response.ok) return null
    return await response.json()
  } catch (err) {
    console.warn('[VocabularyEmbeddings] Failed to load:', err)
    return null
  }
}
```

### Embedding Search

```typescript
// Find similar terms using cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Search for similar vocabulary terms
async function findSimilarTerms(text: string, topK = 5): Promise<ScoredTerm[]> {
  const textEmbedding = await generateEmbedding(text)

  return embeddingsData.embeddings
    .map(vocab => ({
      term: vocab.term,
      score: cosineSimilarity(textEmbedding, vocab.embedding),
      category: vocab.category,
    }))
    .filter(r => r.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
```

---

## VocabularyService API

### Initialize

```typescript
import { getVocabularyService } from '@/lib/indexer/vocabularyService'

const service = getVocabularyService()
await service.initialize()  // Loads embeddings, initializes engine
```

### classify(text)

Classify text into subjects, topics, skills, and difficulty:

```typescript
const result = await service.classify(`
  Building a React application with TypeScript.
  Using hooks for state management and Next.js for SSR.
`)

// Result:
{
  subjects: ['technology', 'programming'],
  topics: ['getting-started', 'architecture'],
  skills: ['react', 'typescript', 'nextjs'],
  difficulty: 'intermediate',
  confidence: {
    'technology': 0.92,
    'react': 0.88,
    'typescript': 0.85,
  },
  keywords: ['React', 'TypeScript', 'hooks', 'state', 'Next.js']
}
```

### expandTerm(term)

Expand a term with synonyms, hypernyms, and related terms:

```typescript
const expanded = await service.expandTerm('machine-learning')

// Result:
[
  'machine-learning',
  'ml',                          // acronym
  'machine learning',            // normalized
  'statistical learning',        // synonym
  'deep learning',               // related
  'artificial intelligence',     // hypernym
]
```

### findSimilarTerms(text, category?, topK?)

Find semantically similar vocabulary terms:

```typescript
const similar = await service.findSimilarTerms('neural networks', 'subject', 5)

// Result:
[
  { term: 'deep-learning', category: 'subject', subcategory: 'ai', score: 0.91 },
  { term: 'machine-learning', category: 'subject', subcategory: 'ai', score: 0.87 },
  { term: 'artificial-intelligence', category: 'subject', subcategory: 'ai', score: 0.82 },
  { term: 'neural-network', category: 'subject', subcategory: 'ai', score: 0.95 },
  { term: 'transformer', category: 'subject', subcategory: 'ai', score: 0.78 },
]
```

---

## How Classification Works

### Pipeline

```
Input Text
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. ENTITY EXTRACTION (Compromise.js)                            │
│    • Identify nouns, proper nouns, technical terms              │
│    • Extract named entities (technologies, concepts)            │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. TERM EXPANSION                                                │
│    • WordNet synonyms (server) or pre-computed (browser)        │
│    • Acronym expansion (AI → artificial intelligence)           │
│    • Normalization (CamelCase → kebab-case)                     │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. VOCABULARY MATCHING                                           │
│    • Exact term matching                                         │
│    • Stemmed matching (programming → program)                    │
│    • Phonetic matching (Soundex, Metaphone)                      │
│    • Embedding similarity search                                 │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. SCORING & AGGREGATION                                         │
│    • Score by match type (exact > stemmed > phonetic > semantic)│
│    • Aggregate scores per category                               │
│    • Apply confidence thresholds                                 │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
ClassificationResult
```

### Scoring Weights

| Match Type | Weight | Example |
|------------|--------|---------|
| Exact match | 1.0 | "react" = "react" |
| Stemmed match | 0.9 | "programming" → "program" |
| Synonym match | 0.85 | "ML" → "machine-learning" |
| Hypernym match | 0.75 | "TensorFlow" → "deep-learning" |
| Phonetic match | 0.7 | "colour" ≈ "color" |
| Embedding similarity | 0.5-1.0 | Cosine similarity score |
| Levenshtein (typo) | 0.6-0.9 | "typscript" ≈ "typescript" |

---

## WordNet Integration

### Server-Side Only

WordNet access requires the `natural` npm package which only works in Node.js:

```typescript
// lib/nlp/wordnet.ts

import natural from 'natural'
const wordnet = new natural.WordNet()

export async function getSynonyms(word: string): Promise<string[]> {
  return new Promise((resolve) => {
    wordnet.lookup(word.toLowerCase(), (results) => {
      const synonyms = new Set<string>()
      for (const result of results || []) {
        for (const syn of result.synonyms || []) {
          synonyms.add(syn.toLowerCase().replace(/_/g, ' '))
        }
      }
      resolve(Array.from(synonyms))
    })
  })
}

export async function getHypernyms(word: string, depth = 2): Promise<string[]> {
  // Traverse up the semantic hierarchy
  // "dog" → "canine" → "mammal" → "animal"
}

export async function getHyponyms(word: string, depth = 2): Promise<string[]> {
  // Traverse down the semantic hierarchy
  // "animal" → "mammal" → "dog", "cat", "horse"
}
```

### Pre-computed for Browser

For browser use, synonyms are pre-computed at build time and stored in `vocabulary-embeddings.json`:

```json
{
  "term": "machine-learning",
  "synonyms": [
    "ml",
    "statistical learning",
    "pattern recognition"
  ],
  "hypernyms": [
    "artificial intelligence",
    "computer science"
  ]
}
```

---

## Embedding Similarity

### Model: MiniLM-L6-v2

The system uses `all-MiniLM-L6-v2` from Hugging Face:

- **Dimensions**: 384
- **Performance**: Fast inference, good semantic quality
- **Size**: ~80MB (quantized)
- **Library**: `@huggingface/transformers` (browser) or ONNX Runtime

### Generating Embeddings

```typescript
// Server-side with transformers.js
import { pipeline } from '@huggingface/transformers'

const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')

async function generateEmbedding(text: string): Promise<number[]> {
  const result = await embedder(text, { pooling: 'mean', normalize: true })
  return Array.from(result.data as Float32Array)
}
```

### Similarity Search

```typescript
// Find vocabulary terms semantically similar to input
async function findSimilarVocab(text: string): Promise<ScoredTerm[]> {
  const textEmbed = await generateEmbedding(text)

  return precomputedEmbeddings
    .map(vocab => ({
      term: vocab.term,
      score: cosineSimilarity(textEmbed, vocab.embedding),
      category: vocab.category,
    }))
    .filter(r => r.score > 0.6)
    .sort((a, b) => b.score - a.score)
}
```

---

## Taxonomy Utilities

The system includes powerful fuzzy matching from `lib/taxonomy`:

### Phonetic Matching

```typescript
import { getSoundexCode, getMetaphoneCode } from '@/lib/taxonomy'

// Soundex: Groups words that sound similar
getSoundexCode('color')   // "C460"
getSoundexCode('colour')  // "C460" - same!

// Metaphone: More accurate phonetic algorithm
getMetaphoneCode('algorithm')  // "ALKR0M"
getMetaphoneCode('algorythm')  // "ALKR0M" - catches typo!
```

### Edit Distance

```typescript
import { levenshteinDistance } from '@/lib/taxonomy'

// Character-level edit distance
levenshteinDistance('typescript', 'typscript')  // 1 (missing 'e')
levenshteinDistance('react', 'reactjs')         // 2 (added 'js')
```

### Acronym Expansion

```typescript
import { expandAcronym, contractToAcronym } from '@/lib/taxonomy'

expandAcronym('ai')   // ['artificial-intelligence']
expandAcronym('nlp')  // ['natural-language-processing']
expandAcronym('api')  // ['application-programming-interface']

contractToAcronym('machine-learning')  // 'ml'
```

### N-gram Jaccard

```typescript
import { ngramJaccardSimilarity } from '@/lib/taxonomy'

// Character n-gram overlap
ngramJaccardSimilarity('javascript', 'typescript', 3)  // 0.65
ngramJaccardSimilarity('react', 'reactjs', 3)          // 0.83
```

---

## Build System

### Generating Embeddings

Run at build time to pre-compute vocabulary embeddings:

```bash
# Generate vocabulary embeddings
pnpm vocabulary:embeddings

# Or as part of prebuild
pnpm prebuild:vocabulary
```

### Build Script

```typescript
// scripts/generate-vocabulary-embeddings.ts

async function main() {
  const embeddings: VocabularyEmbedding[] = []

  for (const [subcategory, terms] of Object.entries(vocabulary.subjects)) {
    for (const term of terms) {
      const synonyms = await getSynonyms(term)      // WordNet
      const hypernyms = await getHypernyms(term)    // WordNet
      const embedding = await generateEmbedding(term)

      embeddings.push({
        term,
        category: 'subject',
        subcategory,
        embedding,
        synonyms: synonyms.length > 0 ? synonyms : undefined,
        hypernyms: hypernyms.length > 0 ? hypernyms : undefined,
      })
    }
  }

  // Write to public/data/vocabulary-embeddings.json
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2))
}
```

### Output Statistics

```
============================================================
Generation Complete!
============================================================
Total terms: 228
  Subjects: 81
  Topics: 57
  Skills: 59
  Difficulty: 31
Synonym expansions: 435
Output: public/data/vocabulary-embeddings.json
File size: 2609.8 KB
```

---

## Performance

### Classification Speed

| Environment | Operation | Time |
|-------------|-----------|------|
| Browser | classify() | ~50ms |
| Browser | expandTerm() | ~5ms |
| Browser | findSimilarTerms() | ~30ms |
| Server | classify() | ~100ms |
| Server | expandTerm() (WordNet) | ~50ms |
| Server | findSimilarTerms() | ~80ms |

### Memory Usage

| Component | Size |
|-----------|------|
| vocabulary-embeddings.json | 2.6MB |
| Loaded embeddings (browser) | ~4MB |
| Embedding model (optional) | ~80MB |

### Caching

```typescript
// Built-in caching with TTL
class Vocabulary {
  private _classifyCache: Map<string, { result; timestamp }> = new Map()
  private _cacheTTL = 60000 // 1 minute

  classify(text: string): ClassificationResult {
    const cacheKey = this.hashText(text)
    const cached = this._classifyCache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this._cacheTTL) {
      return cached.result
    }

    const result = this._computeClassification(text)
    this._classifyCache.set(cacheKey, { result, timestamp: Date.now() })
    return result
  }
}
```

---

## Examples

### Auto-Tagging Notes

```typescript
import { suggestTagsNLPAsync } from '@/lib/nlp/autoTagging'

const content = `
  Building a REST API with Node.js and Express.
  Using PostgreSQL for the database with Prisma ORM.
  Implementing JWT authentication and rate limiting.
`

const tags = await suggestTagsNLPAsync(content, {
  existingTags: ['backend', 'web-development'],
  config: { maxNewTagsPerDocument: 10 }
})

// Result:
[
  { tag: 'nodejs', confidence: 0.92, source: 'nlp', reasoning: 'Classified skill: nodejs' },
  { tag: 'express', confidence: 0.88, source: 'nlp', reasoning: 'Classified skill: express' },
  { tag: 'postgresql', confidence: 0.85, source: 'nlp', reasoning: 'Classified skill: postgresql' },
  { tag: 'api', confidence: 0.82, source: 'nlp', reasoning: 'Classified topic: api' },
  { tag: 'authentication', confidence: 0.78, source: 'nlp', reasoning: 'Classified topic: security' },
]
```

### Finding Related Content

```typescript
import { getVocabulary } from '@/lib/indexer/vocabulary'

const vocab = getVocabulary()
const similar = await vocab.findSimilarTerms('machine learning models', 'subject')

// Use for "Related Topics" section
similar.forEach(({ term, score }) => {
  console.log(`${term}: ${(score * 100).toFixed(1)}%`)
})

// Output:
// deep-learning: 91.2%
// neural-network: 88.5%
// artificial-intelligence: 85.3%
// transformer: 82.1%
```

### Semantic Search Enhancement

```typescript
import { getVocabularyService } from '@/lib/indexer/vocabularyService'

async function enhanceSearchQuery(query: string): Promise<string[]> {
  const service = getVocabularyService()
  await service.initialize()

  // Expand query terms
  const expanded = await service.expandTerm(query)

  // Find semantically similar vocab terms
  const similar = await service.findSimilarTerms(query, undefined, 5)

  return [
    query,
    ...expanded,
    ...similar.filter(s => s.score > 0.7).map(s => s.term)
  ]
}

// Usage:
const terms = await enhanceSearchQuery('ML algorithms')
// ['ML algorithms', 'machine-learning', 'algorithms', 'deep-learning', 'neural-network']
```

---

## Troubleshooting

### WordNet Not Available

**Symptom**: Server-side synonym expansion returns empty arrays

**Solution**: Install the `wordnet-db` package:
```bash
pnpm add wordnet-db
```

### Embeddings File Not Loading

**Symptom**: Browser classification falls back to basic mode

**Check**:
1. File exists: `public/data/vocabulary-embeddings.json`
2. File is served correctly: `curl http://localhost:3000/data/vocabulary-embeddings.json`
3. Regenerate: `pnpm vocabulary:embeddings`

### Slow Classification

**Causes & Solutions**:
1. **Large text**: Truncate to first 5000 characters
2. **No caching**: Enable the built-in cache
3. **Cold start**: Pre-initialize service on app load

```typescript
// Pre-initialize on app start
import { getVocabularyService } from '@/lib/indexer/vocabularyService'

export async function initializeApp() {
  const service = getVocabularyService()
  await service.initialize()  // Warm up
}
```

### Memory Issues

**Symptom**: High memory usage in browser

**Solution**: Use lazy loading:
```typescript
// Only load when needed
const service = getVocabularyService()
if (needsClassification) {
  await service.initialize()
  const result = await service.classify(text)
}
```

---

## Related Documentation

- [NLP Guide](./NLP_GUIDE.md) - Complete NLP system overview
- [Taxonomy Guide](./TAXONOMY_GUIDE.md) - Similarity detection and deduplication
- [Semantic Search Architecture](./SEMANTIC_SEARCH_ARCHITECTURE.md) - Search implementation
- [Auto-Tagging](./BLOCK_LEVEL_TAGGING.md) - Automatic tag suggestions

---

## Files Reference

| File | Purpose |
|------|---------|
| `lib/indexer/vocabularyService.ts` | Main service abstraction |
| `lib/indexer/vocabulary.ts` | Legacy API with service integration |
| `lib/indexer/vocabulary-embeddings.ts` | Types and loader |
| `lib/indexer/engines/serverEngine.ts` | Server-side engine (WordNet) |
| `lib/indexer/engines/browserEngine.ts` | Browser-side engine (embeddings) |
| `lib/nlp/wordnet.ts` | WordNet wrapper |
| `lib/taxonomy/index.ts` | Fuzzy matching utilities |
| `scripts/generate-vocabulary-embeddings.ts` | Build script |
| `public/data/vocabulary-embeddings.json` | Pre-computed data |
