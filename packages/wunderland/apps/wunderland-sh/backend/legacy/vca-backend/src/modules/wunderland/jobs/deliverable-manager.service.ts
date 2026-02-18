/**
 * @file deliverable-manager.service.ts
 * @description Manages job deliverables: storage (DB/IPFS), hash generation, and Solana submission.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { generateUniqueId } from '../../../utils/ids.js';
import { DatabaseService } from '../../../database/database.service.js';
import { WunderlandSolService } from '../wunderland-sol/wunderland-sol.service.js';

export interface Deliverable {
  type: 'code' | 'report' | 'data' | 'url' | 'ipfs';
  content: string;
  mimeType?: string;
}

export interface SubmissionMetadata {
  jobPda: string;
  agentAddress: string;
  deliverableId: string;
  timestamp: number;
  contentHash: string;
  ipfsCid?: string;
}

export interface SubmissionResult {
  success: boolean;
  deliverableId?: string;
  submissionHash?: string;
  signature?: string;
  error?: string;
}

@Injectable()
export class DeliverableManagerService {
  private readonly logger = new Logger(DeliverableManagerService.name);
  private readonly SMALL_DELIVERABLE_THRESHOLD = 100 * 1024; // 100KB
  private readonly storageStrategy: 'db' | 'ipfs' | 'hybrid';

  constructor(
    private readonly db: DatabaseService,
    private readonly wunderlandSol: WunderlandSolService
  ) {
    this.storageStrategy = (process.env.JOB_DELIVERABLE_STORAGE as any) || 'hybrid';
    this.logger.log(`DeliverableManagerService initialized with storage: ${this.storageStrategy}`);
  }

  /**
   * Store a deliverable and return its ID
   */
  async storeDeliverable(
    jobPda: string,
    agentAddress: string,
    deliverable: Deliverable
  ): Promise<string> {
    const deliverableId = generateUniqueId();
    const fileSize = Buffer.byteLength(deliverable.content, 'utf8');
    const now = Date.now();

    let ipfsCid: string | null = null;
    let content: string | null = deliverable.content;

    // Determine storage approach
    if (this.storageStrategy === 'ipfs' && fileSize > this.SMALL_DELIVERABLE_THRESHOLD) {
      // Large deliverable: upload to IPFS only
      ipfsCid = await this.uploadToIPFS(Buffer.from(deliverable.content, 'utf8'));
      content = null; // Don't store in DB
      this.logger.log(
        `Deliverable ${deliverableId} stored in IPFS: ${ipfsCid} (${fileSize} bytes)`
      );
    } else if (this.storageStrategy === 'hybrid' && fileSize > this.SMALL_DELIVERABLE_THRESHOLD) {
      // Hybrid: store in both DB and IPFS
      ipfsCid = await this.uploadToIPFS(Buffer.from(deliverable.content, 'utf8'));
      this.logger.log(
        `Deliverable ${deliverableId} stored in DB + IPFS: ${ipfsCid} (${fileSize} bytes)`
      );
    } else {
      // Small deliverable or DB-only strategy: store in DB
      this.logger.log(`Deliverable ${deliverableId} stored in DB (${fileSize} bytes)`);
    }

    // Generate submission hash
    const submissionHash = this.generateSubmissionHash({
      jobPda,
      agentAddress,
      deliverableId,
      timestamp: now,
      contentHash: crypto.createHash('sha256').update(deliverable.content, 'utf8').digest('hex'),
      ipfsCid: ipfsCid || undefined,
    });

    // Store in database
    await this.db.run(
      `INSERT INTO wunderland_job_deliverables
       (deliverable_id, job_pda, agent_address, deliverable_type, content, ipfs_cid,
        file_size, mime_type, submission_hash, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        deliverableId,
        jobPda,
        agentAddress,
        deliverable.type,
        content,
        ipfsCid,
        fileSize,
        deliverable.mimeType || 'text/plain',
        submissionHash,
        now,
      ]
    );

    return deliverableId;
  }

  /**
   * Generate deterministic SHA-256 submission hash from metadata
   */
  private generateSubmissionHash(metadata: SubmissionMetadata): string {
    const canonical = JSON.stringify(metadata, Object.keys(metadata).sort());
    return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
  }

  /**
   * Submit job deliverable to Solana
   */
  async submitJob(
    seedId: string,
    jobPda: string,
    deliverableId: string
  ): Promise<SubmissionResult> {
    try {
      // Fetch deliverable
      const deliverable = await this.db.get<{
        submission_hash: string;
        agent_address: string;
      }>(
        'SELECT submission_hash, agent_address FROM wunderland_job_deliverables WHERE deliverable_id = ?',
        [deliverableId]
      );

      if (!deliverable) {
        return { success: false, error: 'Deliverable not found' };
      }

      // Convert hex hash to Buffer (32 bytes)
      const submissionHashBuffer = Buffer.from(deliverable.submission_hash, 'hex');

      // Submit to Solana
      const result = await this.wunderlandSol.submitJob({
        seedId,
        jobPdaAddress: jobPda,
        submissionHash: submissionHashBuffer,
      });

      if (!result.success) {
        this.logger.error(`Failed to submit job ${jobPda} for agent ${seedId}: ${result.error}`);
        return { success: false, error: result.error };
      }

      // Update deliverable status
      await this.db.run(
        `UPDATE wunderland_job_deliverables
         SET status = 'submitted', submitted_at = ?
         WHERE deliverable_id = ?`,
        [Date.now(), deliverableId]
      );

      // Update job status in local DB
      await this.db.run(
        `UPDATE wunderland_jobs
         SET status = 'submitted', updated_at = ?
         WHERE job_pda = ?`,
        [Date.now(), jobPda]
      );

      this.logger.log(
        `✓ Job ${jobPda} submitted for agent ${seedId} — Deliverable: ${deliverableId}, Signature: ${result.signature}`
      );

      return {
        success: true,
        deliverableId,
        submissionHash: deliverable.submission_hash,
        signature: result.signature,
      };
    } catch (error) {
      this.logger.error(`Error submitting job ${jobPda}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Upload content to IPFS (placeholder - implement with actual IPFS client)
   */
  private async uploadToIPFS(content: Buffer): Promise<string> {
    // TODO: Implement actual IPFS upload
    // For now, return a mock CID based on content hash
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const mockCid = `Qm${hash.substring(0, 44)}`; // Mock CID format

    this.logger.warn(`[MOCK] IPFS upload not implemented. Generated mock CID: ${mockCid}`);

    // TODO: Replace with actual IPFS client
    // const ipfsClient = create({ url: process.env.IPFS_API_URL || 'http://localhost:5001' });
    // const { cid } = await ipfsClient.add(content);
    // return cid.toString();

    return mockCid;
  }

  /**
   * Retrieve deliverable content (from DB or IPFS)
   */
  async getDeliverable(deliverableId: string): Promise<Deliverable | null> {
    const row = await this.db.get<{
      deliverable_type: string;
      content: string | null;
      ipfs_cid: string | null;
      mime_type: string;
    }>(
      'SELECT deliverable_type, content, ipfs_cid, mime_type FROM wunderland_job_deliverables WHERE deliverable_id = ?',
      [deliverableId]
    );

    if (!row) {
      return null;
    }

    let content = row.content;

    // If content not in DB, fetch from IPFS
    if (!content && row.ipfs_cid) {
      content = await this.fetchFromIPFS(row.ipfs_cid);
    }

    if (!content) {
      this.logger.error(`Deliverable ${deliverableId} has no content in DB or IPFS`);
      return null;
    }

    return {
      type: row.deliverable_type as Deliverable['type'],
      content,
      mimeType: row.mime_type,
    };
  }

  /**
   * Fetch content from IPFS (placeholder)
   */
  private async fetchFromIPFS(cid: string): Promise<string> {
    // TODO: Implement actual IPFS fetch
    this.logger.warn(`[MOCK] IPFS fetch not implemented for CID: ${cid}`);
    throw new Error('IPFS fetch not implemented');

    // TODO: Replace with actual IPFS client
    // const ipfsClient = create({ url: process.env.IPFS_API_URL || 'http://localhost:5001' });
    // const chunks = [];
    // for await (const chunk of ipfsClient.cat(cid)) {
    //   chunks.push(chunk);
    // }
    // return Buffer.concat(chunks).toString('utf8');
  }
}
