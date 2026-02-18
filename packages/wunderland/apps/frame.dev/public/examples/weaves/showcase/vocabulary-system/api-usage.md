---
id: vocabulary-api-usage
slug: vocabulary-api-usage
title: "API Usage Guide"
version: "1.0.0"
difficulty: intermediate
taxonomy:
  subjects:
    - technology
  topics:
    - architecture
    - getting-started
tags:
  - vocabulary
  - api
  - code
  - typescript
relationships:
  references:
    - vocabulary-system-intro
    - vocabulary-classification-example
publishing:
  status: published
  lastUpdated: "2025-01-02"
summary: Code examples for using the VocabularyService API in your projects.
---

# API Usage Guide

Complete code examples for integrating the vocabulary system into your projects.

---

## Basic Usage

### Getting the Service

```typescript
import { getVocabularyService } from '@/lib/indexer/vocabularyService'

// Get singleton instance (auto-selects browser/server engine)
const service = getVocabularyService()

// Initialize (loads embeddings, connects to WordNet)
await service.initialize()
```

### Classifying Text

```typescript
const result = await service.classify(`
  Building a REST API with Express and PostgreSQL.
  Implementing JWT authentication and rate limiting.
`)

console.log(result)
// {
//   subjects: [
//     { term: 'technology', score: 0.94, source: 'embedding' }
//   ],
//   topics: [
//     { term: 'security', score: 0.87, source: 'direct' },
//     { term: 'architecture', score: 0.72, source: 'embedding' }
//   ],
//   skills: [
//     { term: 'express', score: 0.91, source: 'direct' },
//     { term: 'postgresql', score: 0.89, source: 'direct' },
//     { term: 'jwt', score: 0.85, source: 'direct' }
//   ],
//   difficulty: [
//     { term: 'intermediate', score: 0.68, source: 'embedding' }
//   ]
// }
```

---

## Advanced Usage

### Expanding Terms

Get synonyms, hypernyms, and related terms:

```typescript
const expanded = await service.expandTerm('programming')

console.log(expanded)
// {
//   term: 'programming',
//   synonyms: ['coding', 'software development', 'software engineering'],
//   hypernyms: ['computer science', 'technology'],
//   related: ['development', 'engineering', 'scripting']
// }
```

### Finding Similar Terms

Search vocabulary by semantic similarity:

```typescript
const similar = await service.findSimilar('machine learning', {
  category: 'subject',
  limit: 5,
  minScore: 0.5
})

console.log(similar)
// [
//   { term: 'ai', score: 0.92 },
//   { term: 'deep-learning', score: 0.88 },
//   { term: 'neural-network', score: 0.84 },
//   { term: 'technology', score: 0.71 },
//   { term: 'science', score: 0.58 }
// ]
```

### Batch Classification

Classify multiple texts efficiently:

```typescript
const texts = [
  'Introduction to Python for beginners',
  'Advanced Kubernetes cluster optimization',
  'Philosophy of consciousness and free will'
]

const results = await service.classifyBatch(texts)

// Each result has same structure as single classify()
results.forEach((result, i) => {
  console.log(`Text ${i + 1}:`, result.subjects[0]?.term)
})
// Text 1: technology
// Text 2: technology
// Text 3: philosophy
```

---

## Backward-Compatible API

The original `Vocabulary` class still works with sync methods:

```typescript
import { Vocabulary } from '@/lib/indexer/vocabulary'

const vocab = new Vocabulary()

// Sync method (uses cached classifications)
const result = vocab.classify('Building React apps with TypeScript')

// Get expanded vocabulary
const subjects = vocab.getSubjects()
const topics = vocab.getTopics()
const skills = vocab.getSkills()
```

---

## Configuration Options

### Service Options

```typescript
import { getVocabularyService } from '@/lib/indexer/vocabularyService'

const service = getVocabularyService({
  // Embedding similarity threshold (0-1)
  minSimilarity: 0.3,

  // Max results per category
  maxResults: 10,

  // Enable fuzzy matching
  fuzzyMatching: true,

  // Fuzzy match threshold (Levenshtein distance)
  fuzzyThreshold: 2,

  // Cache size for term expansions
  cacheSize: 1000
})
```

### Category-Specific Options

```typescript
const result = await service.classify(text, {
  // Only classify certain categories
  categories: ['subjects', 'skills'],

  // Category-specific thresholds
  thresholds: {
    subjects: 0.5,
    topics: 0.4,
    skills: 0.6,
    difficulty: 0.3
  }
})
```

---

## Using in React Components

### Hook Usage

```tsx
import { useVocabularyClassification } from '@/hooks/useVocabulary'

function TagSuggestions({ content }: { content: string }) {
  const { result, isLoading, error } = useVocabularyClassification(content)

  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <div className="flex flex-wrap gap-2">
      {result?.skills.map(skill => (
        <Badge key={skill.term} variant="skill">
          {skill.term} ({Math.round(skill.score * 100)}%)
        </Badge>
      ))}
    </div>
  )
}
```

### With Debouncing

```tsx
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useVocabularyClassification } from '@/hooks/useVocabulary'

function LiveClassification({ content }: { content: string }) {
  // Debounce to avoid classifying on every keystroke
  const debouncedContent = useDebouncedValue(content, 300)

  const { result } = useVocabularyClassification(debouncedContent)

  return <ClassificationDisplay result={result} />
}
```

---

## Server-Side Usage

### In API Routes

```typescript
// app/api/classify/route.ts
import { getVocabularyService } from '@/lib/indexer/vocabularyService'

export async function POST(request: Request) {
  const { text } = await request.json()

  const service = getVocabularyService()
  await service.initialize()

  const result = await service.classify(text)

  return Response.json(result)
}
```

### In Server Components

```tsx
// app/analyze/page.tsx
import { getVocabularyService } from '@/lib/indexer/vocabularyService'

export default async function AnalyzePage({
  searchParams
}: {
  searchParams: { text?: string }
}) {
  const text = searchParams.text

  if (!text) {
    return <TextInput />
  }

  const service = getVocabularyService()
  await service.initialize()
  const result = await service.classify(text)

  return <ClassificationResult result={result} />
}
```

---

## Type Definitions

```typescript
interface ClassificationResult {
  subjects: ScoredTerm[]
  topics: ScoredTerm[]
  skills: ScoredTerm[]
  difficulty: ScoredTerm[]
}

interface ScoredTerm {
  term: string
  score: number
  source: 'direct' | 'synonym' | 'hypernym' | 'embedding' | 'fuzzy'
}

interface ExpandedTerm {
  term: string
  synonyms: string[]
  hypernyms: string[]
  hyponyms?: string[]
  related: string[]
}

interface VocabularyServiceOptions {
  minSimilarity?: number
  maxResults?: number
  fuzzyMatching?: boolean
  fuzzyThreshold?: number
  cacheSize?: number
}
```

---

## Performance Tips

1. **Initialize once** — Call `initialize()` once at app startup, not per request
2. **Use batch methods** — `classifyBatch()` is more efficient than multiple `classify()` calls
3. **Set appropriate thresholds** — Higher `minSimilarity` = fewer but more accurate results
4. **Leverage caching** — The service caches term expansions automatically

---

## Error Handling

```typescript
import { getVocabularyService, VocabularyError } from '@/lib/indexer/vocabularyService'

try {
  const service = getVocabularyService()
  await service.initialize()
  const result = await service.classify(text)
} catch (error) {
  if (error instanceof VocabularyError) {
    if (error.code === 'EMBEDDINGS_NOT_LOADED') {
      // Embeddings file missing - run build script
      console.error('Run: npm run generate:vocabulary')
    } else if (error.code === 'WORDNET_UNAVAILABLE') {
      // WordNet not available (browser mode will still work)
      console.warn('WordNet unavailable, using embeddings only')
    }
  }
  throw error
}
```

---

## See Also

- [Vocabulary System Guide](/docs/VOCABULARY_SYSTEM_GUIDE.md) — Full technical documentation
- [Auto-Tagging Guide](/docs/NLP_GUIDE.md#auto-tagging) — How vocabulary integrates with tagging
