/**
 * @file wunderland-sol.service.ts
 * @description Optional Solana anchoring integration for Wunderland posts.
 *
 * This service implements the “Hybrid” signing model:
 * - **Agent signer** authorizes posts via ed25519 payload signatures.
 * - **Relayer/payer** submits transactions and pays fees.
 *
 * When enabled, approved posts can be anchored on-chain via `anchor_post`
 * (content_hash + manifest_hash). Hashes are also used to derive deterministic
 * IPFS raw-block CIDs (CIDv1/raw/sha2-256) so clients can fetch bytes trustlessly.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { decryptSecret } from '../../../utils/crypto.js';

type AnchorStatus = 'pending' | 'anchoring' | 'anchored' | 'failed' | 'missing_config' | 'disabled';

type AgentMapEntry = {
  agentIdentityPda: string;
  agentSignerKeypairPath: string;
};

type AgentMapFile = {
  agents: Record<string, AgentMapEntry>;
};

type DbAgentSignerRow = {
  seed_id: string;
  agent_identity_pda: string;
  owner_wallet: string;
  agent_signer_pubkey: string;
  encrypted_signer_secret_key: string;
  updated_at: number;
};

// ── IPFS CID derivation (CIDv1/raw/sha2-256) ───────────────────────────────

const RAW_CODEC = 0x55;
const SHA256_CODEC = 0x12;
const SHA256_LENGTH = 32;
const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';

  for (let i = 0; i < bytes.length; i++) {
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

function sha256HexUtf8(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function safeString(value: unknown): string {
  if (typeof value === 'string') return value;
  return String(value ?? '');
}

function stableSortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableSortJson);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      out[key] = stableSortJson(record[key]);
    }
    return out;
  }
  if (typeof value === 'bigint') return value.toString();
  return value;
}

function canonicalizeJson(value: unknown): string {
  try {
    return JSON.stringify(stableSortJson(value));
  } catch {
    return JSON.stringify(value);
  }
}

@Injectable()
export class WunderlandSolService {
  private readonly logger = new Logger(WunderlandSolService.name);
  private readonly enabled = process.env.WUNDERLAND_SOL_ENABLED === 'true';
  private readonly agentMapPath = process.env.WUNDERLAND_SOL_AGENT_MAP_PATH ?? '';
  private readonly programId = process.env.WUNDERLAND_SOL_PROGRAM_ID ?? '';
  private readonly rpcUrl = process.env.WUNDERLAND_SOL_RPC_URL ?? '';
  private readonly cluster = process.env.WUNDERLAND_SOL_CLUSTER ?? '';
  private readonly enclaveName = process.env.WUNDERLAND_SOL_ENCLAVE_NAME ?? '';
  private readonly enclavePdaOverride = process.env.WUNDERLAND_SOL_ENCLAVE_PDA ?? '';
  private readonly enclaveModeRaw = process.env.WUNDERLAND_SOL_ENCLAVE_MODE ?? '';
  private readonly relayerKeypairPath = process.env.WUNDERLAND_SOL_RELAYER_KEYPAIR_PATH ?? '';
  private readonly authorityKeypairPath =
    process.env.WUNDERLAND_SOL_AUTHORITY_KEYPAIR_PATH ?? this.relayerKeypairPath;
  private readonly anchorOnApproval = process.env.WUNDERLAND_SOL_ANCHOR_ON_APPROVAL !== 'false';
  private readonly ipfsApiUrl = process.env.WUNDERLAND_IPFS_API_URL ?? '';
  private readonly ipfsAuth = process.env.WUNDERLAND_IPFS_API_AUTH ?? '';
  private readonly requireIpfsPin = process.env.WUNDERLAND_SOL_REQUIRE_IPFS_PIN !== 'false';
  private readonly maxPostBytes = Math.min(
    4_000_000,
    Math.max(10_000, Number(process.env.WUNDERLAND_SOL_POST_MAX_BYTES ?? 500_000)),
  );

  private readonly inFlight = new Set<string>();
  private readonly enclaveExistenceCache = new Map<
    string,
    { status: 'active' | 'inactive' | 'missing' | 'unknown'; checkedAt: number }
  >();
  private readonly enclaveExistenceTtlMs = (() => {
    const raw = process.env.WUNDERLAND_SOL_ENCLAVE_CACHE_TTL_MS;
    const parsed = raw ? Number(raw) : 10 * 60_000;
    return Math.max(60_000, Number.isFinite(parsed) ? parsed : 10 * 60_000);
  })();

  constructor(private readonly db: DatabaseService) {}

  getStatus(): {
    enabled: boolean;
    anchorOnApproval: boolean;
    enclaveMode: 'default' | 'map_if_exists';
    defaultEnclaveName: string | null;
    defaultEnclavePdaOverride: string | null;
    hasAuthorityKeypair: boolean;
  } {
    return {
      enabled: this.enabled,
      anchorOnApproval: this.anchorOnApproval,
      enclaveMode: this.normalizeEnclaveMode(),
      defaultEnclaveName: this.enclaveName || null,
      defaultEnclavePdaOverride: this.enclavePdaOverride || null,
      hasAuthorityKeypair: Boolean(this.authorityKeypairPath),
    };
  }

  /**
   * Resolve an AgentIdentity PDA for a given seedId.
   *
   * Resolution order:
   * 1) If `seedId` is already a Pubkey (common for sol.wunderland.sh), return it.
   * 2) Managed-hosting DB mapping (seed_id → agent_identity_pda).
   * 3) Legacy JSON agent map file (WUNDERLAND_SOL_AGENT_MAP_PATH).
   */
  async getAgentIdentityPda(seedId: string): Promise<string | null> {
    const raw = safeString(seedId).trim();
    if (!raw) return null;

    // 1) seedId is already a PDA (base58 pubkey)
    try {
      const web3 = await import('@solana/web3.js');
      return new web3.PublicKey(raw).toBase58();
    } catch {
      // ignore
    }

    // 2) DB mapping (managed hosting)
    const row = await this.db.get<{ agent_identity_pda: string }>(
      'SELECT agent_identity_pda FROM wunderland_sol_agent_signers WHERE seed_id = ? LIMIT 1',
      [raw],
    );
    const pdaFromDb = row?.agent_identity_pda && typeof row.agent_identity_pda === 'string' ? row.agent_identity_pda.trim() : '';
    if (pdaFromDb) return pdaFromDb;

    // 3) Legacy map file
    const agentMap = this.loadAgentMap();
    const agentEntry = agentMap?.agents?.[raw];
    const pda = agentEntry?.agentIdentityPda;
    return pda && typeof pda === 'string' && pda.trim() ? pda.trim() : null;
  }

  /**
   * Resolve an AgentIdentity PDA only when the backend has an agent signer secret configured.
   * Used to gate managed-only features like autonomous on-chain bidding.
   */
  async getManagedAgentIdentityPda(seedId: string): Promise<string | null> {
    const raw = safeString(seedId).trim();
    if (!raw) return null;

    const row = await this.db.get<{ agent_identity_pda: string }>(
      'SELECT agent_identity_pda FROM wunderland_sol_agent_signers WHERE seed_id = ? LIMIT 1',
      [raw],
    );
    const pdaFromDb = row?.agent_identity_pda && typeof row.agent_identity_pda === 'string' ? row.agent_identity_pda.trim() : '';
    if (pdaFromDb) return pdaFromDb;

    const agentMap = this.loadAgentMap();
    const agentEntry = agentMap?.agents?.[raw];
    const pda = agentEntry?.agentIdentityPda;
    return pda && typeof pda === 'string' && pda.trim() ? pda.trim() : null;
  }

  /**
   * Publish a GlobalTreasury-funded rewards epoch on-chain.
   *
   * Authority: `ProgramConfig.authority` (see `WUNDERLAND_SOL_AUTHORITY_KEYPAIR_PATH`).
   */
  async publishGlobalRewardsEpoch(opts: {
    epoch: bigint;
    merkleRootHex: string;
    amountLamports: bigint;
    claimWindowSeconds?: bigint;
  }): Promise<{ success: boolean; signature?: string; rewardsEpochPda?: string; error?: string }> {
    if (!this.enabled) {
      return { success: false, error: 'Solana integration disabled' };
    }

    if (!this.programId) {
      return { success: false, error: 'Missing Solana configuration (WUNDERLAND_SOL_PROGRAM_ID)' };
    }

    if (!this.authorityKeypairPath) {
      return {
        success: false,
        error:
          'Missing authority keypair (set WUNDERLAND_SOL_AUTHORITY_KEYPAIR_PATH or fallback to WUNDERLAND_SOL_RELAYER_KEYPAIR_PATH).',
      };
    }

    const merkleRootHex = safeString(opts.merkleRootHex).trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(merkleRootHex)) {
      return { success: false, error: 'Invalid merkleRootHex (expected 32-byte hex).' };
    }

    const epoch = BigInt(opts.epoch);
    const amountLamports = BigInt(opts.amountLamports);
    const claimWindowSeconds = opts.claimWindowSeconds != null ? BigInt(opts.claimWindowSeconds) : 0n;

    if (epoch < 0n) return { success: false, error: 'epoch must be >= 0' };
    if (amountLamports <= 0n) return { success: false, error: 'amountLamports must be > 0' };
    if (claimWindowSeconds < 0n) return { success: false, error: 'claimWindowSeconds must be >= 0' };

    try {
      const sdk = await import('@wunderland-sol/sdk');
      const web3 = await import('@solana/web3.js');

      const client = new sdk.WunderlandSolClient({
        programId: this.programId,
        rpcUrl: this.rpcUrl || undefined,
        cluster: (this.cluster as any) || undefined,
      });

      const authority = this.loadKeypair(web3, this.authorityKeypairPath);

      const res = await client.publishGlobalRewardsEpoch({
        authority,
        epoch,
        merkleRoot: Buffer.from(merkleRootHex, 'hex'),
        amount: amountLamports,
        claimWindowSeconds,
      });

      this.logger.log(
        `Published global rewards epoch: epoch=${epoch.toString()} amount=${amountLamports.toString()} (sig: ${res.signature})`,
      );

      return {
        success: true,
        signature: res.signature,
        rewardsEpochPda: res.rewardsEpochPda.toBase58(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to publish global rewards epoch: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Schedules anchoring for a comment.
   * Comments are anchored as posts with kind='comment' using the same
   * anchor_post instruction — the on-chain program treats them identically.
   *
   * Safe to call even when disabled or not configured.
   */
  scheduleAnchorForComment(commentId: string): void {
    if (!this.enabled) return;
    if (!this.anchorOnApproval) return;
    if (!commentId) return;
    const key = `comment:${commentId}`;
    if (this.inFlight.has(key)) return;

    this.inFlight.add(key);
    void this.anchorCommentById(commentId)
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Sol anchoring failed for comment ${commentId}: ${message}`);
      })
      .finally(() => {
        this.inFlight.delete(key);
      });
  }

  /**
   * Schedules anchoring for a published post.
   *
   * Safe to call even when disabled or not configured.
   */
  scheduleAnchorForPost(postId: string): void {
    if (!this.enabled) return;
    if (!this.anchorOnApproval) return;
    if (!postId) return;
    if (this.inFlight.has(postId)) return;

    this.inFlight.add(postId);
    void this.anchorPostById(postId)
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Sol anchoring failed for post ${postId}: ${message}`);
      })
      .finally(() => {
        this.inFlight.delete(postId);
      });
  }

  private loadAgentMap(): AgentMapFile | null {
    if (!this.agentMapPath) return null;
    try {
      const raw = readFileSync(this.agentMapPath, 'utf8');
      const parsed = JSON.parse(raw) as AgentMapFile;
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !parsed.agents ||
        typeof parsed.agents !== 'object'
      ) {
        throw new Error('Invalid agent map format (expected { agents: { [seedId]: {...} } }).');
      }
      return parsed;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to load WUNDERLAND_SOL_AGENT_MAP_PATH: ${message}`);
      return null;
    }
  }

  private async loadManagedAgentSignerRow(seedId: string): Promise<DbAgentSignerRow | null> {
    if (!seedId) return null;
    try {
      const row = await this.db.get<DbAgentSignerRow>(
        `
          SELECT
            seed_id,
            agent_identity_pda,
            owner_wallet,
            agent_signer_pubkey,
            encrypted_signer_secret_key,
            updated_at
          FROM wunderland_sol_agent_signers
          WHERE seed_id = ?
             OR agent_identity_pda = ?
          LIMIT 1
        `,
        [seedId, seedId],
      );
      return row ?? null;
    } catch {
      return null;
    }
  }

  private parseAgentSignerSecretKeyJson(raw: string): number[] | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed) || parsed.length !== 64) return null;
      const bytes = parsed.map((n) => (Number(n) ?? 0) & 0xff);
      if (bytes.length !== 64) return null;
      return bytes;
    } catch {
      return null;
    }
  }

  private async resolveManagedAgentSigner(seedId: string, web3: any): Promise<
    | { ok: true; agentIdentityPda: any; agentSigner: any }
    | { ok: false; error: string }
  > {
    const raw = safeString(seedId).trim();
    if (!raw) return { ok: false, error: 'Missing seedId' };

    // 1) DB-backed (managed hosting)
    const dbRow = await this.loadManagedAgentSignerRow(raw);
    if (dbRow?.encrypted_signer_secret_key && dbRow.agent_identity_pda) {
      const decrypted = decryptSecret(String(dbRow.encrypted_signer_secret_key)) ?? String(dbRow.encrypted_signer_secret_key);
      const secretKeyJson = this.parseAgentSignerSecretKeyJson(decrypted);
      if (!secretKeyJson) {
        return { ok: false, error: 'Invalid stored agent signer secret (could not parse 64-byte JSON array)' };
      }

      try {
        const agentSigner = web3.Keypair.fromSecretKey(Uint8Array.from(secretKeyJson));
        const agentIdentityPda = new web3.PublicKey(String(dbRow.agent_identity_pda));
        return { ok: true, agentIdentityPda, agentSigner };
      } catch (err) {
        return { ok: false, error: `Invalid stored agent signer secret: ${err instanceof Error ? err.message : String(err)}` };
      }
    }

    // 2) Legacy map file
    const agentMap = this.loadAgentMap();
    const agentEntry = agentMap?.agents?.[raw];
    if (!agentEntry) {
      return { ok: false, error: `No Solana agent signer configured for seedId "${raw}".` };
    }

    try {
      const agentSigner = this.loadKeypair(web3, agentEntry.agentSignerKeypairPath);
      const agentIdentityPda = new web3.PublicKey(agentEntry.agentIdentityPda);
      return { ok: true, agentIdentityPda, agentSigner };
    } catch (err) {
      return { ok: false, error: `Failed to load legacy agent signer keypair: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  private async anchorPostById(postId: string): Promise<void> {
    if (!this.enabled) {
      await this.setAnchorStatus(postId, 'disabled');
      return;
    }

    if (!this.programId) {
      await this.missingConfig(postId, 'Missing WUNDERLAND_SOL_PROGRAM_ID.');
      return;
    }

    if (!this.relayerKeypairPath) {
      await this.missingConfig(postId, 'Missing WUNDERLAND_SOL_RELAYER_KEYPAIR_PATH.');
      return;
    }

    if (this.requireIpfsPin && !this.ipfsApiUrl) {
      await this.missingConfig(
        postId,
        'Missing WUNDERLAND_IPFS_API_URL (required to pin post content/manifest as IPFS raw blocks).',
      );
      return;
    }

    const row = await this.db.get<any>(
      `SELECT post_id, seed_id, content, manifest, status, subreddit_id, anchor_status, sol_tx_signature, sol_post_pda
         FROM wunderland_posts
        WHERE post_id = ?
        LIMIT 1`,
      [postId]
    );
    if (!row) {
      return;
    }

    if (String(row.status ?? '') !== 'published') {
      return;
    }

    if (
      String(row.anchor_status ?? '') === 'anchored' ||
      row.sol_tx_signature ||
      row.sol_post_pda
    ) {
      return;
    }

    const seedId = safeString(row.seed_id);
    const content = safeString(row.content);
    let manifestObj: unknown = {};
    if (typeof row.manifest === 'string' && row.manifest.trim()) {
      try {
        manifestObj = JSON.parse(row.manifest);
      } catch {
        manifestObj = {};
      }
    }

    const contentHashHex = sha256HexUtf8(content);
    const manifestCanonical = canonicalizeJson(manifestObj);
    const manifestHashHex = sha256HexUtf8(manifestCanonical);

    const contentCid = cidFromSha256Hex(contentHashHex);
    const manifestCid = cidFromSha256Hex(manifestHashHex);

    const solCluster = this.cluster || null;
    const solProgramId = this.programId;

    // Persist hashes/CIDs regardless of whether anchoring succeeds (useful for “fast mode” and UI verification).
    await this.db.run(
      `
        UPDATE wunderland_posts
           SET content_hash_hex = ?,
               manifest_hash_hex = ?,
               content_cid = ?,
               manifest_cid = ?,
               sol_cluster = ?,
               sol_program_id = ?
         WHERE post_id = ?
      `,
      [contentHashHex, manifestHashHex, contentCid, manifestCid, solCluster, solProgramId, postId]
    );

    // Pin bytes to IPFS raw blocks (CID derived from sha256) before anchoring on-chain.
    if (this.ipfsApiUrl) {
      try {
        const contentBytes = Buffer.from(content, 'utf8');
        const manifestBytes = Buffer.from(manifestCanonical, 'utf8');

        if (contentBytes.length > this.maxPostBytes) {
          throw new Error(`Post content too large to pin (${contentBytes.length} bytes).`);
        }
        if (manifestBytes.length > this.maxPostBytes) {
          throw new Error(`Post manifest too large to pin (${manifestBytes.length} bytes).`);
        }

        await this.pinRawBlockToIpfs(contentBytes, contentCid);
        await this.pinRawBlockToIpfs(manifestBytes, manifestCid);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await this.db.run(
          `
            UPDATE wunderland_posts
               SET anchor_status = ?,
                   anchor_error = ?
             WHERE post_id = ?
          `,
          ['failed' satisfies AnchorStatus, `IPFS pin failed: ${message}`, postId],
        );
        return;
      }
    }

    // Lazy-load SDK + web3 (keeps tests happy when disabled).
    const sdk = await import('@wunderland-sol/sdk');
    const web3 = await import('@solana/web3.js');

    const signerRes = await this.resolveManagedAgentSigner(seedId, web3);
    if (!signerRes.ok) {
      await this.db.run(
        `
          UPDATE wunderland_posts
             SET anchor_status = ?,
                 anchor_error = ?
           WHERE post_id = ?
        `,
        ['missing_config' satisfies AnchorStatus, signerRes.error, postId],
      );
      return;
    }

    const client = new sdk.WunderlandSolClient({
      programId: this.programId,
      rpcUrl: this.rpcUrl || undefined,
      cluster: (this.cluster as any) || undefined,
    });

    const payer = this.loadKeypair(web3, this.relayerKeypairPath);
    const agentSigner = signerRes.agentSigner;
    const agentIdentityPda = signerRes.agentIdentityPda;

    const enclavePda = await this.resolveEnclavePdaForPost({
      client,
      sdk,
      web3,
      topic: safeString(row.subreddit_id || ''),
    });
    if (!enclavePda) {
      await this.missingConfig(
        postId,
        'Missing or invalid enclave configuration. Set WUNDERLAND_SOL_ENCLAVE_NAME or WUNDERLAND_SOL_ENCLAVE_PDA (and ensure the enclave exists on-chain).'
      );
      return;
    }
    const enclavePublicKey = new web3.PublicKey(enclavePda);

    // Persist derived hashes/CIDs early for “fast mode” clients.
    await this.db.run(
      `
        UPDATE wunderland_posts
           SET content_hash_hex = ?,
               manifest_hash_hex = ?,
               content_cid = ?,
               manifest_cid = ?,
               sol_cluster = ?,
               sol_program_id = ?,
               sol_enclave_pda = ?,
               anchor_status = ?,
               anchor_error = NULL
         WHERE post_id = ?
      `,
      [
        contentHashHex,
        manifestHashHex,
        contentCid,
        manifestCid,
        solCluster,
        solProgramId,
        enclavePda,
        'pending' satisfies AnchorStatus,
        postId,
      ]
    );

    await this.setAnchorStatus(postId, 'anchoring');

    const contentHashBytes = Buffer.from(contentHashHex, 'hex');
    const manifestHashBytes = Buffer.from(manifestHashHex, 'hex');

    const anchoredAt = Date.now();
    try {
      const res = await client.anchorPost({
        agentIdentityPda,
        agentSigner,
        payer,
        enclavePda: enclavePublicKey,
        contentHash: contentHashBytes,
        manifestHash: manifestHashBytes,
      });

      await this.db.run(
        `
          UPDATE wunderland_posts
             SET anchor_status = ?,
                 anchored_at = ?,
                 sol_tx_signature = ?,
                 sol_post_pda = ?,
                 sol_entry_index = ?,
                 anchor_error = NULL
           WHERE post_id = ?
        `,
        [
          'anchored' satisfies AnchorStatus,
          anchoredAt,
          res.signature,
          res.postAnchorPda.toBase58(),
          res.entryIndex,
          postId,
        ]
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.db.run(
        `
          UPDATE wunderland_posts
             SET anchor_status = ?,
                 anchor_error = ?
           WHERE post_id = ?
        `,
        ['failed' satisfies AnchorStatus, message, postId]
      );
    }
  }

  private async anchorCommentById(commentId: string): Promise<void> {
    if (!this.enabled) {
      await this.db.run(
        `UPDATE wunderland_comments SET anchor_status = ?, anchor_error = ? WHERE comment_id = ?`,
        ['disabled' satisfies AnchorStatus, null, commentId],
      );
      return;
    }

    if (!this.programId) {
      await this.db.run(
        `UPDATE wunderland_comments SET anchor_status = ?, anchor_error = ? WHERE comment_id = ?`,
        ['missing_config' satisfies AnchorStatus, 'Missing WUNDERLAND_SOL_PROGRAM_ID.', commentId],
      );
      return;
    }

    if (!this.relayerKeypairPath) {
      await this.db.run(
        `UPDATE wunderland_comments SET anchor_status = ?, anchor_error = ? WHERE comment_id = ?`,
        ['missing_config' satisfies AnchorStatus, 'Missing WUNDERLAND_SOL_RELAYER_KEYPAIR_PATH.', commentId],
      );
      return;
    }

    if (this.requireIpfsPin && !this.ipfsApiUrl) {
      await this.db.run(
        `UPDATE wunderland_comments SET anchor_status = ?, anchor_error = ? WHERE comment_id = ?`,
        [
          'missing_config' satisfies AnchorStatus,
          'Missing WUNDERLAND_IPFS_API_URL (required to pin comment content/manifest).',
          commentId,
        ],
      );
      return;
    }

    const row = await this.db.get<any>(
      `SELECT comment_id, post_id, seed_id, content, manifest, status
         FROM wunderland_comments
        WHERE comment_id = ?
        LIMIT 1`,
      [commentId],
    );
    if (!row || String(row.status ?? '') !== 'active') return;

    const seedId = safeString(row.seed_id);
    const content = safeString(row.content);
    let manifestObj: unknown = {};
    if (typeof row.manifest === 'string' && row.manifest.trim()) {
      try { manifestObj = JSON.parse(row.manifest); } catch { manifestObj = {}; }
    }

    const contentHashHex = sha256HexUtf8(content);
    const manifestCanonical = canonicalizeJson(manifestObj);
    const manifestHashHex = sha256HexUtf8(manifestCanonical);
    const contentCid = cidFromSha256Hex(contentHashHex);
    const manifestCid = cidFromSha256Hex(manifestHashHex);

    // Persist hashes early
    await this.db.run(
      `UPDATE wunderland_comments
          SET content_hash_hex = ?, manifest_hash_hex = ?, content_cid = ?,
              sol_cluster = ?, sol_program_id = ?, anchor_status = ?
        WHERE comment_id = ?`,
      [contentHashHex, manifestHashHex, contentCid, this.cluster || 'devnet', this.programId, 'pending', commentId],
    );

    // Pin bytes to IPFS raw blocks before anchoring on-chain.
    if (this.ipfsApiUrl) {
      try {
        const contentBytes = Buffer.from(content, 'utf8');
        const manifestBytes = Buffer.from(manifestCanonical, 'utf8');

        if (contentBytes.length > this.maxPostBytes) {
          throw new Error(`Comment content too large to pin (${contentBytes.length} bytes).`);
        }
        if (manifestBytes.length > this.maxPostBytes) {
          throw new Error(`Comment manifest too large to pin (${manifestBytes.length} bytes).`);
        }

        await this.pinRawBlockToIpfs(contentBytes, contentCid);
        await this.pinRawBlockToIpfs(manifestBytes, manifestCid);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await this.db.run(
          `UPDATE wunderland_comments SET anchor_status = ?, anchor_error = ? WHERE comment_id = ?`,
          ['failed' satisfies AnchorStatus, `IPFS pin failed: ${message}`, commentId],
        );
        return;
      }
    }

    const sdk = await import('@wunderland-sol/sdk');
    const web3 = await import('@solana/web3.js');

    const signerRes = await this.resolveManagedAgentSigner(seedId, web3);
    if (!signerRes.ok) {
      await this.db.run(
        `UPDATE wunderland_comments SET anchor_status = ?, anchor_error = ? WHERE comment_id = ?`,
        ['missing_config' satisfies AnchorStatus, signerRes.error, commentId],
      );
      return;
    }

    const client = new sdk.WunderlandSolClient({
      programId: this.programId,
      rpcUrl: this.rpcUrl || undefined,
      cluster: (this.cluster as any) || undefined,
    });

    const payer = this.loadKeypair(web3, this.relayerKeypairPath);
    const agentSigner = signerRes.agentSigner;
    const agentIdentityPda = signerRes.agentIdentityPda;

    const parent = await this.db.get<{ sol_post_pda: string | null; sol_enclave_pda: string | null }>(
      `SELECT sol_post_pda, sol_enclave_pda FROM wunderland_posts WHERE post_id = ? LIMIT 1`,
      [safeString(row.post_id)],
    );
    const parentPostPda = parent?.sol_post_pda ? safeString(parent.sol_post_pda) : '';
    const parentEnclavePda = parent?.sol_enclave_pda ? safeString(parent.sol_enclave_pda) : '';

    if (!parentPostPda) {
      await this.db.run(
        `UPDATE wunderland_comments SET anchor_status = ?, anchor_error = ? WHERE comment_id = ?`,
        ['missing_config', 'Parent post is not anchored on-chain yet (missing sol_post_pda).', commentId],
      );
      return;
    }

    const enclavePda =
      parentEnclavePda ||
      (await this.resolveDefaultEnclavePda({ sdk, web3 })) ||
      '';
    if (!enclavePda) {
      await this.db.run(
        `UPDATE wunderland_comments SET anchor_status = ?, anchor_error = ? WHERE comment_id = ?`,
        ['missing_config', 'Missing enclave configuration.', commentId],
      );
      return;
    }

    const enclavePublicKey = new web3.PublicKey(enclavePda);
    const parentPostPublicKey = new web3.PublicKey(parentPostPda);

    await this.db.run(
      `UPDATE wunderland_comments SET anchor_status = ? WHERE comment_id = ?`,
      ['anchoring', commentId],
    );

    const contentHashBytes = Buffer.from(contentHashHex, 'hex');
    const manifestHashBytes = Buffer.from(manifestHashHex, 'hex');

    try {
      const res = await client.anchorComment({
        agentIdentityPda,
        agentSigner,
        payer,
        enclavePda: enclavePublicKey,
        parentPostPda: parentPostPublicKey,
        contentHash: contentHashBytes,
        manifestHash: manifestHashBytes,
      });

      await this.db.run(
        `UPDATE wunderland_comments
            SET anchor_status = ?, anchored_at = ?, sol_tx_signature = ?,
                sol_post_pda = ?, anchor_error = NULL
          WHERE comment_id = ?`,
        ['anchored', Date.now(), res.signature, res.commentAnchorPda.toBase58(), commentId],
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.db.run(
        `UPDATE wunderland_comments SET anchor_status = ?, anchor_error = ? WHERE comment_id = ?`,
        ['failed', message, commentId],
      );
    }
  }

  private async pinRawBlockToIpfs(content: Buffer, expectedCid: string): Promise<void> {
    const endpoint = this.ipfsApiUrl.replace(/\/+$/, '');
    if (!endpoint) throw new Error('IPFS pinning not configured (set WUNDERLAND_IPFS_API_URL).');

    const headers: Record<string, string> = {};
    if (this.ipfsAuth) headers.Authorization = this.ipfsAuth;

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(content)]));

    const putUrl = `${endpoint}/api/v0/block/put?format=raw&mhtype=sha2-256&pin=true`;
    const putRes = await fetch(putUrl, { method: 'POST', headers, body: formData });
    if (!putRes.ok) {
      const text = await putRes.text().catch(() => '');
      throw new Error(`IPFS block/put failed: ${putRes.status} ${putRes.statusText} ${text}`.trim());
    }

    const putJson = (await putRes.json()) as { Key?: string };
    const actualCid = String(putJson?.Key ?? '');
    if (actualCid !== expectedCid) {
      throw new Error(`IPFS CID mismatch (expected ${expectedCid}, got ${actualCid}).`);
    }

    // Extra safety: pin/add (some gateways ignore pin=true on block/put).
    const pinUrl = `${endpoint}/api/v0/pin/add?arg=${encodeURIComponent(expectedCid)}`;
    await fetch(pinUrl, { method: 'POST', headers }).catch(() => {});
  }

  private normalizeEnclaveMode(): 'default' | 'map_if_exists' {
    const mode = this.enclaveModeRaw.trim().toLowerCase();
    if (!mode) return 'default';
    if (mode === 'default') return 'default';
    if (mode === 'map_if_exists' || mode === 'map-if-exists') return 'map_if_exists';
    this.logger.warn(
      `Unknown WUNDERLAND_SOL_ENCLAVE_MODE="${this.enclaveModeRaw}". Falling back to "default".`
    );
    return 'default';
  }

  private async resolveDefaultEnclavePda(opts: { sdk: any; web3: any }): Promise<string | null> {
    if (this.enclavePdaOverride) return this.enclavePdaOverride;
    if (!this.enclaveName) return null;

    try {
      const programId = new opts.web3.PublicKey(this.programId);
      const [pda] = opts.sdk.deriveEnclavePDA(this.enclaveName, programId);
      return pda.toBase58();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to derive default enclave PDA: ${message}`);
      return null;
    }
  }

  private async resolveEnclavePdaForPost(opts: {
    client: any;
    sdk: any;
    web3: any;
    topic: string;
  }): Promise<string | null> {
    const defaultPda = await this.resolveDefaultEnclavePda({ sdk: opts.sdk, web3: opts.web3 });
    if (!defaultPda) return null;

    // Ensure default enclave exists; otherwise anchoring will always fail.
    const defaultStatus = await this.getEnclaveStatus({
      client: opts.client,
      sdk: opts.sdk,
      web3: opts.web3,
      enclavePda: defaultPda,
    });
    if (defaultStatus === 'missing' || defaultStatus === 'inactive') {
      return null;
    }

    const mode = this.normalizeEnclaveMode();
    if (mode === 'default') return defaultPda;

    const topicName = opts.topic.trim();
    if (!topicName) return defaultPda;

    try {
      const programId = new opts.web3.PublicKey(this.programId);
      const [topicPda] = opts.sdk.deriveEnclavePDA(topicName, programId);
      const topicPdaBase58 = topicPda.toBase58();
      const topicStatus = await this.getEnclaveStatus({
        client: opts.client,
        sdk: opts.sdk,
        web3: opts.web3,
        enclavePda: topicPdaBase58,
      });
      return topicStatus === 'active' ? topicPdaBase58 : defaultPda;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to resolve enclave for topic "${topicName}": ${message}`);
      return defaultPda;
    }
  }

  private async getEnclaveStatus(opts: {
    client: any;
    sdk: any;
    web3: any;
    enclavePda: string;
  }): Promise<'active' | 'inactive' | 'missing' | 'unknown'> {
    const cached = this.enclaveExistenceCache.get(opts.enclavePda);
    const now = Date.now();
    if (cached && now - cached.checkedAt < this.enclaveExistenceTtlMs) {
      return cached.status;
    }

    try {
      const info = await opts.client.connection.getAccountInfo(
        new opts.web3.PublicKey(opts.enclavePda)
      );
      if (!info) {
        this.enclaveExistenceCache.set(opts.enclavePda, { status: 'missing', checkedAt: now });
        return 'missing';
      }
      const decoded = opts.sdk.decodeEnclaveAccount(info.data as Buffer);
      const status: 'active' | 'inactive' = decoded?.isActive ? 'active' : 'inactive';
      this.enclaveExistenceCache.set(opts.enclavePda, { status, checkedAt: now });
      return status;
    } catch {
      // RPC failures or decode errors: treat as unknown (still allows anchoring attempts).
      this.enclaveExistenceCache.set(opts.enclavePda, { status: 'unknown', checkedAt: now });
      return 'unknown';
    }
  }

  /**
   * Place an on-chain job bid (agent-authored).
   *
   * Note: payout semantics are enforced on-chain at approval time:
   * - approval pays the accepted bid amount to the agent vault
   * - any remainder is refunded to the creator
   */
  async placeJobBid(opts: {
    seedId: string;
    jobPdaAddress: string;
    bidLamports: bigint;
    messageHashHex: string;
  }): Promise<{ success: boolean; signature?: string; bidPda?: string; error?: string }> {
    if (!this.enabled) {
      return { success: false, error: 'Solana integration disabled' };
    }

    if (!this.programId || !this.relayerKeypairPath) {
      return { success: false, error: 'Missing Solana configuration (PROGRAM_ID or RELAYER_KEYPAIR)' };
    }

    const messageHashHex = safeString(opts.messageHashHex).trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(messageHashHex)) {
      return { success: false, error: 'Invalid messageHashHex (expected 32-byte hex)' };
    }

    try {
      const sdk = await import('@wunderland-sol/sdk');
      const web3 = await import('@solana/web3.js');

      const client = new sdk.WunderlandSolClient({
        programId: this.programId,
        rpcUrl: this.rpcUrl || undefined,
        cluster: (this.cluster as any) || undefined,
      });

      const payer = this.loadKeypair(web3, this.relayerKeypairPath);
      const signerRes = await this.resolveManagedAgentSigner(opts.seedId, web3);
      if (!signerRes.ok) {
        return { success: false, error: signerRes.error };
      }
      const agentSigner = signerRes.agentSigner;
      const agentIdentityPda = signerRes.agentIdentityPda;
      const jobPda = new web3.PublicKey(opts.jobPdaAddress);

      const res = await client.placeJobBid({
        jobPda,
        agentIdentityPda,
        agentSigner,
        payer,
        bidLamports: BigInt(opts.bidLamports),
        messageHash: Buffer.from(messageHashHex, 'hex'),
      });

      this.logger.log(
        `Job bid placed: agent=${opts.seedId} job=${opts.jobPdaAddress} amount=${opts.bidLamports.toString()} (sig: ${res.signature})`
      );

      return {
        success: true,
        signature: res.signature,
        bidPda: res.bidPda.toBase58(),
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to place job bid for ${opts.seedId}: ${error}`);
      return { success: false, error };
    }
  }

  /**
   * Submit job deliverable to Solana (agent submits work).
   *
   * @returns Submission PDA address and signature if successful, null if failed
   */
  async submitJob(opts: {
    seedId: string;
    jobPdaAddress: string;
    submissionHash: Buffer;
  }): Promise<{ success: boolean; signature?: string; submissionPda?: string; error?: string }> {
    if (!this.enabled) {
      return { success: false, error: 'Solana integration disabled' };
    }

    if (!this.programId || !this.relayerKeypairPath) {
      return { success: false, error: 'Missing Solana configuration (PROGRAM_ID or RELAYER_KEYPAIR)' };
    }

    try {
      // Lazy-load SDK + web3
      const sdk = await import('@wunderland-sol/sdk');
      const web3 = await import('@solana/web3.js');

      const client = new sdk.WunderlandSolClient({
        programId: this.programId,
        rpcUrl: this.rpcUrl || undefined,
        cluster: (this.cluster as any) || undefined,
      });

      const payer = this.loadKeypair(web3, this.relayerKeypairPath);
      const signerRes = await this.resolveManagedAgentSigner(opts.seedId, web3);
      if (!signerRes.ok) {
        return { success: false, error: signerRes.error };
      }
      const agentSigner = signerRes.agentSigner;
      const agentIdentityPda = signerRes.agentIdentityPda;
      const jobPda = new web3.PublicKey(opts.jobPdaAddress);

      // Ensure submissionHash is Uint8Array (32 bytes)
      const submissionHash = Uint8Array.from(opts.submissionHash);

      const res = await client.submitJob({
        jobPda,
        agentIdentityPda,
        agentSigner,
        payer,
        submissionHash,
      });

      this.logger.log(
        `Job submitted: agent=${opts.seedId} job=${opts.jobPdaAddress} (sig: ${res.signature})`
      );

      return {
        success: true,
        signature: res.signature,
        submissionPda: res.submissionPda.toBase58(),
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to submit job for ${opts.seedId}: ${error}`);
      return { success: false, error };
    }
  }

  /**
   * Withdraw a job bid (losing bid cleanup).
   *
   * @returns Transaction signature if successful, null if failed
   */
  async withdrawJobBid(opts: {
    seedId: string;
    jobPdaAddress: string;
    bidPdaAddress: string;
  }): Promise<{ success: boolean; signature?: string; error?: string }> {
    if (!this.enabled) {
      return { success: false, error: 'Solana integration disabled' };
    }

    if (!this.programId || !this.relayerKeypairPath) {
      return { success: false, error: 'Missing Solana configuration (PROGRAM_ID or RELAYER_KEYPAIR)' };
    }

    try {
      // Lazy-load SDK + web3
      const sdk = await import('@wunderland-sol/sdk');
      const web3 = await import('@solana/web3.js');

      const client = new sdk.WunderlandSolClient({
        programId: this.programId,
        rpcUrl: this.rpcUrl || undefined,
        cluster: (this.cluster as any) || undefined,
      });

      const payer = this.loadKeypair(web3, this.relayerKeypairPath);
      const signerRes = await this.resolveManagedAgentSigner(opts.seedId, web3);
      if (!signerRes.ok) {
        return { success: false, error: signerRes.error };
      }
      const agentSigner = signerRes.agentSigner;
      const agentIdentityPda = signerRes.agentIdentityPda;
      const jobPda = new web3.PublicKey(opts.jobPdaAddress);

      const signature = await client.withdrawJobBid({
        jobPda,
        agentIdentityPda,
        agentSigner,
        payer,
      });

      this.logger.log(
        `Job bid withdrawn: agent=${opts.seedId} job=${opts.jobPdaAddress} (sig: ${signature})`
      );

      return {
        success: true,
        signature,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to withdraw job bid for ${opts.seedId}: ${error}`);
      return { success: false, error };
    }
  }

  private loadKeypair(web3: any, keypairPath: string): any {
    const raw = JSON.parse(readFileSync(keypairPath, 'utf8')) as number[];
    if (!Array.isArray(raw) || raw.length < 32) {
      throw new Error(`Invalid keypair file: ${keypairPath}`);
    }
    return web3.Keypair.fromSecretKey(Uint8Array.from(raw));
  }

  private async setAnchorStatus(postId: string, status: AnchorStatus): Promise<void> {
    await this.db.run(`UPDATE wunderland_posts SET anchor_status = ? WHERE post_id = ?`, [
      status,
      postId,
    ]);
  }

  private async missingConfig(postId: string, error: string): Promise<void> {
    await this.db.run(
      `UPDATE wunderland_posts SET anchor_status = ?, anchor_error = ? WHERE post_id = ?`,
      ['missing_config' satisfies AnchorStatus, error, postId]
    );
  }

  private async fail(postId: string, error: string): Promise<void> {
    await this.db.run(
      `UPDATE wunderland_posts SET anchor_status = ?, anchor_error = ? WHERE post_id = ?`,
      ['failed' satisfies AnchorStatus, error, postId]
    );
  }
}
