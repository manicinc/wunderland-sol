import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeAppDatabase,
  closeAppDatabase,
  getAppDatabase,
  __setAppDatabaseAdapterResolverForTests,
} from '../core/database/appDatabase.js';
import { DatabaseService } from '../database/database.service.js';
import { AgentRegistryService } from '../modules/wunderland/agent-registry/agent-registry.service.js';
import { CredentialsService } from '../modules/wunderland/credentials/credentials.service.js';
import {
  AgentImmutableException,
  AgentToolsetUnresolvedException,
} from '../modules/wunderland/wunderland.exceptions.js';

async function initInMemoryDb(): Promise<void> {
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

async function seedUserAndAgent({
  userId,
  seedId,
  capabilities,
}: {
  userId: string;
  seedId: string;
  capabilities: string[];
}): Promise<void> {
  const db = getAppDatabase();
  const now = Date.now();

  await db.run(
    `INSERT OR IGNORE INTO app_users (id, email, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, `${userId}@example.com`, 'test_hash', now, now]
  );

  await db.run(
    `
      INSERT INTO wunderland_agents (
        seed_id,
        owner_user_id,
        display_name,
        bio,
        avatar_url,
        hexaco_traits,
        security_profile,
        inference_hierarchy,
        step_up_auth_config,
        base_system_prompt,
        allowed_tool_ids,
        genesis_event_id,
        public_key,
        storage_policy,
        sealed_at,
        provenance_enabled,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      seedId,
      userId,
      'Test Agent',
      'Bio',
      null,
      JSON.stringify({}),
      JSON.stringify({ storagePolicy: 'sealed' }),
      JSON.stringify({ profile: 'default' }),
      null,
      'You are helpful.',
      JSON.stringify(capabilities),
      null,
      null,
      'sealed',
      null,
      0,
      'active',
      now,
      now,
    ]
  );
}

describe('Wunderland immutability: DB-backed integration', () => {
  test('sealAgent persists toolset manifest + hash and flips sealed_at', async () => {
    await initInMemoryDb();

    const userId = `user_${Date.now()}`;
    const seedId = `agent_${Date.now()}`;
    await seedUserAndAgent({ userId, seedId, capabilities: ['web-search'] });

    const dbService = new DatabaseService();
    const registry = new AgentRegistryService(dbService as any);

    const result = await registry.sealAgent(userId, seedId);
    assert.equal(result.seedId, seedId);
    assert.equal(result.sealed, true);
    assert.equal(typeof result.sealedAt, 'string');

    const db = getAppDatabase();
    const row = await db.get<any>(
      `SELECT sealed_at, toolset_hash, toolset_manifest_json
         FROM wunderland_agents
        WHERE seed_id = ?
        LIMIT 1`,
      [seedId]
    );
    assert.ok(row, 'expected agent row to exist');
    assert.equal(typeof row.sealed_at, 'number');
    assert.equal(typeof row.toolset_hash, 'string');
    assert.match(String(row.toolset_hash), /^[0-9a-f]{64}$/);
    assert.equal(typeof row.toolset_manifest_json, 'string');

    const manifest = JSON.parse(String(row.toolset_manifest_json));
    assert.equal(manifest.schemaVersion, 1);
    assert.deepEqual(manifest.capabilities, ['web-search']);
    assert.deepEqual(manifest.unresolvedCapabilities, []);
    assert.ok(Array.isArray(manifest.resolvedExtensions));
    assert.ok(manifest.resolvedExtensions.length >= 1);
  });

  test('sealAgent rejects unresolved capabilities and does not update sealed_at', async () => {
    await initInMemoryDb();

    const userId = `user_${Date.now()}`;
    const seedId = `agent_${Date.now()}`;
    await seedUserAndAgent({ userId, seedId, capabilities: ['made_up_tool_abc123'] });

    const dbService = new DatabaseService();
    const registry = new AgentRegistryService(dbService as any);

    await assert.rejects(
      () => registry.sealAgent(userId, seedId),
      (err: any) => {
        assert.ok(err instanceof AgentToolsetUnresolvedException);
        return true;
      }
    );

    const db = getAppDatabase();
    const row = await db.get<any>(
      `SELECT sealed_at, toolset_hash, toolset_manifest_json
         FROM wunderland_agents
        WHERE seed_id = ?
        LIMIT 1`,
      [seedId]
    );
    assert.ok(row, 'expected agent row to exist');
    assert.equal(row.sealed_at, null);
    assert.equal(row.toolset_hash, null);
    assert.equal(row.toolset_manifest_json, null);
  });

  test('credential rotation is allowed after sealing but create/delete are blocked', async () => {
    await initInMemoryDb();

    const userId = `user_${Date.now()}`;
    const seedId = `agent_${Date.now()}`;
    await seedUserAndAgent({ userId, seedId, capabilities: ['web-search'] });

    const dbService = new DatabaseService();
    const registry = new AgentRegistryService(dbService as any);
    const credentials = new CredentialsService(dbService as any);

    const created = await credentials.createCredential(userId, {
      seedId,
      type: 'openai_api_key',
      label: 'OpenAI',
      value: 'sk-test-0000',
    } as any);

    await registry.sealAgent(userId, seedId);

    const rotated = await credentials.rotateCredential(userId, created.credential.credentialId, {
      value: 'sk-test-9999',
    } as any);
    assert.ok(rotated.credential.maskedValue.endsWith('9999'));

    await assert.rejects(
      () =>
        credentials.createCredential(userId, {
          seedId,
          type: 'another_key',
          label: 'Another',
          value: 'secret',
        } as any),
      (err: any) => {
        assert.ok(err instanceof AgentImmutableException);
        return true;
      }
    );

    await assert.rejects(
      () => credentials.deleteCredential(userId, created.credential.credentialId),
      (err: any) => {
        assert.ok(err instanceof AgentImmutableException);
        return true;
      }
    );
  });
});
