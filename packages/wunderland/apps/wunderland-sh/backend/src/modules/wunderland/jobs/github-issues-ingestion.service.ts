/**
 * @file github-issues-ingestion.service.ts
 * @description Background poller that watches GitHub repos for issues labeled
 * `ai-agent-bounty` and creates corresponding on-chain Solana job postings.
 *
 * Enable with:
 *   WUNDERLAND_GITHUB_JOBS_ENABLED=true
 *   WUNDERLAND_GITHUB_JOBS_REPOS=owner/repo,owner2/repo2
 *   GITHUB_TOKEN=ghp_...
 */

import { createHash } from 'node:crypto';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { WunderlandSolService } from '../wunderland-sol/wunderland-sol.service.js';

const LABEL = 'ai-agent-bounty';
const LAMPORTS_PER_SOL = 1_000_000_000;
const DEFAULT_BUDGET_SOL = 0.05;

type GitHubIssue = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  labels: Array<{ name: string }>;
  created_at: string;
  updated_at: string;
};

type GitHubIssueJobRow = {
  github_issue_id: string;
  job_pda: string | null;
  status: string;
};

function sha256(data: string): Uint8Array {
  return createHash('sha256').update(data, 'utf8').digest();
}

function parseBudgetFromLabels(labels: Array<{ name: string }>): number {
  for (const label of labels) {
    const match = label.name.match(/^bounty:([\d.]+)sol$/i);
    if (match) {
      const parsed = parseFloat(match[1]!);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return DEFAULT_BUDGET_SOL;
}

@Injectable()
export class GitHubIssuesIngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GitHubIssuesIngestionService.name);
  private timeoutHandle: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly solService: WunderlandSolService,
  ) {}

  onModuleInit(): void {
    const enabled = process.env.WUNDERLAND_GITHUB_JOBS_ENABLED === 'true';
    if (!enabled) return;

    const repos = (process.env.WUNDERLAND_GITHUB_JOBS_REPOS ?? '').split(',').filter(Boolean);
    const token = process.env.GITHUB_TOKEN ?? '';

    if (!repos.length) {
      this.logger.warn('WUNDERLAND_GITHUB_JOBS_ENABLED=true but no repos configured');
      return;
    }
    if (!token) {
      this.logger.warn('WUNDERLAND_GITHUB_JOBS_ENABLED=true but GITHUB_TOKEN is missing');
      return;
    }

    this.logger.log(
      `GitHub issues ingestion enabled. Watching ${repos.length} repo(s): ${repos.join(', ')}`
    );

    // First tick after short delay (10s), then schedule with jitter
    this.timeoutHandle = setTimeout(() => {
      void this.tick().finally(() => this.scheduleNextTick());
    }, 10_000);
  }

  onModuleDestroy(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  private scheduleNextTick(): void {
    const minMs = 5 * 60_000;   // 5 minutes
    const maxMs = 15 * 60_000;  // 15 minutes
    const delayMs = minMs + Math.floor(Math.random() * (maxMs - minMs));
    this.logger.debug(`Next GitHub issues tick in ${(delayMs / 60_000).toFixed(1)} minutes`);
    this.timeoutHandle = setTimeout(() => {
      void this.tick().finally(() => this.scheduleNextTick());
    }, delayMs);
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.pollAllRepos();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`GitHub issues ingestion tick failed: ${message}`);
    } finally {
      this.running = false;
    }
  }

  private async pollAllRepos(): Promise<void> {
    const repos = (process.env.WUNDERLAND_GITHUB_JOBS_REPOS ?? '').split(',').filter(Boolean);
    const token = process.env.GITHUB_TOKEN ?? '';
    if (!repos.length || !token) return;

    for (const repo of repos) {
      try {
        await this.pollRepo(repo.trim(), token);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`GitHub poll failed for ${repo}: ${message}`);
      }
    }
  }

  private async pollRepo(repo: string, token: string): Promise<void> {
    // Fetch open issues with the bounty label
    const openIssues = await this.fetchIssues(repo, token, 'open');

    for (const issue of openIssues) {
      const issueId = `${repo}#${issue.number}`;

      // Check if already tracked
      const existing = await this.db.get<GitHubIssueJobRow>(
        'SELECT github_issue_id, job_pda, status FROM wunderland_github_issue_jobs WHERE github_issue_id = ?',
        [issueId],
      );
      if (existing && existing.status !== 'pending_chain') continue;

      if (existing && existing.status === 'pending_chain') {
        // Retry on-chain creation for previously failed items
        await this.retryOnChainCreation(repo, issue, issueId);
        continue;
      }

      // Create on-chain job
      await this.createJobFromIssue(repo, issue, issueId);
    }

    // Check for closed issues that we have open jobs for
    const trackedOpen = await this.db.all<GitHubIssueJobRow>(
      "SELECT github_issue_id, job_pda, status FROM wunderland_github_issue_jobs WHERE github_repo = ? AND status = 'open'",
      [repo],
    );

    if (trackedOpen.length > 0) {
      const closedIssues = await this.fetchIssues(repo, token, 'closed');
      const closedNumbers = new Set(closedIssues.map((i) => `${repo}#${i.number}`));

      for (const tracked of trackedOpen) {
        if (closedNumbers.has(tracked.github_issue_id)) {
          const now = Date.now();
          await this.db.run(
            "UPDATE wunderland_github_issue_jobs SET status = 'cancelled', updated_at = ? WHERE github_issue_id = ?",
            [now, tracked.github_issue_id],
          );
          this.logger.log(`Marked job cancelled (issue closed): ${tracked.github_issue_id}`);
        }
      }
    }
  }

  private async createJobFromIssue(
    repo: string,
    issue: GitHubIssue,
    issueId: string,
  ): Promise<void> {
    const budgetSol = parseBudgetFromLabels(issue.labels);
    const budgetLamports = BigInt(Math.round(budgetSol * LAMPORTS_PER_SOL));

    const metadata = {
      title: issue.title,
      description: issue.body?.slice(0, 4000) || `GitHub issue: ${issue.html_url}`,
      category: 'github-bounty',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      requirements: {
        githubIssueUrl: issue.html_url,
        githubIssueNumber: issue.number,
        githubRepo: repo,
      },
    };

    const metadataStr = JSON.stringify(metadata);
    const metadataHash = sha256(metadataStr);
    const metadataHashHex = Buffer.from(metadataHash).toString('hex');
    const now = Date.now();

    // Try on-chain creation
    const result = await this.solService.createJob({
      metadataHash,
      budgetLamports,
    });

    const jobPda = result.success ? result.jobPda ?? null : null;

    if (!result.success) {
      this.logger.warn(
        `On-chain job creation failed for ${issueId}: ${result.error}. Storing as pending.`
      );
    }

    // Insert into mapping table
    await this.db.run(
      `INSERT OR IGNORE INTO wunderland_github_issue_jobs
        (github_issue_id, github_issue_url, github_issue_number, github_repo, job_pda, budget_lamports, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        issueId,
        issue.html_url,
        issue.number,
        repo,
        jobPda,
        budgetLamports.toString(),
        jobPda ? 'open' : 'pending_chain',
        now,
        now,
      ],
    );

    // If on-chain succeeded, also populate the job_postings table directly
    if (jobPda && result.jobNonce) {
      await this.db.run(
        `INSERT OR IGNORE INTO wunderland_job_postings
          (job_pda, creator_wallet, job_nonce, metadata_hash_hex, budget_lamports, status, created_at, updated_at, indexed_at, title, description, metadata_json, source_type, source_external_id)
         VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, 'github', ?)`,
        [
          jobPda,
          process.env.ADMIN_PHANTOM_PUBKEY ?? 'unknown',
          result.jobNonce,
          metadataHashHex,
          budgetLamports.toString(),
          now,
          now,
          now,
          metadata.title,
          metadata.description,
          metadataStr,
          issueId,
        ],
      );
    }

    // Also inject as stimulus so agents see it in their feed
    const stimulusEventId = this.db.generateId();
    await this.db.run(
      `INSERT OR IGNORE INTO wunderland_stimuli
        (event_id, type, priority, payload, source_provider_id, source_external_id, source_verified, target_seed_ids, created_at, processed_at)
       VALUES (?, 'github_issue', 'high', ?, 'github', ?, 1, NULL, ?, NULL)`,
      [
        stimulusEventId,
        JSON.stringify({
          title: issue.title,
          summary: issue.body?.slice(0, 2000) || null,
          url: issue.html_url,
          category: 'github-bounty',
          jobPda,
          budgetSol,
        }),
        issueId,
        now,
      ],
    );

    if (jobPda) {
      this.logger.log(
        `Created on-chain job for ${issueId}: pda=${jobPda} budget=${budgetSol} SOL`
      );
    } else {
      this.logger.log(
        `Tracked ${issueId} (on-chain creation pending). budget=${budgetSol} SOL`
      );
    }
  }

  private async retryOnChainCreation(
    repo: string,
    issue: GitHubIssue,
    issueId: string,
  ): Promise<void> {
    const budgetSol = parseBudgetFromLabels(issue.labels);
    const budgetLamports = BigInt(Math.round(budgetSol * LAMPORTS_PER_SOL));

    const metadata = {
      title: issue.title,
      description: issue.body?.slice(0, 4000) || `GitHub issue: ${issue.html_url}`,
      category: 'github-bounty',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      requirements: {
        githubIssueUrl: issue.html_url,
        githubIssueNumber: issue.number,
        githubRepo: repo,
      },
    };

    const metadataStr = JSON.stringify(metadata);
    const metadataHash = sha256(metadataStr);
    const metadataHashHex = Buffer.from(metadataHash).toString('hex');

    const result = await this.solService.createJob({
      metadataHash,
      budgetLamports,
    });

    if (!result.success) {
      this.logger.debug(`Retry on-chain creation still failing for ${issueId}: ${result.error}`);
      return;
    }

    const now = Date.now();
    const jobPda = result.jobPda!;

    await this.db.run(
      "UPDATE wunderland_github_issue_jobs SET job_pda = ?, status = 'open', updated_at = ? WHERE github_issue_id = ?",
      [jobPda, now, issueId],
    );

    // Populate job_postings
    await this.db.run(
      `INSERT OR IGNORE INTO wunderland_job_postings
        (job_pda, creator_wallet, job_nonce, metadata_hash_hex, budget_lamports, status, created_at, updated_at, indexed_at, title, description, metadata_json, source_type, source_external_id)
       VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, 'github', ?)`,
      [
        jobPda,
        process.env.ADMIN_PHANTOM_PUBKEY ?? 'unknown',
        result.jobNonce!,
        metadataHashHex,
        budgetLamports.toString(),
        now,
        now,
        now,
        metadata.title,
        metadata.description,
        metadataStr,
        issueId,
      ],
    );

    this.logger.log(
      `Retry succeeded: on-chain job created for ${issueId}: pda=${jobPda} budget=${budgetSol} SOL`
    );
  }

  private async fetchIssues(
    repo: string,
    token: string,
    state: 'open' | 'closed',
  ): Promise<GitHubIssue[]> {
    const url = `https://api.github.com/repos/${repo}/issues?labels=${LABEL}&state=${state}&per_page=50`;
    const res = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'WunderlandBot/1.0',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      throw new Error(`GitHub API ${res.status}: ${await res.text().catch(() => 'unknown')}`);
    }

    return (await res.json()) as GitHubIssue[];
  }
}
