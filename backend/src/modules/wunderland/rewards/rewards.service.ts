/**
 * @file rewards.service.ts
 * @description Service for managing epoch-based reward distributions.
 *
 * Generates Merkle trees from contribution scores, stores epochs locally,
 * and provides claim proof data to agents.
 *
 * Revenue flow:
 *   Tips → TipEscrow → settle_tip → 70% GlobalTreasury + 30% EnclaveTreasury
 *   EnclaveTreasury → publish_rewards_epoch → RewardsEpoch (Merkle escrow)
 *   RewardsEpoch → claim_rewards → AgentVault (per-agent)
 *   AgentVault → withdraw_from_vault → Agent owner wallet
 */

import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';

// ── Merkle tree ─────────────────────────────────────────────────────────────

const MERKLE_DOMAIN = Buffer.from('WUNDERLAND_REWARDS_V1', 'utf8');

type RewardLeaf = {
  index: number;
  agentPda: string;
  amount: bigint;
};

type MerkleTreeResult = {
  root: Buffer;
  leaves: Buffer[];
  proofs: Buffer[][];
};

function hashLeaf(
  enclavePda: Buffer,
  epoch: bigint,
  index: number,
  agentPda: Buffer,
  amount: bigint,
): Buffer {
  const epochBuf = Buffer.alloc(8);
  epochBuf.writeBigUInt64LE(epoch);
  const indexBuf = Buffer.alloc(4);
  indexBuf.writeUInt32LE(index);
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(amount);

  return createHash('sha256')
    .update(MERKLE_DOMAIN)
    .update(enclavePda)
    .update(epochBuf)
    .update(indexBuf)
    .update(agentPda)
    .update(amountBuf)
    .digest();
}

function hashPair(left: Buffer, right: Buffer): Buffer {
  // Canonical ordering: smaller bytes first
  const [a, b] = Buffer.compare(left, right) <= 0 ? [left, right] : [right, left];
  return createHash('sha256').update(a).update(b).digest();
}

function buildMerkleTree(leaves: Buffer[]): MerkleTreeResult {
  if (leaves.length === 0) {
    const empty = Buffer.alloc(32);
    return { root: empty, leaves: [], proofs: [] };
  }

  // Pad to power of 2
  const padded = [...leaves];
  while (padded.length & (padded.length - 1)) {
    padded.push(Buffer.alloc(32));
  }

  // Build tree layers
  const layers: Buffer[][] = [padded];
  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1];
    const next: Buffer[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      next.push(hashPair(prev[i], prev[i + 1]));
    }
    layers.push(next);
  }

  const root = layers[layers.length - 1][0];

  // Generate proofs for each original leaf
  const proofs: Buffer[][] = [];
  for (let leafIdx = 0; leafIdx < leaves.length; leafIdx++) {
    const proof: Buffer[] = [];
    let idx = leafIdx;
    for (let layer = 0; layer < layers.length - 1; layer++) {
      const sibling = idx % 2 === 0 ? idx + 1 : idx - 1;
      if (sibling < layers[layer].length) {
        proof.push(layers[layer][sibling]);
      }
      idx = Math.floor(idx / 2);
    }
    proofs.push(proof);
  }

  return { root, leaves, proofs };
}

// ── DB row types ────────────────────────────────────────────────────────────

type EpochRow = {
  epoch_id: string;
  enclave_pda: string;
  epoch_number: string;
  merkle_root_hex: string;
  total_amount: string;
  leaf_count: number;
  leaves_json: string;
  proofs_json: string;
  status: string;
  sol_tx_signature: string | null;
  rewards_epoch_pda: string | null;
  published_at: number | null;
  created_at: number;
};

// ── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Compute contribution scores for agents in an enclave based on
   * posts, comments, votes, and tips received during a time window.
   */
  async computeContributions(
    enclavePda: string,
    sinceTimestamp: number,
    untilTimestamp: number,
  ): Promise<Array<{ agentPda: string; score: number }>> {
    // Score = posts*10 + comments*5 + upvotes*2 + tips*1
    // This is a placeholder scoring model — can be made more sophisticated
    const posts = await this.db.all<{ seed_id: string; cnt: number }>(
      `SELECT seed_id, COUNT(*) as cnt FROM wunderland_posts
       WHERE status = 'published' AND published_at >= ? AND published_at <= ?
       GROUP BY seed_id`,
      [sinceTimestamp, untilTimestamp],
    );

    const comments = await this.db.all<{ seed_id: string; cnt: number }>(
      `SELECT seed_id, COUNT(*) as cnt FROM wunderland_comments
       WHERE status = 'active' AND created_at >= datetime(?, 'unixepoch') AND created_at <= datetime(?, 'unixepoch')
       GROUP BY seed_id`,
      [Math.floor(sinceTimestamp / 1000), Math.floor(untilTimestamp / 1000)],
    );

    // Aggregate scores
    const scoreMap = new Map<string, number>();

    for (const p of posts) {
      scoreMap.set(p.seed_id, (scoreMap.get(p.seed_id) ?? 0) + p.cnt * 10);
    }
    for (const c of comments) {
      scoreMap.set(c.seed_id, (scoreMap.get(c.seed_id) ?? 0) + c.cnt * 5);
    }

    // Resolve seed_id → agent identity PDA (stored in wunderbots)
    const entries: Array<{ agentPda: string; score: number }> = [];
    for (const [seedId, score] of scoreMap) {
      if (score <= 0) continue;
      const agent = await this.db.get<{ sol_identity_pda: string }>(
        'SELECT sol_identity_pda FROM wunderbots WHERE seed_id = ? LIMIT 1',
        [seedId],
      );
      if (agent?.sol_identity_pda) {
        entries.push({ agentPda: agent.sol_identity_pda, score });
      }
    }

    return entries.sort((a, b) => b.score - a.score);
  }

  /**
   * Generate a Merkle tree for reward distribution and store the epoch locally.
   * Returns the epoch data needed to call publish_rewards_epoch on-chain.
   */
  async generateEpoch(opts: {
    enclavePda: string;
    epochNumber: bigint;
    totalAmountLamports: bigint;
    contributions: Array<{ agentPda: string; score: number }>;
  }): Promise<{
    epochId: string;
    merkleRoot: string;
    leaves: RewardLeaf[];
    totalAmount: string;
  }> {
    const totalScore = opts.contributions.reduce((sum, c) => sum + c.score, 0);
    if (totalScore === 0) {
      throw new Error('No contributions to distribute.');
    }

    // Proportional distribution
    const leaves: RewardLeaf[] = opts.contributions.map((c, index) => ({
      index,
      agentPda: c.agentPda,
      amount: (opts.totalAmountLamports * BigInt(c.score)) / BigInt(totalScore),
    }));

    const enclavePdaBuf = Buffer.from(opts.enclavePda, 'utf8');
    const leafBuffers = leaves.map((l) =>
      hashLeaf(enclavePdaBuf, opts.epochNumber, l.index, Buffer.from(l.agentPda, 'utf8'), l.amount),
    );

    const tree = buildMerkleTree(leafBuffers);

    const epochId = this.db.generateId();
    const now = Date.now();

    await this.db.run(
      `INSERT INTO wunderland_reward_epochs (
        epoch_id, enclave_pda, epoch_number, merkle_root_hex, total_amount,
        leaf_count, leaves_json, proofs_json, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'generated', ?)`,
      [
        epochId,
        opts.enclavePda,
        opts.epochNumber.toString(),
        tree.root.toString('hex'),
        opts.totalAmountLamports.toString(),
        leaves.length,
        JSON.stringify(leaves.map((l) => ({ ...l, amount: l.amount.toString() }))),
        JSON.stringify(tree.proofs.map((p) => p.map((b) => b.toString('hex')))),
        now,
      ],
    );

    return {
      epochId,
      merkleRoot: tree.root.toString('hex'),
      leaves,
      totalAmount: opts.totalAmountLamports.toString(),
    };
  }

  /**
   * Get claim proof for an agent in a specific epoch.
   */
  async getClaimProof(epochId: string, agentPda: string): Promise<{
    index: number;
    amount: string;
    proof: string[];
    merkleRoot: string;
    enclavePda: string;
    epochNumber: string;
  } | null> {
    const epoch = await this.db.get<EpochRow>(
      'SELECT * FROM wunderland_reward_epochs WHERE epoch_id = ? LIMIT 1',
      [epochId],
    );
    if (!epoch) return null;

    const leaves: Array<{ index: number; agentPda: string; amount: string }> =
      JSON.parse(epoch.leaves_json);
    const proofs: string[][] = JSON.parse(epoch.proofs_json);

    const leafIdx = leaves.findIndex((l) => l.agentPda === agentPda);
    if (leafIdx === -1) return null;

    return {
      index: leaves[leafIdx].index,
      amount: leaves[leafIdx].amount,
      proof: proofs[leafIdx] ?? [],
      merkleRoot: epoch.merkle_root_hex,
      enclavePda: epoch.enclave_pda,
      epochNumber: epoch.epoch_number,
    };
  }

  /**
   * List epochs for an enclave.
   */
  async listEpochs(enclavePda: string): Promise<any[]> {
    return this.db.all<EpochRow>(
      'SELECT * FROM wunderland_reward_epochs WHERE enclave_pda = ? ORDER BY created_at DESC',
      [enclavePda],
    );
  }

  /**
   * Mark an epoch as published on-chain.
   */
  async markPublished(epochId: string, txSig: string, rewardsEpochPda: string): Promise<void> {
    await this.db.run(
      `UPDATE wunderland_reward_epochs
          SET status = 'published', sol_tx_signature = ?, rewards_epoch_pda = ?, published_at = ?
        WHERE epoch_id = ?`,
      [txSig, rewardsEpochPda, Date.now(), epochId],
    );
  }
}
