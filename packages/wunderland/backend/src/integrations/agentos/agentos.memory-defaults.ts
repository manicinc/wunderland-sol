type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

/**
 * Applies product defaults for long-term memory behavior.
 *
 * Defaults are intentionally applied in the backend integration layer (not AgentOS core),
 * because identity, organization trust, and membership enforcement are app-specific concerns.
 *
 * - If `defaultOrganizationScope=true` and `organizationId` is present, default org-scoped
 *   *retrieval* on by setting `scopes.organization=true` unless explicitly provided.
 * - If `defaultUserScope=true`, default user-scoped retrieval on (`scopes.user=true`) unless explicitly provided.
 * - If `defaultPersonaScope=true`, default persona-scoped retrieval on (`scopes.persona=true`) unless explicitly provided.
 *
 * Notes:
 * - This does NOT opt-in to org *writes*; org writes still require
 *   `shareWithOrganization=true` and backend role enforcement.
 */
export function applyLongTermMemoryDefaults(params: {
  memoryControl: unknown;
  organizationId?: string | null;
  defaultUserScope?: boolean;
  defaultPersonaScope?: boolean;
  defaultOrganizationScope?: boolean;
}): UnknownRecord | undefined {
  const orgId = typeof params.organizationId === 'string' ? params.organizationId.trim() : '';
  const base = isRecord(params.memoryControl) ? params.memoryControl : null;
  const shouldDefaultOrg = Boolean(params.defaultOrganizationScope);
  const shouldDefaultUser = Boolean(params.defaultUserScope);
  const shouldDefaultPersona = Boolean(params.defaultPersonaScope);

  if (!orgId && !shouldDefaultUser && !shouldDefaultPersona) {
    return base ?? undefined;
  }

  const existingLongTerm =
    base && isRecord(base.longTermMemory) ? (base.longTermMemory as UnknownRecord) : null;
  const existingScopes =
    existingLongTerm && isRecord(existingLongTerm.scopes)
      ? (existingLongTerm.scopes as UnknownRecord)
      : null;

  const nextScopes: UnknownRecord = { ...(existingScopes ?? {}) };

  if (shouldDefaultOrg && orgId) {
    if (typeof nextScopes.organization !== 'boolean') {
      nextScopes.organization = true;
    }
  }
  if (shouldDefaultUser) {
    if (typeof nextScopes.user !== 'boolean') {
      nextScopes.user = true;
    }
  }
  if (shouldDefaultPersona) {
    if (typeof nextScopes.persona !== 'boolean') {
      nextScopes.persona = true;
    }
  }

  // No-op if we didn't actually set any new defaults.
  const didChange =
    (shouldDefaultOrg && orgId && typeof (existingScopes as any)?.organization !== 'boolean') ||
    (shouldDefaultUser && typeof (existingScopes as any)?.user !== 'boolean') ||
    (shouldDefaultPersona && typeof (existingScopes as any)?.persona !== 'boolean');
  if (!didChange) {
    return base ?? undefined;
  }

  const nextLongTerm: UnknownRecord = { ...(existingLongTerm ?? {}) };
  nextLongTerm.scopes = nextScopes;

  return {
    ...(base ?? {}),
    longTermMemory: nextLongTerm,
  };
}
