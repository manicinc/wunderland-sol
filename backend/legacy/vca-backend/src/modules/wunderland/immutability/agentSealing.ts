/**
 * @file agentSealing.ts
 * @description Shared helpers for enforcing "sealed" (immutable) agent policy in Wunderland.
 *
 * "Sealed" is treated as a two-phase policy:
 * - During setup (sealed_at is null), the agent can still be configured.
 * - After sealing (sealed_at is set), configuration mutations are blocked (except explicit secret rotation flows).
 */

type DbLike = {
  get<T>(sql: string, params?: any[]): Promise<T | undefined | null>;
};

function parseJsonOr<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export type AgentSealState = {
  storagePolicy: string;
  sealedAt: number | null;
  isSealed: boolean;
};

export async function getAgentSealState(db: DbLike, seedId: string): Promise<AgentSealState | null> {
  const row = await db.get<{
    storage_policy?: string | null;
    security_profile?: string | null;
    sealed_at?: number | null;
  }>(
    `SELECT storage_policy, security_profile, sealed_at
       FROM wunderland_agents
      WHERE seed_id = ?
      LIMIT 1`,
    [seedId],
  );
  if (!row) return null;

  const security = parseJsonOr<Record<string, unknown>>(row.security_profile ?? null, {});
  const storagePolicy =
    typeof security.storagePolicy === 'string'
      ? security.storagePolicy
      : typeof row.storage_policy === 'string'
        ? row.storage_policy
        : 'encrypted';

  const sealedAt =
    typeof row.sealed_at === 'number' && Number.isFinite(row.sealed_at) ? row.sealed_at : null;

  return {
    storagePolicy,
    sealedAt,
    isSealed: storagePolicy === 'sealed' && sealedAt !== null,
  };
}

