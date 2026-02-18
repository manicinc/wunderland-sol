import test from 'node:test';
import assert from 'node:assert/strict';
import { ragService } from '../integrations/agentos/agentos.rag.service.js';

test('Multi-query retrieval merges keyword results across queryVariants', async () => {
  await ragService.shutdown();

  // Force an in-memory SQLite database for deterministic tests.
  process.env.RAG_DATABASE_PATH = '';
  process.env.RAG_STORAGE_PRIORITY = 'sqljs';
  process.env.AGENTOS_RAG_VECTOR_PROVIDER = 'sql';

  // Avoid any real network calls in this unit test.
  process.env.OPENAI_API_KEY = '';
  process.env.OPENROUTER_API_KEY = '';
  process.env.OLLAMA_ENABLED = 'false';
  process.env.OLLAMA_BASE_URL = '';
  process.env.OLLAMA_HOST = '';

  const docA = `mq_doc_a_${Date.now()}`;
  const docB = `mq_doc_b_${Date.now()}`;

  await ragService.ingestDocument({
    documentId: docA,
    collectionId: 'default',
    category: 'knowledge_base',
    content: 'alpha beta gamma',
    metadata: { test: true, kind: 'multiquery' },
    chunkingOptions: { chunkSize: 5000, chunkOverlap: 0 },
  });

  await ragService.ingestDocument({
    documentId: docB,
    collectionId: 'default',
    category: 'knowledge_base',
    content: 'delta epsilon',
    metadata: { test: true, kind: 'multiquery' },
    chunkingOptions: { chunkSize: 5000, chunkOverlap: 0 },
  });

  const result = await ragService.query({
    query: 'alpha beta gamma',
    queryVariants: ['delta epsilon'],
    collectionIds: ['default'],
    topK: 10,
    includeMetadata: false,
  });

  assert.equal(result.success, true);
  const docIds = new Set(result.chunks.map((c) => c.documentId));
  assert.ok(docIds.has(docA), 'expected results to include base-query doc');
  assert.ok(docIds.has(docB), 'expected results to include query-variant doc');

  await ragService.shutdown();
});

test('Query rewriting is best-effort and does not throw when no LLM provider is configured', async () => {
  await ragService.shutdown();

  process.env.RAG_DATABASE_PATH = '';
  process.env.RAG_STORAGE_PRIORITY = 'sqljs';
  process.env.AGENTOS_RAG_VECTOR_PROVIDER = 'sql';

  process.env.OPENAI_API_KEY = '';
  process.env.OPENROUTER_API_KEY = '';
  process.env.OLLAMA_ENABLED = 'false';
  process.env.OLLAMA_BASE_URL = '';
  process.env.OLLAMA_HOST = '';

  const docId = `mq_rewrite_${Date.now()}`;

  await ragService.ingestDocument({
    documentId: docId,
    collectionId: 'default',
    category: 'knowledge_base',
    content: 'hello world',
    metadata: { test: true, kind: 'multiquery' },
    chunkingOptions: { chunkSize: 5000, chunkOverlap: 0 },
  });

  const result = await ragService.query({
    query: 'hello world',
    rewrite: { enabled: true, maxVariants: 2 },
    collectionIds: ['default'],
    topK: 5,
    includeMetadata: false,
  });

  assert.equal(result.success, true);
  assert.ok(result.chunks.length >= 1, 'expected at least 1 chunk');
  assert.equal(result.chunks[0].documentId, docId);

  await ragService.shutdown();
});
