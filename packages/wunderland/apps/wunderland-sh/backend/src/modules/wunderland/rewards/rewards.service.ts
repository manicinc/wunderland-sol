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
import { PublicKey } from '@solana/web3.js';
import { WunderlandSolService } from '../wunderland-sol/wunderland-sol.service.js';

// ── Merkle tree ─────────────────────────────────────────────────────────────

const MERKLE_DOMAIN = Buffer.from('WUNDERLAND_REWARDS_V1', 'utf8');

/**
 * Sentinel `RewardsEpoch.enclave` used by the on-chain program to represent
 * GlobalTreasury-funded (global) rewards epochs.
 *
 * Matches `system_program::ID` on-chain.
 */
export const GLOBAL_REWARDS_ENCLAVE_PDA = '11111111111111111111111111111111';

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
  // Positional hashing (matches on-chain verify_merkle_proof ordering).
  return createHash('sha256').update(left).update(right).digest();
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

  constructor(
    private readonly db: DatabaseService,
    private readonly solService: WunderlandSolService,
  ) {}

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

    // Resolve seed_id → Solana AgentIdentity PDA.
    //
    // Notes:
    // - `seed_id` is an off-chain Wunderland/AgentOS identifier (not necessarily a Pubkey).
    // - For on-chain settlement, we need the AgentIdentity PDA; we map via the Solana integration agent map.
    const entries: Array<{ agentPda: string; score: number }> = [];
    for (const [seedId, score] of scoreMap) {
      if (score <= 0) continue;

      let agentPda = await this.solService.getAgentIdentityPda(seedId);

      // Optional fallback: allow `seed_id` to be the AgentIdentity PDA itself.
      if (!agentPda) {
        try {
          agentPda = new PublicKey(seedId).toBase58();
        } catch {
          agentPda = null;
        }
      }

      if (agentPda) {
        entries.push({ agentPda, score });
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

    // Proportional distribution (floor division), dropping zero-amount leaves
    // since on-chain `claim_rewards` requires `amount > 0`.
    const leaves: RewardLeaf[] = [];
    for (const c of opts.contributions) {
      const amount = (opts.totalAmountLamports * BigInt(c.score)) / BigInt(totalScore);
      if (amount <= 0n) continue;
      leaves.push({
        index: leaves.length,
        agentPda: c.agentPda,
        amount,
      });
    }

    if (leaves.length === 0) {
      throw new Error('All computed reward amounts were zero; increase totalAmountLamports or scoring.');
    }

    // Ensure the full escrow amount is claimable by allocating any rounding remainder.
    // This prevents lamports from being permanently stuck when `claim_window_seconds == 0` (no sweep).
    const allocated = leaves.reduce((sum, l) => sum + l.amount, 0n);
    const remainder = opts.totalAmountLamports - allocated;
    if (remainder > 0n) {
      leaves[0].amount += remainder;
    }

    const enclavePdaBuf = new PublicKey(opts.enclavePda).toBuffer();
    const leafBuffers = leaves.map((l) =>
      hashLeaf(
        enclavePdaBuf,
        opts.epochNumber,
        l.index,
        new PublicKey(l.agentPda).toBuffer(),
        l.amount,
      ),
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
   * List GlobalTreasury-funded epochs (enclave sentinel = System Program).
   */
  async listGlobalEpochs(): Promise<any[]> {
    return this.listEpochs(GLOBAL_REWARDS_ENCLAVE_PDA);
  }

  private async getNextEpochNumberForEnclave(enclavePda: string): Promise<bigint> {
    const row = await this.db.get<{ max_epoch: string | null }>(
      `
        SELECT MAX(CAST(epoch_number AS INTEGER)) as max_epoch
          FROM wunderland_reward_epochs
         WHERE enclave_pda = ?
      `,
      [enclavePda],
    );

    const maxEpoch = row?.max_epoch && String(row.max_epoch).trim() ? BigInt(row.max_epoch) : 0n;
    return maxEpoch + 1n;
  }

  /**
   * Generate a global rewards epoch (Merkle tree) in the local DB.
   *
   * Publishing to Solana is a separate step (see `publishGlobalEpoch`).
   */
  async generateGlobalEpoch(opts: {
    epochNumber?: bigint;
    totalAmountLamports: bigint;
    sinceTimestampMs?: number;
    untilTimestampMs?: number;
  }): Promise<{
    epochId: string;
    merkleRoot: string;
    leaves: RewardLeaf[];
    totalAmount: string;
    epochNumber: string;
    enclavePda: string;
  }> {
    const now = Date.now();
    const untilTimestampMs =
      typeof opts.untilTimestampMs === 'number' && Number.isFinite(opts.untilTimestampMs)
        ? Math.floor(opts.untilTimestampMs)
        : now;

    const sinceTimestampMs =
      typeof opts.sinceTimestampMs === 'number' && Number.isFinite(opts.sinceTimestampMs)
        ? Math.floor(opts.sinceTimestampMs)
        : untilTimestampMs - 24 * 60 * 60_000;

    const epochNumber =
      opts.epochNumber != null
        ? BigInt(opts.epochNumber)
        : await this.getNextEpochNumberForEnclave(GLOBAL_REWARDS_ENCLAVE_PDA);

    const totalAmountLamports = BigInt(opts.totalAmountLamports);
    if (totalAmountLamports <= 0n) throw new Error('totalAmountLamports must be > 0');

    const contributions = await this.computeContributions(
      GLOBAL_REWARDS_ENCLAVE_PDA,
      sinceTimestampMs,
      untilTimestampMs,
    );

    const generated = await this.generateEpoch({
      enclavePda: GLOBAL_REWARDS_ENCLAVE_PDA,
      epochNumber,
      totalAmountLamports,
      contributions,
    });

    return {
      ...generated,
      epochNumber: epochNumber.toString(),
      enclavePda: GLOBAL_REWARDS_ENCLAVE_PDA,
    };
  }

  /**
   * Publish a previously generated global rewards epoch to Solana and mark it published locally.
   */
  async publishGlobalEpoch(opts: {
    epochId: string;
    claimWindowSeconds?: bigint;
  }): Promise<{ success: boolean; signature?: string; rewardsEpochPda?: string; error?: string }> {
    const epoch = await this.db.get<EpochRow>(
      'SELECT * FROM wunderland_reward_epochs WHERE epoch_id = ? LIMIT 1',
      [opts.epochId],
    );

    if (!epoch) {
      return { success: false, error: `Epoch "${opts.epochId}" not found.` };
    }

    if (epoch.enclave_pda !== GLOBAL_REWARDS_ENCLAVE_PDA) {
      return { success: false, error: 'Epoch is not a global rewards epoch.' };
    }

    if (epoch.status === 'published' && epoch.sol_tx_signature && epoch.rewards_epoch_pda) {
      return {
        success: true,
        signature: epoch.sol_tx_signature,
        rewardsEpochPda: epoch.rewards_epoch_pda,
      };
    }

    const epochNumber = BigInt(epoch.epoch_number);
    const amountLamports = BigInt(epoch.total_amount);
    const merkleRootHex = String(epoch.merkle_root_hex ?? '').trim().toLowerCase();

    const res = await this.solService.publishGlobalRewardsEpoch({
      epoch: epochNumber,
      merkleRootHex,
      amountLamports,
      claimWindowSeconds: opts.claimWindowSeconds ?? 0n,
    });

    if (!res.success) {
      return { success: false, error: res.error ?? 'Failed to publish epoch' };
    }

    await this.markPublished(opts.epochId, res.signature!, res.rewardsEpochPda!);
    return { success: true, signature: res.signature, rewardsEpochPda: res.rewardsEpochPda };
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
