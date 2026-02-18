/**
 * @file jobs.service.ts
 * @description Service layer for querying indexed on-chain job postings,
 * bids, and submissions from the local DB.
 */

import { Injectable } from '@nestjs/common';
import { createHash, createPublicKey, verify as cryptoVerify } from 'node:crypto';
import { DatabaseService } from '../../../database/database.service.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { decodeJobPostingAccount } from '@wunderland-sol/sdk';
import { encryptSecret } from '../../../utils/crypto.js';

type StoreConfidentialDetailsSignedParams = {
  jobPda: string;
  creatorWallet: string;
  signatureB64: string;
  confidentialDetails: string;
};

type UpdateJobMetadataSignedParams = {
  jobPda: string;
  creatorWallet: string;
  signatureB64: string;
  metadataJson: string;
};

const STORE_CONFIDENTIAL_INTENT = 'wunderland_store_confidential_details';
const UPDATE_METADATA_INTENT = 'wunderland_update_job_metadata';

function sha256HexUtf8(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function buildStoreConfidentialMessage(jobPda: string, detailsHashHex: string): string {
  return JSON.stringify({
    v: 1,
    intent: STORE_CONFIDENTIAL_INTENT,
    jobPda,
    detailsHash: detailsHashHex,
  });
}

function buildUpdateJobMetadataMessage(jobPda: string, metadataHashHex: string): string {
  return JSON.stringify({
    v: 1,
    intent: UPDATE_METADATA_INTENT,
    jobPda,
    metadataHash: metadataHashHex,
  });
}

function solanaPublicKeyToSpkiDer(pubkeyBytes: Uint8Array): Buffer {
  return Buffer.concat([
    Buffer.from('302a300506032b6570032100', 'hex'),
    Buffer.from(pubkeyBytes),
  ]);
}

function verifyWalletSignatureBase64(opts: {
  wallet: string;
  message: string;
  signatureB64: string;
}): boolean {
  const walletKey = new PublicKey(opts.wallet);
  const keyDer = solanaPublicKeyToSpkiDer(walletKey.toBytes());
  const keyObject = createPublicKey({ key: keyDer, format: 'der', type: 'spki' });
  const signature = Buffer.from(opts.signatureB64, 'base64');
  const messageBytes = Buffer.from(opts.message, 'utf8');
  return cryptoVerify(null, messageBytes, keyObject, signature);
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

function canonicalizeJsonString(maybeJson: string): string {
  try {
    const parsed = JSON.parse(maybeJson) as unknown;
    return JSON.stringify(stableSortJson(parsed));
  } catch {
    return maybeJson;
  }
}

export type JobPostingRow = {
  job_pda: string;
  creator_wallet: string;
  job_nonce: string;
  metadata_hash_hex: string;
  budget_lamports: string;
  buy_it_now_lamports: string | null;
  status: string;
  assigned_agent_pda: string | null;
  accepted_bid_pda: string | null;
  created_at: number;
  updated_at: number;
  sol_cluster: string | null;
  metadata_json: string | null;
  title: string | null;
  description: string | null;
  indexed_at: number;
};

export type JobBidRow = {
  bid_pda: string;
  job_pda: string;
  bidder_agent_pda: string;
  bid_lamports: string;
  message_hash_hex: string;
  status: string;
  created_at: number;
  indexed_at: number;
};

export type JobSubmissionRow = {
  submission_pda: string;
  job_pda: string;
  agent_pda: string;
  submission_hash_hex: string;
  created_at: number;
  indexed_at: number;
};

export type ScannerJob = {
  id: string;
  title: string;
  description: string;
  budgetLamports: number;
  buyItNowLamports?: number;
  category: string;
  deadline: string;
  creatorWallet: string;
  bidsCount: number;
  status: 'open' | 'assigned' | 'submitted' | 'completed' | 'cancelled';
};

@Injectable()
export class JobsService {
  constructor(private readonly db: DatabaseService) {}

  async updateJobMetadataSigned(
    body: UpdateJobMetadataSignedParams,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const jobPda = new PublicKey(body.jobPda).toBase58();
      const creatorWallet = new PublicKey(body.creatorWallet).toBase58();

      const signatureB64 = typeof body.signatureB64 === 'string' ? body.signatureB64.trim() : '';
      if (!signatureB64) {
        return { success: false, error: 'Missing signatureB64' };
      }

      const metadataJson = typeof body.metadataJson === 'string' ? body.metadataJson.trim() : '';
      if (!metadataJson) {
        return { success: false, error: 'Missing metadataJson' };
      }
      if (metadataJson.length > 25_000) {
        return { success: false, error: 'metadataJson too long' };
      }

      const canonicalMetadataJson = canonicalizeJsonString(metadataJson);
      let parsed: any = null;
      try {
        parsed = JSON.parse(canonicalMetadataJson);
      } catch {
        return { success: false, error: 'metadataJson must be valid JSON' };
      }

      const title = typeof parsed?.title === 'string' ? parsed.title.trim() : '';
      const description = typeof parsed?.description === 'string' ? parsed.description.trim() : '';
      if (!title || !description) {
        return {
          success: false,
          error: 'metadataJson must include non-empty "title" and "description"',
        };
      }

      const metadataHashHex = sha256HexUtf8(canonicalMetadataJson);
      const message = buildUpdateJobMetadataMessage(jobPda, metadataHashHex);

      let signatureOk = false;
      try {
        signatureOk = verifyWalletSignatureBase64({
          wallet: creatorWallet,
          message,
          signatureB64,
        });
      } catch {
        signatureOk = false;
      }

      if (!signatureOk) {
        return { success: false, error: 'Invalid wallet signature' };
      }

      const local = await this.db.get<{
        creator_wallet: string;
        status: string;
        metadata_hash_hex: string;
      }>(
        'SELECT creator_wallet, status, metadata_hash_hex FROM wunderland_job_postings WHERE job_pda = ? LIMIT 1',
        [jobPda],
      );

      // Best-effort on-chain validation (required if the job is not indexed yet).
      const onChain = await this.fetchJobPostingOnChain(jobPda);

      if (local) {
        if (local.creator_wallet !== creatorWallet) {
          return { success: false, error: 'Creator wallet does not match indexed job' };
        }
        if (local.status !== 'open') {
          return {
            success: false,
            error: `Job is "${local.status}". Job metadata is frozen after bid acceptance.`,
          };
        }
        if (local.metadata_hash_hex !== metadataHashHex) {
          return { success: false, error: 'metadataJson hash does not match indexed metadata hash' };
        }
      }

      if (onChain.ok) {
        if (onChain.creatorWallet !== creatorWallet) {
          return { success: false, error: 'Creator wallet does not match on-chain job' };
        }

        if (onChain.status !== 'open') {
          return {
            success: false,
            error: `Job is "${onChain.status}". Job metadata is frozen after bid acceptance.`,
          };
        }

        if (onChain.metadataHashHex !== metadataHashHex) {
          return { success: false, error: 'metadataJson hash does not match on-chain metadata hash' };
        }
      } else if (!local) {
        return {
          success: false,
          error: onChain.error ?? 'On-chain verification failed',
        };
      }

      const now = Date.now();
      const eventId = this.db.generateId();

      await this.db.transaction(async (trx) => {
        await trx.run(
          `INSERT INTO wunderland_job_metadata_events
            (event_id, job_pda, event_type, creator_wallet, metadata_json, metadata_hash_hex, signature_b64, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            eventId,
            jobPda,
            'upsert',
            creatorWallet,
            canonicalMetadataJson,
            metadataHashHex,
            signatureB64,
            now,
          ],
        );

        if (onChain.ok) {
        await trx.run(
          `INSERT INTO wunderland_job_postings (
              job_pda,
              creator_wallet,
              job_nonce,
              metadata_hash_hex,
              budget_lamports,
              buy_it_now_lamports,
              status,
              assigned_agent_pda,
              accepted_bid_pda,
              created_at,
              updated_at,
              sol_cluster,
              metadata_json,
              title,
              description,
              indexed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(job_pda) DO UPDATE SET
              metadata_json = excluded.metadata_json,
              title = excluded.title,
              description = excluded.description,
              buy_it_now_lamports = excluded.buy_it_now_lamports,
              status = excluded.status,
              assigned_agent_pda = excluded.assigned_agent_pda,
              accepted_bid_pda = excluded.accepted_bid_pda,
              updated_at = excluded.updated_at,
              indexed_at = excluded.indexed_at`,
            [
              jobPda,
              creatorWallet,
              onChain.jobNonce,
              onChain.metadataHashHex,
              onChain.budgetLamports,
              onChain.buyItNowLamports,
              onChain.status,
              onChain.assignedAgentPda,
              onChain.acceptedBidPda,
              onChain.createdAtSec,
              onChain.updatedAtSec,
              onChain.cluster,
              canonicalMetadataJson,
              title,
              description,
              now,
            ],
          );
        } else {
          await trx.run(
            `UPDATE wunderland_job_postings
                SET metadata_json = ?,
                    title = ?,
                    description = ?,
                    indexed_at = ?
              WHERE job_pda = ?`,
            [canonicalMetadataJson, title, description, now, jobPda],
          );
        }
      });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async storeConfidentialDetailsSigned(
    body: StoreConfidentialDetailsSignedParams,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const jobPda = new PublicKey(body.jobPda).toBase58();
      const creatorWallet = new PublicKey(body.creatorWallet).toBase58();

      const confidentialDetails = typeof body.confidentialDetails === 'string'
        ? body.confidentialDetails.trim()
        : '';
      if (!confidentialDetails) {
        return { success: false, error: 'Missing confidentialDetails' };
      }
      if (confidentialDetails.length > 10_000) {
        return { success: false, error: 'confidentialDetails too long' };
      }

      const signatureB64 = typeof body.signatureB64 === 'string' ? body.signatureB64.trim() : '';
      if (!signatureB64) {
        return { success: false, error: 'Missing signatureB64' };
      }

      const detailsHashHex = sha256HexUtf8(confidentialDetails);
      const message = buildStoreConfidentialMessage(jobPda, detailsHashHex);

      let signatureOk = false;
      try {
        signatureOk = verifyWalletSignatureBase64({
          wallet: creatorWallet,
          message,
          signatureB64,
        });
      } catch {
        signatureOk = false;
      }

      if (!signatureOk) {
        return { success: false, error: 'Invalid wallet signature' };
      }

      const creatorOk = await this.verifyJobCreatorAndEditable({
        jobPda,
        creatorWallet,
      });
      if (!creatorOk.ok) {
        return { success: false, error: creatorOk.error ?? 'Creator verification failed' };
      }

      const now = Date.now();
      const storedDetails = encryptSecret(confidentialDetails) ?? confidentialDetails;
      const seal = await this.db.get<{ archived_at: number | null }>(
        'SELECT archived_at FROM wunderland_job_confidential WHERE job_pda = ? LIMIT 1',
        [jobPda],
      );
      if (seal?.archived_at) {
        return { success: false, error: 'Confidential details are sealed for audit; edits are frozen after bid acceptance.' };
      }

      const eventId = this.db.generateId();
      await this.db.transaction(async (trx) => {
        await trx.run(
          `INSERT INTO wunderland_job_confidential_events
            (event_id, job_pda, event_type, creator_wallet, confidential_details, details_hash_hex, signature_b64, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [eventId, jobPda, 'upsert', creatorWallet, storedDetails, detailsHashHex, signatureB64, now],
        );

        await trx.run(
          `INSERT INTO wunderland_job_confidential
            (job_pda, creator_wallet, confidential_details, details_hash_hex, signature_b64, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(job_pda) DO UPDATE SET
             creator_wallet = excluded.creator_wallet,
             confidential_details = excluded.confidential_details,
             details_hash_hex = excluded.details_hash_hex,
             signature_b64 = excluded.signature_b64,
             updated_at = excluded.updated_at`,
          [jobPda, creatorWallet, storedDetails, detailsHashHex, signatureB64, now, now],
        );
      });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async listJobs(opts: {
    status?: string;
    creator?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: JobPostingRow[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (opts.status) {
      conditions.push('status = ?');
      params.push(opts.status);
    }
    if (opts.creator) {
      conditions.push('creator_wallet = ?');
      params.push(opts.creator);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(opts.limit ?? 20, 100);
    const offset = opts.offset ?? 0;

    const countRow = await this.db.get<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM wunderland_job_postings ${where}`,
      params,
    );
    const total = countRow?.cnt ?? 0;

    const jobs = await this.db.all<JobPostingRow>(
      `SELECT * FROM wunderland_job_postings ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return { jobs, total };
  }

  /**
   * List jobs in the shape expected by `packages/wunderland`'s JobScanner.
   */
  async listJobsForScanner(opts: {
    status?: 'open' | 'assigned' | 'submitted' | 'completed' | 'cancelled';
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: ScannerJob[]; total: number }> {
    const status = opts.status ?? 'open';
    const limit = Math.min(opts.limit ?? 50, 100);
    const offset = opts.offset ?? 0;

    const countRow = await this.db.get<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM wunderland_job_postings WHERE status = ?`,
      [status],
    );
    const total = countRow?.cnt ?? 0;

    const rows = await this.db.all<{
      job_pda: string;
      creator_wallet: string;
      status: string;
      budget_lamports: string;
      buy_it_now_lamports: string | null;
      title: string | null;
      description: string | null;
      metadata_json: string | null;
      bids_count: number;
    }>(
      `
        SELECT
          p.job_pda,
          p.creator_wallet,
          p.status,
          p.budget_lamports,
          p.buy_it_now_lamports,
          p.title,
          p.description,
          p.metadata_json,
          (SELECT COUNT(*) FROM wunderland_job_bids b WHERE b.job_pda = p.job_pda) as bids_count
        FROM wunderland_job_postings p
        WHERE p.status = ?
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `,
      [status, limit, offset],
    );

    const jobs: ScannerJob[] = rows.map((row) => {
      const metadata = row.metadata_json ? (tryParseJson(row.metadata_json) as any) : null;
      const categoryRaw = metadata && typeof metadata.category === 'string' ? metadata.category : '';
      const deadlineRaw = metadata && typeof metadata.deadline === 'string' ? metadata.deadline : '';

      return {
        id: row.job_pda,
        title: row.title ?? (metadata && typeof metadata.title === 'string' ? metadata.title : 'Untitled job'),
        description:
          row.description ?? (metadata && typeof metadata.description === 'string' ? metadata.description : ''),
        budgetLamports: Number(row.budget_lamports),
        buyItNowLamports: row.buy_it_now_lamports ? Number(row.buy_it_now_lamports) : undefined,
        category: String(categoryRaw || 'other'),
        deadline: String(deadlineRaw || ''),
        creatorWallet: row.creator_wallet,
        bidsCount: Number(row.bids_count ?? 0),
        status: status,
      };
    });

    return { jobs, total };
  }

  async getJob(jobPda: string): Promise<JobPostingRow | undefined> {
    return this.db.get<JobPostingRow>(
      'SELECT * FROM wunderland_job_postings WHERE job_pda = ? LIMIT 1',
      [jobPda],
    );
  }

  async getJobBids(jobPda: string): Promise<JobBidRow[]> {
    return this.db.all<JobBidRow>(
      'SELECT * FROM wunderland_job_bids WHERE job_pda = ? ORDER BY created_at DESC',
      [jobPda],
    );
  }

  async getJobSubmissions(jobPda: string): Promise<JobSubmissionRow[]> {
    return this.db.all<JobSubmissionRow>(
      'SELECT * FROM wunderland_job_submissions WHERE job_pda = ? ORDER BY created_at DESC',
      [jobPda],
    );
  }

  async updateJobMetadata(
    jobPda: string,
    metadata: { title?: string; description?: string; metadataJson?: string },
  ): Promise<void> {
    const sets: string[] = [];
    const params: any[] = [];

    if (metadata.title !== undefined) {
      sets.push('title = ?');
      params.push(metadata.title);
    }
    if (metadata.description !== undefined) {
      sets.push('description = ?');
      params.push(metadata.description);
    }
    if (metadata.metadataJson !== undefined) {
      sets.push('metadata_json = ?');
      params.push(metadata.metadataJson);
    }

    if (sets.length === 0) return;
    params.push(jobPda);

    await this.db.run(
      `UPDATE wunderland_job_postings SET ${sets.join(', ')} WHERE job_pda = ?`,
      params,
    );
  }

  private async verifyJobCreator(opts: {
    jobPda: string;
    creatorWallet: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const local = await this.db.get<{ creator_wallet: string }>(
      'SELECT creator_wallet FROM wunderland_job_postings WHERE job_pda = ? LIMIT 1',
      [opts.jobPda],
    );
    if (local) {
      return local.creator_wallet === opts.creatorWallet
        ? { ok: true }
        : { ok: false, error: 'Creator wallet does not match indexed job' };
    }

    const rpcUrl = process.env.WUNDERLAND_SOL_RPC_URL ?? '';
    const programId = process.env.WUNDERLAND_SOL_PROGRAM_ID ?? '';
    if (!rpcUrl || !programId) {
      return { ok: false, error: 'Job not indexed yet and Solana RPC not configured' };
    }

    try {
      const connection = new Connection(rpcUrl, 'confirmed');
      const accountInfo = await connection.getAccountInfo(new PublicKey(opts.jobPda), 'confirmed');
      if (!accountInfo) {
        return { ok: false, error: 'Job account not found on-chain' };
      }
      if (accountInfo.owner.toBase58() !== programId) {
        return { ok: false, error: 'Job account owner mismatch' };
      }
      const expectedDisc = createHash('sha256')
        .update('account:JobPosting')
        .digest()
        .subarray(0, 8);
      const data = Buffer.from(accountInfo.data);
      if (data.length < 8 || !data.subarray(0, 8).equals(expectedDisc)) {
        return { ok: false, error: 'Account is not a JobPosting' };
      }
      const decoded = decodeJobPostingAccount(data);
      const onChainCreator = decoded.creator.toBase58();
      return onChainCreator === opts.creatorWallet
        ? { ok: true }
        : { ok: false, error: 'Creator wallet does not match on-chain job' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `On-chain verification failed: ${message}` };
    }
  }

  private async verifyJobCreatorAndEditable(opts: {
    jobPda: string;
    creatorWallet: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const local = await this.db.get<{ creator_wallet: string; status: string }>(
      'SELECT creator_wallet, status FROM wunderland_job_postings WHERE job_pda = ? LIMIT 1',
      [opts.jobPda],
    );
    if (local) {
      if (local.creator_wallet !== opts.creatorWallet) {
        return { ok: false, error: 'Creator wallet does not match indexed job' };
      }
      if (local.status !== 'open') {
        return {
          ok: false,
          error: `Job is "${local.status}". Confidential details are sealed after bid acceptance.`,
        };
      }
      // Still perform on-chain status verification when possible to avoid stale index races.
    }

    const rpcUrl = process.env.WUNDERLAND_SOL_RPC_URL ?? '';
    const programId = process.env.WUNDERLAND_SOL_PROGRAM_ID ?? '';
    if (!rpcUrl || !programId) {
      return local
        ? { ok: true }
        : { ok: false, error: 'Job not indexed yet and Solana RPC not configured' };
    }

    try {
      const connection = new Connection(rpcUrl, 'confirmed');
      const accountInfo = await connection.getAccountInfo(new PublicKey(opts.jobPda), 'confirmed');
      if (!accountInfo) {
        return { ok: false, error: 'Job account not found on-chain' };
      }
      if (accountInfo.owner.toBase58() !== programId) {
        return { ok: false, error: 'Job account owner mismatch' };
      }
      const expectedDisc = createHash('sha256')
        .update('account:JobPosting')
        .digest()
        .subarray(0, 8);
      const data = Buffer.from(accountInfo.data);
      if (data.length < 8 || !data.subarray(0, 8).equals(expectedDisc)) {
        return { ok: false, error: 'Account is not a JobPosting' };
      }
      const decoded = decodeJobPostingAccount(data);
      const onChainCreator = decoded.creator.toBase58();
      if (onChainCreator !== opts.creatorWallet) {
        return { ok: false, error: 'Creator wallet does not match on-chain job' };
      }
      if (decoded.status !== 'open') {
        return {
          ok: false,
          error: `Job is "${decoded.status}". Confidential details are sealed after bid acceptance.`,
        };
      }
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `On-chain verification failed: ${message}` };
    }
  }

  private async fetchJobPostingOnChain(jobPda: string): Promise<
    | {
        ok: true;
        creatorWallet: string;
        status: string;
        metadataHashHex: string;
        jobNonce: string;
        budgetLamports: string;
        buyItNowLamports: string | null;
        assignedAgentPda: string | null;
        acceptedBidPda: string | null;
        createdAtSec: number;
        updatedAtSec: number;
        cluster: string | null;
      }
    | { ok: false; error: string }
  > {
    const rpcUrl = process.env.WUNDERLAND_SOL_RPC_URL ?? '';
    const programId = process.env.WUNDERLAND_SOL_PROGRAM_ID ?? '';
    const cluster = process.env.WUNDERLAND_SOL_CLUSTER ?? '';
    if (!rpcUrl || !programId) {
      return { ok: false, error: 'Solana RPC not configured' };
    }

    const NULL_PUBKEY = '11111111111111111111111111111111';

    try {
      const connection = new Connection(rpcUrl, 'confirmed');
      const accountInfo = await connection.getAccountInfo(new PublicKey(jobPda), 'confirmed');
      if (!accountInfo) {
        return { ok: false, error: 'Job account not found on-chain' };
      }
      if (accountInfo.owner.toBase58() !== programId) {
        return { ok: false, error: 'Job account owner mismatch' };
      }
      const expectedDisc = createHash('sha256')
        .update('account:JobPosting')
        .digest()
        .subarray(0, 8);
      const data = Buffer.from(accountInfo.data);
      if (data.length < 8 || !data.subarray(0, 8).equals(expectedDisc)) {
        return { ok: false, error: 'Account is not a JobPosting' };
      }

      const decoded = decodeJobPostingAccount(data);
      const assignedAgentRaw = decoded.assignedAgent?.toBase58?.() ?? NULL_PUBKEY;
      const acceptedBidRaw = decoded.acceptedBid?.toBase58?.() ?? NULL_PUBKEY;

      return {
        ok: true,
        creatorWallet: decoded.creator.toBase58(),
        status: decoded.status,
        metadataHashHex: Buffer.from(decoded.metadataHash).toString('hex'),
        jobNonce: decoded.jobNonce.toString(),
        budgetLamports: decoded.budgetLamports.toString(),
        buyItNowLamports:
          decoded.buyItNowLamports === null ? null : decoded.buyItNowLamports.toString(),
        assignedAgentPda: assignedAgentRaw !== NULL_PUBKEY ? assignedAgentRaw : null,
        acceptedBidPda: acceptedBidRaw !== NULL_PUBKEY ? acceptedBidRaw : null,
        createdAtSec: Number(decoded.createdAt),
        updatedAtSec: Number(decoded.updatedAt),
        cluster: cluster || 'devnet',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `On-chain verification failed: ${message}` };
    }
  }
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
