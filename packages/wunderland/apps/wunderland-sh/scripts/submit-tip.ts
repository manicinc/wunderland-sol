/**
 * @file submit-tip.ts
 * @description CLI helper to submit an on-chain tip (`submit_tip`) from a local keypair.
 *
 * Usage:
 *   TIPPER_KEYPAIR_PATH=... PROGRAM_ID=... CONTENT_HASH_HEX=... TIP_AMOUNT_SOL=0.02 pnpm -C apps/wunderland-sh tsx scripts/submit-tip.ts
 *
 * Optional:
 *   RPC_URL=... CLUSTER=devnet SOURCE_TYPE=url TIP_NONCE=123 TARGET_ENCLAVE=<enclavePda>
 */

import { readFileSync } from 'node:fs';
import { WunderlandSolClient, type TipSourceType } from '@wunderland-sol/sdk';
import { Keypair, PublicKey } from '@solana/web3.js';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function parseKeypair(path: string): Keypair {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as number[];
  if (!Array.isArray(raw) || raw.length < 32) {
    throw new Error(`Invalid keypair file: ${path}`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function parseContentHashHex(hex: string): Uint8Array {
  const h = hex.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(h)) {
    throw new Error('CONTENT_HASH_HEX must be 64 hex chars (sha256).');
  }
  return Buffer.from(h, 'hex');
}

function parseAmountLamports(): bigint {
  const lamportsRaw = process.env.TIP_AMOUNT_LAMPORTS?.trim();
  if (lamportsRaw) {
    if (!/^\d+$/.test(lamportsRaw)) throw new Error('TIP_AMOUNT_LAMPORTS must be an integer.');
    return BigInt(lamportsRaw);
  }

  const solRaw = process.env.TIP_AMOUNT_SOL?.trim();
  if (!solRaw) {
    throw new Error('Set TIP_AMOUNT_LAMPORTS or TIP_AMOUNT_SOL.');
  }
  const sol = Number(solRaw);
  if (!Number.isFinite(sol) || sol <= 0) throw new Error('TIP_AMOUNT_SOL must be a positive number.');
  return BigInt(Math.floor(sol * 1_000_000_000));
}

async function main(): Promise<void> {
  const programId =
    process.env.WUNDERLAND_SOL_PROGRAM_ID?.trim() ||
    process.env.PROGRAM_ID?.trim() ||
    process.env.NEXT_PUBLIC_PROGRAM_ID?.trim();
  if (!programId) throw new Error('Missing required env var: WUNDERLAND_SOL_PROGRAM_ID (or PROGRAM_ID).');
  const tipperKeypairPath = requiredEnv('TIPPER_KEYPAIR_PATH');
  const contentHashHex = requiredEnv('CONTENT_HASH_HEX');

  const rpcUrl = process.env.WUNDERLAND_SOL_RPC_URL || process.env.RPC_URL;
  const cluster = process.env.WUNDERLAND_SOL_CLUSTER || process.env.CLUSTER ?? 'devnet';
  const sourceType = (process.env.SOURCE_TYPE ?? 'text') as TipSourceType;
  if (sourceType !== 'text' && sourceType !== 'url') {
    throw new Error('SOURCE_TYPE must be "text" or "url".');
  }

  const tipNonceRaw = process.env.TIP_NONCE?.trim();
  const tipNonce = tipNonceRaw ? BigInt(tipNonceRaw) : BigInt(Date.now());

  const targetEnclaveRaw = process.env.TARGET_ENCLAVE?.trim();
  const targetEnclave = targetEnclaveRaw ? new PublicKey(targetEnclaveRaw) : undefined;

  const amount = parseAmountLamports();
  const tipper = parseKeypair(tipperKeypairPath);

  const client = new WunderlandSolClient({
    programId,
    rpcUrl: rpcUrl || undefined,
    cluster: cluster as any,
  });

  const { signature, tipPda, escrowPda } = await client.submitTip({
    tipper,
    contentHash: parseContentHashHex(contentHashHex),
    amount,
    sourceType,
    tipNonce,
    targetEnclave,
  });

  console.log('submit_tip ok');
  console.log(`  signature: ${signature}`);
  console.log(`  tipPda:     ${tipPda.toBase58()}`);
  console.log(`  escrowPda:  ${escrowPda.toBase58()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
