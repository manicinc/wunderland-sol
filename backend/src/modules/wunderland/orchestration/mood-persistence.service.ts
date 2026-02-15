/**
 * @file mood-persistence.service.ts
 * @description Persistence adapter bridging IMoodPersistenceAdapter to DatabaseService.
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type { IMoodPersistenceAdapter, PADState, MoodLabel, MoodDelta } from '@wunderland/social';

@Injectable()
export class MoodPersistenceService implements IMoodPersistenceAdapter {
  constructor(private readonly db: DatabaseService) {}

  async loadMoodSnapshot(
    seedId: string
  ): Promise<{ valence: number; arousal: number; dominance: number; moodLabel: string } | null> {
    const row = await this.db.get<{
      seed_id: string;
      valence: number;
      arousal: number;
      dominance: number;
      mood_label: string;
      updated_at: string;
    }>(
      `SELECT seed_id, valence, arousal, dominance, mood_label, updated_at
         FROM wunderbot_moods
        WHERE seed_id = ?`,
      [seedId]
    );

    if (!row) return null;

    return {
      valence: Number(row.valence),
      arousal: Number(row.arousal),
      dominance: Number(row.dominance),
      moodLabel: String(row.mood_label),
    };
  }

  async saveMoodSnapshot(seedId: string, state: PADState, label: MoodLabel): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO wunderbot_moods
        (seed_id, valence, arousal, dominance, mood_label, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(seed_id) DO UPDATE SET
         valence = excluded.valence,
         arousal = excluded.arousal,
         dominance = excluded.dominance,
         mood_label = excluded.mood_label,
         updated_at = excluded.updated_at`,
      [seedId, state.valence, state.arousal, state.dominance, label, now],
    );
  }

  async appendMoodDelta(
    seedId: string,
    delta: MoodDelta,
    resultState: PADState,
    label: MoodLabel
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO wunderbot_mood_history
        (
          entry_id,
          seed_id,
          valence,
          arousal,
          dominance,
          trigger_type,
          trigger_entity_id,
          delta_valence,
          delta_arousal,
          delta_dominance,
          created_at
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        this.db.generateId(),
        seedId,
        resultState.valence,
        resultState.arousal,
        resultState.dominance,
        delta.trigger,
        null,
        delta.valence,
        delta.arousal,
        delta.dominance,
        now,
      ]
    );
  }

  async loadRecentDeltas(seedId: string, limit: number): Promise<MoodDelta[]> {
    const rows = await this.db.all<{
      trigger_type: string | null;
      delta_valence: number;
      delta_arousal: number;
      delta_dominance: number;
    }>(
      `SELECT trigger_type, delta_valence, delta_arousal, delta_dominance
         FROM wunderbot_mood_history
        WHERE seed_id = ?
        ORDER BY created_at DESC
        LIMIT ?`,
      [seedId, limit]
    );

    return rows.map((row) => ({
      valence: Number(row.delta_valence),
      arousal: Number(row.delta_arousal),
      dominance: Number(row.delta_dominance),
      trigger: String(row.trigger_type ?? 'unknown'),
    }));
  }
}
