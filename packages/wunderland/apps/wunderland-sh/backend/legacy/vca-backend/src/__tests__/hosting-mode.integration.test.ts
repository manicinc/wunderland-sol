import test, { afterEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import {
  __setAppDatabaseAdapterResolverForTests,
  closeAppDatabase,
  getAppDatabase,
  initializeAppDatabase,
} from '../core/database/appDatabase.js';
import { DatabaseService } from '../database/database.service.js';
import { AgentRegistryService } from '../modules/wunderland/agent-registry/agent-registry.service.js';
import { RuntimeService } from '../modules/wunderland/runtime/runtime.service.js';

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

async function seedUser(userId: string): Promise<void> {
  const db = getAppDatabase();
  const now = Date.now();
  await db.run(
    `INSERT OR IGNORE INTO app_users (id, email, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, `${userId}@example.com`, 'test_hash', now, now]
  );
}

async function seedAgentRow(userId: string, seedId: string): Promise<void> {
  const db = getAppDatabase();
  const now = Date.now();
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
      JSON.stringify(['web-search']),
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

describe('Hosting mode enforcement (hosted vs self-hosted)', () => {
  const envHosted = process.env.WUNDERLAND_HOSTED_MODE;

  afterEach(async () => {
    if (envHosted === undefined) delete process.env.WUNDERLAND_HOSTED_MODE;
    else process.env.WUNDERLAND_HOSTED_MODE = envHosted;
    await closeAppDatabase();
  });

  test('hosted mode blocks cli-executor for managed agents but allows for self-hosted', async () => {
    await initInMemoryDb();
    process.env.WUNDERLAND_HOSTED_MODE = 'true';

    const userId = `user_${Date.now()}`;
    await seedUser(userId);

    let orchestrationCalls = 0;
    const registry = new AgentRegistryService(new DatabaseService(), {
      registerAgentAtRuntime: async () => {
        orchestrationCalls += 1;
        return true;
      },
    } as any);

    const base = {
      displayName: 'My Agent',
      bio: 'bio',
      systemPrompt: 'You are a helpful assistant.',
      personality: {
        honesty: 0.7,
        emotionality: 0.5,
        extraversion: 0.6,
        agreeableness: 0.65,
        conscientiousness: 0.8,
        openness: 0.75,
      },
      security: {
        preLlmClassifier: true,
        dualLlmAuditor: true,
        outputSigning: true,
        storagePolicy: 'sealed',
      },
      skills: [],
      channels: [],
    };

    await assert.rejects(
      () =>
        registry.registerAgent(userId, {
          ...base,
          seedId: `seed_managed_${Date.now()}`,
          hostingMode: 'managed',
          capabilities: ['cli-executor'],
        } as any),
      (err: any) => {
        assert.ok(err instanceof BadRequestException);
        const body = err.getResponse?.() as any;
        assert.equal(body?.message, 'Some capabilities/tools are not allowed in hosted mode.');
        assert.deepEqual(body?.blockedCapabilities, ['cli-executor']);
        return true;
      }
    );
    assert.equal(orchestrationCalls, 0, 'should not call orchestration for rejected registration');

    const seedId = `seed_self_${Date.now()}`;
    const res = await registry.registerAgent(userId, {
      ...base,
      seedId,
      hostingMode: 'self_hosted',
      capabilities: ['cli-executor'],
    } as any);
    assert.equal(res.agent.seedId, seedId);
    assert.equal(
      orchestrationCalls,
      0,
      'self-hosted agents must not register into managed runtime'
    );

    const db = getAppDatabase();
    const runtimeRow = await db.get<any>(
      `SELECT hosting_mode FROM wunderland_agent_runtime WHERE seed_id = ? LIMIT 1`,
      [seedId]
    );
    assert.equal(runtimeRow?.hosting_mode, 'self_hosted');
  });

  test('managed agent registration triggers orchestration registration when allowed', async () => {
    await initInMemoryDb();
    process.env.WUNDERLAND_HOSTED_MODE = 'true';

    const userId = `user_${Date.now()}`;
    await seedUser(userId);

    const calls: string[] = [];
    const registry = new AgentRegistryService(new DatabaseService(), {
      registerAgentAtRuntime: async (seedId: string) => {
        calls.push(seedId);
        return true;
      },
    } as any);

    const seedId = `seed_ok_${Date.now()}`;
    const res = await registry.registerAgent(userId, {
      seedId,
      displayName: 'Ok Agent',
      bio: 'bio',
      systemPrompt: 'You are a helpful assistant.',
      personality: {
        honesty: 0.7,
        emotionality: 0.5,
        extraversion: 0.6,
        agreeableness: 0.65,
        conscientiousness: 0.8,
        openness: 0.75,
      },
      security: {
        preLlmClassifier: true,
        dualLlmAuditor: true,
        outputSigning: true,
        storagePolicy: 'sealed',
      },
      capabilities: ['web-search'],
      skills: [],
      channels: [],
      hostingMode: 'managed',
    } as any);
    assert.equal(res.agent.seedId, seedId);
    assert.deepEqual(calls, [seedId]);
  });
});

describe('Runtime hostingMode flips', () => {
  afterEach(async () => {
    await closeAppDatabase();
  });

  test('updateRuntime calls orchestration unregister/register on mode flips', async () => {
    await initInMemoryDb();

    const userId = `user_${Date.now()}`;
    const seedId = `agent_${Date.now()}`;
    await seedUser(userId);
    await seedAgentRow(userId, seedId);

    const called: Array<{ fn: string; seedId: string }> = [];
    const runtime = new RuntimeService(new DatabaseService(), {
      unregisterAgentAtRuntime: async (id: string) => {
        called.push({ fn: 'unregister', seedId: id });
        return true;
      },
      registerAgentAtRuntime: async (id: string) => {
        called.push({ fn: 'register', seedId: id });
        return true;
      },
    } as any);

    const first = await runtime.updateRuntime(userId, seedId, {
      hostingMode: 'self_hosted',
    } as any);
    assert.equal(first.runtime.hostingMode, 'self_hosted');
    assert.deepEqual(called, [{ fn: 'unregister', seedId }]);

    const second = await runtime.updateRuntime(userId, seedId, { hostingMode: 'managed' } as any);
    assert.equal(second.runtime.hostingMode, 'managed');
    assert.deepEqual(called, [
      { fn: 'unregister', seedId },
      { fn: 'register', seedId },
    ]);
  });

  test('startRuntime is blocked for self-hosted runtimes', async () => {
    await initInMemoryDb();

    const userId = `user_${Date.now()}`;
    const seedId = `agent_${Date.now()}`;
    await seedUser(userId);
    await seedAgentRow(userId, seedId);

    const runtime = new RuntimeService(new DatabaseService());
    await runtime.updateRuntime(userId, seedId, { hostingMode: 'self_hosted' } as any);

    await assert.rejects(
      () => runtime.startRuntime(userId, seedId),
      (err: any) => {
        assert.ok(err instanceof BadRequestException);
        assert.equal(err.message, 'Cannot start a self-hosted runtime from managed controls.');
        return true;
      }
    );
  });
});

describe('Runtime HTTP e2e', () => {
  afterEach(async () => {
    await closeAppDatabase();
  });

  test('POST /wunderland/runtime/:seedId/start returns 400 for self-hosted', async () => {
    await initInMemoryDb();

    const userId = `user_${Date.now()}`;
    const seedId = `agent_${Date.now()}`;
    await seedUser(userId);
    await seedAgentRow(userId, seedId);

    const db = getAppDatabase();
    const now = Date.now();
    await db.run(
      `INSERT INTO wunderland_agent_runtime (seed_id, owner_user_id, hosting_mode, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [seedId, userId, 'self_hosted', 'stopped', now, now]
    );

    const runtime = new RuntimeService(new DatabaseService());

    const handler = async (req: any, res: any) => {
      try {
        const result = await runtime.startRuntime(userId, String(req.params.seedId));
        res.status(200).json(result);
      } catch (err: any) {
        if (err instanceof BadRequestException) {
          const response = err.getResponse?.();
          const payload =
            typeof response === 'string'
              ? { message: response }
              : (response ?? { message: err.message });
          res.status(err.getStatus()).json(payload);
          return;
        }
        res.status(500).json({ message: err instanceof Error ? err.message : 'Internal error' });
      }
    };

    const res = createMockRes();
    await handler({ params: { seedId } }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(
      (res.body as any)?.message,
      'Cannot start a self-hosted runtime from managed controls.'
    );
  });
});
