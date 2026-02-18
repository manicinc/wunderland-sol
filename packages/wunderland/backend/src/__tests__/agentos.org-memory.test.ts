import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeAppDatabase,
  closeAppDatabase,
  getAppDatabase,
  __setAppDatabaseAdapterResolverForTests,
} from '../core/database/appDatabase.js';
import { sqlKnowledgeBaseService } from '../core/knowledge/SqlKnowledgeBaseService.js';
import { createRollingSummaryMemorySink } from '../integrations/agentos/agentos.rolling-memory-sink.js';
import {
  createOrganization,
  addMember,
  updateOrganizationSettings,
} from '../features/organization/organization.repository.js';

let initPromise: Promise<void> | null = null;

async function setupDb(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
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
    await sqlKnowledgeBaseService.initialize();
  })();
  return initPromise;
}

async function seedUsers(userIds: string[]): Promise<void> {
  const db = getAppDatabase();
  const now = Date.now();
  for (const userId of userIds) {
    await db.run(
      `INSERT OR IGNORE INTO app_users (id, email, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, `${userId}@example.com`, 'test_hash', now, now]
    );
  }
}

async function countOrgKnowledgeItems(orgId: string): Promise<number> {
  const db = getAppDatabase();
  const rows = await db.all<{ metadata: string | null }>(
    'SELECT metadata FROM agentos_knowledge_items'
  );
  return rows.filter((row) => {
    if (!row.metadata) return false;
    try {
      const meta = JSON.parse(row.metadata) as any;
      return meta?.scope === 'organization' && meta?.organizationId === orgId;
    } catch {
      return false;
    }
  }).length;
}

test('Org memory publishing: only org admins can write org-scoped memory', async () => {
  await setupDb();

  const adminUserId = `test_admin_${Date.now()}`;
  const builderUserId = `test_builder_${Date.now()}`;
  await seedUsers([adminUserId, builderUserId]);

  const org = await createOrganization({
    name: `Test Org ${Date.now()}`,
    ownerUserId: adminUserId,
    seatLimit: 5,
    planId: 'organization',
  });

  await addMember({ organizationId: org.id, userId: adminUserId, role: 'admin', status: 'active' });
  await addMember({
    organizationId: org.id,
    userId: builderUserId,
    role: 'builder',
    status: 'active',
  });

  const sink = createRollingSummaryMemorySink({
    persistToRag: false,
    persistToKnowledgeBase: true,
  });

  const updateBase = {
    organizationId: org.id,
    sessionId: 'session-x',
    conversationId: 'conv-x',
    personaId: 'v_researcher',
    mode: 'general',
    profileId: 'standard',
    summaryText: 'Summary',
    summaryJson: {
      facts: [{ text: 'Acme uses GitHub.', confidence: 0.9 }],
      tags: ['org'],
    },
    summaryUptoTimestamp: Date.now(),
    summaryUpdatedAt: Date.now(),
    memoryPolicy: {
      enabled: true,
      scopes: { organization: true, conversation: false, user: false, persona: false },
      shareWithOrganization: true,
      storeAtomicDocs: true,
    },
  } as any;

  await sink.upsertRollingSummaryMemory({ ...updateBase, userId: builderUserId });
  assert.equal(await countOrgKnowledgeItems(org.id), 0, 'builder should not publish org memory');

  await sink.upsertRollingSummaryMemory({ ...updateBase, userId: adminUserId });
  assert.ok(
    (await countOrgKnowledgeItems(org.id)) > 0,
    'admin should be able to publish org memory'
  );
});

test('Org memory publishing: org settings can disable writes even for admins', async () => {
  await setupDb();

  const adminUserId = `test_admin2_${Date.now()}`;
  await seedUsers([adminUserId]);

  const org = await createOrganization({
    name: `Test Org Writes Off ${Date.now()}`,
    ownerUserId: adminUserId,
    seatLimit: 5,
    planId: 'organization',
  });

  await addMember({ organizationId: org.id, userId: adminUserId, role: 'admin', status: 'active' });

  await updateOrganizationSettings(org.id, {
    memory: { longTermMemory: { enabled: true, allowWrites: false } },
  });

  const sink = createRollingSummaryMemorySink({
    persistToRag: false,
    persistToKnowledgeBase: true,
  });

  await sink.upsertRollingSummaryMemory({
    userId: adminUserId,
    organizationId: org.id,
    sessionId: 'session-y',
    conversationId: 'conv-y',
    personaId: 'v_researcher',
    mode: 'general',
    profileId: 'standard',
    summaryText: 'Summary',
    summaryJson: { facts: [{ text: 'Decision: do not persist.', confidence: 0.8 }] },
    summaryUptoTimestamp: Date.now(),
    summaryUpdatedAt: Date.now(),
    memoryPolicy: {
      enabled: true,
      scopes: { organization: true, conversation: false, user: false, persona: false },
      shareWithOrganization: true,
      storeAtomicDocs: true,
    },
  } as any);

  assert.equal(
    await countOrgKnowledgeItems(org.id),
    0,
    'org allowWrites=false should block org publishing'
  );
});
