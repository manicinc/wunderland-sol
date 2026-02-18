# Building Quarry Codex: A Privacy-First Personal Knowledge Management System

*The complete technical journey of building a local-first PKM app with AI-powered semantic search, auto-tagging, bidirectional links, and offline vault sync*

---

## Executive Summary

Over 6 months, I built **Quarry Codex** - a personal knowledge management system that:
- Runs 100% client-side (no server required)
- Works fully offline after initial load
- Features AI-powered semantic search with 4-tier graceful degradation
- Auto-tags documents using NLP with conservative confidence thresholds
- Supports Zettelkasten-style bidirectional linking with 15+ relationship types
- Syncs seamlessly between browser, Electron desktop, and mobile
- Never sends user data to external servers (privacy-first)

This post documents the entire journey - the architecture decisions, the challenges faced, and the solutions that emerged.

---

# Part 1: Data Architecture - The Fabric/Weave/Loom/Strand Hierarchy

## The Problem

Traditional note-taking apps either use flat file lists or rigid folder structures. I wanted something more flexible - a hierarchical system inspired by Zettelkasten and Tana that could support atomic notes with rich relationships.

## The Solution: Four-Level Hierarchy

```
FABRIC (Knowledge Repository)
├── WEAVE (Subject Universe - e.g., "AI", "Physics")
│   └── LOOM (Subdirectory/Unit - supports infinite nesting)
│       └── STRAND (Individual atomic note)
```

### Why These Names?

The textile metaphor reflects how knowledge is woven together:
- **Fabric**: The complete tapestry of knowledge
- **Weave**: A cohesive subject area
- **Loom**: The structure that organizes strands
- **Strand**: Individual threads of knowledge

### Schema Evolution

**Phase 1: Simple SQLite Tables**
```sql
CREATE TABLE strands (
  id TEXT PRIMARY KEY,
  path TEXT UNIQUE,
  title TEXT,
  content TEXT,
  created_at TEXT
);
```

**Phase 2: Full Hierarchy with Nesting**
```sql
CREATE TABLE looms (
  id TEXT PRIMARY KEY,
  weave_id TEXT NOT NULL,
  parent_loom_id TEXT,  -- Self-referencing for infinite nesting
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT UNIQUE,
  depth INTEGER DEFAULT 0,
  FOREIGN KEY (parent_loom_id) REFERENCES looms(id)
);
```

**Phase 3: Rich Metadata**
```sql
CREATE TABLE strands (
  -- Core fields
  id TEXT PRIMARY KEY,
  path TEXT UNIQUE,
  title TEXT,
  content TEXT,
  content_hash TEXT,  -- For change detection

  -- Taxonomy
  subjects TEXT,      -- JSON array
  topics TEXT,        -- JSON array
  tags TEXT,          -- JSON array

  -- Quality
  word_count INTEGER,
  difficulty TEXT,    -- beginner/intermediate/advanced
  status TEXT,        -- draft/published/archived

  -- Sync
  github_sha TEXT,
  last_indexed_at TEXT
);
```

### Challenge: FTS5 Incompatibility

**Problem**: I wanted full-text search using SQLite's FTS5, but sql.js (the browser WASM version) doesn't support FTS5.

**Solution**:
1. Use `LIKE` queries with proper indexes for basic search
2. Build semantic search using embeddings for smarter queries
3. Reserve FTS5 for Electron/native builds only

```typescript
// SCHEMA_VERSION = 2 (removed FTS5 due to sql.js limitations)
const SCHEMA_VERSION = 2;
```

---

# Part 2: Offline-First Storage Architecture

## The Philosophy

User data should never require a server. The app must work fully offline, with optional sync to external services.

## Multi-Backend Storage

```typescript
export type DatabaseConnection =
  | LocalConnection      // SQLite/IndexedDB vault
  | GitHubConnection     // GitHub repository
  | PostgresConnection;  // Remote cloud database
```

### The Hybrid Vault Model

```
User Vault Directory (markdown files)
    ↓
SQLiteContentStore.syncFromVault()
    ↓
Parse frontmatter & content hash
    ↓
SQLite Database (metadata, indexes)
    ↓
Semantic indexing (embeddings)
```

**Key insight**: Store files in a user-controlled directory that survives app uninstall. Use SQLite only for indexes and metadata.

## Challenge: Race Conditions in Vault Sync

**Commit**: `970d1e44` - "resolve race condition in SQLiteStore initialization"

**Problem**: Multiple components could request the content store simultaneously, causing duplicate initializations and corrupted state.

**Solution**: Promise-based singleton pattern

```typescript
let contentStorePromise: Promise<SQLiteContentStore> | null = null;

async function getContentStore(): Promise<SQLiteContentStore> {
  if (!contentStorePromise) {
    contentStorePromise = (async () => {
      const store = new SQLiteContentStore();
      await store.initialize();  // Waits for auto-sync
      return store;
    })();
  }
  return contentStorePromise;
}
```

## Challenge: Empty Tree After Vault Sync

**Commit**: `0b74155a` - "fix vault sync for root-level files and race conditions"

**Problem**: In Electron mode, `getKnowledgeTree()` returned empty even though vault files existed.

**Root Cause**: Tree query ran before sync completed.

**Solution**:
1. Mark store as initialized AFTER sync completes
2. Add retry logic with exponential backoff
3. Auto-rebuild tree structure when strands have NULL `loom_id`

```typescript
// Retry 3 times with delays if tree is empty in Electron mode
let retries = 0;
while (tree.length === 0 && isElectronMode && retries < 3) {
  await new Promise(resolve => setTimeout(resolve, 1500));
  tree = await store.getKnowledgeTree();
  retries++;
}
```

## Challenge: Root-Level Files

**Problem**: Files directly in `weaves/` (like `AGENTS.md`) couldn't be categorized.

**Solution**: Use 'root' as weave name for single-part paths

```typescript
let weaveName: string;
if (parts.length === 1) {
  weaveName = 'root';  // Handle root-level files
  slug = parts[0];
} else {
  weaveName = parts[0];
  slug = parts[parts.length - 1];
}
```

---

# Part 3: Bidirectional Links & Relationships

## Zettelkasten-Inspired Linking

I implemented 15+ semantic relationship types:

```typescript
export type StrandRelationType =
  | 'extends'       // Builds on a concept
  | 'contrasts'     // Opposing viewpoint
  | 'supports'      // Provides evidence
  | 'example-of'    // Concrete example
  | 'implements'    // Implements pattern/theory
  | 'questions'     // Challenges or questions
  | 'refines'       // Makes more precise
  | 'applies'       // Applies to domain
  | 'summarizes'    // Abstracts
  | 'prerequisite'  // Required background
  | 'related'       // Thematically related
  | 'follows'       // Logical sequence
  | 'references'    // Cites
  | 'contradicts'   // Directly contradicts
  | 'updates'       // Supersedes
  | 'custom';       // User-defined
```

### Schema

```sql
CREATE TABLE strand_relationships (
  source_strand_path TEXT NOT NULL,
  target_strand_path TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  context TEXT,              -- Why they're related
  bidirectional INTEGER DEFAULT 0,
  strength REAL DEFAULT 1.0, -- 0-1 weight
  auto_detected INTEGER DEFAULT 0,

  UNIQUE(source_strand_path, target_strand_path, relation_type)
);

CREATE INDEX idx_strand_rels_source ON strand_relationships(source_strand_path);
CREATE INDEX idx_strand_rels_target ON strand_relationships(target_strand_path);
```

### Backlinks with Context Snippets

```sql
CREATE TABLE block_backlinks (
  block_id TEXT NOT NULL,
  referencing_strand_path TEXT NOT NULL,
  referencing_block_id TEXT,
  context_snippet TEXT,  -- 200-char preview
  created_at TEXT NOT NULL
);
```

### Cascade Invalidation

**Problem**: When a strand is updated, backlink context snippets become stale.

**Solution**: Queue-based refresh with rate limiting

```typescript
// lib/jobs/processors/refreshBacklinks.ts
const MAX_BACKLINKS_PER_JOB = 50;
const MAX_CONTEXT_LENGTH = 200;
const MAX_CASCADE_DEPTH = 2;  // Prevent infinite loops

export async function refreshBacklinksProcessor(job) {
  const referencingStrands = await findStrandsReferencing(job.strandPath);

  for (const strand of referencingStrands.slice(0, MAX_BACKLINKS_PER_JOB)) {
    const snippet = extractContextSnippet(strand.content, job.strandPath);
    await updateBacklinkContext(strand.path, job.strandPath, snippet);
  }
}
```

---

# Part 4: Semantic Search Evolution

## Phase 1: Fuse.js Fuzzy Search (November 14, 2025)

**Commit**: `bd209de7`

Basic fuzzy matching - good for typos, bad for semantics.

```javascript
const fuse = new Fuse(documents, {
  keys: ['title', 'content', 'tags'],
  threshold: 0.3
});
```

**Limitation**: "authentication" wouldn't find "login" or "OAuth".

## Phase 2: Transformers.js (November 16, 2025)

**Commit**: `c2e56f1d`

Added client-side neural embeddings:

```javascript
import { pipeline } from '@xenova/transformers';
const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
```

**Challenge**: Webpack tried to bundle server-only dependencies.

**Solution**: Configure externals:

```javascript
webpack: (config) => {
  config.externals = [...config.externals, 'pg', 'better-sqlite3', 'onnxruntime-node'];
  return config;
}
```

## Phase 3: ONNX Runtime Web (November 17, 2025)

**Commit**: `f75cbc95`

Built `HybridEmbeddingEngine` with 4-tier fallback:

```
1. ONNX Runtime Web + WebGPU    ← GPU-accelerated (fastest)
2. ONNX Runtime Web + WASM-SIMD ← CPU with SIMD
3. Transformers.js (WASM)       ← Pure WebAssembly
4. Lexical Search Only          ← BM25/TF-IDF fallback
```

**Challenge**: Static imports caused Rust panics in SWC.

**Solution**: Dynamic imports:

```typescript
// BAD - crashes SWC
import * as ort from 'onnxruntime-web';

// GOOD - runtime import
const ort = await import('onnxruntime-web');
```

## Phase 4: CDN Fallbacks (November 29, 2025)

**Commit**: `3891d963`

**Problem**: Bundled imports failed in static exports.

**Solution**: Multi-strategy import using `new Function()` to bypass webpack:

```typescript
// Webpack can't statically analyze this
const dynamicImport = new Function('specifier', 'return import(specifier)');
const module = await dynamicImport('@huggingface/transformers');
```

## Phase 5: Pre-computed Embeddings (November 26, 2025)

**Commit**: `673e03d8`

**Problem**: Generating embeddings on page load took 8+ seconds.

**Solution**: Pre-compute at build time:

```javascript
// scripts/generate-embeddings.js
for (const file of files) {
  const embedding = await generateEmbedding(content);
  embeddings.push({ id: file.path, embedding, ... });
}
fs.writeFileSync('public/codex-embeddings.json', JSON.stringify(output));
```

Output: ~250KB for 24 documents (60KB gzipped).

## Phase 6: Dynamic Client-Side Indexing (January 3, 2026)

**Commit**: `9d1aea70`

**Problem**: Pre-computed embeddings are static. New strands don't appear in search.

**Solution**: Hybrid approach with IndexedDB storage:

```typescript
// lib/search/embeddingStore.ts
interface StoredEmbedding {
  id: string;
  embedding: number[];
  contentHash: string;  // For change detection
  isLocal: true;
}

// Only regenerate if content changed
const needsRegen = await needsRegeneration(path, hashContent(content));
if (!needsRegen) return;  // Skip - already indexed
```

## Phase 7: WordNet Integration (December 24, 2025)

**Commit**: `9652e8f9`

Added linguistic understanding:

```typescript
// "car" → finds "automobile", "vehicle"
export async function getSynonyms(word: string): Promise<string[]>

// "dog" → "canine" → "mammal" → "animal"
export async function getHypernyms(word: string): Promise<string[]>
```

---

# Part 5: NLP and Auto-Tagging System

## Design Philosophy

**Conservative over aggressive**: Better to miss a tag than hallucinate one.

```typescript
DEFAULT_AUTO_TAG_CONFIG: {
  preferExistingTags: true,
  maxNewTagsPerDocument: 10,
  confidenceThreshold: 0.6,
  useLLM: false,  // NLP-only by default (offline)
}
```

## Tag Worthiness Validation

```typescript
function isTagWorthy(term: string): boolean {
  // Minimum 2 characters
  if (term.length < 2) return false;

  // Detect code artifacts (variables, keywords)
  if (isCodeArtifact(term)) return false;

  // Maximum 50 characters, 4 words
  if (term.length > 50 || term.split(' ').length > 4) return false;

  // Filter unworthy patterns
  const unworthyPatterns = ['the-', 'a-', 'my-', '-thing', '-stuff'];
  if (unworthyPatterns.some(p => term.includes(p))) return false;

  return true;
}
```

## Block-Level Tagging with Worthiness Signals

Not every paragraph deserves tags. I calculate worthiness using three signals:

```typescript
interface WorthinessSignals {
  topicShift: number;     // 0-1, how different from document theme
  entityDensity: number;  // 0-1, concentration of meaningful entities
  semanticNovelty: number;// 0-1, unique phrasing vs surrounding blocks
}

const worthyThreshold = 0.5;
const score = (topicShift * 0.4) + (entityDensity * 0.3) + (semanticNovelty * 0.3);
```

## Challenge: Page Freeze on Auto-NLP

**Commit**: `0425fd5c` - "fix(new): prevent page freeze by disabling auto-NLP analysis"

**Problem**: Auto-analysis ran synchronous NLP on every keystroke, freezing the UI.

**Solution**: Switch to user-triggered analysis:

```typescript
// BEFORE: Auto-analyze on every change (BAD)
useEffect(() => {
  analyzeContent(content);  // Blocks main thread
}, [content]);

// AFTER: Manual trigger only
<Button onClick={() => analyzeContent(content)}>
  Analyze Content
</Button>
```

## Sentiment Analysis: Three-Tier Fallback

```
Tier 1: LLM (Claude/GPT)     ← Rich analysis, requires API
Tier 2: BERT/Embeddings      ← Local semantic analysis
Tier 3: Lexicon-Based        ← Always available, offline
```

### Lexicon-Based Sentiment

```typescript
const POSITIVE_WORDS = ['happy', 'grateful', 'excited', 'accomplished', ...];
const NEGATIVE_WORDS = ['sad', 'anxious', 'frustrated', 'overwhelmed', ...];
const INTENSIFIERS = { 'very': 1.5, 'really': 1.3, 'extremely': 1.8 };
const NEGATORS = ['not', 'never', 'no', 'without'];

// Algorithm:
// 1. Tokenize
// 2. Check positive/negative
// 3. Apply intensifiers
// 4. Handle negation (flip sentiment)
// 5. Calculate: (positive - negative) / max(total, 5)
// 6. Normalize to [-1, 1]
```

## Tag Bubbling: Block → Document

When a tag appears in 3+ blocks, it "bubbles up" to document level:

```typescript
DEFAULT_BUBBLING_CONFIG: {
  threshold: 3,          // Min blocks for bubbling
  maxBubbledTags: 5,     // Limit per document
  minConfidence: 0.5,
}
```

---

# Part 6: Reflection Mode & Insights

## The Reflect System

Daily journaling with mood/sleep tracking and automatic insight extraction.

### Challenge: Empty Reflections in Stats

**Commit**: `d7c42316` - "fix(reflect): empty reflections no longer count in streak/stats"

**Problem**: Opening a reflection created a record, but users who didn't write anything still got counted in their streak.

**Solution**: Filter by `word_count > 0`:

```sql
SELECT date FROM reflections
WHERE word_count > 0  -- Only count entries with actual content
ORDER BY date DESC
```

### Placeholder Filtering

Template text must be removed before sentiment analysis:

```typescript
const PLACEHOLDER_PATTERNS = [
  '## Morning Intentions',
  '## Evening Reflection',
  'What\'s on your mind?',
  'My top 3 priorities are...',
  // 76+ patterns total
];
```

---

# Part 7: Supertags - From Simple Tags to Extensible Schemas

## Evolution

**Phase 1: Flat Tags**
```typescript
tags: ['javascript', 'react', 'tutorial']
```

**Phase 2: Hierarchical Taxonomy**
```typescript
{
  subjects: ['Technology'],     // Broad categories
  topics: ['Web Development'],  // Specific topics
  tags: ['React', 'Hooks']      // Fine-grained
}
```

**Phase 3: Supertags with Custom Fields**
```typescript
// Like Roam attributes or Tana supertags
interface SupertagSchema {
  name: string;
  fields: [
    { name: 'status', type: 'select', options: ['draft', 'review', 'published'] },
    { name: 'due_date', type: 'date' },
    { name: 'assignee', type: 'mention' },
    { name: 'priority', type: 'number', min: 1, max: 5 }
  ];
}
```

---

# Part 8: Performance Optimization

## SHA-Based Diff Caching for NLP

**Problem**: Indexing 10,000 files took 50 minutes. Most files unchanged between commits.

**Solution**: Cache analysis results keyed by content SHA:

```typescript
// 1. Calculate SHA-256 of content
const sha = await crypto.subtle.digest('SHA-256', content);

// 2. Check cache
const cached = await db.get('SELECT * FROM cache WHERE sha = ?', sha);
if (cached) return JSON.parse(cached.analysis);

// 3. Process and cache
const analysis = await analyzeContent(content);
await db.run('INSERT INTO cache VALUES (?, ?, ?)', sha, Date.now(), JSON.stringify(analysis));
```

**Results**:
- First run (100 files): 30s
- Subsequent runs (95% cache hit): 2-5s

## Content Hashing for Embedding Updates

```typescript
export function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash) + content.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString(16);
}
```

---

# Part 9: Key Lessons Learned

## 1. Webpack Is Not Your Friend for Dynamic ML

Use `new Function()` to bypass static analysis, or configure extensive externals.

## 2. Graceful Degradation Is Essential

Plan for fallbacks from day one. Not all browsers support WebGPU.

## 3. Conservative NLP > Aggressive NLP

Users trust tags they see. Better to miss a tag than suggest wrong ones.

## 4. Race Conditions Hide in Async Initialization

Use promise-based singletons for shared resources.

## 5. Content Hashing Prevents Redundant Work

Don't regenerate embeddings/analysis for unchanged content.

## 6. User-Triggered > Auto-Triggered for Heavy Operations

Never block the main thread. Make expensive operations explicit.

## 7. Offline-First Requires Different Architecture

Can't rely on server validation. Client must be authoritative.

---

# Summary: The Full Tech Stack

| Layer | Technology |
|-------|------------|
| **Storage** | SQLite (sql.js/better-sqlite3), IndexedDB |
| **Hierarchy** | Fabric → Weave → Loom → Strand |
| **Search** | ONNX Runtime Web, Transformers.js, MiniLM-L6-v2 |
| **NLP** | Compromise.js, WordNet, custom lexicons |
| **Sync** | Dual sync (local + GitHub), content hashing |
| **Links** | 15+ relationship types, backlink cascade |
| **Embeddings** | 384-dim vectors, IndexedDB cache |
| **UI** | Next.js, React, Framer Motion |
| **Desktop** | Electron with native SQLite |

---

# Code References

- `lib/codexDatabase.ts` - Schema definitions (40+ tables)
- `lib/storage/localCodex.ts` - Local strand storage
- `lib/content/sqliteStore.ts` - Vault sync engine
- `lib/search/embeddingEngine.ts` - Hybrid ML backend
- `lib/search/semanticSearch.ts` - Search singleton
- `lib/nlp/autoTagging.ts` - Conservative auto-tagger
- `lib/nlp/blockWorthiness.ts` - Worthiness signals
- `lib/reflect/reflectionInsights.ts` - 3-tier sentiment
- `lib/jobs/processors/refreshBacklinks.ts` - Cascade invalidation

---

*Built over 6 months, solving real problems one commit at a time. Development assisted by Claude Code.*
