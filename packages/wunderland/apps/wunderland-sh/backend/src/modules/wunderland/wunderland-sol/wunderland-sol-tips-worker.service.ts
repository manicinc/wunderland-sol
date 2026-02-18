/**
 * @file wunderland-sol-tips-worker.service.ts
 * @description Background worker that ingests on-chain `TipAnchor` accounts into
 * Wunderland's stimulus/tips tables and settles/refunds tips.
 *
 * Design goals:
 * - Never refetch the original URL (snapshot-commit model).
 * - Fetch snapshot bytes by CID derived from on-chain `content_hash` and verify sha256.
 * - Idempotent: each tip PDA maps to a single stimulus event + tip record.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';

type TipStatus = 'pending' | 'settled' | 'refunded';
type TipSourceType = 'text' | 'url';
type TipPriority = 'low' | 'normal' | 'high' | 'breaking';

type DecodedTipAnchor = {
  tipPda: string;
  tipper: string;
  contentHashHex: string;
  amountLamports: bigint;
  priority: TipPriority;
  sourceType: TipSourceType;
  targetEnclave: string;
  tipNonce: bigint;
  createdAtSec: number;
  status: TipStatus;
};

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

  // Deal with leading zeros (preserve full length like bs58).
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

function tipPriorityFromU8(value: number): TipPriority {
  switch (value) {
    case 0:
      return 'low';
    case 1:
      return 'normal';
    case 2:
      return 'high';
    case 3:
      return 'breaking';
    default:
      return 'normal';
  }
}

function tipStatusFromU8(value: number): TipStatus {
  switch (value) {
    case 0:
      return 'pending';
    case 1:
      return 'settled';
    case 2:
      return 'refunded';
    default:
      return 'pending';
  }
}

function tipSourceTypeFromU8(value: number): TipSourceType {
  return value === 1 ? 'url' : 'text';
}

function decodeTipAnchorAccount(data: Buffer, web3: any, tipPda: string): DecodedTipAnchor {
  let offset = 8; // discriminator
  const tipper = new web3.PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const contentHash = data.subarray(offset, offset + 32);
  offset += 32;
  const amount = data.readBigUInt64LE(offset);
  offset += 8;
  const priority = data.readUInt8(offset);
  offset += 1;
  const sourceType = data.readUInt8(offset);
  offset += 1;
  const targetEnclave = new web3.PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const tipNonce = data.readBigUInt64LE(offset);
  offset += 8;
  const createdAt = data.readBigInt64LE(offset);
  offset += 8;
  const status = data.readUInt8(offset);

  return {
    tipPda,
    tipper: tipper.toBase58(),
    contentHashHex: Buffer.from(contentHash).toString('hex'),
    amountLamports: amount,
    priority: tipPriorityFromU8(priority),
    sourceType: tipSourceTypeFromU8(sourceType),
    targetEnclave: targetEnclave.toBase58(),
    tipNonce,
    createdAtSec: Number(createdAt),
    status: tipStatusFromU8(status),
  };
}

@Injectable()
export class WunderlandSolTipsWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WunderlandSolTipsWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly inFlight = new Set<string>();

  private readonly enabled =
    process.env.WUNDERLAND_SOL_ENABLED === 'true' &&
    process.env.WUNDERLAND_SOL_TIP_WORKER_ENABLED === 'true';

  private readonly programId = process.env.WUNDERLAND_SOL_PROGRAM_ID ?? '';
  private readonly rpcUrl = process.env.WUNDERLAND_SOL_RPC_URL ?? '';
  private readonly cluster = process.env.WUNDERLAND_SOL_CLUSTER ?? '';
  private readonly relayerKeypairPath = process.env.WUNDERLAND_SOL_RELAYER_KEYPAIR_PATH ?? '';
  private readonly authorityKeypairPath =
    process.env.WUNDERLAND_SOL_AUTHORITY_KEYPAIR_PATH ?? this.relayerKeypairPath;

  private readonly pollIntervalMs = Math.max(
    5_000,
    Number(process.env.WUNDERLAND_SOL_TIP_WORKER_POLL_INTERVAL_MS ?? 30_000)
  );

  private readonly ipfsApiUrl = process.env.WUNDERLAND_IPFS_API_URL ?? '';
  private readonly ipfsAuth = process.env.WUNDERLAND_IPFS_API_AUTH ?? '';
  private readonly ipfsGatewayUrl = process.env.WUNDERLAND_IPFS_GATEWAY_URL ?? 'https://ipfs.io';

  constructor(private readonly db: DatabaseService) {}

  onModuleInit(): void {
    if (!this.enabled) return;
    if (!this.programId) {
      this.logger.warn('Tip worker enabled but missing WUNDERLAND_SOL_PROGRAM_ID.');
      return;
    }
    if (!this.authorityKeypairPath) {
      this.logger.warn(
        'Tip worker enabled but missing WUNDERLAND_SOL_AUTHORITY_KEYPAIR_PATH (or relayer fallback).'
      );
      return;
    }
    if (!this.ipfsApiUrl && !this.ipfsGatewayUrl) {
      this.logger.warn(
        'Tip worker enabled but missing IPFS config (set WUNDERLAND_IPFS_API_URL or WUNDERLAND_IPFS_GATEWAY_URL).'
      );
      return;
    }

    this.logger.log(`Starting tip worker (poll every ${this.pollIntervalMs}ms).`);
    this.timer = setInterval(() => void this.pollOnce().catch(() => {}), this.pollIntervalMs);
    void this.pollOnce().catch(() => {});
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async pollOnce(): Promise<void> {
    const sdk = await import('@wunderland-sol/sdk');
    const web3 = await import('@solana/web3.js');

    const client = new sdk.WunderlandSolClient({
      programId: this.programId,
      rpcUrl: this.rpcUrl || undefined,
      cluster: (this.cluster as any) || undefined,
    });

    const discriminator = accountDiscriminator('TipAnchor');
    const discriminatorBase58 = base58Encode(discriminator);

    const accounts = await client.connection.getProgramAccounts(
      new web3.PublicKey(this.programId),
      {
        filters: [{ memcmp: { offset: 0, bytes: discriminatorBase58 } }],
      }
    );

    for (const acc of accounts) {
      const tipPda = acc.pubkey.toBase58();
      if (this.inFlight.has(tipPda)) continue;
      this.inFlight.add(tipPda);
      void this.processTipAccount({ sdk, web3, client, tipPda, data: acc.account.data as Buffer })
        .catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Tip processing failed for ${tipPda}: ${message}`);
        })
        .finally(() => {
          this.inFlight.delete(tipPda);
        });
    }
  }

  private loadKeypair(web3: any, keypairPath: string): any {
    const raw = JSON.parse(readFileSync(keypairPath, 'utf8')) as number[];
    if (!Array.isArray(raw) || raw.length < 32) {
      throw new Error(`Invalid keypair file: ${keypairPath}`);
    }
    return web3.Keypair.fromSecretKey(Uint8Array.from(raw));
  }

  private async processTipAccount(opts: {
    sdk: any;
    web3: any;
    client: any;
    tipPda: string;
    data: Buffer;
  }): Promise<void> {
    const decoded = decodeTipAnchorAccount(opts.data, opts.web3, opts.tipPda);
    if (decoded.status !== 'pending') return;

    const existing = await this.db.get<{ tip_id: string; status: string }>(
      'SELECT tip_id, status FROM wunderland_tips WHERE tip_id = ? LIMIT 1',
      [decoded.tipPda]
    );

    // If already settled/refunded locally, skip (on-chain may lag, but worker is idempotent).
    if (existing && (existing.status === 'settled' || existing.status === 'refunded')) {
      return;
    }

    const authority = this.loadKeypair(opts.web3, this.authorityKeypairPath);

    // If we've already delivered the stimulus locally, just try to settle again.
    if (existing && existing.status === 'delivered') {
      await this.trySettle({
        sdk: opts.sdk,
        web3: opts.web3,
        client: opts.client,
        authority,
        tip: decoded,
      });
      return;
    }

    // 1) Fetch snapshot bytes by CID derived from on-chain hash.
    const cid = cidFromSha256Hex(decoded.contentHashHex);
    const snapshotBytes = await this.fetchSnapshotBytes(cid);

    // 2) Verify hash matches on-chain commitment.
    const actualHashHex = sha256Hex(snapshotBytes);
    if (actualHashHex !== decoded.contentHashHex) {
      await this.tryRefund({
        sdk: opts.sdk,
        web3: opts.web3,
        client: opts.client,
        authority,
        tip: decoded,
        reason: 'Snapshot sha256 mismatch (bytes do not match on-chain commitment).',
      });
      return;
    }

    // 3) Parse snapshot JSON (v1).
    let snapshot: any;
    try {
      snapshot = JSON.parse(Buffer.from(snapshotBytes).toString('utf8')) as any;
    } catch {
      await this.tryRefund({
        sdk: opts.sdk,
        web3: opts.web3,
        client: opts.client,
        authority,
        tip: decoded,
        reason: 'Invalid tip snapshot JSON.',
      });
      return;
    }

    if (
      !snapshot ||
      snapshot.v !== 1 ||
      typeof snapshot.sourceType !== 'string' ||
      typeof snapshot.content !== 'string'
    ) {
      await this.tryRefund({
        sdk: opts.sdk,
        web3: opts.web3,
        client: opts.client,
        authority,
        tip: decoded,
        reason: 'Invalid tip snapshot shape.',
      });
      return;
    }
    if (snapshot.sourceType !== decoded.sourceType) {
      await this.tryRefund({
        sdk: opts.sdk,
        web3: opts.web3,
        client: opts.client,
        authority,
        tip: decoded,
        reason: 'Snapshot sourceType does not match on-chain tip source_type.',
      });
      return;
    }

    const now = Date.now();
    const createdAtMs = decoded.createdAtSec ? decoded.createdAtSec * 1000 : now;
    const amountNumber =
      decoded.amountLamports <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(decoded.amountLamports)
        : Number.MAX_SAFE_INTEGER;

    // 4) Upsert tip record locally (tip_id = tip PDA).
    if (!existing) {
      await this.db.run(
        `
          INSERT INTO wunderland_tips (
            tip_id,
            amount,
            data_source_type,
            data_source_payload,
            attribution_type,
            attribution_identifier,
            target_seed_ids,
            visibility,
            status,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'public', ?, ?)
        `,
        [
          decoded.tipPda,
          amountNumber,
          snapshot.sourceType,
          JSON.stringify({
            ...(snapshot.sourceType === 'url' ? { url: snapshot.url ?? null } : {}),
            content: String(snapshot.content).slice(0, 5000),
            contentHashHex: decoded.contentHashHex,
            cid,
            targetEnclave: decoded.targetEnclave,
            tipper: decoded.tipper,
            tipNonce: decoded.tipNonce.toString(),
          }),
          'wallet',
          decoded.tipper,
          'queued',
          createdAtMs,
        ]
      );
    }

    // 5) Insert stimulus event idempotently (event_id = tip PDA).
    const existingStimulus = await this.db.get<{ event_id: string }>(
      'SELECT event_id FROM wunderland_stimuli WHERE event_id = ? LIMIT 1',
      [decoded.tipPda]
    );
    if (!existingStimulus) {
      await this.db.run(
        `
          INSERT INTO wunderland_stimuli (
            event_id,
            type,
            priority,
            payload,
            source_provider_id,
            source_external_id,
            source_verified,
            target_seed_ids,
            created_at,
            processed_at
          ) VALUES (?, 'tip', ?, ?, 'sol_tip', ?, 1, NULL, ?, NULL)
        `,
        [
          decoded.tipPda,
          decoded.priority,
          JSON.stringify({
            type: 'tip',
            tipId: decoded.tipPda,
            content: String(snapshot.content).slice(0, 50_000),
            ...(snapshot.sourceType === 'url'
              ? { url: snapshot.url ?? null, contentType: snapshot.contentType ?? null }
              : {}),
            contentHashHex: decoded.contentHashHex,
            cid,
            tipper: decoded.tipper,
            targetEnclave:
              decoded.targetEnclave === SYSTEM_PROGRAM_ID ? null : decoded.targetEnclave,
          }),
          decoded.tipPda,
          createdAtMs,
        ]
      );
    }

    // Mark delivered locally, then settle on-chain.
    await this.db.run('UPDATE wunderland_tips SET status = ? WHERE tip_id = ?', [
      'delivered',
      decoded.tipPda,
    ]);
    await this.trySettle({
      sdk: opts.sdk,
      web3: opts.web3,
      client: opts.client,
      authority,
      tip: decoded,
    });
  }

  private async trySettle(opts: {
    sdk: any;
    web3: any;
    client: any;
    authority: any;
    tip: DecodedTipAnchor;
  }): Promise<void> {
    try {
      if (opts.tip.targetEnclave === SYSTEM_PROGRAM_ID) {
        const sig = await opts.client.settleTip({
          authority: opts.authority,
          tipPda: new opts.web3.PublicKey(opts.tip.tipPda),
        });
        await this.updateTipRecord(opts.tip.tipPda, { settleSignature: sig }, 'settled');
        return;
      }

      const enclavePda = new opts.web3.PublicKey(opts.tip.targetEnclave);

      const enclaveInfo = await opts.client.connection.getAccountInfo(enclavePda);
      if (!enclaveInfo) throw new Error(`Enclave not found: ${opts.tip.targetEnclave}`);

      // Ensure the enclave treasury exists (older enclaves may predate this PDA).
      const [enclaveTreasuryPda] = opts.client.getEnclaveTreasuryPDA(enclavePda);
      const treasuryInfo = await opts.client.connection.getAccountInfo(enclaveTreasuryPda);
      if (!treasuryInfo) {
        await opts.client.initializeEnclaveTreasury({
          enclavePda,
          payer: opts.authority,
        });
      }

      const sig = await opts.client.settleTip({
        authority: opts.authority,
        tipPda: new opts.web3.PublicKey(opts.tip.tipPda),
        enclavePda,
      });
      await this.updateTipRecord(opts.tip.tipPda, { settleSignature: sig }, 'settled');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.updateTipRecord(opts.tip.tipPda, { settleError: message });
    }
  }

  private async updateTipRecord(
    tipId: string,
    patch: Record<string, unknown>,
    status?: string
  ): Promise<void> {
    const row = await this.db.get<{ data_source_payload: string }>(
      'SELECT data_source_payload FROM wunderland_tips WHERE tip_id = ? LIMIT 1',
      [tipId]
    );
    let current: Record<string, unknown> = {};
    if (row?.data_source_payload) {
      try {
        current = (JSON.parse(row.data_source_payload) as Record<string, unknown>) ?? {};
      } catch {
        current = {};
      }
    }

    const next = { ...current, ...patch };
    if (status) {
      await this.db.run(
        'UPDATE wunderland_tips SET status = ?, data_source_payload = ? WHERE tip_id = ?',
        [status, JSON.stringify(next), tipId]
      );
      return;
    }

    await this.db.run('UPDATE wunderland_tips SET data_source_payload = ? WHERE tip_id = ?', [
      JSON.stringify(next),
      tipId,
    ]);
  }

  private async tryRefund(opts: {
    sdk: any;
    web3: any;
    client: any;
    authority: any;
    tip: DecodedTipAnchor;
    reason: string;
  }): Promise<void> {
    try {
      const sig = await opts.client.refundTip({
        authority: opts.authority,
        tipPda: new opts.web3.PublicKey(opts.tip.tipPda),
        tipper: new opts.web3.PublicKey(opts.tip.tipper),
      });
      await this.db.run(
        `
          INSERT INTO wunderland_tips (
            tip_id,
            amount,
            data_source_type,
            data_source_payload,
            attribution_type,
            attribution_identifier,
            target_seed_ids,
            visibility,
            status,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'public', ?, ?)
          ON CONFLICT(tip_id) DO UPDATE SET status = excluded.status, data_source_payload = excluded.data_source_payload
        `,
        [
          opts.tip.tipPda,
          0,
          'text',
          JSON.stringify({
            content: '',
            refundReason: opts.reason,
            refundSignature: sig,
            contentHashHex: opts.tip.contentHashHex,
            cid: cidFromSha256Hex(opts.tip.contentHashHex),
            tipper: opts.tip.tipper,
            tipNonce: opts.tip.tipNonce.toString(),
          }),
          'wallet',
          opts.tip.tipper,
          'refunded',
          Date.now(),
        ]
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Refund failed for ${opts.tip.tipPda}: ${message}`);
    }
  }

  private async fetchSnapshotBytes(cid: string): Promise<Uint8Array> {
    const authHeader: Record<string, string> = {};
    if (this.ipfsAuth) authHeader.Authorization = this.ipfsAuth;

    // Prefer IPFS HTTP API block/get (raw bytes).
    if (this.ipfsApiUrl) {
      try {
        const endpoint = this.ipfsApiUrl.replace(/\/+$/, '');
        const url = `${endpoint}/api/v0/block/get?arg=${encodeURIComponent(cid)}`;
        const res = await fetch(url, { method: 'POST', headers: authHeader });
        if (res.ok) {
          return new Uint8Array(await res.arrayBuffer());
        }
      } catch {
        // fall back to gateway below
      }
    }

    // Fallback: HTTP gateway.
    const gateway = (this.ipfsGatewayUrl || 'https://ipfs.io').replace(/\/+$/, '');
    const gatewayUrl = `${gateway}/ipfs/${cid}`;
    const res = await fetch(gatewayUrl, { method: 'GET' });
    if (!res.ok) {
      throw new Error(`IPFS gateway fetch failed: ${res.status} ${res.statusText}`);
    }
    return new Uint8Array(await res.arrayBuffer());
  }
}
