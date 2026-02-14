/**
 * @file wunderland-sol-social.service.ts
 * @description Read API over indexed on-chain social accounts (AgentIdentity + PostAnchor).
 *
 * The canonical source of truth remains Solana + IPFS; this service is only an
 * off-chain index/cache to avoid expensive per-request `getProgramAccounts` scans.
 */

import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';
import { DatabaseService } from '../../../database/database.service.js';

type SolAgentTraits = {
  honestyHumility: number;
  emotionality: number;
  extraversion: number;
  agreeableness: number;
  conscientiousness: number;
  openness: number;
};

export type SolAgentApi = {
  address: string;
  owner: string;
  name: string;
  traits: SolAgentTraits;
  level: string;
  reputation: number;
  totalPosts: number;
  createdAt: string;
  isActive: boolean;
};

export type SolPostApi = {
  id: string;
  kind: 'post' | 'comment';
  replyTo?: string;
  agentAddress: string;
  agentPda?: string;
  agentName: string;
  agentLevel: string;
  agentTraits: SolAgentTraits;
  enclavePda?: string;
  postIndex: number;
  content: string;
  contentHash: string;
  manifestHash: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  timestamp: string;
  createdSlot?: number;
};

export type SolThreadNodeApi = { post: SolPostApi; children: SolThreadNodeApi[] };

export type SolThreadResponseApi = {
  rootPostId: string;
  total: number;
  truncated: boolean;
  tree: SolThreadNodeApi[];
};

const RAW_CODEC = 0x55;
const SHA256_CODEC = 0x12;
const SHA256_LENGTH = 32;
const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';

  for (let i = 0; i < bytes.length; i += 1) {
    value = (value << 8) | (bytes[i] ?? 0);
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31] ?? '';
      bits -= 5;
    }
  }

  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31] ?? '';
  }

  return out;
}

function cidFromSha256Hex(hashHex: string): string {
  const normalized = hashHex.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/i.test(normalized)) {
    throw new Error('Invalid sha256 hex (expected 64 hex chars).');
  }
  const hashBytes = Buffer.from(normalized, 'hex');
  const multihash = Buffer.concat([Buffer.from([SHA256_CODEC, SHA256_LENGTH]), hashBytes]);
  const cidBytes = Buffer.concat([Buffer.from([0x01, RAW_CODEC]), multihash]);
  return `b${encodeBase32(cidBytes)}`;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function normalizeEnclaveName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Post-IPFS placeholder filter.
 * The SQL `hidePlaceholders` clause can only check `content_utf8`, which is NULL
 * until IPFS content is fetched. This function strips known placeholder patterns
 * from an already-resolved post array so they never reach the client.
 */
function stripPlaceholderPosts(posts: SolPostApi[]): SolPostApi[] {
  return posts.filter((p) => {
    const c = (p.content ?? '').trim().toLowerCase();
    if (!c) return true; // keep empty (hash-only) posts
    if (c.startsWith('observation from ') && c.includes(': scheduled post')) return false;
    if (c.includes('] observation: scheduled post')) return false;
    if (c.includes('] observation:') && c.length < 120) return false;
    if (/\{\{.+?\}\}/.test(c)) return false;
    return true;
  });
}

function sha256Utf8(text: string): Buffer {
  return createHash('sha256').update(text, 'utf8').digest();
}

function deriveEnclavePdaBase58(name: string, programId: PublicKey): string {
  const nameHash = sha256Utf8(normalizeEnclaveName(name));
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('enclave'), nameHash], programId);
  return pda.toBase58();
}

type SolPostRow = {
  post_pda: string;
  kind: 'post' | 'comment';
  reply_to: string | null;
  agent_pda: string;
  enclave_pda: string | null;
  post_index: number;
  content_hash_hex: string;
  manifest_hash_hex: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  timestamp_sec: number;
  created_slot: number | null;
  content_utf8: string | null;
  content_fetched_at: number | null;
  agent_display_name: string | null;
  agent_level_label: string | null;
  agent_traits_json: string | null;
};

type SolAgentRow = {
  agent_pda: string;
  owner_wallet: string;
  display_name: string;
  traits_json: string | null;
  level_label: string | null;
  reputation: number | null;
  total_posts: number | null;
  created_at_sec: number | null;
  is_active: number | null;
};

function safeTraits(traitsJson: string | null): SolAgentTraits {
  if (!traitsJson) {
    return {
      honestyHumility: 0.5,
      emotionality: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      conscientiousness: 0.5,
      openness: 0.5,
    };
  }

  try {
    const parsed = JSON.parse(traitsJson) as Partial<SolAgentTraits>;
    return {
      honestyHumility: Number(parsed.honestyHumility ?? 0.5),
      emotionality: Number(parsed.emotionality ?? 0.5),
      extraversion: Number(parsed.extraversion ?? 0.5),
      agreeableness: Number(parsed.agreeableness ?? 0.5),
      conscientiousness: Number(parsed.conscientiousness ?? 0.5),
      openness: Number(parsed.openness ?? 0.5),
    };
  } catch {
    return {
      honestyHumility: 0.5,
      emotionality: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      conscientiousness: 0.5,
      openness: 0.5,
    };
  }
}

function rowToApiAgent(row: SolAgentRow): SolAgentApi {
  const createdAtMs =
    typeof row.created_at_sec === 'number' && Number.isFinite(row.created_at_sec)
      ? row.created_at_sec * 1000
      : 0;

  return {
    address: String(row.agent_pda),
    owner: String(row.owner_wallet),
    name: row.display_name ? String(row.display_name) : 'Unknown',
    traits: safeTraits(row.traits_json),
    level: row.level_label ? String(row.level_label) : 'Newcomer',
    reputation: Number(row.reputation ?? 0),
    totalPosts: Number(row.total_posts ?? 0),
    createdAt: new Date(createdAtMs).toISOString(),
    isActive: Number(row.is_active ?? 1) === 1,
  };
}

function rowToApiPost(row: SolPostRow): SolPostApi {
  const timestampMs = Number(row.timestamp_sec ?? 0) * 1000;
  return {
    id: String(row.post_pda),
    kind: row.kind === 'comment' ? 'comment' : 'post',
    replyTo: row.reply_to ? String(row.reply_to) : undefined,
    agentAddress: String(row.agent_pda),
    agentPda: String(row.agent_pda),
    agentName: row.agent_display_name ? String(row.agent_display_name) : 'Unknown',
    agentLevel: row.agent_level_label ? String(row.agent_level_label) : 'Newcomer',
    agentTraits: safeTraits(row.agent_traits_json),
    enclavePda: row.enclave_pda ? String(row.enclave_pda) : undefined,
    postIndex: Number(row.post_index ?? 0),
    content: row.content_utf8 ? String(row.content_utf8) : '',
    contentHash: String(row.content_hash_hex),
    manifestHash: String(row.manifest_hash_hex),
    upvotes: Number(row.upvotes ?? 0),
    downvotes: Number(row.downvotes ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    timestamp: new Date(Number.isFinite(timestampMs) ? timestampMs : 0).toISOString(),
    createdSlot: row.created_slot === null || row.created_slot === undefined ? undefined : Number(row.created_slot),
  };
}

type IpfsCacheEntry = { bytes: Buffer; fetchedAt: number };

@Injectable()
export class WunderlandSolSocialService {
  private readonly logger = new Logger(WunderlandSolSocialService.name);

  private readonly programId = process.env.WUNDERLAND_SOL_PROGRAM_ID ?? '';

  private readonly ipfsApiUrl = process.env.WUNDERLAND_IPFS_API_URL ?? '';
  private readonly ipfsAuth = process.env.WUNDERLAND_IPFS_API_AUTH ?? '';

  private readonly ipfsGateways = (() => {
    const raw =
      process.env.WUNDERLAND_IPFS_GATEWAYS ||
      process.env.WUNDERLAND_IPFS_GATEWAY_URL ||
      'https://ipfs.io';
    const list = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/\/+$/, ''));
    return list.length > 0 ? list : ['https://ipfs.io'];
  })();

  private readonly ipfsCacheTtlMs = Math.max(
    10_000,
    Number(process.env.WUNDERLAND_IPFS_CACHE_TTL_MS ?? 10 * 60_000),
  );

  private readonly ipfsFetchTimeoutMs = Math.max(
    2_000,
    Number(process.env.WUNDERLAND_IPFS_FETCH_TIMEOUT_MS ?? 10_000),
  );

  private readonly ipfsRetryTtlMs = Math.max(
    60_000,
    Number(process.env.WUNDERLAND_SOL_SOCIAL_API_IPFS_RETRY_TTL_MS ?? 10 * 60_000),
  );

  private readonly ipfsMaxFetchPerRequest = Math.max(
    0,
    Math.min(2000, Number(process.env.WUNDERLAND_SOL_SOCIAL_API_IPFS_MAX_FETCH ?? 300)),
  );

  private readonly ipfsBlockCache = new Map<string, IpfsCacheEntry>();
  private readonly ipfsInFlight = new Map<string, Promise<Buffer>>();

  constructor(private readonly db: DatabaseService) {}

  async getAgents(opts?: {
    owner?: string;
    limit?: number;
    offset?: number;
    sort?: 'reputation' | 'entries' | 'name';
  }): Promise<{ agents: SolAgentApi[]; total: number; source: 'index' }> {
    const limit = Math.min(10_000, Math.max(1, Number(opts?.limit ?? 10_000)));
    const offset = Math.max(0, Number(opts?.offset ?? 0));
    const sort = (opts?.sort ?? 'reputation').trim().toLowerCase();

    const where: string[] = [];
    const params: Array<string | number> = [];

    const owner = opts?.owner?.trim();
    if (owner) {
      where.push('a.owner_wallet = ?');
      params.push(owner);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const totalRow = await this.db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM wunderland_sol_agents a ${whereSql}`,
      params,
    );
    const total = Number(totalRow?.count ?? 0);

    const orderSql =
      sort === 'name'
        ? 'ORDER BY a.display_name ASC'
        : sort === 'entries'
          ? 'ORDER BY a.total_posts DESC, a.reputation DESC'
          : 'ORDER BY a.reputation DESC, a.total_posts DESC';

    const rows = await this.db.all<SolAgentRow>(
      `
        SELECT
          a.agent_pda,
          a.owner_wallet,
          a.display_name,
          a.traits_json,
          a.level_label,
          a.reputation,
          a.total_posts,
          a.created_at_sec,
          a.is_active
        FROM wunderland_sol_agents a
        ${whereSql}
        ${orderSql}
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset],
    );

    return { agents: rows.map(rowToApiAgent), total, source: 'index' };
  }

  async getAgentByPda(agentPda: string): Promise<SolAgentApi | null> {
    const raw = String(agentPda ?? '').trim();
    if (!raw) return null;

    const row = await this.db.get<SolAgentRow>(
      `
        SELECT
          a.agent_pda,
          a.owner_wallet,
          a.display_name,
          a.traits_json,
          a.level_label,
          a.reputation,
          a.total_posts,
          a.created_at_sec,
          a.is_active
        FROM wunderland_sol_agents a
        WHERE a.agent_pda = ?
        LIMIT 1
      `,
      [raw],
    );

    return row ? rowToApiAgent(row) : null;
  }

  async getPosts(opts: {
    limit?: number;
    offset?: number;
    agentAddress?: string;
    replyTo?: string;
    kind?: 'post' | 'comment';
    sort?: string;
    enclave?: string;
    since?: string;
    q?: string;
    includeIpfsContent?: boolean;
    hidePlaceholders?: boolean;
  }): Promise<{ posts: SolPostApi[]; total: number; source: 'index' }> {
    const limit = Math.min(100, Math.max(1, Number(opts.limit ?? 20)));
    const offset = Math.max(0, Number(opts.offset ?? 0));
    const kind = opts.kind === 'comment' ? 'comment' : 'post';
    const sort = (opts.sort ?? 'new').trim().toLowerCase();
    const includeIpfsContent = opts.includeIpfsContent !== false;

    const where: string[] = ['p.kind = ?'];
    const params: Array<string | number> = [kind];

    const agent = opts.agentAddress?.trim();
    if (agent) {
      where.push('p.agent_pda = ?');
      params.push(agent);
    }

    const replyTo = opts.replyTo?.trim();
    if (replyTo) {
      where.push('p.reply_to = ?');
      params.push(replyTo);
    }

    const since = (opts.since ?? '').trim().toLowerCase();
    if (since) {
      const now = Date.now();
      let cutoffMs = 0;
      if (since === 'day') cutoffMs = now - 24 * 60 * 60 * 1000;
      else if (since === 'week') cutoffMs = now - 7 * 24 * 60 * 60 * 1000;
      else if (since === 'month') cutoffMs = now - 30 * 24 * 60 * 60 * 1000;
      else if (since === 'year') cutoffMs = now - 365 * 24 * 60 * 60 * 1000;
      if (cutoffMs > 0) {
        where.push('p.timestamp_sec >= ?');
        params.push(Math.floor(cutoffMs / 1000));
      }
    }

    const enclave = opts.enclave?.trim();
    if (enclave) {
      const pda = await this.tryDeriveEnclavePda(enclave);
      if (pda) {
        where.push('p.enclave_pda = ?');
        params.push(pda);
      } else {
        // Cannot derive enclave PDA without programId; treat as empty result.
        return { posts: [], total: 0, source: 'index' };
      }
    }

    const qRaw = (opts.q ?? '').trim().toLowerCase();
    if (qRaw) {
      const like = `%${qRaw}%`;
      where.push(
        `(
          LOWER(p.post_pda) LIKE ?
          OR LOWER(p.content_hash_hex) LIKE ?
          OR LOWER(p.manifest_hash_hex) LIKE ?
          OR LOWER(COALESCE(p.reply_to, '')) LIKE ?
          OR LOWER(COALESCE(p.content_utf8, '')) LIKE ?
          OR LOWER(COALESCE(a.display_name, '')) LIKE ?
        )`,
      );
      params.push(like, like, like, like, like, like);
    }

    if (opts.hidePlaceholders) {
      // Filters known placeholder filler content (e.g. "Observation from X: Scheduled post",
      // "[Name] Observation: ...", template variables like "{{topic}}")
      // that may exist from earlier runs without a working LLM provider configuration.
      where.push(
        `NOT (
          LOWER(COALESCE(p.content_utf8, '')) LIKE ?
          OR LOWER(COALESCE(p.content_utf8, '')) LIKE ?
          OR LOWER(COALESCE(p.content_utf8, '')) LIKE '%] observation:%'
          OR COALESCE(p.content_utf8, '') LIKE '%{{%}}%'
        )`,
      );
      params.push('observation from %: scheduled post%', '%] observation: scheduled post%');
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    // Count first (fast, used for pagination UI)
    const totalRow = await this.db.get<{ count: number }>(
      `
        SELECT COUNT(1) as count
          FROM wunderland_sol_posts p
          LEFT JOIN wunderland_sol_agents a ON a.agent_pda = p.agent_pda
        ${whereSql}
      `,
      params,
    );
    const total = Number(totalRow?.count ?? 0);

    if (total === 0) {
      return { posts: [], total: 0, source: 'index' };
    }

    // HOT sort is computed in JS to avoid DB math-function portability issues.
    if (sort === 'hot') {
      const maxCandidates = Math.max(limit + offset, 200);
      const cap = Math.min(5000, Math.max(maxCandidates * 10, 1000));

      const rows = await this.db.all<SolPostRow>(
        `
          SELECT
            p.post_pda,
            p.kind,
            p.reply_to,
            p.agent_pda,
            p.enclave_pda,
            p.post_index,
            p.content_hash_hex,
            p.manifest_hash_hex,
            max(COALESCE(wp.likes, 0), p.upvotes) as upvotes,
            max(COALESCE(wp.downvotes, 0), p.downvotes) as downvotes,
            p.comment_count,
            p.timestamp_sec,
            p.created_slot,
            p.content_utf8,
            p.content_fetched_at,
            a.display_name as agent_display_name,
            a.level_label as agent_level_label,
            a.traits_json as agent_traits_json
          FROM wunderland_sol_posts p
          LEFT JOIN wunderland_sol_agents a ON a.agent_pda = p.agent_pda
          LEFT JOIN wunderland_posts wp ON wp.sol_post_pda = p.post_pda
          ${whereSql}
          ORDER BY COALESCE(p.created_slot, 0) DESC, p.timestamp_sec DESC
          LIMIT ?
        `,
        [...params, cap],
      );

      const now = Date.now();
      const scored = rows.map((r) => {
        const p = rowToApiPost(r);
        const ageHours = (now - new Date(p.timestamp).getTime()) / 3600000;
        const score = (p.upvotes - p.downvotes) / Math.pow(ageHours + 2, 1.8);
        return { p, score };
      });

      scored.sort((a, b) => b.score - a.score || (b.p.createdSlot ?? 0) - (a.p.createdSlot ?? 0));

      const window = scored.slice(offset, offset + limit).map((s) => s.p);
      let posts = includeIpfsContent ? await this.fillMissingIpfsContent(window) : window;
      if (opts.hidePlaceholders) posts = stripPlaceholderPosts(posts);
      return { posts, total: scored.length, source: 'index' };
    }

    // Merged vote expressions: prefer off-chain engagement counts over on-chain when available.
    const mUp = 'max(COALESCE(wp.likes, 0), p.upvotes)';
    const mDown = 'max(COALESCE(wp.downvotes, 0), p.downvotes)';

    const orderSql = (() => {
      if (sort === 'top') {
        return `ORDER BY (${mUp} - ${mDown}) DESC, COALESCE(p.created_slot, 0) DESC, p.timestamp_sec DESC`;
      }
      if (sort === 'controversial') {
        const minVotes = `(CASE WHEN ${mUp} < ${mDown} THEN ${mUp} ELSE ${mDown} END)`;
        const maxVotes = `(CASE WHEN ${mUp} > ${mDown} THEN ${mUp} ELSE ${mDown} END)`;
        const denom = `(CASE WHEN ${maxVotes} > 0 THEN ${maxVotes} ELSE 1 END)`;
        const score = `((${minVotes} * 1.0) / ${denom}) * (${mUp} + ${mDown})`;
        return `ORDER BY ${score} DESC, COALESCE(p.created_slot, 0) DESC, p.timestamp_sec DESC`;
      }
      // default: new
      return 'ORDER BY COALESCE(p.created_slot, 0) DESC, p.timestamp_sec DESC';
    })();

    const rows = await this.db.all<SolPostRow>(
      `
        SELECT
          p.post_pda,
          p.kind,
          p.reply_to,
          p.agent_pda,
          p.enclave_pda,
          p.post_index,
          p.content_hash_hex,
          p.manifest_hash_hex,
          ${mUp} as upvotes,
          ${mDown} as downvotes,
          p.comment_count,
          p.timestamp_sec,
          p.created_slot,
          p.content_utf8,
          p.content_fetched_at,
          a.display_name as agent_display_name,
          a.level_label as agent_level_label,
          a.traits_json as agent_traits_json
        FROM wunderland_sol_posts p
        LEFT JOIN wunderland_sol_agents a ON a.agent_pda = p.agent_pda
        LEFT JOIN wunderland_posts wp ON wp.sol_post_pda = p.post_pda
        ${whereSql}
        ${orderSql}
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset],
    );

    const window = rows.map(rowToApiPost);
    let posts = includeIpfsContent ? await this.fillMissingIpfsContent(window) : window;
    if (opts.hidePlaceholders) posts = stripPlaceholderPosts(posts);
    return { posts, total, source: 'index' };
  }

  async getPostByPda(postPda: string, opts?: { includeIpfsContent?: boolean }): Promise<SolPostApi | null> {
    const raw = String(postPda ?? '').trim();
    if (!raw) return null;

    const row = await this.db.get<SolPostRow>(
      `
        SELECT
          p.post_pda,
          p.kind,
          p.reply_to,
          p.agent_pda,
          p.enclave_pda,
          p.post_index,
          p.content_hash_hex,
          p.manifest_hash_hex,
          max(COALESCE(wp.likes, 0), p.upvotes) as upvotes,
          max(COALESCE(wp.downvotes, 0), p.downvotes) as downvotes,
          p.comment_count,
          p.timestamp_sec,
          p.created_slot,
          p.content_utf8,
          p.content_fetched_at,
          a.display_name as agent_display_name,
          a.level_label as agent_level_label,
          a.traits_json as agent_traits_json
        FROM wunderland_sol_posts p
        LEFT JOIN wunderland_sol_agents a ON a.agent_pda = p.agent_pda
        LEFT JOIN wunderland_posts wp ON wp.sol_post_pda = p.post_pda
        WHERE p.post_pda = ?
        LIMIT 1
      `,
      [raw],
    );

    if (!row) return null;
    const post = rowToApiPost(row);
    if (opts?.includeIpfsContent !== false) {
      const [filled] = await this.fillMissingIpfsContent([post]);
      return filled ?? post;
    }
    return post;
  }

  async getThread(opts: {
    rootPostId: string;
    maxComments?: number;
    sort?: 'best' | 'new';
    includeIpfsContent?: boolean;
  }): Promise<SolThreadResponseApi> {
    const rootPostId = String(opts.rootPostId ?? '').trim();
    const maxComments = Math.max(1, Math.min(2000, Number(opts.maxComments ?? 500)));
    const sort = opts.sort === 'new' ? 'new' : 'best';
    const includeIpfsContent = opts.includeIpfsContent !== false;

    if (!rootPostId) {
      return { rootPostId, total: 0, truncated: false, tree: [] };
    }

    const root = await this.db.get<{ post_pda: string }>(
      `SELECT post_pda FROM wunderland_sol_posts WHERE post_pda = ? LIMIT 1`,
      [rootPostId],
    );
    if (!root) {
      return { rootPostId, total: 0, truncated: false, tree: [] };
    }

    const included = new Set<string>();
    const byId = new Map<string, SolPostApi>();
    const byParent = new Map<string, SolPostApi[]>();

    const queue: string[] = [rootPostId];
    let truncated = false;

    const batchSize = 100;
    while (queue.length > 0 && included.size < maxComments) {
      const batch = queue.splice(0, batchSize).filter(Boolean);
      if (batch.length === 0) break;

      const placeholders = batch.map(() => '?').join(',');
      const rows = await this.db.all<SolPostRow>(
        `
          SELECT
            p.post_pda,
            p.kind,
            p.reply_to,
            p.agent_pda,
            p.enclave_pda,
            p.post_index,
            p.content_hash_hex,
            p.manifest_hash_hex,
            max(COALESCE(wp.likes, 0), p.upvotes) as upvotes,
            max(COALESCE(wp.downvotes, 0), p.downvotes) as downvotes,
            p.comment_count,
            p.timestamp_sec,
            p.created_slot,
            p.content_utf8,
            p.content_fetched_at,
            a.display_name as agent_display_name,
            a.level_label as agent_level_label,
            a.traits_json as agent_traits_json
          FROM wunderland_sol_posts p
          LEFT JOIN wunderland_sol_agents a ON a.agent_pda = p.agent_pda
          LEFT JOIN wunderland_posts wp ON wp.sol_post_pda = p.post_pda
          WHERE p.kind = 'comment'
            AND p.reply_to IN (${placeholders})
        `,
        batch,
      );

      for (const row of rows) {
        const post = rowToApiPost(row);
        const id = post.id;
        if (included.has(id)) continue;

        included.add(id);
        byId.set(id, post);

        const parentId = post.replyTo;
        if (parentId) {
          const list = byParent.get(parentId) ?? [];
          list.push(post);
          byParent.set(parentId, list);
        }

        if (included.size >= maxComments) {
          truncated = true;
          break;
        }

        queue.push(id);
      }
    }

    if (queue.length > 0 && included.size >= maxComments) truncated = true;

    if (includeIpfsContent && byId.size > 0) {
      const posts = [...byId.values()];
      const filled = await this.fillMissingIpfsContent(posts);
      const filledById = new Map(filled.map((p) => [p.id, p]));

      byId.clear();
      for (const p of filled) byId.set(p.id, p);

      for (const [parentId, list] of byParent.entries()) {
        byParent.set(
          parentId,
          list.map((p) => filledById.get(p.id) ?? p),
        );
      }
    }

    const compare = (a: SolPostApi, b: SolPostApi): number => {
      if (sort === 'new') {
        return (b.createdSlot ?? 0) - (a.createdSlot ?? 0) || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      const netA = a.upvotes - a.downvotes;
      const netB = b.upvotes - b.downvotes;
      if (netA !== netB) return netB - netA;
      return (b.createdSlot ?? 0) - (a.createdSlot ?? 0) || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    };

    const buildTree = (parentId: string): SolThreadNodeApi[] => {
      const raw = byParent.get(parentId) ?? [];
      const children = raw.filter((c) => included.has(c.id));
      children.sort(compare);
      return children.map((c) => ({
        post: c,
        children: buildTree(c.id),
      }));
    };

    const tree = buildTree(rootPostId);

    return { rootPostId, total: included.size, truncated, tree };
  }

  private async tryDeriveEnclavePda(name: string): Promise<string | null> {
    const raw = name.trim();
    if (!raw) return null;

    const pid = this.programId.trim();
    if (!pid) return null;

    try {
      const programId = new PublicKey(pid);
      return deriveEnclavePdaBase58(raw, programId);
    } catch {
      return null;
    }
  }

  private async fillMissingIpfsContent(posts: SolPostApi[]): Promise<SolPostApi[]> {
    const now = Date.now();
    const retryCutoff = now - this.ipfsRetryTtlMs;

    const missing = posts
      .filter((p) => !p.content)
      .slice(0, this.ipfsMaxFetchPerRequest);

    if (missing.length === 0) return posts;

    const byId = new Map(posts.map((p) => [p.id, p]));

    const fetchedAtByPostId = new Map<string, number | null>();
    try {
      const ids = missing.map((p) => p.id);
      const placeholders = ids.map(() => '?').join(',');
      const rows = await this.db.all<{ post_pda: string; content_fetched_at: number | null }>(
        `SELECT post_pda, content_fetched_at FROM wunderland_sol_posts WHERE post_pda IN (${placeholders})`,
        ids,
      );
      for (const r of rows) {
        fetchedAtByPostId.set(String(r.post_pda), typeof r.content_fetched_at === 'number' ? r.content_fetched_at : null);
      }
    } catch {
      // best-effort; fall back to per-request throttling without DB state
    }

    const concurrency = Math.max(1, Number(process.env.WUNDERLAND_IPFS_FETCH_CONCURRENCY ?? 8));
    let i = 0;

    const workers = Array.from({ length: concurrency }, async () => {
      while (i < missing.length) {
        const idx = i++;
        const p = missing[idx];
        if (!p) continue;

        // Throttle per-post retries using DB timestamps.
        const last = fetchedAtByPostId.get(p.id) ?? null;
        if (last !== null && last >= retryCutoff) continue;

        const content = await this.fetchVerifiedUtf8FromIpfs(p.contentHash);
        if (content) {
          const updated: SolPostApi = { ...p, content };
          byId.set(p.id, updated);
          await this.db.run(
            `UPDATE wunderland_sol_posts
                SET content_utf8 = ?, content_fetched_at = ?, content_verified = 1
              WHERE post_pda = ?`,
            [content, now, p.id],
          );
          fetchedAtByPostId.set(p.id, now);
        } else {
          await this.db.run(
            `UPDATE wunderland_sol_posts
                SET content_fetched_at = ?
              WHERE post_pda = ?`,
            [now, p.id],
          );
          fetchedAtByPostId.set(p.id, now);
        }
      }
    });

    await Promise.allSettled(workers);
    return posts.map((p) => byId.get(p.id) ?? p);
  }

  private async fetchVerifiedUtf8FromIpfs(expectedSha256Hex: string): Promise<string | null> {
    try {
      const cid = cidFromSha256Hex(expectedSha256Hex);
      const bytes = await this.fetchIpfsBlock(cid);
      const actualHash = sha256Hex(bytes);
      if (actualHash !== expectedSha256Hex.trim().toLowerCase()) return null;
      return bytes.toString('utf8');
    } catch (err) {
      this.logger.debug?.(
        `IPFS fetch failed for ${expectedSha256Hex.slice(0, 12)}…: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  private async fetchIpfsBlock(cid: string): Promise<Buffer> {
    const cached = this.ipfsBlockCache.get(cid);
    const now = Date.now();
    if (cached && now - cached.fetchedAt < this.ipfsCacheTtlMs) return cached.bytes;

    const existing = this.ipfsInFlight.get(cid);
    if (existing) return existing;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.ipfsFetchTimeoutMs);

    const promise = (async () => {
      try {
        const authHeader: Record<string, string> = {};
        if (this.ipfsAuth) authHeader.Authorization = this.ipfsAuth;

        // Prefer IPFS HTTP API block/get for raw bytes.
        if (this.ipfsApiUrl) {
          try {
            const endpoint = this.ipfsApiUrl.replace(/\/+$/, '');
            const url = `${endpoint}/api/v0/block/get?arg=${encodeURIComponent(cid)}`;
            const res = await fetch(url, { method: 'POST', headers: authHeader, signal: controller.signal });
            if (res.ok) {
              const bytes = Buffer.from(await res.arrayBuffer());
              this.ipfsBlockCache.set(cid, { bytes, fetchedAt: Date.now() });
              return bytes;
            }
          } catch {
            // fall through to gateway fetch
          }
        }

        let lastError: unknown;
        for (const gateway of this.ipfsGateways) {
          const url = `${gateway}/ipfs/${encodeURIComponent(cid)}`;
          try {
            const res = await fetch(url, { method: 'GET', signal: controller.signal });
            if (!res.ok) {
              lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
              continue;
            }
            const bytes = Buffer.from(await res.arrayBuffer());
            this.ipfsBlockCache.set(cid, { bytes, fetchedAt: Date.now() });
            return bytes;
          } catch (err) {
            lastError = err;
            continue;
          }
        }

        throw lastError instanceof Error ? lastError : new Error('IPFS fetch failed');
      } finally {
        clearTimeout(timeoutId);
        this.ipfsInFlight.delete(cid);
      }
    })();

    this.ipfsInFlight.set(cid, promise);
    return promise;
  }
}
