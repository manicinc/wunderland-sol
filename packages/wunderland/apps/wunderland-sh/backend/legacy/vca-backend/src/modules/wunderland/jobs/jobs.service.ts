/**
 * @file jobs.service.ts
 * @description Service for indexing and querying on-chain job postings.
 *
 * Watches for JobPosting, JobBid, and JobSubmission PDA accounts
 * and indexes them into SQLite for fast querying.
 *
 * On-chain instructions supported:
 * - create_job: Human creates a job with escrowed funds
 * - place_job_bid: Agent bids on a job
 * - accept_job_bid: Human accepts a bid
 * - submit_job: Agent submits completed work
 * - approve_job_submission: Human approves submission → funds released
 * - withdraw_job_bid: Agent withdraws a bid
 * - cancel_job: Human cancels an open job
 */

import { Injectable } from '@nestjs/common';
import { createHash, createPublicKey, verify as cryptoVerify } from 'node:crypto';
import { getAppDatabase } from '../../../core/database/appDatabase.js';
import type { StorageAdapter } from '@framers/sql-storage-adapter';
import { PublicKey } from '@solana/web3.js';

type StoreConfidentialDetailsSignedParams = {
  jobPda: string;
  creatorWallet: string;
  signatureB64: string;
  confidentialDetails: string;
};

const STORE_CONFIDENTIAL_INTENT = 'wunderland_store_confidential_details';

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

function solanaPublicKeyToSpkiDer(pubkeyBytes: Uint8Array): Buffer {
  // Ed25519 SPKI DER prefix + raw 32-byte public key.
  // Prefix = SEQUENCE(42) { SEQUENCE(5) { OID(Ed25519) }, BIT STRING(33) { 0x00, key } }
  return Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(pubkeyBytes)]);
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

export interface JobRecord {
  jobPda: string;
  creatorWallet: string;
  title: string;
  description: string | null;
  budgetLamports: number;
  category: string;
  deadline: string | null;
  status: string;
  metadataHash: string | null;
  assignedAgent: string | null;
  createdAt: number;
  updatedAt: number | null;
}

export interface JobBidRecord {
  bidPda: string;
  jobPda: string;
  agentAddress: string;
  bidHash: string | null;
  amountLamports: number;
  status: string;
  createdAt: number;
}

export interface JobSubmissionRecord {
  submissionPda: string;
  jobPda: string;
  agentAddress: string;
  submissionHash: string | null;
  status: string;
  createdAt: number;
}

@Injectable()
export class JobsService {
  private db: StorageAdapter | null = null;

  private getDb(): StorageAdapter {
    if (!this.db) {
      this.db = getAppDatabase();
    }
    return this.db;
  }

  /**
   * Index a new job posting.
   */
  async indexJob(job: JobRecord): Promise<void> {
    const db = this.getDb();
    await db.run(
      `INSERT OR REPLACE INTO wunderland_jobs
       (job_pda, creator_wallet, title, description, budget_lamports, category, deadline, status, metadata_hash, assigned_agent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        job.jobPda,
        job.creatorWallet,
        job.title,
        job.description,
        job.budgetLamports,
        job.category,
        job.deadline,
        job.status,
        job.metadataHash,
        job.assignedAgent,
        job.createdAt,
        job.updatedAt,
      ]
    );

    // If confidential details were stored before this job was indexed, attach them now.
    await this.applyStoredConfidentialDetails(job.jobPda);
  }

  /**
   * Index a job bid.
   */
  async indexBid(bid: JobBidRecord): Promise<void> {
    const db = this.getDb();
    await db.run(
      `INSERT OR REPLACE INTO wunderland_job_bids
       (bid_pda, job_pda, agent_address, bid_hash, amount_lamports, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        bid.bidPda,
        bid.jobPda,
        bid.agentAddress,
        bid.bidHash,
        bid.amountLamports,
        bid.status,
        bid.createdAt,
      ]
    );
  }

  /**
   * Index a job submission.
   */
  async indexSubmission(sub: JobSubmissionRecord): Promise<void> {
    const db = this.getDb();
    await db.run(
      `INSERT OR REPLACE INTO wunderland_job_submissions
       (submission_pda, job_pda, agent_address, submission_hash, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sub.submissionPda,
        sub.jobPda,
        sub.agentAddress,
        sub.submissionHash,
        sub.status,
        sub.createdAt,
      ]
    );
  }

  /**
   * List jobs with optional filters.
   */
  async listJobs(opts?: {
    status?: string;
    category?: string;
    creatorWallet?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: JobRecord[]; total: number }> {
    const db = this.getDb();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (opts?.status) {
      conditions.push('status = ?');
      params.push(opts.status);
    }
    if (opts?.category) {
      conditions.push('category = ?');
      params.push(opts.category);
    }
    if (opts?.creatorWallet) {
      conditions.push('creator_wallet = ?');
      params.push(opts.creatorWallet);
    }
    if (opts?.q) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      const q = `%${opts.q}%`;
      params.push(q, q);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(opts?.limit ?? 20, 100);
    const offset = opts?.offset ?? 0;

    const countResult = await db.get<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM wunderland_jobs ${where}`,
      params
    );
    const total = countResult?.cnt ?? 0;

    const rows = await db.all<JobRecord>(
      `SELECT job_pda as jobPda, creator_wallet as creatorWallet, title, description,
              budget_lamports as budgetLamports, category, deadline, status,
              metadata_hash as metadataHash, assigned_agent as assignedAgent,
              created_at as createdAt, updated_at as updatedAt
       FROM wunderland_jobs ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { jobs: rows, total };
  }

  /**
   * Get a single job with its bids and submissions.
   */
  async getJob(jobPda: string): Promise<{
    job: JobRecord | null;
    bids: JobBidRecord[];
    submissions: JobSubmissionRecord[];
  }> {
    const db = this.getDb();

    const job = await db.get<JobRecord>(
      `SELECT job_pda as jobPda, creator_wallet as creatorWallet, title, description,
              budget_lamports as budgetLamports, category, deadline, status,
              metadata_hash as metadataHash, assigned_agent as assignedAgent,
              created_at as createdAt, updated_at as updatedAt
       FROM wunderland_jobs WHERE job_pda = ?`,
      [jobPda]
    );

    if (!job) return { job: null, bids: [], submissions: [] };

    const bids = await db.all<JobBidRecord>(
      `SELECT bid_pda as bidPda, job_pda as jobPda, agent_address as agentAddress,
              bid_hash as bidHash, amount_lamports as amountLamports, status, created_at as createdAt
       FROM wunderland_job_bids WHERE job_pda = ?
       ORDER BY created_at ASC`,
      [jobPda]
    );

    const submissions = await db.all<JobSubmissionRecord>(
      `SELECT submission_pda as submissionPda, job_pda as jobPda, agent_address as agentAddress,
              submission_hash as submissionHash, status, created_at as createdAt
       FROM wunderland_job_submissions WHERE job_pda = ?
       ORDER BY created_at ASC`,
      [jobPda]
    );

    return { job, bids, submissions };
  }

  /**
   * Update job status.
   */
  async updateJobStatus(jobPda: string, status: string, assignedAgent?: string): Promise<void> {
    const db = this.getDb();
    if (assignedAgent) {
      await db.run(
        'UPDATE wunderland_jobs SET status = ?, assigned_agent = ?, updated_at = ? WHERE job_pda = ?',
        [status, assignedAgent, Date.now(), jobPda]
      );
    } else {
      await db.run('UPDATE wunderland_jobs SET status = ?, updated_at = ? WHERE job_pda = ?', [
        status,
        Date.now(),
        jobPda,
      ]);
    }
  }

  /**
   * Store confidential job details (only revealed to assigned agent).
   */
  async storeConfidentialDetails(
    jobPda: string,
    confidentialDetails: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = this.getDb();

      // Verify job exists
      const job = await db.get('SELECT job_pda FROM wunderland_jobs WHERE job_pda = ?', [jobPda]);

      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      // Update confidential details
      await db.run('UPDATE wunderland_jobs SET confidential_details = ? WHERE job_pda = ?', [
        confidentialDetails,
        jobPda,
      ]);

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Store confidential job details with wallet signature verification.
   *
   * This is safe to call immediately after on-chain job creation (before the
   * indexer has materialized the job row locally), because it stores into a
   * dedicated table and later attaches to `wunderland_jobs.confidential_details`
   * when the job is indexed.
   */
  async storeConfidentialDetailsSigned(
    body: StoreConfidentialDetailsSignedParams
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const jobPda = new PublicKey(body.jobPda).toBase58();
      const creatorWallet = new PublicKey(body.creatorWallet).toBase58();

      const confidentialDetails =
        typeof body.confidentialDetails === 'string' ? body.confidentialDetails.trim() : '';
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

      const creatorOk = await this.verifyJobCreator({
        jobPda,
        creatorWallet,
      });
      if (!creatorOk.ok) {
        return { success: false, error: creatorOk.error ?? 'Creator verification failed' };
      }

      const db = this.getDb();
      const now = Date.now();

      await db.run(
        `INSERT INTO wunderland_job_confidential
          (job_pda, creator_wallet, confidential_details, details_hash_hex, signature_b64, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(job_pda) DO UPDATE SET
           creator_wallet = excluded.creator_wallet,
           confidential_details = excluded.confidential_details,
           details_hash_hex = excluded.details_hash_hex,
           signature_b64 = excluded.signature_b64,
           updated_at = excluded.updated_at`,
        [jobPda, creatorWallet, confidentialDetails, detailsHashHex, signatureB64, now, now]
      );

      // Best-effort attach to indexed jobs table if present already.
      await db.run('UPDATE wunderland_jobs SET confidential_details = ? WHERE job_pda = ?', [
        confidentialDetails,
        jobPda,
      ]);

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  private async applyStoredConfidentialDetails(jobPda: string): Promise<void> {
    const db = this.getDb();
    const row = await db.get<{ confidential_details: string }>(
      'SELECT confidential_details FROM wunderland_job_confidential WHERE job_pda = ? LIMIT 1',
      [jobPda]
    );
    if (!row?.confidential_details) return;
    await db.run('UPDATE wunderland_jobs SET confidential_details = ? WHERE job_pda = ?', [
      row.confidential_details,
      jobPda,
    ]);
  }

  private async verifyJobCreator(opts: {
    jobPda: string;
    creatorWallet: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const db = this.getDb();
    const local = await db.get<{ creator_wallet: string }>(
      'SELECT creator_wallet FROM wunderland_jobs WHERE job_pda = ? LIMIT 1',
      [opts.jobPda]
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
      const sdk = await import('@wunderland-sol/sdk');
      const web3 = await import('@solana/web3.js');
      const connection = new web3.Connection(rpcUrl, 'confirmed');
      const accountInfo = await connection.getAccountInfo(
        new web3.PublicKey(opts.jobPda),
        'confirmed'
      );
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
      const decoded = sdk.decodeJobPostingAccount(data);
      const onChainCreator = decoded.creator.toBase58();
      return onChainCreator === opts.creatorWallet
        ? { ok: true }
        : { ok: false, error: 'Creator wallet does not match on-chain job' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `On-chain verification failed: ${message}` };
    }
  }

  /**
   * Get confidential details (only if requester is assigned agent or creator).
   */
  async getConfidentialDetails(
    jobPda: string,
    requesterWallet: string
  ): Promise<{ confidentialDetails: string | null; authorized: boolean }> {
    try {
      const db = this.getDb();

      const job = await db.get<{
        creator_wallet: string;
        assigned_agent: string | null;
        confidential_details: string | null;
      }>(
        `SELECT creator_wallet, assigned_agent, confidential_details
         FROM wunderland_jobs WHERE job_pda = ?`,
        [jobPda]
      );

      if (!job) {
        return { confidentialDetails: null, authorized: false };
      }

      // Only creator or assigned agent can see confidential details
      const isCreator = job.creator_wallet === requesterWallet;
      const isAssignedAgent = job.assigned_agent === requesterWallet;
      const authorized = isCreator || isAssignedAgent;

      return {
        confidentialDetails: authorized ? job.confidential_details : null,
        authorized,
      };
    } catch {
      return { confidentialDetails: null, authorized: false };
    }
  }
}
