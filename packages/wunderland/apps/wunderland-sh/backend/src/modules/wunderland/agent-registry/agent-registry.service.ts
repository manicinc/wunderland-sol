/**
 * @file agent-registry.service.ts
 * @description Injectable service for the Wunderland Agent Registry.
 *
 * Encapsulates business logic for agent identity management, including
 * registration, profile updates, ownership validation, provenance chain
 * verification, and manual anchoring.
 *
 * This service will be wired to a persistence layer (database / AgentOS
 * storage adapter) in a future implementation pass.
 */

import { Injectable } from '@nestjs/common';
import type { StorageAdapter } from '@framers/sql-storage-adapter';
import { DatabaseService } from '../../../database/database.service.js';
import {
  AgentAlreadyRegisteredException,
  AgentNotFoundException,
  AgentOwnershipException,
  AgentImmutableException,
  AgentToolsetUnresolvedException,
} from '../wunderland.exceptions.js';
import type { RegisterAgentDto, UpdateAgentDto, ListAgentsQueryDto } from '../dto/index.js';
import { buildToolsetManifestV1, computeToolsetHashV1 } from '../immutability/toolset-manifest.js';

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

type AgentProfile = {
  seedId: string;
  ownerUserId: string;
  displayName: string;
  bio: string;
  avatarUrl?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  personality: Record<string, number>;
  security: Record<string, unknown>;
  immutability: {
    storagePolicy: string;
    sealedAt: string | null;
    active: boolean;
    toolsetHash: string | null;
  };
  systemPrompt?: string | null;
  capabilities: string[];
  citizen: {
    level: number;
    xp: number;
    totalPosts: number;
    joinedAt: string;
    isActive: boolean;
  };
  provenance: {
    enabled: boolean;
    genesisEventId?: string | null;
    publicKey?: string | null;
  };
  permissions: {
    profileName: string;
    displayName: string;
    description: string;
    can: string[];
    cannot: string[];
    allowedTools: string[];
    flags: {
      allowFileSystem: boolean;
      allowCliExecution: boolean;
      allowSystemModification: boolean;
    };
    maxRiskTier: string;
  };
};

type AgentSummary = Pick<
  AgentProfile,
  | 'seedId'
  | 'displayName'
  | 'bio'
  | 'avatarUrl'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
  | 'citizen'
  | 'provenance'
  | 'capabilities'
>;

type WunderlandAgentRow = {
  seed_id: string;
  owner_user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  hexaco_traits: string;
  security_profile: string;
  inference_hierarchy: string;
  step_up_auth_config: string | null;
  base_system_prompt: string | null;
  allowed_tool_ids: string | null;
  toolset_manifest_json?: string | null;
  toolset_hash?: string | null;
  genesis_event_id: string | null;
  public_key: string | null;
  storage_policy: string | null;
  sealed_at?: number | null;
  provenance_enabled: number;
  tool_access_profile: string | null;
  status: string | null;
  created_at: number;
  updated_at: number;
};

type WunderlandCitizenRow = {
  seed_id: string;
  level: number;
  xp: number;
  total_posts: number;
  post_rate_limit: number | null;
  subscribed_topics: string | null;
  is_active: number;
  joined_at: number;
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

function epochToIso(value: number | null | undefined): string {
  const ms = typeof value === 'number' ? value : Date.now();
  return new Date(ms).toISOString();
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v ?? '').trim()).filter((v) => v.length > 0);
}

type ResolvedPermissions = {
  profileName: string;
  displayName: string;
  description: string;
  can: string[];
  cannot: string[];
  allowedTools: string[];
  flags: {
    allowFileSystem: boolean;
    allowCliExecution: boolean;
    allowSystemModification: boolean;
  };
  maxRiskTier: string;
};

const TOOL_ACCESS_PROFILE_DEFINITIONS: Record<string, ResolvedPermissions> = {
  'social-citizen': {
    profileName: 'social-citizen',
    displayName: 'Social Citizen',
    description: 'Full social participation. No file system, CLI, or system access.',
    can: [
      'Post, comment, and vote in enclaves',
      'Search the web and browse feeds',
      'Use media tools (GIFs, images, voice)',
    ],
    cannot: [
      'Access the file system',
      'Execute system commands or code',
      'Install or remove packages',
      'Send external messages',
      'Modify files on the system',
      'Run shell commands',
    ],
    allowedTools: [
      'social_post',
      'feed_read',
      'web_search',
      'news_search',
      'giphy_search',
      'image_search',
      'text_to_speech',
    ],
    flags: { allowFileSystem: false, allowCliExecution: false, allowSystemModification: false },
    maxRiskTier: 'TIER_1_AUTONOMOUS',
  },
  'social-observer': {
    profileName: 'social-observer',
    displayName: 'Social Observer',
    description: 'Read-only access: browse feeds and search the web.',
    can: ['Search the web and browse feeds', 'Use media tools (GIFs, images, voice)'],
    cannot: [
      'Post, comment, or vote',
      'Access the file system',
      'Execute system commands or code',
      'Install or remove packages',
      'Send external messages',
      'Modify files on the system',
      'Run shell commands',
    ],
    allowedTools: ['web_search', 'news_search', 'giphy_search', 'image_search', 'text_to_speech'],
    flags: { allowFileSystem: false, allowCliExecution: false, allowSystemModification: false },
    maxRiskTier: 'TIER_1_AUTONOMOUS',
  },
  'social-creative': {
    profileName: 'social-creative',
    displayName: 'Social Creative',
    description: 'Enhanced social participation with creative tools.',
    can: [
      'Post, comment, and vote in enclaves',
      'Search the web and browse feeds',
      'Use media tools (GIFs, images, voice)',
      'Read and write agent memory',
    ],
    cannot: [
      'Access the file system',
      'Execute system commands or code',
      'Install or remove packages',
      'Send external messages',
      'Modify files on the system',
      'Run shell commands',
    ],
    allowedTools: [
      'social_post',
      'feed_read',
      'memory_read',
      'web_search',
      'news_search',
      'giphy_search',
      'image_search',
      'text_to_speech',
    ],
    flags: { allowFileSystem: false, allowCliExecution: false, allowSystemModification: false },
    maxRiskTier: 'TIER_1_AUTONOMOUS',
  },
  assistant: {
    profileName: 'assistant',
    displayName: 'Assistant',
    description: 'Private assistant mode with read-only file access.',
    can: [
      'Search the web and browse feeds',
      'Use media tools',
      'Read and write agent memory',
      'Access the file system',
      'Use productivity tools',
    ],
    cannot: [
      'Post to social enclaves',
      'Execute system commands or code',
      'Install or remove packages',
      'Run shell commands',
    ],
    allowedTools: [
      'web_search',
      'news_search',
      'giphy_search',
      'image_search',
      'text_to_speech',
      'memory_read',
      'memory_write',
      'file_search',
      'file_read',
      'calendar',
    ],
    flags: { allowFileSystem: true, allowCliExecution: false, allowSystemModification: false },
    maxRiskTier: 'TIER_2_ASYNC_REVIEW',
  },
  unrestricted: {
    profileName: 'unrestricted',
    displayName: 'Unrestricted',
    description: 'Full access to all tools. Admin only.',
    can: ['All tool categories allowed'],
    cannot: [],
    allowedTools: ['*'],
    flags: { allowFileSystem: true, allowCliExecution: true, allowSystemModification: true },
    maxRiskTier: 'TIER_3_SYNC_HITL',
  },
};

function resolveAgentPermissions(profileName: string): ResolvedPermissions {
  return (
    TOOL_ACCESS_PROFILE_DEFINITIONS[profileName] ||
    TOOL_ACCESS_PROFILE_DEFINITIONS['social-citizen']
  );
}

const VALID_TOOL_ACCESS_PROFILES = new Set(Object.keys(TOOL_ACCESS_PROFILE_DEFINITIONS));

@Injectable()
export class AgentRegistryService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Resolve the permissions object for a given tool access profile name.
   * Useful for listing all available profiles in API responses.
   */
  resolvePermissions(profileName: string): ResolvedPermissions {
    return resolveAgentPermissions(profileName);
  }

  async registerAgent(userId: string, dto: RegisterAgentDto): Promise<{ agent: AgentProfile }> {
    const now = Date.now();
    const seedId = dto.seedId.trim();

    try {
      await this.db.transaction(async (trx: StorageAdapter) => {
        const existing = await trx.get<{ seed_id: string }>(
          'SELECT seed_id FROM wunderbots WHERE seed_id = ? LIMIT 1',
          [seedId]
        );
        if (existing) {
          throw new AgentAlreadyRegisteredException(seedId);
        }

        const capabilities = normalizeStringArray(dto.capabilities);
        const securityProfile = {
          preLlmClassifier: Boolean(dto.security?.preLlmClassifier),
          dualLlmAuditor: Boolean(dto.security?.dualLlmAuditor),
          outputSigning: Boolean(dto.security?.outputSigning),
          storagePolicy: dto.security?.storagePolicy ?? 'sealed',
        };

        const toolAccessProfile =
          dto.toolAccessProfile && VALID_TOOL_ACCESS_PROFILES.has(dto.toolAccessProfile)
            ? dto.toolAccessProfile
            : 'social-citizen';

        await trx.run(
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
	              tool_access_profile,
	              status,
	              created_at,
	              updated_at
	            ) VALUES (
	              @seed_id,
	              @owner_user_id,
	              @display_name,
	              @bio,
	              @avatar_url,
	              @hexaco_traits,
	              @security_profile,
	              @inference_hierarchy,
	              @step_up_auth_config,
	              @base_system_prompt,
	              @allowed_tool_ids,
	              @genesis_event_id,
	              @public_key,
	              @storage_policy,
	              @sealed_at,
	              @provenance_enabled,
	              @tool_access_profile,
	              @status,
	              @created_at,
	              @updated_at
	            )
	          `,
          {
            seed_id: seedId,
            owner_user_id: userId,
            display_name: dto.displayName,
            bio: dto.bio ?? '',
            avatar_url: null,
            hexaco_traits: JSON.stringify(dto.personality ?? {}),
            security_profile: JSON.stringify(securityProfile),
            inference_hierarchy: JSON.stringify({ profile: 'default' }),
            step_up_auth_config: null,
            base_system_prompt: dto.systemPrompt ?? null,
            allowed_tool_ids: JSON.stringify(capabilities),
            genesis_event_id: null,
            public_key: null,
            storage_policy: securityProfile.storagePolicy,
            sealed_at: null,
            provenance_enabled: securityProfile.outputSigning ? 1 : 0,
            tool_access_profile: toolAccessProfile,
            status: 'active',
            created_at: now,
            updated_at: now,
          }
        );

        await trx.run(
          `
            INSERT INTO wunderland_citizens (
              seed_id,
              level,
              xp,
              total_posts,
              post_rate_limit,
              subscribed_topics,
              is_active,
              joined_at
            ) VALUES (
              @seed_id,
              @level,
              @xp,
              @total_posts,
              @post_rate_limit,
              @subscribed_topics,
              @is_active,
              @joined_at
            )
          `,
          {
            seed_id: seedId,
            level: 1,
            xp: 0,
            total_posts: 0,
            post_rate_limit: 10,
            subscribed_topics: JSON.stringify([]),
            is_active: 1,
            joined_at: now,
          }
        );
      });
    } catch (error) {
      if (error instanceof AgentAlreadyRegisteredException) throw error;
      throw error;
    }

    const agent = await this.getAgentBySeedIdOrThrow(seedId);
    return { agent: this.mapAgentProfile(agent.agent, agent.citizen) };
  }

  async listAgents(query: ListAgentsQueryDto = {}): Promise<PaginatedResponse<AgentSummary>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 25)));
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: Array<string | number> = [];

    if (query.status) {
      where.push('a.status = ?');
      params.push(query.status);
    } else {
      where.push("a.status != 'archived'");
    }

    if (query.capability) {
      where.push('a.allowed_tool_ids LIKE ?');
      params.push(`%"${query.capability}"%`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const totalRow = await this.db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM wunderbots a ${whereSql}`,
      params
    );
    const total = totalRow?.count ?? 0;

    const rows = await this.db.all<
      WunderlandAgentRow &
        Pick<WunderlandCitizenRow, 'level' | 'xp' | 'total_posts' | 'joined_at' | 'is_active'>
    >(
      `
        SELECT
          a.*,
          c.level as level,
          c.xp as xp,
          c.total_posts as total_posts,
          c.joined_at as joined_at,
          c.is_active as is_active
        FROM wunderbots a
        LEFT JOIN wunderland_citizens c ON c.seed_id = a.seed_id
        ${whereSql}
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    const items = rows.map((row) =>
      this.mapAgentSummary(row as unknown as WunderlandAgentRow, {
        seed_id: row.seed_id,
        level: row.level ?? 1,
        xp: row.xp ?? 0,
        total_posts: row.total_posts ?? 0,
        post_rate_limit: null,
        subscribed_topics: null,
        is_active: row.is_active ?? 1,
        joined_at: row.joined_at ?? row.created_at,
      })
    );

    return { items, page, limit, total };
  }

  async listOwnedAgents(
    userId: string,
    query: ListAgentsQueryDto = {}
  ): Promise<PaginatedResponse<AgentSummary>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 25)));
    const offset = (page - 1) * limit;

    const where: string[] = ['a.owner_user_id = ?'];
    const params: Array<string | number> = [userId];

    if (query.status) {
      where.push('a.status = ?');
      params.push(query.status);
    } else {
      where.push("a.status != 'archived'");
    }

    if (query.capability) {
      where.push('a.allowed_tool_ids LIKE ?');
      params.push(`%"${query.capability}"%`);
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const totalRow = await this.db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM wunderbots a ${whereSql}`,
      params
    );
    const total = totalRow?.count ?? 0;

    const rows = await this.db.all<
      WunderlandAgentRow &
        Pick<WunderlandCitizenRow, 'level' | 'xp' | 'total_posts' | 'joined_at' | 'is_active'>
    >(
      `
        SELECT
          a.*,
          c.level as level,
          c.xp as xp,
          c.total_posts as total_posts,
          c.joined_at as joined_at,
          c.is_active as is_active
        FROM wunderbots a
        LEFT JOIN wunderland_citizens c ON c.seed_id = a.seed_id
        ${whereSql}
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    const items = rows.map((row) =>
      this.mapAgentSummary(row as unknown as WunderlandAgentRow, {
        seed_id: row.seed_id,
        level: row.level ?? 1,
        xp: row.xp ?? 0,
        total_posts: row.total_posts ?? 0,
        post_rate_limit: null,
        subscribed_topics: null,
        is_active: row.is_active ?? 1,
        joined_at: row.joined_at ?? row.created_at,
      })
    );

    return { items, page, limit, total };
  }

  async getAgent(seedId: string): Promise<{ agent: AgentProfile }> {
    const result = await this.getAgentBySeedIdOrThrow(seedId);
    return { agent: this.mapAgentProfile(result.agent, result.citizen) };
  }

  async updateAgent(
    userId: string,
    seedId: string,
    dto: UpdateAgentDto
  ): Promise<{ agent: AgentProfile }> {
    const now = Date.now();

    await this.db.transaction(async (trx) => {
      const existing = await trx.get<WunderlandAgentRow>(
        'SELECT * FROM wunderbots WHERE seed_id = ? LIMIT 1',
        [seedId]
      );
      if (!existing) throw new AgentNotFoundException(seedId);
      if (existing.owner_user_id !== userId) throw new AgentOwnershipException(seedId);

      // Enforce immutability for sealed agents after explicit sealing.
      // During setup (sealed_at is null), configuration remains editable.
      const existingSecurityParsed = parseJsonOr<Record<string, unknown>>(
        existing.security_profile,
        {}
      );
      const storagePolicy =
        typeof existingSecurityParsed.storagePolicy === 'string'
          ? existingSecurityParsed.storagePolicy
          : (existing.storage_policy ?? '');
      const sealedAt =
        typeof existing.sealed_at === 'number' && Number.isFinite(existing.sealed_at)
          ? existing.sealed_at
          : null;
      const isSealed = storagePolicy === 'sealed' && sealedAt !== null;

      if (isSealed) {
        const SEALED_MUTATION_FIELDS = [
          'displayName',
          'bio',
          'systemPrompt',
          'personality',
          'security',
          'capabilities',
          'metadata',
        ] as const;
        const attempted = SEALED_MUTATION_FIELDS.filter((f) => (dto as any)[f] !== undefined);
        if (attempted.length > 0) {
          throw new AgentImmutableException(seedId, [...attempted]);
        }
      }

      const existingCapabilities = parseJsonOr<string[]>(existing.allowed_tool_ids, []);
      const capabilities = dto.capabilities
        ? normalizeStringArray(dto.capabilities)
        : existingCapabilities;

      const existingPersonality = parseJsonOr<Record<string, number>>(existing.hexaco_traits, {});
      const personality = dto.personality ? (dto.personality as any) : existingPersonality;

      const existingSecurity = parseJsonOr<Record<string, unknown>>(existing.security_profile, {});
      const security = dto.security
        ? { ...existingSecurity, ...(dto.security as any) }
        : existingSecurity;

      const nextStoragePolicy =
        typeof (security as any).storagePolicy === 'string'
          ? String((security as any).storagePolicy)
          : typeof existingSecurity.storagePolicy === 'string'
            ? String(existingSecurity.storagePolicy)
            : (existing.storage_policy ?? 'sealed');
      const outputSigning = (security as any).outputSigning;
      const nextProvenanceEnabled =
        typeof outputSigning === 'boolean'
          ? outputSigning
            ? 1
            : 0
          : Number(existing.provenance_enabled ?? 0);

      const nextToolAccessProfile =
        dto.toolAccessProfile && VALID_TOOL_ACCESS_PROFILES.has(dto.toolAccessProfile)
          ? dto.toolAccessProfile
          : undefined;

      await trx.run(
        `
		          UPDATE wunderbots
		             SET display_name = COALESCE(@display_name, display_name),
		                 bio = COALESCE(@bio, bio),
		                 base_system_prompt = COALESCE(@base_system_prompt, base_system_prompt),
	                 hexaco_traits = @hexaco_traits,
	                 security_profile = @security_profile,
	                 storage_policy = @storage_policy,
	                 provenance_enabled = @provenance_enabled,
	                 allowed_tool_ids = @allowed_tool_ids,
	                 tool_access_profile = COALESCE(@tool_access_profile, tool_access_profile),
	                 inference_hierarchy = COALESCE(@inference_hierarchy, inference_hierarchy),
	                 avatar_url = COALESCE(@avatar_url, avatar_url),
	                 updated_at = @updated_at
	           WHERE seed_id = @seed_id
	        `,
        {
          seed_id: seedId,
          display_name: dto.displayName ?? null,
          bio: dto.bio ?? null,
          base_system_prompt: dto.systemPrompt ?? null,
          hexaco_traits: JSON.stringify(personality ?? {}),
          security_profile: JSON.stringify(security ?? {}),
          storage_policy: nextStoragePolicy,
          provenance_enabled: nextProvenanceEnabled,
          allowed_tool_ids: JSON.stringify(capabilities),
          tool_access_profile: nextToolAccessProfile ?? null,
          inference_hierarchy: dto.inferenceHierarchy ? JSON.stringify(dto.inferenceHierarchy) : null,
          avatar_url: dto.avatarUrl ?? null,
          updated_at: now,
        }
      );
    });

    const result = await this.getAgentBySeedIdOrThrow(seedId);
    return { agent: this.mapAgentProfile(result.agent, result.citizen) };
  }

  async sealAgent(
    userId: string,
    seedId: string
  ): Promise<{ seedId: string; sealed: boolean; sealedAt: string }> {
    const now = Date.now();

    await this.db.transaction(async (trx: StorageAdapter) => {
      const existing = await trx.get<WunderlandAgentRow>(
        'SELECT * FROM wunderbots WHERE seed_id = ? LIMIT 1',
        [seedId]
      );
      if (!existing) throw new AgentNotFoundException(seedId);
      if (existing.owner_user_id !== userId) throw new AgentOwnershipException(seedId);

      const sealedAt =
        typeof existing.sealed_at === 'number' && Number.isFinite(existing.sealed_at)
          ? existing.sealed_at
          : null;
      const toolsetHashExisting =
        typeof existing.toolset_hash === 'string' && existing.toolset_hash.trim()
          ? existing.toolset_hash.trim()
          : null;

      // Always compute toolset hash when sealing for the first time.
      // For already-sealed agents, this acts as a safe backfill when toolset_hash is still null.
      const shouldComputeToolset = sealedAt === null || toolsetHashExisting === null;
      const capabilities = parseJsonOr<string[]>(existing.allowed_tool_ids, []);
      const toolsetManifest = shouldComputeToolset ? buildToolsetManifestV1(capabilities) : null;
      const toolsetComputed = toolsetManifest ? computeToolsetHashV1(toolsetManifest) : null;

      if (sealedAt !== null) {
        if (!toolsetHashExisting && toolsetComputed) {
          await trx.run(
            `
	              UPDATE wunderbots
	                 SET toolset_manifest_json = @toolset_manifest_json,
	                     toolset_hash = @toolset_hash,
	                     updated_at = @updated_at
               WHERE seed_id = @seed_id
            `,
            {
              seed_id: seedId,
              toolset_manifest_json: toolsetComputed.manifestJson,
              toolset_hash: toolsetComputed.toolsetHash,
              updated_at: now,
            }
          );
        }
        return;
      }

      if (toolsetManifest && toolsetManifest.unresolvedCapabilities.length > 0) {
        throw new AgentToolsetUnresolvedException(seedId, toolsetManifest.unresolvedCapabilities);
      }

      const existingSecurity = parseJsonOr<Record<string, unknown>>(existing.security_profile, {});
      const nextSecurity = { ...existingSecurity, storagePolicy: 'sealed' };

      await trx.run(
        `
          UPDATE wunderbots
             SET security_profile = @security_profile,
                 storage_policy = @storage_policy,
                 sealed_at = @sealed_at,
                 toolset_manifest_json = @toolset_manifest_json,
                 toolset_hash = @toolset_hash,
                 updated_at = @updated_at
           WHERE seed_id = @seed_id
        `,
        {
          seed_id: seedId,
          security_profile: JSON.stringify(nextSecurity),
          storage_policy: 'sealed',
          sealed_at: now,
          toolset_manifest_json: toolsetComputed?.manifestJson ?? null,
          toolset_hash: toolsetComputed?.toolsetHash ?? null,
          updated_at: now,
        }
      );
    });

    const result = await this.getAgentBySeedIdOrThrow(seedId);
    const sealedAt =
      typeof result.agent.sealed_at === 'number' && Number.isFinite(result.agent.sealed_at)
        ? result.agent.sealed_at
        : now;
    return { seedId, sealed: true, sealedAt: epochToIso(sealedAt) };
  }

  async archiveAgent(
    userId: string,
    seedId: string
  ): Promise<{ seedId: string; archived: boolean }> {
    const now = Date.now();
    await this.db.transaction(async (trx) => {
      const existing = await trx.get<WunderlandAgentRow>(
        'SELECT * FROM wunderbots WHERE seed_id = ? LIMIT 1',
        [seedId]
      );
      if (!existing) throw new AgentNotFoundException(seedId);
      if (existing.owner_user_id !== userId) throw new AgentOwnershipException(seedId);

      await trx.run('UPDATE wunderbots SET status = ?, updated_at = ? WHERE seed_id = ?', [
        'archived',
        now,
        seedId,
      ]);
      await trx.run('UPDATE wunderland_citizens SET is_active = 0 WHERE seed_id = ?', [seedId]);
    });

    return { seedId, archived: true };
  }

  async verifyProvenance(seedId: string): Promise<{
    seedId: string;
    verified: boolean;
    details: { enabled: boolean; publicKeyPresent: boolean; genesisPresent: boolean };
  }> {
    const result = await this.getAgentBySeedIdOrThrow(seedId);
    const enabled = Boolean(result.agent.provenance_enabled);
    const publicKeyPresent = Boolean(result.agent.public_key);
    const genesisPresent = Boolean(result.agent.genesis_event_id);
    return {
      seedId,
      verified: enabled && publicKeyPresent && genesisPresent,
      details: { enabled, publicKeyPresent, genesisPresent },
    };
  }

  async triggerAnchor(
    userId: string,
    seedId: string
  ): Promise<{
    seedId: string;
    anchored: boolean;
    timestamp: string;
    reason?: string;
  }> {
    const result = await this.getAgentBySeedIdOrThrow(seedId);
    if (result.agent.owner_user_id !== userId) throw new AgentOwnershipException(seedId);
    return {
      seedId,
      anchored: false,
      timestamp: new Date().toISOString(),
      reason: 'No anchor provider configured for this environment.',
    };
  }

  private async getAgentBySeedIdOrThrow(seedId: string): Promise<{
    agent: WunderlandAgentRow;
    citizen: WunderlandCitizenRow;
  }> {
    const agent = await this.db.get<WunderlandAgentRow>(
      'SELECT * FROM wunderbots WHERE seed_id = ? LIMIT 1',
      [seedId]
    );
    if (!agent) throw new AgentNotFoundException(seedId);
    const citizen =
      (await this.db.get<WunderlandCitizenRow>(
        'SELECT * FROM wunderland_citizens WHERE seed_id = ? LIMIT 1',
        [seedId]
      )) ??
      ({
        seed_id: seedId,
        level: 1,
        xp: 0,
        total_posts: 0,
        post_rate_limit: 10,
        subscribed_topics: '[]',
        is_active: 1,
        joined_at: agent.created_at,
      } satisfies WunderlandCitizenRow);
    return { agent, citizen };
  }

  private mapAgentProfile(agent: WunderlandAgentRow, citizen: WunderlandCitizenRow): AgentProfile {
    const personality = parseJsonOr<Record<string, number>>(agent.hexaco_traits, {});
    const security = parseJsonOr<Record<string, unknown>>(agent.security_profile, {});
    const capabilities = parseJsonOr<string[]>(agent.allowed_tool_ids, []);
    const storagePolicy =
      typeof security.storagePolicy === 'string'
        ? security.storagePolicy
        : (agent.storage_policy ?? 'encrypted');
    const sealedAt =
      typeof agent.sealed_at === 'number' && Number.isFinite(agent.sealed_at)
        ? epochToIso(agent.sealed_at)
        : null;
    const toolsetHash =
      typeof agent.toolset_hash === 'string' && agent.toolset_hash.trim()
        ? agent.toolset_hash.trim()
        : null;

    const profileName = agent.tool_access_profile || 'social-citizen';

    return {
      seedId: agent.seed_id,
      ownerUserId: agent.owner_user_id,
      displayName: agent.display_name,
      bio: agent.bio ?? '',
      avatarUrl: agent.avatar_url,
      status: agent.status ?? 'active',
      createdAt: epochToIso(agent.created_at),
      updatedAt: epochToIso(agent.updated_at),
      personality,
      security,
      immutability: {
        storagePolicy,
        sealedAt,
        active: storagePolicy === 'sealed' && sealedAt !== null,
        toolsetHash,
      },
      systemPrompt: agent.base_system_prompt,
      capabilities,
      citizen: {
        level: citizen.level ?? 1,
        xp: citizen.xp ?? 0,
        totalPosts: citizen.total_posts ?? 0,
        joinedAt: epochToIso(citizen.joined_at),
        isActive: Boolean(citizen.is_active),
      },
      provenance: {
        enabled: Boolean(agent.provenance_enabled),
        genesisEventId: agent.genesis_event_id,
        publicKey: agent.public_key,
      },
      permissions: resolveAgentPermissions(profileName),
    };
  }

  private mapAgentSummary(agent: WunderlandAgentRow, citizen: WunderlandCitizenRow): AgentSummary {
    const base = this.mapAgentProfile(agent, citizen);
    const summary: AgentSummary = {
      seedId: base.seedId,
      displayName: base.displayName,
      bio: base.bio,
      avatarUrl: base.avatarUrl,
      status: base.status,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      citizen: base.citizen,
      provenance: base.provenance,
      capabilities: base.capabilities,
    };
    return summary;
  }
}
