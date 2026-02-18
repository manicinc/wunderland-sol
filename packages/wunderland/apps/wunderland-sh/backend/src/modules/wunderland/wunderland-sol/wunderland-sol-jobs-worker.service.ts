/**
 * @file wunderland-sol-jobs-worker.service.ts
 * @description Background worker that indexes on-chain JobPosting, JobBid, and
 * JobSubmission accounts into the wunderland_job_postings / _bids / _submissions
 * tables. Polls via getProgramAccounts with discriminator filters.
 *
 * Env gates:
 *   WUNDERLAND_SOL_ENABLED=true
 *   WUNDERLAND_SOL_JOB_WORKER_ENABLED=true
 */

import { createHash } from 'node:crypto';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';

// ── Solana account status mappings ──────────────────────────────────────────

type JobStatus = 'open' | 'assigned' | 'submitted' | 'completed' | 'cancelled';
type JobBidStatus = 'active' | 'withdrawn' | 'accepted' | 'rejected';

function jobStatusFromU8(v: number): JobStatus {
  switch (v) {
    case 0: return 'open';
    case 1: return 'assigned';
    case 2: return 'submitted';
    case 3: return 'completed';
    case 4: return 'cancelled';
    default: return 'open';
  }
}

function bidStatusFromU8(v: number): JobBidStatus {
  switch (v) {
    case 0: return 'active';
    case 1: return 'withdrawn';
    case 2: return 'accepted';
    case 3: return 'rejected';
    default: return 'active';
  }
}

// ── Base58 encoding for discriminator filter ────────────────────────────────

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
  for (let k = 0; k < bytes.length && bytes[k] === 0 && k < bytes.length - 1; k += 1) {
    digits.push(0);
  }
  return digits.reverse().map((d) => BASE58_ALPHABET[d] ?? '').join('');
}

function accountDiscriminator(accountName: string): Buffer {
  return createHash('sha256').update(`account:${accountName}`).digest().subarray(0, 8);
}

// ── Decoded account types ───────────────────────────────────────────────────

type DecodedJobPosting = {
  jobPda: string;
  creator: string;
  jobNonce: bigint;
  metadataHashHex: string;
  budgetLamports: bigint;
  buyItNowLamports: bigint | null;
  status: JobStatus;
  assignedAgent: string;
  acceptedBid: string;
  createdAtSec: number;
  updatedAtSec: number;
};

type DecodedJobBid = {
  bidPda: string;
  jobPda: string;
  bidderAgent: string;
  bidLamports: bigint;
  messageHashHex: string;
  status: JobBidStatus;
  createdAtSec: number;
};

type DecodedJobSubmission = {
  submissionPda: string;
  jobPda: string;
  agent: string;
  submissionHashHex: string;
  createdAtSec: number;
};

// ── Account decoders ────────────────────────────────────────────────────────

function decodeJobPosting(data: Buffer, web3: any, jobPda: string): DecodedJobPosting {
  let offset = 8; // skip discriminator
  const creator = new web3.PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const jobNonce = data.readBigUInt64LE(offset);
  offset += 8;
  const metadataHash = data.subarray(offset, offset + 32);
  offset += 32;
  const budgetLamports = data.readBigUInt64LE(offset);
  offset += 8;
  const buyItNowTag = data.readUInt8(offset);
  offset += 1;
  const buyItNowLamports =
    buyItNowTag === 1 ? data.readBigUInt64LE(offset) : null;
  if (buyItNowTag === 1) offset += 8;
  const status = data.readUInt8(offset);
  offset += 1;
  const assignedAgent = new web3.PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const acceptedBid = new web3.PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const createdAt = Number(data.readBigInt64LE(offset));
  offset += 8;
  const updatedAt = Number(data.readBigInt64LE(offset));

  return {
    jobPda,
    creator: creator.toBase58(),
    jobNonce,
    metadataHashHex: Buffer.from(metadataHash).toString('hex'),
    budgetLamports,
    buyItNowLamports,
    status: jobStatusFromU8(status),
    assignedAgent: assignedAgent.toBase58(),
    acceptedBid: acceptedBid.toBase58(),
    createdAtSec: createdAt,
    updatedAtSec: updatedAt,
  };
}

function decodeJobBid(data: Buffer, web3: any, bidPda: string): DecodedJobBid {
  let offset = 8;
  const job = new web3.PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const bidderAgent = new web3.PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const bidLamports = data.readBigUInt64LE(offset);
  offset += 8;
  const messageHash = data.subarray(offset, offset + 32);
  offset += 32;
  const status = data.readUInt8(offset);
  offset += 1;
  const createdAt = Number(data.readBigInt64LE(offset));

  return {
    bidPda,
    jobPda: job.toBase58(),
    bidderAgent: bidderAgent.toBase58(),
    bidLamports,
    messageHashHex: Buffer.from(messageHash).toString('hex'),
    status: bidStatusFromU8(status),
    createdAtSec: createdAt,
  };
}

function decodeJobSubmission(data: Buffer, web3: any, submissionPda: string): DecodedJobSubmission {
  let offset = 8;
  const job = new web3.PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const agent = new web3.PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const submissionHash = data.subarray(offset, offset + 32);
  offset += 32;
  const createdAt = Number(data.readBigInt64LE(offset));

  return {
    submissionPda,
    jobPda: job.toBase58(),
    agent: agent.toBase58(),
    submissionHashHex: Buffer.from(submissionHash).toString('hex'),
    createdAtSec: createdAt,
  };
}

// ── Worker service ──────────────────────────────────────────────────────────

@Injectable()
export class WunderlandSolJobsWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WunderlandSolJobsWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private polling = false;

  private readonly enabled =
    process.env.WUNDERLAND_SOL_ENABLED === 'true' &&
    process.env.WUNDERLAND_SOL_JOB_WORKER_ENABLED === 'true';

  private readonly programId = process.env.WUNDERLAND_SOL_PROGRAM_ID ?? '';
  private readonly rpcUrl = process.env.WUNDERLAND_SOL_RPC_URL ?? '';
  private readonly cluster = process.env.WUNDERLAND_SOL_CLUSTER ?? '';

  private readonly pollIntervalMs = Math.max(
    5_000,
    Number(process.env.WUNDERLAND_SOL_JOB_WORKER_POLL_INTERVAL_MS ?? 30_000),
  );

  constructor(private readonly db: DatabaseService) {}

  onModuleInit(): void {
    if (!this.enabled) return;
    if (!this.programId) {
      this.logger.warn('Job worker enabled but missing WUNDERLAND_SOL_PROGRAM_ID.');
      return;
    }

    this.logger.log(`Starting job indexer worker (poll every ${this.pollIntervalMs}ms).`);
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

    try {
      const web3 = await import('@solana/web3.js');
      const connection = new web3.Connection(
        this.rpcUrl || web3.clusterApiUrl(this.cluster as any || 'devnet'),
        'confirmed',
      );
      const programPubkey = new web3.PublicKey(this.programId);

      // Index all three account types in parallel
      await Promise.all([
        this.indexJobPostings(connection, web3, programPubkey),
        this.indexJobBids(connection, web3, programPubkey),
        this.indexJobSubmissions(connection, web3, programPubkey),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Job indexer poll failed: ${msg}`);
    } finally {
      this.polling = false;
    }
  }

  private async indexJobPostings(connection: any, web3: any, programPubkey: any): Promise<void> {
    const disc = accountDiscriminator('JobPosting');
    const discBase58 = base58Encode(disc);

    const accounts = await connection.getProgramAccounts(programPubkey, {
      filters: [{ memcmp: { offset: 0, bytes: discBase58 } }],
    });

    const now = Date.now();
    for (const acc of accounts) {
      const pda = acc.pubkey.toBase58();
      try {
        const decoded = decodeJobPosting(acc.account.data as Buffer, web3, pda);

        await this.db.run(
          `INSERT INTO wunderland_job_postings (
            job_pda, creator_wallet, job_nonce, metadata_hash_hex,
            budget_lamports, buy_it_now_lamports, status, assigned_agent_pda, accepted_bid_pda,
            created_at, updated_at, sol_cluster, indexed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(job_pda) DO UPDATE SET
            buy_it_now_lamports = excluded.buy_it_now_lamports,
            status = excluded.status,
            assigned_agent_pda = excluded.assigned_agent_pda,
            accepted_bid_pda = excluded.accepted_bid_pda,
            updated_at = excluded.updated_at,
            indexed_at = excluded.indexed_at`,
          [
            pda,
            decoded.creator,
            decoded.jobNonce.toString(),
            decoded.metadataHashHex,
            decoded.budgetLamports.toString(),
            decoded.buyItNowLamports === null ? null : decoded.buyItNowLamports.toString(),
            decoded.status,
            decoded.assignedAgent,
            decoded.acceptedBid,
            decoded.createdAtSec,
            decoded.updatedAtSec,
            this.cluster || 'devnet',
            now,
          ],
        );

        // Freeze/retain confidential details once a bid has been accepted (status != open).
        if (decoded.status !== 'open') {
          await this.archiveConfidentialIfNeeded(pda, decoded.status);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to index JobPosting ${pda}: ${msg}`);
      }
    }

    if (accounts.length > 0) {
      this.logger.debug(`Indexed ${accounts.length} JobPosting accounts.`);
    }
  }

  private async indexJobBids(connection: any, web3: any, programPubkey: any): Promise<void> {
    const disc = accountDiscriminator('JobBid');
    const discBase58 = base58Encode(disc);

    const accounts = await connection.getProgramAccounts(programPubkey, {
      filters: [{ memcmp: { offset: 0, bytes: discBase58 } }],
    });

    const now = Date.now();
    for (const acc of accounts) {
      const pda = acc.pubkey.toBase58();
      try {
        const decoded = decodeJobBid(acc.account.data as Buffer, web3, pda);

        await this.db.run(
          `INSERT INTO wunderland_job_bids (
            bid_pda, job_pda, bidder_agent_pda, bid_lamports,
            message_hash_hex, status, created_at, indexed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(bid_pda) DO UPDATE SET
            status = excluded.status,
            indexed_at = excluded.indexed_at`,
          [
            pda,
            decoded.jobPda,
            decoded.bidderAgent,
            decoded.bidLamports.toString(),
            decoded.messageHashHex,
            decoded.status,
            decoded.createdAtSec,
            now,
          ],
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to index JobBid ${pda}: ${msg}`);
      }
    }

    if (accounts.length > 0) {
      this.logger.debug(`Indexed ${accounts.length} JobBid accounts.`);
    }
  }

  private async indexJobSubmissions(connection: any, web3: any, programPubkey: any): Promise<void> {
    const disc = accountDiscriminator('JobSubmission');
    const discBase58 = base58Encode(disc);

    const accounts = await connection.getProgramAccounts(programPubkey, {
      filters: [{ memcmp: { offset: 0, bytes: discBase58 } }],
    });

    const now = Date.now();
    for (const acc of accounts) {
      const pda = acc.pubkey.toBase58();
      try {
        const decoded = decodeJobSubmission(acc.account.data as Buffer, web3, pda);

        await this.db.run(
          `INSERT INTO wunderland_job_submissions (
            submission_pda, job_pda, agent_pda, submission_hash_hex,
            created_at, indexed_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(submission_pda) DO UPDATE SET
            indexed_at = excluded.indexed_at`,
          [
            pda,
            decoded.jobPda,
            decoded.agent,
            decoded.submissionHashHex,
            decoded.createdAtSec,
            now,
          ],
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to index JobSubmission ${pda}: ${msg}`);
      }
    }

    if (accounts.length > 0) {
      this.logger.debug(`Indexed ${accounts.length} JobSubmission accounts.`);
    }
  }

  private async archiveConfidentialIfNeeded(jobPda: string, status: JobStatus): Promise<void> {
    const now = Date.now();
    const reason = status === 'assigned' ? 'bid_accepted' : `job_status_${status}`;

    try {
      await this.db.transaction(async (trx) => {
        const row = await trx.get<{
          archived_at: number | null;
          creator_wallet: string;
          confidential_details: string;
          details_hash_hex: string;
          signature_b64: string;
        }>(
          `SELECT archived_at, creator_wallet, confidential_details, details_hash_hex, signature_b64
             FROM wunderland_job_confidential
            WHERE job_pda = ?
            LIMIT 1`,
          [jobPda],
        );

        if (!row || row.archived_at) return;

        const update = await trx.run(
          `UPDATE wunderland_job_confidential
              SET archived_at = ?, archived_reason = ?
            WHERE job_pda = ?
              AND archived_at IS NULL`,
          [now, reason, jobPda],
        );

        if (update.changes > 0) {
          await trx.run(
            `INSERT INTO wunderland_job_confidential_events
              (event_id, job_pda, event_type, creator_wallet, confidential_details, details_hash_hex, signature_b64, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              this.db.generateId(),
              jobPda,
              'archive',
              row.creator_wallet,
              row.confidential_details,
              row.details_hash_hex,
              row.signature_b64,
              now,
            ],
          );
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to archive confidential details for job ${jobPda}: ${msg}`);
    }
  }
}
