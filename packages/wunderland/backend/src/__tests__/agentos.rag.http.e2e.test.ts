import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentOSRagRouter } from '@framers/agentos-ext-http-api';
import { ragService } from '../integrations/agentos/agentos.rag.service.js';

function getPostHandler(router: any, path: string): any {
  const layer = (router?.stack ?? []).find(
    (l: any) => l?.route?.path === path && l?.route?.methods?.post
  );
  const handle = layer?.route?.stack?.[layer.route.stack.length - 1]?.handle;
  if (typeof handle !== 'function') {
    throw new Error(`POST handler not found for route: ${path}`);
  }
  return handle;
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

test('RAG HTTP ingest + multi-query query works end-to-end (no embeddings)', async () => {
  await ragService.shutdown();

  // Force an in-memory SQLite database for deterministic tests.
  process.env.RAG_DATABASE_PATH = '';
  process.env.RAG_STORAGE_PRIORITY = 'sqljs';
  process.env.AGENTOS_RAG_VECTOR_PROVIDER = 'sql';

  // Avoid any real network calls in this integration test.
  process.env.OPENAI_API_KEY = '';
  process.env.OPENROUTER_API_KEY = '';
  process.env.OLLAMA_ENABLED = 'false';
  process.env.OLLAMA_BASE_URL = '';
  process.env.OLLAMA_HOST = '';

  const router = createAgentOSRagRouter({
    isEnabled: () => true,
    ragService: ragService as any,
  });
  const ingestHandler = getPostHandler(router, '/ingest');
  const queryHandler = getPostHandler(router, '/query');

  try {
    const docA = `http_mq_a_${Date.now()}`;
    const docB = `http_mq_b_${Date.now()}`;

    {
      const req: any = {
        documentId: docA,
        collectionId: 'default',
        category: 'knowledge_base',
        content: 'alpha beta gamma',
        chunkingOptions: { chunkSize: 5000, chunkOverlap: 0 },
      };
      const res = createMockRes();
      await ingestHandler({ body: req } as any, res, (err: any) => {
        if (err) throw err;
      });

      assert.equal(res.statusCode, 201);
      const ingestAJson = res.body as any;
      assert.equal(ingestAJson.success, true);
      assert.equal(ingestAJson.documentId, docA);
    }

    {
      const req: any = {
        documentId: docB,
        collectionId: 'default',
        category: 'knowledge_base',
        content: 'delta epsilon',
        chunkingOptions: { chunkSize: 5000, chunkOverlap: 0 },
      };
      const res = createMockRes();
      await ingestHandler({ body: req } as any, res, (err: any) => {
        if (err) throw err;
      });

      assert.equal(res.statusCode, 201);
      const ingestBJson = res.body as any;
      assert.equal(ingestBJson.success, true);
      assert.equal(ingestBJson.documentId, docB);
    }

    {
      const req: any = {
        query: 'alpha beta gamma',
        queryVariants: ['delta epsilon'],
        collectionIds: ['default'],
        topK: 10,
        includeMetadata: false,
      };
      const res = createMockRes();
      await queryHandler({ body: req } as any, res, (err: any) => {
        if (err) throw err;
      });

      assert.equal(res.statusCode, 200);
      const queryJson = res.body as any;
      assert.equal(queryJson.success, true);
      const docIds = new Set((queryJson.chunks ?? []).map((c: any) => c.documentId));
      assert.ok(docIds.has(docA), 'expected results to include base-query doc');
      assert.ok(docIds.has(docB), 'expected results to include query-variant doc');
    }
  } finally {
    await ragService.shutdown();
  }
});
