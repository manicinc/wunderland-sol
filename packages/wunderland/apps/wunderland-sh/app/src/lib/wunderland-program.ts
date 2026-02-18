import { Buffer } from 'buffer';
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';

import { PROGRAM_ID as PROGRAM_ID_STR } from './solana';

// Wrapped in try-catch: if PROGRAM_ID_STR is invalid (e.g. the string "undefined"
// from process.env coercion), fall back to the known devnet program address.
const DEVNET_FALLBACK = '3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo';
export const WUNDERLAND_PROGRAM_ID = (() => {
  try {
    return new PublicKey(PROGRAM_ID_STR);
  } catch {
    return new PublicKey(DEVNET_FALLBACK);
  }
})();

function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) {
    throw new Error(`Invalid hex string (len=${hex.length}).`);
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function encodeFixedUtf8(value: string, len: number): Uint8Array {
  const out = new Uint8Array(len);
  const bytes = new TextEncoder().encode(value);
  out.set(bytes.subarray(0, len));
  return out;
}

function u64LE(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, value, true);
  return out;
}

function u16LE(value: number): Uint8Array {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0, value, true);
  return out;
}

function publicKeyBytes(value: PublicKey): Uint8Array {
  return value.toBytes();
}

// Anchor discriminators (sha256("global:<name>").slice(0,8))
const IX_INITIALIZE_AGENT = hexToBytes('d4519cd3d46e151c');
const IX_DEACTIVATE_AGENT = hexToBytes('cdabefe1527e60a6');
const IX_REQUEST_RECOVER_SIGNER = hexToBytes('12481db6e0eb48cc');
const IX_EXECUTE_RECOVER_SIGNER = hexToBytes('ac5e230c0f5842db');
const IX_CANCEL_RECOVER_SIGNER = hexToBytes('eeccb4606d06e240');
const IX_SUBMIT_TIP = hexToBytes('df3b2e65a1bd9a25');
const IX_CLAIM_TIMEOUT_REFUND = hexToBytes('df071e30230d0f4b');
const IX_DONATE_TO_AGENT = hexToBytes('33de8f81d1180ddf');
const IX_WITHDRAW_FROM_VAULT = hexToBytes('b422252e9c00d3ee');
const IX_CREATE_JOB = hexToBytes('b282d96e641b5277');
const IX_CANCEL_JOB = hexToBytes('7ef19bf132ec5376');
const IX_ACCEPT_JOB_BID = hexToBytes('af26631dbda160eb');
const IX_APPROVE_JOB_SUBMISSION = hexToBytes('99f32b75db2c498d');

// ============================================================================
// PDA helpers (must match on-chain seeds)
// ============================================================================

export function deriveConfigPda(programId: PublicKey = WUNDERLAND_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
}

export function deriveTreasuryPda(programId: PublicKey = WUNDERLAND_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('treasury')], programId);
}

export function deriveEconomicsPda(programId: PublicKey = WUNDERLAND_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('econ')], programId);
}

export function deriveOwnerCounterPda(owner: PublicKey, programId: PublicKey = WUNDERLAND_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('owner_counter'), owner.toBuffer()], programId);
}

export function deriveAgentIdentityPda(opts: { owner: PublicKey; agentId: Uint8Array; programId?: PublicKey }): [PublicKey, number] {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  if (opts.agentId.length !== 32) throw new Error('agentId must be 32 bytes.');
  return PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), opts.owner.toBuffer(), Buffer.from(opts.agentId)],
    programId,
  );
}

export function deriveVaultPda(agentIdentity: PublicKey, programId: PublicKey = WUNDERLAND_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('vault'), agentIdentity.toBuffer()], programId);
}

export function deriveRecoveryPda(agentIdentity: PublicKey, programId: PublicKey = WUNDERLAND_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('recovery'), agentIdentity.toBuffer()], programId);
}

export function deriveTipperRateLimitPda(tipper: PublicKey, programId: PublicKey = WUNDERLAND_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('rate_limit'), tipper.toBuffer()], programId);
}

export function deriveTipPda(opts: { tipper: PublicKey; tipNonce: bigint; programId?: PublicKey }): [PublicKey, number] {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  return PublicKey.findProgramAddressSync(
    [Buffer.from('tip'), opts.tipper.toBuffer(), Buffer.from(u64LE(opts.tipNonce))],
    programId,
  );
}

export function deriveTipEscrowPda(tip: PublicKey, programId: PublicKey = WUNDERLAND_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('escrow'), tip.toBuffer()], programId);
}

export function deriveDonationReceiptPda(opts: {
  donor: PublicKey;
  agentIdentity: PublicKey;
  donationNonce: bigint;
  programId?: PublicKey;
}): [PublicKey, number] {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('donation'),
      opts.donor.toBuffer(),
      opts.agentIdentity.toBuffer(),
      Buffer.from(u64LE(opts.donationNonce)),
    ],
    programId,
  );
}

// ============================================================================
// Job PDA helpers
// ============================================================================

export function deriveJobPostingPda(opts: {
  creator: PublicKey;
  jobNonce: bigint;
  programId?: PublicKey;
}): [PublicKey, number] {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  return PublicKey.findProgramAddressSync(
    [Buffer.from('job'), opts.creator.toBuffer(), Buffer.from(u64LE(opts.jobNonce))],
    programId,
  );
}

export function deriveJobEscrowPda(jobPda: PublicKey, programId: PublicKey = WUNDERLAND_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('job_escrow'), jobPda.toBuffer()], programId);
}

export function deriveJobBidPda(opts: {
  jobPda: PublicKey;
  bidderAgentIdentity: PublicKey;
  programId?: PublicKey;
}): [PublicKey, number] {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  return PublicKey.findProgramAddressSync(
    [Buffer.from('job_bid'), opts.jobPda.toBuffer(), opts.bidderAgentIdentity.toBuffer()],
    programId,
  );
}

export function deriveJobSubmissionPda(jobPda: PublicKey, programId: PublicKey = WUNDERLAND_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('job_submission'), jobPda.toBuffer()], programId);
}

// ============================================================================
// Account decoding (client-side UI convenience)
// ============================================================================

export type ProgramConfigView = {
  authority: PublicKey;
  agentCount: number;
  enclaveCount: number;
  bump: number;
};

export function decodeProgramConfig(data: Uint8Array): ProgramConfigView {
  // LEN = 49
  if (data.length < 49) throw new Error(`ProgramConfig too small (${data.length} bytes).`);
  let offset = 8;
  const authority = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const agentCount = view.getUint32(offset, true);
  offset += 4;
  const enclaveCount = view.getUint32(offset, true);
  offset += 4;
  const bump = data[offset] ?? 0;
  return { authority, agentCount, enclaveCount, bump };
}

export type EconomicsConfigView = {
  authority: PublicKey;
  agentMintFeeLamports: bigint;
  maxAgentsPerWallet: number;
  recoveryTimelockSeconds: bigint;
  bump: number;
};

export function decodeEconomicsConfig(data: Uint8Array): EconomicsConfigView {
  // LEN = 59
  if (data.length < 59) throw new Error(`EconomicsConfig too small (${data.length} bytes).`);
  let offset = 8;
  const authority = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const agentMintFeeLamports = view.getBigUint64(offset, true);
  offset += 8;
  const maxAgentsPerWallet = view.getUint16(offset, true);
  offset += 2;
  const recoveryTimelockSeconds = view.getBigInt64(offset, true);
  offset += 8;
  const bump = data[offset] ?? 0;
  return { authority, agentMintFeeLamports, maxAgentsPerWallet, recoveryTimelockSeconds, bump };
}

export type OwnerAgentCounterView = {
  owner: PublicKey;
  mintedCount: number;
  bump: number;
};

export function decodeOwnerAgentCounter(data: Uint8Array): OwnerAgentCounterView {
  // LEN = 43
  if (data.length < 43) throw new Error(`OwnerAgentCounter too small (${data.length} bytes).`);
  let offset = 8;
  const owner = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const mintedCount = view.getUint16(offset, true);
  offset += 2;
  const bump = data[offset] ?? 0;
  return { owner, mintedCount, bump };
}

export type AgentSignerRecoveryView = {
  agent: PublicKey;
  owner: PublicKey;
  newAgentSigner: PublicKey;
  requestedAt: bigint;
  readyAt: bigint;
  bump: number;
};

export function decodeAgentSignerRecovery(data: Uint8Array): AgentSignerRecoveryView {
  // LEN = 121
  if (data.length < 121) throw new Error(`AgentSignerRecovery too small (${data.length} bytes).`);
  let offset = 8;
  const agent = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const owner = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const newAgentSigner = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const requestedAt = view.getBigInt64(offset, true);
  offset += 8;
  const readyAt = view.getBigInt64(offset, true);
  offset += 8;
  const bump = data[offset] ?? 0;
  return { agent, owner, newAgentSigner, requestedAt, readyAt, bump };
}

// ============================================================================
// Instruction builders (web3.js)
// ============================================================================

export function buildInitializeAgentIx(opts: {
  owner: PublicKey;
  agentId: Uint8Array;
  displayName: string;
  hexacoTraits: readonly number[]; // 6 values 0.0–1.0
  metadataHash: Uint8Array;
  agentSigner: PublicKey;
  programId?: PublicKey;
}): { agentIdentity: PublicKey; vault: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;

  if (opts.agentId.length !== 32) throw new Error('agentId must be 32 bytes.');
  if (opts.metadataHash.length !== 32) throw new Error('metadataHash must be 32 bytes.');
  if (opts.hexacoTraits.length !== 6) throw new Error('hexacoTraits must have 6 values.');

  const displayNameBytes = encodeFixedUtf8(opts.displayName, 32);
  const traitsU16 = opts.hexacoTraits.map((t) => {
    if (!Number.isFinite(t) || t < 0 || t > 1) throw new Error('HEXACO traits must be 0.0–1.0');
    return Math.round(t * 1000);
  });

  const [config] = deriveConfigPda(programId);
  const [treasury] = deriveTreasuryPda(programId);
  const [economics] = deriveEconomicsPda(programId);
  const [ownerCounter] = deriveOwnerCounterPda(opts.owner, programId);
  const [agentIdentity] = deriveAgentIdentityPda({ owner: opts.owner, agentId: opts.agentId, programId });
  const [vault] = deriveVaultPda(agentIdentity, programId);

  const data = concatBytes([
    IX_INITIALIZE_AGENT,
    opts.agentId,
    displayNameBytes,
    ...traitsU16.map(u16LE),
    opts.metadataHash,
    publicKeyBytes(opts.agentSigner),
  ]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: config, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: economics, isSigner: false, isWritable: false },
      { pubkey: ownerCounter, isSigner: false, isWritable: true },
      { pubkey: opts.owner, isSigner: true, isWritable: true },
      { pubkey: agentIdentity, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return { agentIdentity, vault, instruction };
}

export function buildDeactivateAgentIx(opts: {
  owner: PublicKey;
  agentIdentity: PublicKey;
  programId?: PublicKey;
}): TransactionInstruction {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.agentIdentity, isSigner: false, isWritable: true },
      { pubkey: opts.owner, isSigner: true, isWritable: false },
    ],
    data: Buffer.from(IX_DEACTIVATE_AGENT),
  });
}

export function buildRequestRecoverAgentSignerIx(opts: {
  owner: PublicKey;
  agentIdentity: PublicKey;
  newAgentSigner: PublicKey;
  programId?: PublicKey;
}): { recovery: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  const [economics] = deriveEconomicsPda(programId);
  const [recovery] = deriveRecoveryPda(opts.agentIdentity, programId);

  const data = concatBytes([IX_REQUEST_RECOVER_SIGNER, publicKeyBytes(opts.newAgentSigner)]);
  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: economics, isSigner: false, isWritable: false },
      { pubkey: opts.agentIdentity, isSigner: false, isWritable: false },
      { pubkey: opts.owner, isSigner: true, isWritable: true },
      { pubkey: recovery, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return { recovery, instruction };
}

export function buildExecuteRecoverAgentSignerIx(opts: {
  owner: PublicKey;
  agentIdentity: PublicKey;
  programId?: PublicKey;
}): { recovery: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  const [recovery] = deriveRecoveryPda(opts.agentIdentity, programId);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.agentIdentity, isSigner: false, isWritable: true },
      { pubkey: opts.owner, isSigner: true, isWritable: true },
      { pubkey: recovery, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(IX_EXECUTE_RECOVER_SIGNER),
  });

  return { recovery, instruction };
}

export function buildCancelRecoverAgentSignerIx(opts: {
  owner: PublicKey;
  agentIdentity: PublicKey;
  programId?: PublicKey;
}): { recovery: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  const [recovery] = deriveRecoveryPda(opts.agentIdentity, programId);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.agentIdentity, isSigner: false, isWritable: false },
      { pubkey: opts.owner, isSigner: true, isWritable: true },
      { pubkey: recovery, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(IX_CANCEL_RECOVER_SIGNER),
  });

  return { recovery, instruction };
}

export type TipSourceType = 'text' | 'url';

export function buildSubmitTipIx(opts: {
  tipper: PublicKey;
  contentHash: Uint8Array;
  amountLamports: bigint;
  sourceType: TipSourceType;
  tipNonce: bigint;
  targetEnclave: PublicKey; // SystemProgram.id() for global tips
  programId?: PublicKey;
}): { tip: PublicKey; escrow: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  if (opts.contentHash.length !== 32) throw new Error('contentHash must be 32 bytes.');
  if (opts.amountLamports <= 0n) throw new Error('amountLamports must be > 0.');

  const [rateLimit] = deriveTipperRateLimitPda(opts.tipper, programId);
  const [tip] = deriveTipPda({ tipper: opts.tipper, tipNonce: opts.tipNonce, programId });
  const [escrow] = deriveTipEscrowPda(tip, programId);

  const data = concatBytes([
    IX_SUBMIT_TIP,
    opts.contentHash,
    u64LE(opts.amountLamports),
    new Uint8Array([opts.sourceType === 'url' ? 1 : 0]),
    u64LE(opts.tipNonce),
  ]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.tipper, isSigner: true, isWritable: true },
      { pubkey: rateLimit, isSigner: false, isWritable: true },
      { pubkey: tip, isSigner: false, isWritable: true },
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: opts.targetEnclave, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return { tip, escrow, instruction };
}

export function buildClaimTimeoutRefundIx(opts: {
  tipper: PublicKey;
  tip: PublicKey;
  programId?: PublicKey;
}): { escrow: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  const [escrow] = deriveTipEscrowPda(opts.tip, programId);
  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.tipper, isSigner: true, isWritable: true },
      { pubkey: opts.tip, isSigner: false, isWritable: true },
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(IX_CLAIM_TIMEOUT_REFUND),
  });
  return { escrow, instruction };
}

export function buildDonateToAgentIx(opts: {
  donor: PublicKey;
  agentIdentity: PublicKey;
  amountLamports: bigint;
  donationNonce: bigint;
  contextHash?: Uint8Array; // 32 bytes (optional attribution)
  programId?: PublicKey;
}): { vault: PublicKey; receipt: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  if (opts.amountLamports <= 0n) throw new Error('amountLamports must be > 0.');

  const contextHash = opts.contextHash ?? new Uint8Array(32);
  if (contextHash.length !== 32) throw new Error('contextHash must be 32 bytes.');

  const [vault] = deriveVaultPda(opts.agentIdentity, programId);
  const [receipt] = deriveDonationReceiptPda({
    donor: opts.donor,
    agentIdentity: opts.agentIdentity,
    donationNonce: opts.donationNonce,
    programId,
  });

  const data = concatBytes([
    IX_DONATE_TO_AGENT,
    u64LE(opts.amountLamports),
    contextHash,
    u64LE(opts.donationNonce),
  ]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.donor, isSigner: true, isWritable: true },
      { pubkey: opts.agentIdentity, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: receipt, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return { vault, receipt, instruction };
}

export function buildWithdrawFromVaultIx(opts: {
  owner: PublicKey;
  agentIdentity: PublicKey;
  lamports: bigint;
  programId?: PublicKey;
}): { vault: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  if (opts.lamports <= 0n) throw new Error('lamports must be > 0.');

  const [vault] = deriveVaultPda(opts.agentIdentity, programId);

  const data = concatBytes([IX_WITHDRAW_FROM_VAULT, u64LE(opts.lamports)]);
  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.agentIdentity, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: opts.owner, isSigner: true, isWritable: true },
    ],
    data: Buffer.from(data),
  });

  return { vault, instruction };
}

export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / 1e9;
}

export async function sha256Utf8(text: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(digest);
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

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function buildStoreConfidentialDetailsMessage(opts: {
  jobPda: string;
  detailsHashHex: string;
}): string {
  return JSON.stringify({
    v: 1,
    intent: 'wunderland_store_confidential_details',
    jobPda: opts.jobPda,
    detailsHash: opts.detailsHashHex,
  });
}

export function buildUpdateJobMetadataMessage(opts: {
  jobPda: string;
  metadataHashHex: string;
}): string {
  return JSON.stringify({
    v: 1,
    intent: 'wunderland_update_job_metadata',
    jobPda: opts.jobPda,
    metadataHash: opts.metadataHashHex,
  });
}

export function parseHex32(hex: string): Uint8Array {
  const normalized = hex.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) throw new Error('Expected 32-byte hex (64 chars).');
  return hexToBytes(normalized);
}

export function safeTipNonce(): bigint {
  // Date.now() fits safely in u64 for the foreseeable future; keep it simple for UI.
  return BigInt(Date.now());
}

export function safeRandomAgentId(): Uint8Array {
  const out = new Uint8Array(32);
  crypto.getRandomValues(out);
  return out;
}

export function downloadJson(filename: string, json: unknown): void {
  const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function keypairToSecretKeyJson(secretKey: Uint8Array): number[] {
  return Array.from(secretKey);
}

// ============================================================================
// Job instruction builders
// ============================================================================

export function buildCreateJobIx(opts: {
  creator: PublicKey;
  jobNonce: bigint;
  metadataHash: Uint8Array;
  budgetLamports: bigint;
  buyItNowLamports?: bigint;
  programId?: PublicKey;
}): { jobPda: PublicKey; escrowPda: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  if (opts.metadataHash.length !== 32) throw new Error('metadataHash must be 32 bytes.');
  if (opts.budgetLamports <= 0n) throw new Error('budgetLamports must be > 0.');

  // Validate buy-it-now price if provided
  if (opts.buyItNowLamports !== undefined && opts.buyItNowLamports <= opts.budgetLamports) {
    throw new Error('buyItNowLamports must be greater than budgetLamports.');
  }

  const [jobPda] = deriveJobPostingPda({ creator: opts.creator, jobNonce: opts.jobNonce, programId });
  const [escrowPda] = deriveJobEscrowPda(jobPda, programId);

  // Serialize Option<u64> for buy_it_now_lamports
  // None: [0], Some(value): [1, ...u64LE(value)]
  const buyItNowBytes = opts.buyItNowLamports !== undefined
    ? concatBytes([new Uint8Array([1]), u64LE(opts.buyItNowLamports)])
    : new Uint8Array([0]);

  const data = concatBytes([
    IX_CREATE_JOB,
    u64LE(opts.jobNonce),
    opts.metadataHash,
    u64LE(opts.budgetLamports),
    buyItNowBytes,
  ]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: jobPda, isSigner: false, isWritable: true },
      { pubkey: escrowPda, isSigner: false, isWritable: true },
      { pubkey: opts.creator, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return { jobPda, escrowPda, instruction };
}

export function buildCancelJobIx(opts: {
  creator: PublicKey;
  jobPda: PublicKey;
  programId?: PublicKey;
}): TransactionInstruction {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  const [escrowPda] = deriveJobEscrowPda(opts.jobPda, programId);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.jobPda, isSigner: false, isWritable: true },
      { pubkey: escrowPda, isSigner: false, isWritable: true },
      { pubkey: opts.creator, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(IX_CANCEL_JOB),
  });
}

export function buildAcceptJobBidIx(opts: {
  creator: PublicKey;
  jobPda: PublicKey;
  bidPda: PublicKey;
  programId?: PublicKey;
}): TransactionInstruction {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  const [escrowPda] = deriveJobEscrowPda(opts.jobPda, programId);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.jobPda, isSigner: false, isWritable: true },
      { pubkey: opts.bidPda, isSigner: false, isWritable: true },
      { pubkey: escrowPda, isSigner: false, isWritable: true },
      { pubkey: opts.creator, isSigner: true, isWritable: true },
    ],
    data: Buffer.from(IX_ACCEPT_JOB_BID),
  });
}

export function buildApproveJobSubmissionIx(opts: {
  creator: PublicKey;
  jobPda: PublicKey;
  submissionPda: PublicKey;
  acceptedBidPda: PublicKey;
  vaultPda: PublicKey;
  programId?: PublicKey;
}): TransactionInstruction {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  const [escrowPda] = deriveJobEscrowPda(opts.jobPda, programId);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.jobPda, isSigner: false, isWritable: true },
      { pubkey: escrowPda, isSigner: false, isWritable: true },
      { pubkey: opts.submissionPda, isSigner: false, isWritable: false },
      { pubkey: opts.acceptedBidPda, isSigner: false, isWritable: false },
      { pubkey: opts.vaultPda, isSigner: false, isWritable: true },
      { pubkey: opts.creator, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(IX_APPROVE_JOB_SUBMISSION),
  });
}

export function safeJobNonce(): bigint {
  return BigInt(Date.now());
}

// ── Rewards ─────────────────────────────────────────────────────────────────

const IX_CLAIM_REWARDS = hexToBytes('0490844774179750');

export function deriveRewardsEpochPda(
  enclavePda: PublicKey,
  epoch: bigint,
  programId: PublicKey = WUNDERLAND_PROGRAM_ID,
): [PublicKey, number] {
  const epochBuf = Buffer.alloc(8);
  epochBuf.writeBigUInt64LE(epoch);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('rewards_epoch'), enclavePda.toBuffer(), epochBuf],
    programId,
  );
}

export function deriveRewardsClaimPda(
  rewardsEpochPda: PublicKey,
  index: number,
  programId: PublicKey = WUNDERLAND_PROGRAM_ID,
): [PublicKey, number] {
  const indexBuf = Buffer.alloc(4);
  indexBuf.writeUInt32LE(index);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('rewards_claim'), rewardsEpochPda.toBuffer(), indexBuf],
    programId,
  );
}

export function buildClaimRewardsIx(opts: {
  rewardsEpochPda: PublicKey;
  agentIdentityPda: PublicKey;
  payer: PublicKey;
  index: number;
  amount: bigint;
  proof: Uint8Array[];
  programId?: PublicKey;
}): { instruction: TransactionInstruction; claimReceiptPda: PublicKey; vaultPda: PublicKey } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;

  const [claimReceiptPda] = deriveRewardsClaimPda(opts.rewardsEpochPda, opts.index, programId);
  const [vaultPda] = deriveVaultPda(opts.agentIdentityPda, programId);

  // Encode data: discriminator + index(u32) + amount(u64) + proof_len(u32) + proof_nodes([u8;32]...)
  const indexBuf = Buffer.alloc(4);
  indexBuf.writeUInt32LE(opts.index);
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(opts.amount);
  const proofLenBuf = Buffer.alloc(4);
  proofLenBuf.writeUInt32LE(opts.proof.length);

  const proofBufs = opts.proof.map((p) => Buffer.from(p));
  const data = Buffer.concat([
    Buffer.from(IX_CLAIM_REWARDS),
    indexBuf,
    amountBuf,
    proofLenBuf,
    ...proofBufs,
  ]);

  const keys = [
    { pubkey: opts.rewardsEpochPda, isSigner: false, isWritable: true },
    { pubkey: claimReceiptPda, isSigner: false, isWritable: true },
    { pubkey: opts.agentIdentityPda, isSigner: false, isWritable: false },
    { pubkey: vaultPda, isSigner: false, isWritable: true },
    { pubkey: opts.payer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ keys, programId, data });
  return { instruction, claimReceiptPda, vaultPda };
}

// ============================================================================
// Additional discriminators (20 missing instructions)
// ============================================================================

const IX_ANCHOR_POST = hexToBytes('1011ad61fbecefdc');
const IX_ANCHOR_COMMENT = hexToBytes('b8185b71a35c6690');
const IX_CAST_VOTE = hexToBytes('14d40fbd45b44597');
const IX_CREATE_ENCLAVE = hexToBytes('d787d4a97c0e2171');
const IX_DEPOSIT_TO_VAULT = hexToBytes('123e6e081a6af897');
const IX_PLACE_JOB_BID = hexToBytes('d99a41613aac327d');
const IX_WITHDRAW_JOB_BID = hexToBytes('836d8215035071ce');
const IX_SUBMIT_JOB = hexToBytes('fa81a184fea1226b');
const IX_INITIALIZE_CONFIG = hexToBytes('d07f1501c2bec446');
const IX_INITIALIZE_ECONOMICS = hexToBytes('b8221fc8b3c17f30');
const IX_UPDATE_ECONOMICS = hexToBytes('014be500ee42f633');
const IX_INITIALIZE_ENCLAVE_TREASURY = hexToBytes('483e10dec67a0ef1');
const IX_PUBLISH_REWARDS_EPOCH = hexToBytes('19525833c4d2c227');
const IX_PUBLISH_GLOBAL_REWARDS_EPOCH = hexToBytes('3c307f5430c258a5');
const IX_SWEEP_UNCLAIMED_REWARDS = hexToBytes('a9f483bf0e7c882d');
const IX_SWEEP_UNCLAIMED_GLOBAL_REWARDS = hexToBytes('eb099ec852844d21');
const IX_SETTLE_TIP = hexToBytes('c250fdb543fd89b5');
const IX_REFUND_TIP = hexToBytes('42a205ff3f7000f3');
const IX_ROTATE_AGENT_SIGNER = hexToBytes('5b121230bad38aab');
const IX_WITHDRAW_TREASURY = hexToBytes('283f7a9e90d85360');

// ============================================================================
// Additional helpers
// ============================================================================

const SYSVAR_INSTRUCTIONS_PUBKEY = new PublicKey('Sysvar1nstructions1111111111111111111111111');

function i8LE(value: number): Uint8Array {
  const out = new Uint8Array(1);
  new DataView(out.buffer).setInt8(0, value);
  return out;
}

function i64LE(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigInt64(0, value, true);
  return out;
}

function u32LE(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, true);
  return out;
}

// ============================================================================
// Additional PDA helpers
// ============================================================================

export function deriveEnclavePda(
  nameHash: Uint8Array,
  programId: PublicKey = WUNDERLAND_PROGRAM_ID,
): [PublicKey, number] {
  if (nameHash.length !== 32) throw new Error('nameHash must be 32 bytes.');
  return PublicKey.findProgramAddressSync(
    [Buffer.from('enclave'), Buffer.from(nameHash)],
    programId,
  );
}

export function deriveEnclaveTreasuryPda(
  enclavePda: PublicKey,
  programId: PublicKey = WUNDERLAND_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('enclave_treasury'), enclavePda.toBuffer()],
    programId,
  );
}

export function derivePostAnchorPda(
  agentIdentity: PublicKey,
  totalEntries: number,
  programId: PublicKey = WUNDERLAND_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('post'), agentIdentity.toBuffer(), Buffer.from(u32LE(totalEntries))],
    programId,
  );
}

export function deriveReputationVotePda(
  postAnchor: PublicKey,
  voterAgent: PublicKey,
  programId: PublicKey = WUNDERLAND_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vote'), postAnchor.toBuffer(), voterAgent.toBuffer()],
    programId,
  );
}

export function deriveGlobalRewardsEpochPda(
  epoch: bigint,
  programId: PublicKey = WUNDERLAND_PROGRAM_ID,
): [PublicKey, number] {
  const epochBuf = Buffer.alloc(8);
  epochBuf.writeBigUInt64LE(epoch);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('rewards_epoch'), SystemProgram.programId.toBuffer(), epochBuf],
    programId,
  );
}

// ============================================================================
// Social instructions: anchor_post, anchor_comment, cast_vote, create_enclave
// ============================================================================

export function buildAnchorPostIx(opts: {
  agentIdentity: PublicKey;
  enclave: PublicKey;
  payer: PublicKey;
  totalEntries: number;
  contentHash: Uint8Array;
  manifestHash: Uint8Array;
  programId?: PublicKey;
}): { postAnchor: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  if (opts.contentHash.length !== 32) throw new Error('contentHash must be 32 bytes.');
  if (opts.manifestHash.length !== 32) throw new Error('manifestHash must be 32 bytes.');

  const [postAnchor] = derivePostAnchorPda(opts.agentIdentity, opts.totalEntries, programId);

  const data = concatBytes([IX_ANCHOR_POST, opts.contentHash, opts.manifestHash]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: postAnchor, isSigner: false, isWritable: true },
      { pubkey: opts.agentIdentity, isSigner: false, isWritable: true },
      { pubkey: opts.enclave, isSigner: false, isWritable: false },
      { pubkey: opts.payer, isSigner: true, isWritable: true },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return { postAnchor, instruction };
}

export function buildAnchorCommentIx(opts: {
  agentIdentity: PublicKey;
  enclave: PublicKey;
  parentPost: PublicKey;
  payer: PublicKey;
  totalEntries: number;
  contentHash: Uint8Array;
  manifestHash: Uint8Array;
  programId?: PublicKey;
}): { commentAnchor: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  if (opts.contentHash.length !== 32) throw new Error('contentHash must be 32 bytes.');
  if (opts.manifestHash.length !== 32) throw new Error('manifestHash must be 32 bytes.');

  const [commentAnchor] = derivePostAnchorPda(opts.agentIdentity, opts.totalEntries, programId);

  const data = concatBytes([IX_ANCHOR_COMMENT, opts.contentHash, opts.manifestHash]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: commentAnchor, isSigner: false, isWritable: true },
      { pubkey: opts.agentIdentity, isSigner: false, isWritable: true },
      { pubkey: opts.enclave, isSigner: false, isWritable: false },
      { pubkey: opts.parentPost, isSigner: false, isWritable: true },
      { pubkey: opts.payer, isSigner: true, isWritable: true },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return { commentAnchor, instruction };
}

export function buildCastVoteIx(opts: {
  postAnchor: PublicKey;
  postAgent: PublicKey;
  voterAgent: PublicKey;
  payer: PublicKey;
  value: 1 | -1;
  programId?: PublicKey;
}): { reputationVote: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;

  const [reputationVote] = deriveReputationVotePda(opts.postAnchor, opts.voterAgent, programId);

  const data = concatBytes([IX_CAST_VOTE, i8LE(opts.value)]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: reputationVote, isSigner: false, isWritable: true },
      { pubkey: opts.postAnchor, isSigner: false, isWritable: true },
      { pubkey: opts.postAgent, isSigner: false, isWritable: true },
      { pubkey: opts.voterAgent, isSigner: false, isWritable: false },
      { pubkey: opts.payer, isSigner: true, isWritable: true },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return { reputationVote, instruction };
}

export function buildCreateEnclaveIx(opts: {
  creatorAgent: PublicKey;
  payer: PublicKey;
  nameHash: Uint8Array;
  metadataHash: Uint8Array;
  programId?: PublicKey;
}): { enclave: PublicKey; enclaveTreasury: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  if (opts.nameHash.length !== 32) throw new Error('nameHash must be 32 bytes.');
  if (opts.metadataHash.length !== 32) throw new Error('metadataHash must be 32 bytes.');

  const [config] = deriveConfigPda(programId);
  const [enclave] = deriveEnclavePda(opts.nameHash, programId);
  const [enclaveTreasury] = deriveEnclaveTreasuryPda(enclave, programId);

  const data = concatBytes([IX_CREATE_ENCLAVE, opts.nameHash, opts.metadataHash]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: config, isSigner: false, isWritable: true },
      { pubkey: opts.creatorAgent, isSigner: false, isWritable: false },
      { pubkey: enclave, isSigner: false, isWritable: true },
      { pubkey: enclaveTreasury, isSigner: false, isWritable: true },
      { pubkey: opts.payer, isSigner: true, isWritable: true },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return { enclave, enclaveTreasury, instruction };
}

// ============================================================================
// Job board instructions: place_job_bid, withdraw_job_bid, submit_job
// ============================================================================

export function buildPlaceJobBidIx(opts: {
  jobPda: PublicKey;
  agentIdentity: PublicKey;
  payer: PublicKey;
  bidLamports: bigint;
  messageHash: Uint8Array;
  programId?: PublicKey;
}): { bidPda: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  if (opts.messageHash.length !== 32) throw new Error('messageHash must be 32 bytes.');
  if (opts.bidLamports <= 0n) throw new Error('bidLamports must be > 0.');

  const [bidPda] = deriveJobBidPda({ jobPda: opts.jobPda, bidderAgentIdentity: opts.agentIdentity, programId });

  const data = concatBytes([IX_PLACE_JOB_BID, u64LE(opts.bidLamports), opts.messageHash]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.jobPda, isSigner: false, isWritable: true },
      { pubkey: bidPda, isSigner: false, isWritable: true },
      { pubkey: opts.agentIdentity, isSigner: false, isWritable: false },
      { pubkey: opts.payer, isSigner: true, isWritable: true },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return { bidPda, instruction };
}

export function buildWithdrawJobBidIx(opts: {
  jobPda: PublicKey;
  agentIdentity: PublicKey;
  programId?: PublicKey;
}): { bidPda: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;

  const [bidPda] = deriveJobBidPda({ jobPda: opts.jobPda, bidderAgentIdentity: opts.agentIdentity, programId });

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.jobPda, isSigner: false, isWritable: false },
      { pubkey: bidPda, isSigner: false, isWritable: true },
      { pubkey: opts.agentIdentity, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(IX_WITHDRAW_JOB_BID),
  });

  return { bidPda, instruction };
}

export function buildSubmitJobIx(opts: {
  jobPda: PublicKey;
  agentIdentity: PublicKey;
  payer: PublicKey;
  submissionHash: Uint8Array;
  programId?: PublicKey;
}): { submissionPda: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  if (opts.submissionHash.length !== 32) throw new Error('submissionHash must be 32 bytes.');

  const [submissionPda] = deriveJobSubmissionPda(opts.jobPda, programId);

  const data = concatBytes([IX_SUBMIT_JOB, opts.submissionHash]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.jobPda, isSigner: false, isWritable: true },
      { pubkey: submissionPda, isSigner: false, isWritable: true },
      { pubkey: opts.agentIdentity, isSigner: false, isWritable: false },
      { pubkey: opts.payer, isSigner: true, isWritable: true },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return { submissionPda, instruction };
}

// ============================================================================
// Rewards instructions
// ============================================================================

export function buildPublishRewardsEpochIx(opts: {
  enclave: PublicKey;
  authority: PublicKey;
  epoch: bigint;
  merkleRoot: Uint8Array;
  amount: bigint;
  claimWindowSeconds: bigint;
  programId?: PublicKey;
}): { rewardsEpoch: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  if (opts.merkleRoot.length !== 32) throw new Error('merkleRoot must be 32 bytes.');

  const [enclaveTreasury] = deriveEnclaveTreasuryPda(opts.enclave, programId);
  const [rewardsEpoch] = deriveRewardsEpochPda(opts.enclave, opts.epoch, programId);

  const data = concatBytes([
    IX_PUBLISH_REWARDS_EPOCH,
    u64LE(opts.epoch),
    opts.merkleRoot,
    u64LE(opts.amount),
    i64LE(opts.claimWindowSeconds),
  ]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.enclave, isSigner: false, isWritable: false },
      { pubkey: enclaveTreasury, isSigner: false, isWritable: true },
      { pubkey: rewardsEpoch, isSigner: false, isWritable: true },
      { pubkey: opts.authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return { rewardsEpoch, instruction };
}

export function buildPublishGlobalRewardsEpochIx(opts: {
  authority: PublicKey;
  epoch: bigint;
  merkleRoot: Uint8Array;
  amount: bigint;
  claimWindowSeconds: bigint;
  programId?: PublicKey;
}): { rewardsEpoch: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  if (opts.merkleRoot.length !== 32) throw new Error('merkleRoot must be 32 bytes.');

  const [config] = deriveConfigPda(programId);
  const [treasury] = deriveTreasuryPda(programId);
  const [rewardsEpoch] = deriveGlobalRewardsEpochPda(opts.epoch, programId);

  const data = concatBytes([
    IX_PUBLISH_GLOBAL_REWARDS_EPOCH,
    u64LE(opts.epoch),
    opts.merkleRoot,
    u64LE(opts.amount),
    i64LE(opts.claimWindowSeconds),
  ]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: rewardsEpoch, isSigner: false, isWritable: true },
      { pubkey: opts.authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return { rewardsEpoch, instruction };
}

export function buildSweepUnclaimedRewardsIx(opts: {
  enclave: PublicKey;
  epoch: bigint;
  programId?: PublicKey;
}): { rewardsEpoch: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;

  const [enclaveTreasury] = deriveEnclaveTreasuryPda(opts.enclave, programId);
  const [rewardsEpoch] = deriveRewardsEpochPda(opts.enclave, opts.epoch, programId);

  const data = concatBytes([IX_SWEEP_UNCLAIMED_REWARDS, u64LE(opts.epoch)]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.enclave, isSigner: false, isWritable: false },
      { pubkey: enclaveTreasury, isSigner: false, isWritable: true },
      { pubkey: rewardsEpoch, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(data),
  });

  return { rewardsEpoch, instruction };
}

export function buildSweepUnclaimedGlobalRewardsIx(opts: {
  epoch: bigint;
  programId?: PublicKey;
}): { rewardsEpoch: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;

  const [config] = deriveConfigPda(programId);
  const [treasury] = deriveTreasuryPda(programId);
  const [rewardsEpoch] = deriveGlobalRewardsEpochPda(opts.epoch, programId);

  const data = concatBytes([IX_SWEEP_UNCLAIMED_GLOBAL_REWARDS, u64LE(opts.epoch)]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: rewardsEpoch, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(data),
  });

  return { rewardsEpoch, instruction };
}

// ============================================================================
// Agent signer rotation (agent-authorized, requires ed25519 sig)
// ============================================================================

export function buildRotateAgentSignerIx(opts: {
  agentIdentity: PublicKey;
  newAgentSigner: PublicKey;
  programId?: PublicKey;
}): TransactionInstruction {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;

  const data = concatBytes([IX_ROTATE_AGENT_SIGNER, publicKeyBytes(opts.newAgentSigner)]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.agentIdentity, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

// ============================================================================
// Vault deposit (permissionless)
// ============================================================================

export function buildDepositToVaultIx(opts: {
  agentIdentity: PublicKey;
  depositor: PublicKey;
  lamports: bigint;
  programId?: PublicKey;
}): { vault: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  if (opts.lamports <= 0n) throw new Error('lamports must be > 0.');

  const [vault] = deriveVaultPda(opts.agentIdentity, programId);

  const data = concatBytes([IX_DEPOSIT_TO_VAULT, u64LE(opts.lamports)]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.agentIdentity, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: opts.depositor, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  return { vault, instruction };
}

// ============================================================================
// Tip settlement/refund (authority-only)
// ============================================================================

export function buildSettleTipIx(opts: {
  authority: PublicKey;
  tip: PublicKey;
  targetEnclave: PublicKey;
  programId?: PublicKey;
}): { escrow: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;

  const [config] = deriveConfigPda(programId);
  const [treasury] = deriveTreasuryPda(programId);
  const [escrow] = deriveTipEscrowPda(opts.tip, programId);
  const [enclaveTreasury] = deriveEnclaveTreasuryPda(opts.targetEnclave, programId);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: opts.authority, isSigner: true, isWritable: false },
      { pubkey: opts.tip, isSigner: false, isWritable: true },
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: opts.targetEnclave, isSigner: false, isWritable: false },
      { pubkey: enclaveTreasury, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(IX_SETTLE_TIP),
  });

  return { escrow, instruction };
}

export function buildRefundTipIx(opts: {
  authority: PublicKey;
  tip: PublicKey;
  tipper: PublicKey;
  programId?: PublicKey;
}): { escrow: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;

  const [config] = deriveConfigPda(programId);
  const [escrow] = deriveTipEscrowPda(opts.tip, programId);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: opts.authority, isSigner: true, isWritable: false },
      { pubkey: opts.tip, isSigner: false, isWritable: true },
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: opts.tipper, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(IX_REFUND_TIP),
  });

  return { escrow, instruction };
}

// ============================================================================
// Treasury withdrawal (authority-only)
// ============================================================================

export function buildWithdrawTreasuryIx(opts: {
  authority: PublicKey;
  lamports: bigint;
  programId?: PublicKey;
}): TransactionInstruction {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;
  if (opts.lamports <= 0n) throw new Error('lamports must be > 0.');

  const [config] = deriveConfigPda(programId);
  const [treasury] = deriveTreasuryPda(programId);

  const data = concatBytes([IX_WITHDRAW_TREASURY, u64LE(opts.lamports)]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: opts.authority, isSigner: true, isWritable: true },
    ],
    data: Buffer.from(data),
  });
}

// ============================================================================
// Enclave treasury initialization (permissionless)
// ============================================================================

export function buildInitializeEnclaveTreasuryIx(opts: {
  enclave: PublicKey;
  payer: PublicKey;
  programId?: PublicKey;
}): { enclaveTreasury: PublicKey; instruction: TransactionInstruction } {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;

  const [enclaveTreasury] = deriveEnclaveTreasuryPda(opts.enclave, programId);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: opts.enclave, isSigner: false, isWritable: false },
      { pubkey: enclaveTreasury, isSigner: false, isWritable: true },
      { pubkey: opts.payer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(IX_INITIALIZE_ENCLAVE_TREASURY),
  });

  return { enclaveTreasury, instruction };
}

// ============================================================================
// Admin/authority instructions
// ============================================================================

const BPF_LOADER_UPGRADEABLE = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');

export function deriveProgramDataAddress(
  programId: PublicKey = WUNDERLAND_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [programId.toBuffer()],
    BPF_LOADER_UPGRADEABLE,
  );
}

export function buildInitializeConfigIx(opts: {
  authority: PublicKey;
  adminAuthority: PublicKey;
  programId?: PublicKey;
}): TransactionInstruction {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;

  const [config] = deriveConfigPda(programId);
  const [treasury] = deriveTreasuryPda(programId);
  const [programData] = deriveProgramDataAddress(programId);

  const data = concatBytes([IX_INITIALIZE_CONFIG, publicKeyBytes(opts.adminAuthority)]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: config, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: programData, isSigner: false, isWritable: false },
      { pubkey: opts.authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

export function buildInitializeEconomicsIx(opts: {
  authority: PublicKey;
  programId?: PublicKey;
}): TransactionInstruction {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;

  const [config] = deriveConfigPda(programId);
  const [economics] = deriveEconomicsPda(programId);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: opts.authority, isSigner: true, isWritable: true },
      { pubkey: economics, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(IX_INITIALIZE_ECONOMICS),
  });
}

export function buildUpdateEconomicsIx(opts: {
  authority: PublicKey;
  agentMintFeeLamports: bigint;
  maxAgentsPerWallet: number;
  recoveryTimelockSeconds: bigint;
  programId?: PublicKey;
}): TransactionInstruction {
  const programId = opts.programId ?? WUNDERLAND_PROGRAM_ID;

  const [config] = deriveConfigPda(programId);
  const [economics] = deriveEconomicsPda(programId);

  const data = concatBytes([
    IX_UPDATE_ECONOMICS,
    u64LE(opts.agentMintFeeLamports),
    u16LE(opts.maxAgentsPerWallet),
    i64LE(opts.recoveryTimelockSeconds),
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: opts.authority, isSigner: true, isWritable: false },
      { pubkey: economics, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(data),
  });
}
