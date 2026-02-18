import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveStorageAdapter } from '@framers/sql-storage-adapter';
import {
  __setAppDatabaseAdapterResolverForTests,
  closeAppDatabase,
  initializeAppDatabase,
} from '../core/database/appDatabase.js';
import { DatabaseService } from '../database/database.service.js';
import { CredentialsService } from '../modules/wunderland/credentials/credentials.service.js';
import { AgentImmutableException } from '../modules/wunderland/wunderland.exceptions.js';

describe('CredentialsService — sealed agent key rotation', () => {
  const seedId = 'seed_test_sealed_creds';
  const userId = 'test-user';

  let db: DatabaseService;
  let credentials: CredentialsService;

  // Snapshot env vars we touch so we can restore them.
  let savedWorkbenchUserId: string | undefined;
  let savedWorkbenchUserEmail: string | undefined;

  beforeEach(async () => {
    savedWorkbenchUserId = process.env.AGENTOS_WORKBENCH_USER_ID;
    savedWorkbenchUserEmail = process.env.AGENTOS_WORKBENCH_USER_EMAIL;
    process.env.AGENTOS_WORKBENCH_USER_ID = userId;
    process.env.AGENTOS_WORKBENCH_USER_EMAIL = `${userId}@local.dev`;

    __setAppDatabaseAdapterResolverForTests(async () =>
      resolveStorageAdapter({ priority: ['better-sqlite3'], filePath: ':memory:' })
    );

    await initializeAppDatabase();

    db = new DatabaseService();
    credentials = new CredentialsService(db);

    const now = Date.now();
    await db.run(
      `
        INSERT INTO wunderbots (
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
        'Test bio',
        null,
        JSON.stringify({
          honesty: 0.7,
          emotionality: 0.5,
          extraversion: 0.6,
          agreeableness: 0.7,
          conscientiousness: 0.7,
          openness: 0.7,
        }),
        JSON.stringify({
          preLlmClassifier: true,
          dualLlmAuditor: true,
          outputSigning: true,
          storagePolicy: 'sealed',
        }),
        JSON.stringify({ profile: 'default' }),
        null,
        'You are a test agent.',
        JSON.stringify([]),
        null,
        null,
        'sealed',
        null,
        1,
        'active',
        now,
        now,
      ],
    );
  });

  afterEach(async () => {
    await closeAppDatabase();
    __setAppDatabaseAdapterResolverForTests();

    if (savedWorkbenchUserId === undefined) delete process.env.AGENTOS_WORKBENCH_USER_ID;
    else process.env.AGENTOS_WORKBENCH_USER_ID = savedWorkbenchUserId;

    if (savedWorkbenchUserEmail === undefined) delete process.env.AGENTOS_WORKBENCH_USER_EMAIL;
    else process.env.AGENTOS_WORKBENCH_USER_EMAIL = savedWorkbenchUserEmail;
  });

  it('blocks create/delete after sealing but allows rotate', async () => {
    const created = await credentials.createCredential(userId, {
      seedId,
      type: 'openai_key',
      label: 'OpenAI API Key',
      value: 'sk-test-old-0000',
    });

    // Seal the agent (two-phase: storagePolicy already sealed, now set sealed_at).
    await db.run('UPDATE wunderbots SET sealed_at = ? WHERE seed_id = ?', [Date.now(), seedId]);

    await expect(
      credentials.createCredential(userId, {
        seedId,
        type: 'anthropic_key',
        label: 'Anthropic API Key',
        value: 'sk-ant-test-new-1111',
      })
    ).rejects.toBeInstanceOf(AgentImmutableException);

    await expect(credentials.deleteCredential(userId, created.credential.credentialId)).rejects.toBeInstanceOf(
      AgentImmutableException,
    );

    const rotated = await credentials.rotateCredential(
      userId,
      created.credential.credentialId,
      { value: 'sk-test-rotated-9999' },
    );

    expect(rotated.credential.credentialId).toBe(created.credential.credentialId);
    expect(rotated.credential.maskedValue).toMatch(/9999$/);
    expect(new Date(rotated.credential.updatedAt).getTime()).toBeGreaterThan(
      new Date(created.credential.updatedAt).getTime(),
    );
  });
});

