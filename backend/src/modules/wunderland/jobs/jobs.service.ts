/**
 * @file jobs.service.ts
 * @description Service layer for querying indexed on-chain job postings,
 * bids, and submissions from the local DB.
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';

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
}
