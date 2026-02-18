# NLP Guide

> Complete guide to the Natural Language Processing system in Quarry Codex.

## Table of Contents

- [Overview](#overview)
- [Client-Side NLP](#client-side-nlp)
- [Backend NLP](#backend-nlp)
- [Functions Reference](#functions-reference)
- [Entity Types](#entity-types)
- [Usage Examples](#usage-examples)

---

## Overview

Quarry Codex uses a hybrid NLP approach:

| Layer | Library | Purpose | When |
|-------|---------|---------|------|
| **Client** | compromise.js | Real-time analysis | While typing |
| **Backend** | Python NLP + ML | Deep analysis | After publish |
| **LLM** | OpenAI/Anthropic | Enhancement | On demand |

```
[Content] → [Client NLP] → [Auto-tags, summary]
     ↓
[Publish] → [Backend NLP] → [Deep indexing, search]
     ↓
[Generate] → [LLM] → [Flashcards, quizzes]
```

---

## Client-Side NLP

### Library: compromise.js

Fast, lightweight NLP in the browser:

```typescript
import { 
  extractEntities,
  extractKeywords,
  generateSummary,
  suggestTags,
  analyzeHierarchy,
} from '@/lib/nlp'
```

### Performance

| Operation | ~Time | Content Size |
|-----------|-------|--------------|
| Entities | 50ms | 1000 words |
| Keywords | 30ms | 1000 words |
| Summary | 20ms | 1000 words |
| Tags | 40ms | 1000 words |
| **Full Analysis** | **~150ms** | 1000 words |

---

## Functions Reference

### extractEntities(text)

Extract named entities from text:

```typescript
const entities = extractEntities(`
  React was created by Facebook. 
  Dan Abramov works on Redux in California.
`)

// Result:
{
  technologies: ['React', 'Redux'],
  concepts: ['state management'],
  people: ['Dan Abramov'],
  organizations: ['Facebook'],
  locations: ['California'],
}
```

### extractKeywords(text)

Extract top keywords by TF score:

```typescript
const keywords = extractKeywords(`
  React hooks provide state management in functional components.
  Hooks like useState and useEffect are fundamental.
`)

// Result:
[
  { word: 'hooks', score: 0.85 },
  { word: 'useState', score: 0.72 },
  { word: 'useEffect', score: 0.68 },
  { word: 'components', score: 0.55 },
]
```

### generateSummary(text, maxLength?)

Generate extractive summary:

```typescript
const summary = generateSummary(content, 200)
// Returns: First 200 chars of most important sentence(s)
```

### suggestTags(text)

Suggest tags based on content:

```typescript
const tags = suggestTags(content)
// Returns: ['react', 'typescript', 'hooks', 'state-management']
```

### analyzeHierarchy(text, context)

Analyze within OpenStrand hierarchy:

```typescript
const analysis = analyzeHierarchy(content, {
  fabric: 'tech',
  weave: 'react',
  loom: 'hooks',
  strand: 'useState',
})

// Enhanced analysis with hierarchy context
```

### classifyContent(text)

Classify content type:

```typescript
const classification = classifyContent(content)
// Returns: 'tutorial' | 'api-reference' | 'concept' | 'guide' | 'example'
```

---

## Entity Types

### Technologies

Frameworks, libraries, languages, tools:

```
React, Vue, Angular, TypeScript, Node.js, Python, 
PostgreSQL, MongoDB, Docker, Kubernetes, AWS, etc.
```

### Concepts

Abstract programming concepts:

```
API, algorithm, architecture, state management,
dependency injection, functional programming, etc.
```

### People

Named individuals:

```
Dan Abramov, Ryan Dahl, Guido van Rossum, etc.
```

### Organizations

Companies, open source projects:

```
Facebook, Google, Microsoft, Mozilla, Apache, etc.
```

### Locations

Geographic references:

```
Silicon Valley, California, New York, etc.
```

---

## Backend NLP

### Python Pipeline

After a strand is published, the backend runs:

1. **Tokenization** - Split into sentences/words
2. **POS Tagging** - Part-of-speech analysis
3. **NER** - Named entity recognition (spaCy)
4. **Embeddings** - Generate vector embeddings
5. **Indexing** - Update search index

### Embeddings

Using sentence-transformers for semantic search:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(chunks)
```

### Search Index

Embeddings stored in:
- FAISS index (vector similarity)
- BM25 index (lexical fallback)

---

## Usage Examples

### Real-Time Analysis in Editor

```typescript
import { useAutoSave } from '@/components/quarry/hooks/useAutoSave'

function Editor() {
  const { content, setContent, nlpStatus, metadata } = useAutoSave({
    draftId: 'my-strand',
    enableNLP: true,
  })

  return (
    <div>
      <textarea 
        value={content} 
        onChange={e => setContent(e.target.value)} 
      />
      
      {nlpStatus === 'analyzing' && <Spinner />}
      
      {metadata && (
        <div>
          <h3>Extracted Tags</h3>
          {metadata.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}
          
          <h3>Entities</h3>
          {metadata.entities.technologies.map(t => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      )}
    </div>
  )
}
```

### Question Generation

```typescript
import { extractKeywords, extractEntities } from '@/lib/nlp'

function generateQuestions(content: string) {
  const keywords = extractKeywords(content)
  const entities = extractEntities(content)
  
  const questions = []
  
  // Definition questions from keywords
  keywords.slice(0, 3).forEach(kw => {
    questions.push({
      type: 'definition',
      question: `What is ${kw.word}?`,
      source: 'keyword',
      confidence: kw.score,
    })
  })
  
  // Application questions from technologies
  entities.technologies.forEach(tech => {
    questions.push({
      type: 'application',
      question: `How would you use ${tech} to solve this problem?`,
      source: 'entity',
      confidence: 0.8,
    })
  })
  
  return questions
}
```

### Tag Suggestion UI

```typescript
import { suggestTags, extractKeywords } from '@/lib/nlp'

function TagSuggester({ content, onAddTag }) {
  const [suggestions, setSuggestions] = useState([])
  
  useEffect(() => {
    if (content.length < 50) return
    
    const tags = suggestTags(content)
    const keywords = extractKeywords(content).slice(0, 3)
    
    setSuggestions([
      ...tags.map(t => ({ tag: t, source: 'nlp' })),
      ...keywords.map(k => ({ tag: k.word, source: 'keyword', score: k.score })),
    ])
  }, [content])
  
  return (
    <div>
      <h4>Suggested Tags</h4>
      {suggestions.map(s => (
        <button key={s.tag} onClick={() => onAddTag(s.tag)}>
          {s.tag} {s.score && `(${Math.round(s.score * 100)}%)`}
        </button>
      ))}
    </div>
  )
}
```

---

## Configuration

### Client-Side Options

```typescript
// lib/nlp/index.ts

export const NLP_CONFIG = {
  // Minimum content length for analysis
  MIN_CONTENT_LENGTH: 50,
  
  // Maximum keywords to extract
  MAX_KEYWORDS: 20,
  
  // Minimum keyword score threshold
  MIN_KEYWORD_SCORE: 0.3,
  
  // Summary max length (characters)
  SUMMARY_MAX_LENGTH: 200,
  
  // Max tags to suggest
  MAX_SUGGESTED_TAGS: 10,
}
```

### Debounce Settings

```typescript
// hooks/useAutoSave.ts

const DEBOUNCE_MS = 1500      // Auto-save debounce
const NLP_DEBOUNCE_MS = 2000  // NLP analysis debounce
```

---

## Performance Tips

1. **Debounce Analysis** - Don't run on every keystroke
2. **Web Workers** - Offload heavy analysis (optional)
3. **Caching** - Cache results for unchanged content
4. **Lazy Loading** - Load compromise.js on demand

```typescript
// Lazy load NLP library
const nlp = await import('compromise')
```

---

## Taxonomy Deduplication

The NLP system includes advanced similarity detection for taxonomy management. This prevents duplicate terms across subjects, topics, and tags.

### Similarity Detection Pipeline

When a new term is added, it's checked against existing terms using multiple techniques:

| Technique | Score | Example |
|-----------|-------|---------|
| Exact match | 1.0 | `react` = `react` |
| Acronym expansion | 0.95 | `AI` ↔ `artificial-intelligence` |
| Plural normalization | 0.95 | `frameworks` ↔ `framework` |
| Compound decomposition | 0.85 | `MachineLearning` ↔ `machine-learning` |
| Levenshtein distance | 0.9 | `typscript` ↔ `typescript` |
| Phonetic (Soundex) | 0.7 | `colour` ↔ `color` |
| N-gram Jaccard | 0.75 | `javascript` ↔ `java-script` |
| Substring match | 0.6-0.8 | `react` in `reactjs` |

### Usage

```typescript
import {
  calculateSimilarityScore,
  findSimilarTermsWithScores,
  areSimilar,
} from '@/lib/taxonomy'

// Check if two terms are similar
const result = calculateSimilarityScore('AI', 'artificial-intelligence', config)
// { score: 0.95, method: 'acronym' }

// Find all similar terms in a list
const matches = findSimilarTermsWithScores('react', existingTerms, config)
// [{ term: 'reactjs', score: 0.8, method: 'substring' }]
```

### Acronym Dictionary

150+ tech acronyms are supported:

```typescript
import { expandAcronym, contractToAcronym } from '@/lib/taxonomy'

expandAcronym('ai')    // ['artificial-intelligence']
expandAcronym('ml')    // ['machine-learning']
expandAcronym('nlp')   // ['natural-language-processing']

contractToAcronym('artificial-intelligence')  // 'ai'
```

### Configuration

```typescript
const config = {
  enablePhoneticMatching: true,       // Soundex/Metaphone
  enableNgramMatching: true,          // Character n-grams
  ngramThreshold: 0.6,                // Min Jaccard score
  enableAcronymExpansion: true,       // Dictionary lookup
  enablePluralNormalization: true,    // Singular/plural
  enableCompoundDecomposition: true,  // CamelCase splitting
  similarityScoreThreshold: 0.7,      // Overall threshold
}
```

For complete taxonomy documentation, see [Taxonomy Guide](./TAXONOMY_GUIDE.md).

---

## Move Processor

When files are reorganized via drag-and-drop in the tree, the NLP system handles re-analysis to maintain accurate indexing and path references.

### What Happens on Move

1. **Path references updated** - Internal links in content are updated to reflect new paths
2. **Block paths updated** - Block-level indexing paths are corrected
3. **Re-embedding queued** - Changed strands are marked for background embedding update

### API

```typescript
import {
  processMoveOperations,
  queueMoveProcessing,
  detectPathReferences,
} from '@/lib/nlp/moveProcessor'

// Immediate processing
const result = await processMoveOperations({
  operations: moveOperations,
  updateEmbeddings: true,  // Optional: trigger re-embedding
  onProgress: (stage, done, total) => {
    console.log(`${stage}: ${done}/${total}`)
  },
})

console.log(result.strandsProcessed)  // Number of strands updated
console.log(result.blocksUpdated)     // Number of blocks with path fixes

// Queue for background processing (for large moves)
const { queued, jobId } = await queueMoveProcessing(operations)

// Detect path references before moving
const refs = detectPathReferences(strandContent, operations)
// [{ oldPath: 'a/b.md', newPath: 'c/b.md', count: 2 }]
```

### Integration with Tree Persistence

The move processor is automatically triggered after successful publish:

```typescript
// In useTreePersistence hook
const handlePublish = async () => {
  await onPublish(operations)

  // Automatically queue NLP re-analysis
  await queueMoveProcessing(operations)
}
```

---

## Ink Smoothing & Stabilization

The OCR system includes advanced ink processing for smoother handwriting input and improved OCR accuracy.

### Catmull-Rom Spline Smoothing

Raw stroke points are smoothed using Catmull-Rom spline interpolation:

```typescript
import { processStroke, processStrokes, InkProcessorConfig } from '@/lib/ocr'

const config: InkProcessorConfig = {
  enableSmoothing: true,       // Enable spline smoothing
  tension: 0.5,                // Curve tension (0 = sharp, 1 = smooth)
  interpolationSteps: 4,       // Points between originals
  enablePressureNormalization: true,
  pressureRange: [0.3, 1.0],   // Target pressure range
  jitterThreshold: 2,          // Min distance to keep
}

const smoothedStroke = processStroke(rawStroke, config)
```

### Pipeline Stages

| Stage | Purpose | Default |
|-------|---------|---------|
| **Jitter Removal** | Remove points too close together | 2px threshold |
| **Simplification** | Douglas-Peucker reduction (optional) | Disabled |
| **Smoothing** | Catmull-Rom spline interpolation | 4 steps, 0.5 tension |
| **Pressure Normalization** | Consistent line weights | [0.3, 1.0] range |

### Integration with Canvas Export

The smoothed export function applies processing before OCR:

```typescript
import { exportSmoothedCanvasStrokes } from '@/components/quarry/ui/canvas/shapes/HandwritingShape/canvasToImage'

const smoothedBlob = await exportSmoothedCanvasStrokes(editor, shapeId, {
  inkConfig: {
    enableSmoothing: true,
    tension: 0.5,
  },
  backgroundColor: '#ffffff',
  strokeColor: '#000000',
})
```

---

## Word-Level Confidence Indicators

The OCR system now supports word-level confidence display with color-coded underlines:

```typescript
import { ConfidenceText, WordConfidence } from '@/components/quarry/ui/canvas/shapes/HandwritingShape/ConfidenceBadge'

const words: WordConfidence[] = [
  { word: 'Hello', confidence: 0.95, startIndex: 0, endIndex: 5 },
  { word: 'wrld', confidence: 0.45, alternatives: ['world', 'wild'], startIndex: 6, endIndex: 10 },
]

<ConfidenceText
  text="Hello wrld"
  wordConfidences={words}
  onWordClick={(word) => showAlternatives(word)}
/>
```

### Confidence Levels

| Level | Range | Color | Behavior |
|-------|-------|-------|----------|
| **High** | ≥85% | Green | Standard display |
| **Medium** | 60-84% | Yellow | Highlight for review |
| **Low** | <60% | Red | Clickable for alternatives |

---

## Batch Handwriting Import

Import multiple handwritten images at once with queue-based OCR processing:

```typescript
import HandwritingImportModal from '@/components/quarry/ui/HandwritingImportModal'

<HandwritingImportModal
  isOpen={isOpen}
  onClose={() => setOpen(false)}
  onImport={(results) => {
    // results: Array<{ text, confidence, sourceFile }>
    insertTextBlocks(results)
  }}
  insertMode="blocks" // 'blocks' | 'single' | 'shapes'
/>
```

### Features

- Drag-and-drop multiple images (PNG, JPG, HEIC)
- Queue-based processing with progress indicators
- Confidence display per image
- Bulk import of completed results

---

## Handwriting Templates

Pre-configured canvas templates for structured handwriting:

```typescript
import { TemplateCreator, createTemplateBlob, TemplateConfig } from '@/components/quarry/ui/canvas/templates'

// Create a template programmatically
const config: TemplateConfig = {
  type: 'cornell',
  width: 612,
  height: 792,
  cueColumn: 150,
  summaryHeight: 120,
  lineSpacing: 28,
}

const blob = createTemplateBlob(config)
```

### Available Templates

| Template | Description | Features |
|----------|-------------|----------|
| **Lined** | Notebook-style | Horizontal lines, red margin |
| **Grid** | Graph paper | Square grid |
| **Blank** | Clean canvas | Corner margin marks |
| **Cornell** | Note-taking | Cue column, notes area, summary |

### Page Sizes

- Letter (612x792)
- A4 (595x842)
- A5 (420x595)
- Square (600x600)
- Wide (800x500)

---

## Keyboard Shortcuts

Quick access to drawing mode:

| Shortcut | Action |
|----------|--------|
| `d` | Toggle drawing mode (when not in input) |
| `Cmd/Ctrl+D` | Quick toggle drawing mode (works anywhere) |

---

## Oracle Task Parser

The Planner's Oracle assistant uses Compromise.js for natural language task parsing.

### Intent Classification

```typescript
import { parseNaturalLanguage } from '@/lib/planner/oracle/nlpParser'

const intent = await parseNaturalLanguage("Add review report for tomorrow at 2pm high priority")

// Result:
{
  action: 'create',
  confidence: 0.85,
  title: 'review report',
  dueDate: '2024-01-16',      // Resolved from "tomorrow"
  dueTime: '14:00',           // Resolved from "2pm"
  priority: 'high',
  rawEntities: {
    dates: ['tomorrow'],
    times: ['2pm'],
    nouns: ['report'],
    ...
  }
}
```

### Parsing Capabilities

| Feature | Examples | Extraction |
|---------|----------|------------|
| **Dates** | "tomorrow", "next Monday", "Jan 15" | ISO date string |
| **Times** | "3pm", "15:00", "morning", "noon" | 24-hour format |
| **Duration** | "30 minutes", "2 hours" | Minutes integer |
| **Priority** | "urgent", "high priority", "!" | Priority enum |
| **Tags** | "#work", "#personal" | Array of tags |
| **Subtasks** | "steps: a, b, c" | Array of titles |
| **Recurrence** | "every day", "weekly" | Recurrence object |

### Named Time Mappings

```typescript
const TIME_NAMES = {
  morning: '09:00',
  noon: '12:00',
  afternoon: '14:00',
  evening: '18:00',
  'end of day': '17:00',
  eod: '17:00',
  tonight: '20:00',
}
```

### LLM Fallback

When API keys are configured, Oracle can use Claude or OpenAI for enhanced understanding:

```typescript
import { parseWithLLM, getOracleConfig } from '@/lib/planner/oracle/llmParser'

const config = getOracleConfig()
if (config.enabled) {
  const intent = await parseWithLLM("Meeting with John about Q4 planning next Tuesday")
  // Returns: ParsedTaskIntent with higher confidence and better extraction
}
```

See [Planner Architecture](./PLANNER_ARCHITECTURE.md#oracle-nlpllm-architecture) for full details.

---

---

## Dynamic Vocabulary System

The vocabulary system provides intelligent text classification using real NLP instead of hardcoded keyword lists. It works seamlessly in both browser (Codex) and server environments.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      VocabularyService                          │
│  (Unified API with environment-aware engine selection)          │
├──────────────────────────────┬──────────────────────────────────┤
│   ServerVocabularyEngine     │    BrowserVocabularyEngine       │
│   • WordNet synonyms         │    • Pre-computed embeddings     │
│   • Live embeddings          │    • Pre-computed synonyms       │
│   • Full taxonomy utils      │    • Compromise.js NER           │
└──────────────────────────────┴──────────────────────────────────┘
                               │
                               ▼
        vocabulary-embeddings.json (228 terms, 384-dim embeddings)
```

### Usage

```typescript
import { getVocabularyService } from '@/lib/indexer/vocabularyService'

const service = getVocabularyService()
await service.initialize()

// Classify text into subjects, topics, skills, difficulty
const result = await service.classify(`
  Building a React app with TypeScript and Next.js
`)
// { subjects: ['technology'], skills: ['react', 'typescript', 'nextjs'], ... }

// Expand terms with synonyms
const expanded = await service.expandTerm('machine-learning')
// ['machine-learning', 'ml', 'statistical learning', 'deep learning']

// Find semantically similar vocabulary terms
const similar = await service.findSimilarTerms('neural networks', 'subject')
// [{ term: 'deep-learning', score: 0.91 }, { term: 'ai', score: 0.87 }]
```

### Backward-Compatible API

```typescript
import { getVocabulary } from '@/lib/indexer/vocabulary'

const vocab = getVocabulary()

// Sync (basic mode - fast, works everywhere)
const result = vocab.classify(text)

// Async (full NLP capabilities)
const enhanced = await vocab.classifyAsync(text)
const synonyms = await vocab.expandTerm('api')
```

### Capabilities

| Feature | Browser | Server |
|---------|---------|--------|
| Synonym expansion | Pre-computed | Live WordNet |
| Hypernym hierarchy | Pre-computed | Live WordNet |
| Embedding similarity | Yes (384-dim) | Yes (384-dim) |
| Phonetic matching | Soundex, Metaphone | Soundex, Metaphone |
| Acronym expansion | 150+ terms | 150+ terms |
| Fuzzy matching | Levenshtein | Levenshtein |

### Build-Time Generation

Pre-compute embeddings at build time:

```bash
# Generate vocabulary embeddings
pnpm vocabulary:embeddings
```

This creates `public/data/vocabulary-embeddings.json` with:
- 228 vocabulary terms
- 384-dimensional embeddings per term
- 435+ WordNet synonym expansions
- Hypernym hierarchies

For complete documentation, see [Vocabulary System Guide](./VOCABULARY_SYSTEM_GUIDE.md).

---

## Related Documentation

- [Vocabulary System Guide](./VOCABULARY_SYSTEM_GUIDE.md) - Deep technical documentation
- [Semantic Search](./SEMANTIC_SEARCH_ARCHITECTURE.md) - Search implementation
- [Learning System](./LEARNING_SYSTEM_GUIDE.md) - Flashcards & quizzes
- [Strand Creation](./STRAND_CREATION_GUIDE.md) - Content creation
- [Taxonomy Guide](./TAXONOMY_GUIDE.md) - Taxonomy hierarchy and deduplication
- [Publishing Guide](./PUBLISHING_GUIDE.md) - Tree reorganization and publishing
- [Planner Guide](./PLANNER_GUIDE.md) - Oracle task management




















