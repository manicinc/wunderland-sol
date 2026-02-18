/**
 * @file runtime.service.ts
 * @description Managed runtime state service for Wunderland agents.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { StorageAdapter } from '@framers/sql-storage-adapter';
import { DatabaseService } from '../../../database/database.service.js';
import type { ListRuntimeQueryDto, UpdateRuntimeDto } from '../dto/runtime.dto.js';
import { AgentImmutableException } from '../wunderland.exceptions.js';
import { getAgentSealState } from '../immutability/agentSealing.js';

type RuntimeStatus = 'running' | 'stopped' | 'error' | 'starting' | 'stopping' | 'unknown';
type HostingMode = 'managed' | 'self_hosted';

type RuntimeRecord = {
  seedId: string;
  ownerUserId: string;
  hostingMode: HostingMode;
  status: RuntimeStatus;
  startedAt: string | null;
  stoppedAt: string | null;
  lastError: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

function parseJsonOr<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return (JSON.parse(raw) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function toIso(value: number | null | undefined): string | null {
  return typeof value === 'number' && Number.isFinite(value) ? new Date(value).toISOString() : null;
}

function toEpochMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

@Injectable()
export class RuntimeService {
  constructor(private readonly db: DatabaseService) {}

  private async requireOwnedAgent(
    trx: StorageAdapter,
    userId: string,
    seedId: string
  ): Promise<void> {
    const agent = await trx.get<{ seed_id: string }>(
      `SELECT seed_id
         FROM wunderbots
        WHERE seed_id = ?
          AND owner_user_id = ?
          AND status != ?
        LIMIT 1`,
      [seedId, userId, 'archived']
    );
    if (!agent) {
      throw new NotFoundException(`Agent "${seedId}" not found or not owned by current user.`);
    }
  }

  private mapRuntime(row: any): RuntimeRecord {
    return {
      seedId: String(row.seed_id),
      ownerUserId: String(row.owner_user_id),
      hostingMode: row.hosting_mode === 'self_hosted' ? 'self_hosted' : 'managed',
      status: (row.status as RuntimeStatus) ?? 'unknown',
      startedAt: toIso(toEpochMs(row.started_at)),
      stoppedAt: toIso(toEpochMs(row.stopped_at)),
      lastError: row.last_error ? String(row.last_error) : null,
      metadata: parseJsonOr<Record<string, unknown>>(row.metadata, {}),
      createdAt: toIso(toEpochMs(row.created_at)) ?? new Date().toISOString(),
      updatedAt: toIso(toEpochMs(row.updated_at)) ?? new Date().toISOString(),
    };
  }

  private async ensureRuntimeRow(
    trx: StorageAdapter,
    userId: string,
    seedId: string
  ): Promise<void> {
    const existing = await trx.get<{ seed_id: string }>(
      'SELECT seed_id FROM wunderbot_runtime WHERE seed_id = ? LIMIT 1',
      [seedId]
    );
    if (existing) return;

    const now = Date.now();
    await trx.run(
      `
        INSERT INTO wunderbot_runtime (
          seed_id,
          owner_user_id,
          hosting_mode,
          status,
          started_at,
          stopped_at,
          last_error,
          metadata,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)
      `,
      [seedId, userId, 'managed', 'stopped', '{}', now, now]
    );
  }

  private async loadRuntimeRow(trx: StorageAdapter, userId: string, seedId: string): Promise<any> {
    return trx.get<any>(
      `
        SELECT
          a.seed_id,
          a.owner_user_id,
          COALESCE(r.hosting_mode, 'managed') AS hosting_mode,
          COALESCE(r.status, 'stopped') AS status,
          r.started_at,
          r.stopped_at,
          r.last_error,
          r.metadata,
          COALESCE(r.created_at, a.created_at) AS created_at,
          COALESCE(r.updated_at, a.updated_at) AS updated_at
        FROM wunderbots a
        LEFT JOIN wunderbot_runtime r
          ON r.seed_id = a.seed_id
        WHERE a.owner_user_id = ?
          AND a.seed_id = ?
          AND a.status != ?
        LIMIT 1
      `,
      [userId, seedId, 'archived']
    );
  }

  async listOwnedRuntimes(
    userId: string,
    query: ListRuntimeQueryDto = {}
  ): Promise<{ items: RuntimeRecord[] }> {
    const where: string[] = ['a.owner_user_id = ?', 'a.status != ?'];
    const params: Array<string | number> = [userId, 'archived'];

    if (query.seedId) {
      where.push('a.seed_id = ?');
      params.push(query.seedId.trim());
    }

    const rows = await this.db.all<any>(
      `
        SELECT
          a.seed_id,
          a.owner_user_id,
          COALESCE(r.hosting_mode, 'managed') AS hosting_mode,
          COALESCE(r.status, 'stopped') AS status,
          r.started_at,
          r.stopped_at,
          r.last_error,
          r.metadata,
          COALESCE(r.created_at, a.created_at) AS created_at,
          COALESCE(r.updated_at, a.updated_at) AS updated_at
        FROM wunderbots a
        LEFT JOIN wunderbot_runtime r
          ON r.seed_id = a.seed_id
        WHERE ${where.join(' AND ')}
        ORDER BY COALESCE(r.updated_at, a.updated_at) DESC
      `,
      params
    );

    return {
      items: rows.map((row) => this.mapRuntime(row)),
    };
  }

  async getRuntime(userId: string, seedId: string): Promise<{ runtime: RuntimeRecord }> {
    const row = await this.db.get<any>(
      `
        SELECT
          a.seed_id,
          a.owner_user_id,
          COALESCE(r.hosting_mode, 'managed') AS hosting_mode,
          COALESCE(r.status, 'stopped') AS status,
          r.started_at,
          r.stopped_at,
          r.last_error,
          r.metadata,
          COALESCE(r.created_at, a.created_at) AS created_at,
          COALESCE(r.updated_at, a.updated_at) AS updated_at
        FROM wunderbots a
        LEFT JOIN wunderbot_runtime r
          ON r.seed_id = a.seed_id
        WHERE a.owner_user_id = ?
          AND a.seed_id = ?
          AND a.status != ?
        LIMIT 1
      `,
      [userId, seedId, 'archived']
    );

    if (!row) {
      throw new NotFoundException(`Agent "${seedId}" not found or not owned by current user.`);
    }

    return { runtime: this.mapRuntime(row) };
  }

  async updateRuntime(
    userId: string,
    seedId: string,
    dto: UpdateRuntimeDto
  ): Promise<{ runtime: RuntimeRecord }> {
    return this.db.transaction(async (trx) => {
      await this.requireOwnedAgent(trx, userId, seedId);
      const sealState = await getAgentSealState(trx as any, seedId);
      if (sealState?.isSealed) {
        throw new AgentImmutableException(seedId, ['runtime.hostingMode']);
      }
      await this.ensureRuntimeRow(trx, userId, seedId);

      await trx.run(
        `
          UPDATE wunderbot_runtime
             SET hosting_mode = ?,
                 updated_at = ?
           WHERE seed_id = ?
             AND owner_user_id = ?
        `,
        [dto.hostingMode, Date.now(), seedId, userId]
      );

      const row = await this.loadRuntimeRow(trx, userId, seedId);
      if (!row) {
        throw new NotFoundException(`Runtime for "${seedId}" not found.`);
      }

      return { runtime: this.mapRuntime(row) };
    });
  }

  async startRuntime(userId: string, seedId: string): Promise<{ runtime: RuntimeRecord }> {
    return this.db.transaction(async (trx) => {
      await this.requireOwnedAgent(trx, userId, seedId);
      await this.ensureRuntimeRow(trx, userId, seedId);

      const current = await trx.get<{ hosting_mode: string }>(
        'SELECT hosting_mode FROM wunderbot_runtime WHERE seed_id = ? LIMIT 1',
        [seedId]
      );
      if (current?.hosting_mode === 'self_hosted') {
        throw new BadRequestException('Cannot start a self-hosted runtime from managed controls.');
      }

      const now = Date.now();
      await trx.run(
        `
          UPDATE wunderbot_runtime
             SET status = ?,
                 started_at = ?,
                 last_error = NULL,
                 updated_at = ?
           WHERE seed_id = ?
             AND owner_user_id = ?
        `,
        ['running', now, now, seedId, userId]
      );

      const row = await this.loadRuntimeRow(trx, userId, seedId);
      if (!row) {
        throw new NotFoundException(`Runtime for "${seedId}" not found.`);
      }

      return { runtime: this.mapRuntime(row) };
    });
  }

  async stopRuntime(userId: string, seedId: string): Promise<{ runtime: RuntimeRecord }> {
    return this.db.transaction(async (trx) => {
      await this.requireOwnedAgent(trx, userId, seedId);
      await this.ensureRuntimeRow(trx, userId, seedId);

      const current = await trx.get<{ hosting_mode: string }>(
        'SELECT hosting_mode FROM wunderbot_runtime WHERE seed_id = ? LIMIT 1',
        [seedId]
      );
      if (current?.hosting_mode === 'self_hosted') {
        throw new BadRequestException('Cannot stop a self-hosted runtime from managed controls.');
      }

      const now = Date.now();
      await trx.run(
        `
          UPDATE wunderbot_runtime
             SET status = ?,
                 stopped_at = ?,
                 updated_at = ?
           WHERE seed_id = ?
             AND owner_user_id = ?
        `,
        ['stopped', now, now, seedId, userId]
      );

      const row = await this.loadRuntimeRow(trx, userId, seedId);
      if (!row) {
        throw new NotFoundException(`Runtime for "${seedId}" not found.`);
      }

      return { runtime: this.mapRuntime(row) };
    });
  }
}
