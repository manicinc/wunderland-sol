# Configuration Guide

This guide summarises all environment variables and runtime options available in Voice Chat Assistant. Use it alongside `.env.example` (repo root) and `frontend/.env.example` (Vite frontend template).

## 1. Core Settings

| Variable       | Description                                                                |
| -------------- | -------------------------------------------------------------------------- |
| `PORT`         | Backend server port (default `3001`).                                      |
| `NODE_ENV`     | Environment mode (`development` or `production`).                          |
| `FRONTEND_URL` | Base URL for the frontend, used in CORS and cookies.                       |
| `APP_URL`      | Public URL for backend if different from origin (used in emails/webhooks). |
| `LOG_LEVEL`    | `debug`, `info`, `warn`, or `error`.                                       |

### Observability (OpenTelemetry) (Optional)

OpenTelemetry (OTEL) is **opt-in** in this repo. It supports traces, metrics, and OTEL-compatible logs (via `pino` + optional OTEL LogRecords export).

Full setup guide (recommended): [`docs/OBSERVABILITY.md`](docs/OBSERVABILITY.md).

Backend OTEL SDK bootstrap (NodeSDK + auto-instrumentation):

| Variable                      | Description                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------- | ---- | ---- | ----- | ------- |
| `OTEL_ENABLED`                | Master switch for backend OTEL bootstrap (`true`/`false`).                                    |
| `OTEL_SERVICE_NAME`           | Service name (recommended).                                                                   |
| `OTEL_TRACES_EXPORTER`        | Exporter (`otlp`, `none`, etc).                                                               |
| `OTEL_METRICS_EXPORTER`       | Exporter (`otlp`, `none`, etc).                                                               |
| `OTEL_LOGS_EXPORTER`          | Exporter (`otlp`, `none`, etc). Keep unset/`none` unless you explicitly want OTLP log export. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Collector endpoint (commonly `http://localhost:4318` for OTLP/HTTP).                          |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | Protocol (commonly `http/protobuf`).                                                          |
| `OTEL_TRACES_SAMPLER`         | Sampler (e.g. `parentbased_traceidratio`).                                                    |
| `OTEL_TRACES_SAMPLER_ARG`     | Sampler arg (e.g. `0.1`).                                                                     |
| `OTEL_DIAG_LOG_LEVEL`         | OTEL SDK diagnostics (`debug                                                                  | info | warn | error | none`). |

AgentOS observability helpers (manual spans/metrics + correlation, exported by the host OTEL SDK):

| Variable                         | Description                                                                 |
| -------------------------------- | --------------------------------------------------------------------------- |
| `AGENTOS_OBSERVABILITY_ENABLED`  | Master switch (enables tracing + metrics + log trace correlation defaults). |
| `AGENTOS_TRACING_ENABLED`        | Enable AgentOS manual spans.                                                |
| `AGENTOS_METRICS_ENABLED`        | Enable AgentOS metrics.                                                     |
| `AGENTOS_TRACE_IDS_IN_RESPONSES` | Attach `metadata.trace` to select streamed chunks.                          |
| `AGENTOS_LOG_TRACE_IDS`          | Add `trace_id`/`span_id` to AgentOS pino logs when an active span exists.   |
| `AGENTOS_OTEL_LOGS_ENABLED`      | Emit OTEL LogRecords from AgentOS (requires host `OTEL_LOGS_EXPORTER`).     |

## 2. Authentication

| Variable                           | Description                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `AUTH_JWT_SECRET`                  | 64+ byte secret for issuing global JWTs.                                                               |
| `GLOBAL_ACCESS_PASSWORD`           | Shared passphrase for unlimited global access. Optional but recommended even when Supabase is enabled. |
| `GLOBAL_LOGIN_RATE_WINDOW_MINUTES` | Sliding window for rate limiting global passphrase attempts.                                           |
| `GLOBAL_LOGIN_RATE_MAX_ATTEMPTS`   | Maximum attempts per window for the shared passphrase.                                                 |
| `PASSWORD`                         | Legacy fallback for `GLOBAL_ACCESS_PASSWORD`.                                                          |

### Supabase (Optional)

| Variable                    | Description                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | Supabase project URL used by the backend.                                                |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for verifying Supabase JWTs. **Never expose to the frontend.**          |
| `SUPABASE_ANON_KEY`         | Optional. Only required when you need the backend to perform Supabase client operations. |
| `VITE_SUPABASE_URL`         | Supabase project URL for the frontend.                                                   |
| `VITE_SUPABASE_ANON_KEY`    | Public anon key for the frontend Supabase client.                                        |

When Supabase values are supplied, the backend will:

1. Validate Supabase JWTs in `Authorization: Bearer <token>` headers.
2. Mirror Supabase profiles into the `app_users` table (`supabase_user_id` column).
3. Return `tokenProvider: "supabase"` in `/api/auth` responses.

If Supabase values are omitted, the system falls back to the global passphrase and standard email/password logins.

## 3. Billing (Optional)

```bash
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_SUCCESS_URL=
LEMONSQUEEZY_CANCEL_URL=

# Plan identifiers
LEMONSQUEEZY_BASIC_PRODUCT_ID=
LEMONSQUEEZY_BASIC_VARIANT_ID=
LEMONSQUEEZY_CREATOR_PRODUCT_ID=
LEMONSQUEEZY_CREATOR_VARIANT_ID=
LEMONSQUEEZY_ORG_PRODUCT_ID=
LEMONSQUEEZY_ORG_VARIANT_ID=

# Stripe (optional)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_BASIC_PRODUCT_ID=
STRIPE_BASIC_PRICE_ID=
STRIPE_CREATOR_PRODUCT_ID=
STRIPE_CREATOR_PRICE_ID=
STRIPE_ORG_PRODUCT_ID=
STRIPE_ORG_PRICE_ID=
```

Frontend builds need the matching IDs (prefixed with `VITE_...`) in `frontend/.env` or `frontend/.env.local` so buttons render accurate CTAs. See `.env.example` and `frontend/.env.example` for templates.

When billing is configured, webhooks update `app_users` with subscription state. Creator and Organization plans roll into BYO keys once the daily platform allowance is consumed; the rollover rules live in `shared/planCatalog.ts`. Full rationale lives in [`docs/PLANS_AND_BILLING.md`](docs/PLANS_AND_BILLING.md).

## 4. Language & Context Controls

| Variable                          | Description                                                 |
| --------------------------------- | ----------------------------------------------------------- |
| `DEFAULT_RESPONSE_LANGUAGE_MODE`  | `auto`, `fixed`, or `follow-stt`.                           |
| `ENABLE_LANGUAGE_DETECTION`       | Enable automatic language detection for responses.          |
| `DEFAULT_FIXED_RESPONSE_LANGUAGE` | Language code when using `fixed` mode.                      |
| `MAX_CONTEXT_MESSAGES`            | Maximum chat turns kept in context.                         |
| `CONVERSATION_CONTEXT_STRATEGY`   | `minimal`, `smart`, or `full`.                              |
| `PREVENT_REPETITIVE_RESPONSES`    | Toggle repetition avoidance.                                |
| `DISABLE_COST_LIMITS`             | Set to `true` to bypass cost thresholds during development. |

### Prompt Profiles & Rolling Memory (Optional)

Prompt profiles (dynamic “meta presets”) and rolling memory live in `config/metaprompt-presets.json`.

- When `AGENTOS_ENABLED=true`, AgentOS loads this config and applies prompt-profile routing + rolling memory inside the AgentOS orchestrator.
- The `MEMORY_COMPACTION_*` env vars below apply to the legacy (non‑AgentOS) `/api/chat` path and are optional overrides (useful for deploy-time kill switches or emergency tuning).

| Variable                               | Description                                                                |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `METAPROMPT_PRESETS_PATH`              | Optional path override for `config/metaprompt-presets.json`.               |
| `MEMORY_COMPACTION_ENABLED`            | Enable rolling conversation summary/compaction (`true`/`false`).           |
| `MEMORY_COMPACTION_MODEL_ID`           | Model used for compaction (defaults to the utility model / `gpt-4o-mini`). |
| `MEMORY_COMPACTION_PROMPT_KEY`         | Prompt template key under `prompts/` (default `memory_compactor_v2_json`). |
| `MEMORY_COMPACTION_TAIL_TURNS`         | How many most-recent turns to keep verbatim (default `12`).                |
| `MEMORY_COMPACTION_MIN_TURNS`          | Minimum turns to summarize in one pass (default `12`).                     |
| `MEMORY_COMPACTION_MAX_TURNS_PER_PASS` | Max turns summarized per compaction pass (default `48`).                   |
| `MEMORY_COMPACTION_COOLDOWN_MS`        | Cooldown between compaction passes per conversation (default `60000`).     |
| `MEMORY_COMPACTION_MAX_SUMMARY_TOKENS` | Max tokens for the rolling summary output (default `900`).                 |

See `docs/METAPROMPT_PRESETS.md` for details.

Per-conversation long-term memory controls (opt-out, user/org scope) are **request fields**, not env vars:

- `organizationId`
- `memoryControl.longTermMemory`

AgentOS persists the resolved `memoryControl.longTermMemory` policy in `ConversationContext` metadata so it sticks across turns. For security, `organizationId` is **not** persisted; callers should assert org context on each request after verifying membership/permissions.

Backend default behavior (Voice Chat Assistant):

- If `organizationId` is present, the backend enables org-scoped long-term memory retrieval by default (`scopes.organization=true`) unless explicitly disabled in `memoryControl.longTermMemory.scopes`.
- If authenticated, the backend enables user + persona long-term memory retrieval by default (`scopes.user=true`, `scopes.persona=true`) unless explicitly disabled in `memoryControl.longTermMemory.scopes`.
- Organization admins can manage org-level memory defaults/kill-switches via `GET/PATCH /api/organizations/:organizationId/settings`.

### AgentOS RAG Retrieval (Backend `ragService`)

When `AGENTOS_ENABLED=true`, AgentOS long-term memory retrieval uses the backend `ragService`. It stores canonical documents/chunks in SQL and maintains an optional vector index (dense + hybrid) with keyword fallback.

| Variable                                         | Description                                                                                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `RAG_DATABASE_PATH`                              | SQLite file path for the RAG store (default: `./data/rag_store.db`).                                                               |
| `RAG_DATABASE_URL`                               | Postgres connection string for the RAG store (optional).                                                                           |
| `AGENTOS_RAG_PRESET`                             | `fast` (dense), `balanced` (hybrid), `accurate` (hybrid + rerank). Default: `balanced`.                                            |
| `AGENTOS_RAG_HYBRID_ALPHA`                       | Hybrid dense weight (0..1). Default: `0.7`.                                                                                        |
| `AGENTOS_RAG_EMBED_PROVIDER`                     | Force embeddings provider: `ollama`, `openai`, `openrouter` (optional).                                                            |
| `AGENTOS_RAG_EMBED_MODEL`                        | Force embeddings model ID (optional).                                                                                              |
| `AGENTOS_RAG_OLLAMA_REQUEST_TIMEOUT_MS`          | Ollama connect timeout (ms). Also accepts `OLLAMA_REQUEST_TIMEOUT_MS`. Default: `5000`.                                            |
| `COHERE_API_KEY`                                 | Enables Cohere reranking (used by `accurate` preset). Optional.                                                                    |
| `AGENTOS_RAG_VECTOR_PROVIDER`                    | Vector index backend for `ragService`: `sql` (default), `qdrant`, or `hnswlib` (in-process ANN; optional).                         |
| `AGENTOS_RAG_QDRANT_URL`                         | Qdrant base URL when `AGENTOS_RAG_VECTOR_PROVIDER=qdrant`. Also accepts `QDRANT_URL`.                                              |
| `AGENTOS_RAG_QDRANT_API_KEY`                     | Optional Qdrant API key. Also accepts `QDRANT_API_KEY`.                                                                            |
| `AGENTOS_RAG_QDRANT_TIMEOUT_MS`                  | Qdrant request timeout (ms). Also accepts `QDRANT_TIMEOUT_MS`. Default: `15000`.                                                   |
| `AGENTOS_RAG_QDRANT_ENABLE_BM25`                 | Enable BM25 sparse vectors + hybrid fusion in Qdrant (`true`/`false`). Default: `true`.                                            |
| `AGENTOS_RAG_HNSWLIB_PERSIST_DIR`                | Persist directory when `AGENTOS_RAG_VECTOR_PROVIDER=hnswlib` (optional). Requires installing `hnswlib-node`.                       |
| `AGENTOS_RAG_HNSWLIB_M`                          | HNSW M parameter (optional).                                                                                                       |
| `AGENTOS_RAG_HNSWLIB_EF_CONSTRUCTION`            | HNSW efConstruction parameter (optional). Default depends on `AGENTOS_RAG_PRESET` (`fast`: 100, `balanced`: 200, `accurate`: 400). |
| `AGENTOS_RAG_HNSWLIB_EF_SEARCH`                  | HNSW efSearch parameter (optional). Default depends on `AGENTOS_RAG_PRESET` (`fast`: 64, `balanced`: 100, `accurate`: 200).        |
| `AGENTOS_GRAPHRAG_ENABLED`                       | Enable GraphRAG indexing + search (`true`/`false`). Default: `false`.                                                              |
| `AGENTOS_GRAPHRAG_CATEGORIES`                    | Comma list of `RagDocumentInput.category` values to index into GraphRAG. Default when unset: `knowledge_base`.                     |
| `AGENTOS_GRAPHRAG_COLLECTIONS`                   | Optional allow list of collection IDs to index into GraphRAG (comma-separated).                                                    |
| `AGENTOS_GRAPHRAG_EXCLUDE_COLLECTIONS`           | Optional deny list of collection IDs to exclude from GraphRAG (comma-separated).                                                   |
| `AGENTOS_GRAPHRAG_INDEX_MEDIA_ASSETS`            | Index derived multimodal assets into GraphRAG (`true`/`false`). Default: `false`.                                                  |
| `AGENTOS_GRAPHRAG_MAX_DOC_CHARS`                 | Skip GraphRAG indexing for docs larger than this character count (optional).                                                       |
| `AGENTOS_GRAPHRAG_ENGINE_ID`                     | GraphRAG engine ID (used to derive vector collection names). Default: `agentos-graphrag`.                                          |
| `AGENTOS_GRAPHRAG_TABLE_PREFIX`                  | GraphRAG SQL table prefix (stored in the same RAG DB). Default: `rag_graphrag_`.                                                   |
| `AGENTOS_GRAPHRAG_ENTITY_COLLECTION`             | Vector collection name for GraphRAG entity embeddings. Default: `${engineId}_entities`.                                            |
| `AGENTOS_GRAPHRAG_COMMUNITY_COLLECTION`          | Vector collection name for GraphRAG community embeddings. Default: `${engineId}_communities`.                                      |
| `AGENTOS_GRAPHRAG_ENTITY_EMBEDDINGS`             | Generate entity/community embeddings when embeddings are available (`true`/`false`). Default: `true`.                              |
| `AGENTOS_GRAPHRAG_LLM_ENABLED`                   | Use an LLM for entity extraction + community summaries (`true`/`false`). Default: `false` (pattern-based extraction only).         |
| `AGENTOS_GRAPHRAG_LLM_PROVIDER`                  | LLM provider for GraphRAG (`openai`/`openrouter`/`ollama`). Optional.                                                              |
| `AGENTOS_GRAPHRAG_LLM_MODEL`                     | LLM model ID for GraphRAG. Optional.                                                                                               |
| `AGENTOS_HITL_ENABLED`                           | Enable HITL approvals for side-effect tool calls (`true`/`false`). Default: `false`.                                               |
| `AGENTOS_HITL_TIMEOUT_MS`                        | Default timeout (ms) for HITL requests. Default: `30000`.                                                                          |
| `AGENTOS_HITL_APPROVAL_TIMEOUT_MS`               | Optional per-tool approval timeout override (ms).                                                                                  |
| `AGENTOS_HITL_DEFAULT_SEVERITY`                  | Default approval severity for side-effect tools: `low`/`medium`/`high`/`critical`. Default: `high`.                                |
| `AGENTOS_HITL_REQUIRE_APPROVAL_FOR_SIDE_EFFECTS` | If `true`, tools with `tool.hasSideEffects=true` require approval. Default: `true` (when HITL enabled).                            |
| `AGENTOS_HITL_WEBHOOK_URL`                       | Optional outbound webhook URL(s), comma-separated, notified on new HITL requests.                                                  |
| `AGENTOS_HITL_WEBHOOK_TIMEOUT_MS`                | Webhook request timeout (ms). Default: `5000`.                                                                                     |
| `AGENTOS_HITL_WEBHOOK_SECRET`                    | If set, decision endpoints require `x-agentos-hitl-secret` header and outbound webhooks include `x-agentos-hitl-signature`.        |

Local reranking is optional and requires installing Transformers.js: `@huggingface/transformers` (preferred) or `@xenova/transformers`.

#### GraphRAG Usage

GraphRAG is **disabled by default**. When enabled (`AGENTOS_GRAPHRAG_ENABLED=true`), the backend will **best-effort index** ingested RAG documents whose `category` is allowed by `AGENTOS_GRAPHRAG_CATEGORIES` (default when unset: `knowledge_base`).
If embeddings are not configured/available, GraphRAG still runs in a degraded text-matching mode (lower quality; no vector search).

Lifecycle semantics (important):

- **Update:** re-ingest the same `documentId` via `POST /api/agentos/rag/ingest`. This updates canonical SQL docs/chunks, best-effort syncs vector chunks, and updates GraphRAG contributions when enabled.
- **Delete:** `DELETE /api/agentos/rag/documents/:documentId` best-effort removes vector chunks and GraphRAG contributions (when enabled).
- **Category/collection move:** re-ingest the same `documentId` with a new `category` and/or `collectionId`. If the doc moves out of GraphRAG policy scope, the backend will best-effort call `GraphRAGEngine.removeDocuments([documentId])`.

Search endpoints:

- `POST /api/agentos/rag/graphrag/local-search` with JSON `{ "query": "..." }`
- `POST /api/agentos/rag/graphrag/global-search` with JSON `{ "query": "..." }`
- `GET /api/agentos/rag/graphrag/stats`

Troubleshooting updates:

- If you see logs like: `Skipping update for document '...' because previous contribution records are missing`, you upgraded from an older GraphRAG persistence format.
  - Fix: rebuild the GraphRAG index by clearing GraphRAG tables (prefix `AGENTOS_GRAPHRAG_TABLE_PREFIX`, default `rag_graphrag_`) and re-ingesting documents.

#### HITL Webhooks

When HITL is enabled (`AGENTOS_HITL_ENABLED=true`), tools with `hasSideEffects=true` will pause for approval.

If `AGENTOS_HITL_WEBHOOK_URL` is set, the backend sends a POST to each URL with JSON:

```json
{
  "notification": { "type": "approval_required", "requestId": "..." },
  "request": { "actionId": "...", "severity": "high", "title": "...", "description": "..." }
}
```

If `AGENTOS_HITL_WEBHOOK_SECRET` is set, outbound webhooks include `x-agentos-hitl-signature` (HMAC-SHA256 of `${timestampMs}.${rawBody}`) and decision endpoints require `x-agentos-hitl-secret`.

#### Multimodal RAG (Image + Audio)

Multimodal ingestion stores asset metadata (and optionally raw bytes) and indexes a derived text representation as a normal RAG document. Query-by-image can either caption the query image (LLM vision) or use offline CLIP-style image embeddings when enabled.

| Variable                                          | Description                                                                            |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `AGENTOS_RAG_MEDIA_STORE_PAYLOAD`                 | Store raw bytes (base64) for ingested assets (`true`/`false`). Default: `false`.       |
| `AGENTOS_RAG_MEDIA_IMAGE_COLLECTION_ID`           | Collection ID for image assets (default: `media_images`).                              |
| `AGENTOS_RAG_MEDIA_AUDIO_COLLECTION_ID`           | Collection ID for audio assets (default: `media_audio`).                               |
| `AGENTOS_RAG_MEDIA_IMAGE_LLM_PROVIDER`            | Provider used for image captioning (`openai`/`openrouter`). Default: `openai`.         |
| `AGENTOS_RAG_MEDIA_IMAGE_LLM_MODEL`               | Model used for image captioning (default: `gpt-4o-mini`).                              |
| `AGENTOS_RAG_MEDIA_IMAGE_EMBEDDINGS_ENABLED`      | Enable offline image-to-image retrieval embeddings (`true`/`false`). Default: `false`. |
| `AGENTOS_RAG_MEDIA_IMAGE_EMBED_MODEL`             | Transformers.js image embedding model ID (default: `Xenova/clip-vit-base-patch32`).    |
| `AGENTOS_RAG_MEDIA_IMAGE_EMBED_COLLECTION_SUFFIX` | Suffix appended to base image collections for embedding vectors (default: `_img`).     |
| `AGENTOS_RAG_MEDIA_IMAGE_EMBED_CACHE_DIR`         | Optional Transformers.js cache directory for model files (recommended for servers).    |
| `AGENTOS_RAG_MEDIA_AUDIO_EMBEDDINGS_ENABLED`      | Enable offline audio-to-audio retrieval embeddings (`true`/`false`). Default: `false`. |
| `AGENTOS_RAG_MEDIA_AUDIO_EMBED_MODEL`             | Transformers.js audio embedding model ID (default: `Xenova/clap-htsat-unfused`).       |
| `AGENTOS_RAG_MEDIA_AUDIO_EMBED_COLLECTION_SUFFIX` | Suffix appended to base audio collections for embedding vectors (default: `_aud`).     |
| `AGENTOS_RAG_MEDIA_AUDIO_EMBED_CACHE_DIR`         | Optional Transformers.js cache directory for model files (recommended for servers).    |

Offline image/audio embeddings require installing Transformers.js (optional): `@huggingface/transformers` (preferred) or `@xenova/transformers`.
Audio embeddings are WAV-only on Node for now (no ffmpeg); install `wavefile` (optional) and send `audio/wav` payloads for embedding-based retrieval.

### Wunderland Vector Memory (Optional)

Wunderland seed-memory uses AgentOS `RetrievalAugmentor` + a configurable vector store. Default is local SQL persistence; Qdrant is optional for scale.

| Variable                                      | Description                                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `WUNDERLAND_MEMORY_PRESET`                    | `fast` (dense), `balanced` (hybrid), `accurate` (hybrid + rerank). Default: `balanced`.                                                                      |
| `WUNDERLAND_MEMORY_HYBRID_ALPHA`              | Hybrid dense weight (0..1). Default: `0.7`.                                                                                                                  |
| `WUNDERLAND_MEMORY_EMBED_PROVIDER`            | Force embeddings provider: `ollama`, `openai`, `openrouter` (optional).                                                                                      |
| `WUNDERLAND_MEMORY_EMBED_MODEL`               | Force embeddings model ID (optional).                                                                                                                        |
| `WUNDERLAND_MEMORY_OLLAMA_REQUEST_TIMEOUT_MS` | Ollama connect timeout (ms). Also accepts `OLLAMA_REQUEST_TIMEOUT_MS`. Default: `5000`.                                                                      |
| `WUNDERLAND_MEMORY_VECTOR_PROVIDER`           | Vector store provider: `sql` (default) or `qdrant` (optional).                                                                                               |
| `WUNDERLAND_MEMORY_QDRANT_URL`                | Qdrant base URL when `WUNDERLAND_MEMORY_VECTOR_PROVIDER=qdrant`. Also accepts `QDRANT_URL`.                                                                  |
| `WUNDERLAND_MEMORY_QDRANT_API_KEY`            | Optional Qdrant API key. Also accepts `QDRANT_API_KEY`.                                                                                                      |
| `WUNDERLAND_MEMORY_QDRANT_TIMEOUT_MS`         | Qdrant request timeout (ms). Also accepts `QDRANT_TIMEOUT_MS`. Default: `15000`.                                                                             |
| `WUNDERLAND_MEMORY_QDRANT_ENABLE_BM25`        | Enable BM25 sparse vectors + hybrid fusion in Qdrant (`true`/`false`). Default: `true`.                                                                      |
| `WUNDERLAND_MEMORY_VECTOR_DB_PATH`            | SQL vector DB path for seed-memory when using `sql` provider (default: `./db_data/wunderland_memory_vectors.db`). Set to empty string for in-memory (tests). |
| `WUNDERLAND_MEMORY_VECTOR_DB_URL`             | Optional Postgres connection string for seed-memory when using `sql` provider.                                                                               |

### Qdrant Local Dev (Optional)

If you set `AGENTOS_RAG_VECTOR_PROVIDER=qdrant` or `WUNDERLAND_MEMORY_VECTOR_PROVIDER=qdrant`, you can run Qdrant locally:

```bash
pnpm dev:qdrant:up
pnpm dev:qdrant:logs
```

Shutdown:

```bash
pnpm dev:qdrant:down
```

## 5. LLM Providers

| Variable             | Description                                             |
| -------------------- | ------------------------------------------------------- |
| `OPENAI_API_KEY`     | Required for GPT and Whisper features.                  |
| `OPENROUTER_API_KEY` | Optional additional model access.                       |
| `ANTHROPIC_API_KEY`  | Optional Claude support.                                |
| `MODEL_PREF_*`       | Default model routing per feature (see `.env.example`). |

## 6. Storage & Database

| Variable               | Description                                                   |
| ---------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string (production).                    |
| `DB_CLIENT`            | `postgresql` or `sqlite`.                                     |
| `ENABLE_SQLITE_MEMORY` | Set to `true` to run SQLite in memory for ephemeral sessions. |

`app_users` now includes a `supabase_user_id` column. Run the provided migration or ensure the column exists before enabling Supabase in production.

## 7. Frontend Environment

Create `frontend/.env` or `frontend/.env.local` for Vite-specific settings:

```bash
VITE_API_BASE_URL=http://localhost:3001/api
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_LEMONSQUEEZY_BASIC_PRODUCT_ID=
VITE_LEMONSQUEEZY_BASIC_VARIANT_ID=
VITE_LEMONSQUEEZY_CREATOR_PRODUCT_ID=
VITE_LEMONSQUEEZY_CREATOR_VARIANT_ID=
VITE_LEMONSQUEEZY_ORG_PRODUCT_ID=
VITE_LEMONSQUEEZY_ORG_VARIANT_ID=
VITE_STRIPE_BASIC_PRICE_ID=
VITE_STRIPE_CREATOR_PRICE_ID=
VITE_STRIPE_ORG_PRICE_ID=
VITE_AGENTOS_BASE_URL=/api/agentos        # leave empty to reuse the proxy base
VITE_AGENTOS_ENABLED=false
VITE_AGENTOS_CLIENT_MODE=proxy # proxy keeps /api/chat, direct hits /api/agentos/*
VITE_AGENTOS_CHAT_PATH=/agentos/chat
VITE_AGENTOS_STREAM_PATH=/agentos/stream
VITE_AGENTOS_WORKFLOW_DEFINITIONS_PATH=/workflows/definitions
VITE_AGENTOS_PERSONAS_PATH=/personas
VITE_AGENTOS_WITH_CREDENTIALS=true
VITE_AGENTOS_WORKBENCH_USER_ID=agentos-workbench-user
```

Restart `npm run dev` after editing Vite environment files.

- The AgentOS workbench (`apps/agentos-workbench`) inherits these `VITE_AGENTOS_*` keys. Leave `VITE_AGENTOS_BASE_URL` blank to use the backend proxy (`/api/agentos`) or point it directly at a remote AgentOS deployment.
- `VITE_AGENTOS_WITH_CREDENTIALS` controls whether the EventSource includes cookies—set it to `false` when proxying across origins without session auth.

## 8. Rate Limiting & Demo Mode

- Anonymous users hit `/api/rate-limit/status` to display remaining credits.
- Authenticated users bypass the demo limits and may receive per-plan limits from Lemon Squeezy metadata.

The backend honours:

| Variable                              | Description                                |
| ------------------------------------- | ------------------------------------------ |
| `RATE_LIMIT_PUBLIC_DAILY`             | Daily requests per IP for the public demo. |
| `GLOBAL_COST_THRESHOLD_USD_PER_MONTH` | Safety valve for total spend.              |

## 9. Voice, Audio & Speech

See `.env.example` for toggles such as `DEFAULT_SPEECH_PREFERENCE_STT`, `DEFAULT_SPEECH_PREFERENCE_TTS_PROVIDER`, and advanced audio processing flags. All defaults are tuned for local development.

### Speech credits & automatic fallbacks

- `CREDITS_PUBLIC_SPEECH_DAILY_USD`, `CREDITS_METERED_SPEECH_DAILY_USD`, `CREDITS_GLOBAL_SPEECH_DAILY_USD` &mdash; Daily OpenAI Whisper/TTS budgets (USD) for demo, subscriber, and global cohorts.
- `CREDITS_PUBLIC_LLM_DAILY_USD`, `CREDITS_METERED_LLM_DAILY_USD`, `CREDITS_GLOBAL_LLM_DAILY_USD` &mdash; Companion daily budgets for LLM completions. Unlimited plans ignore these caps.
- When the speech allowance hits zero the backend returns `SPEECH_CREDITS_EXHAUSTED`; the client switches to browser STT/TTS, shows a toast, and keeps interaction uninterrupted until credits reset.

## 10. Troubleshooting Checklist

- **Auth errors**: Confirm `GLOBAL_ACCESS_PASSWORD` or Supabase credentials and ensure clocks are in sync when using Supabase JWTs.
- **Billing webhooks**: Use the Lemon Squeezy dashboard to resend events if subscriptions are not updating. Verify the webhook secret and public URL.
- **Demo banner missing**: The frontend requires the backend `/api/rate-limit/status` endpoint and `optionalAuth` middleware to be running.
- **Supabase OAuth redirect loops**: Confirm the redirect URL matches your frontend origin including protocol and port.

For more operational notes and deployment tips, review [`PRODUCTION_SETUP.md`](PRODUCTION_SETUP.md) and the architecture document.

## 11. AgentOS Experimental Integration

| Variable                                 | Description                                                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `AGENTOS_ENABLED`                        | Enable the embedded AgentOS router (`/api/agentos/*`). Defaults to `false`.                                 |
| `AGENTOS_ENABLE_PERSISTENCE`             | Persist AgentOS conversations via the shared app database (`true`/`false`).                                 |
| `AGENTOS_DEFAULT_PERSONA_ID`             | Fallback persona ID when the client does not specify one.                                                   |
| `AGENTOS_DEFAULT_MODEL_ID`               | Preferred model ID for AgentOS orchestrations (e.g., `gpt-4o-mini`).                                        |
| `AGENTOS_API_KEY_ENCRYPTION_KEY_HEX`     | 64-character hex string used by the internal API-key vault stub.                                            |
| `AGENTOS_DATABASE_URL`                   | SQLite connection string used by the AgentOS persistence stub.                                              |
| `AGENTOS_MAX_TOOL_CALL_ITERATIONS`       | Safeguard for chained tool invocations per turn.                                                            |
| `AGENTOS_MAX_CONCURRENT_STREAMS`         | Streaming fan-out limit for SSE responses.                                                                  |
| `AGENTOS_TURN_TIMEOUT_MS`                | Timeout applied to a single AgentOS turn before failover.                                                   |
| `AGENTOS_STREAM_INACTIVITY_TIMEOUT_MS`   | Idle timeout for SSE clients.                                                                               |
| `AGENTOS_PERSONA_PATH`                   | Optional override to load persona definitions from a custom directory.                                      |
| `PERSONA_DEFINITIONS_PATH`               | Path used by the voice UI stack to discover persona JSON files (defaults to `./backend/agentos/...`).       |
| `AGENTOS_PROVENANCE_ENABLED`             | Enable provenance/audit hooks for AgentOS persistence (`true`/`false`). Requires persistence.               |
| `AGENTOS_PROVENANCE_PROFILE`             | Provenance preset: `mutable-dev` (default), `revisioned-verified`, `sealed-autonomous`, `sealed-auditable`. |
| `AGENTOS_PROVENANCE_AGENT_ID`            | Signing identity for provenance events (default: `voice-chat-assistant`).                                   |
| `AGENTOS_PROVENANCE_TABLE_PREFIX`        | Prefix for provenance tables (default: `agentos_`).                                                         |
| `AGENTOS_PROVENANCE_SIGNATURE_MODE`      | `every-event` (default) or `anchor-only`.                                                                   |
| `AGENTOS_PROVENANCE_PRIVATE_KEY_BASE64`  | Optional Ed25519 private key (base64) for stable signing across restarts.                                   |
| `AGENTOS_PROVENANCE_PUBLIC_KEY_BASE64`   | Optional Ed25519 public key (base64). Required when importing a private key.                                |
| `AGENTOS_PROVENANCE_ANCHOR_TYPE`         | External anchor target type (`none` default; e.g. `rekor`, `ethereum`, `opentimestamps`).                   |
| `AGENTOS_PROVENANCE_ANCHOR_ENDPOINT`     | Optional endpoint (e.g. Rekor server URL or Ethereum RPC URL).                                              |
| `AGENTOS_PROVENANCE_ANCHOR_OPTIONS_JSON` | JSON string forwarded to the anchor provider factory as `options`.                                          |
| `AGENTOS_PROVENANCE_ANCHOR_INTERVAL_MS`  | Anchor interval in ms (default `0` = disabled).                                                             |
| `AGENTOS_PROVENANCE_ANCHOR_BATCH_SIZE`   | Minimum events per anchor batch (default `50`).                                                             |

> AgentOS persistence in this monorepo uses the shared app database (SQLite by default). Enable it with `AGENTOS_ENABLE_PERSISTENCE=true` and ensure the backend calls `initializeAppDatabase()` during startup.

## 12. Frame.dev & Codex Analytics (Optional)

The `apps/frame.dev` Next.js site (which hosts the Frame Codex viewer) supports optional, anonymous analytics. These are **off by default** and only enabled when the environment variables below are set.

> Analytics are implemented in `apps/frame.dev/components/Analytics.tsx` and documented in `apps/frame.dev/ENV_VARS.md`. The `/privacy` route in the Frame.dev app describes the data handling and GDPR compliance in human-readable form.

| Variable                         | Description                                                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`  | **Optional.** Google Analytics 4 measurement ID (e.g. `G-XXXXXXX`). IP anonymization is enabled, Google Signals and ad personalization are disabled. |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | **Optional.** Microsoft Clarity project ID used for anonymous UX heatmaps and session recordings with masked inputs.                                 |

Notes:

- If these values are **unset**, no analytics scripts are loaded at all.
- If the browser sends a `Do Not Track` signal (`DNT: 1`), the Analytics component will respect it and skip initialization even when IDs are present.
- These variables are **frontend-only** and safe to expose because they are purely identifiers, not secrets.

## 13. GitHub Actions CI/CD Secrets

The monorepo uses GitHub Actions for CI/CD. Configure these secrets in your repository settings under **Settings → Secrets and variables → Actions**.

### Required Secrets

| Secret            | Description                                                                                                                                                                                | Used By                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `GH_PAT`          | GitHub Personal Access Token with `repo` scope. Required for cloning private submodules in CI. Create at [github.com/settings/tokens](https://github.com/settings/tokens/new?scopes=repo). | CodeQL, Codex Auto-Index, all workflows with submodules |
| `SSH_PRIVATE_KEY` | OpenSSH private key for deployment server access. Must start with `BEGIN OPENSSH PRIVATE KEY`.                                                                                             | deploy-ssh.yml                                          |
| `LINODE_HOST`     | Hostname or IP of the deployment server.                                                                                                                                                   | deploy-ssh.yml                                          |
| `LINODE_USER`     | SSH username for deployment server.                                                                                                                                                        | deploy-ssh.yml                                          |
| `NPM_TOKEN`       | npm access token for publishing packages. Create at [npmjs.com/settings/tokens](https://www.npmjs.com/settings/~/tokens).                                                                  | publish-agentos.yml, publish-sql-storage-adapter.yml    |

### Mirror Workflow Secrets (for public repo mirrors)

These are **optional** and only needed if you want to mirror subpackages to separate public repositories.

| Secret                           | Description                                             | Used By                    |
| -------------------------------- | ------------------------------------------------------- | -------------------------- |
| `FRAME_DEV_MIRROR_SSH_KEY`       | Deploy key with write access to `framersai/frame.dev`.  | mirror-frame-dev.yml       |
| `AGENTOS_MIRROR_SSH_KEY`         | Deploy key with write access to `framersai/agentos`.    | mirror-agentos.yml         |
| `AGENTOS_LANDING_MIRROR_SSH_KEY` | Deploy key with write access to `framersai/agentos.sh`. | mirror-agentos-landing.yml |

### Creating Deploy Keys for Mirrors

For each mirror workflow:

1. Generate a new SSH key pair:
   ```bash
   ssh-keygen -t ed25519 -C "deploy-key-mirror" -f mirror-key -N ""
   ```
2. Add the **public key** (`mirror-key.pub`) as a deploy key in the target repository (Settings → Deploy keys → Add deploy key) with **write access**.
3. Add the **private key** (`mirror-key`) as a secret in the voice-chat-assistant repository.

### GH_PAT Permissions

Your `GH_PAT` token needs these scopes:

- `repo` – Full control of private repositories (required for submodule access)
- `workflow` – Update GitHub Action workflows (optional, for workflow updates)

### Submodule Repositories

The monorepo references these submodule repositories under the `framersai` organization:

| Submodule                      | Repository                      | Visibility                   |
| ------------------------------ | ------------------------------- | ---------------------------- |
| `packages/agentos`             | `framersai/agentos`             | Private                      |
| `packages/agentos-extensions`  | `framersai/agentos-extensions`  | Private                      |
| `packages/sql-storage-adapter` | `framersai/sql-storage-adapter` | Private                      |
| `apps/frame.dev`               | `framersai/frame.dev`           | Private (mirrored to public) |
| `apps/agentos.sh`              | `framersai/agentos.sh`          | Private                      |
| `apps/agentos-workbench`       | `framersai/agentos-workbench`   | Private                      |
| `apps/codex`                   | `framersai/codex`               | Public                       |

**Important:** Ensure your `GH_PAT` has access to all private repositories in the `framersai` organization, or the CI workflows will fail to clone submodules.
