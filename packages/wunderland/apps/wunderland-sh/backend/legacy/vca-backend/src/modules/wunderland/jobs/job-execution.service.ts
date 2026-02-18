/**
 * @file job-execution.service.ts
 * @description Autonomously executes jobs by spawning agent runtime with tools.
 */

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { OrchestrationService } from '../orchestration/orchestration.service.js';
import { DeliverableManagerService, type Deliverable } from './deliverable-manager.service.js';
import { QualityCheckService } from './quality-check.service.js';

interface Job {
  job_pda: string;
  title: string;
  description: string;
  category: string;
  budget_lamports: number;
  deadline: string | null;
  confidential_details: string | null;
}

interface ExecutionResult {
  success: boolean;
  deliverableId?: string;
  error?: string;
}

@Injectable()
export class JobExecutionService {
  private readonly logger = new Logger(JobExecutionService.name);
  private readonly pollInterval: number;
  private readonly maxConcurrent: number;
  private readonly activeExecutions = new Map<string, Set<string>>(); // seedId -> Set<jobId>
  private readonly pollingIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly db: DatabaseService,
    private readonly orchestration: OrchestrationService,
    private readonly deliverableManager: DeliverableManagerService,
    private readonly qualityCheck: QualityCheckService
  ) {
    this.pollInterval = parseInt(process.env.JOB_EXECUTION_POLL_INTERVAL_MS || '30000', 10);
    this.maxConcurrent = parseInt(process.env.JOB_EXECUTION_MAX_CONCURRENT || '1', 10);
    this.logger.log(
      `JobExecutionService initialized: poll=${this.pollInterval}ms, max_concurrent=${this.maxConcurrent}`
    );
  }

  /**
   * Start execution loop for an agent
   */
  async startExecutionLoopForAgent(seedId: string): Promise<void> {
    if (this.pollingIntervals.has(seedId)) {
      this.logger.warn(`Execution loop already running for agent ${seedId}`);
      return;
    }

    this.activeExecutions.set(seedId, new Set());

    const poll = async () => {
      try {
        await this.pollAndExecuteJobs(seedId);
      } catch (error) {
        this.logger.error(`Error in execution loop for ${seedId}:`, error);
      }
    };

    // Initial poll
    await poll();

    // Set up polling interval
    const intervalId = setInterval(poll, this.pollInterval);
    this.pollingIntervals.set(seedId, intervalId);

    this.logger.log(`✓ Execution loop started for agent ${seedId}`);
  }

  /**
   * Stop execution loop for an agent
   */
  stopExecutionLoopForAgent(seedId: string): void {
    const intervalId = this.pollingIntervals.get(seedId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(seedId);
    }
    this.activeExecutions.delete(seedId);
    this.logger.log(`Execution loop stopped for agent ${seedId}`);
  }

  /**
   * Poll for assigned jobs and execute them
   */
  private async pollAndExecuteJobs(seedId: string): Promise<void> {
    const activeSet = this.activeExecutions.get(seedId) || new Set();

    // Check if agent is at max concurrent jobs
    if (activeSet.size >= this.maxConcurrent) {
      this.logger.debug(
        `Agent ${seedId} at max concurrent jobs (${activeSet.size}/${this.maxConcurrent})`
      );
      return;
    }

    // Find assigned jobs not yet started
    const jobs = await this.db.all<Job>(
      `SELECT * FROM wunderland_jobs
       WHERE status = 'assigned'
       AND assigned_agent = ?
       AND execution_started_at IS NULL
       LIMIT ?`,
      [seedId, this.maxConcurrent - activeSet.size]
    );

    if (jobs.length === 0) {
      return;
    }

    this.logger.log(`Agent ${seedId} found ${jobs.length} assigned job(s) to execute`);

    // Execute each job
    for (const job of jobs) {
      if (activeSet.size >= this.maxConcurrent) {
        break;
      }

      activeSet.add(job.job_pda);
      void this.executeJob(seedId, job).finally(() => {
        activeSet.delete(job.job_pda);
      });
    }
  }

  /**
   * Execute a single job
   */
  async executeJob(seedId: string, job: Job): Promise<ExecutionResult> {
    this.logger.log(
      `[JobExecution] Agent ${seedId} starting job ${job.job_pda} — category: ${job.category}, budget: ${job.budget_lamports / 1e9} SOL`
    );

    const startTime = Date.now();

    try {
      // Mark execution as started
      await this.db.run(
        `UPDATE wunderland_jobs
         SET execution_started_at = ?, execution_agent_session_id = ?
         WHERE job_pda = ?`,
        [startTime, `job-exec-${job.job_pda}`, job.job_pda]
      );

      // Build execution prompt
      const prompt = this.buildJobPrompt(job);

      // TODO: Spawn GMI and execute job
      // For now, use a mock deliverable
      const deliverable = await this.mockExecuteJob(seedId, job, prompt);

      // Quality check
      const qualityResult = await this.qualityCheck.checkDeliverable(deliverable, {
        id: job.job_pda,
        title: job.title,
        description: job.description,
        category: job.category,
      });

      if (!qualityResult.passed) {
        this.logger.warn(
          `Quality check failed for job ${job.job_pda}: score=${qualityResult.score.toFixed(2)}, issues=${qualityResult.issues.join(', ')}`
        );

        // Retry logic
        const retryCount = await this.incrementRetryCount(job.job_pda);
        if (retryCount >= 3) {
          await this.markJobFailed(
            job.job_pda,
            `Quality check failed after 3 retries: ${qualityResult.issues.join(', ')}`
          );
          return { success: false, error: 'Max retries exceeded' };
        }

        // Schedule retry (mark as not started so next poll picks it up)
        await this.db.run(
          `UPDATE wunderland_jobs SET execution_started_at = NULL WHERE job_pda = ?`,
          [job.job_pda]
        );
        return { success: false, error: 'Quality check failed, retrying' };
      }

      // Store deliverable
      const deliverableId = await this.deliverableManager.storeDeliverable(
        job.job_pda,
        seedId,
        deliverable
      );

      // Submit to Solana
      const submissionResult = await this.deliverableManager.submitJob(
        seedId,
        job.job_pda,
        deliverableId
      );

      if (!submissionResult.success) {
        this.logger.error(`Failed to submit job ${job.job_pda}: ${submissionResult.error}`);
        return { success: false, error: submissionResult.error };
      }

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `[JobExecution] Job ${job.job_pda} completed in ${executionTime}ms — quality: ${qualityResult.score.toFixed(2)}, signature: ${submissionResult.signature}`
      );

      await this.db.run(`UPDATE wunderland_jobs SET execution_completed_at = ? WHERE job_pda = ?`, [
        Date.now(),
        job.job_pda,
      ]);

      return { success: true, deliverableId };
    } catch (error) {
      this.logger.error(`Error executing job ${job.job_pda}:`, error);
      await this.markJobFailed(
        job.job_pda,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build job execution prompt
   */
  private buildJobPrompt(job: Job): string {
    let prompt = `You have been assigned job: "${job.title}"

Description: ${job.description}
Budget: ${job.budget_lamports / 1e9} SOL
Category: ${job.category}`;

    if (job.deadline) {
      prompt += `\nDeadline: ${job.deadline}`;
    }

    if (job.confidential_details) {
      prompt += '\n\nConfidential Details:';
      try {
        const parsed = JSON.parse(job.confidential_details) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          prompt += '\n' + String(parsed ?? job.confidential_details);
        } else {
          const confidential = parsed as any;
          if (confidential.apiKeys) {
            prompt += '\nAPI Keys: ' + Object.keys(confidential.apiKeys).join(', ');
          }
          if (confidential.credentials) {
            prompt += '\nCredentials: ' + Object.keys(confidential.credentials).join(', ');
          }
          if (confidential.instructions) {
            prompt += '\n' + String(confidential.instructions);
          }
        }
      } catch {
        // If raw text was stored, include it directly so the assigned agent can act on it.
        prompt += '\n' + job.confidential_details;
      }
    }

    prompt += `\n\nYour task: Complete this job and produce deliverables.
Output format: Wrap deliverables in <DELIVERABLE type="code|report|data">...</DELIVERABLE> tags.`;

    return prompt;
  }

  /**
   * Mock job execution (TODO: replace with actual GMI execution)
   */
  private async mockExecuteJob(seedId: string, job: Job, prompt: string): Promise<Deliverable> {
    this.logger.warn(`[MOCK] Executing job with mock agent (GMI integration pending)`);

    // Simulate execution delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate mock deliverable based on category
    let content = '';
    let type: Deliverable['type'] = 'report';

    if (job.category === 'development') {
      type = 'code';
      content = `// Mock code deliverable for job: ${job.title}
function mockImplementation() {
  console.log("This is a mock implementation");
  // TODO: Replace with actual GMI-generated code
  return { success: true, data: "mock result" };
}

export default mockImplementation;`;
    } else if (job.category === 'research') {
      type = 'report';
      content = `# Mock Research Report: ${job.title}

## Summary
This is a mock research report generated for testing purposes.

## Findings
- Mock finding 1: The job description requested research on: ${job.description.substring(0, 100)}
- Mock finding 2: This would contain actual research results from the GMI agent
- Mock finding 3: Tool usage, web searches, and data analysis would appear here

## Conclusion
This mock deliverable demonstrates the job execution flow. In production, the GMI agent would generate actual research findings.`;
    } else {
      type = 'report';
      content = `# Job Deliverable: ${job.title}

## Description
This deliverable addresses the following job requirements:
${job.description}

## Output
Mock deliverable content generated for category: ${job.category}

This would contain the actual work product from the GMI agent using available tools (web search, code interpreter, CLI, etc.).

---
Generated by mock execution service (GMI integration pending)`;
    }

    return { type, content };
  }

  /**
   * Increment retry count for a job
   */
  private async incrementRetryCount(jobPda: string): Promise<number> {
    const job = await this.db.get<{ execution_retry_count: number }>(
      'SELECT execution_retry_count FROM wunderland_jobs WHERE job_pda = ?',
      [jobPda]
    );

    const newCount = (job?.execution_retry_count || 0) + 1;

    await this.db.run('UPDATE wunderland_jobs SET execution_retry_count = ? WHERE job_pda = ?', [
      newCount,
      jobPda,
    ]);

    return newCount;
  }

  /**
   * Mark job as failed
   */
  private async markJobFailed(jobPda: string, error: string): Promise<void> {
    await this.db.run(
      `UPDATE wunderland_jobs
       SET status = 'failed', execution_error = ?, updated_at = ?
       WHERE job_pda = ?`,
      [error, Date.now(), jobPda]
    );
  }
}
