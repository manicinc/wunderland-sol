/**
 * @file cron.service.ts
 * @description Business logic for cron job management — CRUD operations,
 * scheduling persistence, and ownership enforcement.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreateCronJobDto, ListCronJobsQueryDto, UpdateCronJobDto } from '../dto/cron.dto.js';
import { AgentImmutableException } from '../wunderland.exceptions.js';
import { getAgentSealState } from '../immutability/agentSealing.js';

// ── Domain Types ────────────────────────────────────────────────────────────

export interface CronJobRecord {
  jobId: string;
  seedId: string;
  ownerUserId: string;
  name: string;
  description: string;
  enabled: boolean;
  scheduleKind: string;
  scheduleConfig: Record<string, unknown>;
  payloadKind: string;
  payloadConfig: Record<string, unknown>;
  stateJson: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

// ── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class CronJobService {
  constructor(private readonly db: DatabaseService) {}

  // ── Create Job ──

  async createJob(
    userId: string,
    dto: CreateCronJobDto,
  ): Promise<{ job: CronJobRecord }> {
    const seedId = dto.seedId.trim();
    await this.requireOwnedAgent(userId, seedId);
    await this.assertAgentNotSealed(seedId, ['cronJobs']);

    const jobId = this.db.generateId();
    const now = Date.now();

    await this.db.run(
      `INSERT INTO wunderland_cron_jobs
        (job_id, seed_id, owner_user_id, name, description, enabled,
         schedule_kind, schedule_config, payload_kind, payload_config,
         state_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?)`,
      [
        jobId,
        seedId,
        userId,
        dto.name.trim(),
        dto.description?.trim() ?? '',
        dto.enabled !== false ? 1 : 0,
        dto.scheduleKind,
        dto.scheduleConfig,
        dto.payloadKind,
        dto.payloadConfig,
        now,
        now,
      ],
    );

    const row = await this.db.get<any>(
      'SELECT * FROM wunderland_cron_jobs WHERE job_id = ?',
      [jobId],
    );

    return { job: this.mapJob(row!) };
  }

  // ── Get Job ──

  async getJob(
    userId: string,
    jobId: string,
  ): Promise<{ job: CronJobRecord }> {
    const row = await this.db.get<any>(
      'SELECT * FROM wunderland_cron_jobs WHERE job_id = ? AND owner_user_id = ?',
      [jobId, userId],
    );
    if (!row) {
      throw new NotFoundException(`Cron job "${jobId}" not found.`);
    }
    return { job: this.mapJob(row) };
  }

  // ── List Jobs ──

  async listJobs(
    userId: string,
    query: ListCronJobsQueryDto = {},
  ): Promise<{ items: CronJobRecord[] }> {
    const where: string[] = ['owner_user_id = ?'];
    const params: Array<string | number> = [userId];

    if (query.seedId) {
      where.push('seed_id = ?');
      params.push(query.seedId.trim());
    }
    if (query.enabled === 'true') {
      where.push('enabled = 1');
    } else if (query.enabled === 'false') {
      where.push('enabled = 0');
    }

    const limit = query.limit ?? 50;
    const rows = await this.db.all<any>(
      `SELECT * FROM wunderland_cron_jobs
       WHERE ${where.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ?`,
      [...params, limit],
    );

    return { items: rows.map((r) => this.mapJob(r)) };
  }

  // ── Update Job ──

  async updateJob(
    userId: string,
    jobId: string,
    dto: UpdateCronJobDto,
  ): Promise<{ job: CronJobRecord }> {
    // Ownership check
    const existing = await this.db.get<any>(
      'SELECT * FROM wunderland_cron_jobs WHERE job_id = ? AND owner_user_id = ?',
      [jobId, userId],
    );
    if (!existing) {
      throw new NotFoundException(`Cron job "${jobId}" not found.`);
    }
    await this.assertAgentNotSealed(String(existing.seed_id), ['cronJobs']);

    const now = Date.now();
    const updates: string[] = ['updated_at = ?'];
    const params: Array<string | number> = [now];

    if (dto.name !== undefined) {
      updates.push('name = ?');
      params.push(dto.name.trim());
    }
    if (dto.description !== undefined) {
      updates.push('description = ?');
      params.push(dto.description.trim());
    }
    if (dto.enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(dto.enabled ? 1 : 0);
    }
    if (dto.scheduleKind !== undefined) {
      updates.push('schedule_kind = ?');
      params.push(dto.scheduleKind);
    }
    if (dto.scheduleConfig !== undefined) {
      updates.push('schedule_config = ?');
      params.push(dto.scheduleConfig);
    }
    if (dto.payloadKind !== undefined) {
      updates.push('payload_kind = ?');
      params.push(dto.payloadKind);
    }
    if (dto.payloadConfig !== undefined) {
      updates.push('payload_config = ?');
      params.push(dto.payloadConfig);
    }

    params.push(jobId, userId);

    await this.db.run(
      `UPDATE wunderland_cron_jobs SET ${updates.join(', ')} WHERE job_id = ? AND owner_user_id = ?`,
      params,
    );

    const row = await this.db.get<any>(
      'SELECT * FROM wunderland_cron_jobs WHERE job_id = ?',
      [jobId],
    );

    return { job: this.mapJob(row!) };
  }

  // ── Delete Job ──

  async deleteJob(
    userId: string,
    jobId: string,
  ): Promise<{ jobId: string; deleted: boolean }> {
    const existing = await this.db.get<{ job_id: string; seed_id: string }>(
      'SELECT job_id, seed_id FROM wunderland_cron_jobs WHERE job_id = ? AND owner_user_id = ?',
      [jobId, userId],
    );
    if (!existing) {
      throw new NotFoundException(`Cron job "${jobId}" not found.`);
    }
    await this.assertAgentNotSealed(String(existing.seed_id), ['cronJobs']);

    await this.db.run(
      'DELETE FROM wunderland_cron_jobs WHERE job_id = ? AND owner_user_id = ?',
      [jobId, userId],
    );

    return { jobId, deleted: true };
  }

  // ── Toggle Job ──

  async toggleJob(
    userId: string,
    jobId: string,
    enabled: boolean,
  ): Promise<{ job: CronJobRecord }> {
    return this.updateJob(userId, jobId, { enabled });
  }

  // ── Private Helpers ──

  private async requireOwnedAgent(userId: string, seedId: string): Promise<void> {
    const agent = await this.db.get<{ seed_id: string }>(
      `SELECT seed_id FROM wunderland_agents WHERE seed_id = ? AND owner_user_id = ? AND status != 'archived'`,
      [seedId, userId],
    );
    if (!agent) {
      throw new NotFoundException(`Agent "${seedId}" not found or not owned by current user.`);
    }
  }

  private async assertAgentNotSealed(seedId: string, fields: string[]): Promise<void> {
    const state = await getAgentSealState(this.db as any, seedId);
    if (state?.isSealed) {
      throw new AgentImmutableException(seedId, fields);
    }
  }

  private mapJob(row: any): CronJobRecord {
    let scheduleConfig: Record<string, unknown> = {};
    try {
      scheduleConfig = JSON.parse(String(row.schedule_config || '{}'));
    } catch { /* ignore */ }

    let payloadConfig: Record<string, unknown> = {};
    try {
      payloadConfig = JSON.parse(String(row.payload_config || '{}'));
    } catch { /* ignore */ }

    let stateJson: Record<string, unknown> = {};
    try {
      stateJson = JSON.parse(String(row.state_json || '{}'));
    } catch { /* ignore */ }

    return {
      jobId: String(row.job_id),
      seedId: String(row.seed_id),
      ownerUserId: String(row.owner_user_id),
      name: String(row.name || ''),
      description: String(row.description || ''),
      enabled: Boolean(row.enabled),
      scheduleKind: String(row.schedule_kind),
      scheduleConfig,
      payloadKind: String(row.payload_kind),
      payloadConfig,
      stateJson,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    };
  }
}
