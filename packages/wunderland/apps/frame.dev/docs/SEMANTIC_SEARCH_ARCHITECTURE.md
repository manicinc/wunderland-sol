# Semantic Search & Q&A Architecture

> **Deep dive into Quarry Codex's intelligent search system with graceful fallbacks**

---

## 🏠 100% Client-Side — No Server Required

**Quarry Codex Q&A runs entirely in your browser.** There is no backend server, no API calls, no cloud processing. Everything happens locally on your device.

### What This Means

| Aspect | How It Works |
|--------|--------------|
| **Hosting** | Static HTML/JS/CSS deployed on GitHub Pages |
| **AI Models** | Run in WebAssembly (ONNX Runtime or Transformers.js) |
| **Document Index** | Pre-computed embeddings built at deploy time |
| **Search Queries** | Processed locally, never sent anywhere |
| **Privacy** | Your questions never leave your device |
| **Offline** | Works without internet (after initial model download) |

### Why Client-Side AI?

1. **Privacy First** — Sensitive queries about code, architecture, or business logic never leave your machine
2. **Zero Latency** — No network round-trip; results in milliseconds
3. **Free Hosting** — Static files on GitHub Pages cost nothing
4. **Offline Capable** — Use the Codex on planes, trains, or anywhere without internet
5. **No Infrastructure** — No servers to maintain, scale, or pay for

### How Is This Possible?

Modern browsers support **WebAssembly** and **WebGPU**, enabling AI model execution:

```
┌─────────────────────────────────────────────────────────────┐
│                  YOUR BROWSER                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ GitHub Pages  │  │ WASM Runtime │  │  WebGPU/SIMD    │   │
│  │ (Static Files)│  │ (AI Models)  │  │  (GPU/CPU Accel)│   │
│  └───────────────┘  └──────────────┘  └─────────────────┘   │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Local Semantic Search                    │   │
│  │  • Pre-computed document embeddings (~2MB)            │   │
│  │  • Runtime query vectorization (~50-250ms)           │   │
│  │  • Cosine similarity matching (instant)              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Backend Hierarchy & Fallbacks](#backend-hierarchy--fallbacks)
4. [Components Deep Dive](#components-deep-dive)
5. [Pre-computed vs Runtime Embeddings](#pre-computed-vs-runtime-embeddings)
6. [Q&A Interface](#qa-interface)
7. [Performance Characteristics](#performance-characteristics)
8. [Future: Backend API Integration](#future-backend-api-integration)
9. [Configuration Reference](#configuration-reference)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Quarry Codex implements a **hybrid semantic search system** that operates entirely client-side with intelligent fallbacks. The system can understand natural language queries and find conceptually related content, not just keyword matches.

### Key Features

- **Zero-server semantic search** - Runs entirely in the browser
- **GitHub Pages deployment** - Static HTML/JS, no backend infrastructure
- **Graceful degradation** - Falls back through 4 levels of capability
- **Pre-computed embeddings** - Fast startup with cached document vectors
- **Runtime query embedding** - On-the-fly vectorization of user queries
- **Hybrid search** - Combines semantic + lexical for best results
- **Offline capable** - Works without internet after initial load
- **Privacy preserving** - Queries never leave the device

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER QUERY                                       │
│                    "How do I set up authentication?"                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    SEMANTIC SEARCH ENGINE                                │
│                   (lib/search/semanticSearch.ts)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Check backend availability                                          │
│  2. If backend available: embed query → cosine similarity search        │
│  3. If no backend: fall back to lexical search                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   EMBEDDING ENGINE  │  │  PRE-COMPUTED       │  │  LEXICAL SEARCH     │
│  (embeddingEngine)  │  │  EMBEDDINGS         │  │  (fallback)         │
│                     │  │  (codex-embeddings  │  │                     │
│  Runtime query      │  │   .json)            │  │  TF-IDF + BM25      │
│  vectorization      │  │                     │  │  keyword matching   │
└─────────────────────┘  │  Document vectors   │  └─────────────────────┘
         │               │  pre-computed at    │
         │               │  build time         │
         │               └─────────────────────┘
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    HYBRID EMBEDDING ENGINE                               │
│                   (lib/search/embeddingEngine.ts)                       │
├─────────────────────────────────────────────────────────────────────────┤
│  Tries backends in order until one succeeds:                            │
│                                                                          │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐ │
│  │  1. ORT     │──▶│  2. ORT     │──▶│  3. Trans-  │──▶│  4. NONE    │ │
│  │  WebGPU    │   │  WASM-SIMD  │   │  formers.js │   │  (lexical)  │ │
│  │  (fastest)  │   │  (fast)     │   │  (slower)   │   │  (fallback) │ │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Backend Hierarchy & Fallbacks

The embedding engine tries backends in order of performance, falling back gracefully:

### Level 1: ONNX Runtime Web + WebGPU (Fastest)

```
Performance: ~10ms per embedding
Requirements: Chrome 113+, WebGPU-capable GPU
Model: all-MiniLM-L6-v2 (22MB ONNX)
```

**How it works:**
- Uses GPU for parallel matrix operations
- 50-100x faster than CPU-only solutions
- Requires WebGPU browser API

**Detection:**
```typescript
const hasWebGPU = navigator.gpu && await navigator.gpu.requestAdapter()
```

### Level 2: ONNX Runtime Web + WASM-SIMD (Fast)

```
Performance: ~50ms per embedding
Requirements: Modern browser with SIMD support
Model: Same ONNX model, WASM execution
```

**How it works:**
- Uses WebAssembly SIMD instructions
- CPU-based but vectorized
- Works on most modern browsers

**Detection:**
```typescript
const hasSIMD = WebAssembly.validate(new Uint8Array([
  0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11
]))
```

### Level 3: Transformers.js (Slower but Reliable)

```
Performance: ~200-500ms per embedding
Requirements: Any modern browser
Model: Xenova/all-MiniLM-L6-v2 (quantized)
```

**How it works:**
- Pure JavaScript/WASM implementation
- Downloads model from Hugging Face Hub
- Falls back to CDN if bundled import fails

**Import strategies (in order):**
1. Bundled dynamic import: `import('@huggingface/transformers')`
2. CDN ESM import: `import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0/+esm')`
3. Script tag fallback (UMD)

### Level 4: Lexical Search Only (Fallback)

```
Performance: ~1ms (no embedding needed)
Requirements: None
Features: TF-IDF, keyword matching, fuzzy search
```

**How it works:**
- No neural embeddings
- Pure text matching algorithms
- Still useful for exact phrase searches

---

## Components Deep Dive

### 1. SemanticSearchEngine (`lib/search/semanticSearch.ts`)

The main orchestrator that coordinates search operations.

```typescript
class SemanticSearchEngine {
  // Core methods
  async initialize(): Promise<void>       // Set up backends
  async search(query: string): Promise<SearchResult[]>
  async embedQuery(text: string): Promise<Float32Array>
  
  // State
  isReady: boolean
  backendStatus: BackendStatus
  precomputedEmbeddings: Map<string, Float32Array>
}
```

**Initialization flow:**
```
1. Create HybridEmbeddingEngine
2. Call engine.initialize() → tries backends in order
3. Load pre-computed embeddings from /codex-embeddings.json
4. Set isReady = true (even if only lexical available)
```

### 2. HybridEmbeddingEngine (`lib/search/embeddingEngine.ts`)

Manages backend selection and embedding operations.

```typescript
class HybridEmbeddingEngine {
  // Configuration
  modelDim: 384  // MiniLM-L6-v2 output dimension
  maxSeqLength: 512
  
  // Backends (mutually exclusive)
  ortSession?: InferenceSession  // ONNX Runtime
  transformersPipeline?: Pipeline  // Transformers.js
  
  // Core methods
  async initialize(): Promise<BackendStatus>
  async embed(text: string): Promise<Float32Array>
  getStatus(): BackendStatus
}
```

### 3. Pre-computed Embeddings (`public/codex-embeddings.json`)

Generated at build time for fast startup.

```json
{
  "version": "1.0.0",
  "model": "all-MiniLM-L6-v2",
  "dimension": 384,
  "documents": {
    "weaves/frame/architecture.md": {
      "embedding": [0.023, -0.045, ...],  // 384 floats
      "title": "Frame Architecture",
      "summary": "Overview of the Frame system..."
    }
  }
}
```

**Generation script:** `scripts/generate-embeddings.js`
- Runs during `pnpm run build`
- Uses Node.js with @huggingface/transformers
- Outputs to `public/codex-embeddings.json`

### 4. ORT Client (`lib/search/ortClient.ts`)

Handles ONNX Runtime Web loading and configuration.

```typescript
// Dynamic import to prevent Next.js build issues
export async function loadOrt() {
  return await import('onnxruntime-web')
}

export function configureOrtEnv(ort: any, wasmPath: string) {
  ort.env.wasm.wasmPaths = wasmPath
  ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4
}
```

---

## Pre-computed vs Runtime Embeddings

### Pre-computed (Documents)

| Aspect | Details |
|--------|---------|
| **When** | Build time (CI/CD) |
| **What** | All markdown files in Codex |
| **Where** | `/codex-embeddings.json` |
| **Size** | ~500KB for 100 documents |
| **Update** | Every deployment |

### Runtime (User Queries)

| Aspect | Details |
|--------|---------|
| **When** | User types a search query |
| **What** | Query text only |
| **Where** | Browser memory |
| **Latency** | 10-500ms depending on backend |
| **Caching** | LRU cache for recent queries |

### Search Algorithm

```typescript
async function semanticSearch(query: string, topK: number = 10) {
  // 1. Embed the query
  const queryEmbedding = await engine.embed(query)
  
  // 2. Compute cosine similarity with all documents
  const scores = []
  for (const [path, doc] of precomputedEmbeddings) {
    const similarity = cosineSimilarity(queryEmbedding, doc.embedding)
    scores.push({ path, similarity, ...doc })
  }
  
  // 3. Sort by similarity and return top K
  return scores.sort((a, b) => b.similarity - a.similarity).slice(0, topK)
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
```

---

## Q&A Interface

The Q&A system (`components/quarry/ui/QAInterface.tsx`) provides an interactive question-answering experience.

### Features

1. **Semantic search** for finding relevant documents
2. **Context extraction** from top results
3. **Answer generation** (currently extractive, LLM optional)
4. **Source citations** with clickable links
5. **Suggested questions** based on document content

### Flow

```
User Question
     │
     ▼
┌─────────────────┐
│ Semantic Search │ → Find top 5 relevant documents
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Context Extract │ → Pull relevant paragraphs
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Answer Generate │ → Extractive summary or LLM
└─────────────────┘
     │
     ▼
Display Answer + Sources
```

---

## Performance Characteristics

### Latency by Backend

| Backend | Query Embedding | Search (100 docs) | Total |
|---------|-----------------|-------------------|-------|
| WebGPU | 10ms | 2ms | ~12ms |
| WASM-SIMD | 50ms | 2ms | ~52ms |
| Transformers.js | 200-500ms | 2ms | ~200-500ms |
| Lexical only | 0ms | 5ms | ~5ms |

### Memory Usage

| Component | Size |
|-----------|------|
| ORT WASM files | 11-25MB |
| Model weights | 22MB |
| Pre-computed embeddings | ~500KB |
| Runtime overhead | ~50MB |

### First Load vs Cached

| Scenario | Time |
|----------|------|
| First load (download model) | 5-30s |
| Cached (IndexedDB) | 100-500ms |
| Pre-computed only | <100ms |

---

## Future: Backend API Integration

### Current Limitations (Client-Only)

1. **Model size**: Browser must download 22MB+ model
2. **CPU/GPU usage**: Heavy computation in user's browser
3. **No GPU fallback**: WebGPU not available everywhere
4. **Cold start**: First query waits for model load

### Proposed Backend Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HYBRID ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────┘

     Client (Browser)                    Server (API)
┌─────────────────────────┐        ┌─────────────────────────┐
│                         │        │                         │
│  1. Try client-side     │        │  Embedding API          │
│     embedding           │        │  (/api/embed)           │
│                         │        │                         │
│  2. If slow/unavailable │───────▶│  - GPU acceleration     │
│     → call server API   │        │  - Fast response        │
│                         │◀───────│  - Cached models        │
│  3. Use response        │        │                         │
│     embedding           │        │  Search API             │
│                         │        │  (/api/search)          │
└─────────────────────────┘        │                         │
                                   │  - Pre-indexed corpus   │
                                   │  - Vector database      │
                                   │  - LLM integration      │
                                   └─────────────────────────┘
```

### Implementation Options

#### Option A: Same Monorepo (Recommended)

Add an API route in Next.js:

```typescript
// app/api/embed/route.ts
import { pipeline } from '@huggingface/transformers'

let embedder: any = null

export async function POST(request: Request) {
  const { text } = await request.json()
  
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  }
  
  const output = await embedder(text, { pooling: 'mean', normalize: true })
  
  return Response.json({ embedding: Array.from(output.data) })
}
```

**Pros:**
- Same codebase, easy deployment
- Shared types and utilities
- Vercel/Netlify serverless compatible

**Cons:**
- Cold starts on serverless
- Limited compute on free tiers

#### Option B: Separate Embedding Service

Deploy a dedicated embedding server:

```python
# embedding_server.py (FastAPI + sentence-transformers)
from fastapi import FastAPI
from sentence_transformers import SentenceTransformer

app = FastAPI()
model = SentenceTransformer('all-MiniLM-L6-v2')

@app.post("/embed")
async def embed(text: str):
    embedding = model.encode(text)
    return {"embedding": embedding.tolist()}
```

**Pros:**
- Dedicated GPU resources
- Faster response times
- Can use larger models

**Cons:**
- Additional infrastructure
- CORS configuration needed
- Separate deployment pipeline

#### Option C: Vector Database Integration

Use a managed vector database:

```typescript
// Using Pinecone, Weaviate, or Qdrant
import { Pinecone } from '@pinecone-database/pinecone'

const pinecone = new Pinecone()
const index = pinecone.Index('codex-embeddings')

async function search(query: string) {
  const queryEmbedding = await getEmbedding(query)
  
  const results = await index.query({
    vector: queryEmbedding,
    topK: 10,
    includeMetadata: true,
  })
  
  return results.matches
}
```

**Pros:**
- Scalable to millions of documents
- Built-in filtering and metadata
- Managed infrastructure

**Cons:**
- Monthly costs
- External dependency
- Network latency

### Recommended Migration Path

1. **Phase 1** (Current): Client-only with graceful fallbacks
2. **Phase 2**: Add Next.js API route for server-side embedding
3. **Phase 3**: Implement smart routing (client vs server based on load)
4. **Phase 4**: Optional vector database for large corpora

---

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_ENABLE_ORT` | `true` | Enable ONNX Runtime Web (set to `'false'` to disable) |
| `NEXT_PUBLIC_SEMANTIC_DEBUG` | `'info'` | Debug level: `'verbose'`, `'info'`, `'warn'`, `'error'` |

### Files

| File | Purpose |
|------|---------|
| `lib/search/semanticSearch.ts` | Main search engine |
| `lib/search/embeddingEngine.ts` | Backend management |
| `lib/search/ortClient.ts` | ONNX Runtime loader |
| `public/models/minilm-l6-v2/` | ONNX model files |
| `public/onnx-wasm/` | WASM runtime files |
| `public/codex-embeddings.json` | Pre-computed vectors |
| `scripts/generate-embeddings.js` | Build script |

---

## Troubleshooting

### "No embedding backend available"

**Symptoms:**
```
[EmbedEngine:ERROR] ❌ No embedding backend available
[SemanticSearch] Using lexical search only
```

**Solutions:**
1. Check browser console for specific errors
2. Verify WASM files exist in `/public/onnx-wasm/`
3. Verify model files exist in `/public/models/minilm-l6-v2/`
4. Try a different browser (Chrome recommended)

### "Failed to import @huggingface/transformers"

**Symptoms:**
```
[EmbedEngine:ERROR] Failed to import @huggingface/transformers
```

**Solutions:**
1. Install the package: `pnpm add @huggingface/transformers`
2. The engine will try CDN fallback automatically
3. Check network connectivity for CDN access

### Slow First Query

**Cause:** Model downloading on first use

**Solutions:**
1. Pre-warm by calling `semanticSearch.initialize()` on page load
2. Use pre-computed embeddings for most queries
3. Show loading indicator during initialization

### Memory Issues

**Symptoms:** Page becomes slow or crashes

**Solutions:**
1. Reduce `maxSeqLength` in configuration
2. Use quantized model (default)
3. Limit concurrent embedding operations

---

## References

- [ONNX Runtime Web Documentation](https://onnxruntime.ai/docs/get-started/with-javascript/web.html)
- [Hugging Face Transformers.js](https://huggingface.co/docs/transformers.js)
- [Sentence Transformers Models](https://www.sbert.net/docs/pretrained_models.html)
- [MiniLM Paper](https://arxiv.org/abs/2002.10957)

---

*Last updated: November 2024*

