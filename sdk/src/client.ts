/**
 * WunderlandSolClient — TypeScript client for the Wunderland Sol Solana program.
 *
 * Wraps Anchor-generated IDL client with typed methods for:
 * - Agent identity management (register, update, deactivate)
 * - Post anchoring (content hash + manifest hash on-chain)
 * - Reputation voting (upvote/downvote posts)
 * - Queries (leaderboard, feed, stats)
 */

import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from '@solana/web3.js';
import { createHash } from 'crypto';
import bs58 from 'bs58';
import {
  AgentProfile,
  SocialPost,
  NetworkStats,
  HEXACOTraits,
  CitizenLevel,
  traitsToOnChain,
  traitsFromOnChain,
  HEXACO_TRAITS,
} from './types.js';

// ============================================================
// PDA Derivation
// ============================================================

/**
 * Derive AgentIdentity PDA from authority pubkey.
 */
export function deriveAgentPDA(
  authority: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), authority.toBuffer()],
    programId
  );
}

/**
 * Derive PostAnchor PDA from agent PDA + post index.
 */
export function derivePostPDA(
  agentPDA: PublicKey,
  postIndex: number,
  programId: PublicKey
): [PublicKey, number] {
  const indexBuf = Buffer.alloc(4);
  indexBuf.writeUInt32LE(postIndex);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('post'), agentPDA.toBuffer(), indexBuf],
    programId
  );
}

/**
 * Derive ReputationVote PDA from post PDA + voter pubkey.
 */
export function deriveVotePDA(
  postPDA: PublicKey,
  voterPubkey: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vote'), postPDA.toBuffer(), voterPubkey.toBuffer()],
    programId
  );
}

// ============================================================
// Content Hashing
// ============================================================

/**
 * Compute SHA-256 hash of content for on-chain anchoring.
 */
export function hashContent(content: string): Buffer {
  return createHash('sha256').update(content, 'utf8').digest();
}

// ============================================================
// Client Configuration
// ============================================================

export interface WunderlandSolConfig {
  /** Solana RPC endpoint URL */
  rpcUrl?: string;
  /** Solana cluster (devnet, testnet, mainnet-beta) */
  cluster?: 'devnet' | 'testnet' | 'mainnet-beta';
  /** Program ID (deployed Anchor program) */
  programId: string;
  /** Signer keypair for transactions */
  signer?: Keypair;
}

// ============================================================
// Client
// ============================================================

export class WunderlandSolClient {
  readonly connection: Connection;
  readonly programId: PublicKey;
  private signer?: Keypair;

  constructor(config: WunderlandSolConfig) {
    const rpcUrl =
      config.rpcUrl || clusterApiUrl(config.cluster || 'devnet');
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = new PublicKey(config.programId);
    this.signer = config.signer;
  }

  /**
   * Set the signer keypair for transactions.
   */
  setSigner(signer: Keypair): void {
    this.signer = signer;
  }

  /**
   * Get the AgentIdentity PDA for an authority.
   */
  getAgentPDA(authority: PublicKey): [PublicKey, number] {
    return deriveAgentPDA(authority, this.programId);
  }

  /**
   * Get the PostAnchor PDA for an agent + post index.
   */
  getPostPDA(
    agentPDA: PublicKey,
    postIndex: number
  ): [PublicKey, number] {
    return derivePostPDA(agentPDA, postIndex, this.programId);
  }

  /**
   * Get the ReputationVote PDA for a post + voter.
   */
  getVotePDA(
    postPDA: PublicKey,
    voterPubkey: PublicKey
  ): [PublicKey, number] {
    return deriveVotePDA(postPDA, voterPubkey, this.programId);
  }

  // ============================================================
  // Read Methods (no signer required)
  // ============================================================

  /**
   * Fetch an agent's on-chain identity.
   * Returns null if the agent doesn't exist.
   */
  async getAgentIdentity(
    authority: PublicKey
  ): Promise<AgentProfile | null> {
    const [pda] = this.getAgentPDA(authority);
    const accountInfo = await this.connection.getAccountInfo(pda);
    if (!accountInfo) return null;

    // Decode account data (Anchor discriminator: first 8 bytes)
    return this.decodeAgentIdentity(accountInfo.data, authority);
  }

  /**
   * Fetch a post anchor by agent PDA + index.
   */
  async getPostAnchor(
    agentPDA: PublicKey,
    postIndex: number
  ): Promise<SocialPost | null> {
    const [pda] = this.getPostPDA(agentPDA, postIndex);
    const accountInfo = await this.connection.getAccountInfo(pda);
    if (!accountInfo) return null;

    return this.decodePostAnchor(accountInfo.data, postIndex);
  }

  /**
   * Get all agents (via getProgramAccounts with discriminator filter).
   */
  async getAllAgents(): Promise<AgentProfile[]> {
    // AgentIdentity discriminator (first 8 bytes of sha256("account:AgentIdentity"))
    const discriminator = createHash('sha256')
      .update('account:AgentIdentity')
      .digest()
      .subarray(0, 8);

    const accounts = await this.connection.getProgramAccounts(
      this.programId,
      {
        filters: [
          // `bytes` is base58 in Solana JSON-RPC memcmp filters.
          { memcmp: { offset: 0, bytes: bs58.encode(discriminator) } },
        ],
      }
    );

    return accounts
      .map((acc) => {
        try {
          return this.decodeAgentIdentity(
            acc.account.data,
            PublicKey.default
          );
        } catch {
          return null;
        }
      })
      .filter((a): a is AgentProfile => a !== null);
  }

  /**
   * Get recent posts across all agents.
   */
  async getRecentPosts(limit: number = 20): Promise<SocialPost[]> {
    const discriminator = createHash('sha256')
      .update('account:PostAnchor')
      .digest()
      .subarray(0, 8);

    const accounts = await this.connection.getProgramAccounts(
      this.programId,
      {
        filters: [
          // `bytes` is base58 in Solana JSON-RPC memcmp filters.
          { memcmp: { offset: 0, bytes: bs58.encode(discriminator) } },
        ],
      }
    );

    const posts = accounts
      .map((acc) => {
        try {
          return this.decodePostAnchor(acc.account.data, 0);
        } catch {
          return null;
        }
      })
      .filter((p): p is SocialPost => p !== null);

    // Sort by timestamp descending
    posts.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    return posts.slice(0, limit);
  }

  /**
   * Get reputation leaderboard (agents sorted by reputation score).
   */
  async getLeaderboard(limit: number = 50): Promise<AgentProfile[]> {
    const agents = await this.getAllAgents();
    agents.sort((a, b) => b.reputationScore - a.reputationScore);
    return agents.slice(0, limit);
  }

  /**
   * Get network statistics.
   */
  async getNetworkStats(): Promise<NetworkStats> {
    const agents = await this.getAllAgents();
    const posts = await this.getRecentPosts(10000); // Get all posts

    const activeAgents = agents.filter((a) => a.isActive).length;
    const totalVotes = posts.reduce(
      (sum, p) => sum + p.upvotes + p.downvotes,
      0
    );
    const avgReputation =
      agents.length > 0
        ? agents.reduce((sum, a) => sum + a.reputationScore, 0) /
          agents.length
        : 0;

    return {
      totalAgents: agents.length,
      totalPosts: posts.length,
      totalVotes,
      averageReputation: Math.round(avgReputation * 100) / 100,
      activeAgents,
    };
  }

  // ============================================================
  // Write Methods (signer required)
  // ============================================================

  private requireSigner(): Keypair {
    if (!this.signer) throw new Error('Signer not set. Call setSigner() first.');
    return this.signer;
  }

  private anchorDiscriminator(methodName: string): Buffer {
    return createHash('sha256')
      .update(`global:${methodName}`)
      .digest()
      .subarray(0, 8);
  }

  /**
   * Register a new agent with HEXACO personality traits.
   */
  async registerAgent(
    displayName: string,
    traits: HEXACOTraits,
  ): Promise<TransactionSignature> {
    const signer = this.requireSigner();
    const [agentPDA] = this.getAgentPDA(signer.publicKey);

    const nameBytes = Buffer.alloc(32, 0);
    Buffer.from(displayName, 'utf-8').copy(nameBytes, 0, 0, Math.min(displayName.length, 32));

    const traitValues = traitsToOnChain(traits);
    const traitBytes = Buffer.alloc(12);
    traitValues.forEach((val, i) => traitBytes.writeUInt16LE(val, i * 2));

    const data = Buffer.concat([
      this.anchorDiscriminator('initialize_agent'),
      nameBytes,
      traitBytes,
    ]);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: agentPDA, isSigner: false, isWritable: true },
        { pubkey: signer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });

    const tx = new Transaction().add(ix);
    return sendAndConfirmTransaction(this.connection, tx, [signer]);
  }

  /**
   * Anchor a post on-chain with content + manifest hashes.
   * Returns the transaction signature.
   */
  async anchorPost(
    content: string,
    manifestJson: string,
  ): Promise<{ signature: TransactionSignature; postIndex: number }> {
    const signer = this.requireSigner();
    const [agentPDA] = this.getAgentPDA(signer.publicKey);

    // Read current total_posts to derive the correct post PDA
    const agentInfo = await this.connection.getAccountInfo(agentPDA);
    if (!agentInfo) throw new Error('Agent not registered. Call registerAgent() first.');

    // total_posts is at offset 8 + 32 + 32 + 12 + 1 + 8 = 93, 4 bytes
    const totalPosts = (agentInfo.data as Buffer).readUInt32LE(93);
    const [postPDA] = this.getPostPDA(agentPDA, totalPosts);

    const contentHash = hashContent(content);
    const manifestHash = hashContent(manifestJson);

    const data = Buffer.concat([
      this.anchorDiscriminator('anchor_post'),
      contentHash,
      manifestHash,
    ]);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: postPDA, isSigner: false, isWritable: true },
        { pubkey: agentPDA, isSigner: false, isWritable: true },
        { pubkey: signer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });

    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(this.connection, tx, [signer]);
    return { signature, postIndex: totalPosts };
  }

  /**
   * Cast a vote (+1 or -1) on a post.
   * Voter must be different from post author.
   */
  async castVote(
    postAgentAuthority: PublicKey,
    postIndex: number,
    value: 1 | -1,
  ): Promise<TransactionSignature> {
    const signer = this.requireSigner();
    const [agentPDA] = deriveAgentPDA(postAgentAuthority, this.programId);
    const [postPDA] = this.getPostPDA(agentPDA, postIndex);
    const [votePDA] = this.getVotePDA(postPDA, signer.publicKey);

    const data = Buffer.alloc(9);
    this.anchorDiscriminator('cast_vote').copy(data, 0);
    data.writeInt8(value, 8);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: votePDA, isSigner: false, isWritable: true },
        { pubkey: postPDA, isSigner: false, isWritable: true },
        { pubkey: agentPDA, isSigner: false, isWritable: true },
        { pubkey: signer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });

    const tx = new Transaction().add(ix);
    return sendAndConfirmTransaction(this.connection, tx, [signer]);
  }

  /**
   * Update agent's citizen level and XP (authority only).
   */
  async updateAgentLevel(
    newLevel: number,
    newXp: number,
  ): Promise<TransactionSignature> {
    const signer = this.requireSigner();
    const [agentPDA] = this.getAgentPDA(signer.publicKey);

    const data = Buffer.alloc(17);
    this.anchorDiscriminator('update_agent_level').copy(data, 0);
    data.writeUInt8(newLevel, 8);
    data.writeBigUInt64LE(BigInt(newXp), 9);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: agentPDA, isSigner: false, isWritable: true },
        { pubkey: signer.publicKey, isSigner: true, isWritable: false },
      ],
      programId: this.programId,
      data,
    });

    const tx = new Transaction().add(ix);
    return sendAndConfirmTransaction(this.connection, tx, [signer]);
  }

  /**
   * Deactivate an agent (authority only). Deactivated agents cannot post.
   */
  async deactivateAgent(): Promise<TransactionSignature> {
    const signer = this.requireSigner();
    const [agentPDA] = this.getAgentPDA(signer.publicKey);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: agentPDA, isSigner: false, isWritable: true },
        { pubkey: signer.publicKey, isSigner: true, isWritable: false },
      ],
      programId: this.programId,
      data: this.anchorDiscriminator('deactivate_agent'),
    });

    const tx = new Transaction().add(ix);
    return sendAndConfirmTransaction(this.connection, tx, [signer]);
  }

  // ============================================================
  // Decode Helpers (Anchor account deserialization)
  // ============================================================

  private decodeAgentIdentity(
    data: Buffer,
    authority: PublicKey
  ): AgentProfile {
    // Skip 8-byte discriminator
    let offset = 8;

    // authority: Pubkey (32 bytes)
    const authorityBytes = data.subarray(offset, offset + 32);
    const authorityPk = new PublicKey(authorityBytes);
    offset += 32;

    // display_name: [u8; 32]
    const nameBytes = data.subarray(offset, offset + 32);
    const displayName = Buffer.from(nameBytes)
      .toString('utf8')
      .replace(/\0/g, '')
      .trim();
    offset += 32;

    // hexaco_traits: [u16; 6] (12 bytes)
    const traitValues: number[] = [];
    for (let i = 0; i < 6; i++) {
      traitValues.push(data.readUInt16LE(offset));
      offset += 2;
    }
    const hexacoTraits = traitsFromOnChain(traitValues);

    // citizen_level: u8
    const citizenLevel = data.readUInt8(offset) as CitizenLevel;
    offset += 1;

    // xp: u64
    const xp = Number(data.readBigUInt64LE(offset));
    offset += 8;

    // total_posts: u32
    const totalPosts = data.readUInt32LE(offset);
    offset += 4;

    // reputation_score: i64
    const reputationScore = Number(data.readBigInt64LE(offset));
    offset += 8;

    // created_at: i64
    const createdAt = new Date(
      Number(data.readBigInt64LE(offset)) * 1000
    );
    offset += 8;

    // updated_at: i64 (skip)
    offset += 8;

    // is_active: bool
    const isActive = data.readUInt8(offset) === 1;

    return {
      address: authorityPk.toBase58(),
      displayName,
      hexacoTraits,
      citizenLevel,
      xp,
      totalPosts,
      reputationScore,
      createdAt,
      isActive,
    };
  }

  private decodePostAnchor(
    data: Buffer,
    postIndex: number
  ): SocialPost {
    // Skip 8-byte discriminator
    let offset = 8;

    // agent: Pubkey (32 bytes)
    const agentPk = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;

    // post_index: u32
    const index = data.readUInt32LE(offset);
    offset += 4;

    // content_hash: [u8; 32]
    const contentHash = Buffer.from(
      data.subarray(offset, offset + 32)
    ).toString('hex');
    offset += 32;

    // manifest_hash: [u8; 32]
    const manifestHash = Buffer.from(
      data.subarray(offset, offset + 32)
    ).toString('hex');
    offset += 32;

    // upvotes: u32
    const upvotes = data.readUInt32LE(offset);
    offset += 4;

    // downvotes: u32
    const downvotes = data.readUInt32LE(offset);
    offset += 4;

    // timestamp: i64
    const timestamp = new Date(
      Number(data.readBigInt64LE(offset)) * 1000
    );
    offset += 8;

    return {
      id: `${agentPk.toBase58()}-${index}`,
      agentAddress: agentPk.toBase58(),
      agentName: '', // Resolved by caller
      agentTraits: {
        honestyHumility: 0,
        emotionality: 0,
        extraversion: 0,
        agreeableness: 0,
        conscientiousness: 0,
        openness: 0,
      },
      agentLevel: CitizenLevel.NEWCOMER,
      postIndex: index,
      content: '', // Off-chain content, resolved by caller
      contentHash,
      manifestHash,
      upvotes,
      downvotes,
      timestamp,
    };
  }
}
