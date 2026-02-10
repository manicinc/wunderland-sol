/**
 * @file alliance-persistence.service.ts
 * @description Persistence adapter bridging IAlliancePersistenceAdapter to DatabaseService.
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type { IAlliancePersistenceAdapter, Alliance, AllianceProposal } from 'wunderland';

interface AllianceRow {
  alliance_id: string;
  name: string;
  description: string;
  founder_seed_id: string;
  member_seed_ids: string;
  shared_topics: string;
  status: string;
  created_at: number;
}

interface AllianceProposalRow {
  alliance_id: string;
  founder_seed_id: string;
  invited_seed_ids: string;
  config: string;
  accepted_by: string;
  status: string;
  created_at: number;
}

@Injectable()
export class AlliancePersistenceService implements IAlliancePersistenceAdapter {
  constructor(private readonly db: DatabaseService) {}

  async loadAlliances(): Promise<Alliance[]> {
    const rows = await this.db.all<AllianceRow>(
      `SELECT alliance_id, name, description, founder_seed_id, member_seed_ids, shared_topics, status, created_at
         FROM wunderland_alliances`
    );

    return rows.map((row) => ({
      allianceId: String(row.alliance_id),
      name: String(row.name),
      description: String(row.description),
      founderSeedId: String(row.founder_seed_id),
      memberSeedIds: JSON.parse(String(row.member_seed_ids || '[]')) as string[],
      sharedTopics: JSON.parse(String(row.shared_topics || '[]')) as string[],
      status: String(row.status) as Alliance['status'],
      createdAt: new Date(Number(row.created_at)).toISOString(),
    }));
  }

  async saveAlliance(alliance: Alliance): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO wunderland_alliances
        (alliance_id, name, description, founder_seed_id, member_seed_ids, shared_topics, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        alliance.allianceId,
        alliance.name,
        alliance.description,
        alliance.founderSeedId,
        JSON.stringify(alliance.memberSeedIds),
        JSON.stringify(alliance.sharedTopics),
        alliance.status,
        new Date(alliance.createdAt).getTime(),
      ]
    );
  }

  async loadProposals(status?: string): Promise<AllianceProposal[]> {
    let sql = `SELECT alliance_id, founder_seed_id, invited_seed_ids, config, accepted_by, status, created_at
                 FROM wunderland_alliance_proposals`;
    const params: string[] = [];

    if (status !== undefined) {
      sql += ` WHERE status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC`;

    const rows = await this.db.all<AllianceProposalRow>(sql, params);

    return rows.map((row) => ({
      allianceId: String(row.alliance_id),
      founderSeedId: String(row.founder_seed_id),
      invitedSeedIds: JSON.parse(String(row.invited_seed_ids || '[]')) as string[],
      config: JSON.parse(String(row.config || '{}')),
      acceptedBy: JSON.parse(String(row.accepted_by || '[]')) as string[],
      status: String(row.status) as AllianceProposal['status'],
      createdAt: new Date(Number(row.created_at)).toISOString(),
    }));
  }

  async saveProposal(proposal: AllianceProposal): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO wunderland_alliance_proposals
        (alliance_id, founder_seed_id, invited_seed_ids, config, accepted_by, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        proposal.allianceId,
        proposal.founderSeedId,
        JSON.stringify(proposal.invitedSeedIds),
        JSON.stringify(proposal.config),
        JSON.stringify(proposal.acceptedBy),
        proposal.status,
        new Date(proposal.createdAt).getTime(),
      ]
    );
  }
}
