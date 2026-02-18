export type OrganizationSettings = {
  memory?: {
    longTermMemory?: {
      /**
       * Master switch for org-scoped long-term memory (read + write).
       * When false, org memory retrieval and publishing are disabled.
       */
      enabled?: boolean;
      /**
       * When true, requests that include `organizationId` will default
       * `memoryControl.longTermMemory.scopes.organization=true` unless explicitly set.
       */
      defaultRetrievalEnabled?: boolean;
      /**
       * When false, even org admins cannot publish org-scoped memory items.
       * (Admins can still chat in org context; this only affects org memory writes.)
       */
      allowWrites?: boolean;
      /**
       * Optional allowlist for persisted org memory categories.
       * Note: the backend also enforces a built-in safety allowlist.
       */
      allowedCategories?: string[];
    };
  };
};

export type ResolvedOrganizationMemorySettings = {
  enabled: boolean;
  defaultRetrievalEnabled: boolean;
  allowWrites: boolean;
  allowedCategories: string[] | null;
};

const DEFAULTS: ResolvedOrganizationMemorySettings = {
  enabled: true,
  defaultRetrievalEnabled: true,
  allowWrites: true,
  allowedCategories: null,
};

const KNOWN_CATEGORIES = new Set<string>([
  'facts',
  'preferences',
  'people',
  'projects',
  'decisions',
  'open_loops',
  'todo',
  'tags',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeCategory(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  return KNOWN_CATEGORIES.has(trimmed) ? trimmed : null;
}

export function resolveOrganizationMemorySettings(
  settings: OrganizationSettings | null | undefined
): ResolvedOrganizationMemorySettings {
  const raw = settings?.memory?.longTermMemory;
  return {
    enabled: typeof raw?.enabled === 'boolean' ? raw.enabled : DEFAULTS.enabled,
    defaultRetrievalEnabled:
      typeof raw?.defaultRetrievalEnabled === 'boolean'
        ? raw.defaultRetrievalEnabled
        : DEFAULTS.defaultRetrievalEnabled,
    allowWrites: typeof raw?.allowWrites === 'boolean' ? raw.allowWrites : DEFAULTS.allowWrites,
    allowedCategories: Array.isArray(raw?.allowedCategories)
      ? Array.from(
          new Set(
            raw.allowedCategories
              .map((c) => normalizeCategory(c))
              .filter((c): c is string => Boolean(c))
          )
        )
      : DEFAULTS.allowedCategories,
  };
}

export function mergeOrganizationSettings(
  previous: OrganizationSettings | null,
  patch: unknown
): OrganizationSettings {
  const prev = previous && isRecord(previous) ? previous : {};
  const next: OrganizationSettings = JSON.parse(JSON.stringify(prev)) as OrganizationSettings;

  if (!isRecord(patch)) return next;
  const patchOrg = patch as OrganizationSettings;

  const patchMemory = patchOrg.memory;
  if (!patchMemory) return next;

  next.memory ??= {};
  const patchLtm = patchMemory.longTermMemory;
  if (!patchLtm) return next;

  next.memory.longTermMemory ??= {};
  const target = next.memory.longTermMemory;

  if (typeof patchLtm.enabled === 'boolean') target.enabled = patchLtm.enabled;
  if (typeof patchLtm.defaultRetrievalEnabled === 'boolean') {
    target.defaultRetrievalEnabled = patchLtm.defaultRetrievalEnabled;
  }
  if (typeof patchLtm.allowWrites === 'boolean') target.allowWrites = patchLtm.allowWrites;
  if (Array.isArray(patchLtm.allowedCategories)) {
    target.allowedCategories = patchLtm.allowedCategories;
  }

  return next;
}
