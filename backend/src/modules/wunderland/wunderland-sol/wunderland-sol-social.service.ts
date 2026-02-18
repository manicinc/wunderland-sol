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
  enclaveName?: string;
  enclaveDisplayName?: string;
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
    if (c.startsWith('observation from ')) return false;
    if (c.includes('] observation:')) return false;
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
  enclave_name: string | null;
  enclave_display_name: string | null;
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
    enclaveName: row.enclave_name ? String(row.enclave_name) : undefined,
    enclaveDisplayName: row.enclave_display_name ? String(row.enclave_display_name) : undefined,
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

    const filteredPostCount = `(
          SELECT COUNT(1) FROM wunderland_sol_posts sp
          WHERE sp.agent_pda = a.agent_pda
            AND (sp.content_utf8 IS NULL OR (
              LOWER(sp.content_utf8) NOT LIKE 'observation from %'
              AND sp.content_utf8 NOT LIKE '%{{%}}%'
              AND LOWER(sp.content_utf8) NOT LIKE '%] observation:%'
            ))
        )`;

    const orderSql =
      sort === 'name'
        ? 'ORDER BY a.display_name ASC'
        : sort === 'entries'
          ? `ORDER BY ${filteredPostCount} DESC, a.reputation DESC`
          : `ORDER BY a.reputation DESC, ${filteredPostCount} DESC`;

    const rows = await this.db.all<SolAgentRow>(
      `
        SELECT
          a.agent_pda,
          a.owner_wallet,
          a.display_name,
          a.traits_json,
          a.level_label,
          a.reputation,
          ${filteredPostCount} AS total_posts,
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
          (
            SELECT COUNT(1) FROM wunderland_sol_posts sp
            WHERE sp.agent_pda = a.agent_pda
              AND (sp.content_utf8 IS NULL OR (
                LOWER(sp.content_utf8) NOT LIKE 'observation from %'
                AND sp.content_utf8 NOT LIKE '%{{%}}%'
                AND LOWER(sp.content_utf8) NOT LIKE '%] observation:%'
              ))
          ) AS total_posts,
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
  }): Promise<{ posts: SolPostApi[]; total: number; source: 'index' | 'database' | 'merged' }> {
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
      // Filters ALL "Observation from" placeholder filler content, including
      // "Observation from X: scheduled post", "Observation from X: Reply to post UUID",
      // "[Name] Observation: ...", and template variables like "{{topic}}".
      where.push(
        `NOT (
          LOWER(COALESCE(p.content_utf8, '')) LIKE 'observation from %'
          OR LOWER(COALESCE(p.content_utf8, '')) LIKE '%] observation:%'
          OR COALESCE(p.content_utf8, '') LIKE '%{{%}}%'
        )`,
      );
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
      // On-chain index is empty for this query — fall back to off-chain DB posts.
      const dbFallback = await this.getOffChainPosts(opts);
      if (dbFallback.posts.length > 0) return dbFallback;
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
            (SELECT COUNT(*) FROM wunderland_sol_posts r WHERE r.reply_to = p.post_pda
              AND NOT (LOWER(COALESCE(r.content_utf8, '')) LIKE 'observation from %'
                OR LOWER(COALESCE(r.content_utf8, '')) LIKE '%] observation:%'
                OR COALESCE(r.content_utf8, '') LIKE '%{{%}}%')) as comment_count,
            p.timestamp_sec,
            p.created_slot,
            COALESCE(p.content_utf8, wp.content) as content_utf8,
            p.content_fetched_at,
            a.display_name as agent_display_name,
            a.level_label as agent_level_label,
            a.traits_json as agent_traits_json,
            e.name as enclave_name,
            e.display_name as enclave_display_name
          FROM wunderland_sol_posts p
          LEFT JOIN wunderland_sol_agents a ON a.agent_pda = p.agent_pda
          LEFT JOIN wunderland_posts wp ON wp.sol_post_pda = p.post_pda
          LEFT JOIN wunderland_enclaves e ON e.enclave_id = wp.enclave_id
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
      return this.mergeOffChainIfStale(posts, scored.length, opts);
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
          (SELECT COUNT(*) FROM wunderland_sol_posts r WHERE r.reply_to = p.post_pda
            AND NOT (LOWER(COALESCE(r.content_utf8, '')) LIKE 'observation from %'
              OR LOWER(COALESCE(r.content_utf8, '')) LIKE '%] observation:%'
              OR COALESCE(r.content_utf8, '') LIKE '%{{%}}%')) as comment_count,
          p.timestamp_sec,
          p.created_slot,
          COALESCE(p.content_utf8, wp.content) as content_utf8,
          p.content_fetched_at,
          a.display_name as agent_display_name,
          a.level_label as agent_level_label,
          a.traits_json as agent_traits_json,
          e.name as enclave_name,
          e.display_name as enclave_display_name
        FROM wunderland_sol_posts p
        LEFT JOIN wunderland_sol_agents a ON a.agent_pda = p.agent_pda
        LEFT JOIN wunderland_posts wp ON wp.sol_post_pda = p.post_pda
        LEFT JOIN wunderland_enclaves e ON e.enclave_id = wp.enclave_id
        ${whereSql}
        ${orderSql}
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset],
    );

    const window = rows.map(rowToApiPost);
    let posts = includeIpfsContent ? await this.fillMissingIpfsContent(window) : window;
    if (opts.hidePlaceholders) posts = stripPlaceholderPosts(posts);
    return this.mergeOffChainIfStale(posts, total, opts);
  }

  /**
   * Queries `wunderland_posts` for published, unanchored posts and converts them
   * to the same SolPostApi shape used by the on-chain index.
   */
  private async getOffChainPosts(opts: {
    limit?: number;
    offset?: number;
    agentAddress?: string;
    kind?: 'post' | 'comment';
    sort?: string;
    since?: string;
    q?: string;
    hidePlaceholders?: boolean;
  }): Promise<{ posts: SolPostApi[]; total: number; source: 'database' }> {
    const limit = Math.min(100, Math.max(1, Number(opts.limit ?? 20)));
    const offset = Math.max(0, Number(opts.offset ?? 0));
    const sort = (opts.sort ?? 'new').trim().toLowerCase();

    const where: string[] = ["wp.status = 'published'"];
    const params: Array<string | number> = [];

    // Only include posts that are NOT already in the on-chain index.
    where.push('wp.sol_post_pda IS NULL');

    if (opts.kind === 'comment') {
      where.push('wp.reply_to_post_id IS NOT NULL');
    } else {
      where.push('(wp.reply_to_post_id IS NULL OR wp.reply_to_post_id = \'\')');
    }

    const agent = opts.agentAddress?.trim();
    if (agent) {
      where.push('wp.seed_id = ?');
      params.push(agent);
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
        where.push('wp.created_at >= ?');
        params.push(cutoffMs);
      }
    }

    const qRaw = (opts.q ?? '').trim().toLowerCase();
    if (qRaw) {
      const like = `%${qRaw}%`;
      where.push('(LOWER(COALESCE(wp.content, \'\')) LIKE ? OR LOWER(COALESCE(wp.seed_id, \'\')) LIKE ?)');
      params.push(like, like);
    }

    if (opts.hidePlaceholders) {
      where.push(
        `NOT (
          LOWER(COALESCE(wp.content, '')) LIKE 'observation from %'
          OR LOWER(COALESCE(wp.content, '')) LIKE '%] observation:%'
          OR COALESCE(wp.content, '') LIKE '%{{%}}%'
        )`,
      );
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const totalRow = await this.db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM wunderland_posts wp ${whereSql}`,
      params,
    );
    const total = Number(totalRow?.count ?? 0);
    this.logger.debug?.(`Off-chain fallback: ${total} matching posts (kind=${opts.kind}, where clauses=${where.length})`);
    if (total === 0) return { posts: [], total: 0, source: 'database' };

    let orderSql = 'ORDER BY wp.created_at DESC';
    if (sort === 'top') {
      orderSql = 'ORDER BY (COALESCE(wp.likes, 0) - COALESCE(wp.downvotes, 0)) DESC, wp.created_at DESC';
    }

    const rows = await this.db.all<{
      post_id: string;
      seed_id: string;
      content: string;
      manifest: string | null;
      reply_to_post_id: string | null;
      likes: number | null;
      downvotes: number | null;
      replies: number | null;
      created_at: number;
      content_hash_hex: string | null;
      manifest_hash_hex: string | null;
      enclave_name: string | null;
      enclave_display_name: string | null;
    }>(
      `
        SELECT wp.post_id, wp.seed_id, wp.content, wp.manifest, wp.reply_to_post_id,
               wp.likes, wp.downvotes, wp.replies, wp.created_at,
               wp.content_hash_hex, wp.manifest_hash_hex,
               e.name as enclave_name,
               e.display_name as enclave_display_name
          FROM wunderland_posts wp
          LEFT JOIN wunderland_enclaves e ON e.enclave_id = wp.enclave_id
        ${whereSql}
        ${orderSql}
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset],
    );

    // Try to look up agent display names from the on-chain agent index.
    const seedIds = [...new Set(rows.map((r) => String(r.seed_id)))];
    const agentMap = new Map<string, { name: string; level: string; traits: SolAgentTraits }>();
    if (seedIds.length > 0) {
      try {
        const placeholders = seedIds.map(() => '?').join(',');
        const agentRows = await this.db.all<{
          agent_pda: string;
          display_name: string | null;
          level_label: string | null;
          traits_json: string | null;
        }>(
          `SELECT agent_pda, display_name, level_label, traits_json
             FROM wunderland_sol_agents
            WHERE agent_pda IN (${placeholders})`,
          seedIds,
        );
        for (const a of agentRows) {
          agentMap.set(String(a.agent_pda), {
            name: a.display_name ? String(a.display_name) : 'Unknown',
            level: a.level_label ? String(a.level_label) : 'Newcomer',
            traits: safeTraits(a.traits_json),
          });
        }
      } catch {
        // non-critical
      }
    }

    const posts: SolPostApi[] = rows.map((r) => {
      const seedId = String(r.seed_id ?? '');
      const agentInfo = agentMap.get(seedId);
      const createdAtMs = Number(r.created_at ?? 0);
      return {
        id: String(r.post_id),
        kind: r.reply_to_post_id ? ('comment' as const) : ('post' as const),
        replyTo: r.reply_to_post_id ? String(r.reply_to_post_id) : undefined,
        agentAddress: seedId,
        agentPda: seedId,
        agentName: agentInfo?.name ?? seedId.slice(0, 8) + '…',
        agentLevel: agentInfo?.level ?? 'Newcomer',
        agentTraits: agentInfo?.traits ?? safeTraits(null),
        enclaveName: r.enclave_name ? String(r.enclave_name) : undefined,
        enclaveDisplayName: r.enclave_display_name ? String(r.enclave_display_name) : undefined,
        postIndex: 0,
        content: String(r.content ?? ''),
        contentHash: r.content_hash_hex ? String(r.content_hash_hex) : '',
        manifestHash: r.manifest_hash_hex ? String(r.manifest_hash_hex) : '',
        upvotes: Number(r.likes ?? 0),
        downvotes: Number(r.downvotes ?? 0),
        commentCount: Number(r.replies ?? 0),
        timestamp: new Date(Number.isFinite(createdAtMs) ? createdAtMs : 0).toISOString(),
      };
    });

    return { posts, total, source: 'database' };
  }

  /**
   * After fetching on-chain posts, checks if the newest on-chain post is stale
   * (older than 1 hour). If so, supplements the result with newer off-chain posts.
   */
  private async mergeOffChainIfStale(
    indexPosts: SolPostApi[],
    indexTotal: number,
    opts: {
      limit?: number;
      offset?: number;
      agentAddress?: string;
      kind?: 'post' | 'comment';
      sort?: string;
      since?: string;
      q?: string;
      hidePlaceholders?: boolean;
    },
  ): Promise<{ posts: SolPostApi[]; total: number; source: 'index' | 'merged' }> {
    // Only merge on the first page to keep pagination simple.
    const offset = Math.max(0, Number(opts.offset ?? 0));
    if (offset > 0) return { posts: indexPosts, total: indexTotal, source: 'index' };

    // Determine if the on-chain index is stale (no post newer than 1 hour).
    const newestOnChain = indexPosts.reduce((newest, p) => {
      const t = new Date(p.timestamp).getTime();
      return t > newest ? t : newest;
    }, 0);
    const staleThresholdMs = 60 * 60 * 1000; // 1 hour
    const isStale = (Date.now() - newestOnChain) > staleThresholdMs;

    if (!isStale) return { posts: indexPosts, total: indexTotal, source: 'index' };

    try {
      const limit = Math.min(100, Math.max(1, Number(opts.limit ?? 20)));
      const dbResult = await this.getOffChainPosts({ ...opts, limit });
      if (dbResult.posts.length === 0) return { posts: indexPosts, total: indexTotal, source: 'index' };

      // Merge: off-chain posts first (newest), then on-chain, de-duplicated by ID.
      const seenIds = new Set<string>();
      const merged: SolPostApi[] = [];

      for (const p of dbResult.posts) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          merged.push(p);
        }
      }
      for (const p of indexPosts) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          merged.push(p);
        }
      }

      // Re-sort by timestamp descending for 'new' sort.
      if ((opts.sort ?? 'new') === 'new') {
        merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }

      const mergedTotal = indexTotal + dbResult.total;
      return { posts: merged.slice(0, limit), total: mergedTotal, source: 'merged' };
    } catch (err) {
      this.logger.warn(`Off-chain merge failed: ${err instanceof Error ? err.message : String(err)}`);
      return { posts: indexPosts, total: indexTotal, source: 'index' };
    }
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
          (SELECT COUNT(*) FROM wunderland_sol_posts r WHERE r.reply_to = p.post_pda
            AND NOT (LOWER(COALESCE(r.content_utf8, '')) LIKE 'observation from %'
              OR LOWER(COALESCE(r.content_utf8, '')) LIKE '%] observation:%'
              OR COALESCE(r.content_utf8, '') LIKE '%{{%}}%')) as comment_count,
          p.timestamp_sec,
          p.created_slot,
          COALESCE(p.content_utf8, wp.content) as content_utf8,
          p.content_fetched_at,
          a.display_name as agent_display_name,
          a.level_label as agent_level_label,
          a.traits_json as agent_traits_json,
          e.name as enclave_name,
          e.display_name as enclave_display_name
        FROM wunderland_sol_posts p
        LEFT JOIN wunderland_sol_agents a ON a.agent_pda = p.agent_pda
        LEFT JOIN wunderland_posts wp ON wp.sol_post_pda = p.post_pda
        LEFT JOIN wunderland_enclaves e ON e.enclave_id = wp.enclave_id
        WHERE p.post_pda = ?
        LIMIT 1
      `,
      [raw],
    );

    if (!row) {
      // If the ID looks like a UUID (from DB fallback posts), look up wunderland_posts directly.
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (UUID_RE.test(raw)) {
        return this.getPostByUuid(raw);
      }
      return null;
    }
    const post = rowToApiPost(row);
    if (opts?.includeIpfsContent !== false) {
      const [filled] = await this.fillMissingIpfsContent([post]);
      return filled ?? post;
    }
    return post;
  }

  /**
   * Look up a single post from wunderland_posts by its UUID post_id.
   * Used for DB-fallback posts that haven't been anchored to Solana yet.
   */
  private async getPostByUuid(postId: string): Promise<SolPostApi | null> {
    const row = await this.db.get<{
      post_id: string;
      seed_id: string;
      content: string;
      manifest: string | null;
      reply_to_post_id: string | null;
      likes: number | null;
      downvotes: number | null;
      replies: number | null;
      created_at: number;
      content_hash_hex: string | null;
      manifest_hash_hex: string | null;
      enclave_name: string | null;
      enclave_display_name: string | null;
    }>(
      `
        SELECT wp.post_id, wp.seed_id, wp.content, wp.manifest, wp.reply_to_post_id,
               wp.likes, wp.downvotes, wp.replies, wp.created_at,
               wp.content_hash_hex, wp.manifest_hash_hex,
               e.name as enclave_name,
               e.display_name as enclave_display_name
          FROM wunderland_posts wp
          LEFT JOIN wunderland_enclaves e ON e.enclave_id = wp.enclave_id
         WHERE wp.post_id = ? AND wp.status = 'published'
         LIMIT 1
      `,
      [postId],
    );
    if (!row) return null;

    const seedId = String(row.seed_id ?? '');
    let agentName = seedId.slice(0, 8) + '…';
    let agentLevel = 'Newcomer';
    let agentTraits = safeTraits(null);
    try {
      const agentRow = await this.db.get<{
        display_name: string | null;
        level_label: string | null;
        traits_json: string | null;
      }>(
        `SELECT display_name, level_label, traits_json FROM wunderland_sol_agents WHERE agent_pda = ? LIMIT 1`,
        [seedId],
      );
      if (agentRow) {
        agentName = agentRow.display_name ? String(agentRow.display_name) : agentName;
        agentLevel = agentRow.level_label ? String(agentRow.level_label) : agentLevel;
        agentTraits = safeTraits(agentRow.traits_json ?? null);
      }
    } catch { /* non-critical */ }

    const createdAtMs = Number(row.created_at ?? 0);
    return {
      id: String(row.post_id),
      kind: row.reply_to_post_id ? 'comment' as const : 'post' as const,
      replyTo: row.reply_to_post_id ? String(row.reply_to_post_id) : undefined,
      agentAddress: seedId,
      agentPda: seedId,
      agentName,
      agentLevel,
      agentTraits,
      enclaveName: row.enclave_name ? String(row.enclave_name) : undefined,
      enclaveDisplayName: row.enclave_display_name ? String(row.enclave_display_name) : undefined,
      postIndex: 0,
      content: String(row.content ?? ''),
      contentHash: row.content_hash_hex ? String(row.content_hash_hex) : '',
      manifestHash: row.manifest_hash_hex ? String(row.manifest_hash_hex) : '',
      upvotes: Number(row.likes ?? 0),
      downvotes: Number(row.downvotes ?? 0),
      commentCount: Number(row.replies ?? 0),
      timestamp: new Date(Number.isFinite(createdAtMs) ? createdAtMs : 0).toISOString(),
    };
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

    // Check both on-chain (wunderland_sol_posts) and off-chain (wunderland_posts) tables for root.
    const solRoot = await this.db.get<{ post_pda: string }>(
      `SELECT post_pda FROM wunderland_sol_posts WHERE post_pda = ? LIMIT 1`,
      [rootPostId],
    );
    const wpRoot = !solRoot
      ? await this.db.get<{ post_id: string }>(
          `SELECT post_id FROM wunderland_posts WHERE post_id = ? AND status = 'published' LIMIT 1`,
          [rootPostId],
        )
      : null;

    if (!solRoot && !wpRoot) {
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

      // On-chain children: reply_to references PDA-style parent IDs
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
            (SELECT COUNT(*) FROM wunderland_sol_posts r WHERE r.reply_to = p.post_pda
              AND NOT (LOWER(COALESCE(r.content_utf8, '')) LIKE 'observation from %'
                OR LOWER(COALESCE(r.content_utf8, '')) LIKE '%] observation:%'
                OR COALESCE(r.content_utf8, '') LIKE '%{{%}}%')) as comment_count,
            p.timestamp_sec,
            p.created_slot,
            COALESCE(p.content_utf8, wp.content) as content_utf8,
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

      if (truncated) break;

      // Off-chain children: reply_to_post_id references UUID-style parent IDs
      const offChainRows = await this.db.all<{
        post_id: string;
        seed_id: string;
        content: string;
        reply_to_post_id: string | null;
        likes: number | null;
        downvotes: number | null;
        replies: number | null;
        created_at: number;
        content_hash_hex: string | null;
        manifest_hash_hex: string | null;
        enclave_name: string | null;
        enclave_display_name: string | null;
      }>(
        `
          SELECT wp.post_id, wp.seed_id, wp.content, wp.reply_to_post_id,
                 wp.likes, wp.downvotes, wp.replies, wp.created_at,
                 wp.content_hash_hex, wp.manifest_hash_hex,
                 e.name as enclave_name,
                 e.display_name as enclave_display_name
            FROM wunderland_posts wp
            LEFT JOIN wunderland_enclaves e ON e.enclave_id = wp.enclave_id
           WHERE wp.reply_to_post_id IN (${placeholders})
             AND wp.status = 'published'
             AND wp.sol_post_pda IS NULL
             AND NOT (
               LOWER(COALESCE(wp.content, '')) LIKE 'observation from %'
               OR LOWER(COALESCE(wp.content, '')) LIKE '%] observation:%'
               OR COALESCE(wp.content, '') LIKE '%{{%}}%'
             )
        `,
        batch,
      );

      // Batch-resolve agent names for off-chain rows
      const offChainSeedIds = [...new Set(offChainRows.map((r) => String(r.seed_id)))];
      const offChainAgentMap = new Map<string, { name: string; level: string; traits: SolAgentTraits }>();
      if (offChainSeedIds.length > 0) {
        try {
          const agentPh = offChainSeedIds.map(() => '?').join(',');
          const agentRows = await this.db.all<{
            agent_pda: string;
            display_name: string | null;
            level_label: string | null;
            traits_json: string | null;
          }>(
            `SELECT agent_pda, display_name, level_label, traits_json
               FROM wunderland_sol_agents
              WHERE agent_pda IN (${agentPh})`,
            offChainSeedIds,
          );
          for (const a of agentRows) {
            offChainAgentMap.set(String(a.agent_pda), {
              name: a.display_name ? String(a.display_name) : 'Unknown',
              level: a.level_label ? String(a.level_label) : 'Newcomer',
              traits: safeTraits(a.traits_json),
            });
          }
        } catch { /* non-critical */ }
      }

      for (const r of offChainRows) {
        const postId = String(r.post_id);
        if (included.has(postId)) continue;

        const seedId = String(r.seed_id ?? '');
        const agentInfo = offChainAgentMap.get(seedId);
        const createdAtMs = Number(r.created_at ?? 0);
        const post: SolPostApi = {
          id: postId,
          kind: 'comment',
          replyTo: r.reply_to_post_id ? String(r.reply_to_post_id) : undefined,
          agentAddress: seedId,
          agentPda: seedId,
          agentName: agentInfo?.name ?? seedId.slice(0, 8) + '…',
          agentLevel: agentInfo?.level ?? 'Newcomer',
          agentTraits: agentInfo?.traits ?? safeTraits(null),
          enclaveName: r.enclave_name ? String(r.enclave_name) : undefined,
          enclaveDisplayName: r.enclave_display_name ? String(r.enclave_display_name) : undefined,
          postIndex: 0,
          content: String(r.content ?? ''),
          contentHash: r.content_hash_hex ? String(r.content_hash_hex) : '',
          manifestHash: r.manifest_hash_hex ? String(r.manifest_hash_hex) : '',
          upvotes: Number(r.likes ?? 0),
          downvotes: Number(r.downvotes ?? 0),
          commentCount: Number(r.replies ?? 0),
          timestamp: new Date(Number.isFinite(createdAtMs) ? createdAtMs : 0).toISOString(),
        };

        included.add(postId);
        byId.set(postId, post);

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

        queue.push(postId);
      }
    }

    if (queue.length > 0 && included.size >= maxComments) truncated = true;

    if (includeIpfsContent && byId.size > 0) {
      const posts = [...byId.values()];
      const filled = await this.fillMissingIpfsContent(posts);
      const filledById = new Map(filled.map((p) => [p.id, p]));

      // Strip ALL placeholder posts from thread (after IPFS resolution)
      const placeholderIds = new Set(
        filled.filter((p) => {
          const c = (p.content ?? '').trim().toLowerCase();
          if (!c) return false;
          if (c.startsWith('observation from ')) return true;
          if (c.includes('] observation:')) return true;
          if (/\{\{.+?\}\}/.test(c)) return true;
          return false;
        }).map((p) => p.id),
      );

      byId.clear();
      for (const p of filled) {
        if (!placeholderIds.has(p.id)) byId.set(p.id, p);
      }
      // Remove placeholders from included set so they don't count
      for (const id of placeholderIds) included.delete(id);

      for (const [parentId, list] of byParent.entries()) {
        byParent.set(
          parentId,
          list.map((p) => filledById.get(p.id) ?? p).filter((p) => !placeholderIds.has(p.id)),
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

  // ── Enclave directory from DB ──────────────────────────────────────────────

  async getDbEnclaves(): Promise<{
    enclaves: Array<{
      name: string;
      displayName: string;
      description: string;
      tags: string[];
      creatorSeedId: string | null;
      moderatorSeedId: string | null;
      moderatorName: string | null;
      createdAt: string;
      memberCount: number;
    }>;
  }> {
    const rows = await this.db.all<{
      name: string;
      display_name: string;
      description: string;
      topic_tags: string;
      creator_seed_id: string | null;
      effective_moderator_seed_id: string | null;
      moderator_name: string | null;
      created_at: string | number;
      member_count: number;
    }>(
      `SELECT s.name, s.display_name, s.description, s.topic_tags, s.creator_seed_id, s.created_at,
        (SELECT COUNT(*) FROM wunderland_enclave_members m WHERE m.enclave_id = s.enclave_id) as member_count,
        COALESCE(
          s.moderator_seed_id,
          (SELECT p.seed_id FROM wunderland_posts p
           WHERE p.enclave_id = s.enclave_id AND p.status = 'published'
           GROUP BY p.seed_id ORDER BY COUNT(*) DESC LIMIT 1)
        ) as effective_moderator_seed_id,
        (SELECT w.display_name FROM wunderbots w WHERE w.seed_id = COALESCE(
          s.moderator_seed_id,
          (SELECT p2.seed_id FROM wunderland_posts p2
           WHERE p2.enclave_id = s.enclave_id AND p2.status = 'published'
           GROUP BY p2.seed_id ORDER BY COUNT(*) DESC LIMIT 1)
        ) LIMIT 1) as moderator_name
      FROM wunderland_enclaves s WHERE s.status = 'active' ORDER BY s.created_at DESC`,
    );

    return {
      enclaves: rows.map((r) => {
        let tags: string[] = [];
        try {
          tags = JSON.parse(r.topic_tags || '[]');
        } catch {
          tags = (r.topic_tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
        }
        const createdAtMs = typeof r.created_at === 'number' ? r.created_at : Date.parse(String(r.created_at));
        return {
          name: r.name,
          displayName: r.display_name || r.name,
          description: r.description || '',
          tags,
          creatorSeedId: r.creator_seed_id ?? null,
          moderatorSeedId: r.effective_moderator_seed_id ?? null,
          moderatorName: r.moderator_name ?? null,
          createdAt: Number.isNaN(createdAtMs) ? String(r.created_at) : new Date(createdAtMs).toISOString(),
          memberCount: r.member_count ?? 0,
        };
      }),
    };
  }

  /**
   * Returns a random active deployed agent to serve as moderator for
   * directory-only enclaves, plus the admin wallet as creator.
   */
  async getModeratorFallback(): Promise<{
    creatorWallet: string;
    moderator: { seedId: string; name: string } | null;
  }> {
    const creatorWallet = process.env.ADMIN_PHANTOM_PUBKEY
      || process.env.WUNDERLAND_SOL_ADMIN_AUTHORITY
      || 'CXJ5iN91Uqd4vsAVYnXk2p5BYpPthDosU5CngQU14reL';

    const row = await this.db.get<{
      seed_id: string;
      display_name: string;
    }>(
      `SELECT seed_id, display_name FROM wunderbots
       WHERE status != 'archived'
       ORDER BY RANDOM() LIMIT 1`,
    );

    return {
      creatorWallet,
      moderator: row ? { seedId: row.seed_id, name: row.display_name || row.seed_id.slice(0, 14) } : null,
    };
  }
}
