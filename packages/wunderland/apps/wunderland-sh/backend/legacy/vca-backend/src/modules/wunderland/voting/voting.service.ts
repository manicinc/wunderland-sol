/**
 * @file voting.service.ts
 * @description Injectable service for the Wunderland Voting / Governance system.
 *
 * Encapsulates business logic for proposal lifecycle management, vote
 * recording, tally computation, quorum checking, and proposal execution.
 * Will integrate with the AgentOS provenance layer for vote InputManifest
 * creation and with the {@link WunderlandGateway} for real-time tally updates.
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import {
  DuplicateVoteException,
  AgentOwnershipException,
  InsufficientLevelException,
  ProposalExpiredException,
  ProposalNotFoundException,
} from '../wunderland.exceptions.js';
import type { CastVoteDto, CreateProposalDto, ListProposalsQueryDto } from '../dto/index.js';

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

type ProposalSummary = {
  proposalId: string;
  title: string;
  description: string;
  proposalType: string;
  status: string;
  createdAt: string;
  closesAt: string;
  decidedAt?: string | null;
  minLevelToVote: number;
  quorumPercentage?: number | null;
  options: string[];
  votes: {
    for: number;
    against: number;
    abstain: number;
    total: number;
  };
  proposerSeedId: string;
};

type VoteRecord = {
  voteId: string;
  proposalId: string;
  voterSeedId: string;
  option: string;
  rationale?: string | null;
  voterLevel: number;
  votedAt: string;
};

const DEFAULT_OPTIONS = ['For', 'Against', 'Abstain'] as const;

function parseJsonOr<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return (JSON.parse(raw) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function epochToIso(ms: number | null | undefined): string {
  return new Date(typeof ms === 'number' ? ms : Date.now()).toISOString();
}

function normalizeVoteOption(option: string): 'for' | 'against' | 'abstain' {
  const normalized = String(option || '')
    .trim()
    .toLowerCase();
  if (normalized === 'for' || normalized === 'yes' || normalized === 'approve') return 'for';
  if (normalized === 'against' || normalized === 'no' || normalized === 'reject') return 'against';
  return 'abstain';
}

@Injectable()
export class VotingService {
  constructor(private readonly db: DatabaseService) {}

  async listProposals(
    query: ListProposalsQueryDto = {}
  ): Promise<PaginatedResponse<ProposalSummary>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 10)));
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: Array<string | number> = [];

    if (query.status) {
      where.push('status = ?');
      params.push(query.status);
    }
    if (query.author) {
      where.push('proposer_seed_id = ?');
      params.push(query.author);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const totalRow = await this.db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM wunderland_proposals ${whereSql}`,
      params
    );
    const total = totalRow?.count ?? 0;

    const rows = await this.db.all<any>(
      `
        SELECT
          proposal_id,
          proposer_seed_id,
          title,
          description,
          proposal_type,
          options_json,
          quorum_percentage,
          metadata,
          status,
          votes_for,
          votes_against,
          votes_abstain,
          min_level_to_vote,
          created_at,
          closes_at,
          decided_at
        FROM wunderland_proposals
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    return {
      items: rows.map((row) => this.mapProposal(row)),
      page,
      limit,
      total,
    };
  }

  async createProposal(
    userId: string,
    dto: CreateProposalDto
  ): Promise<{ proposal: ProposalSummary }> {
    const now = Date.now();
    const proposalId = this.db.generateId();
    const closesAt = now + Math.max(1, Number(dto.votingPeriodHours ?? 24)) * 60 * 60 * 1000;

    const options =
      Array.isArray(dto.options) && dto.options.length > 0 ? dto.options : [...DEFAULT_OPTIONS];
    const normalizedOptions = options.map((o) => String(o)).filter((o) => o.trim().length > 0);

    await this.db.run(
      `
        INSERT INTO wunderland_proposals (
          proposal_id,
          proposer_seed_id,
          title,
          description,
          proposal_type,
          options_json,
          quorum_percentage,
          metadata,
          status,
          votes_for,
          votes_against,
          votes_abstain,
          min_level_to_vote,
          created_at,
          closes_at,
          decided_at
        ) VALUES (
          @proposal_id,
          @proposer_seed_id,
          @title,
          @description,
          @proposal_type,
          @options_json,
          @quorum_percentage,
          @metadata,
          @status,
          0,
          0,
          0,
          @min_level_to_vote,
          @created_at,
          @closes_at,
          NULL
        )
      `,
      {
        proposal_id: proposalId,
        proposer_seed_id: userId,
        title: dto.title,
        description: dto.description,
        proposal_type: 'generic',
        options_json: JSON.stringify(normalizedOptions),
        quorum_percentage: dto.quorumPercentage ?? null,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
        status: 'open',
        min_level_to_vote: 3,
        created_at: now,
        closes_at: closesAt,
      }
    );

    const row = await this.db.get<any>(
      'SELECT * FROM wunderland_proposals WHERE proposal_id = ? LIMIT 1',
      [proposalId]
    );
    return { proposal: this.mapProposal(row) };
  }

  async getProposal(
    proposalId: string
  ): Promise<{ proposal: ProposalSummary; votes: VoteRecord[] }> {
    const row = await this.db.get<any>(
      'SELECT * FROM wunderland_proposals WHERE proposal_id = ? LIMIT 1',
      [proposalId]
    );
    if (!row) throw new ProposalNotFoundException(proposalId);

    const votes = await this.db.all<any>(
      `
        SELECT vote_id, proposal_id, voter_seed_id, vote, reasoning, voter_level, voted_at
          FROM wunderland_votes
         WHERE proposal_id = ?
         ORDER BY voted_at DESC
      `,
      [proposalId]
    );

    return {
      proposal: this.mapProposal(row),
      votes: votes.map((v) => ({
        voteId: String(v.vote_id),
        proposalId: String(v.proposal_id),
        voterSeedId: String(v.voter_seed_id),
        option: String(v.vote),
        rationale: v.reasoning ?? null,
        voterLevel: Number(v.voter_level ?? 1),
        votedAt: epochToIso(Number(v.voted_at ?? Date.now())),
      })),
    };
  }

  async castVote(
    userId: string,
    proposalId: string,
    dto: CastVoteDto
  ): Promise<{ vote: VoteRecord; proposal: ProposalSummary }> {
    const now = Date.now();

    return this.db.transaction(async (trx) => {
      const proposal = await trx.get<any>(
        'SELECT * FROM wunderland_proposals WHERE proposal_id = ? LIMIT 1',
        [proposalId]
      );
      if (!proposal) throw new ProposalNotFoundException(proposalId);

      if (proposal.status !== 'open' || Number(proposal.closes_at) <= now) {
        // Opportunistically close the proposal if expired.
        if (proposal.status === 'open' && Number(proposal.closes_at) <= now) {
          await trx.run(
            'UPDATE wunderland_proposals SET status = ?, decided_at = ? WHERE proposal_id = ?',
            ['closed', now, proposalId]
          );
        }
        throw new ProposalExpiredException(proposalId);
      }

      const citizen = await trx.get<{ level: number }>(
        'SELECT level FROM wunderland_citizens WHERE seed_id = ? LIMIT 1',
        [dto.seedId]
      );
      const level = citizen?.level ?? 1;
      const requiredLevel = Number(proposal.min_level_to_vote ?? 1);
      if (level < requiredLevel) throw new InsufficientLevelException(requiredLevel, level);

      const owned = await trx.get<{ seed_id: string }>(
        'SELECT seed_id FROM wunderland_agents WHERE seed_id = ? AND owner_user_id = ? AND status != ? LIMIT 1',
        [dto.seedId, userId, 'archived']
      );
      if (!owned) {
        throw new AgentOwnershipException(dto.seedId);
      }

      const existingVote = await trx.get<{ vote_id: string }>(
        'SELECT vote_id FROM wunderland_votes WHERE proposal_id = ? AND voter_seed_id = ? LIMIT 1',
        [proposalId, dto.seedId]
      );
      if (existingVote) throw new DuplicateVoteException(dto.seedId, proposalId);

      const voteId = this.db.generateId();
      const normalized = normalizeVoteOption(dto.option);

      await trx.run(
        `
          INSERT INTO wunderland_votes (
            vote_id,
            proposal_id,
            voter_seed_id,
            vote,
            reasoning,
            voter_level,
            voted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [voteId, proposalId, dto.seedId, normalized, dto.rationale ?? null, level, now]
      );

      if (normalized === 'for') {
        await trx.run(
          'UPDATE wunderland_proposals SET votes_for = votes_for + 1 WHERE proposal_id = ?',
          [proposalId]
        );
      } else if (normalized === 'against') {
        await trx.run(
          'UPDATE wunderland_proposals SET votes_against = votes_against + 1 WHERE proposal_id = ?',
          [proposalId]
        );
      } else {
        await trx.run(
          'UPDATE wunderland_proposals SET votes_abstain = votes_abstain + 1 WHERE proposal_id = ?',
          [proposalId]
        );
      }

      const updated = await trx.get<any>(
        'SELECT * FROM wunderland_proposals WHERE proposal_id = ? LIMIT 1',
        [proposalId]
      );

      const vote: VoteRecord = {
        voteId,
        proposalId,
        voterSeedId: dto.seedId,
        option: normalized,
        rationale: dto.rationale ?? null,
        voterLevel: level,
        votedAt: epochToIso(now),
      };

      return { vote, proposal: this.mapProposal(updated) };
    });
  }

  private mapProposal(row: any): ProposalSummary {
    const options = parseJsonOr<string[]>(row.options_json, [...DEFAULT_OPTIONS]);
    const votesFor = Number(row.votes_for ?? 0);
    const votesAgainst = Number(row.votes_against ?? 0);
    const votesAbstain = Number(row.votes_abstain ?? 0);
    return {
      proposalId: String(row.proposal_id),
      proposerSeedId: String(row.proposer_seed_id),
      title: String(row.title ?? ''),
      description: String(row.description ?? ''),
      proposalType: String(row.proposal_type ?? 'generic'),
      options,
      quorumPercentage: row.quorum_percentage ?? null,
      status: String(row.status ?? 'open'),
      createdAt: epochToIso(Number(row.created_at ?? Date.now())),
      closesAt: epochToIso(Number(row.closes_at ?? Date.now())),
      decidedAt: row.decided_at ? epochToIso(Number(row.decided_at)) : null,
      minLevelToVote: Number(row.min_level_to_vote ?? 1),
      votes: {
        for: votesFor,
        against: votesAgainst,
        abstain: votesAbstain,
        total: votesFor + votesAgainst + votesAbstain,
      },
    };
  }
}
