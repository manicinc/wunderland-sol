import test from 'node:test';
import assert from 'node:assert/strict';
import { ragService } from '../integrations/agentos/agentos.rag.service.js';

test('GraphRAG updates when re-ingesting the same documentId with different content', async () => {
  // Ensure a clean store for this test run.
  await ragService.shutdown();

  // Force an in-memory SQLite database for deterministic tests.
  process.env.RAG_DATABASE_PATH = '';
  process.env.RAG_STORAGE_PRIORITY = 'sqljs';
  process.env.AGENTOS_RAG_VECTOR_PROVIDER = 'sql';

  // Enable GraphRAG but keep it fully offline: no embeddings providers, no LLM summaries.
  process.env.AGENTOS_GRAPHRAG_ENABLED = 'true';
  process.env.AGENTOS_GRAPHRAG_LLM_ENABLED = 'false';
  process.env.AGENTOS_GRAPHRAG_ENTITY_EMBEDDINGS = 'false';

  // Avoid any real network calls in this unit test.
  process.env.OPENAI_API_KEY = '';
  process.env.OPENROUTER_API_KEY = '';
  process.env.OLLAMA_ENABLED = 'false';
  process.env.OLLAMA_BASE_URL = '';
  process.env.OLLAMA_HOST = '';
  process.env.OLLAMA_MODEL = '';

  const documentId = `test_graphrag_doc_${Date.now()}`;

  const ingest1 = await ragService.ingestDocument({
    documentId,
    content: 'Alice works at Acme Corporation.',
    collectionId: 'default',
    category: 'knowledge_base',
    metadata: { test: true, kind: 'unit_test' },
  });
  assert.equal(ingest1.success, true);

  const before = await ragService.graphRagLocalSearch('Alice');
  assert.equal(
    before.entities.some((e) => e.name === 'Alice'),
    true
  );

  const ingest2 = await ragService.ingestDocument({
    documentId,
    content: 'Bob studies at Beta University.',
    collectionId: 'default',
    category: 'knowledge_base',
    metadata: { test: true, kind: 'unit_test' },
  });
  assert.equal(ingest2.success, true);

  const afterAlice = await ragService.graphRagLocalSearch('Alice');
  assert.equal(
    afterAlice.entities.some((e) => e.name === 'Alice'),
    false
  );

  const afterBob = await ragService.graphRagLocalSearch('Bob');
  assert.equal(
    afterBob.entities.some((e) => e.name === 'Bob'),
    true
  );

  await ragService.shutdown();
});
