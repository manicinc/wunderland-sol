import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { AgentRegistryService } from '../modules/wunderland/agent-registry/agent-registry.service.js';
import { AgentToolsetUnresolvedException } from '../modules/wunderland/wunderland.exceptions.js';

function createMockDb(agent: any) {
  let lastRun: { sql: string; params: any } | null = null;

  const db = {
    transaction: async (fn: any) => {
      const trx = {
        get: async (_sql: string, params: any[]) => {
          const seedId = params[0];
          return seedId === agent.seed_id ? agent : undefined;
        },
        run: async (sql: string, params: any) => {
          lastRun = { sql, params };
        },
      };
      await fn(trx);
    },
    get: async (_sql: string, params: any[]) => {
      const seedId = params[0];
      return seedId === agent.seed_id ? agent : undefined;
    },
    all: async () => [],
    __getLastRun: () => lastRun,
  };

  return db;
}

function baseAgentRow(overrides: Partial<any> = {}) {
  const now = Date.now();
  return {
    seed_id: 'agent-1',
    owner_user_id: 'user-1',
    display_name: 'Test Agent',
    bio: 'Test bio',
    avatar_url: null,
    hexaco_traits: JSON.stringify({ honesty: 0.8 }),
    security_profile: JSON.stringify({ storagePolicy: 'encrypted' }),
    inference_hierarchy: JSON.stringify({ profile: 'default' }),
    step_up_auth_config: null,
    base_system_prompt: 'You are helpful.',
    allowed_tool_ids: JSON.stringify(['web_search']),
    toolset_manifest_json: null,
    toolset_hash: null,
    genesis_event_id: null,
    public_key: null,
    storage_policy: 'encrypted',
    sealed_at: null,
    provenance_enabled: 0,
    status: 'active',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('Wunderland sealing: toolset manifest hashing', () => {
  test('sealAgent writes toolset_manifest_json + toolset_hash when sealing for the first time', async () => {
    const agent = baseAgentRow();
    const db = createMockDb(agent);
    const service = new AgentRegistryService(db as any);

    await service.sealAgent('user-1', 'agent-1');

    const lastRun = (db as any).__getLastRun();
    assert.ok(lastRun, 'expected an UPDATE statement to run');
    assert.equal(typeof lastRun.params.toolset_hash, 'string');
    assert.equal(lastRun.params.toolset_hash.length, 64);
    assert.match(lastRun.params.toolset_hash, /^[0-9a-f]{64}$/);

    assert.equal(typeof lastRun.params.toolset_manifest_json, 'string');
    const manifest = JSON.parse(lastRun.params.toolset_manifest_json);
    assert.equal(manifest.schemaVersion, 1);
    assert.deepEqual(manifest.capabilities, ['web_search']);
    assert.deepEqual(manifest.unresolvedCapabilities, []);
    assert.ok(Array.isArray(manifest.resolvedExtensions));
    assert.ok(manifest.resolvedExtensions.length >= 1, 'expected at least one resolved extension');
  });

  test('sealAgent rejects sealing when unresolved capabilities are present', async () => {
    const agent = baseAgentRow({
      allowed_tool_ids: JSON.stringify(['made_up_tool_abc123']),
    });
    const db = createMockDb(agent);
    const service = new AgentRegistryService(db as any);

    await assert.rejects(
      () => service.sealAgent('user-1', 'agent-1'),
      (err: any) => {
        assert.ok(err instanceof AgentToolsetUnresolvedException);
        assert.ok(Array.isArray(err.getResponse?.().unresolvedCapabilities));
        return true;
      }
    );
  });

  test('sealAgent backfills toolset hash for already-sealed agents when missing', async () => {
    const agent = baseAgentRow({
      sealed_at: Date.now(),
      security_profile: JSON.stringify({ storagePolicy: 'sealed' }),
      storage_policy: 'sealed',
      toolset_hash: null,
      toolset_manifest_json: null,
    });
    const db = createMockDb(agent);
    const service = new AgentRegistryService(db as any);

    await service.sealAgent('user-1', 'agent-1');

    const lastRun = (db as any).__getLastRun();
    assert.ok(lastRun, 'expected an UPDATE statement to run');
    assert.equal(typeof lastRun.params.toolset_hash, 'string');
    assert.equal(lastRun.params.toolset_hash.length, 64);
  });
});
