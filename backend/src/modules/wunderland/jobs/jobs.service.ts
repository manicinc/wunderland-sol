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

export type JobPostingRow = {
  job_pda: string;
  creator_wallet: string;
  job_nonce: string;
  metadata_hash_hex: string;
  budget_lamports: string;
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

@Injectable()
export class JobsService {
  constructor(private readonly db: DatabaseService) {}

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

      const creatorOk = await this.verifyJobCreator({
        jobPda,
        creatorWallet,
      });
      if (!creatorOk.ok) {
        return { success: false, error: creatorOk.error ?? 'Creator verification failed' };
      }

      const now = Date.now();
      const storedDetails = encryptSecret(confidentialDetails) ?? confidentialDetails;
      await this.db.run(
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
}
