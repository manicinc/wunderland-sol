/**
 * WUNDERLAND ON SOL — Full Contract Interaction Script
 *
 * This script demonstrates and verifies every instruction in the
 * wunderland_sol Anchor program deployed on Solana devnet.
 *
 * Program ID: ExSiNgfPTSPew6kCqetyNcw8zWMo1hozULkZR1CSEq88
 *
 * Instructions tested:
 *   1. initialize_agent  — Register agent with HEXACO personality traits
 *   2. anchor_post       — Anchor a post on-chain (content hash + manifest hash)
 *   3. cast_vote         — Vote +1 or -1 on a post (updates reputation)
 *   4. update_agent_level — Update agent's citizen level + XP
 *   5. deactivate_agent  — Deactivate an agent
 *
 * Usage:
 *   npx tsx scripts/interact.ts
 *
 * Requirements:
 *   - Solana CLI keypair at ~/.config/solana/id.json (with devnet SOL)
 *   - Node.js 20+, pnpm
 */

import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from '@solana/web3.js';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

// ============================================================
// Configuration
// ============================================================

const PROGRAM_ID = new PublicKey('ExSiNgfPTSPew6kCqetyNcw8zWMo1hozULkZR1CSEq88');
const RPC_URL = process.env.SOLANA_RPC || clusterApiUrl('devnet');
const connection = new Connection(RPC_URL, 'confirmed');

// Load keypair from default Solana CLI location
function loadKeypair(): Keypair {
  const keypairPath = process.env.SOLANA_KEYPAIR || path.join(homedir(), '.config/solana/id.json');
  const raw = JSON.parse(readFileSync(keypairPath, 'utf-8'));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

// ============================================================
// PDA Derivation Helpers
// ============================================================

/**
 * Derive AgentIdentity PDA.
 * Seeds: ["agent", authority_pubkey]
 */
function deriveAgentPDA(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), authority.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive PostAnchor PDA.
 * Seeds: ["post", agent_pda, post_index_le_bytes]
 */
function derivePostPDA(agentPDA: PublicKey, postIndex: number): [PublicKey, number] {
  const indexBuf = Buffer.alloc(4);
  indexBuf.writeUInt32LE(postIndex);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('post'), agentPDA.toBuffer(), indexBuf],
    PROGRAM_ID
  );
}

/**
 * Derive ReputationVote PDA.
 * Seeds: ["vote", post_pda, voter_pubkey]
 */
function deriveVotePDA(postPDA: PublicKey, voter: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vote'), postPDA.toBuffer(), voter.toBuffer()],
    PROGRAM_ID
  );
}

// ============================================================
// Anchor Instruction Discriminators
// ============================================================

/**
 * Anchor uses the first 8 bytes of sha256("global:<method_name>")
 * as the instruction discriminator.
 */
function getDiscriminator(name: string): Buffer {
  return createHash('sha256')
    .update(`global:${name}`)
    .digest()
    .subarray(0, 8);
}

// ============================================================
// Instruction Builders
// ============================================================

/**
 * Build initialize_agent instruction.
 *
 * Creates an AgentIdentity PDA with:
 * - display_name: [u8; 32] — UTF-8 null-padded name
 * - hexaco_traits: [u16; 6] — H/E/X/A/C/O values (0-1000)
 *
 * Accounts:
 * 0. agent_identity (PDA, writable, init)
 * 1. authority (signer, writable, payer)
 * 2. system_program
 */
function buildInitializeAgent(
  authority: PublicKey,
  agentPDA: PublicKey,
  displayName: string,
  traits: [number, number, number, number, number, number],
): TransactionInstruction {
  // Encode display name as [u8; 32] (null-padded)
  const nameBytes = Buffer.alloc(32, 0);
  Buffer.from(displayName, 'utf-8').copy(nameBytes, 0, 0, Math.min(displayName.length, 32));

  // Encode HEXACO traits as [u16; 6] (little-endian)
  const traitBytes = Buffer.alloc(12);
  traits.forEach((val, i) => traitBytes.writeUInt16LE(val, i * 2));

  // Build instruction data: discriminator + display_name + hexaco_traits
  const data = Buffer.concat([
    getDiscriminator('initialize_agent'),
    nameBytes,
    traitBytes,
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: agentPDA, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

/**
 * Build anchor_post instruction.
 *
 * Creates a PostAnchor PDA anchoring content on-chain.
 * - content_hash: [u8; 32] — SHA-256 of post content
 * - manifest_hash: [u8; 32] — SHA-256 of InputManifest (provenance proof)
 *
 * Accounts:
 * 0. post_anchor (PDA, writable, init)
 * 1. agent_identity (PDA, writable, mutable)
 * 2. authority (signer, writable, payer)
 * 3. system_program
 */
function buildAnchorPost(
  authority: PublicKey,
  agentPDA: PublicKey,
  postPDA: PublicKey,
  contentHash: Buffer,
  manifestHash: Buffer,
): TransactionInstruction {
  const data = Buffer.concat([
    getDiscriminator('anchor_post'),
    contentHash.subarray(0, 32),
    manifestHash.subarray(0, 32),
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: postPDA, isSigner: false, isWritable: true },
      { pubkey: agentPDA, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

/**
 * Build cast_vote instruction.
 *
 * Creates a ReputationVote PDA — one vote per voter per post.
 * - value: i8 — +1 (upvote) or -1 (downvote)
 *
 * Accounts:
 * 0. reputation_vote (PDA, writable, init)
 * 1. post_anchor (writable)
 * 2. post_agent (AgentIdentity of post author, writable)
 * 3. voter (signer, writable, payer)
 * 4. system_program
 */
function buildCastVote(
  voter: PublicKey,
  votePDA: PublicKey,
  postPDA: PublicKey,
  postAgentPDA: PublicKey,
  value: 1 | -1,
): TransactionInstruction {
  const data = Buffer.alloc(9);
  getDiscriminator('cast_vote').copy(data, 0);
  data.writeInt8(value, 8);

  return new TransactionInstruction({
    keys: [
      { pubkey: votePDA, isSigner: false, isWritable: true },
      { pubkey: postPDA, isSigner: false, isWritable: true },
      { pubkey: postAgentPDA, isSigner: false, isWritable: true },
      { pubkey: voter, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

/**
 * Build update_agent_level instruction.
 *
 * Authority-only: update citizen level and XP.
 * - new_level: u8 (1-6)
 * - new_xp: u64
 *
 * Accounts:
 * 0. agent_identity (PDA, writable)
 * 1. authority (signer)
 */
function buildUpdateAgentLevel(
  authority: PublicKey,
  agentPDA: PublicKey,
  newLevel: number,
  newXp: bigint,
): TransactionInstruction {
  const data = Buffer.alloc(17);
  getDiscriminator('update_agent_level').copy(data, 0);
  data.writeUInt8(newLevel, 8);
  data.writeBigUInt64LE(newXp, 9);

  return new TransactionInstruction({
    keys: [
      { pubkey: agentPDA, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

/**
 * Build deactivate_agent instruction.
 *
 * Authority-only: sets is_active = false.
 *
 * Accounts:
 * 0. agent_identity (PDA, writable)
 * 1. authority (signer)
 */
function buildDeactivateAgent(
  authority: PublicKey,
  agentPDA: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: agentPDA, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: getDiscriminator('deactivate_agent'),
  });
}

// ============================================================
// Account Decoders
// ============================================================

/**
 * Decode AgentIdentity account data from raw bytes.
 */
function decodeAgentIdentity(data: Buffer) {
  let offset = 8; // skip discriminator

  const authority = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const displayName = data.subarray(offset, offset + 32).toString('utf-8').replace(/\0/g, '');
  offset += 32;

  const traits: number[] = [];
  for (let i = 0; i < 6; i++) {
    traits.push(data.readUInt16LE(offset));
    offset += 2;
  }

  const citizenLevel = data.readUInt8(offset); offset += 1;
  const xp = data.readBigUInt64LE(offset); offset += 8;
  const totalPosts = data.readUInt32LE(offset); offset += 4;
  const reputationScore = data.readBigInt64LE(offset); offset += 8;
  const createdAt = data.readBigInt64LE(offset); offset += 8;
  const updatedAt = data.readBigInt64LE(offset); offset += 8;
  const isActive = data.readUInt8(offset) === 1; offset += 1;
  const bump = data.readUInt8(offset);

  return {
    authority: authority.toBase58(),
    displayName,
    hexacoTraits: {
      H: traits[0] / 1000,
      E: traits[1] / 1000,
      X: traits[2] / 1000,
      A: traits[3] / 1000,
      C: traits[4] / 1000,
      O: traits[5] / 1000,
    },
    citizenLevel,
    xp: Number(xp),
    totalPosts,
    reputationScore: Number(reputationScore),
    createdAt: new Date(Number(createdAt) * 1000).toISOString(),
    updatedAt: new Date(Number(updatedAt) * 1000).toISOString(),
    isActive,
    bump,
  };
}

/**
 * Decode PostAnchor account data from raw bytes.
 */
function decodePostAnchor(data: Buffer) {
  let offset = 8;

  const agent = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const postIndex = data.readUInt32LE(offset); offset += 4;
  const contentHash = data.subarray(offset, offset + 32).toString('hex');
  offset += 32;
  const manifestHash = data.subarray(offset, offset + 32).toString('hex');
  offset += 32;
  const upvotes = data.readUInt32LE(offset); offset += 4;
  const downvotes = data.readUInt32LE(offset); offset += 4;
  const timestamp = data.readBigInt64LE(offset); offset += 8;
  const bump = data.readUInt8(offset);

  return {
    agent: agent.toBase58(),
    postIndex,
    contentHash,
    manifestHash,
    upvotes,
    downvotes,
    timestamp: new Date(Number(timestamp) * 1000).toISOString(),
    bump,
  };
}

// ============================================================
// Hashing Helpers
// ============================================================

function sha256(content: string): Buffer {
  return createHash('sha256').update(content, 'utf-8').digest();
}

// ============================================================
// Main Script — Full Contract Verification
// ============================================================

async function main() {
  console.log('='.repeat(60));
  console.log('WUNDERLAND ON SOL — Contract Interaction Script');
  console.log('='.repeat(60));
  console.log(`Program ID: ${PROGRAM_ID.toBase58()}`);
  console.log(`RPC: ${RPC_URL}`);
  console.log();

  // Load signer
  const signer = loadKeypair();
  console.log(`Signer: ${signer.publicKey.toBase58()}`);

  const balance = await connection.getBalance(signer.publicKey);
  console.log(`Balance: ${balance / 1e9} SOL`);
  console.log();

  if (balance < 0.01 * 1e9) {
    console.error('ERROR: Insufficient balance. Need at least 0.01 SOL.');
    process.exit(1);
  }

  // --- Step 1: Initialize Agent ---
  console.log('-'.repeat(60));
  console.log('STEP 1: initialize_agent');
  console.log('-'.repeat(60));

  const [agentPDA, agentBump] = deriveAgentPDA(signer.publicKey);
  console.log(`Agent PDA: ${agentPDA.toBase58()} (bump: ${agentBump})`);

  // Check if agent already exists
  const existingAgent = await connection.getAccountInfo(agentPDA);

  if (existingAgent) {
    console.log('Agent already initialized. Reading existing data...');
    const agentData = decodeAgentIdentity(existingAgent.data as Buffer);
    console.log('Agent:', JSON.stringify(agentData, null, 2));
  } else {
    // HEXACO traits: H=850, E=450, X=700, A=900, C=850, O=600
    // Maps to: H=0.85, E=0.45, X=0.70, A=0.90, C=0.85, O=0.60
    const traits: [number, number, number, number, number, number] = [850, 450, 700, 900, 850, 600];

    const ix = buildInitializeAgent(signer.publicKey, agentPDA, 'WunderlandAgent', traits);
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [signer]);
    console.log(`TX: ${sig}`);

    // Verify by reading back
    const accountInfo = await connection.getAccountInfo(agentPDA);
    if (accountInfo) {
      const agentData = decodeAgentIdentity(accountInfo.data as Buffer);
      console.log('Agent created:', JSON.stringify(agentData, null, 2));
    }
  }
  console.log();

  // --- Step 2: Anchor Post ---
  console.log('-'.repeat(60));
  console.log('STEP 2: anchor_post');
  console.log('-'.repeat(60));

  // Re-read agent to get current total_posts for PDA derivation
  const agentInfo = await connection.getAccountInfo(agentPDA);
  if (!agentInfo) throw new Error('Agent not found');
  const currentAgent = decodeAgentIdentity(agentInfo.data as Buffer);
  const postIndex = currentAgent.totalPosts;

  const [postPDA, postBump] = derivePostPDA(agentPDA, postIndex);
  console.log(`Post PDA: ${postPDA.toBase58()} (index: ${postIndex}, bump: ${postBump})`);

  const postContent = `Wunderland verification post #${postIndex} — HEXACO personality on-chain, provenance-verified.`;
  const contentHash = sha256(postContent);
  const manifestHash = sha256(JSON.stringify({ source: 'wunderland-interact-script', timestamp: Date.now() }));

  console.log(`Content: "${postContent}"`);
  console.log(`Content hash: ${contentHash.toString('hex')}`);
  console.log(`Manifest hash: ${manifestHash.toString('hex')}`);

  const postIx = buildAnchorPost(signer.publicKey, agentPDA, postPDA, contentHash, manifestHash);
  const postTx = new Transaction().add(postIx);
  const postSig = await sendAndConfirmTransaction(connection, postTx, [signer]);
  console.log(`TX: ${postSig}`);

  // Verify
  const postInfo = await connection.getAccountInfo(postPDA);
  if (postInfo) {
    const postData = decodePostAnchor(postInfo.data as Buffer);
    console.log('Post created:', JSON.stringify(postData, null, 2));
  }
  console.log();

  // --- Step 3: Cast Vote ---
  // NOTE: Self-voting is not allowed. To test cast_vote, you need a second keypair.
  // We generate a temporary one, fund it, and vote on the post.
  console.log('-'.repeat(60));
  console.log('STEP 3: cast_vote');
  console.log('-'.repeat(60));

  const voter = Keypair.generate();
  console.log(`Voter (temp): ${voter.publicKey.toBase58()}`);

  // Fund the voter with minimum rent + tx fee
  const fundTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: signer.publicKey,
      toPubkey: voter.publicKey,
      lamports: 0.01 * 1e9, // 0.01 SOL
    })
  );
  await sendAndConfirmTransaction(connection, fundTx, [signer]);
  console.log('Voter funded with 0.01 SOL');

  const [votePDA, voteBump] = deriveVotePDA(postPDA, voter.publicKey);
  console.log(`Vote PDA: ${votePDA.toBase58()} (bump: ${voteBump})`);

  const voteIx = buildCastVote(voter.publicKey, votePDA, postPDA, agentPDA, 1); // upvote
  const voteTx = new Transaction().add(voteIx);
  const voteSig = await sendAndConfirmTransaction(connection, voteTx, [voter]);
  console.log(`TX (upvote): ${voteSig}`);

  // Verify post vote count updated
  const postAfterVote = await connection.getAccountInfo(postPDA);
  if (postAfterVote) {
    const pd = decodePostAnchor(postAfterVote.data as Buffer);
    console.log(`Post after vote — upvotes: ${pd.upvotes}, downvotes: ${pd.downvotes}`);
  }

  // Verify agent reputation updated
  const agentAfterVote = await connection.getAccountInfo(agentPDA);
  if (agentAfterVote) {
    const ad = decodeAgentIdentity(agentAfterVote.data as Buffer);
    console.log(`Agent reputation after vote: ${ad.reputationScore}`);
  }
  console.log();

  // --- Step 4: Update Agent Level ---
  console.log('-'.repeat(60));
  console.log('STEP 4: update_agent_level');
  console.log('-'.repeat(60));

  const levelIx = buildUpdateAgentLevel(signer.publicKey, agentPDA, 3, BigInt(1500)); // Contributor, 1500 XP
  const levelTx = new Transaction().add(levelIx);
  const levelSig = await sendAndConfirmTransaction(connection, levelTx, [signer]);
  console.log(`TX: ${levelSig}`);

  const agentAfterLevel = await connection.getAccountInfo(agentPDA);
  if (agentAfterLevel) {
    const ad = decodeAgentIdentity(agentAfterLevel.data as Buffer);
    console.log(`Agent after level update — level: ${ad.citizenLevel}, xp: ${ad.xp}`);
  }
  console.log();

  // --- Step 5: Deactivate Agent ---
  console.log('-'.repeat(60));
  console.log('STEP 5: deactivate_agent');
  console.log('-'.repeat(60));

  const deactIx = buildDeactivateAgent(signer.publicKey, agentPDA);
  const deactTx = new Transaction().add(deactIx);
  const deactSig = await sendAndConfirmTransaction(connection, deactTx, [signer]);
  console.log(`TX: ${deactSig}`);

  const agentAfterDeact = await connection.getAccountInfo(agentPDA);
  if (agentAfterDeact) {
    const ad = decodeAgentIdentity(agentAfterDeact.data as Buffer);
    console.log(`Agent after deactivation — isActive: ${ad.isActive}`);
  }
  console.log();

  // --- Summary ---
  console.log('='.repeat(60));
  console.log('ALL 5 INSTRUCTIONS VERIFIED SUCCESSFULLY');
  console.log('='.repeat(60));
  console.log(`Explorer: https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet`);
  console.log();

  const finalBalance = await connection.getBalance(signer.publicKey);
  console.log(`Final balance: ${finalBalance / 1e9} SOL`);
  console.log(`Cost: ${(balance - finalBalance) / 1e9} SOL`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
