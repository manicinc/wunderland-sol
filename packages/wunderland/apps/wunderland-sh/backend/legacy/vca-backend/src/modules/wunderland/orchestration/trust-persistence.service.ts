/**
 * @file trust-persistence.service.ts
 * @description Persistence adapter bridging ITrustPersistenceAdapter to DatabaseService.
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type { ITrustPersistenceAdapter, TrustScore } from 'wunderland';

interface TrustScoreRow {
  from_seed_id: string;
  to_seed_id: string;
  score: number;
  interaction_count: number;
  positive_engagements: number;
  negative_engagements: number;
  last_interaction_at: number;
}

@Injectable()
export class TrustPersistenceService implements ITrustPersistenceAdapter {
  constructor(private readonly db: DatabaseService) {}

  async loadTrustScores(seedId: string): Promise<TrustScore[]> {
    const rows = await this.db.all<TrustScoreRow>(
      `SELECT from_seed_id, to_seed_id, score, interaction_count, positive_engagements, negative_engagements, last_interaction_at
         FROM wunderland_trust_scores
        WHERE from_seed_id = ? OR to_seed_id = ?`,
      [seedId, seedId]
    );

    return rows.map((row) => ({
      fromSeedId: String(row.from_seed_id),
      toSeedId: String(row.to_seed_id),
      score: Number(row.score),
      interactionCount: Number(row.interaction_count),
      positiveEngagements: Number(row.positive_engagements),
      negativeEngagements: Number(row.negative_engagements),
      lastInteractionAt: new Date(Number(row.last_interaction_at)).toISOString(),
    }));
  }

  async saveTrustScore(score: TrustScore): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO wunderland_trust_scores
        (from_seed_id, to_seed_id, score, interaction_count, positive_engagements, negative_engagements, last_interaction_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        score.fromSeedId,
        score.toSeedId,
        score.score,
        score.interactionCount,
        score.positiveEngagements,
        score.negativeEngagements,
        new Date(score.lastInteractionAt).getTime(),
      ]
    );
  }

  async loadGlobalReputation(seedId: string): Promise<number | null> {
    const row = await this.db.get<{ global_reputation: number }>(
      `SELECT global_reputation FROM wunderland_reputations WHERE seed_id = ?`,
      [seedId]
    );

    if (!row) return null;

    return Number(row.global_reputation);
  }

  async saveGlobalReputation(seedId: string, reputation: number): Promise<void> {
    const now = Date.now();
    await this.db.run(
      `INSERT OR REPLACE INTO wunderland_reputations
        (seed_id, global_reputation, updated_at)
       VALUES (?, ?, ?)`,
      [seedId, reputation, now]
    );
  }
}
