/**
 * @file citizens.service.ts
 * @description Injectable service for the Wunderland Citizens system.
 *
 * Encapsulates business logic for leaderboard computation, reputation
 * scoring, and citizen profile aggregation. Will integrate with the
 * {@link AgentRegistryService} for agent metadata and the
 * {@link SocialFeedService} for activity statistics.
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { AgentNotFoundException } from '../wunderland.exceptions.js';
import type { ListCitizensQueryDto } from '../dto/index.js';

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

type CitizenSummary = {
  seedId: string;
  displayName: string;
  bio: string;
  avatarUrl?: string | null;
  status: string;
  level: number;
  xp: number;
  totalPosts: number;
  joinedAt: string;
  provenanceEnabled: boolean;
};

@Injectable()
export class CitizensService {
  constructor(private readonly db: DatabaseService) {}

  async listCitizens(query: ListCitizensQueryDto = {}): Promise<PaginatedResponse<CitizenSummary>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 25)));
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: Array<string | number> = [];

    if (query.minLevel) {
      where.push('c.level >= ?');
      params.push(Number(query.minLevel));
    }

    where.push("a.status != 'archived'");

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const totalRow = await this.db.get<{ count: number }>(
      `SELECT COUNT(1) as count
         FROM wunderland_citizens c
         JOIN wunderland_agents a ON a.seed_id = c.seed_id
         ${whereSql}
      `,
      params
    );
    const total = totalRow?.count ?? 0;

    const sort = query.sort ?? 'xp';
    const orderSql =
      sort === 'level'
        ? 'ORDER BY c.level DESC, c.xp DESC'
        : sort === 'posts'
          ? 'ORDER BY c.total_posts DESC, c.xp DESC'
          : sort === 'recent'
            ? 'ORDER BY c.joined_at DESC'
            : 'ORDER BY c.xp DESC, c.level DESC';

    const rows = await this.db.all<any>(
      `
        SELECT
          c.seed_id,
          c.level,
          c.xp,
          c.total_posts,
          c.joined_at,
          a.display_name,
          a.bio,
          a.avatar_url,
          a.status,
          a.provenance_enabled
        FROM wunderland_citizens c
        JOIN wunderland_agents a ON a.seed_id = c.seed_id
        ${whereSql}
        ${orderSql}
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    return {
      items: rows.map((row) => ({
        seedId: String(row.seed_id),
        displayName: String(row.display_name ?? row.seed_id),
        bio: String(row.bio ?? ''),
        avatarUrl: row.avatar_url ?? null,
        status: String(row.status ?? 'active'),
        level: Number(row.level ?? 1),
        xp: Number(row.xp ?? 0),
        totalPosts: Number(row.total_posts ?? 0),
        joinedAt: new Date(Number(row.joined_at ?? Date.now())).toISOString(),
        provenanceEnabled: Boolean(row.provenance_enabled),
      })),
      page,
      limit,
      total,
    };
  }

  async getCitizenProfile(seedId: string): Promise<{ citizen: CitizenSummary }> {
    const row = await this.db.get<any>(
      `
        SELECT
          c.seed_id,
          c.level,
          c.xp,
          c.total_posts,
          c.joined_at,
          a.display_name,
          a.bio,
          a.avatar_url,
          a.status,
          a.provenance_enabled
        FROM wunderland_citizens c
        JOIN wunderland_agents a ON a.seed_id = c.seed_id
        WHERE c.seed_id = ? LIMIT 1
      `,
      [seedId]
    );
    if (!row) throw new AgentNotFoundException(seedId);
    return {
      citizen: {
        seedId: String(row.seed_id),
        displayName: String(row.display_name ?? row.seed_id),
        bio: String(row.bio ?? ''),
        avatarUrl: row.avatar_url ?? null,
        status: String(row.status ?? 'active'),
        level: Number(row.level ?? 1),
        xp: Number(row.xp ?? 0),
        totalPosts: Number(row.total_posts ?? 0),
        joinedAt: new Date(Number(row.joined_at ?? Date.now())).toISOString(),
        provenanceEnabled: Boolean(row.provenance_enabled),
      },
    };
  }
}
