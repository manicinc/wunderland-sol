import { createHash } from 'crypto';
import type { IRollingSummaryMemorySink, RollingSummaryMemoryUpdate } from '@framers/agentos';
import { ragService } from './agentos.rag.service.js';
import { sqlKnowledgeBaseService } from '../../core/knowledge/SqlKnowledgeBaseService.js';
import {
  findMemberByUser,
  getOrganizationSettings,
} from '../../features/organization/organization.repository.js';
import { resolveOrganizationMemorySettings } from '../../features/organization/organization.settings.js';

type MemoryScope = 'conversation' | 'user' | 'persona' | 'organization';

type RollingMemorySinkOptions = {
  ragCollectionIdByScope: Record<MemoryScope, string>;
  persistToRag: boolean;
  persistToKnowledgeBase: boolean;
};

const DEFAULT_OPTIONS: RollingMemorySinkOptions = {
  ragCollectionIdByScope: {
    conversation: 'agentos-rolling-memory',
    user: 'agentos-user-memory',
    persona: 'agentos-persona-memory',
    organization: 'agentos-org-memory',
  },
  persistToRag: true,
  persistToKnowledgeBase: true,
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

type ResolvedSinkMemoryPolicy = {
  enabled: boolean;
  scopes: Record<MemoryScope, boolean>;
  shareWithOrganization: boolean;
  storeAtomicDocs: boolean;
  allowedCategories: Set<string> | null;
};

const DEFAULT_POLICY: ResolvedSinkMemoryPolicy = {
  enabled: true,
  scopes: {
    conversation: true,
    user: false,
    persona: false,
    organization: false,
  },
  shareWithOrganization: false,
  storeAtomicDocs: true,
  allowedCategories: null,
};

const ORG_SAFE_CATEGORIES = new Set<string>(['facts', 'people', 'projects', 'decisions']);

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function stableHash(parts: string[]): string {
  return createHash('sha1').update(parts.join('|'), 'utf8').digest('hex').slice(0, 16);
}

function normalizeTag(tag: unknown): string | null {
  if (typeof tag !== 'string') return null;
  const trimmed = tag.trim().toLowerCase();
  if (!trimmed) return null;
  const safe = trimmed.replace(/\s+/g, '_').replace(/[^a-z0-9_:/.-]/g, '');
  return safe.length > 0 ? safe : null;
}

function resolvePolicy(update: RollingSummaryMemoryUpdate): ResolvedSinkMemoryPolicy {
  const raw =
    update.memoryPolicy && typeof update.memoryPolicy === 'object'
      ? (update.memoryPolicy as any)
      : null;

  const policy: ResolvedSinkMemoryPolicy = {
    enabled: typeof raw?.enabled === 'boolean' ? raw.enabled : DEFAULT_POLICY.enabled,
    scopes: {
      conversation:
        typeof raw?.scopes?.conversation === 'boolean'
          ? raw.scopes.conversation
          : DEFAULT_POLICY.scopes.conversation,
      user: typeof raw?.scopes?.user === 'boolean' ? raw.scopes.user : DEFAULT_POLICY.scopes.user,
      persona:
        typeof raw?.scopes?.persona === 'boolean'
          ? raw.scopes.persona
          : DEFAULT_POLICY.scopes.persona,
      organization:
        typeof raw?.scopes?.organization === 'boolean'
          ? raw.scopes.organization
          : DEFAULT_POLICY.scopes.organization,
    },
    shareWithOrganization:
      typeof raw?.shareWithOrganization === 'boolean'
        ? raw.shareWithOrganization
        : DEFAULT_POLICY.shareWithOrganization,
    storeAtomicDocs:
      typeof raw?.storeAtomicDocs === 'boolean'
        ? raw.storeAtomicDocs
        : DEFAULT_POLICY.storeAtomicDocs,
    allowedCategories: Array.isArray(raw?.allowedCategories)
      ? new Set<string>(
          raw.allowedCategories
            .map((c: unknown) => (typeof c === 'string' ? c.trim().toLowerCase() : ''))
            .filter(Boolean)
        )
      : DEFAULT_POLICY.allowedCategories,
  };

  return policy;
}

function hasAnyScope(policy: ResolvedSinkMemoryPolicy): boolean {
  return Boolean(
    policy.scopes.conversation ||
      policy.scopes.user ||
      policy.scopes.persona ||
      policy.scopes.organization
  );
}

type AtomicMemoryItem = {
  category: string;
  text: string;
  confidence?: number;
  sources?: string[];
  entityName?: string;
  metadata?: Record<string, unknown>;
};

function extractAtomicItems(summaryJson: any | null): {
  items: AtomicMemoryItem[];
  memoryTags: string[];
} {
  const json = summaryJson && typeof summaryJson === 'object' ? summaryJson : null;
  if (!json) return { items: [], memoryTags: [] };

  const items: AtomicMemoryItem[] = [];

  const pushTextItems = (
    category: string,
    arr: Array<{ text?: unknown; confidence?: unknown; sources?: unknown }>
  ) => {
    for (const item of arr) {
      const text = typeof item?.text === 'string' ? item.text.trim() : '';
      if (!text) continue;
      const confidence =
        typeof item?.confidence === 'number' && Number.isFinite(item.confidence)
          ? item.confidence
          : undefined;
      const sources = Array.isArray(item?.sources)
        ? (item.sources.filter((s) => typeof s === 'string') as string[])
        : undefined;
      items.push({ category, text, confidence, sources });
    }
  };

  pushTextItems('facts', asArray((json as any).facts));
  pushTextItems('preferences', asArray((json as any).preferences));
  pushTextItems('decisions', asArray((json as any).decisions));
  pushTextItems('open_loops', asArray((json as any).open_loops));
  pushTextItems('todo', asArray((json as any).todo));

  for (const person of asArray<{ name?: unknown; notes?: unknown; sources?: unknown }>(
    (json as any).people
  )) {
    const name = typeof person?.name === 'string' ? person.name.trim() : '';
    if (!name) continue;
    const notes = typeof person?.notes === 'string' ? person.notes.trim() : '';
    const text = notes ? `${name} — ${notes}` : name;
    const sources = Array.isArray(person?.sources)
      ? (person.sources.filter((s) => typeof s === 'string') as string[])
      : undefined;
    items.push({ category: 'people', text, entityName: name, sources });
  }

  for (const project of asArray<{
    name?: unknown;
    status?: unknown;
    notes?: unknown;
    sources?: unknown;
  }>((json as any).projects)) {
    const name = typeof project?.name === 'string' ? project.name.trim() : '';
    if (!name) continue;
    const status = typeof project?.status === 'string' ? project.status.trim() : '';
    const notes = typeof project?.notes === 'string' ? project.notes.trim() : '';
    const extra = [status && `status: ${status}`, notes].filter(Boolean).join(' — ');
    const text = extra ? `${name} — ${extra}` : name;
    const sources = Array.isArray(project?.sources)
      ? (project.sources.filter((s) => typeof s === 'string') as string[])
      : undefined;
    items.push({
      category: 'projects',
      text,
      entityName: name,
      sources,
      metadata: {
        projectName: name,
        status: status || undefined,
      },
    });
  }

  const memoryTags = asArray<unknown>((json as any).tags)
    .map((t) => normalizeTag(t))
    .filter((t): t is string => Boolean(t));

  return { items, memoryTags };
}

function buildAtomicMemoryText(item: AtomicMemoryItem): string {
  const lines: string[] = [];
  const title = item.category.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  lines.push(`## Memory Item (${title})`);
  lines.push(`- ${item.text}`);
  if (typeof item.confidence === 'number') {
    lines.push(`- confidence: ${item.confidence}`);
  }
  if (item.sources && item.sources.length > 0) {
    lines.push(`- sources: ${item.sources.join(', ')}`);
  }
  return lines.join('\n');
}

function buildTags(
  update: RollingSummaryMemoryUpdate,
  scope: MemoryScope,
  extra?: { category?: string; memoryTags?: string[] }
): string[] {
  const tags: string[] = ['rolling_memory', `scope:${scope}`, `owner:${update.userId}`];

  if (scope === 'conversation') {
    tags.push(`conversation:${update.conversationId}`);
  }

  if (scope === 'persona' || scope === 'conversation') {
    tags.push(`persona:${update.personaId}`);
  }

  if (scope === 'organization' && update.organizationId) {
    tags.push(`org:${update.organizationId}`);
  }

  if (extra?.category) {
    tags.push(`category:${extra.category}`);
  }

  for (const t of extra?.memoryTags ?? []) {
    tags.push(`memtag:${t}`);
  }

  return tags;
}

function categoryAllowedForScope(
  category: string,
  scope: MemoryScope,
  policy: ResolvedSinkMemoryPolicy
): boolean {
  const cat = category.trim().toLowerCase();
  if (policy.allowedCategories && !policy.allowedCategories.has(cat)) return false;
  if (scope === 'organization' && !ORG_SAFE_CATEGORIES.has(cat)) return false;
  return true;
}

function buildRollingMemoryText(update: RollingSummaryMemoryUpdate): string {
  const sections: string[] = [];
  const summary = typeof update.summaryText === 'string' ? update.summaryText.trim() : '';
  if (summary) {
    sections.push('## Rolling Memory Summary\n', summary);
  }

  const json =
    update.summaryJson && typeof update.summaryJson === 'object' ? update.summaryJson : null;
  if (!json) {
    return sections.join('\n\n').trim();
  }

  const lines: string[] = [];
  const facts = asArray<{ text?: unknown; confidence?: unknown }>((json as any).facts);
  const preferences = asArray<{ text?: unknown }>((json as any).preferences);
  const people = asArray<{ name?: unknown; notes?: unknown }>((json as any).people);
  const projects = asArray<{ name?: unknown; status?: unknown; notes?: unknown }>(
    (json as any).projects
  );
  const decisions = asArray<{ text?: unknown }>((json as any).decisions);
  const openLoops = asArray<{ text?: unknown }>((json as any).open_loops);
  const todo = asArray<{ text?: unknown }>((json as any).todo);
  const tags = asArray<unknown>((json as any).tags).filter(
    (t) => typeof t === 'string'
  ) as string[];

  const pushList = (title: string, items: string[]) => {
    if (items.length === 0) return;
    lines.push(`## ${title}`);
    for (const item of items) lines.push(`- ${item}`);
    lines.push('');
  };

  pushList(
    'Facts',
    facts
      .map((f) => {
        const text = typeof f?.text === 'string' ? f.text.trim() : '';
        if (!text) return null;
        const confidence =
          typeof f?.confidence === 'number' && Number.isFinite(f.confidence) ? f.confidence : null;
        return confidence != null ? `${text} (confidence: ${confidence})` : text;
      })
      .filter(Boolean) as string[]
  );
  pushList(
    'Preferences',
    preferences.map((p) => (typeof p?.text === 'string' ? p.text.trim() : '')).filter(Boolean)
  );
  pushList(
    'People',
    people
      .map((p) => {
        const name = typeof p?.name === 'string' ? p.name.trim() : '';
        if (!name) return null;
        const notes = typeof p?.notes === 'string' ? p.notes.trim() : '';
        return notes ? `${name} — ${notes}` : name;
      })
      .filter(Boolean) as string[]
  );
  pushList(
    'Projects',
    projects
      .map((p) => {
        const name = typeof p?.name === 'string' ? p.name.trim() : '';
        if (!name) return null;
        const status = typeof p?.status === 'string' ? p.status.trim() : '';
        const notes = typeof p?.notes === 'string' ? p.notes.trim() : '';
        const extra = [status && `status: ${status}`, notes].filter(Boolean).join(' — ');
        return extra ? `${name} — ${extra}` : name;
      })
      .filter(Boolean) as string[]
  );
  pushList(
    'Decisions',
    decisions.map((d) => (typeof d?.text === 'string' ? d.text.trim() : '')).filter(Boolean)
  );
  pushList(
    'Open Loops',
    openLoops.map((o) => (typeof o?.text === 'string' ? o.text.trim() : '')).filter(Boolean)
  );
  pushList(
    'TODO',
    todo.map((t) => (typeof t?.text === 'string' ? t.text.trim() : '')).filter(Boolean)
  );

  if (tags.length > 0) {
    lines.push('## Tags');
    lines.push(tags.map((t) => `\`${t}\``).join(' '));
    lines.push('');
  }

  if (lines.length > 0) {
    sections.push(lines.join('\n').trim());
  }

  return sections.join('\n\n').trim();
}

export function createRollingSummaryMemorySink(
  options: Partial<RollingMemorySinkOptions> = {}
): IRollingSummaryMemorySink {
  const resolved: RollingMemorySinkOptions = { ...DEFAULT_OPTIONS, ...options };

  return {
    async upsertRollingSummaryMemory(update: RollingSummaryMemoryUpdate): Promise<void> {
      const policy = resolvePolicy(update);
      if (!policy.enabled || !hasAnyScope(policy)) {
        return;
      }

      const { items: atomicItems, memoryTags } = extractAtomicItems(update.summaryJson ?? null);

      const orgId = typeof update.organizationId === 'string' ? update.organizationId.trim() : '';
      const wantsOrgWrites =
        Boolean(policy.scopes.organization) &&
        Boolean(policy.shareWithOrganization) &&
        Boolean(orgId);
      let orgWritesAllowed = false;
      let orgAllowedCategories: Set<string> | null = null;

      if (wantsOrgWrites) {
        try {
          const [member, settings] = await Promise.all([
            findMemberByUser(orgId, update.userId),
            getOrganizationSettings(orgId),
          ]);
          const orgSettings = resolveOrganizationMemorySettings(settings);
          orgWritesAllowed =
            Boolean(orgSettings.enabled) &&
            Boolean(orgSettings.allowWrites) &&
            member?.status === 'active' &&
            member?.role === 'admin';
          orgAllowedCategories = orgSettings.allowedCategories
            ? new Set(orgSettings.allowedCategories)
            : null;
        } catch (error: any) {
          console.warn(
            '[AgentOS][RollingMemorySink] Failed to verify org memory publishing permissions.',
            {
              orgId,
              userId: update.userId,
              error: error?.message ?? error,
            }
          );
          orgWritesAllowed = false;
          orgAllowedCategories = null;
        }
      }

      const baseMetadata: Record<string, unknown> = {
        kind: 'rolling_memory',
        userId: update.userId,
        organizationId: update.organizationId,
        sessionId: update.sessionId,
        conversationId: update.conversationId,
        personaId: update.personaId,
        mode: update.mode,
        profileId: update.profileId ?? undefined,
        summaryUptoTimestamp: update.summaryUptoTimestamp ?? undefined,
        summaryUpdatedAt: update.summaryUpdatedAt ?? undefined,
      };

      // 1) Conversation snapshot (kept for inspection + quick retrieval)
      if (policy.scopes.conversation) {
        const stableId = `rolling_memory_${update.userId}_${update.conversationId}`;
        const snapshotTags = buildTags(update, 'conversation', { memoryTags });
        const snapshotMetadata: Record<string, unknown> = {
          ...baseMetadata,
          memory_json: update.summaryJson ?? undefined,
          scope: 'conversation',
        };

        if (resolved.persistToKnowledgeBase) {
          try {
            await sqlKnowledgeBaseService.addKnowledgeItem({
              id: stableId,
              type: 'rolling_memory',
              tags: snapshotTags,
              content: typeof update.summaryText === 'string' ? update.summaryText : '',
              metadata: snapshotMetadata,
            });
          } catch (error: any) {
            console.warn(
              '[AgentOS][RollingMemorySink] Knowledge base snapshot upsert failed (continuing).',
              {
                error: error?.message ?? error,
              }
            );
          }
        }

        if (resolved.persistToRag) {
          try {
            await ragService.ingestDocument({
              documentId: stableId,
              collectionId: resolved.ragCollectionIdByScope.conversation,
              category: 'conversation_memory',
              content: buildRollingMemoryText(update),
              metadata: {
                ...snapshotMetadata,
                tags: snapshotTags,
              },
            });
          } catch (error: any) {
            console.warn(
              '[AgentOS][RollingMemorySink] RAG snapshot ingestion failed (continuing).',
              {
                error: error?.message ?? error,
              }
            );
          }
        }
      }

      // 2) Atomic docs (better retrieval + knowledge graph primitives)
      if (!policy.storeAtomicDocs || atomicItems.length === 0) {
        return;
      }

      const scopesToPersist: MemoryScope[] = [];
      if (policy.scopes.conversation) scopesToPersist.push('conversation');
      if (policy.scopes.user) scopesToPersist.push('user');
      if (policy.scopes.persona) scopesToPersist.push('persona');
      if (policy.scopes.organization) scopesToPersist.push('organization');

      for (const scope of scopesToPersist) {
        if (scope === 'organization') {
          if (!wantsOrgWrites) continue;
          if (!orgWritesAllowed) continue;
        }

        for (const item of atomicItems) {
          const category = item.category.trim().toLowerCase();
          if (!categoryAllowedForScope(category, scope, policy)) continue;
          if (
            scope === 'organization' &&
            orgAllowedCategories &&
            !orgAllowedCategories.has(category)
          )
            continue;

          const scopeKey =
            scope === 'conversation'
              ? `${update.userId}_${update.conversationId}`
              : scope === 'user'
                ? `${update.userId}`
                : scope === 'persona'
                  ? `${update.userId}_${update.personaId}`
                  : `${update.organizationId ?? ''}`;

          const hash = stableHash([scope, scopeKey, category, normalizeText(item.text)]);
          const docId = `rolling_memory_item_${scope}_${scopeKey}_${category}_${hash}`;
          const docTags = buildTags(update, scope, { category, memoryTags });

          const itemMetadata: Record<string, unknown> = {
            ...baseMetadata,
            kind: 'rolling_memory_item',
            scope,
            category,
            hash,
            text: item.text,
            confidence: typeof item.confidence === 'number' ? item.confidence : undefined,
            sources: item.sources,
            entityName: item.entityName,
            ...(item.metadata ?? {}),
          };

          if (resolved.persistToKnowledgeBase) {
            try {
              await sqlKnowledgeBaseService.addKnowledgeItem({
                id: docId,
                type: 'rolling_memory_item',
                tags: docTags,
                content: buildAtomicMemoryText(item),
                metadata: itemMetadata,
              });
            } catch (error: any) {
              console.warn(
                '[AgentOS][RollingMemorySink] Knowledge base atomic upsert failed (continuing).',
                {
                  error: error?.message ?? error,
                }
              );
            }
          }

          if (resolved.persistToRag) {
            try {
              await ragService.ingestDocument({
                documentId: docId,
                collectionId: resolved.ragCollectionIdByScope[scope],
                category: 'conversation_memory',
                content: buildAtomicMemoryText(item),
                metadata: {
                  ...itemMetadata,
                  tags: docTags,
                },
              });
            } catch (error: any) {
              console.warn(
                '[AgentOS][RollingMemorySink] RAG atomic ingestion failed (continuing).',
                {
                  error: error?.message ?? error,
                }
              );
            }
          }
        }
      }
    },
  };
}
