# ONNX Runtime Web Integration Guide

## Overview

Quarry Codex uses a **hybrid embedding engine** for semantic search and natural language Q&A. The system automatically selects the best available backend:

1. **ONNX Runtime Web** (WebGPU/SIMD/threads) - Fastest, most flexible
2. **Transformers.js** (pure Wasm) - Reliable fallback
3. **Lexical search** (no embeddings) - Always available

## Architecture

```
┌─────────────────────────────────────────────────────┐
│          HybridEmbeddingEngine                       │
├─────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  ORT Web     │  │ Transformers │  │  Lexical  │ │
│  │  (optional)  │→ │   .js        │→ │  Search   │ │
│  │              │  │  (fallback)  │  │ (always)  │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
         ↓                    ↓                ↓
    WebGPU/SIMD          CPU Wasm         Keywords
```

## Enabling ORT Web

### 1. Install ONNX Runtime Web

**⚠️ Important**: `onnxruntime-web` is **not** included by default to prevent build crashes on CI. You must install it manually:

```bash
pnpm add onnxruntime-web
# or
npm install onnxruntime-web
```

**Why?** The package includes native N-API bindings that trigger Rust panics in Next.js SWC compiler on Linux runners. By making it optional, the default build always succeeds.

### 2. Set Environment Variable

Create a `.env.local` file:

```bash
NEXT_PUBLIC_ENABLE_ORT=true
```

### 3. Build & Deploy

```bash
pnpm run build        # Copies WASM binaries to /public/onnx-wasm/
```

### 3. Verify

Open the Q&A panel and check the status badge:

- 🟢 **ORT** (WebGPU/SIMD) = ONNX Runtime enabled
- 🟡 **TF.js** = Transformers.js fallback
- 🔴 **Offline** = Lexical search only

## Backend Selection Logic

```typescript
async initialize() {
  // 1. Detect capabilities
  const caps = await detectCapabilities()
  // → webgpu, simd, threads, crossOriginIsolated

  // 2. Try ORT Web (if NEXT_PUBLIC_ENABLE_ORT=true)
  if (ORT_ENABLED) {
    const ort = await tryInitializeORT(caps)
    if (ort) return ort  // ✅ ORT ready
  }

  // 3. Fallback to Transformers.js
  const tf = await tryInitializeTransformers()
  if (tf) return tf  // ✅ TF.js ready

  // 4. No embeddings available
  return { type: 'none', reason: 'All backends failed' }
}
```

## Capability Detection

| Feature | Requirement | Impact |
|---------|-------------|--------|
| **WebGPU** | `navigator.gpu` | 2-4× faster inference |
| **SIMD** | Wasm SIMD bytecode | 1.3-1.6× faster on CPU |
| **Threads** | `SharedArrayBuffer` + `crossOriginIsolated` | Multi-core parallelism |
| **COI** | COOP + COEP headers | Required for threads |

### GitHub Pages Limitation

GitHub Pages **does not support custom headers**, so:

- ❌ `crossOriginIsolated` = false
- ❌ Threads unavailable
- ✅ SIMD works
- ✅ WebGPU works (Chrome/Edge 113+)

**Result**: ORT Web runs in **SIMD-only mode** on GitHub Pages, which is still 1.3-1.6× faster than the Transformers.js fallback.

## Performance Comparison

| Backend | Device | Embedding Time (384-dim) | Bundle Size |
|---------|--------|---------------------------|-------------|
| ORT Web (WebGPU) | GPU | ~50-80 ms | +10 MB |
| ORT Web (SIMD) | CPU | ~120-180 ms | +10 MB |
| Transformers.js | CPU | ~180-250 ms | +170 kB |
| Lexical | N/A | 0 ms | 0 bytes |

## User Experience

### Initialization Flow

1. User opens Q&A panel
2. System shows progress: "Detecting browser capabilities... 5%"
3. System shows progress: "Loading ONNX model... 50%"
4. Toast notification: "Q&A ready! Using GPU (WebGPU)" 🟢
5. Status badge updates: **ORT** (WebGPU)

### Graceful Degradation

If ORT fails (model 404, WASM error, etc.):

1. Toast: "ORT unavailable, using Transformers.js"
2. System initializes Transformers.js
3. Toast: "Q&A initialized (slower, but reliable)" 🟡
4. Status badge: **TF.js**

If Transformers.js also fails:

1. Toast: "Semantic Q&A unavailable. Using keyword search."
2. Status badge: **Offline** 🔴
3. User can still search with keywords (lexical fallback)

## Debug Logging

Set debug level in `SemanticSearchEngine` constructor:

```typescript
const engine = new SemanticSearchEngine('verbose')
```

Levels:

- `verbose`: All logs (capability detection, model loading, tokenization)
- `info`: Initialization events, status changes (default)
- `warn`: Fallbacks, missing files
- `error`: Critical failures only

Example output:

```
[EmbedEngine:INFO] 🚀 Initializing Hybrid Embedding Engine...
[EmbedEngine:VERBOSE] Browser capabilities: {"webgpu":true,"simd":true,"threads":false,"crossOriginIsolated":false}
[EmbedEngine:INFO] 📦 ORT Web enabled, attempting initialization...
[EmbedEngine:VERBOSE] Set WASM path to: /onnx-wasm/
[EmbedEngine:VERBOSE] ✓ WebGPU available
[EmbedEngine:VERBOSE] ✓ SIMD available, threads disabled
[EmbedEngine:VERBOSE] Loading ONNX model...
[EmbedEngine:VERBOSE] Trying model: /models/minilm-l6-v2/model.onnx
[EmbedEngine:INFO] ✓ Loaded model from: /models/minilm-l6-v2/model.onnx
[EmbedEngine:INFO] ✅ ORT Web initialized with wasm-simd
```

## Model Files

### Required Files

- `tokenizer.json` (350 KB) - BERT tokenizer vocab
- `config.json` (1 KB) - Model metadata

### Optional Files

- `model.onnx` (90 MB) - Full precision ONNX model
- `model_quantized.onnx` (23 MB) - INT8 quantized (faster, slightly less accurate)

**Recommendation**: Use `model_quantized.onnx` for production (4× smaller, 95% accuracy).

### Download Script

Run manually:

```bash
node scripts/download-semantic-model.js
```

Or skip during build:

```bash
SKIP_SEMANTIC_MODEL=1 pnpm run build
```

## Common Issues

### Issue: 404 on `/onnx-wasm/*.wasm`

**Cause**: WASM files not copied during build.

**Fix**:

```bash
pnpm run postinstall  # Manually run copy script
```

### Issue: "All backends failed to initialize"

**Cause**: Missing model files + Transformers.js CDN blocked.

**Fix**:

1. Check `/models/minilm-l6-v2/` exists
2. Verify `tokenizer.json` and `config.json` present
3. Check browser console for network errors

### Issue: Slow inference (>500 ms)

**Cause**: Running on old hardware or in single-threaded mode.

**Fix**:

1. Enable WebGPU in browser (chrome://flags)
2. Use quantized model (`model_quantized.onnx`)
3. Fallback to Transformers.js is acceptable (<250 ms)

## Advanced: WebGPU Acceleration

### Prerequisites

- Chrome/Edge 113+
- Dedicated GPU (not integrated)
- WebGPU enabled in browser

### Enabling WebGPU

```typescript
const session = await ort.InferenceSession.create(modelPath, {
  executionProviders: ['webgpu', 'wasm'],  // Prefer WebGPU
})
```

### Verification

Check console logs:

```
[EmbedEngine:VERBOSE] ✓ WebGPU available
[EmbedEngine:INFO] ✅ ORT Web initialized with webgpu
```

Status badge will show: **ORT** (GPU)

## Future Enhancements

### Planned

- [ ] OCR support (vision models via ORT)
- [ ] Multimodal search (text + image)
- [ ] Voice transcription (Whisper.js via ORT)
- [ ] Handwriting recognition (whiteboard → text)

### Under Consideration

- [ ] Cross-Origin-Isolated deployment for threads
- [ ] Progressive model loading (stream ONNX chunks)
- [ ] IndexedDB cache for embeddings
- [ ] WebNN API support (when stable)

## References

- [ONNX Runtime Web Docs](https://onnxruntime.ai/docs/get-started/with-javascript.html)
- [Transformers.js GitHub](https://github.com/xenova/transformers.js)
- [WebGPU Spec](https://www.w3.org/TR/webgpu/)
- [Cross-Origin Isolation Guide](https://web.dev/articles/coop-coep)

---

**Questions?** Open an issue on [GitHub](https://github.com/framersai/frame.dev/issues) or check the [ENV_VARS.md](../../ENV_VARS.md) for configuration details.

