---
id: vocabulary-system-intro
slug: vocabulary-system-introduction
title: "Dynamic Vocabulary System"
version: "1.0.0"
difficulty: intermediate
taxonomy:
  subjects:
    - technology
    - ai
  topics:
    - nlp
    - semantic-search
tags:
  - vocabulary
  - nlp
  - wordnet
  - embeddings
  - classification
relationships:
  references:
    - vocabulary-classification-example
    - vocabulary-api-usage
publishing:
  status: published
  lastUpdated: "2025-01-02"
summary: Real NLP text classification using WordNet synonyms, semantic embeddings, and taxonomy utilities instead of hardcoded keyword lists.
---

# Dynamic Vocabulary System

Welcome to the **Dynamic Vocabulary System** — a real NLP solution that goes far beyond hardcoded keyword matching. This system uses WordNet for synonyms/hypernyms, 384-dimensional semantic embeddings, and taxonomy utilities to intelligently classify text.

---

## The Problem with Hardcoded Keywords

Traditional vocabulary systems use static lists:

```typescript
// The OLD way - fragile and limited
const keywords = {
  technology: ['api', 'code', 'software', 'programming'],
  science: ['research', 'experiment', 'hypothesis']
}

// Does NOT recognize:
// - "coding" (synonym of "code")
// - "application programming interface" (expanded form of "api")
// - "empirical study" (related to "experiment")
```

This approach has serious limitations:
- **No synonym awareness** — misses "coding" when looking for "code"
- **No semantic understanding** — can't connect related concepts
- **Manual maintenance** — every new term must be added by hand
- **No fuzzy matching** — typos and variations fail completely

---

## The Solution: Dynamic NLP

Our vocabulary system uses **three layers** of intelligence:

### 1. WordNet Integration (Server)

[WordNet](https://wordnet.princeton.edu/) is a lexical database with 155,000+ English words organized by meaning.

```
"programming" →
  Synonyms: coding, software development, software engineering
  Hypernyms: computer science, technology
  Hyponyms: web programming, systems programming
```

### 2. Semantic Embeddings (Browser + Server)

Each vocabulary term has a pre-computed 384-dimensional embedding vector. When classifying text, we:

1. Generate an embedding for the input text
2. Calculate cosine similarity against all vocabulary embeddings
3. Return top matches by semantic similarity

```
Input: "Building React components with TypeScript"

Matches:
  react (skill)       → 0.89 similarity
  typescript (skill)  → 0.87 similarity
  frontend (subject)  → 0.72 similarity
```

### 3. Taxonomy Utilities (Browser + Server)

For fuzzy matching without embeddings:

| Technique | Purpose | Example |
|-----------|---------|---------|
| **Soundex** | Phonetic matching | "colour" matches "color" |
| **Metaphone** | Advanced phonetics | "programming" matches "programing" |
| **Levenshtein** | Typo tolerance | "javascrpt" matches "javascript" |
| **Acronym Expansion** | Full form lookup | "AI" → "artificial intelligence" |

---

## Environment-Aware Engines

The system automatically selects the right engine based on runtime:

```
┌─────────────────────────────────────────────────────────────┐
│                    VocabularyService                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────┐   ┌───────────────────────────┐ │
│  │  ServerVocabularyEngine│   │  BrowserVocabularyEngine  │ │
│  │  ─────────────────────│   │  ─────────────────────────│ │
│  │  • WordNet lookups    │   │  • Pre-computed embeddings│ │
│  │  • Real-time synonyms │   │  • Cosine similarity      │ │
│  │  • Hypernym chains    │   │  • Fuzzy matching         │ │
│  │  • Full NLP pipeline  │   │  • Taxonomy utilities     │ │
│  └───────────────────────┘   └───────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Server Engine**: Uses live WordNet for real-time synonym expansion
**Browser Engine**: Uses pre-computed embeddings for instant classification

---

## Classification Categories

The system classifies text into four categories:

### Subjects
High-level domains: technology, science, philosophy, ai, knowledge

### Topics
Specific areas: getting-started, architecture, troubleshooting, performance, security

### Skills
Technologies and tools: javascript, react, python, docker, postgresql

### Difficulty
Complexity level: beginner, intermediate, advanced

---

## Quick Example

```typescript
import { getVocabularyService } from '@/lib/indexer/vocabularyService'

const service = getVocabularyService()
await service.initialize()

const result = await service.classify(`
  Building a scalable REST API with Node.js and PostgreSQL.
  Implementing caching with Redis for improved performance.
`)

// Result:
{
  subjects: [
    { term: 'technology', score: 0.92 },
    { term: 'software', score: 0.85 }
  ],
  topics: [
    { term: 'performance', score: 0.88 },
    { term: 'architecture', score: 0.76 }
  ],
  skills: [
    { term: 'postgresql', score: 0.94 },
    { term: 'redis', score: 0.91 },
    { term: 'nodejs', score: 0.87 }
  ],
  difficulty: [
    { term: 'intermediate', score: 0.72 }
  ]
}
```

---

## Examples in This Loom

### [Classification Example](./classification-example.md)
See the vocabulary system in action with real text samples.

### [API Usage Guide](./api-usage.md)
Code examples for using the VocabularyService in your projects.

---

## Technical Details

| Aspect | Value |
|--------|-------|
| **Embedding Model** | MiniLM-L6-v2 (384 dimensions) |
| **Vocabulary Size** | 228 terms across 4 categories |
| **Synonym Expansions** | 435 WordNet-derived synonyms |
| **Pre-computed Data** | ~2.6MB JSON file |
| **Browser Classification** | <50ms typical |
| **Server Classification** | <100ms with WordNet |

---

## Learn More

- [Vocabulary System Guide](/docs/VOCABULARY_SYSTEM_GUIDE.md) — Deep technical documentation
- [NLP Guide](/docs/NLP_GUIDE.md) — Overview of all NLP features
- [WordNet](https://wordnet.princeton.edu/) — The lexical database
- [MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) — The embedding model

---

> The vocabulary system works 100% offline. All WordNet data and embeddings are pre-computed at build time. No API calls, no data leaves your device.
