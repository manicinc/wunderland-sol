/**
 * @file wunderland-sol-social-worker.service.ts
 * @description Background worker that indexes on-chain AgentIdentity + PostAnchor
 * accounts into local DB tables (`wunderland_sol_agents`, `wunderland_sol_posts`)
 * so the frontend can render feeds/threads without expensive per-request RPC scans.
 *
 * Env gates:
 *   WUNDERLAND_SOL_ENABLED=true
 *   WUNDERLAND_SOL_SOCIAL_WORKER_ENABLED=true
 */

import { createHash } from 'node:crypto';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';

type SolAgentTraits = {
  honestyHumility: number;
  emotionality: number;
  extraversion: number;
  agreeableness: number;
  conscientiousness: number;
  openness: number;
};

type DecodedSolAgent = {
  agentPda: string;
  ownerWallet: string;
  displayName: string;
  traits: SolAgentTraits;
  levelNum: number;
  levelLabel: string;
  totalPosts: number;
  reputation: number;
  createdAtSec: number | null;
  isActive: boolean;
};

type DecodedSolPost = {
  postPda: string;
  kind: 'post' | 'comment';
  replyTo: string | null;
  agentPda: string;
  enclavePda: string | null;
  postIndex: number;
  contentHashHex: string;
  manifestHashHex: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  timestampSec: number;
  createdSlot: number | null;
};

const DISCRIMINATOR_LEN = 8;
const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';

// ── base58 (needed for getProgramAccounts discriminator filter) ─────────────

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  const digits = [0];

  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i += 1) {
      carry += (digits[i] ?? 0) << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  // Preserve leading zeros (bs58 compatible).
  for (let k = 0; k < bytes.length && bytes[k] === 0 && k < bytes.length - 1; k += 1) {
    digits.push(0);
  }

  return digits
    .reverse()
    .map((d) => BASE58_ALPHABET[d] ?? '')
    .join('');
}

function accountDiscriminator(accountName: string): Buffer {
  return createHash('sha256').update(`account:${accountName}`).digest().subarray(0, 8);
}

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
  const hashBytes = Buffer.from(hashHex, 'hex');
  const multihash = Buffer.concat([Buffer.from([SHA256_CODEC, SHA256_LENGTH]), hashBytes]);
  const cidBytes = Buffer.concat([Buffer.from([0x01, RAW_CODEC]), multihash]);
  return `b${encodeBase32(cidBytes)}`;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function decodeDisplayName(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('utf8')
    .replace(/\0/g, '')
    .trim();
}

function decodeTraits(data: Buffer, offset: number): SolAgentTraits {
  const vals: number[] = [];
  for (let i = 0; i < 6; i += 1) {
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

const LEVEL_NAMES: Record<number, string> = {
  1: 'Newcomer',
  2: 'Resident',
  3: 'Contributor',
  4: 'Notable',
  5: 'Luminary',
  6: 'Founder',
};

function decodeAgentIdentityCurrent(data: Buffer, web3: any, agentPda: string): DecodedSolAgent {
  // Current layout:
  // discriminator(8) + owner(32) + agent_id(32) + agent_signer(32) + display_name(32) +
  // traits(12) + level(1) + xp(8) + total_entries(4) + reputation(8) +
  // metadata_hash(32) + created_at(8) + updated_at(8) + is_active(1) + bump(1)
  let offset = DISCRIMINATOR_LEN;

  const owner = new web3.PublicKey(data.subarray(offset, offset + 32)).toBase58();
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

  const totalPosts = data.readUInt32LE(offset);
  offset += 4;

  const reputation = Number(data.readBigInt64LE(offset));
  offset += 8;

  // metadata_hash (skip)
  offset += 32;

  const createdAtSec = Number(data.readBigInt64LE(offset));
  offset += 8;

  // updated_at (skip)
  offset += 8;

  const isActive = data.readUInt8(offset) === 1;

  return {
    agentPda,
    ownerWallet: owner,
    displayName: displayName || 'Unknown',
    traits,
    levelNum,
    levelLabel: LEVEL_NAMES[levelNum] || `Level ${levelNum}`,
    totalPosts,
    reputation,
    createdAtSec: Number.isFinite(createdAtSec) ? createdAtSec : null,
    isActive,
  };
}

function decodeAgentIdentityLegacy(data: Buffer, web3: any, agentPda: string): DecodedSolAgent {
  // Legacy layout:
  // discriminator(8) + authority(32) + display_name(32) + traits(12) + level(1) +
  // xp(8) + total_posts(4) + reputation(8) + created_at(8) + updated_at(8) + is_active(1) + bump(1)
  let offset = DISCRIMINATOR_LEN;

  const authority = new web3.PublicKey(data.subarray(offset, offset + 32)).toBase58();
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

  const reputation = Number(data.readBigInt64LE(offset));
  offset += 8;

  const createdAtSec = Number(data.readBigInt64LE(offset));
  offset += 8;

  // updated_at (skip)
  offset += 8;

  const isActive = data.readUInt8(offset) === 1;

  return {
    agentPda,
    ownerWallet: authority,
    displayName: displayName || 'Unknown',
    traits,
    levelNum,
    levelLabel: LEVEL_NAMES[levelNum] || `Level ${levelNum}`,
    totalPosts,
    reputation,
    createdAtSec: Number.isFinite(createdAtSec) ? createdAtSec : null,
    isActive,
  };
}

function decodeAgentIdentityWithFallback(data: Buffer, web3: any, agentPda: string): DecodedSolAgent {
  try {
    return decodeAgentIdentityCurrent(data, web3, agentPda);
  } catch {
    return decodeAgentIdentityLegacy(data, web3, agentPda);
  }
}

function decodePostAnchorCurrent(data: Buffer, web3: any, postPda: string): DecodedSolPost {
  // Current layout:
  // discriminator(8) + agent(32) + enclave(32) + kind(1) + reply_to(32) +
  // post_index(4) + content_hash(32) + manifest_hash(32) + upvotes(4) + downvotes(4) +
  // comment_count(4) + timestamp(8) + created_slot(8) + bump(1)
  let offset = DISCRIMINATOR_LEN;

  const agentPda = new web3.PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const enclavePda = new web3.PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const kindByte = data.readUInt8(offset);
  const kind: DecodedSolPost['kind'] = kindByte === 1 ? 'comment' : 'post';
  offset += 1;

  const replyTo = new web3.PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const postIndex = data.readUInt32LE(offset);
  offset += 4;

  const contentHashHex = Buffer.from(data.subarray(offset, offset + 32)).toString('hex');
  offset += 32;

  const manifestHashHex = Buffer.from(data.subarray(offset, offset + 32)).toString('hex');
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

  return {
    postPda,
    kind,
    replyTo: replyTo === SYSTEM_PROGRAM_ID ? null : replyTo,
    agentPda,
    enclavePda: enclavePda === SYSTEM_PROGRAM_ID ? null : enclavePda,
    postIndex,
    contentHashHex,
    manifestHashHex,
    upvotes,
    downvotes,
    commentCount,
    timestampSec,
    createdSlot: Number.isFinite(createdSlot) ? createdSlot : null,
  };
}

function decodePostAnchorLegacy(data: Buffer, web3: any, postPda: string): DecodedSolPost {
  // Legacy layout:
  // discriminator(8) + agent(32) + post_index(4) + content_hash(32) + manifest_hash(32) +
  // upvotes(4) + downvotes(4) + timestamp(8) + bump(1)
  let offset = DISCRIMINATOR_LEN;

  const agentPda = new web3.PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const postIndex = data.readUInt32LE(offset);
  offset += 4;

  const contentHashHex = Buffer.from(data.subarray(offset, offset + 32)).toString('hex');
  offset += 32;

  const manifestHashHex = Buffer.from(data.subarray(offset, offset + 32)).toString('hex');
  offset += 32;

  const upvotes = data.readUInt32LE(offset);
  offset += 4;

  const downvotes = data.readUInt32LE(offset);
  offset += 4;

  const timestampSec = Number(data.readBigInt64LE(offset));

  return {
    postPda,
    kind: 'post',
    replyTo: null,
    agentPda,
    enclavePda: null,
    postIndex,
    contentHashHex,
    manifestHashHex,
    upvotes,
    downvotes,
    commentCount: 0,
    timestampSec,
    createdSlot: null,
  };
}

function decodePostAnchorWithFallback(data: Buffer, web3: any, postPda: string): DecodedSolPost {
  try {
    return decodePostAnchorCurrent(data, web3, postPda);
  } catch {
    return decodePostAnchorLegacy(data, web3, postPda);
  }
}

type IpfsCacheEntry = { bytes: Buffer; fetchedAt: number };

@Injectable()
export class WunderlandSolSocialWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WunderlandSolSocialWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private polling = false;

  private readonly enabled =
    process.env.WUNDERLAND_SOL_ENABLED === 'true' &&
    process.env.WUNDERLAND_SOL_SOCIAL_WORKER_ENABLED === 'true';

  private readonly programId = process.env.WUNDERLAND_SOL_PROGRAM_ID ?? '';
  private readonly rpcUrl = process.env.WUNDERLAND_SOL_RPC_URL ?? '';
  private readonly cluster = process.env.WUNDERLAND_SOL_CLUSTER ?? '';

  private readonly pollIntervalMs = Math.max(
    5_000,
    Number(process.env.WUNDERLAND_SOL_SOCIAL_WORKER_POLL_INTERVAL_MS ?? 60_000),
  );

  private readonly fetchIpfsEnabled =
    process.env.WUNDERLAND_SOL_SOCIAL_WORKER_FETCH_IPFS === 'true';

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
    Number(process.env.WUNDERLAND_SOL_SOCIAL_WORKER_IPFS_RETRY_TTL_MS ?? 10 * 60_000),
  );

  private readonly ipfsBatchSize = Math.max(
    1,
    Math.min(500, Number(process.env.WUNDERLAND_SOL_SOCIAL_WORKER_IPFS_BATCH_SIZE ?? 100)),
  );

  private readonly ipfsBlockCache = new Map<string, IpfsCacheEntry>();
  private readonly ipfsInFlight = new Map<string, Promise<Buffer>>();

  constructor(private readonly db: DatabaseService) {}

  onModuleInit(): void {
    if (!this.enabled) return;
    if (!this.programId) {
      this.logger.warn('Social indexer worker enabled but missing WUNDERLAND_SOL_PROGRAM_ID.');
      return;
    }

    this.logger.log(`Starting social indexer worker (poll every ${this.pollIntervalMs}ms).`);
    this.timer = setInterval(() => void this.pollOnce().catch(() => {}), this.pollIntervalMs);
    void this.pollOnce().catch(() => {});
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async pollOnce(): Promise<void> {
    if (this.polling) return;
    this.polling = true;

    const startedAt = Date.now();
    try {
      const web3 = await import('@solana/web3.js');
      const connection = new web3.Connection(
        this.rpcUrl || web3.clusterApiUrl((this.cluster as any) || 'devnet'),
        'confirmed',
      );
      const programPubkey = new web3.PublicKey(this.programId);

      await Promise.all([
        this.indexAgentIdentities(connection, web3, programPubkey),
        this.indexPostAnchors(connection, web3, programPubkey),
      ]);

      if (this.fetchIpfsEnabled) {
        await this.backfillIpfsContent().catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`IPFS backfill failed: ${msg}`);
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Social indexer poll failed: ${msg}`);
    } finally {
      this.polling = false;
      const elapsed = Date.now() - startedAt;
      if (elapsed > 5_000) {
        this.logger.debug?.(`Social indexer poll completed in ${elapsed}ms.`);
      }
    }
  }

  private async indexAgentIdentities(connection: any, web3: any, programPubkey: any): Promise<void> {
    const disc = accountDiscriminator('AgentIdentity');
    const discBase58 = base58Encode(disc);

    const accounts = await connection.getProgramAccounts(programPubkey, {
      filters: [{ memcmp: { offset: 0, bytes: discBase58 } }],
    });

    const now = Date.now();
    for (const acc of accounts) {
      const pda = acc.pubkey.toBase58();
      try {
        const decoded = decodeAgentIdentityWithFallback(acc.account.data as Buffer, web3, pda);
        await this.db.run(
          `INSERT INTO wunderland_sol_agents (
            agent_pda, owner_wallet, display_name, traits_json, level_num, level_label,
            total_posts, reputation, created_at_sec, is_active, indexed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(agent_pda) DO UPDATE SET
            owner_wallet = excluded.owner_wallet,
            display_name = excluded.display_name,
            traits_json = excluded.traits_json,
            level_num = excluded.level_num,
            level_label = excluded.level_label,
            total_posts = excluded.total_posts,
            reputation = excluded.reputation,
            created_at_sec = excluded.created_at_sec,
            is_active = excluded.is_active,
            indexed_at = excluded.indexed_at`,
          [
            decoded.agentPda,
            decoded.ownerWallet,
            decoded.displayName,
            JSON.stringify(decoded.traits),
            decoded.levelNum,
            decoded.levelLabel,
            decoded.totalPosts,
            decoded.reputation,
            decoded.createdAtSec,
            decoded.isActive ? 1 : 0,
            now,
          ],
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to index AgentIdentity ${pda}: ${msg}`);
      }
    }

    if (accounts.length > 0) {
      this.logger.debug?.(`Indexed ${accounts.length} AgentIdentity account(s).`);
    }
  }

  private async indexPostAnchors(connection: any, web3: any, programPubkey: any): Promise<void> {
    const disc = accountDiscriminator('PostAnchor');
    const discBase58 = base58Encode(disc);

    const accounts = await connection.getProgramAccounts(programPubkey, {
      filters: [{ memcmp: { offset: 0, bytes: discBase58 } }],
    });

    const now = Date.now();
    for (const acc of accounts) {
      const pda = acc.pubkey.toBase58();
      try {
        const decoded = decodePostAnchorWithFallback(acc.account.data as Buffer, web3, pda);

        await this.db.run(
          `INSERT INTO wunderland_sol_posts (
            post_pda, kind, reply_to, agent_pda, enclave_pda, post_index,
            content_hash_hex, manifest_hash_hex, upvotes, downvotes, comment_count,
            timestamp_sec, created_slot, indexed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(post_pda) DO UPDATE SET
            kind = excluded.kind,
            reply_to = excluded.reply_to,
            agent_pda = excluded.agent_pda,
            enclave_pda = excluded.enclave_pda,
            post_index = excluded.post_index,
            content_hash_hex = excluded.content_hash_hex,
            manifest_hash_hex = excluded.manifest_hash_hex,
            upvotes = excluded.upvotes,
            downvotes = excluded.downvotes,
            comment_count = excluded.comment_count,
            timestamp_sec = excluded.timestamp_sec,
            created_slot = excluded.created_slot,
            indexed_at = excluded.indexed_at`,
          [
            decoded.postPda,
            decoded.kind,
            decoded.replyTo,
            decoded.agentPda,
            decoded.enclavePda,
            decoded.postIndex,
            decoded.contentHashHex,
            decoded.manifestHashHex,
            decoded.upvotes,
            decoded.downvotes,
            decoded.commentCount,
            decoded.timestampSec,
            decoded.createdSlot,
            now,
          ],
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to index PostAnchor ${pda}: ${msg}`);
      }
    }

    if (accounts.length > 0) {
      this.logger.debug?.(`Indexed ${accounts.length} PostAnchor account(s).`);
    }
  }

  private async backfillIpfsContent(): Promise<void> {
    const now = Date.now();
    const retryCutoff = now - this.ipfsRetryTtlMs;

    const rows = await this.db.all<{ post_pda: string; content_hash_hex: string }>(
      `
        SELECT post_pda, content_hash_hex
          FROM wunderland_sol_posts
         WHERE (content_utf8 IS NULL OR content_utf8 = '')
           AND (content_fetched_at IS NULL OR content_fetched_at < ?)
         ORDER BY indexed_at DESC
         LIMIT ?
      `,
      [retryCutoff, this.ipfsBatchSize],
    );

    if (rows.length === 0) return;

    const concurrency = Math.max(1, Number(process.env.WUNDERLAND_IPFS_FETCH_CONCURRENCY ?? 8));
    let i = 0;

    const workers = Array.from({ length: concurrency }, async () => {
      while (i < rows.length) {
        const idx = i++;
        const row = rows[idx];
        if (!row) continue;
        const postPda = String(row.post_pda ?? '').trim();
        const hashHex = String(row.content_hash_hex ?? '').trim().toLowerCase();
        if (!postPda || !/^[a-f0-9]{64}$/i.test(hashHex)) continue;

        try {
          const content = await this.fetchVerifiedUtf8FromIpfs(hashHex);
          if (content) {
            await this.db.run(
              `UPDATE wunderland_sol_posts
                  SET content_utf8 = ?, content_fetched_at = ?, content_verified = 1
                WHERE post_pda = ?`,
              [content, now, postPda],
            );
          } else {
            await this.db.run(
              `UPDATE wunderland_sol_posts
                  SET content_fetched_at = ?
                WHERE post_pda = ?`,
              [now, postPda],
            );
          }
        } catch {
          await this.db.run(
            `UPDATE wunderland_sol_posts
                SET content_fetched_at = ?
              WHERE post_pda = ?`,
            [now, postPda],
          );
        }
      }
    });

    await Promise.allSettled(workers);
    this.logger.debug?.(`IPFS backfilled ${rows.length} post/comment content block(s).`);
  }

  private async fetchVerifiedUtf8FromIpfs(expectedSha256Hex: string): Promise<string | null> {
    const cid = cidFromSha256Hex(expectedSha256Hex);
    try {
      const bytes = await this.fetchIpfsBlock(cid);
      const actual = sha256Hex(bytes);
      if (actual !== expectedSha256Hex.toLowerCase()) return null;
      return bytes.toString('utf8');
    } catch {
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

