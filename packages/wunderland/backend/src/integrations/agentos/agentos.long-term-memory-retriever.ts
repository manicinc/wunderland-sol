import type {
  ILongTermMemoryRetriever,
  LongTermMemoryRetrievalInput,
  LongTermMemoryRetrievalResult,
} from '@framers/agentos';
import { ragService } from './agentos.rag.service.js';
import { listMemoryRedactionHashes } from './agentos.memory-redactions.service.js';
import { getOrganizationSettings } from '../../features/organization/organization.repository.js';
import { resolveOrganizationMemorySettings } from '../../features/organization/organization.settings.js';

type MemoryScope = 'user' | 'persona' | 'organization';

const COLLECTION_BY_SCOPE: Record<MemoryScope, string> = {
  user: 'agentos-user-memory',
  persona: 'agentos-persona-memory',
  organization: 'agentos-org-memory',
};

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function clampText(value: string, maxChars: number): string {
  if (maxChars <= 0) return value;
  if (value.length <= maxChars) return value;
  return value.slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
}

function uniqBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

type RetrievedItem = {
  text: string;
  category: string | null;
  score: number;
  hash?: string;
};

function formatScopeTitle(scope: MemoryScope, input: LongTermMemoryRetrievalInput): string {
  switch (scope) {
    case 'user':
      return 'User Memory';
    case 'persona':
      return `Persona Memory (${input.personaId})`;
    case 'organization':
      return input.organizationId
        ? `Organization Memory (${input.organizationId})`
        : 'Organization Memory';
    default:
      return scope;
  }
}

export function createLongTermMemoryRetriever(): ILongTermMemoryRetriever {
  return {
    async retrieveLongTermMemory(
      input: LongTermMemoryRetrievalInput
    ): Promise<LongTermMemoryRetrievalResult | null> {
      const startedAt = Date.now();
      const query = normalizeString(input.queryText);
      if (!query) return null;
      if (!input.memoryPolicy?.enabled) return null;

      const allowedCategories = Array.isArray(input.memoryPolicy.allowedCategories)
        ? new Set(input.memoryPolicy.allowedCategories)
        : null;

      const orgId = normalizeString(input.organizationId);
      const orgMemorySettings =
        input.memoryPolicy.scopes.organization && orgId
          ? resolveOrganizationMemorySettings(await getOrganizationSettings(orgId))
          : null;
      const orgAllowedCategories = orgMemorySettings?.allowedCategories
        ? new Set(orgMemorySettings.allowedCategories)
        : null;

      const topKByScope: Record<MemoryScope, number> = {
        user: Math.max(1, Number(input.topKByScope?.user ?? 6)),
        persona: Math.max(1, Number(input.topKByScope?.persona ?? 6)),
        organization: Math.max(1, Number(input.topKByScope?.organization ?? 6)),
      };

      const scopedResults: Record<MemoryScope, RetrievedItem[]> = {
        user: [],
        persona: [],
        organization: [],
      };

      const redactedHashesByScope: Record<MemoryScope, Set<string>> = {
        user: new Set<string>(),
        persona: new Set<string>(),
        organization: new Set<string>(),
      };

      const safeListRedactions = async (
        args: Parameters<typeof listMemoryRedactionHashes>[0]
      ): Promise<string[]> => {
        try {
          return await listMemoryRedactionHashes(args);
        } catch {
          return [];
        }
      };

      const redactionPromises: Array<Promise<void>> = [];
      if (input.memoryPolicy.scopes.user) {
        redactionPromises.push(
          safeListRedactions({ scope: 'user', userId: input.userId }).then((hashes) => {
            redactedHashesByScope.user = new Set(hashes.map((h) => String(h).toLowerCase()));
          })
        );
      }
      if (input.memoryPolicy.scopes.persona) {
        redactionPromises.push(
          safeListRedactions({
            scope: 'persona',
            userId: input.userId,
            personaId: input.personaId,
          }).then((hashes) => {
            redactedHashesByScope.persona = new Set(hashes.map((h) => String(h).toLowerCase()));
          })
        );
      }
      if (input.memoryPolicy.scopes.organization && orgId && (orgMemorySettings?.enabled ?? true)) {
        redactionPromises.push(
          safeListRedactions({
            scope: 'organization',
            organizationId: input.organizationId,
          }).then((hashes) => {
            redactedHashesByScope.organization = new Set(
              hashes.map((h) => String(h).toLowerCase())
            );
          })
        );
      }
      await Promise.all(redactionPromises);

      const scopesToQuery: MemoryScope[] = [];
      if (input.memoryPolicy.scopes.user) scopesToQuery.push('user');
      if (input.memoryPolicy.scopes.persona) scopesToQuery.push('persona');
      if (input.memoryPolicy.scopes.organization && orgId && (orgMemorySettings?.enabled ?? true)) {
        scopesToQuery.push('organization');
      }
      if (scopesToQuery.length === 0) return null;

      const collectionIds = scopesToQuery.map((scope) => COLLECTION_BY_SCOPE[scope]);
      const totalTarget = scopesToQuery.reduce((sum, scope) => sum + topKByScope[scope], 0);

      // Pull extra to allow post-filtering (score==0, wrong tenant, duplicates, redactions, etc.)
      const raw = await ragService.query({
        query,
        collectionIds,
        topK: Math.min(200, Math.max(20, totalTarget * 6)),
        includeMetadata: true,
      });

      const allCandidates = (raw.chunks ?? [])
        .filter((chunk) => typeof chunk?.score === 'number' && chunk.score > 0)
        .map((chunk) => ({
          score: chunk.score,
          metadata: (chunk.metadata ?? {}) as Record<string, unknown>,
        }))
        .filter(({ metadata }) => metadata.kind === 'rolling_memory_item');

      for (const scope of scopesToQuery) {
        const topK = topKByScope[scope];

        const filtered = allCandidates
          .filter(({ metadata }) => {
            if (
              allowedCategories &&
              typeof metadata.category === 'string' &&
              !allowedCategories.has(metadata.category as any)
            ) {
              return false;
            }
            if (
              scope === 'organization' &&
              orgAllowedCategories &&
              typeof metadata.category === 'string' &&
              !orgAllowedCategories.has(String(metadata.category).toLowerCase())
            ) {
              return false;
            }

            if (scope === 'user') {
              return metadata.userId === input.userId && metadata.scope === 'user';
            }
            if (scope === 'persona') {
              return (
                metadata.userId === input.userId &&
                metadata.scope === 'persona' &&
                metadata.personaId === input.personaId
              );
            }
            if (scope === 'organization') {
              return (
                metadata.scope === 'organization' &&
                Boolean(input.organizationId) &&
                metadata.organizationId === input.organizationId
              );
            }
            return false;
          })
          .map(
            ({ score, metadata }): RetrievedItem => ({
              score,
              text: normalizeString(metadata.text),
              category: typeof metadata.category === 'string' ? metadata.category : null,
              hash: typeof metadata.hash === 'string' ? metadata.hash : undefined,
            })
          )
          .filter((item) => {
            const hash = typeof item.hash === 'string' ? item.hash.toLowerCase() : '';
            return !hash || !redactedHashesByScope[scope].has(hash);
          })
          .filter((item) => item.text.length > 0)
          .sort((a, b) => b.score - a.score);

        const deduped = uniqBy(
          filtered,
          (item) => item.hash ?? `${item.category ?? 'uncat'}:${item.text.toLowerCase()}`
        );
        scopedResults[scope] = deduped.slice(0, topK);
      }

      const sections: string[] = [];
      const pushSection = (scope: MemoryScope) => {
        const items = scopedResults[scope];
        if (!items || items.length === 0) return;

        const lines: string[] = [];
        lines.push(`## ${formatScopeTitle(scope, input)}`);
        for (const item of items) {
          const prefix = item.category ? `[${item.category}] ` : '';
          lines.push(`- ${prefix}${item.text}`);
        }
        sections.push(lines.join('\n'));
      };

      pushSection('user');
      pushSection('persona');
      pushSection('organization');

      const rawContext = sections.join('\n\n').trim();
      if (!rawContext) return null;

      const maxChars = Number(input.maxContextChars ?? 2800);
      const contextText = clampText(rawContext, Number.isFinite(maxChars) ? maxChars : 2800);

      return {
        contextText,
        diagnostics: {
          tookMs: Date.now() - startedAt,
          hits: {
            user: scopedResults.user.length,
            persona: scopedResults.persona.length,
            organization: scopedResults.organization.length,
          },
          queryPreview: query.slice(0, 120),
        },
      };
    },
  };
}
