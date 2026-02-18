import { getAppDatabase, generateId } from '../../core/database/appDatabase.js';

export type MemoryRedactionScope = 'user' | 'persona' | 'organization';

export type MemoryRedactionActorType = 'agent' | 'user' | 'system';

export type AddMemoryRedactionInput = {
  scope: MemoryRedactionScope;
  userId?: string | null;
  personaId?: string | null;
  organizationId?: string | null;
  memoryHash: string;
  reason?: string | null;
  actorType?: MemoryRedactionActorType;
  actorId?: string | null;
};

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeHash(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export async function addMemoryRedaction(input: AddMemoryRedactionInput): Promise<{
  redactionId: string;
}> {
  const db = getAppDatabase();
  const scope = input.scope;
  const userId = normalizeString(input.userId);
  const personaId = normalizeString(input.personaId);
  const organizationId = normalizeString(input.organizationId);
  const memoryHash = normalizeHash(input.memoryHash);
  const reason = normalizeString(input.reason);
  const actorType = input.actorType ?? 'agent';
  const actorId = normalizeString(input.actorId);

  if (!memoryHash) {
    throw new Error('memoryHash is required');
  }

  if (scope === 'user' && !userId) throw new Error('userId is required for user-scope redaction');
  if (scope === 'persona' && (!userId || !personaId)) {
    throw new Error('userId and personaId are required for persona-scope redaction');
  }
  if (scope === 'organization' && !organizationId) {
    throw new Error('organizationId is required for organization-scope redaction');
  }

  const redactionId = generateId();
  const now = Date.now();

  await db.run(
    `
      INSERT INTO agentos_memory_redactions (
        redaction_id,
        scope,
        user_id,
        persona_id,
        organization_id,
        memory_hash,
        reason,
        actor_type,
        actor_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      redactionId,
      scope,
      userId || null,
      personaId || null,
      organizationId || null,
      memoryHash,
      reason || null,
      actorType,
      actorId || null,
      now,
    ]
  );

  return { redactionId };
}

export async function listMemoryRedactionHashes(input: {
  scope: MemoryRedactionScope;
  userId?: string | null;
  personaId?: string | null;
  organizationId?: string | null;
}): Promise<string[]> {
  const db = getAppDatabase();
  const scope = input.scope;
  const userId = normalizeString(input.userId);
  const personaId = normalizeString(input.personaId);
  const organizationId = normalizeString(input.organizationId);

  if (scope === 'user') {
    if (!userId) return [];
    const rows = await db.all<{ memory_hash: string }>(
      `
        SELECT memory_hash
          FROM agentos_memory_redactions
         WHERE scope = 'user'
           AND user_id = ?
           AND persona_id IS NULL
           AND organization_id IS NULL
      `,
      [userId]
    );
    return rows.map((r) => r.memory_hash).filter(Boolean);
  }

  if (scope === 'persona') {
    if (!userId || !personaId) return [];
    const rows = await db.all<{ memory_hash: string }>(
      `
        SELECT memory_hash
          FROM agentos_memory_redactions
         WHERE scope = 'persona'
           AND user_id = ?
           AND persona_id = ?
           AND organization_id IS NULL
      `,
      [userId, personaId]
    );
    return rows.map((r) => r.memory_hash).filter(Boolean);
  }

  if (scope === 'organization') {
    if (!organizationId) return [];
    const rows = await db.all<{ memory_hash: string }>(
      `
        SELECT memory_hash
          FROM agentos_memory_redactions
         WHERE scope = 'organization'
           AND organization_id = ?
      `,
      [organizationId]
    );
    return rows.map((r) => r.memory_hash).filter(Boolean);
  }

  return [];
}
