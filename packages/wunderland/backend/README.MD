<div align="center">

# AgentOS Backend API (Voice Chat Assistant)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../logos/agentos-primary-no-tagline-dark-2x.png">
  <source media="(prefers-color-scheme: light)" srcset="../logos/agentos-primary-no-tagline-light-2x.png">
  <img src="../logos/agentos-primary-no-tagline-transparent-2x.png" alt="AgentOS" width="260">
</picture>

<p align="center">
  <a href="https://frame.dev" target="_blank" rel="noopener"><img src="../logos/frame-logo-green-no-tagline.svg" alt="Frame.dev" height="40" /></a>
</p>

<p align="center"><em>The OS for humans, the codex of humanity.</em></p>

<p align="center">
  <a href="https://frame.dev">Frame.dev</a> • <a href="https://agentos.sh">AgentOS</a> • <a href="https://vca.chat">VCA</a>
</p>

</div>

# Backend – Voice Chat Assistant API

Node.js + Express + TypeScript server powering chat, STT/TTS, diagrams, rate limiting, billing, and the embedded AgentOS adapter.

**Powered by [`@framers/agentos`](https://github.com/wearetheframers/agentos)** - The orchestration runtime for adaptive AI systems.

---

## Quick Start

```bash
cd backend
npm install             # installs backend deps
pnpm install            # optional, installs every workspace (root command)
npm run dev             # tsx watch server.ts
```

> The backend now depends on `@framers/agentos` (from `packages/agentos`). When building for production (`npm run build`), the root script runs the AgentOS package build first so `dist/server.js` can import it.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts `tsx watch server.ts` with auto-reload. |
| `npm run build` | Runs `npm --prefix packages/agentos run build` then compiles backend TypeScript to `dist/`. |
| `npm start` | Runs `node dist/server.js` (after build). |

---

## Environment

1. Copy `.env.example` → `.env` in the repo root. Fill in:
   - `PORT`, `FRONTEND_URL`, `APP_URL`, `NODE_ENV`
   - `AUTH_JWT_SECRET`, `GLOBAL_ACCESS_PASSWORD`
   - LLM keys (`OPENAI_API_KEY`, `OPENROUTER_API_KEY`, optional Anthropic/Ollama)
   - Speech defaults (`WHISPER_MODEL_DEFAULT`, `OPENAI_TTS_DEFAULT_MODEL`, etc.)
   - Optional Supabase (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) and Stripe/Lemon Squeezy values
   - AgentOS flags (`AGENTOS_ENABLED`, `AGENTOS_DEFAULT_PERSONA_ID`, etc.)
2. For frontend-specific values, see `frontend/.env*` and the frontend README.
3. Full variable explanations live in [CONFIGURATION.md](../CONFIGURATION.md).

## Observability (OTEL)

- Backend OpenTelemetry SDK is opt-in via `OTEL_ENABLED=true` (auto-instrumentation, exporters, sampling).
- Backend logs are structured (`pino`). OTEL log export is opt-in via `OTEL_LOGS_EXPORTER=otlp`.
- AgentOS manual spans + correlation is opt-in via `AGENTOS_OBSERVABILITY_ENABLED=true` (or `AgentOSConfig.observability`).

See `docs/OBSERVABILITY.md` for the full setup and env/config examples.

### AgentOS RAG (Vector + Hybrid + Optional Rerank)

The backend-wide `ragService` (used by rolling memory + agent knowledge) is now vector-first when embeddings are available, with keyword fallback.

- Storage: `RAG_DATABASE_PATH`, `RAG_DATABASE_URL`, `RAG_STORAGE_PRIORITY`
- Retrieval: `AGENTOS_RAG_PRESET=fast|balanced|accurate` (default: `balanced`)
- Hybrid: `AGENTOS_RAG_HYBRID_ALPHA=0.0..1.0` (default: `0.7`)
- Diversification (request-time): `strategy=mmr` (+ `strategyParams.mmrLambda`, `strategyParams.mmrCandidateMultiplier`) to reduce redundant chunks
- Multi-query (request-time): `queryVariants` and `rewrite` to expand retrieval queries (merged + deduped; rewrite is best-effort and requires an LLM provider)
- Embeddings: `AGENTOS_RAG_EMBED_PROVIDER=ollama|openai|openrouter` + `AGENTOS_RAG_EMBED_MODEL=...` (optional overrides; Ollama requires `OLLAMA_ENABLED=true` unless explicitly selected)
- Vector provider: `AGENTOS_RAG_VECTOR_PROVIDER=sql|qdrant|hnswlib` (default: `sql`)
- Qdrant: `AGENTOS_RAG_QDRANT_URL` (or `QDRANT_URL`) + `AGENTOS_RAG_QDRANT_API_KEY` (optional)
- In-process HNSW (optional): `AGENTOS_RAG_VECTOR_PROVIDER=hnswlib` + install `hnswlib-node` (optional `AGENTOS_RAG_HNSWLIB_PERSIST_DIR`)
- Reranking (accurate preset): `COHERE_API_KEY` (optional) or install Transformers.js for local reranking: `@huggingface/transformers` (preferred) or `@xenova/transformers` (optional)
- GraphRAG (optional): `AGENTOS_GRAPHRAG_ENABLED=true` (indexes `knowledge_base` docs by default; can run with or without LLM extraction; falls back to text matching if embeddings are unavailable)
  - Policy: `AGENTOS_GRAPHRAG_CATEGORIES=...` (default when unset: `knowledge_base`)
  - Policy: `AGENTOS_GRAPHRAG_COLLECTIONS=...` allow list (optional) and `AGENTOS_GRAPHRAG_EXCLUDE_COLLECTIONS=...` deny list (optional)
  - Guardrails: `AGENTOS_GRAPHRAG_MAX_DOC_CHARS=...` (optional) and `AGENTOS_GRAPHRAG_INDEX_MEDIA_ASSETS=true` (default: `false`)

GraphRAG endpoints (when enabled):

```bash
curl -s -X POST http://localhost:3001/api/agentos/rag/graphrag/local-search \
  -H 'content-type: application/json' \
  -d '{"query":"What is AgentOS?"}' | jq

curl -s -X POST http://localhost:3001/api/agentos/rag/graphrag/global-search \
  -H 'content-type: application/json' \
  -d '{"query":"Summarize the main subsystems"}' | jq

curl -s http://localhost:3001/api/agentos/rag/graphrag/stats | jq
```

GraphRAG update/delete semantics:

- Update: re-ingest the same `documentId` via `POST /api/agentos/rag/ingest` (best-effort updates GraphRAG contributions too).
- Delete: `DELETE /api/agentos/rag/documents/:documentId` best-effort removes GraphRAG contributions (when enabled).
- Category/collection move: re-ingest the same `documentId` with a new `category` and/or `collectionId`; if the doc moves out of policy scope, the backend will best-effort remove it from GraphRAG.

---

### AgentOS Multimodal RAG (Image + Audio)

Multimodal ingestion stores a small asset record (and optionally the raw bytes), then indexes the asset by writing a derived **text representation** as a normal RAG document:

- Images: caption + visible text (LLM vision) or user-supplied `textRepresentation`
- Audio: transcript (OpenAI Whisper) or user-supplied `textRepresentation`

Env (optional):

- `AGENTOS_RAG_MEDIA_STORE_PAYLOAD=true|false` (default: `false`)
- `AGENTOS_RAG_MEDIA_IMAGE_COLLECTION_ID=media_images` (default shown)
- `AGENTOS_RAG_MEDIA_AUDIO_COLLECTION_ID=media_audio` (default shown)
- `AGENTOS_RAG_MEDIA_IMAGE_LLM_PROVIDER=openai|openrouter` (default: `openai`)
- `AGENTOS_RAG_MEDIA_IMAGE_LLM_MODEL=gpt-4o-mini` (default shown)
- Optional image-to-image embeddings (offline, CLIP-style):
  - `AGENTOS_RAG_MEDIA_IMAGE_EMBEDDINGS_ENABLED=true` (default: `false`)
  - `AGENTOS_RAG_MEDIA_IMAGE_EMBED_MODEL=Xenova/clip-vit-base-patch32` (default shown)
  - `AGENTOS_RAG_MEDIA_IMAGE_EMBED_COLLECTION_SUFFIX=_img` (default shown)
  - Requires installing Transformers.js (optional): `@huggingface/transformers` (preferred) or `@xenova/transformers`
- Optional audio-to-audio embeddings (offline, CLAP-style):
  - `AGENTOS_RAG_MEDIA_AUDIO_EMBEDDINGS_ENABLED=true` (default: `false`)
  - `AGENTOS_RAG_MEDIA_AUDIO_EMBED_MODEL=Xenova/clap-htsat-unfused` (default shown)
  - `AGENTOS_RAG_MEDIA_AUDIO_EMBED_COLLECTION_SUFFIX=_aud` (default shown)
  - `AGENTOS_RAG_MEDIA_AUDIO_EMBED_CACHE_DIR=` (optional)
  - Requires installing Transformers.js (optional): `@huggingface/transformers` (preferred) or `@xenova/transformers`
  - Node decoding is WAV-only for now (no ffmpeg); install `wavefile` (optional) and send `audio/wav` payloads for embedding-based retrieval

Endpoints:

```bash
# Ingest image (multipart/form-data; field name: "image")
curl -s -X POST http://localhost:3001/api/agentos/rag/multimodal/images/ingest \
  -F "image=@/path/to/image.png" \
  -F "storePayload=true" \
  -F "tags=ui,diagram" \
  -F "metadata={\"source\":\"upload\"}" | jq

# Ingest audio (multipart/form-data; field name: "audio")
curl -s -X POST http://localhost:3001/api/agentos/rag/multimodal/audio/ingest \
  -F "audio=@/path/to/audio.webm" \
  -F "storePayload=false" | jq

# Query by image (multipart/form-data; field name: "image")
# Default behavior:
# - If `AGENTOS_RAG_MEDIA_IMAGE_EMBEDDINGS_ENABLED=true` and Transformers.js is installed, uses offline image embeddings.
# - Otherwise, captions the query image and runs text retrieval.
# To force text retrieval (and bypass both captioning + image embeddings), pass `textRepresentation` explicitly.
curl -s -X POST http://localhost:3001/api/agentos/rag/multimodal/images/query \
  -F "image=@/path/to/query.png" \
  -F "topK=5" \
  -F "modalities=image" \
  -F "textRepresentation=diagram auth flow" | jq

# Query by audio (multipart/form-data; field name: "audio")
# Default behavior:
# - If `AGENTOS_RAG_MEDIA_AUDIO_EMBEDDINGS_ENABLED=true` and Transformers.js + wavefile are installed, uses offline audio embeddings (WAV-only) for audio-to-audio retrieval.
# - Otherwise, transcribes the query audio and runs text retrieval.
# To avoid any transcription API calls, pass `textRepresentation` explicitly.
curl -s -X POST http://localhost:3001/api/agentos/rag/multimodal/audio/query \
  -F "audio=@/path/to/query.webm" \
  -F "topK=5" \
  -F "modalities=audio" \
  -F "textRepresentation=hello world" | jq

# Query assets (JSON)
curl -s -X POST http://localhost:3001/api/agentos/rag/multimodal/query \
  -H 'content-type: application/json' \
  -d '{"query":"find the diagram about auth flow","modalities":["image"],"topK":5}' | jq

# Fetch metadata
curl -s http://localhost:3001/api/agentos/rag/multimodal/assets/<assetId> | jq

# Fetch raw bytes (only if storePayload=true at ingest time)
curl -s http://localhost:3001/api/agentos/rag/multimodal/assets/<assetId>/content > asset.bin
```

---

### HITL (Tool Approvals)

AgentOS tools can be gated behind human approval (HITL) for safety. When enabled, any tool with
`tool.hasSideEffects=true` will pause execution until approved (or rejected / timed out).

- Enable: `AGENTOS_HITL_ENABLED=true`
- Approvals API: `/api/agentos/hitl/approvals` + `/api/agentos/hitl/approvals/:actionId/approve|reject`
- Optional notifications: `AGENTOS_HITL_WEBHOOK_URL` (comma-separated). If `AGENTOS_HITL_WEBHOOK_SECRET` is set, decision endpoints require `x-agentos-hitl-secret`.

Quick test (local):

```bash
# List pending approvals/clarifications/etc
curl -s http://localhost:3001/api/agentos/hitl/pending | jq

# Approve an action
curl -s -X POST http://localhost:3001/api/agentos/hitl/approvals/<actionId>/approve \
  -H 'content-type: application/json' \
  -H "x-agentos-hitl-secret: ${AGENTOS_HITL_WEBHOOK_SECRET}" \
  -d '{"decidedBy":"user","instructions":"Proceed"}' | jq
```

Webhook payload (to each URL in `AGENTOS_HITL_WEBHOOK_URL`) is:

```json
{
  "notification": { "type": "approval_required", "requestId": "..." },
  "request": { "actionId": "...", "severity": "high", "title": "...", "description": "..." }
}
```

When `AGENTOS_HITL_WEBHOOK_SECRET` is set, outbound webhooks include:

- `x-agentos-hitl-timestamp-ms`
- `x-agentos-hitl-signature` (HMAC-SHA256 of `${timestampMs}.${rawBody}`).

---

### Running Qdrant Locally (Optional)

If you configure `AGENTOS_RAG_VECTOR_PROVIDER=qdrant`

you’ll need a Qdrant instance (self-hosted or managed). For local dev, this repo includes a Docker Compose file:

```bash
pnpm dev:qdrant:up
pnpm dev:qdrant:logs
```

Defaults:
- `QDRANT_URL=http://localhost:6333`
- Data volume: `db_data/qdrant`

Shutdown:

```bash
pnpm dev:qdrant:down
```

## Architecture

- `config/router.ts` wires all `/api/*` routes (auth, chat, STT/TTS, billing, organizations). When `AGENTOS_ENABLED=true`, it also mounts `/api/agentos/chat` + `/api/agentos/stream` via `getAgentOSRouter()`.
- AgentOS sub-routers such as RAG and HITL are implemented in `@framers/agentos-ext-http-api` (Express router factories) and mounted by the backend under `/api/agentos/*`.

## Links

- Website: https://agentos.sh
- Frame: https://frame.dev
- Marketplace: https://vca.chat
- GitHub: https://github.com/framersai/agentos
- npm: https://www.npmjs.com/org/framers

---

<p align="center">
  <a href="https://frame.dev">
    <img src="../logos/frame-logo-green-transparent-4x.png" alt="Frame.dev" height="40" />
  </a>
  <br />
  <sub>AgentOS product by <a href="https://frame.dev">Frame.dev</a></sub>
</p>
- `middleware/optionalAuth.ts` injects `req.user` for public-or-private routes; `middleware/auth.ts` enforces strict JWT/Supabase validation.
- Feature modules live in `src/features/*` (auth, chat, speech, cost, prompts, billing, organization, system status).
- Core shared services live under `src/core/*` (LLM providers, cost tracking, audio helpers, memory, context aggregation).
- AgentOS adapters (`src/integrations/agentos/*`) translate VCA’s auth/plan/rate logic into the AgentOS package interfaces.
- Legacy `backend/agentos/**` code now lives in `packages/agentos/src/**` (portable package). Backend imports via `@framers/agentos/...`.

For a detailed endpoint table, see [docs/BACKEND_API.md](../docs/BACKEND_API.md). For diagrams and context strategy, review:

- [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- [LANGUAGE_AND_CONTEXT_DOCUMENTATION.md](../LANGUAGE_AND_CONTEXT_DOCUMENTATION.md)
- [docs/AGENTOS_REINTEGRATION_NOTES.md](../docs/AGENTOS_REINTEGRATION_NOTES.md)

---

## AgentOS Integration

- The backend consumes the workspace package `@framers/agentos` (source in `packages/agentos`).
- `agentos.integration.ts` lazily instantiates the AgentOS orchestrator, wiring our auth + subscription adapters (`agentos.auth-service.ts`, `agentos.subscription-service.ts`) and streaming bridge.
- `/api/chat` currently short-circuits to `processAgentOSChatRequest` when `AGENTOS_ENABLED=true`. The long-term plan (see [docs/AGENTOS_REINTEGRATION_NOTES.md](../docs/AGENTOS_REINTEGRATION_NOTES.md)) is to route all conversations through `agentosService.processThroughAgentOS()` and expose streaming chunks end-to-end.
- Building the backend automatically builds the AgentOS package. When working directly on AgentOS, run `npm --prefix packages/agentos run build && npm --prefix backend run build` to ensure the compiled files land in `packages/agentos/dist` before launching `node dist/server.js`.

---

## Testing & Tooling

- Linting/testing coverage is being extended as part of the AgentOS extraction work. For now, rely on TypeScript, unit tests in `packages/agentos`, and targeted integration tests (e.g., hitting `/api/chat`, `/api/tts`, `/api/rate-limit/status`) via your preferred HTTP client.
- When adding new feature modules, follow the existing pattern: `src/features/{feature}/` contains router + service files, with heavy logic factored into `src/core` when possible.
- To test AgentOS routes manually, set `AGENTOS_ENABLED=true`, restart `npm run dev`, and POST to `http://localhost:3001/api/agentos/chat` with a payload `{ userId, conversationId, mode, messages }`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ERR_MODULE_NOT_FOUND: agentos/api/AgentOS` when running `npm start` | Run `npm run build:backend` from the repo root so the `packages/agentos` build runs first. |
| `/api/tts/voices` or `/api/rate-limit/status` returning 500 during dev | Ensure `npm run dev` is running in the backend terminal (frontend proxies to `localhost:3001`). |
| Supabase login fails | Verify `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and Supabase redirect URLs. |
| SSE/AgentOS requests returning 503 | Check that `AGENTOS_ENABLED=true` and the backend logs show `[AgentOS] Registered AgentOS routes at /api/agentos`. |

---

## References

- [Configuration Guide](../CONFIGURATION.md)
- [Plans & Billing](../docs/PLANS_AND_BILLING.md)
- [AgentOS Integration Notes](../docs/AGENTOS_REINTEGRATION_NOTES.md)
- [AgentOS Public Repo](https://github.com/wearetheframers/agentos)
