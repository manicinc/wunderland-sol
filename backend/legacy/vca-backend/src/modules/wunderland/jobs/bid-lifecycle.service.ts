/**
 * @file bid-lifecycle.service.ts
 * @description Automatically withdraws losing bids to free up agent bandwidth.
 */

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { WunderlandSolService } from '../wunderland-sol/wunderland-sol.service.js';

@Injectable()
export class BidLifecycleService {
  private readonly logger = new Logger(BidLifecycleService.name);
  private readonly pollInterval: number;
  private readonly pollingIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly db: DatabaseService,
    private readonly wunderlandSol: WunderlandSolService
  ) {
    this.pollInterval = parseInt(process.env.JOB_EXECUTION_POLL_INTERVAL_MS || '30000', 10);
    this.logger.log(`BidLifecycleService initialized: poll=${this.pollInterval}ms`);
  }

  /**
   * Start withdrawal loop for an agent
   */
  async startWithdrawalLoopForAgent(seedId: string): Promise<void> {
    if (this.pollingIntervals.has(seedId)) {
      this.logger.warn(`Withdrawal loop already running for agent ${seedId}`);
      return;
    }

    const poll = async () => {
      try {
        await this.withdrawLosingBids(seedId);
      } catch (error) {
        this.logger.error(`Error in withdrawal loop for ${seedId}:`, error);
      }
    };

    // Initial poll
    await poll();

    // Set up polling interval
    const intervalId = setInterval(poll, this.pollInterval);
    this.pollingIntervals.set(seedId, intervalId);

    this.logger.log(`✓ Withdrawal loop started for agent ${seedId}`);
  }

  /**
   * Stop withdrawal loop for an agent
   */
  stopWithdrawalLoopForAgent(seedId: string): void {
    const intervalId = this.pollingIntervals.get(seedId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(seedId);
    }
    this.logger.log(`Withdrawal loop stopped for agent ${seedId}`);
  }

  /**
   * Find and withdraw losing bids
   */
  async withdrawLosingBids(seedId: string): Promise<void> {
    // Find active bids for this agent
    const activeBids = await this.db.all<{
      bid_pda: string;
      job_pda: string;
    }>(
      `SELECT bid_pda, job_pda FROM wunderland_job_bids
       WHERE agent_address = ? AND status = 'active'`,
      [seedId]
    );

    if (activeBids.length === 0) {
      return;
    }

    this.logger.debug(`Agent ${seedId} has ${activeBids.length} active bid(s), checking status...`);

    let withdrawnCount = 0;

    for (const bid of activeBids) {
      // Check if job has been assigned to another agent
      const job = await this.db.get<{
        status: string;
        assigned_agent: string | null;
      }>('SELECT status, assigned_agent FROM wunderland_jobs WHERE job_pda = ?', [bid.job_pda]);

      if (!job) {
        this.logger.warn(`Job ${bid.job_pda} not found in database`);
        continue;
      }

      // If job is assigned to someone else, withdraw our bid
      if (job.status === 'assigned' && job.assigned_agent !== seedId) {
        const result = await this.withdrawBid(seedId, bid.bid_pda, bid.job_pda);
        if (result) {
          withdrawnCount++;
        }
      }

      // If job is cancelled or completed, mark bid as inactive
      if (job.status === 'cancelled' || job.status === 'completed') {
        await this.db.run(`UPDATE wunderland_job_bids SET status = 'inactive' WHERE bid_pda = ?`, [
          bid.bid_pda,
        ]);
        this.logger.log(`Marked bid ${bid.bid_pda} as inactive (job ${job.status})`);
      }
    }

    if (withdrawnCount > 0) {
      this.logger.log(`Agent ${seedId} withdrew ${withdrawnCount} losing bid(s)`);
    }
  }

  /**
   * Withdraw a single bid
   */
  private async withdrawBid(seedId: string, bidPda: string, jobPda: string): Promise<boolean> {
    try {
      // Call Solana withdraw_job_bid
      const result = await this.wunderlandSol.withdrawJobBid({
        seedId,
        jobPdaAddress: jobPda,
        bidPdaAddress: bidPda,
      });

      if (!result.success) {
        this.logger.error(`Failed to withdraw bid ${bidPda} for agent ${seedId}: ${result.error}`);
        return false;
      }

      // Update local database
      await this.db.run(`UPDATE wunderland_job_bids SET status = 'withdrawn' WHERE bid_pda = ?`, [
        bidPda,
      ]);

      // Decrement agent's active job count
      await this.decrementAgentWorkload(seedId);

      this.logger.log(
        `✓ Bid withdrawn for agent ${seedId}: bid=${bidPda}, job=${jobPda}, sig=${result.signature}`
      );

      return true;
    } catch (error) {
      this.logger.error(`Error withdrawing bid ${bidPda}:`, error);
      return false;
    }
  }

  /**
   * Decrement agent's active job count
   */
  private async decrementAgentWorkload(seedId: string): Promise<void> {
    await this.db.run(
      `UPDATE wunderland_agent_job_states
       SET active_job_count = MAX(0, active_job_count - 1),
           updated_at = ?
       WHERE seed_id = ?`,
      [Date.now(), seedId]
    );
  }
}
