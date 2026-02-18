import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeAppDatabase,
  closeAppDatabase,
  __setAppDatabaseAdapterResolverForTests,
} from '../core/database/appDatabase.js';
import { ragService } from '../integrations/agentos/agentos.rag.service.js';
import { addMemoryRedaction } from '../integrations/agentos/agentos.memory-redactions.service.js';
import { createLongTermMemoryRetriever } from '../integrations/agentos/agentos.long-term-memory-retriever.js';

async function setupDb(): Promise<void> {
  await closeAppDatabase();
  __setAppDatabaseAdapterResolverForTests(async () => {
    const { resolveStorageAdapter } = await import('@framers/sql-storage-adapter');
    return await resolveStorageAdapter({
      priority: ['sqljs'],
      // Force in-memory sql.js mode (disable fs-backed persistence).
      openOptions: { filePath: '' },
    } as any);
  });
  await initializeAppDatabase();
}

test('Long-term memory retrieval filters redacted rolling-memory hashes (soft forget)', async () => {
  await setupDb();

  const userId = `test_user_${Date.now()}`;
  const redactedHash = 'deadbeefdeadbeef';
  const keepHash = 'beadfeedbeadfeed';

  await addMemoryRedaction({
    scope: 'user',
    userId,
    memoryHash: redactedHash,
    reason: 'agent-forget-test',
    actorType: 'agent',
    actorId: 'agent:test',
  });

  const originalQuery = ragService.query;
  try {
    (ragService as any).query = async () =>
      ({
        chunks: [
          {
            score: 0.99,
            metadata: {
              kind: 'rolling_memory_item',
              scope: 'user',
              userId,
              category: 'facts',
              text: 'SECRET SHOULD NOT SHOW',
              hash: redactedHash,
            },
          },
          {
            score: 0.95,
            metadata: {
              kind: 'rolling_memory_item',
              scope: 'user',
              userId,
              category: 'facts',
              text: 'KEEP THIS',
              hash: keepHash,
            },
          },
        ],
      }) as any;

    const retriever = createLongTermMemoryRetriever();
    const result = await retriever.retrieveLongTermMemory({
      queryText: 'hello',
      userId,
      personaId: 'v_researcher',
      organizationId: null as any,
      memoryPolicy: {
        enabled: true,
        scopes: { user: true, persona: false, organization: false },
        allowedCategories: ['facts'],
      },
      topKByScope: { user: 10 },
      maxContextChars: 4000,
    } as any);

    assert.ok(result, 'expected non-null retrieval result');
    assert.ok(result.contextText.includes('KEEP THIS'), 'expected non-redacted item to appear');
    assert.equal(
      result.contextText.includes('SECRET SHOULD NOT SHOW'),
      false,
      'expected redacted item to be filtered'
    );
  } finally {
    (ragService as any).query = originalQuery;
  }
});
