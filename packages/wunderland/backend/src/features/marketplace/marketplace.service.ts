import { getAppDatabase, generateId } from '../../core/database/appDatabase.js';
import type { StorageAdapter } from '@framers/sql-storage-adapter';
import { listAgentOSPersonas } from '../../integrations/agentos/agentos.persona-registry.js';

type MarketplaceAgentRecord = {
  id: string;
  persona_id: string;
  label: string;
  tagline: string | null;
  description: string | null;
  category: string | null;
  access_level: string | null;
  pricing_model: string | null;
  price_cents: number | null;
  currency: string | null;
  featured: number;
  hero_image: string | null;
  stats: string | null;
  metadata: string | null;
  visibility: string | null;
  owner_user_id: string | null;
  organization_id: string | null;
  invite_token: string | null;
  artifact_path: string | null;
  status: string | null;
  approved_at: number | null;
  review_notes: string | null;
  created_at: number;
  updated_at: number;
};

export interface MarketplaceAgent {
  id: string;
  personaId: string;
  label: string;
  tagline: string | null;
  description: string | null;
  category: string | null;
  accessLevel: string | null;
  pricing: {
    model: string | null;
    priceCents: number | null;
    currency: string | null;
  };
  featured: boolean;
  heroImage: string | null;
  metrics: {
    downloads?: number;
    rating?: number;
    revenueMonthlyUsd?: number;
    customers?: number;
  };
  metadata: Record<string, unknown> | null;
  visibility: 'public' | 'unlisted' | 'org' | 'invite';
  status: 'draft' | 'pending' | 'published' | 'retired';
  ownerUserId?: string | null;
  organizationId?: string | null;
  inviteToken?: string | null;
  artifactPath?: string | null;
  approval: {
    approvedAt: number | null;
    reviewNotes?: string | null;
  };
  createdAt: number;
  updatedAt: number;
}

export type MarketplaceVisibility = MarketplaceAgent['visibility'];
export type MarketplaceStatus = MarketplaceAgent['status'];

export interface MarketplaceAgentCreateInput {
  id?: string;
  personaId: string;
  label: string;
  tagline: string | null;
  description: string | null;
  category: string;
  accessLevel: string;
  pricingModel: 'free' | 'freemium' | 'paid';
  priceCents?: number | null;
  currency?: string | null;
  featured?: boolean;
  visibility?: MarketplaceVisibility;
  status?: MarketplaceStatus;
  ownerUserId?: string | null;
  organizationId?: string | null;
  inviteToken?: string | null;
  artifactPath?: string | null;
  stats?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface MarketplaceAgentUpdateInput
  extends Partial<Omit<MarketplaceAgentCreateInput, 'personaId' | 'pricingModel'>> {
  personaId?: string;
  pricingModel?: 'free' | 'freemium' | 'paid';
  reviewNotes?: string | null;
}

export interface MarketplaceListOptions {
  visibility?: MarketplaceVisibility | MarketplaceVisibility[];
  ownerUserId?: string;
  organizationId?: string;
  includeDrafts?: boolean;
  status?: MarketplaceStatus | MarketplaceStatus[];
}

const INITIALISED_ADAPTERS = new WeakSet<StorageAdapter>();

async function ensureColumn(
  adapter: StorageAdapter,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  let exists = false;
  if (adapter.kind === 'postgres') {
    const row = await adapter.get<{ column_name: string }>(
      'SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1',
      [table.toLowerCase(), column.toLowerCase()],
    );
    exists = Boolean(row?.column_name);
  } else {
    const info = await adapter.all<{ name: string }>(`PRAGMA table_info(${table});`);
    exists = info.some((entry) => entry.name?.toLowerCase() === column.toLowerCase());
  }
  if (!exists) {
    await adapter.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
  }
}

async function ensureSchema(adapter: StorageAdapter): Promise<void> {
  if (INITIALISED_ADAPTERS.has(adapter)) {
    return;
  }

  await adapter.exec(`
    CREATE TABLE IF NOT EXISTS agentos_marketplace_agents (
      id TEXT PRIMARY KEY,
      persona_id TEXT NOT NULL,
      label TEXT NOT NULL,
      tagline TEXT,
      description TEXT,
      category TEXT,
      access_level TEXT,
      pricing_model TEXT,
      price_cents INTEGER,
      currency TEXT,
      featured INTEGER DEFAULT 0,
      hero_image TEXT,
      stats TEXT,
      metadata TEXT,
      visibility TEXT NOT NULL DEFAULT 'public',
      owner_user_id TEXT,
      organization_id TEXT,
      invite_token TEXT,
      artifact_path TEXT,
      status TEXT NOT NULL DEFAULT 'published',
      approved_at INTEGER,
      review_notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_agentos_marketplace_persona ON agentos_marketplace_agents(persona_id);
    CREATE INDEX IF NOT EXISTS idx_agentos_marketplace_featured ON agentos_marketplace_agents(featured);
    CREATE INDEX IF NOT EXISTS idx_agentos_marketplace_visibility ON agentos_marketplace_agents(visibility);
    CREATE INDEX IF NOT EXISTS idx_agentos_marketplace_status ON agentos_marketplace_agents(status);
  `);

  await ensureColumn(adapter, 'agentos_marketplace_agents', 'visibility', "TEXT DEFAULT 'public'");
  await ensureColumn(adapter, 'agentos_marketplace_agents', 'owner_user_id', 'TEXT');
  await ensureColumn(adapter, 'agentos_marketplace_agents', 'organization_id', 'TEXT');
  await ensureColumn(adapter, 'agentos_marketplace_agents', 'invite_token', 'TEXT');
  await ensureColumn(adapter, 'agentos_marketplace_agents', 'artifact_path', 'TEXT');
  await ensureColumn(adapter, 'agentos_marketplace_agents', 'status', "TEXT DEFAULT 'published'");
  await ensureColumn(adapter, 'agentos_marketplace_agents', 'approved_at', 'INTEGER');
  await ensureColumn(adapter, 'agentos_marketplace_agents', 'review_notes', 'TEXT');

  await adapter.exec(
    "UPDATE agentos_marketplace_agents SET visibility = 'public' WHERE visibility IS NULL OR visibility = '';",
  );
  await adapter.exec(
    "UPDATE agentos_marketplace_agents SET status = 'published' WHERE status IS NULL OR status = '';",
  );

  INITIALISED_ADAPTERS.add(adapter);
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('[Marketplace] Failed to parse JSON payload.', { value, error });
    return fallback;
  }
}

function hydrateRecord(record: MarketplaceAgentRecord): MarketplaceAgent {
  const stats = parseJson<Record<string, unknown>>(record.stats, {});
  return {
    id: record.id,
    personaId: record.persona_id,
    label: record.label,
    tagline: record.tagline,
    description: record.description,
    category: record.category,
    accessLevel: record.access_level,
    pricing: {
      model: record.pricing_model,
      priceCents: record.price_cents,
      currency: record.currency,
    },
    featured: record.featured === 1,
    heroImage: record.hero_image,
    metrics: {
      downloads: typeof stats.downloads === 'number' ? stats.downloads : undefined,
      rating: typeof stats.rating === 'number' ? stats.rating : undefined,
      revenueMonthlyUsd:
        typeof stats.revenueMonthlyUsd === 'number' ? stats.revenueMonthlyUsd : undefined,
      customers: typeof stats.customers === 'number' ? stats.customers : undefined,
    },
    metadata: parseJson<Record<string, unknown> | null>(record.metadata, null),
    visibility: (record.visibility ?? 'public') as MarketplaceAgent['visibility'],
    status: (record.status ?? 'published') as MarketplaceAgent['status'],
    ownerUserId: record.owner_user_id ?? undefined,
    organizationId: record.organization_id ?? undefined,
    inviteToken: record.invite_token ?? undefined,
    artifactPath: record.artifact_path ?? undefined,
    approval: {
      approvedAt: record.approved_at,
      reviewNotes: record.review_notes ?? undefined,
    },
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

const SEED_AGENTS: Array<{
  id: string;
  personaId: string;
  tagline: string;
  description: string;
  category: string;
  accessLevel: string;
  pricingModel: 'free' | 'freemium' | 'paid';
  priceCents?: number;
  currency?: string;
  featured?: boolean;
  visibility?: 'public' | 'unlisted' | 'org' | 'invite';
  status?: 'draft' | 'pending' | 'published' | 'retired';
  ownerUserId?: string | null;
  organizationId?: string | null;
  inviteToken?: string | null;
  artifactPath?: string | null;
  stats?: {
    downloads?: number;
    rating?: number;
    revenueMonthlyUsd?: number;
    customers?: number;
  };
}> = [
  {
    id: 'codepilot',
    personaId: 'code_pilot',
    tagline: 'Ship production-ready code faster with an expert pair-programmer.',
    description: 'Generate tests, refactor codebases, and reason about complex stack traces with a persona trained on pragmatic engineering workflows.',
    category: 'coding',
    accessLevel: 'metered',
    pricingModel: 'paid',
    priceCents: 4900,
    currency: 'USD',
    featured: true,
    stats: { downloads: 2100, rating: 4.8, revenueMonthlyUsd: 2450 },
  },
  {
    id: 'systems-architect',
    personaId: 'systems_architect',
    tagline: 'Blueprint service meshes, event streams, and infra plans in minutes.',
    description: 'Translate requirements into architecture diagrams, risk registers, and RFC scaffolds with a persona tuned for staff-level systems design.',
    category: 'coding',
    accessLevel: 'metered',
    pricingModel: 'paid',
    priceCents: 7900,
    currency: 'USD',
    featured: true,
    stats: { downloads: 850, rating: 4.9, revenueMonthlyUsd: 4200 },
  },
  {
    id: 'meeting-maestro',
    personaId: 'meeting_maestro',
    tagline: 'Drop into meetings and ship action-packed summaries automatically.',
    description: 'Capture transcripts, decisions, and owner-follow-ups with structured summaries that sync back to your workspace tools.',
    category: 'productivity',
    accessLevel: 'public',
    pricingModel: 'freemium',
    stats: { downloads: 5400, rating: 4.6, customers: 1200 },
  },
  {
    id: 'echo-diary',
    personaId: 'echo_diary',
    tagline: 'Reflect, organise, and score sentiment across your personal journal.',
    description: 'Automatically scaffold entries, surface recurring themes, and generate wellness nudges for long-term journaling practice.',
    category: 'productivity',
    accessLevel: 'public',
    pricingModel: 'free',
    stats: { downloads: 8900, rating: 4.8 },
  },
  {
    id: 'professor-astra',
    personaId: 'professor_astra',
    tagline: 'Adaptive tutor with spaced repetition and Socratic practice.',
    description: 'Build flashcards, concept maps, and graded quizzes that adapt to learner confidence in real time.',
    category: 'learning',
    accessLevel: 'public',
    pricingModel: 'freemium',
    stats: { downloads: 3400, rating: 4.7, customers: 925 },
  },
  {
    id: 'lc-audit',
    personaId: 'lc_audit',
    tagline: 'Audit LeetCode sessions with annotated breakdowns and pacing tips.',
    description: 'Replay coding interviews with automatic rubric scoring, annotated timelines, and growth plans for the next sprint.',
    category: 'auditing',
    accessLevel: 'metered',
    pricingModel: 'paid',
    priceCents: 9900,
    currency: 'USD',
    stats: { downloads: 320, rating: 4.6, revenueMonthlyUsd: 890 },
  },
  {
    id: 'nerf-generalist',
    personaId: 'nerf_generalist',
    tagline: 'Trusty generalist for everyday Q&A.',
    description: 'Concise, fast, and safe responses across broad knowledge domains. Perfect default companion for inbox triage and research snippets.',
    category: 'general',
    accessLevel: 'public',
    pricingModel: 'free',
    stats: { downloads: 15600, rating: 4.5 },
  },
  {
    id: 'v-researcher',
    personaId: 'v_researcher',
    tagline: 'Polymathic researcher for horizon scanning and synthesis.',
    description: 'Deconstruct academic papers, benchmark emerging tooling, and generate polished briefs for stakeholders.',
    category: 'general',
    accessLevel: 'global',
    pricingModel: 'freemium',
    stats: { downloads: 2450, rating: 4.9, revenueMonthlyUsd: 1240 },
  },
];

class MarketplaceService {
  private adapter: StorageAdapter | null = null;

  private async getAdapter(): Promise<StorageAdapter> {
    if (!this.adapter) {
      let adapter: StorageAdapter;
      try {
        adapter = getAppDatabase();
      } catch (error) {
        throw new Error('[Marketplace] App database is not initialised. Ensure initializeAppDatabase() runs before marketplace access.');
      }
      await ensureSchema(adapter);
      this.adapter = adapter;
      await this.seedIfNecessary(adapter);
    }
    return this.adapter;
  }

  private async seedIfNecessary(adapter: StorageAdapter): Promise<void> {
    const count = await adapter.get<{ total: number }>(
      'SELECT COUNT(1) as total FROM agentos_marketplace_agents',
    );
    if (count && count.total > 0) {
      return;
    }

    const personaMap = new Map(listAgentOSPersonas().map((persona) => [persona.personaId, persona]));
    const now = Date.now();

    for (const agent of SEED_AGENTS) {
      if (!personaMap.has(agent.personaId)) {
        console.warn('[Marketplace] Skipping seed agent because persona is missing.', agent);
        continue;
      }

      await adapter.run(
        `
          INSERT INTO agentos_marketplace_agents (
            id,
            persona_id,
            label,
            tagline,
          description,
          category,
          access_level,
          pricing_model,
          price_cents,
          currency,
          featured,
          hero_image,
          stats,
          metadata,
          visibility,
          owner_user_id,
          organization_id,
          invite_token,
          artifact_path,
          status,
          approved_at,
          review_notes,
          created_at,
          updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          agent.id,
          agent.personaId,
          personaMap.get(agent.personaId)?.label ?? agent.personaId,
          agent.tagline,
          agent.description,
          agent.category,
          agent.accessLevel,
          agent.pricingModel,
          agent.priceCents ?? null,
          agent.currency ?? 'USD',
          agent.featured ? 1 : 0,
          null,
          JSON.stringify(agent.stats ?? {}),
          null,
          agent.visibility ?? 'public',
          agent.ownerUserId ?? null,
          agent.organizationId ?? null,
          agent.inviteToken ?? null,
          agent.artifactPath ?? null,
          agent.status ?? 'published',
          agent.status === 'published' ? now : null,
          null,
          now,
          now,
        ],
      );
    }
  }

  public async listAgents(options: MarketplaceListOptions = {}): Promise<MarketplaceAgent[]> {
    const adapter = await this.getAdapter();
    const rows = await adapter.all<MarketplaceAgentRecord>('SELECT * FROM agentos_marketplace_agents ORDER BY featured DESC, label ASC');
    const requestedVisibility = Array.isArray(options.visibility)
      ? options.visibility
      : options.visibility
        ? [options.visibility]
        : ['public'];
    const requestedStatus = Array.isArray(options.status)
      ? options.status
      : options.status
        ? [options.status]
        : options.includeDrafts
          ? []
          : ['published'];

    return rows
      .map(hydrateRecord)
      .filter((agent) => {
        if (requestedStatus.length > 0 && !requestedStatus.includes(agent.status)) {
          return false;
        }
        if (!requestedVisibility.includes(agent.visibility)) {
          return false;
        }
        if (options.ownerUserId && agent.ownerUserId !== options.ownerUserId) {
          return false;
        }
        if (options.organizationId) {
          if (agent.visibility === 'org' && agent.organizationId !== options.organizationId) {
            return false;
          }
          if (agent.visibility === 'invite' && agent.organizationId && agent.organizationId !== options.organizationId) {
            return false;
          }
        }
        return true;
      });
  }

  public async getAgentById(id: string): Promise<MarketplaceAgent | null> {
    const adapter = await this.getAdapter();
    const row = await adapter.get<MarketplaceAgentRecord>(
      'SELECT * FROM agentos_marketplace_agents WHERE id = ? OR persona_id = ?',
      [id, id],
    );
    return row ? hydrateRecord(row) : null;
  }

  public async createAgent(input: MarketplaceAgentCreateInput): Promise<MarketplaceAgent> {
    const adapter = await this.getAdapter();
    const now = Date.now();
    const id = input.id ?? generateId();
    await adapter.run(
      `
        INSERT INTO agentos_marketplace_agents (
          id,
          persona_id,
          label,
          tagline,
          description,
          category,
          access_level,
          pricing_model,
          price_cents,
          currency,
          featured,
          hero_image,
          stats,
          metadata,
          visibility,
          owner_user_id,
          organization_id,
          invite_token,
          artifact_path,
          status,
          approved_at,
          review_notes,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        input.personaId,
        input.label,
        input.tagline,
        input.description,
        input.category,
        input.accessLevel,
        input.pricingModel,
        input.priceCents ?? null,
        input.currency ?? 'USD',
        input.featured ? 1 : 0,
        null,
        input.stats ? JSON.stringify(input.stats) : null,
        input.metadata ? JSON.stringify(input.metadata) : null,
        input.visibility ?? 'public',
        input.ownerUserId ?? null,
        input.organizationId ?? null,
        input.inviteToken ?? null,
        input.artifactPath ?? null,
        input.status ?? 'pending',
        input.status === 'published' ? now : null,
        null,
        now,
        now,
      ],
    );

    const created = await this.getAgentById(id);
    if (!created) {
      throw new Error('Failed to load created marketplace agent.');
    }
    return created;
  }

  public async updateAgent(id: string, updates: MarketplaceAgentUpdateInput): Promise<MarketplaceAgent | null> {
    const adapter = await this.getAdapter();
    const fields: string[] = [];
    const params: Array<string | number | null> = [];

    const assign = (clause: string, value: string | number | null): void => {
      fields.push(clause);
      params.push(value);
    };

    if (typeof updates.label !== 'undefined') {
      assign('label = ?', updates.label ?? null);
    }
    if (typeof updates.tagline !== 'undefined') {
      assign('tagline = ?', updates.tagline ?? null);
    }
    if (typeof updates.description !== 'undefined') {
      assign('description = ?', updates.description ?? null);
    }
    if (typeof updates.category !== 'undefined') {
      assign('category = ?', updates.category ?? null);
    }
    if (typeof updates.personaId !== 'undefined') {
      assign('persona_id = ?', updates.personaId ?? null);
    }
    if (typeof updates.accessLevel !== 'undefined') {
      assign('access_level = ?', updates.accessLevel ?? null);
    }
    if (typeof updates.pricingModel !== 'undefined') {
      assign('pricing_model = ?', updates.pricingModel ?? null);
    }
    if (typeof updates.priceCents !== 'undefined') {
      assign('price_cents = ?', updates.priceCents ?? null);
    }
    if (typeof updates.currency !== 'undefined') {
      assign('currency = ?', updates.currency ?? null);
    }
    if (typeof updates.featured !== 'undefined') {
      assign('featured = ?', updates.featured ? 1 : 0);
    }
    if (typeof updates.visibility !== 'undefined') {
      assign('visibility = ?', updates.visibility);
    }
    if (typeof updates.ownerUserId !== 'undefined') {
      assign('owner_user_id = ?', updates.ownerUserId ?? null);
    }
    if (typeof updates.organizationId !== 'undefined') {
      assign('organization_id = ?', updates.organizationId ?? null);
    }
    if (typeof updates.inviteToken !== 'undefined') {
      assign('invite_token = ?', updates.inviteToken ?? null);
    }
    if (typeof updates.artifactPath !== 'undefined') {
      assign('artifact_path = ?', updates.artifactPath ?? null);
    }
    if (typeof updates.stats !== 'undefined') {
      assign('stats = ?', updates.stats ? JSON.stringify(updates.stats) : null);
    }
    if (typeof updates.metadata !== 'undefined') {
      assign('metadata = ?', updates.metadata ? JSON.stringify(updates.metadata) : null);
    }
    if (typeof updates.reviewNotes !== 'undefined') {
      assign('review_notes = ?', updates.reviewNotes ?? null);
    }
    if (typeof updates.status !== 'undefined') {
      assign('status = ?', updates.status);
      if (updates.status === 'published') {
        assign('approved_at = ?', Date.now());
      } else if (updates.status === 'pending' || updates.status === 'draft') {
        assign('approved_at = ?', null);
      }
    }

    if (!fields.length) {
      return this.getAgentById(id);
    }

    const now = Date.now();
    fields.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await adapter.run(
      `UPDATE agentos_marketplace_agents SET ${fields.join(', ')} WHERE id = ?`,
      params,
    );

    return this.getAgentById(id);
  }
}

export const marketplaceService = new MarketplaceService();
