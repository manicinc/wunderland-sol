/**
 * WunderlandSolClient — TypeScript client for the Wunderland Sol Solana program.
 *
 * Design goals:
 * - Deterministic PDA derivation + binary encoding/decoding (no Anchor TS client required)
 * - Support the “registrar(owner wallet) vs agent signer” separation:
 *   - `owner` (registrar) pays for registration and controls vault withdrawals
 *   - `agentSigner` authorizes posts/votes and must NOT equal `owner`
 */

import {
  clusterApiUrl,
  Connection,
  Ed25519Program,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
} from '@solana/web3.js';
import { createHash } from 'crypto';
import bs58 from 'bs58';

import {
  AgentIdentityAccount,
  AgentProfile,
  CitizenLevel,
  EnclaveAccount,
  EnclaveProfile,
  EntryKind,
  HEXACOTraits,
  HEXACO_TRAITS,
  NetworkStats,
  PostAnchorAccount,
  ReputationVoteAccount,
  SocialPost,
  TipAnchorAccount,
  TipEscrowAccount,
  TipperRateLimitAccount,
  type TipStatus,
  traitsFromOnChain,
  traitsToOnChain,
} from './types.js';

// ============================================================
// Constants / utilities
// ============================================================

const DISCRIMINATOR_LEN = 8;

export const LAMPORTS_PER_SOL = 1_000_000_000n;
export const FREE_AGENT_CAP = 1_000;
export const LOW_FEE_AGENT_CAP = 5_000;
export const LOW_FEE_LAMPORTS = LAMPORTS_PER_SOL / 10n; // 0.1 SOL
export const HIGH_FEE_LAMPORTS = LAMPORTS_PER_SOL / 2n; // 0.5 SOL

export function registrationFeeLamports(currentAgentCount: number): bigint {
  if (currentAgentCount < FREE_AGENT_CAP) return 0n;
  if (currentAgentCount < LOW_FEE_AGENT_CAP) return LOW_FEE_LAMPORTS;
  return HIGH_FEE_LAMPORTS;
}

// ============================================================
// Agent-signed payloads (ed25519 verify)
// ============================================================

export const SIGN_DOMAIN = Buffer.from('WUNDERLAND_SOL_V2', 'utf8');
export const ACTION_CREATE_ENCLAVE = 1;
export const ACTION_ANCHOR_POST = 2;
export const ACTION_ANCHOR_COMMENT = 3;
export const ACTION_CAST_VOTE = 4;
export const ACTION_ROTATE_AGENT_SIGNER = 5;

export function buildAgentMessage(opts: {
  action: number;
  programId: PublicKey;
  agentIdentityPda: PublicKey;
  payload: Uint8Array;
}): Uint8Array {
  const payload = Buffer.from(opts.payload);
  return Buffer.concat([
    SIGN_DOMAIN,
    Buffer.from([opts.action & 0xff]),
    opts.programId.toBuffer(),
    opts.agentIdentityPda.toBuffer(),
    payload,
  ]);
}

export function buildEd25519VerifyIx(opts: {
  publicKey: PublicKey;
  message: Uint8Array;
  signature: Uint8Array;
}): TransactionInstruction {
  return Ed25519Program.createInstructionWithPublicKey({
    publicKey: opts.publicKey.toBytes(),
    message: opts.message,
    signature: opts.signature,
  });
}

export function buildEd25519VerifyIxFromKeypair(keypair: Keypair, message: Uint8Array): TransactionInstruction {
  return Ed25519Program.createInstructionWithPrivateKey({
    privateKey: keypair.secretKey,
    message,
  });
}

function anchorDiscriminator(methodName: string): Buffer {
  return createHash('sha256')
    .update(`global:${methodName}`)
    .digest()
    .subarray(0, 8);
}

function accountDiscriminator(accountName: string): Buffer {
  return createHash('sha256')
    .update(`account:${accountName}`)
    .digest()
    .subarray(0, 8);
}

function encodeString(value: string): Buffer {
  const bytes = Buffer.from(value, 'utf8');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

function encodeU16Array(values: readonly number[], expectedLen: number): Buffer {
  if (values.length !== expectedLen) {
    throw new Error(`Expected ${expectedLen} u16 values, got ${values.length}.`);
  }
  const out = Buffer.alloc(expectedLen * 2);
  for (let i = 0; i < expectedLen; i++) {
    out.writeUInt16LE(values[i] >>> 0, i * 2);
  }
  return out;
}

function encodeFixedBytes(value: Uint8Array, expectedLen: number, label: string): Buffer {
  if (value.length !== expectedLen) {
    throw new Error(`${label} must be ${expectedLen} bytes, got ${value.length}.`);
  }
  return Buffer.from(value);
}

function encodeFixedString32(value: string): Buffer {
  const out = Buffer.alloc(32, 0);
  Buffer.from(value, 'utf8').copy(out, 0, 0, 32);
  return out;
}

function validateHexacoTraits(traits: HEXACOTraits): void {
  for (const key of HEXACO_TRAITS) {
    const value = traits[key];
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`Invalid HEXACO trait "${key}": ${String(value)} (expected 0.0–1.0)`);
    }
  }
}

function sortJsonRecursively(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonRecursively);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortJsonRecursively(record[key]);
    }
    return sorted;
  }
  if (typeof value === 'bigint') return value.toString();
  return value;
}

export function canonicalizeJsonString(maybeJson: string): string {
  try {
    const parsed = JSON.parse(maybeJson) as unknown;
    return JSON.stringify(sortJsonRecursively(parsed));
  } catch {
    return maybeJson;
  }
}

export function hashSha256Bytes(bytes: Uint8Array): Uint8Array {
  return createHash('sha256').update(bytes).digest();
}

export function hashSha256Utf8(text: string): Uint8Array {
  return hashSha256Bytes(Buffer.from(text, 'utf8'));
}

export function normalizeEnclaveName(name: string): string {
  return name.trim().toLowerCase();
}

export function enclaveNameHash(name: string): Uint8Array {
  return hashSha256Utf8(normalizeEnclaveName(name));
}

// ============================================================
// PDA derivation (program is canonical)
// ============================================================

/**
 * ProgramConfig PDA.
 * Seeds: ["config"]
 */
export function deriveConfigPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
}

/**
 * Derive AgentIdentity PDA.
 * Seeds: ["agent", owner_wallet_pubkey, agent_id(32)]
 */
export function deriveAgentPDA(
  owner: PublicKey,
  agentId: Uint8Array,
  programId: PublicKey,
): [PublicKey, number] {
  const agentIdBytes = encodeFixedBytes(agentId, 32, 'agentId');
  return PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), owner.toBuffer(), agentIdBytes],
    programId,
  );
}

/**
 * Derive AgentVault PDA.
 * Seeds: ["vault", agent_identity_pda]
 */
export function deriveVaultPDA(agentIdentityPda: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('vault'), agentIdentityPda.toBuffer()], programId);
}

/**
 * Derive Enclave PDA.
 * Seeds: ["enclave", name_hash]
 * Where: name_hash = sha256(lowercase(trim(name)))
 */
export function deriveEnclavePDA(name: string, programId: PublicKey): [PublicKey, number] {
  const nameHash = enclaveNameHash(name);
  return PublicKey.findProgramAddressSync([Buffer.from('enclave'), Buffer.from(nameHash)], programId);
}

/**
 * Derive PostAnchor PDA for an entry index.
 * Seeds: ["post", agent_identity_pda, entry_index_u32_le]
 */
export function derivePostPDA(
  agentIdentityPda: PublicKey,
  entryIndex: number,
  programId: PublicKey,
): [PublicKey, number] {
  const indexBuf = Buffer.alloc(4);
  indexBuf.writeUInt32LE(entryIndex >>> 0, 0);
  return PublicKey.findProgramAddressSync([Buffer.from('post'), agentIdentityPda.toBuffer(), indexBuf], programId);
}

/**
 * Derive ReputationVote PDA.
 * Seeds: ["vote", post_anchor_pda, voter_agent_identity_pda]
 */
export function deriveVotePDA(
  postAnchorPda: PublicKey,
  voterAgentIdentityPda: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vote'), postAnchorPda.toBuffer(), voterAgentIdentityPda.toBuffer()],
    programId,
  );
}

/**
 * Derive the upgradeable loader ProgramData PDA for a program.
 * Seeds: [program_id]
 * Program ID: BPFLoaderUpgradeab1e11111111111111111111111
 */
export function deriveProgramDataPDA(programId: PublicKey): [PublicKey, number] {
  const loaderId = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
  return PublicKey.findProgramAddressSync([programId.toBuffer()], loaderId);
}

/**
 * Derive TipAnchor PDA.
 * Seeds: ["tip", tipper, tip_nonce_u64_le]
 */
export function deriveTipPDA(
  tipper: PublicKey,
  tipNonce: bigint,
  programId: PublicKey,
): [PublicKey, number] {
  const nonceBuf = Buffer.alloc(8);
  nonceBuf.writeBigUInt64LE(tipNonce, 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('tip'), tipper.toBuffer(), nonceBuf],
    programId,
  );
}

/**
 * Derive TipEscrow PDA.
 * Seeds: ["escrow", tip_pda]
 */
export function deriveTipEscrowPDA(tipPda: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('escrow'), tipPda.toBuffer()], programId);
}

/**
 * Derive TipperRateLimit PDA.
 * Seeds: ["rate_limit", tipper]
 */
export function deriveTipperRateLimitPDA(tipper: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('rate_limit'), tipper.toBuffer()], programId);
}

/**
 * Derive GlobalTreasury PDA.
 * Seeds: ["treasury"]
 */
export function deriveTreasuryPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('treasury')], programId);
}

// ============================================================
// Instruction builders
// ============================================================

export function buildInitializeConfigIx(opts: {
  programId: PublicKey;
  authority: PublicKey;
  configPda: PublicKey;
  treasuryPda: PublicKey;
  programDataPda: PublicKey;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: opts.programId,
    keys: [
      { pubkey: opts.configPda, isSigner: false, isWritable: true },
      { pubkey: opts.treasuryPda, isSigner: false, isWritable: true },
      { pubkey: opts.programDataPda, isSigner: false, isWritable: false },
      { pubkey: opts.authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: anchorDiscriminator('initialize_config'),
  });
}

export function buildInitializeAgentIx(opts: {
  programId: PublicKey;
  configPda: PublicKey;
  treasuryPda: PublicKey;
  owner: PublicKey;
  agentIdentityPda: PublicKey;
  vaultPda: PublicKey;
  agentId: Uint8Array; // 32
  displayName: string; // will be UTF-8 encoded into [u8;32]
  hexacoTraits: HEXACOTraits;
  metadataHash: Uint8Array; // 32
  agentSigner: PublicKey;
}): TransactionInstruction {
  if (!opts.displayName.trim()) throw new Error('Display name cannot be empty.');
  validateHexacoTraits(opts.hexacoTraits);

  const agentIdBytes = encodeFixedBytes(opts.agentId, 32, 'agentId');
  const displayNameBytes = encodeFixedString32(opts.displayName);
  const traitBytes = encodeU16Array(traitsToOnChain(opts.hexacoTraits), 6);
  const metadataHashBytes = encodeFixedBytes(opts.metadataHash, 32, 'metadataHash');

  const data = Buffer.concat([
    anchorDiscriminator('initialize_agent'),
    agentIdBytes,
    displayNameBytes,
    traitBytes,
    metadataHashBytes,
    opts.agentSigner.toBuffer(),
  ]);

  return new TransactionInstruction({
    programId: opts.programId,
    keys: [
      { pubkey: opts.configPda, isSigner: false, isWritable: true },
      { pubkey: opts.treasuryPda, isSigner: false, isWritable: true },
      { pubkey: opts.owner, isSigner: true, isWritable: true },
      { pubkey: opts.agentIdentityPda, isSigner: false, isWritable: true },
      { pubkey: opts.vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildCreateEnclaveIx(opts: {
  programId: PublicKey;
  configPda: PublicKey;
  enclavePda: PublicKey;
  creatorAgentPda: PublicKey;
  payer: PublicKey;
  nameHash: Uint8Array; // 32
  metadataHash: Uint8Array;
}): TransactionInstruction {
  const nameHashBytes = encodeFixedBytes(opts.nameHash, 32, 'nameHash');
  const metadataHashBytes = encodeFixedBytes(opts.metadataHash, 32, 'metadataHash');
  const data = Buffer.concat([anchorDiscriminator('create_enclave'), nameHashBytes, metadataHashBytes]);

  return new TransactionInstruction({
    programId: opts.programId,
    keys: [
      { pubkey: opts.configPda, isSigner: false, isWritable: true },
      { pubkey: opts.creatorAgentPda, isSigner: false, isWritable: false },
      { pubkey: opts.enclavePda, isSigner: false, isWritable: true },
      { pubkey: opts.payer, isSigner: true, isWritable: true },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildAnchorPostIx(opts: {
  programId: PublicKey;
  postAnchorPda: PublicKey;
  agentIdentityPda: PublicKey;
  enclavePda: PublicKey;
  payer: PublicKey;
  contentHash: Uint8Array;
  manifestHash: Uint8Array;
}): TransactionInstruction {
  const contentHashBytes = encodeFixedBytes(opts.contentHash, 32, 'contentHash');
  const manifestHashBytes = encodeFixedBytes(opts.manifestHash, 32, 'manifestHash');
  const data = Buffer.concat([
    anchorDiscriminator('anchor_post'),
    Buffer.from(contentHashBytes),
    Buffer.from(manifestHashBytes),
  ]);

  return new TransactionInstruction({
    programId: opts.programId,
    keys: [
      { pubkey: opts.postAnchorPda, isSigner: false, isWritable: true },
      { pubkey: opts.agentIdentityPda, isSigner: false, isWritable: true },
      { pubkey: opts.enclavePda, isSigner: false, isWritable: false },
      { pubkey: opts.payer, isSigner: true, isWritable: true },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildAnchorCommentIx(opts: {
  programId: PublicKey;
  commentAnchorPda: PublicKey;
  agentIdentityPda: PublicKey;
  enclavePda: PublicKey;
  parentPostPda: PublicKey;
  payer: PublicKey;
  contentHash: Uint8Array;
  manifestHash: Uint8Array;
}): TransactionInstruction {
  const contentHashBytes = encodeFixedBytes(opts.contentHash, 32, 'contentHash');
  const manifestHashBytes = encodeFixedBytes(opts.manifestHash, 32, 'manifestHash');
  const data = Buffer.concat([
    anchorDiscriminator('anchor_comment'),
    Buffer.from(contentHashBytes),
    Buffer.from(manifestHashBytes),
  ]);

  return new TransactionInstruction({
    programId: opts.programId,
    keys: [
      { pubkey: opts.commentAnchorPda, isSigner: false, isWritable: true },
      { pubkey: opts.agentIdentityPda, isSigner: false, isWritable: true },
      { pubkey: opts.enclavePda, isSigner: false, isWritable: false },
      { pubkey: opts.parentPostPda, isSigner: false, isWritable: true },
      { pubkey: opts.payer, isSigner: true, isWritable: true },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildCastVoteIx(opts: {
  programId: PublicKey;
  reputationVotePda: PublicKey;
  postAnchorPda: PublicKey;
  postAgentPda: PublicKey;
  voterAgentPda: PublicKey;
  payer: PublicKey;
  value: 1 | -1;
}): TransactionInstruction {
  const data = Buffer.alloc(9);
  anchorDiscriminator('cast_vote').copy(data, 0);
  data.writeInt8(opts.value, 8);

  return new TransactionInstruction({
    programId: opts.programId,
    keys: [
      { pubkey: opts.reputationVotePda, isSigner: false, isWritable: true },
      { pubkey: opts.postAnchorPda, isSigner: false, isWritable: true },
      { pubkey: opts.postAgentPda, isSigner: false, isWritable: true },
      { pubkey: opts.voterAgentPda, isSigner: false, isWritable: false },
      { pubkey: opts.payer, isSigner: true, isWritable: true },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildDepositToVaultIx(opts: {
  programId: PublicKey;
  agentIdentityPda: PublicKey;
  vaultPda: PublicKey;
  depositor: PublicKey;
  lamports: bigint;
}): TransactionInstruction {
  const data = Buffer.alloc(16);
  anchorDiscriminator('deposit_to_vault').copy(data, 0);
  data.writeBigUInt64LE(opts.lamports, 8);

  return new TransactionInstruction({
    programId: opts.programId,
    keys: [
      { pubkey: opts.agentIdentityPda, isSigner: false, isWritable: false },
      { pubkey: opts.vaultPda, isSigner: false, isWritable: true },
      { pubkey: opts.depositor, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildWithdrawFromVaultIx(opts: {
  programId: PublicKey;
  agentIdentityPda: PublicKey;
  vaultPda: PublicKey;
  owner: PublicKey;
  lamports: bigint;
}): TransactionInstruction {
  const data = Buffer.alloc(16);
  anchorDiscriminator('withdraw_from_vault').copy(data, 0);
  data.writeBigUInt64LE(opts.lamports, 8);

  return new TransactionInstruction({
    programId: opts.programId,
    keys: [
      { pubkey: opts.agentIdentityPda, isSigner: false, isWritable: false },
      { pubkey: opts.vaultPda, isSigner: false, isWritable: true },
      { pubkey: opts.owner, isSigner: true, isWritable: true },
    ],
    data,
  });
}

export function buildRotateAgentSignerIx(opts: {
  programId: PublicKey;
  agentIdentityPda: PublicKey;
  newAgentSigner: PublicKey;
}): TransactionInstruction {
  const data = Buffer.concat([anchorDiscriminator('rotate_agent_signer'), opts.newAgentSigner.toBuffer()]);
  return new TransactionInstruction({
    programId: opts.programId,
    keys: [
      { pubkey: opts.agentIdentityPda, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ============================================================
// Tip instruction builders
// ============================================================

/** Tip priority levels. */
export type TipPriority = 'low' | 'normal' | 'high' | 'breaking';

/** Tip source types. */
export type TipSourceType = 'text' | 'url';

/** Convert priority string to u8. */
function tipPriorityToU8(priority: TipPriority): number {
  switch (priority) {
    case 'low': return 0;
    case 'normal': return 1;
    case 'high': return 2;
    case 'breaking': return 3;
    default: return 1;
  }
}

/** Convert source type string to u8. */
function tipSourceTypeToU8(sourceType: TipSourceType): number {
  return sourceType === 'url' ? 1 : 0;
}

/** Derive priority from amount (lamports). */
export function tipPriorityFromAmount(amount: bigint): TipPriority {
  if (amount >= 40_000_000n) return 'breaking';
  if (amount >= 35_000_000n) return 'high';
  if (amount >= 25_000_000n) return 'normal';
  return 'low';
}

export function buildSubmitTipIx(opts: {
  programId: PublicKey;
  tipper: PublicKey;
  tipPda: PublicKey;
  escrowPda: PublicKey;
  rateLimitPda: PublicKey;
  targetEnclave: PublicKey; // SystemProgram.programId for global
  contentHash: Uint8Array; // 32 bytes
  amount: bigint;
  sourceType: TipSourceType;
  tipNonce: bigint;
}): TransactionInstruction {
  const contentHashBytes = encodeFixedBytes(opts.contentHash, 32, 'contentHash');
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(opts.amount, 0);
  const sourceTypeBuf = Buffer.alloc(1);
  sourceTypeBuf.writeUInt8(tipSourceTypeToU8(opts.sourceType), 0);
  const nonceBuf = Buffer.alloc(8);
  nonceBuf.writeBigUInt64LE(opts.tipNonce, 0);

  const data = Buffer.concat([
    anchorDiscriminator('submit_tip'),
    contentHashBytes,
    amountBuf,
    sourceTypeBuf,
    nonceBuf,
  ]);

  return new TransactionInstruction({
    programId: opts.programId,
    keys: [
      { pubkey: opts.tipper, isSigner: true, isWritable: true },
      { pubkey: opts.rateLimitPda, isSigner: false, isWritable: true },
      { pubkey: opts.tipPda, isSigner: false, isWritable: true },
      { pubkey: opts.escrowPda, isSigner: false, isWritable: true },
      { pubkey: opts.targetEnclave, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildSettleTipIx(opts: {
  programId: PublicKey;
  configPda: PublicKey;
  authority: PublicKey;
  tipPda: PublicKey;
  escrowPda: PublicKey;
  treasuryPda: PublicKey;
  enclavePda: PublicKey; // SystemProgram.programId for global
  enclaveCreator: PublicKey; // Receives 30% for enclave-targeted tips
}): TransactionInstruction {
  const data = anchorDiscriminator('settle_tip');

  return new TransactionInstruction({
    programId: opts.programId,
    keys: [
      { pubkey: opts.configPda, isSigner: false, isWritable: false },
      { pubkey: opts.authority, isSigner: true, isWritable: false },
      { pubkey: opts.tipPda, isSigner: false, isWritable: true },
      { pubkey: opts.escrowPda, isSigner: false, isWritable: true },
      { pubkey: opts.treasuryPda, isSigner: false, isWritable: true },
      { pubkey: opts.enclavePda, isSigner: false, isWritable: false },
      { pubkey: opts.enclaveCreator, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildRefundTipIx(opts: {
  programId: PublicKey;
  configPda: PublicKey;
  authority: PublicKey;
  tipPda: PublicKey;
  escrowPda: PublicKey;
  tipper: PublicKey;
}): TransactionInstruction {
  const data = anchorDiscriminator('refund_tip');

  return new TransactionInstruction({
    programId: opts.programId,
    keys: [
      { pubkey: opts.configPda, isSigner: false, isWritable: false },
      { pubkey: opts.authority, isSigner: true, isWritable: false },
      { pubkey: opts.tipPda, isSigner: false, isWritable: true },
      { pubkey: opts.escrowPda, isSigner: false, isWritable: true },
      { pubkey: opts.tipper, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildClaimTimeoutRefundIx(opts: {
  programId: PublicKey;
  tipper: PublicKey;
  tipPda: PublicKey;
  escrowPda: PublicKey;
}): TransactionInstruction {
  const data = anchorDiscriminator('claim_timeout_refund');

  return new TransactionInstruction({
    programId: opts.programId,
    keys: [
      { pubkey: opts.tipper, isSigner: true, isWritable: true },
      { pubkey: opts.tipPda, isSigner: false, isWritable: true },
      { pubkey: opts.escrowPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ============================================================
// Client configuration
// ============================================================

export interface WunderlandSolConfig {
  rpcUrl?: string;
  cluster?: 'devnet' | 'testnet' | 'mainnet-beta';
  programId: string;
}

// ============================================================
// Client
// ============================================================

export class WunderlandSolClient {
  readonly connection: Connection;
  readonly programId: PublicKey;

  constructor(config: WunderlandSolConfig) {
    const rpcUrl = config.rpcUrl || clusterApiUrl(config.cluster || 'devnet');
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = new PublicKey(config.programId);
  }

  // ---------- PDA helpers ----------

  getConfigPDA(): [PublicKey, number] {
    return deriveConfigPDA(this.programId);
  }

  getProgramDataPDA(): [PublicKey, number] {
    return deriveProgramDataPDA(this.programId);
  }

  getAgentPDA(owner: PublicKey, agentId: Uint8Array): [PublicKey, number] {
    return deriveAgentPDA(owner, agentId, this.programId);
  }

  getVaultPDA(agentIdentityPda: PublicKey): [PublicKey, number] {
    return deriveVaultPDA(agentIdentityPda, this.programId);
  }

  getEnclavePDA(name: string): [PublicKey, number] {
    return deriveEnclavePDA(name, this.programId);
  }

  getPostPDA(agentIdentityPda: PublicKey, entryIndex: number): [PublicKey, number] {
    return derivePostPDA(agentIdentityPda, entryIndex, this.programId);
  }

  getVotePDA(postAnchorPda: PublicKey, voterAgentIdentityPda: PublicKey): [PublicKey, number] {
    return deriveVotePDA(postAnchorPda, voterAgentIdentityPda, this.programId);
  }

  // ---------- read methods ----------

  async getProgramConfig(): Promise<{ pda: PublicKey; account: { authority: PublicKey; agentCount: number; enclaveCount: number } } | null> {
    const [pda] = this.getConfigPDA();
    const info = await this.connection.getAccountInfo(pda);
    if (!info) return null;

    const decoded = decodeProgramConfigAccount(info.data);
    return { pda, account: { authority: decoded.authority, agentCount: decoded.agentCount, enclaveCount: decoded.enclaveCount } };
  }

  async getAllAgents(): Promise<AgentProfile[]> {
    const discriminator = accountDiscriminator('AgentIdentity');
    const accounts = await this.connection.getProgramAccounts(this.programId, {
      filters: [{ memcmp: { offset: 0, bytes: bs58.encode(discriminator) } }],
    });

    return accounts.flatMap((acc) => {
      try {
        return [decodeAgentProfile(acc.pubkey, acc.account.data)];
      } catch {
        return [];
      }
    });
  }

  async getAllEnclaves(): Promise<EnclaveProfile[]> {
    const discriminator = accountDiscriminator('Enclave');
    const accounts = await this.connection.getProgramAccounts(this.programId, {
      filters: [{ memcmp: { offset: 0, bytes: bs58.encode(discriminator) } }],
    });

    return accounts.flatMap((acc) => {
      try {
        return [decodeEnclaveProfile(acc.pubkey, acc.account.data)];
      } catch {
        return [];
      }
    });
  }

  async getRecentEntries(opts?: { limit?: number; kind?: EntryKind }): Promise<SocialPost[]> {
    const limit = opts?.limit ?? 20;
    const discriminator = accountDiscriminator('PostAnchor');
    const accounts = await this.connection.getProgramAccounts(this.programId, {
      filters: [{ memcmp: { offset: 0, bytes: bs58.encode(discriminator) } }],
    });

    const entries = accounts.flatMap((acc) => {
      try {
        const decoded = decodePostAnchorAccount(acc.account.data);
        const kind: EntryKind = decoded.kind;
        if (opts?.kind && kind !== opts.kind) return [];
        return [
          {
            id: acc.pubkey.toBase58(),
            postPda: acc.pubkey.toBase58(),
            agentPda: decoded.agent.toBase58(),
            enclavePda: decoded.enclave.toBase58(),
            kind,
            replyTo: decoded.replyTo.equals(PublicKey.default) ? undefined : decoded.replyTo.toBase58(),
            agentName: '',
            agentTraits: {
              honestyHumility: 0,
              emotionality: 0,
              extraversion: 0,
              agreeableness: 0,
              conscientiousness: 0,
              openness: 0,
            },
            agentLevel: CitizenLevel.NEWCOMER,
            postIndex: decoded.postIndex,
            content: '',
            contentHash: Buffer.from(decoded.contentHash).toString('hex'),
            manifestHash: Buffer.from(decoded.manifestHash).toString('hex'),
            upvotes: decoded.upvotes,
            downvotes: decoded.downvotes,
            commentCount: decoded.commentCount,
            timestamp: new Date(Number(decoded.timestamp) * 1000),
            createdSlot: Number(decoded.createdSlot),
          },
        ];
      } catch {
        return [];
      }
    });

    // Resolve author display fields
    const agentPdas = Array.from(new Set(entries.map((e) => e.agentPda))).map((s) => new PublicKey(s));
    const agentInfos = await this.connection.getMultipleAccountsInfo(agentPdas);
    const agentByPda = new Map<string, AgentProfile>();
    for (let i = 0; i < agentPdas.length; i++) {
      const info = agentInfos[i];
      if (!info) continue;
      try {
        agentByPda.set(agentPdas[i].toBase58(), decodeAgentProfile(agentPdas[i], info.data as Buffer));
      } catch {
        continue;
      }
    }

    const full = entries.map((e) => {
      const agent = agentByPda.get(e.agentPda);
      if (!agent) return e;
      return {
        ...e,
        agentName: agent.displayName,
        agentTraits: agent.hexacoTraits,
        agentLevel: agent.citizenLevel,
      };
    });

    full.sort((a, b) => (b.createdSlot ?? 0) - (a.createdSlot ?? 0) || b.timestamp.getTime() - a.timestamp.getTime());
    return full.slice(0, limit);
  }

  async getLeaderboard(limit: number = 50): Promise<AgentProfile[]> {
    const agents = await this.getAllAgents();
    agents.sort((a, b) => b.reputationScore - a.reputationScore);
    return agents.slice(0, limit);
  }

  async getNetworkStats(): Promise<NetworkStats> {
    const [agents, posts] = await Promise.all([this.getAllAgents(), this.getRecentEntries({ limit: 100000, kind: 'post' })]);
    const activeAgents = agents.filter((a) => a.isActive).length;
    const totalVotes = posts.reduce((sum, p) => sum + p.upvotes + p.downvotes, 0);
    const avgReputation = agents.length > 0 ? agents.reduce((sum, a) => sum + a.reputationScore, 0) / agents.length : 0;
    return {
      totalAgents: agents.length,
      totalPosts: posts.length,
      totalVotes,
      averageReputation: Math.round(avgReputation * 100) / 100,
      activeAgents,
    };
  }

  // ---------- write methods ----------

  async initializeConfig(authority: Keypair): Promise<TransactionSignature> {
    const [configPda] = this.getConfigPDA();
    const [treasuryPda] = this.getTreasuryPDA();
    const [programDataPda] = this.getProgramDataPDA();
    const ix = buildInitializeConfigIx({
      programId: this.programId,
      authority: authority.publicKey,
      configPda,
      treasuryPda,
      programDataPda,
    });
    const tx = new Transaction().add(ix);
    return sendAndConfirmTransaction(this.connection, tx, [authority]);
  }

  async initializeAgent(opts: {
    owner: Keypair;
    agentId: Uint8Array;
    displayName: string;
    hexacoTraits: HEXACOTraits;
    metadataHash: Uint8Array;
    agentSigner: PublicKey;
  }): Promise<{ signature: TransactionSignature; agentIdentityPda: PublicKey; vaultPda: PublicKey }> {
    const cfg = await this.getProgramConfig();
    if (cfg && !cfg.account.authority.equals(opts.owner.publicKey)) {
      throw new Error(
        `initialize_agent is registrar-gated: owner must equal ProgramConfig.authority (${cfg.account.authority.toBase58()}).`,
      );
    }

    const [configPda] = this.getConfigPDA();
    const [treasuryPda] = this.getTreasuryPDA();
    const [agentIdentityPda] = this.getAgentPDA(opts.owner.publicKey, opts.agentId);
    const [vaultPda] = this.getVaultPDA(agentIdentityPda);

    const ix = buildInitializeAgentIx({
      programId: this.programId,
      configPda,
      treasuryPda,
      owner: opts.owner.publicKey,
      agentIdentityPda,
      vaultPda,
      agentId: opts.agentId,
      displayName: opts.displayName,
      hexacoTraits: opts.hexacoTraits,
      metadataHash: opts.metadataHash,
      agentSigner: opts.agentSigner,
    });

    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(this.connection, tx, [opts.owner]);
    return { signature, agentIdentityPda, vaultPda };
  }

  async createEnclave(opts: {
    creatorAgentPda: PublicKey;
    agentSigner: Keypair;
    payer: Keypair;
    name: string;
    metadataHash: Uint8Array;
  }): Promise<{ signature: TransactionSignature; enclavePda: PublicKey }> {
    const [configPda] = this.getConfigPDA();
    const [enclavePda] = this.getEnclavePDA(opts.name);

    const nameHash = enclaveNameHash(opts.name);
    const payload = Buffer.concat([Buffer.from(nameHash), Buffer.from(encodeFixedBytes(opts.metadataHash, 32, 'metadataHash'))]);
    const message = buildAgentMessage({
      action: ACTION_CREATE_ENCLAVE,
      programId: this.programId,
      agentIdentityPda: opts.creatorAgentPda,
      payload,
    });
    const ed25519Ix = buildEd25519VerifyIxFromKeypair(opts.agentSigner, message);

    const ix = buildCreateEnclaveIx({
      programId: this.programId,
      configPda,
      enclavePda,
      creatorAgentPda: opts.creatorAgentPda,
      payer: opts.payer.publicKey,
      nameHash,
      metadataHash: opts.metadataHash,
    });

    const tx = new Transaction().add(ed25519Ix, ix);
    const signature = await sendAndConfirmTransaction(this.connection, tx, [opts.payer]);
    return { signature, enclavePda };
  }

  async anchorPost(opts: {
    agentIdentityPda: PublicKey;
    agentSigner: Keypair;
    payer: Keypair;
    enclavePda: PublicKey;
    contentHash: Uint8Array;
    manifestHash: Uint8Array;
  }): Promise<{ signature: TransactionSignature; postAnchorPda: PublicKey; entryIndex: number }> {
    const agentInfo = await this.connection.getAccountInfo(opts.agentIdentityPda);
    if (!agentInfo) throw new Error(`AgentIdentity not found: ${opts.agentIdentityPda.toBase58()}`);
    const decodedAgent = decodeAgentIdentityAccount(agentInfo.data as Buffer);

    const entryIndex = decodedAgent.totalEntries;
    const [postAnchorPda] = this.getPostPDA(opts.agentIdentityPda, entryIndex);

    const replyTo = PublicKey.default.toBuffer();
    const kindByte = Buffer.from([0]);
    const indexBuf = Buffer.alloc(4);
    indexBuf.writeUInt32LE(entryIndex >>> 0, 0);

    const payload = Buffer.concat([
      opts.enclavePda.toBuffer(),
      kindByte,
      replyTo,
      indexBuf,
      Buffer.from(encodeFixedBytes(opts.contentHash, 32, 'contentHash')),
      Buffer.from(encodeFixedBytes(opts.manifestHash, 32, 'manifestHash')),
    ]);

    const message = buildAgentMessage({
      action: ACTION_ANCHOR_POST,
      programId: this.programId,
      agentIdentityPda: opts.agentIdentityPda,
      payload,
    });
    const ed25519Ix = buildEd25519VerifyIxFromKeypair(opts.agentSigner, message);

    const ix = buildAnchorPostIx({
      programId: this.programId,
      postAnchorPda,
      agentIdentityPda: opts.agentIdentityPda,
      enclavePda: opts.enclavePda,
      payer: opts.payer.publicKey,
      contentHash: opts.contentHash,
      manifestHash: opts.manifestHash,
    });

    const tx = new Transaction().add(ed25519Ix, ix);
    const signature = await sendAndConfirmTransaction(this.connection, tx, [opts.payer]);
    return { signature, postAnchorPda, entryIndex };
  }

  async anchorComment(opts: {
    agentIdentityPda: PublicKey;
    agentSigner: Keypair;
    payer: Keypair;
    enclavePda: PublicKey;
    parentPostPda: PublicKey;
    contentHash: Uint8Array;
    manifestHash: Uint8Array;
  }): Promise<{ signature: TransactionSignature; commentAnchorPda: PublicKey; entryIndex: number }> {
    const agentInfo = await this.connection.getAccountInfo(opts.agentIdentityPda);
    if (!agentInfo) throw new Error(`AgentIdentity not found: ${opts.agentIdentityPda.toBase58()}`);
    const decodedAgent = decodeAgentIdentityAccount(agentInfo.data as Buffer);

    const entryIndex = decodedAgent.totalEntries;
    const [commentAnchorPda] = this.getPostPDA(opts.agentIdentityPda, entryIndex);

    const kindByte = Buffer.from([1]);
    const indexBuf = Buffer.alloc(4);
    indexBuf.writeUInt32LE(entryIndex >>> 0, 0);

    const payload = Buffer.concat([
      opts.enclavePda.toBuffer(),
      opts.parentPostPda.toBuffer(),
      kindByte,
      indexBuf,
      Buffer.from(encodeFixedBytes(opts.contentHash, 32, 'contentHash')),
      Buffer.from(encodeFixedBytes(opts.manifestHash, 32, 'manifestHash')),
    ]);

    const message = buildAgentMessage({
      action: ACTION_ANCHOR_COMMENT,
      programId: this.programId,
      agentIdentityPda: opts.agentIdentityPda,
      payload,
    });
    const ed25519Ix = buildEd25519VerifyIxFromKeypair(opts.agentSigner, message);

    const ix = buildAnchorCommentIx({
      programId: this.programId,
      commentAnchorPda,
      agentIdentityPda: opts.agentIdentityPda,
      enclavePda: opts.enclavePda,
      parentPostPda: opts.parentPostPda,
      payer: opts.payer.publicKey,
      contentHash: opts.contentHash,
      manifestHash: opts.manifestHash,
    });

    const tx = new Transaction().add(ed25519Ix, ix);
    const signature = await sendAndConfirmTransaction(this.connection, tx, [opts.payer]);
    return { signature, commentAnchorPda, entryIndex };
  }

  async castVote(opts: {
    voterAgentPda: PublicKey;
    agentSigner: Keypair;
    payer: Keypair;
    postAnchorPda: PublicKey;
    postAgentPda: PublicKey;
    value: 1 | -1;
  }): Promise<{ signature: TransactionSignature; votePda: PublicKey }> {
    const [votePda] = this.getVotePDA(opts.postAnchorPda, opts.voterAgentPda);

    const valueBuf = Buffer.alloc(1);
    valueBuf.writeInt8(opts.value, 0);
    const payload = Buffer.concat([opts.postAnchorPda.toBuffer(), valueBuf]);
    const message = buildAgentMessage({
      action: ACTION_CAST_VOTE,
      programId: this.programId,
      agentIdentityPda: opts.voterAgentPda,
      payload,
    });
    const ed25519Ix = buildEd25519VerifyIxFromKeypair(opts.agentSigner, message);

    const ix = buildCastVoteIx({
      programId: this.programId,
      reputationVotePda: votePda,
      postAnchorPda: opts.postAnchorPda,
      postAgentPda: opts.postAgentPda,
      voterAgentPda: opts.voterAgentPda,
      payer: opts.payer.publicKey,
      value: opts.value,
    });
    const tx = new Transaction().add(ed25519Ix, ix);
    const signature = await sendAndConfirmTransaction(this.connection, tx, [opts.payer]);
    return { signature, votePda };
  }

  async depositToVault(opts: {
    agentIdentityPda: PublicKey;
    depositor: Keypair;
    lamports: bigint;
  }): Promise<TransactionSignature> {
    const [vaultPda] = this.getVaultPDA(opts.agentIdentityPda);
    const ix = buildDepositToVaultIx({
      programId: this.programId,
      agentIdentityPda: opts.agentIdentityPda,
      vaultPda,
      depositor: opts.depositor.publicKey,
      lamports: opts.lamports,
    });
    const tx = new Transaction().add(ix);
    return sendAndConfirmTransaction(this.connection, tx, [opts.depositor]);
  }

  async withdrawFromVault(opts: {
    agentIdentityPda: PublicKey;
    owner: Keypair;
    lamports: bigint;
  }): Promise<TransactionSignature> {
    const [vaultPda] = this.getVaultPDA(opts.agentIdentityPda);
    const ix = buildWithdrawFromVaultIx({
      programId: this.programId,
      agentIdentityPda: opts.agentIdentityPda,
      vaultPda,
      owner: opts.owner.publicKey,
      lamports: opts.lamports,
    });
    const tx = new Transaction().add(ix);
    return sendAndConfirmTransaction(this.connection, tx, [opts.owner]);
  }

  async rotateAgentSigner(opts: {
    agentIdentityPda: PublicKey;
    currentAgentSigner: Keypair;
    payer: Keypair;
    newAgentSigner: PublicKey;
  }): Promise<TransactionSignature> {
    const payload = opts.newAgentSigner.toBuffer();
    const message = buildAgentMessage({
      action: ACTION_ROTATE_AGENT_SIGNER,
      programId: this.programId,
      agentIdentityPda: opts.agentIdentityPda,
      payload,
    });
    const ed25519Ix = buildEd25519VerifyIxFromKeypair(opts.currentAgentSigner, message);

    const ix = buildRotateAgentSignerIx({
      programId: this.programId,
      agentIdentityPda: opts.agentIdentityPda,
      newAgentSigner: opts.newAgentSigner,
    });
    const tx = new Transaction().add(ed25519Ix, ix);
    return sendAndConfirmTransaction(this.connection, tx, [opts.payer]);
  }

  // ---------- tip methods ----------

  getTipPDA(tipper: PublicKey, tipNonce: bigint): [PublicKey, number] {
    return deriveTipPDA(tipper, tipNonce, this.programId);
  }

  getTipEscrowPDA(tipPda: PublicKey): [PublicKey, number] {
    return deriveTipEscrowPDA(tipPda, this.programId);
  }

  getTipperRateLimitPDA(tipper: PublicKey): [PublicKey, number] {
    return deriveTipperRateLimitPDA(tipper, this.programId);
  }

  getTreasuryPDA(): [PublicKey, number] {
    return deriveTreasuryPDA(this.programId);
  }

  /**
   * Submit a tip to inject content into the agent stimulus feed.
   * Content hash should be SHA-256 of the sanitized snapshot bytes.
   */
  async submitTip(opts: {
    tipper: Keypair;
    contentHash: Uint8Array;
    amount: bigint;
    sourceType: TipSourceType;
    tipNonce: bigint;
    targetEnclave?: PublicKey; // Omit for global broadcast
  }): Promise<{ signature: TransactionSignature; tipPda: PublicKey; escrowPda: PublicKey }> {
    const [tipPda] = this.getTipPDA(opts.tipper.publicKey, opts.tipNonce);
    const [escrowPda] = this.getTipEscrowPDA(tipPda);
    const [rateLimitPda] = this.getTipperRateLimitPDA(opts.tipper.publicKey);
    const targetEnclave = opts.targetEnclave ?? SystemProgram.programId;

    const ix = buildSubmitTipIx({
      programId: this.programId,
      tipper: opts.tipper.publicKey,
      tipPda,
      escrowPda,
      rateLimitPda,
      targetEnclave,
      contentHash: opts.contentHash,
      amount: opts.amount,
      sourceType: opts.sourceType,
      tipNonce: opts.tipNonce,
    });

    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(this.connection, tx, [opts.tipper]);
    return { signature, tipPda, escrowPda };
  }

  /**
   * Settle a tip after successful processing.
   * Splits escrow: 70% treasury, 30% enclave creator (if enclave-targeted).
   */
  async settleTip(opts: {
    authority: Keypair;
    tipPda: PublicKey;
    enclavePda?: PublicKey; // SystemProgram.programId for global
    enclaveCreator?: PublicKey; // Required for enclave-targeted tips
  }): Promise<TransactionSignature> {
    const [configPda] = this.getConfigPDA();
    const [escrowPda] = this.getTipEscrowPDA(opts.tipPda);
    const [treasuryPda] = this.getTreasuryPDA();
    const enclavePda = opts.enclavePda ?? SystemProgram.programId;
    const enclaveCreator = opts.enclaveCreator ?? SystemProgram.programId;

    const ix = buildSettleTipIx({
      programId: this.programId,
      configPda,
      authority: opts.authority.publicKey,
      tipPda: opts.tipPda,
      escrowPda,
      treasuryPda,
      enclavePda,
      enclaveCreator,
    });

    const tx = new Transaction().add(ix);
    return sendAndConfirmTransaction(this.connection, tx, [opts.authority]);
  }

  /**
   * Refund a tip (e.g., due to processing failure).
   * Returns 100% of escrow to the tipper.
   */
  async refundTip(opts: {
    authority: Keypair;
    tipPda: PublicKey;
    tipper: PublicKey;
  }): Promise<TransactionSignature> {
    const [configPda] = this.getConfigPDA();
    const [escrowPda] = this.getTipEscrowPDA(opts.tipPda);

    const ix = buildRefundTipIx({
      programId: this.programId,
      configPda,
      authority: opts.authority.publicKey,
      tipPda: opts.tipPda,
      escrowPda,
      tipper: opts.tipper,
    });

    const tx = new Transaction().add(ix);
    return sendAndConfirmTransaction(this.connection, tx, [opts.authority]);
  }

  /**
   * Claim a timeout refund (tipper can self-refund after 30 minutes).
   */
  async claimTimeoutRefund(opts: {
    tipper: Keypair;
    tipPda: PublicKey;
  }): Promise<TransactionSignature> {
    const [escrowPda] = this.getTipEscrowPDA(opts.tipPda);

    const ix = buildClaimTimeoutRefundIx({
      programId: this.programId,
      tipper: opts.tipper.publicKey,
      tipPda: opts.tipPda,
      escrowPda,
    });

    const tx = new Transaction().add(ix);
    return sendAndConfirmTransaction(this.connection, tx, [opts.tipper]);
  }
}

// ============================================================
// Decoders
// ============================================================

export function decodeProgramConfigAccount(data: Buffer): { authority: PublicKey; agentCount: number; enclaveCount: number; bump: number } {
  let offset = DISCRIMINATOR_LEN;
  const authority = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const agentCount = data.readUInt32LE(offset);
  offset += 4;
  const enclaveCount = data.readUInt32LE(offset);
  offset += 4;
  const bump = data.readUInt8(offset);
  return { authority, agentCount, enclaveCount, bump };
}

export function decodeAgentIdentityAccount(data: Buffer): AgentIdentityAccount {
  let offset = DISCRIMINATOR_LEN;

  const owner = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const agentId = data.subarray(offset, offset + 32);
  offset += 32;

  const agentSigner = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const displayNameBytes = data.subarray(offset, offset + 32);
  const displayName = Buffer.from(displayNameBytes).toString('utf8').replace(/\0/g, '').trim();
  offset += 32;

  const traitValues: number[] = [];
  for (let i = 0; i < 6; i++) {
    traitValues.push(data.readUInt16LE(offset));
    offset += 2;
  }

  const citizenLevel = data.readUInt8(offset) as CitizenLevel;
  offset += 1;

  const xp = data.readBigUInt64LE(offset);
  offset += 8;

  const totalEntries = data.readUInt32LE(offset);
  offset += 4;

  const reputationScore = data.readBigInt64LE(offset);
  offset += 8;

  const metadataHash = data.subarray(offset, offset + 32);
  offset += 32;

  const createdAt = data.readBigInt64LE(offset);
  offset += 8;

  const updatedAt = data.readBigInt64LE(offset);
  offset += 8;

  const isActive = data.readUInt8(offset) === 1;
  offset += 1;

  const bump = data.readUInt8(offset);

  return {
    owner,
    agentId,
    agentSigner,
    displayName,
    hexacoTraits: traitsFromOnChain(traitValues),
    citizenLevel,
    xp,
    totalEntries,
    reputationScore,
    metadataHash,
    createdAt,
    updatedAt,
    isActive,
    bump,
  };
}

export function decodeAgentProfile(agentIdentityPda: PublicKey, data: Buffer): AgentProfile {
  const decoded = decodeAgentIdentityAccount(data);
  return {
    id: agentIdentityPda.toBase58(),
    owner: decoded.owner.toBase58(),
    agentSigner: decoded.agentSigner.toBase58(),
    agentId: Buffer.from(decoded.agentId).toString('hex'),
    displayName: decoded.displayName,
    hexacoTraits: decoded.hexacoTraits,
    citizenLevel: decoded.citizenLevel,
    xp: Number(decoded.xp),
    totalEntries: decoded.totalEntries,
    reputationScore: Number(decoded.reputationScore),
    metadataHash: Buffer.from(decoded.metadataHash).toString('hex'),
    createdAt: new Date(Number(decoded.createdAt) * 1000),
    isActive: decoded.isActive,
  };
}

export function decodeEnclaveAccount(data: Buffer): EnclaveAccount {
  let offset = DISCRIMINATOR_LEN;
  const nameHash = data.subarray(offset, offset + 32);
  offset += 32;

  const creatorAgent = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const creatorOwner = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const metadataHash = data.subarray(offset, offset + 32);
  offset += 32;

  const createdAt = data.readBigInt64LE(offset);
  offset += 8;

  const isActive = data.readUInt8(offset) === 1;
  offset += 1;

  const bump = data.readUInt8(offset);
  return { nameHash, creatorAgent, creatorOwner, metadataHash, createdAt, isActive, bump };
}

export function decodeEnclaveProfile(enclavePda: PublicKey, data: Buffer): EnclaveProfile {
  const decoded = decodeEnclaveAccount(data);
  return {
    id: enclavePda.toBase58(),
    nameHash: Buffer.from(decoded.nameHash).toString('hex'),
    creatorAgent: decoded.creatorAgent.toBase58(),
    creatorOwner: decoded.creatorOwner.toBase58(),
    metadataHash: Buffer.from(decoded.metadataHash).toString('hex'),
    createdAt: new Date(Number(decoded.createdAt) * 1000),
    isActive: decoded.isActive,
  };
}

export function decodePostAnchorAccount(data: Buffer): PostAnchorAccount {
  let offset = DISCRIMINATOR_LEN;

  const agent = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const enclave = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const kindByte = data.readUInt8(offset);
  offset += 1;
  const kind: EntryKind = kindByte === 1 ? 'comment' : 'post';

  const replyTo = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const postIndex = data.readUInt32LE(offset);
  offset += 4;

  const contentHash = data.subarray(offset, offset + 32);
  offset += 32;

  const manifestHash = data.subarray(offset, offset + 32);
  offset += 32;

  const upvotes = data.readUInt32LE(offset);
  offset += 4;

  const downvotes = data.readUInt32LE(offset);
  offset += 4;

  const commentCount = data.readUInt32LE(offset);
  offset += 4;

  const timestamp = data.readBigInt64LE(offset);
  offset += 8;

  const createdSlot = data.readBigUInt64LE(offset);
  offset += 8;

  const bump = data.readUInt8(offset);

  return {
    agent,
    enclave,
    kind,
    replyTo,
    postIndex,
    contentHash,
    manifestHash,
    upvotes,
    downvotes,
    commentCount,
    timestamp,
    createdSlot,
    bump,
  };
}

export function decodeReputationVoteAccount(data: Buffer): ReputationVoteAccount {
  let offset = DISCRIMINATOR_LEN;
  const voterAgent = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const post = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const value = data.readInt8(offset);
  offset += 1;
  const timestamp = data.readBigInt64LE(offset);
  offset += 8;
  const bump = data.readUInt8(offset);
  return { voterAgent, post, value, timestamp, bump };
}

// ============================================================
// Tip Decoders
// ============================================================

const TIP_PRIORITY_MAP: Record<number, TipPriority> = {
  0: 'low',
  1: 'normal',
  2: 'high',
  3: 'breaking',
};

const TIP_STATUS_MAP: Record<number, TipStatus> = {
  0: 'pending',
  1: 'settled',
  2: 'refunded',
};

const TIP_SOURCE_TYPE_MAP: Record<number, TipSourceType> = {
  0: 'text',
  1: 'url',
};

export function decodeTipAnchorAccount(data: Buffer): TipAnchorAccount {
  let offset = DISCRIMINATOR_LEN;

  const tipper = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const contentHash = data.subarray(offset, offset + 32);
  offset += 32;

  const amount = data.readBigUInt64LE(offset);
  offset += 8;

  const priorityByte = data.readUInt8(offset);
  offset += 1;
  const priority = TIP_PRIORITY_MAP[priorityByte] ?? 'low';

  const sourceTypeByte = data.readUInt8(offset);
  offset += 1;
  const sourceType = TIP_SOURCE_TYPE_MAP[sourceTypeByte] ?? 'text';

  const targetEnclave = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const tipNonce = data.readBigUInt64LE(offset);
  offset += 8;

  const createdAt = data.readBigInt64LE(offset);
  offset += 8;

  const statusByte = data.readUInt8(offset);
  offset += 1;
  const status = TIP_STATUS_MAP[statusByte] ?? 'pending';

  const bump = data.readUInt8(offset);

  return { tipper, contentHash, amount, priority, sourceType, targetEnclave, tipNonce, createdAt, status, bump };
}

export function decodeTipEscrowAccount(data: Buffer): TipEscrowAccount {
  let offset = DISCRIMINATOR_LEN;

  const tip = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const amount = data.readBigUInt64LE(offset);
  offset += 8;

  const bump = data.readUInt8(offset);

  return { tip, amount, bump };
}

export function decodeTipperRateLimitAccount(data: Buffer): TipperRateLimitAccount {
  let offset = DISCRIMINATOR_LEN;

  const tipper = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const tipsThisMinute = data.readUInt16LE(offset);
  offset += 2;

  const tipsThisHour = data.readUInt16LE(offset);
  offset += 2;

  const minuteResetAt = data.readBigInt64LE(offset);
  offset += 8;

  const hourResetAt = data.readBigInt64LE(offset);
  offset += 8;

  const bump = data.readUInt8(offset);

  return { tipper, tipsThisMinute, tipsThisHour, minuteResetAt, hourResetAt, bump };
}
