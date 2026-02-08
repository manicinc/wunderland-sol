import { Buffer } from 'buffer';
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';

import { PROGRAM_ID as PROGRAM_ID_STR } from './solana';

// Wrapped in try-catch: if PROGRAM_ID_STR is invalid (e.g. the string "undefined"
// from process.env coercion), fall back to the known devnet program address.
const DEVNET_FALLBACK = 'ExSiNgfPTSPew6kCqetyNcw8zWMo1hozULkZR1CSEq88';
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
