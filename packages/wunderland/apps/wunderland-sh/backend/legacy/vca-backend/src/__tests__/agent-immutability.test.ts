/**
 * Tests for agent immutability enforcement (sealed storage policy).
 *
 * Verifies that the AgentRegistryService.updateAgent() method blocks
 * configuration mutations when storagePolicy is 'sealed' AND the agent has been sealed
 * (sealed_at is set), while still allowing edits during initial setup (sealed_at is null).
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { AgentRegistryService } from '../modules/wunderland/agent-registry/agent-registry.service.js';
import {
  AgentImmutableException,
  AgentNotFoundException,
  AgentOwnershipException,
} from '../modules/wunderland/wunderland.exceptions.js';

// ── Minimal Mock DatabaseService ─────────────────────────────────────────────

function createMockDb(agents: any[] = []) {
  let trxFn: any;
  const db = {
    transaction: async (fn: any) => {
      trxFn = fn;
      const trx = {
        get: async (_sql: string, params: any[]) => {
          const seedId = params[0];
          return agents.find((a) => a.seed_id === seedId);
        },
        run: async () => {},
      };
      await fn(trx);
    },
    get: async (_sql: string, params: any[]) => {
      const seedId = params[0];
      const agent = agents.find((a) => a.seed_id === seedId);
      if (!agent) return undefined;
      // Return agent + citizen info for mapAgentProfile
      return agent;
    },
    all: async () => [],
  };
  return db;
}

function sealedAgent(seedId: string, ownerId: string) {
  return {
    seed_id: seedId,
    owner_user_id: ownerId,
    display_name: 'Test Agent',
    bio: 'Test bio',
    base_system_prompt: 'You are helpful.',
    hexaco_traits: JSON.stringify({ honesty: 0.8, openness: 0.7 }),
    security_profile: JSON.stringify({ storagePolicy: 'sealed', preLlmClassifier: true }),
    allowed_tool_ids: JSON.stringify(['web-search']),
    sealed_at: Date.now(),
    status: 'active',
    avatar_url: null,
    metadata: '{}',
    created_at: Date.now(),
    updated_at: Date.now(),
  };
}

function unsealedAgent(seedId: string, ownerId: string) {
  return {
    ...sealedAgent(seedId, ownerId),
    security_profile: JSON.stringify({ storagePolicy: 'encrypted', preLlmClassifier: true }),
    sealed_at: null,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Agent Immutability — sealed storage policy', () => {
  test('rejects displayName update on sealed agent', async () => {
    const db = createMockDb([sealedAgent('agent-1', 'user-1')]);
    const service = new AgentRegistryService(db as any);

    await assert.rejects(
      () => service.updateAgent('user-1', 'agent-1', { displayName: 'New Name' }),
      (err: any) => {
        assert.ok(
          err instanceof AgentImmutableException,
          `Expected AgentImmutableException, got ${err.constructor.name}`
        );
        assert.ok(err.message.includes('displayName'), 'Message should mention the blocked field');
        return true;
      }
    );
  });

  test('rejects bio update on sealed agent', async () => {
    const db = createMockDb([sealedAgent('agent-1', 'user-1')]);
    const service = new AgentRegistryService(db as any);

    await assert.rejects(
      () => service.updateAgent('user-1', 'agent-1', { bio: 'New bio' }),
      (err: any) => {
        assert.ok(err instanceof AgentImmutableException);
        assert.ok(err.message.includes('bio'));
        return true;
      }
    );
  });

  test('rejects systemPrompt update on sealed agent', async () => {
    const db = createMockDb([sealedAgent('agent-1', 'user-1')]);
    const service = new AgentRegistryService(db as any);

    await assert.rejects(
      () => service.updateAgent('user-1', 'agent-1', { systemPrompt: 'New prompt' } as any),
      (err: any) => {
        assert.ok(err instanceof AgentImmutableException);
        assert.ok(err.message.includes('systemPrompt'));
        return true;
      }
    );
  });

  test('rejects personality update on sealed agent', async () => {
    const db = createMockDb([sealedAgent('agent-1', 'user-1')]);
    const service = new AgentRegistryService(db as any);

    await assert.rejects(
      () =>
        service.updateAgent('user-1', 'agent-1', {
          personality: { honesty: 0.1, openness: 0.1 },
        } as any),
      (err: any) => {
        assert.ok(err instanceof AgentImmutableException);
        assert.ok(err.message.includes('personality'));
        return true;
      }
    );
  });

  test('rejects security update on sealed agent', async () => {
    const db = createMockDb([sealedAgent('agent-1', 'user-1')]);
    const service = new AgentRegistryService(db as any);

    await assert.rejects(
      () =>
        service.updateAgent('user-1', 'agent-1', {
          security: { preLlmClassifier: false },
        } as any),
      (err: any) => {
        assert.ok(err instanceof AgentImmutableException);
        assert.ok(err.message.includes('security'));
        return true;
      }
    );
  });

  test('rejects multiple core fields at once, reports all of them', async () => {
    const db = createMockDb([sealedAgent('agent-1', 'user-1')]);
    const service = new AgentRegistryService(db as any);

    await assert.rejects(
      () =>
        service.updateAgent('user-1', 'agent-1', {
          displayName: 'New Name',
          bio: 'New bio',
          personality: { honesty: 0.0 },
        } as any),
      (err: any) => {
        assert.ok(err instanceof AgentImmutableException);
        assert.ok(err.message.includes('displayName'));
        assert.ok(err.message.includes('bio'));
        assert.ok(err.message.includes('personality'));
        return true;
      }
    );
  });

  test('rejects capabilities update on sealed agent', async () => {
    const db = createMockDb([sealedAgent('agent-1', 'user-1')]);
    const service = new AgentRegistryService(db as any);

    await assert.rejects(
      () => service.updateAgent('user-1', 'agent-1', { capabilities: ['web-search', 'giphy'] }),
      (err: any) => {
        assert.ok(err instanceof AgentImmutableException);
        assert.ok(err.message.includes('capabilities'));
        return true;
      }
    );
  });

  test('allows all updates on unsealed (encrypted) agent', async () => {
    const db = createMockDb([unsealedAgent('agent-2', 'user-1')]);
    const service = new AgentRegistryService(db as any);

    // displayName + bio on an unsealed agent should not throw AgentImmutableException
    try {
      await service.updateAgent('user-1', 'agent-2', {
        displayName: 'New Name',
        bio: 'New bio',
      });
    } catch (err: any) {
      assert.ok(
        !(err instanceof AgentImmutableException),
        'unsealed agent should NOT trigger AgentImmutableException'
      );
    }
  });

  test('throws AgentNotFoundException for unknown seedId', async () => {
    const db = createMockDb([sealedAgent('agent-1', 'user-1')]);
    const service = new AgentRegistryService(db as any);

    await assert.rejects(
      () => service.updateAgent('user-1', 'nonexistent', { displayName: 'x' }),
      (err: any) => {
        assert.ok(err instanceof AgentNotFoundException);
        return true;
      }
    );
  });

  test('throws AgentOwnershipException when wrong user updates', async () => {
    const db = createMockDb([sealedAgent('agent-1', 'user-1')]);
    const service = new AgentRegistryService(db as any);

    await assert.rejects(
      () => service.updateAgent('user-2', 'agent-1', { capabilities: ['x'] }),
      (err: any) => {
        assert.ok(err instanceof AgentOwnershipException);
        return true;
      }
    );
  });

  test('ownership check runs before immutability check', async () => {
    const db = createMockDb([sealedAgent('agent-1', 'user-1')]);
    const service = new AgentRegistryService(db as any);

    // user-2 tries to update core field on user-1's sealed agent
    // should get ownership error, not immutability error
    await assert.rejects(
      () => service.updateAgent('user-2', 'agent-1', { displayName: 'Hacked' }),
      (err: any) => {
        assert.ok(
          err instanceof AgentOwnershipException,
          `Should be ownership error first, got ${err.constructor.name}`
        );
        return true;
      }
    );
  });
});
