# @framers/agentos-ext-http-api

Host-agnostic Express routers for exposing AgentOS HTTP APIs.

This package intentionally contains **no server bootstrap** code. It only exports router factory
functions which accept injected dependencies so you can mount them in any host app (NestJS,
Express, Fastify via adapters, etc).

## What it provides

- RAG HTTP API router (dense + hybrid + optional GraphRAG)
- Multimodal RAG endpoints (image/audio ingest + query-by-image/audio)
- HITL (Human-in-the-Loop) approval/clarification router

RAG query extras supported by the wire types:

- `strategy=mmr` (+ `strategyParams`) for diversification
- `queryVariants` for multi-query retrieval (merge + dedupe)
- `rewrite` for best-effort LLM query rewriting (host-dependent)

## Usage (example)

```ts
import express from 'express';
import { createAgentOSRagRouter, createAgentOSHITLRouter } from '@framers/agentos-ext-http-api';

const app = express();
app.use(express.json());

app.use(
  '/api/agentos/rag',
  createAgentOSRagRouter({
    isEnabled: () => true,
    ragService,
  })
);

app.use(
  '/api/agentos/hitl',
  createAgentOSHITLRouter({
    getHitlManager,
    hitlAuthRequired,
  })
);
```

Query example:

```ts
await fetch('http://localhost:3001/api/agentos/rag/query', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    query: 'how do org admins write org memory',
    queryVariants: ['organization memory publish admin only'],
    rewrite: { enabled: true, maxVariants: 2 },
    preset: 'balanced',
    topK: 8,
    includeMetadata: true,
  }),
});
```
