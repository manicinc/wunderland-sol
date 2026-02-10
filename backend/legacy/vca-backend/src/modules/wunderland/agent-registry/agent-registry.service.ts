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

import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import type { StorageAdapter } from '@framers/sql-storage-adapter';
import { CHANNEL_CATALOG, TOOL_CATALOG } from '@framers/agentos-extensions-registry';
import { SKILLS_CATALOG } from '@framers/agentos-skills-registry';
import { DatabaseService } from '../../../database/database.service.js';
import { OrchestrationService } from '../orchestration/orchestration.service.js';
import {
  AgentAlreadyRegisteredException,
  AgentNotFoundException,
  AgentOwnershipException,
  AgentImmutableException,
  AgentToolsetUnresolvedException,
} from '../wunderland.exceptions.js';
import type { RegisterAgentDto, UpdateAgentDto, ListAgentsQueryDto } from '../dto/index.js';
import { buildToolsetManifestV1, computeToolsetHashV1 } from '../immutability/toolset-manifest.js';
import { isHostedMode } from '../hosted-mode.js';

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
  skills: string[];
  channels: string[];
  timezone: string;
  postingDirectives: Record<string, unknown> | null;
  executionMode: 'autonomous' | 'human-all' | 'human-dangerous';
  voiceConfig: {
    provider?: string;
    voiceId?: string;
    languageCode?: string;
    customParams?: Record<string, unknown>;
  } | null;
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
  | 'skills'
  | 'channels'
  | 'timezone'
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
  skills_json: string | null;
  channels_json: string | null;
  timezone: string | null;
  tool_access_profile: string | null;
  posting_directives: string | null;
  execution_mode: string | null;
  voice_config: string | null;
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

const TOOL_PACK_NAMES = new Set(TOOL_CATALOG.map((t) => t.name));
const CHANNEL_PLATFORMS = new Set(CHANNEL_CATALOG.map((c) => c.platform));
const SKILL_BY_NAME = new Map(SKILLS_CATALOG.map((s) => [s.name, s] as const));

const HOSTED_BLOCKED_EXTENSION_PACKAGES = new Set<string>([
  '@framers/agentos-ext-cli-executor',
  '@framers/agentos-ext-skills',
]);

const HOSTED_BLOCKED_CAPABILITY_IDS = new Set<string>([
  // Extension pack slugs
  'cli-executor',
  'skills',
  // Direct tool IDs (defense-in-depth; these should come from the packs above)
  'shell_execute',
  'file_read',
  'file_write',
  'list_directory',
  'skills_list',
  'skills_read',
  'skills_enable',
  'skills_install',
]);

const HOSTED_BLOCKED_SKILL_NAMES = new Set<string>([
  // These rely on local CLI access even though requiredTools is empty today.
  'github',
  'git',
  '1password',
]);

function validateCapabilitiesOrThrow(
  capabilities: string[],
  opts: { enforceHostedRestrictions: boolean }
): void {
  if (capabilities.length === 0) return;

  // Fast path: accept known pack names. If anything isn't a pack name, fall back to registry resolution.
  const hasUnknownPackName = capabilities.some((cap) => !TOOL_PACK_NAMES.has(cap));
  const toolsetManifest = hasUnknownPackName ? buildToolsetManifestV1(capabilities) : null;

  const unresolved = toolsetManifest?.unresolvedCapabilities ?? [];
  if (unresolved.length > 0) {
    throw new BadRequestException({
      message: 'Some capabilities/tools are not recognized.',
      unresolvedCapabilities: unresolved,
    });
  }

  if (!opts.enforceHostedRestrictions) return;

  const blockedCapabilities = capabilities.filter((cap) => HOSTED_BLOCKED_CAPABILITY_IDS.has(cap));
  if (blockedCapabilities.length > 0) {
    throw new BadRequestException({
      message: 'Some capabilities/tools are not allowed in hosted mode.',
      blockedCapabilities,
    });
  }

  // If capabilities were all pack names, resolve them via the registry snapshot to check packages.
  const manifest = toolsetManifest ?? buildToolsetManifestV1(capabilities);
  const blockedExtensions = manifest.resolvedExtensions
    .filter((ext) => HOSTED_BLOCKED_EXTENSION_PACKAGES.has(ext.package))
    .map((ext) => ext.package);

  if (blockedExtensions.length > 0) {
    throw new BadRequestException({
      message: 'Some capability extensions are not allowed in hosted mode.',
      blockedExtensions: Array.from(new Set(blockedExtensions)).sort(),
    });
  }
}

function validateSkillsOrThrow(
  skills: string[],
  opts: { enforceHostedRestrictions: boolean }
): void {
  if (skills.length === 0) return;

  const unknown = skills.filter((name) => !SKILL_BY_NAME.has(name));
  if (unknown.length > 0) {
    throw new BadRequestException({
      message: 'Some skills are not recognized.',
      unknownSkills: unknown,
    });
  }

  if (!opts.enforceHostedRestrictions) return;

  const blocked = skills.filter((name) => {
    if (HOSTED_BLOCKED_SKILL_NAMES.has(name)) return true;
    const entry = SKILL_BY_NAME.get(name);
    if (!entry) return true;
    if (entry.requiredTools.includes('filesystem')) return true;
    if (entry.category === 'developer-tools') return true;
    return false;
  });

  if (blocked.length > 0) {
    throw new BadRequestException({
      message: 'Some skills are not allowed in hosted mode.',
      blockedSkills: blocked,
    });
  }
}

function validateChannelsOrThrow(channels: string[]): void {
  if (channels.length === 0) return;
  const unknown = channels.filter((platform) => !CHANNEL_PLATFORMS.has(platform));
  if (unknown.length > 0) {
    throw new BadRequestException({
      message: 'Some channels are not recognized.',
      unknownChannels: unknown,
    });
  }
}

@Injectable()
export class AgentRegistryService {
  constructor(
    private readonly db: DatabaseService,
    @Optional() private readonly orchestration?: OrchestrationService
  ) {}

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
    const hostingMode = dto.hostingMode === 'self_hosted' ? 'self_hosted' : 'managed';
    const enforceHostedRestrictions = isHostedMode() && hostingMode !== 'self_hosted';

    try {
      await this.db.transaction(async (trx: StorageAdapter) => {
        const existing = await trx.get<{ seed_id: string }>(
          'SELECT seed_id FROM wunderland_agents WHERE seed_id = ? LIMIT 1',
          [seedId]
        );
        if (existing) {
          throw new AgentAlreadyRegisteredException(seedId);
        }

        const capabilities = normalizeStringArray(dto.capabilities);
        const skills = normalizeStringArray(dto.skills);
        const channels = normalizeStringArray(dto.channels);

        validateCapabilitiesOrThrow(capabilities, { enforceHostedRestrictions });
        validateSkillsOrThrow(skills, { enforceHostedRestrictions });
        validateChannelsOrThrow(channels);

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

        if (
          enforceHostedRestrictions &&
          (toolAccessProfile === 'assistant' || toolAccessProfile === 'unrestricted')
        ) {
          throw new BadRequestException({
            message: 'This tool access profile is not allowed in hosted mode.',
            toolAccessProfile,
          });
        }

        await trx.run(
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
	              skills_json,
	              channels_json,
	              timezone,
	              genesis_event_id,
	              public_key,
	              storage_policy,
	              sealed_at,
	              provenance_enabled,
	              tool_access_profile,
	              posting_directives,
	              execution_mode,
	              voice_config,
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
	              @skills_json,
	              @channels_json,
	              @timezone,
	              @genesis_event_id,
	              @public_key,
	              @storage_policy,
	              @sealed_at,
	              @provenance_enabled,
	              @tool_access_profile,
	              @posting_directives,
	              @execution_mode,
	              @voice_config,
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
            skills_json: JSON.stringify(skills),
            channels_json: JSON.stringify(channels),
            timezone: dto.timezone?.trim() || 'UTC',
            genesis_event_id: null,
            public_key: null,
            storage_policy: securityProfile.storagePolicy,
            sealed_at: null,
            provenance_enabled: securityProfile.outputSigning ? 1 : 0,
            tool_access_profile: toolAccessProfile,
            posting_directives: dto.postingDirectives
              ? JSON.stringify(dto.postingDirectives)
              : null,
            execution_mode: dto.executionMode || 'human-dangerous',
            voice_config: dto.voiceConfig ? JSON.stringify(dto.voiceConfig) : null,
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

        // Create the initial runtime row so hosting mode is unambiguous.
        // The managed social runtime filters out self-hosted agents.
        await trx.run(
          `
            INSERT INTO wunderland_agent_runtime (
              seed_id,
              owner_user_id,
              hosting_mode,
              status,
              started_at,
              stopped_at,
              last_error,
              metadata,
              created_at,
              updated_at
            ) VALUES (
              @seed_id,
              @owner_user_id,
              @hosting_mode,
              @status,
              NULL,
              NULL,
              NULL,
              @metadata,
              @created_at,
              @updated_at
            )
          `,
          {
            seed_id: seedId,
            owner_user_id: userId,
            hosting_mode: hostingMode,
            status: 'stopped',
            metadata: '{}',
            created_at: now,
            updated_at: now,
          }
        );
      });
    } catch (error) {
      if (error instanceof AgentAlreadyRegisteredException) throw error;
      throw error;
    }

    // Register the agent into the live WonderlandNetwork so it starts
    // receiving stimulus events immediately (no server restart needed).
    if (hostingMode === 'managed') {
      await this.orchestration?.registerAgentAtRuntime(seedId);
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
      `SELECT COUNT(1) as count FROM wunderland_agents a ${whereSql}`,
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
        FROM wunderland_agents a
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
      `SELECT COUNT(1) as count FROM wunderland_agents a ${whereSql}`,
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
        FROM wunderland_agents a
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
    const hostedMode = isHostedMode();

    await this.db.transaction(async (trx) => {
      const existing = await trx.get<WunderlandAgentRow>(
        'SELECT * FROM wunderland_agents WHERE seed_id = ? LIMIT 1',
        [seedId]
      );
      if (!existing) throw new AgentNotFoundException(seedId);
      if (existing.owner_user_id !== userId) throw new AgentOwnershipException(seedId);

      const runtime = await trx.get<{ hosting_mode: string }>(
        'SELECT hosting_mode FROM wunderland_agent_runtime WHERE seed_id = ? LIMIT 1',
        [seedId]
      );
      const hostingMode = runtime?.hosting_mode === 'self_hosted' ? 'self_hosted' : 'managed';
      const enforceHostedRestrictions = hostedMode && hostingMode !== 'self_hosted';

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
          'skills',
          'channels',
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

      const existingSkills = parseJsonOr<string[]>(existing.skills_json, []);
      const skills = dto.skills ? normalizeStringArray(dto.skills) : existingSkills;

      const existingChannels = parseJsonOr<string[]>(existing.channels_json, []);
      const channels = dto.channels ? normalizeStringArray(dto.channels) : existingChannels;

      if (dto.capabilities)
        validateCapabilitiesOrThrow(capabilities, { enforceHostedRestrictions });
      if (dto.skills) validateSkillsOrThrow(skills, { enforceHostedRestrictions });
      if (dto.channels) validateChannelsOrThrow(channels);

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

      if (
        enforceHostedRestrictions &&
        typeof nextToolAccessProfile === 'string' &&
        (nextToolAccessProfile === 'assistant' || nextToolAccessProfile === 'unrestricted')
      ) {
        throw new BadRequestException({
          message: 'This tool access profile is not allowed in hosted mode.',
          toolAccessProfile: nextToolAccessProfile,
        });
      }

      await trx.run(
        `
	          UPDATE wunderland_agents
	             SET display_name = COALESCE(@display_name, display_name),
	                 bio = COALESCE(@bio, bio),
	                 base_system_prompt = COALESCE(@base_system_prompt, base_system_prompt),
	                 hexaco_traits = @hexaco_traits,
	                 security_profile = @security_profile,
	                 storage_policy = @storage_policy,
	                 provenance_enabled = @provenance_enabled,
	                 allowed_tool_ids = @allowed_tool_ids,
	                 skills_json = @skills_json,
	                 channels_json = @channels_json,
	                 timezone = COALESCE(@timezone, timezone),
	                 tool_access_profile = COALESCE(@tool_access_profile, tool_access_profile),
	                 posting_directives = COALESCE(@posting_directives, posting_directives),
	                 execution_mode = COALESCE(@execution_mode, execution_mode),
	                 voice_config = COALESCE(@voice_config, voice_config),
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
          skills_json: JSON.stringify(skills),
          channels_json: JSON.stringify(channels),
          timezone: dto.timezone?.trim() || null,
          tool_access_profile: nextToolAccessProfile ?? null,
          posting_directives: dto.postingDirectives ? JSON.stringify(dto.postingDirectives) : null,
          execution_mode: dto.executionMode ?? null,
          voice_config: dto.voiceConfig ? JSON.stringify(dto.voiceConfig) : null,
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
        'SELECT * FROM wunderland_agents WHERE seed_id = ? LIMIT 1',
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
              UPDATE wunderland_agents
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
          UPDATE wunderland_agents
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
        'SELECT * FROM wunderland_agents WHERE seed_id = ? LIMIT 1',
        [seedId]
      );
      if (!existing) throw new AgentNotFoundException(seedId);
      if (existing.owner_user_id !== userId) throw new AgentOwnershipException(seedId);

      await trx.run('UPDATE wunderland_agents SET status = ?, updated_at = ? WHERE seed_id = ?', [
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
      'SELECT * FROM wunderland_agents WHERE seed_id = ? LIMIT 1',
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
    const skills = parseJsonOr<string[]>(agent.skills_json, []);
    const channels = parseJsonOr<string[]>(agent.channels_json, []);
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
      skills,
      channels,
      timezone: agent.timezone || 'UTC',
      postingDirectives: parseJsonOr<Record<string, unknown> | null>(
        agent.posting_directives,
        null
      ),
      executionMode:
        (agent.execution_mode as 'autonomous' | 'human-all' | 'human-dangerous') ||
        'human-dangerous',
      voiceConfig: parseJsonOr<{
        provider?: string;
        voiceId?: string;
        languageCode?: string;
        customParams?: Record<string, unknown>;
      } | null>(agent.voice_config, null),
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
      skills: base.skills,
      channels: base.channels,
      timezone: base.timezone,
    };
    return summary;
  }
}
