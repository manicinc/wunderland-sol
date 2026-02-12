import { createHash } from 'crypto';
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import {
  type Agent,
  type Post,
  type Stats,
  PROGRAM_ID as DEFAULT_PROGRAM_ID,
  CLUSTER as DEFAULT_CLUSTER,
} from './solana';
import { getEnclaveDirectoryMapServer } from './enclave-directory-server';

// ============================================================================
// On-chain only (no demo / off-chain fallback)
// ============================================================================

/**
 * Supports both current account layouts and legacy layouts still present on older deployments.
 */
const ACCOUNT_SIZE_AGENT_IDENTITY_CURRENT = 219;
const ACCOUNT_SIZE_AGENT_IDENTITY_LEGACY = 123;
const ACCOUNT_SIZE_POST_ANCHOR_CURRENT = 202;
const ACCOUNT_SIZE_POST_ANCHOR_LEGACY = 125;
const ACCOUNT_SIZE_REPUTATION_VOTE = 82;
const ACCOUNT_SIZE_TIP_ANCHOR = 132;
const ACCOUNT_SIZE_JOB_POSTING = 179; // 8 + 32 + 8 + 32 + 8 + 9 + 1 + 32 + 32 + 8 + 8 + 1
const DISCRIMINATOR_LEN = 8;

const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';

// ── IPFS CID derivation (CIDv1/raw/sha2-256) ───────────────────────────────

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
  if (!/^[a-f0-9]{64}$/i.test(hashHex)) {
    throw new Error('Invalid sha256 hex (expected 64 hex chars).');
  }
  const hashBytes = Buffer.from(hashHex, 'hex');
  const multihash = Buffer.concat([Buffer.from([SHA256_CODEC, SHA256_LENGTH]), hashBytes]);
  const cidBytes = Buffer.concat([Buffer.from([0x01, RAW_CODEC]), multihash]);
  return `b${encodeBase32(cidBytes)}`;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function getIpfsGateways(): string[] {
  const raw =
    process.env.WUNDERLAND_IPFS_GATEWAYS ||
    process.env.WUNDERLAND_IPFS_GATEWAY_URL ||
    process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL ||
    'https://ipfs.io';

  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\/+$/, ''));

  return list.length > 0 ? list : ['https://ipfs.io'];
}

type IpfsCacheEntry = {
  bytes: Buffer;
  fetchedAt: number;
};

const IPFS_CACHE_TTL_MS = Math.max(
  10_000,
  Number(process.env.WUNDERLAND_IPFS_CACHE_TTL_MS ?? 10 * 60_000),
);

const ipfsBlockCache = new Map<string, IpfsCacheEntry>();
const ipfsInFlight = new Map<string, Promise<Buffer>>();

async function fetchIpfsBlock(cid: string): Promise<Buffer> {
  const cached = ipfsBlockCache.get(cid);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < IPFS_CACHE_TTL_MS) return cached.bytes;

  const existing = ipfsInFlight.get(cid);
  if (existing) return existing;

  const controller = new AbortController();
  const timeoutMs = Math.max(2_000, Number(process.env.WUNDERLAND_IPFS_FETCH_TIMEOUT_MS ?? 10_000));
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const promise = (async () => {
    try {
      const gateways = getIpfsGateways();
      let lastError: unknown;
      for (const gateway of gateways) {
        const url = `${gateway}/ipfs/${encodeURIComponent(cid)}`;
        try {
          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) {
            lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
            continue;
          }
          const arrayBuffer = await res.arrayBuffer();
          const bytes = Buffer.from(arrayBuffer);
          ipfsBlockCache.set(cid, { bytes, fetchedAt: Date.now() });
          return bytes;
        } catch (err) {
          lastError = err;
          continue;
        }
      }
      throw lastError instanceof Error ? lastError : new Error('IPFS fetch failed');
    } finally {
      clearTimeout(timeoutId);
      ipfsInFlight.delete(cid);
    }
  })();

  ipfsInFlight.set(cid, promise);
  return promise;
}

async function fetchVerifiedUtf8FromIpfs(opts: { expectedSha256Hex: string }): Promise<string | null> {
  const cid = cidFromSha256Hex(opts.expectedSha256Hex);
  try {
    const bytes = await fetchIpfsBlock(cid);
    const actualHash = sha256Hex(bytes);
    if (actualHash !== opts.expectedSha256Hex.toLowerCase()) {
      throw new Error('sha256 mismatch');
    }
    return bytes.toString('utf8');
  } catch {
    return null;
  }
}

const LEVEL_NAMES: Record<number, string> = {
  1: 'Newcomer',
  2: 'Resident',
  3: 'Contributor',
  4: 'Notable',
  5: 'Luminary',
  6: 'Founder',
};

function getOnChainConfig(): { enabled: boolean; rpcUrl: string; rpcUrls: string[]; programId: string; cluster: string } {
  const cluster = (process.env.WUNDERLAND_SOL_CLUSTER ||
    process.env.SOLANA_CLUSTER ||
    process.env.NEXT_PUBLIC_CLUSTER ||
    DEFAULT_CLUSTER) as typeof DEFAULT_CLUSTER;

  // Build ordered RPC list: Chainstack → configured → public fallback
  const rpcCandidates: string[] = [];
  const chainstack1 = process.env.CHAINSTACK_RPC_ENDPOINT;
  const chainstack2 = process.env.CHAINSTACK_RPC_ENDPOINT_2;
  if (chainstack1) rpcCandidates.push(chainstack1.trim());
  if (chainstack2) rpcCandidates.push(chainstack2.trim());

  const rpcEnv =
    process.env.WUNDERLAND_SOL_RPC_URL ||
    process.env.SOLANA_RPC ||
    process.env.NEXT_PUBLIC_SOLANA_RPC;
  if (rpcEnv && /^https?:\/\//i.test(rpcEnv.trim())) rpcCandidates.push(rpcEnv.trim());

  // Always have public RPC as last fallback
  const publicRpc = clusterApiUrl(cluster);
  if (!rpcCandidates.includes(publicRpc)) rpcCandidates.push(publicRpc);

  const rpcUrl = rpcCandidates[0] || publicRpc;

  const programId =
    process.env.WUNDERLAND_SOL_PROGRAM_ID ||
    process.env.PROGRAM_ID ||
    process.env.NEXT_PUBLIC_PROGRAM_ID ||
    DEFAULT_PROGRAM_ID;
  return { enabled: true, rpcUrl, rpcUrls: rpcCandidates, programId, cluster };
}

/** Try an async operation across multiple RPC endpoints. */
async function withRpcFallback<T>(
  fn: (connection: Connection, programId: PublicKey) => Promise<T>,
): Promise<T> {
  const cfg = getOnChainConfig();
  const programId = new PublicKey(cfg.programId);
  let lastError: unknown;

  for (const url of cfg.rpcUrls) {
    try {
      const connection = new Connection(url, 'confirmed');
      return await fn(connection, programId);
    } catch (err) {
      lastError = err;
      console.warn(`[solana-server] RPC failed (${url.slice(0, 50)}…):`, err instanceof Error ? err.message : err);
    }
  }
  throw lastError;
}

export async function getProgramConfigServer(): Promise<{
  programId: string;
  cluster: string;
  rpcUrl: string;
}> {
  const cfg = getOnChainConfig();
  return {
    programId: cfg.programId,
    cluster: cfg.cluster,
    rpcUrl: cfg.rpcUrl.includes('api.') ? '[public endpoint]' : '[custom RPC]',
  };
}

function decodeDisplayName(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('utf8')
    .replace(/\0/g, '')
    .trim();
}

function decodeTraits(data: Buffer, offset: number): Agent['traits'] {
  const vals: number[] = [];
  for (let i = 0; i < 6; i++) {
    vals.push(data.readUInt16LE(offset + i * 2));
  }
  return {
    honestyHumility: vals[0] / 1000,
    emotionality: vals[1] / 1000,
    extraversion: vals[2] / 1000,
    agreeableness: vals[3] / 1000,
    conscientiousness: vals[4] / 1000,
    openness: vals[5] / 1000,
  };
}

function decodeAgentIdentity(_pda: PublicKey, data: Buffer): Agent {
  // Current layout:
  // discriminator(8) + owner(32) + agent_id(32) + agent_signer(32) + display_name(32) +
  // traits(12) + level(1) + xp(8) + total_entries(4) + reputation(8) +
  // metadata_hash(32) + created_at(8) + updated_at(8) + is_active(1) + bump(1)
  let offset = DISCRIMINATOR_LEN;

  const owner = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  // agent_id (skip)
  offset += 32;
  // agent_signer (skip)
  offset += 32;

  const displayName = decodeDisplayName(data.subarray(offset, offset + 32));
  offset += 32;

  const traits = decodeTraits(data, offset);
  offset += 12;

  const levelNum = data.readUInt8(offset);
  offset += 1;

  // xp (skip)
  offset += 8;

  const totalPosts = data.readUInt32LE(offset); // total_entries
  offset += 4;

  const reputationScore = Number(data.readBigInt64LE(offset));
  offset += 8;

  // metadata_hash (skip)
  offset += 32;

  const createdAtSec = Number(data.readBigInt64LE(offset));
  offset += 8;

  // updated_at (skip)
  offset += 8;

  const isActive = data.readUInt8(offset) === 1;

  return {
    address: _pda.toBase58(),
    owner,
    name: displayName,
    traits,
    level: LEVEL_NAMES[levelNum] || `Level ${levelNum}`,
    reputation: reputationScore,
    totalPosts,
    createdAt: new Date(createdAtSec * 1000).toISOString(),
    isActive,
  };
}

function decodeAgentIdentityLegacy(_pda: PublicKey, data: Buffer): Agent {
  // Legacy layout:
  // discriminator(8) + authority(32) + display_name(32) + traits(12) + level(1) +
  // xp(8) + total_posts(4) + reputation(8) + created_at(8) + updated_at(8) + is_active(1) + bump(1)
  let offset = DISCRIMINATOR_LEN;

  const authority = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const displayName = decodeDisplayName(data.subarray(offset, offset + 32));
  offset += 32;

  const traits = decodeTraits(data, offset);
  offset += 12;

  const levelNum = data.readUInt8(offset);
  offset += 1;

  // xp (skip)
  offset += 8;

  const totalPosts = data.readUInt32LE(offset);
  offset += 4;

  const reputationScore = Number(data.readBigInt64LE(offset));
  offset += 8;

  const createdAtSec = Number(data.readBigInt64LE(offset));
  offset += 8;

  // updated_at (skip)
  offset += 8;

  const isActive = data.readUInt8(offset) === 1;

  return {
    address: _pda.toBase58(),
    owner: authority,
    name: displayName,
    traits,
    level: LEVEL_NAMES[levelNum] || `Level ${levelNum}`,
    reputation: reputationScore,
    totalPosts,
    createdAt: new Date(createdAtSec * 1000).toISOString(),
    isActive,
  };
}

function decodePostAnchorCurrent(
  postPda: PublicKey,
  data: Buffer,
  agentByPda: Map<string, Agent>,
  enclaveDirectory: Map<string, { name: string; displayName: string }>,
): Post {
  // Current layout:
  // discriminator(8) + agent(32) + enclave(32) + kind(1) + reply_to(32) +
  // post_index(4) + content_hash(32) + manifest_hash(32) + upvotes(4) + downvotes(4) +
  // comment_count(4) + timestamp(8) + created_slot(8) + bump(1)
  let offset = DISCRIMINATOR_LEN;

  const agentPda = new PublicKey(data.subarray(offset, offset + 32));
  const agentPdaStr = agentPda.toBase58();
  offset += 32;

  const enclavePda = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const enclaveInfo = enclaveDirectory.get(enclavePda);

  const kindByte = data.readUInt8(offset);
  const kind: Post['kind'] = kindByte === 1 ? 'comment' : 'post';
  offset += 1;

  const replyToRaw = new PublicKey(data.subarray(offset, offset + 32));
  const replyTo = replyToRaw.equals(PublicKey.default) ? undefined : replyToRaw.toBase58();
  offset += 32;

  const postIndex = data.readUInt32LE(offset);
  offset += 4;

  const contentHash = Buffer.from(data.subarray(offset, offset + 32)).toString('hex');
  offset += 32;

  const manifestHash = Buffer.from(data.subarray(offset, offset + 32)).toString('hex');
  offset += 32;

  const upvotes = data.readUInt32LE(offset);
  offset += 4;

  const downvotes = data.readUInt32LE(offset);
  offset += 4;

  const commentCount = data.readUInt32LE(offset);
  offset += 4;

  const timestampSec = Number(data.readBigInt64LE(offset));
  offset += 8;

  const createdSlot = Number(data.readBigUInt64LE(offset));

  const agent = agentByPda.get(agentPdaStr);
  const agentAddress = agent?.address || agentPdaStr;

  return {
    id: postPda.toBase58(),
    kind,
    replyTo,
    agentAddress,
    agentPda: agentPdaStr,
    agentName: agent?.name || 'Unknown',
    agentLevel: agent?.level || 'Newcomer',
    agentTraits: agent?.traits || {
      honestyHumility: 0.5,
      emotionality: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      conscientiousness: 0.5,
      openness: 0.5,
    },
    enclavePda,
    enclaveName: enclaveInfo?.name,
    enclaveDisplayName: enclaveInfo?.displayName,
    postIndex,
    content: '',
    contentHash,
    manifestHash,
    upvotes,
    downvotes,
    commentCount,
    timestamp: new Date(timestampSec * 1000).toISOString(),
    createdSlot,
  };
}

function decodePostAnchorLegacy(
  postPda: PublicKey,
  data: Buffer,
  agentByPda: Map<string, Agent>,
): Post {
  // Legacy layout:
  // discriminator(8) + agent(32) + post_index(4) + content_hash(32) + manifest_hash(32) +
  // upvotes(4) + downvotes(4) + timestamp(8) + bump(1)
  let offset = DISCRIMINATOR_LEN;

  const agentPda = new PublicKey(data.subarray(offset, offset + 32));
  const agentPdaStr = agentPda.toBase58();
  offset += 32;

  const postIndex = data.readUInt32LE(offset);
  offset += 4;

  const contentHash = Buffer.from(data.subarray(offset, offset + 32)).toString('hex');
  offset += 32;

  const manifestHash = Buffer.from(data.subarray(offset, offset + 32)).toString('hex');
  offset += 32;

  const upvotes = data.readUInt32LE(offset);
  offset += 4;

  const downvotes = data.readUInt32LE(offset);
  offset += 4;

  const timestampSec = Number(data.readBigInt64LE(offset));

  const agent = agentByPda.get(agentPdaStr);
  const agentAddress = agent?.address || agentPdaStr;

  return {
    id: postPda.toBase58(),
    kind: 'post',
    agentAddress,
    agentPda: agentPdaStr,
    agentName: agent?.name || 'Unknown',
    agentLevel: agent?.level || 'Newcomer',
    agentTraits: agent?.traits || {
      honestyHumility: 0.5,
      emotionality: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      conscientiousness: 0.5,
      openness: 0.5,
    },
    postIndex,
    content: '',
    contentHash,
    manifestHash,
    upvotes,
    downvotes,
    commentCount: 0,
    timestamp: new Date(timestampSec * 1000).toISOString(),
  };
}

function decodePostAnchor(
  postPda: PublicKey,
  data: Buffer,
  agentByPda: Map<string, Agent>,
  enclaveDirectory: Map<string, { name: string; displayName: string }>,
): Post {
  try {
    return decodePostAnchorCurrent(postPda, data, agentByPda, enclaveDirectory);
  } catch {
    return decodePostAnchorLegacy(postPda, data, agentByPda);
  }
}

function decodeAgentIdentityWithFallback(pda: PublicKey, data: Buffer): Agent {
  try {
    return decodeAgentIdentity(pda, data);
  } catch {
    return decodeAgentIdentityLegacy(pda, data);
  }
}

export type Tip = {
  tipPda: string;
  tipper: string;
  contentHash: string;
  amount: number;
  priority: 'low' | 'normal' | 'high' | 'breaking';
  sourceType: 'text' | 'url';
  /** `null` for global tips (System Program). */
  targetEnclave: string | null;
  tipNonce: string;
  createdAt: string;
  status: 'pending' | 'settled' | 'refunded';
};

function decodeTipAnchor(tipPda: PublicKey, data: Buffer): Tip | null {
  // TipAnchor layout:
  // discriminator(8) + tipper(32) + content_hash(32) + amount(8) + priority(1) + source_type(1) +
  // target_enclave(32) + tip_nonce(8) + created_at(8) + status(1) + bump(1)
  let offset = DISCRIMINATOR_LEN;

  const tipper = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const contentHash = Buffer.from(data.subarray(offset, offset + 32)).toString('hex');
  offset += 32;

  const amount = Number(data.readBigUInt64LE(offset));
  offset += 8;

  const priorityByte = data.readUInt8(offset);
  offset += 1;

  const sourceTypeByte = data.readUInt8(offset);
  offset += 1;

  const targetEnclaveKey = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const tipNonce = data.readBigUInt64LE(offset).toString();
  offset += 8;

  const createdAtSec = Number(data.readBigInt64LE(offset));
  offset += 8;

  const statusByte = data.readUInt8(offset);

  const priority: Tip['priority'] =
    priorityByte === 3 ? 'breaking'
      : priorityByte === 2 ? 'high'
        : priorityByte === 1 ? 'normal'
          : 'low';

  const sourceType: Tip['sourceType'] = sourceTypeByte === 1 ? 'url' : 'text';

  const status: Tip['status'] =
    statusByte === 2 ? 'refunded'
      : statusByte === 1 ? 'settled'
        : 'pending';

  return {
    tipPda: tipPda.toBase58(),
    tipper,
    contentHash,
    amount,
    priority,
    sourceType,
    targetEnclave: targetEnclaveKey === SYSTEM_PROGRAM_ID ? null : targetEnclaveKey,
    tipNonce,
    createdAt: new Date(createdAtSec * 1000).toISOString(),
    status,
  };
}

async function getProgramAccountsBySize(
  connection: Connection,
  programId: PublicKey,
  sizes: number[],
) {
  const dedup = new Map<string, Awaited<ReturnType<Connection['getProgramAccounts']>>[number]>();

  for (const size of sizes) {
    const accounts = await connection.getProgramAccounts(programId, {
      filters: [{ dataSize: size }],
    });
    for (const account of accounts) {
      dedup.set(account.pubkey.toBase58(), account);
    }
  }

  return [...dedup.values()];
}

export async function getAllAgentsServer(): Promise<Agent[]> {
  try {
    return await withRpcFallback(async (connection, programId) => {
      const accounts = await getProgramAccountsBySize(connection, programId, [
        ACCOUNT_SIZE_AGENT_IDENTITY_CURRENT,
        ACCOUNT_SIZE_AGENT_IDENTITY_LEGACY,
      ]);

      return accounts
        .map((acc) => {
          try {
            return decodeAgentIdentityWithFallback(acc.pubkey, acc.account.data);
          } catch {
            return null;
          }
        })
        .filter((a): a is Agent => a !== null);
    });
  } catch (error) {
    console.warn('[solana-server] Failed to fetch on-chain agents (all RPCs exhausted):', error);
    return [];
  }
}

export async function getAllTipsServer(opts?: {
  limit?: number;
  offset?: number;
  tipper?: string;
  targetEnclave?: string | null;
  priority?: Tip['priority'];
  status?: Tip['status'];
}): Promise<{ tips: Tip[]; total: number }> {
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;

  try {
    return await withRpcFallback(async (connection, programId) => {
      const accounts = await getProgramAccountsBySize(connection, programId, [ACCOUNT_SIZE_TIP_ANCHOR]);

      const decoded = accounts
        .map((acc) => {
          try {
            return decodeTipAnchor(acc.pubkey, acc.account.data);
          } catch {
            return null;
          }
        })
        .filter((t): t is Tip => t !== null);

      const filtered = decoded
        .filter((t) => (opts?.tipper ? t.tipper === opts.tipper : true))
        .filter((t) => (opts?.targetEnclave !== undefined ? t.targetEnclave === opts.targetEnclave : true))
        .filter((t) => (opts?.priority ? t.priority === opts.priority : true))
        .filter((t) => (opts?.status ? t.status === opts.status : true));

      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const total = filtered.length;
      return { tips: filtered.slice(offset, offset + limit), total };
    });
  } catch (error) {
    console.warn('[solana-server] Failed to fetch on-chain tips (all RPCs exhausted):', error);
    return { tips: [], total: 0 };
  }
}

export async function getAllPostsServer(opts?: {
  limit?: number;
  offset?: number;
  agentAddress?: string;
  replyTo?: string;
  kind?: Post['kind'];
  sort?: string;
  enclave?: string;
  since?: string;
  q?: string;
}): Promise<{ posts: Post[]; total: number }> {
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;
  const agentAddress = opts?.agentAddress;
  const replyTo = opts?.replyTo;
  const kind = opts?.kind ?? 'post';
  const sort = opts?.sort ?? 'new';
  const enclave = opts?.enclave;
  const since = opts?.since;
  const q = opts?.q?.toLowerCase();

  try {
    return await withRpcFallback(async (connection, programId) => {
    const enclaveDirectory = getEnclaveDirectoryMapServer(programId);

    // Fetch agents first so posts can be resolved to authority + display name.
    const agentAccounts = await getProgramAccountsBySize(connection, programId, [
      ACCOUNT_SIZE_AGENT_IDENTITY_CURRENT,
      ACCOUNT_SIZE_AGENT_IDENTITY_LEGACY,
    ]);
    const agentByPda = new Map<string, Agent>();
    for (const acc of agentAccounts) {
      try {
        agentByPda.set(
          acc.pubkey.toBase58(),
          decodeAgentIdentityWithFallback(acc.pubkey, acc.account.data),
        );
      } catch {
        continue;
      }
    }

    const postAccounts = await getProgramAccountsBySize(connection, programId, [
      ACCOUNT_SIZE_POST_ANCHOR_CURRENT,
      ACCOUNT_SIZE_POST_ANCHOR_LEGACY,
    ]);

    const posts = postAccounts
      .map((acc) => {
        try {
          return decodePostAnchor(acc.pubkey, acc.account.data, agentByPda, enclaveDirectory);
        } catch {
          return null;
        }
      })
      .filter((p): p is Post => p !== null);

    let filtered = posts
      .filter((p) => p.kind === kind)
      .filter((p) => (agentAddress ? p.agentAddress === agentAddress : true))
      .filter((p) => (replyTo ? p.replyTo === replyTo : true));

    // Enclave filter
    if (enclave) {
      filtered = filtered.filter((p) => p.enclaveName === enclave);
    }

    // Time filter
    if (since) {
      const now = Date.now();
      let cutoff = 0;
      if (since === 'day') cutoff = now - 24 * 60 * 60 * 1000;
      else if (since === 'week') cutoff = now - 7 * 24 * 60 * 60 * 1000;
      else if (since === 'month') cutoff = now - 30 * 24 * 60 * 60 * 1000;
      else if (since === 'year') cutoff = now - 365 * 24 * 60 * 60 * 1000;
      if (cutoff > 0) {
        filtered = filtered.filter((p) => new Date(p.timestamp).getTime() >= cutoff);
      }
    }

    // Sort
    if (sort === 'hot') {
      filtered.sort((a, b) => {
        const scoreA = (a.upvotes - a.downvotes) / Math.pow((Date.now() - new Date(a.timestamp).getTime()) / 3600000 + 2, 1.8);
        const scoreB = (b.upvotes - b.downvotes) / Math.pow((Date.now() - new Date(b.timestamp).getTime()) / 3600000 + 2, 1.8);
        return scoreB - scoreA;
      });
    } else if (sort === 'top') {
      filtered.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
    } else if (sort === 'controversial') {
      filtered.sort((a, b) => {
        const cA = Math.min(a.upvotes, a.downvotes) / Math.max(a.upvotes, a.downvotes, 1) * (a.upvotes + a.downvotes);
        const cB = Math.min(b.upvotes, b.downvotes) / Math.max(b.upvotes, b.downvotes, 1) * (b.upvotes + b.downvotes);
        return cB - cA;
      });
    } else {
      // 'new' — default: newest first
      filtered.sort(
        (a, b) =>
          (b.createdSlot ?? 0) - (a.createdSlot ?? 0) ||
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    }

    // Text search (content + agent + enclave).
    // If `q` is set, we fetch+verify IPFS bytes for all candidates so results are accurate.
    let final = filtered;
    if (q) {
      const concurrency = Math.max(1, Number(process.env.WUNDERLAND_IPFS_FETCH_CONCURRENCY ?? 8));
      let i = 0;
      const workers = Array.from({ length: concurrency }, async () => {
        while (i < filtered.length) {
          const idx = i++;
          const p = filtered[idx];
          if (!p || p.content) continue;
          const content = await fetchVerifiedUtf8FromIpfs({ expectedSha256Hex: p.contentHash });
          if (content) p.content = content;
        }
      });
      await Promise.allSettled(workers);

      final = filtered.filter(
        (p) =>
          (p.content && p.content.toLowerCase().includes(q)) ||
          p.agentName.toLowerCase().includes(q) ||
          (p.enclaveName && p.enclaveName.toLowerCase().includes(q)),
      );
    }

    const total = final.length;
    const window = final.slice(offset, offset + limit);

    // Fetch + verify IPFS content for the returned window (on-chain-first).
    await Promise.allSettled(
      window.map(async (p) => {
        if (p.content) return;
        const content = await fetchVerifiedUtf8FromIpfs({ expectedSha256Hex: p.contentHash });
        if (content) p.content = content;
      }),
    );

    return { posts: window, total };
    }); // end withRpcFallback
  } catch (error) {
    console.warn('[solana-server] Failed to fetch on-chain posts (all RPCs exhausted):', error);
    return { posts: [], total: 0 };
  }
}

export async function getPostByIdServer(postId: string): Promise<Post | null> {
  try {
    return await withRpcFallback(async (connection, programId) => {
    const enclaveDirectory = getEnclaveDirectoryMapServer(programId);

    const postPda = new PublicKey(postId);
    const postInfo = await connection.getAccountInfo(postPda, 'confirmed');
    if (!postInfo?.data) return null;
    if (!postInfo.owner.equals(programId)) return null;

    const postData = Buffer.from(postInfo.data);
    const agentPda = new PublicKey(postData.subarray(DISCRIMINATOR_LEN, DISCRIMINATOR_LEN + 32));

    const agentByPda = new Map<string, Agent>();
    try {
      const agentInfo = await connection.getAccountInfo(agentPda, 'confirmed');
      if (agentInfo?.data) {
        agentByPda.set(agentPda.toBase58(), decodeAgentIdentityWithFallback(agentPda, Buffer.from(agentInfo.data)));
      }
    } catch {
      // Best-effort. If decode fails, the post will still render with fallback fields.
    }

    const decoded = decodePostAnchor(postPda, postData, agentByPda, enclaveDirectory);
    if (!decoded.content) {
      const content = await fetchVerifiedUtf8FromIpfs({ expectedSha256Hex: decoded.contentHash });
      if (content) decoded.content = content;
    }
    return decoded;
    }); // end withRpcFallback
  } catch (error) {
    console.warn('[solana-server] Failed to fetch post by id (all RPCs exhausted):', error);
    return null;
  }
}

export async function getLeaderboardServer(): Promise<(Agent & { rank: number; dominantTrait: string })[]> {
  const agents = await getAllAgentsServer();
  agents.sort((a, b) => b.reputation - a.reputation);

  const fullLabels: Record<keyof Agent['traits'], string> = {
    honestyHumility: 'Honesty-Humility',
    emotionality: 'Emotionality',
    extraversion: 'Extraversion',
    agreeableness: 'Agreeableness',
    conscientiousness: 'Conscientiousness',
    openness: 'Openness',
  };

  const dominant = (traits: Agent['traits']): string => {
    const entries = Object.entries(traits) as [keyof Agent['traits'], number][];
    entries.sort((a, b) => b[1] - a[1]);
    return fullLabels[entries[0][0]] || String(entries[0][0]);
  };

  return agents.map((agent, i) => ({ ...agent, rank: i + 1, dominantTrait: dominant(agent.traits) }));
}

export async function getNetworkStatsServer(): Promise<Stats> {
  const agents = await getAllAgentsServer();
  const { posts, total } = await getAllPostsServer({ limit: Number.MAX_SAFE_INTEGER, kind: 'post' });

  const activeAgents = agents.filter((a) => a.isActive).length;
  const totalVotes = posts.reduce((sum, p) => sum + p.upvotes + p.downvotes, 0);
  const avgReputation = agents.length > 0 ? agents.reduce((sum, a) => sum + a.reputation, 0) / agents.length : 0;

  return {
    totalAgents: agents.length,
    totalPosts: total,
    totalVotes,
    averageReputation: Math.round(avgReputation * 100) / 100,
    activeAgents,
  };
}

export type NetworkNode = {
  id: string;
  name: string;
  level: string;
  reputation: number;
};

export type NetworkEdge = {
  from: string;
  to: string;
  up: number;
  down: number;
  net: number;
};

function decodeReputationVote(data: Buffer): { voter: string; post: string; value: 1 | -1; timestamp: string } | null {
  let offset = DISCRIMINATOR_LEN;

  const voter = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const post = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const value = data.readInt8(offset);
  offset += 1;

  const timestampSec = Number(data.readBigInt64LE(offset));

  if (value !== 1 && value !== -1) return null;

  return { voter, post, value, timestamp: new Date(timestampSec * 1000).toISOString() };
}

export async function getNetworkGraphServer(opts?: {
  maxNodes?: number;
  maxEdges?: number;
}): Promise<{ nodes: NetworkNode[]; edges: NetworkEdge[] }> {
  const maxNodes = opts?.maxNodes ?? 60;
  const maxEdges = opts?.maxEdges ?? 200;

  return withRpcFallback(async (connection, programId) => {
  const enclaveDirectory = getEnclaveDirectoryMapServer(programId);

  const agentAccounts = await getProgramAccountsBySize(connection, programId, [
    ACCOUNT_SIZE_AGENT_IDENTITY_CURRENT,
    ACCOUNT_SIZE_AGENT_IDENTITY_LEGACY,
  ]);

  const agents: Agent[] = [];
  const agentByPda = new Map<string, Agent>();
  for (const acc of agentAccounts) {
    try {
      const agent = decodeAgentIdentityWithFallback(acc.pubkey, acc.account.data);
      agents.push(agent);
      agentByPda.set(acc.pubkey.toBase58(), agent);
    } catch {
      continue;
    }
  }

  const postAccounts = await getProgramAccountsBySize(connection, programId, [
    ACCOUNT_SIZE_POST_ANCHOR_CURRENT,
    ACCOUNT_SIZE_POST_ANCHOR_LEGACY,
  ]);

  const postAuthorByPostPda = new Map<string, string>();
  for (const acc of postAccounts) {
    try {
      const post = decodePostAnchor(acc.pubkey, acc.account.data, agentByPda, enclaveDirectory);
      const agent = agentByPda.get(post.agentPda || '');
      if (!agent) continue;
      postAuthorByPostPda.set(acc.pubkey.toBase58(), agent.address);
    } catch {
      continue;
    }
  }

  const voteAccounts = await connection.getProgramAccounts(programId, {
    filters: [{ dataSize: ACCOUNT_SIZE_REPUTATION_VOTE }],
  });

  const edgeByKey = new Map<string, NetworkEdge>();
  for (const acc of voteAccounts) {
    try {
      const decoded = decodeReputationVote(acc.account.data);
      if (!decoded) continue;

      const voterAgent = agentByPda.get(decoded.voter);
      if (!voterAgent) continue;

      const author = postAuthorByPostPda.get(decoded.post);
      if (!author) continue;

      if (author === voterAgent.address) continue;

      const key = `${voterAgent.address}->${author}`;
      const existing = edgeByKey.get(key) || { from: voterAgent.address, to: author, up: 0, down: 0, net: 0 };

      if (decoded.value === 1) existing.up += 1;
      else existing.down += 1;
      existing.net += decoded.value;

      edgeByKey.set(key, existing);
    } catch {
      continue;
    }
  }

  let edges = [...edgeByKey.values()];
  edges.sort((a, b) => (b.up + b.down) - (a.up + a.down) || Math.abs(b.net) - Math.abs(a.net));
  edges = edges.slice(0, maxEdges);

  const connected = new Set<string>();
  for (const e of edges) {
    connected.add(e.from);
    connected.add(e.to);
  }

  let nodesSource = connected.size > 0 ? agents.filter((a) => connected.has(a.address)) : [...agents];
  nodesSource.sort((a, b) => b.reputation - a.reputation);
  nodesSource = nodesSource.slice(0, maxNodes);

  const nodeIdSet = new Set(nodesSource.map((a) => a.address));
  edges = edges.filter((e) => nodeIdSet.has(e.from) && nodeIdSet.has(e.to));

  const nodes: NetworkNode[] = nodesSource.map((a) => ({
    id: a.address,
    name: a.name,
    level: a.level,
    reputation: a.reputation,
  }));

  return { nodes, edges };
  }); // end withRpcFallback
}

// ============================================================================
// On-chain Job Postings
// ============================================================================

export type OnChainJob = {
  jobPda: string;
  creatorWallet: string;
  metadataHash: string;
  budgetLamports: string;
  buyItNowLamports: string | null;
  status: 'open' | 'assigned' | 'submitted' | 'completed' | 'cancelled';
  assignedAgent: string | null;
  acceptedBid: string | null;
  createdAt: number;
  updatedAt: number;
  // Enriched from metadata cache (may be null if no cache)
  title: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  cluster: string | null;
};

function decodeJobPosting(pda: PublicKey, data: Buffer): OnChainJob | null {
  try {
    let offset = DISCRIMINATOR_LEN;

    const creator = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
    offset += 32;

    // jobNonce
    offset += 8;

    const metadataHashBytes = data.subarray(offset, offset + 32);
    const metadataHash = Buffer.from(metadataHashBytes).toString('hex');
    offset += 32;

    const budgetLamports = data.readBigUInt64LE(offset).toString();
    offset += 8;

    const buyItNowTag = data.readUInt8(offset);
    offset += 1;
    let buyItNowLamports: string | null = null;
    if (buyItNowTag === 1) {
      buyItNowLamports = data.readBigUInt64LE(offset).toString();
      offset += 8;
    }

    const statusByte = data.readUInt8(offset);
    offset += 1;

    const assignedAgentKey = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
    offset += 32;

    const acceptedBidKey = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
    offset += 32;

    const createdAtSec = Number(data.readBigInt64LE(offset));
    offset += 8;

    const updatedAtSec = Number(data.readBigInt64LE(offset));

    const status =
      statusByte === 1 ? 'assigned' as const
      : statusByte === 2 ? 'submitted' as const
      : statusByte === 3 ? 'completed' as const
      : statusByte === 4 ? 'cancelled' as const
      : 'open' as const;

    return {
      jobPda: pda.toBase58(),
      creatorWallet: creator,
      metadataHash,
      budgetLamports,
      buyItNowLamports,
      status,
      assignedAgent: assignedAgentKey === SYSTEM_PROGRAM_ID ? null : assignedAgentKey,
      acceptedBid: acceptedBidKey === SYSTEM_PROGRAM_ID ? null : acceptedBidKey,
      createdAt: createdAtSec,
      updatedAt: updatedAtSec,
      title: null,
      description: null,
      metadata: null,
      cluster: DEFAULT_CLUSTER,
    };
  } catch {
    return null;
  }
}

// Simple in-memory metadata cache (populated when creators POST metadata after job creation)
const jobMetadataCache = new Map<string, { title?: string; description?: string; metadata?: Record<string, unknown> }>();

export function cacheJobMetadata(
  jobPda: string,
  meta: { title?: string; description?: string; metadata?: Record<string, unknown> },
) {
  jobMetadataCache.set(jobPda, meta);
}

export async function getAllJobsServer(opts?: {
  status?: string;
  creator?: string;
  limit?: number;
  offset?: number;
}): Promise<{ jobs: OnChainJob[]; total: number }> {
  const limit = opts?.limit ?? 50;
  const offsetN = opts?.offset ?? 0;

  try {
    return await withRpcFallback(async (connection, programId) => {
      const accounts = await connection.getProgramAccounts(programId, {
        filters: [{ dataSize: ACCOUNT_SIZE_JOB_POSTING }],
      });

      let decoded = accounts
        .map((acc) => decodeJobPosting(acc.pubkey, acc.account.data as Buffer))
        .filter((j): j is OnChainJob => j !== null);

      // Filter by status
      if (opts?.status && opts.status !== 'all') {
        decoded = decoded.filter((j) => j.status === opts.status);
      }

      // Filter by creator
      if (opts?.creator) {
        decoded = decoded.filter((j) => j.creatorWallet === opts.creator);
      }

      // Enrich with cached metadata
      for (const job of decoded) {
        const cached = jobMetadataCache.get(job.jobPda);
        if (cached) {
          job.title = cached.title ?? null;
          job.description = cached.description ?? null;
          job.metadata = cached.metadata ?? null;
        }
      }

      // Sort by createdAt descending
      decoded.sort((a, b) => b.createdAt - a.createdAt);

      const total = decoded.length;
      const window = decoded.slice(offsetN, offsetN + limit);

      return { jobs: window, total };
    });
  } catch (error) {
    console.warn('[solana-server] Failed to fetch on-chain jobs (all RPCs exhausted):', error);
    return { jobs: [], total: 0 };
  }
}
