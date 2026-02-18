import test from 'node:test';
import assert from 'node:assert/strict';
import { ragService } from '../integrations/agentos/agentos.rag.service.js';

test('Keyword fallback uses BM25 when FTS5 is unavailable (sqljs)', async () => {
  await ragService.shutdown();

  // Force an in-memory SQLite database for deterministic tests.
  process.env.RAG_DATABASE_PATH = '';
  process.env.RAG_STORAGE_PRIORITY = 'sqljs';
  process.env.AGENTOS_RAG_VECTOR_PROVIDER = 'sql';

  // Avoid any real network calls in this unit test (embeddings are best-effort).
  process.env.OPENAI_API_KEY = '';
  process.env.OPENROUTER_API_KEY = '';
  process.env.OLLAMA_ENABLED = 'false';
  process.env.OLLAMA_BASE_URL = '';
  process.env.OLLAMA_HOST = '';

  const shortDocId = `bm25_short_${Date.now()}`;
  const longDocId = `bm25_long_${Date.now()}`;

  const query = 'alpha beta gamma';
  const filler = Array.from({ length: 700 }, (_v, i) => `filler${i}`).join(' ');

  await ragService.ingestDocument({
    documentId: shortDocId,
    collectionId: 'default',
    category: 'knowledge_base',
    content: 'alpha beta gamma',
    metadata: { test: true, kind: 'bm25' },
    chunkingOptions: { chunkSize: 5000, chunkOverlap: 0 },
  });

  await ragService.ingestDocument({
    documentId: longDocId,
    collectionId: 'default',
    category: 'knowledge_base',
    content: `alpha beta gamma ${filler}`,
    metadata: { test: true, kind: 'bm25' },
    chunkingOptions: { chunkSize: 5000, chunkOverlap: 0 },
  });

  const result = await ragService.query({
    query,
    collectionIds: ['default'],
    topK: 5,
    includeMetadata: false,
  });

  assert.equal(result.success, true);
  assert.ok(result.chunks.length >= 2, 'expected at least 2 chunks');
  assert.equal(result.chunks[0].documentId, shortDocId);

  const shortScore = result.chunks.find((c) => c.documentId === shortDocId)?.score ?? 0;
  const longScore = result.chunks.find((c) => c.documentId === longDocId)?.score ?? 0;
  assert.ok(shortScore > longScore, 'expected BM25 to favor the shorter document');

  await ragService.shutdown();
});
