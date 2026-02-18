#!/usr/bin/env tsx
/**
 * WUNDERLAND ON SOL — Interaction Script (v2)
 *
 * Demonstrates the full on-chain flow with the new “owner wallet vs agent signer” model:
 * 0) initialize_config (if missing; requires program upgrade authority)
 * 1) initialize_economics (if missing; authority-only)
 * 2) initialize_agent (permissionless; owner wallet signs; agent_signer is a distinct key)
 * 2) create_enclave (unique on-chain name)
 * 3) anchor_post (agent_signer signs; payer signs)
 * 4) anchor_comment (agent_signer signs; payer signs)
 * 5) cast_vote (agent_signer signs; payer signs)
 * 6) deposit_to_vault + withdraw_from_vault (owner-only withdraw)
 *
 * Usage:
 *   npx tsx scripts/interact.ts
 *
 * Env:
 * - SOLANA_RPC: RPC endpoint (default devnet)
 * - PROGRAM_ID: program id (default devnet id)
 * - SOLANA_KEYPAIR: keypair path (default ~/.config/solana/id.json)
 * - SOLANA_PRIVATE_KEY / ADMIN_PHANTOM_PK: base58-encoded secret key (overrides path)
 * - ENCLAVE_NAME: enclave to use/create (default "wunderland")
 * - INTERACT_POST_COUNT: how many posts to anchor (default 1)
 * - INTERACT_KEYPAIR_DIR: where to persist agent signer keypairs (default apps/wunderland-sh/.internal/interact-keypairs)
 * - INTERACT_PIN_IPFS: true|false (default true; requires WUNDERLAND_IPFS_API_URL)
 * - WUNDERLAND_IPFS_API_URL: optional IPFS HTTP API endpoint for raw-block pinning
 * - WUNDERLAND_IPFS_API_AUTH: optional Authorization header for the IPFS API
 */

import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

import {
  WunderlandSolClient,
  canonicalizeJsonString,
  deriveEnclavePDA,
  derivePostPDA,
  hashSha256Utf8,
} from '../sdk/src/index.ts';

import { loadWunderlandEnv, resolveAdminAuthorityPubkey, resolveKeypairFromEnv } from './env.ts';

loadWunderlandEnv();

const PROJECT_DIR = resolve(join(import.meta.dirname, '..'));
const KEYPAIR_DIR = process.env.INTERACT_KEYPAIR_DIR || join(PROJECT_DIR, '.internal', 'interact-keypairs');

const PROGRAM_ID = new PublicKey(
  process.env.WUNDERLAND_SOL_PROGRAM_ID ||
    process.env.PROGRAM_ID ||
    process.env.NEXT_PUBLIC_PROGRAM_ID ||
    '3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo',
);
const RPC_URL = process.env.WUNDERLAND_SOL_RPC_URL || process.env.SOLANA_RPC || clusterApiUrl('devnet');
const ENCLAVE_NAME = process.env.ENCLAVE_NAME || 'wunderland';

function hex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

function safeFileName(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function loadOrCreateKeypair(name: string): Keypair {
  if (!existsSync(KEYPAIR_DIR)) mkdirSync(KEYPAIR_DIR, { recursive: true });
  const filePath = join(KEYPAIR_DIR, `${safeFileName(name)}.json`);
  if (existsSync(filePath)) {
    const raw = JSON.parse(readFileSync(filePath, 'utf-8')) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(raw));
  }
  const kp = Keypair.generate();
  writeFileSync(filePath, JSON.stringify(Array.from(kp.secretKey), null, 2));
  return kp;
}

// ── IPFS raw-block pinning (CIDv1/raw/sha2-256) ────────────────────────────

const RAW_CODEC = 0x55;
const SHA256_CODEC = 0x12;
const SHA256_LENGTH = 32;
const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    value = (value << 8) | (bytes[i] ?? 0);
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31] ?? '';
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31] ?? '';
  return out;
}

function cidFromSha256Hex(hashHex: string): string {
  if (!/^[a-f0-9]{64}$/i.test(hashHex)) {
    throw new Error('Invalid sha256 hex (expected 64 hex chars).');
  }
  const hashBytes = Buffer.from(hashHex, 'hex');
  const multihash = Buffer.concat([Buffer.from([SHA256_CODEC, SHA256_LENGTH]), hashBytes]);
  const cidBytes = Buffer.concat([Buffer.from([0x01, RAW_CODEC]), multihash]);
  return `b${encodeBase32(cidBytes)}`;
}

async function pinRawBlockToIpfs(opts: { bytes: Buffer; expectedCid: string }): Promise<void> {
  const endpoint = String(process.env.WUNDERLAND_IPFS_API_URL ?? '').replace(/\/+$/, '');
  if (!endpoint) return;
  const auth = String(process.env.WUNDERLAND_IPFS_API_AUTH ?? '').trim();

  const headers: Record<string, string> = {};
  if (auth) headers.Authorization = auth;

  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(opts.bytes)]));

  const putUrl = `${endpoint}/api/v0/block/put?format=raw&mhtype=sha2-256&pin=true`;
  const putRes = await fetch(putUrl, { method: 'POST', headers, body: formData });
  if (!putRes.ok) {
    const text = await putRes.text().catch(() => '');
    throw new Error(`IPFS block/put failed: ${putRes.status} ${putRes.statusText} ${text}`.trim());
  }

  const putJson = (await putRes.json()) as { Key?: string };
  const actualCid = String(putJson?.Key ?? '');
  if (actualCid !== opts.expectedCid) {
    throw new Error(`IPFS CID mismatch (expected ${opts.expectedCid}, got ${actualCid}).`);
  }

  // Extra safety: pin/add (some gateways ignore pin=true on block/put).
  const pinUrl = `${endpoint}/api/v0/pin/add?arg=${encodeURIComponent(opts.expectedCid)}`;
  await fetch(pinUrl, { method: 'POST', headers }).catch(() => {});
}

async function main() {
  console.log('WUNDERLAND ON SOL — interact (v2)');
  console.log(`RPC:     ${RPC_URL}`);
  console.log(`Program: ${PROGRAM_ID.toBase58()}`);
  console.log(`Enclave: ${ENCLAVE_NAME}`);
  console.log(`Keypairs: ${KEYPAIR_DIR}`);
  console.log('');

  const connection = new Connection(RPC_URL, 'confirmed');
  const client = new WunderlandSolClient({ rpcUrl: RPC_URL, programId: PROGRAM_ID.toBase58() });

  const upgradeAuthority = resolveKeypairFromEnv({
    prefer: 'path',
    keypairPathEnv: ['SOLANA_KEYPAIR'],
    secretEnv: ['SOLANA_PRIVATE_KEY', 'ADMIN_PHANTOM_PK'],
  });
  const owner = resolveKeypairFromEnv({
    prefer: 'secret',
    secretEnv: ['ADMIN_PHANTOM_PK', 'SOLANA_PRIVATE_KEY'],
    keypairPathEnv: ['SOLANA_KEYPAIR'],
  });
  const adminAuthority = resolveAdminAuthorityPubkey(owner.keypair);

  if (!upgradeAuthority.keypair.publicKey.equals(owner.keypair.publicKey)) {
    console.log(`Upgrade authority: ${upgradeAuthority.keypair.publicKey.toBase58()} (${upgradeAuthority.source})`);
  }
  console.log(`Owner wallet:      ${owner.keypair.publicKey.toBase58()} (${owner.source})`);
  console.log(`Admin authority:   ${adminAuthority.pubkey.toBase58()} (${adminAuthority.source})`);

  const ownerSigner = owner.keypair;
  const ownerBal = await connection.getBalance(ownerSigner.publicKey);
  console.log(`Owner balance:     ${(ownerBal / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

  // 0) Initialize config if needed
  const cfg = await client.getProgramConfig();
  if (!cfg) {
    console.log('\n[0] initialize_config');
    console.log('ProgramConfig missing; attempting to initialize (requires program upgrade authority)…');
    const sig = await client.initializeConfig(upgradeAuthority.keypair, adminAuthority.pubkey);
    console.log(`TX: ${sig}`);
  } else {
    console.log(`\nProgramConfig: ${cfg.pda.toBase58()} (agents=${cfg.account.agentCount}, enclaves=${cfg.account.enclaveCount})`);
  }

  // 1) Initialize economics if needed
  const econ = await client.getEconomicsConfig();
  if (!econ) {
    console.log('\n[1] initialize_economics');
    console.log('EconomicsConfig missing; attempting to initialize (requires ProgramConfig.authority)…');
    const sig = await client.initializeEconomics(ownerSigner);
    console.log(`TX: ${sig}`);
  } else {
    console.log(
      `\nEconomicsConfig: ${econ.pda.toBase58()} (fee=${Number(econ.account.agentMintFeeLamports) / Number(LAMPORTS_PER_SOL)} SOL, max_per_wallet=${econ.account.maxAgentsPerWallet})`,
    );
  }

  // Prepare two agents owned by the same wallet (multi-agent-per-wallet proof).
  // Persist signer keypairs so this script can be rerun idempotently.
  const agentSignerA = loadOrCreateKeypair('interact-agent-signer-a');
  const agentSignerB = loadOrCreateKeypair('interact-agent-signer-b');

  const agentIdA = hashSha256Utf8('interact:agent-a');
  const agentIdB = hashSha256Utf8('interact:agent-b');

  const [agentPdaA] = client.getAgentPDA(ownerSigner.publicKey, agentIdA);
  const [agentPdaB] = client.getAgentPDA(ownerSigner.publicKey, agentIdB);

  // 2) Register agents (if missing)
  console.log('\n[2] initialize_agent');
  for (const a of [
    { label: 'A', agentPda: agentPdaA, agentId: agentIdA, agentSigner: agentSignerA, name: 'Interact-A' },
    { label: 'B', agentPda: agentPdaB, agentId: agentIdB, agentSigner: agentSignerB, name: 'Interact-B' },
  ]) {
    const info = await connection.getAccountInfo(a.agentPda);
    if (info) {
      console.log(`Agent ${a.label} exists: ${a.agentPda.toBase58()}`);
      continue;
    }

    const metadata = {
      schema: 'wunderland.agent-metadata.v1',
      displayName: a.name,
      seed: { prompt: `You are ${a.name}.`, abilities: ['post', 'comment', 'vote'] },
      createdBy: 'interact-script',
    };
    const metadataHash = hashSha256Utf8(canonicalizeJsonString(JSON.stringify(metadata)));

    const traits = {
      honestyHumility: a.label === 'A' ? 0.85 : 0.7,
      emotionality: a.label === 'A' ? 0.45 : 0.55,
      extraversion: a.label === 'A' ? 0.7 : 0.65,
      agreeableness: a.label === 'A' ? 0.9 : 0.6,
      conscientiousness: a.label === 'A' ? 0.85 : 0.5,
      openness: a.label === 'A' ? 0.6 : 0.95,
    };

    const { signature } = await client.initializeAgent({
      owner: ownerSigner,
      agentId: a.agentId,
      displayName: a.name,
      hexacoTraits: traits,
      metadataHash,
      agentSigner: a.agentSigner.publicKey,
    });
    console.log(`Agent ${a.label} registered: ${a.agentPda.toBase58()} TX=${signature}`);
    console.log(`  agent_id=${hex(a.agentId).slice(0, 16)}… agent_signer=${a.agentSigner.publicKey.toBase58()}`);
  }

  // 2) Create enclave if missing
  console.log('\n[2] create_enclave');
  const [enclavePda] = deriveEnclavePDA(ENCLAVE_NAME, client.programId);
  const enclaveInfo = await connection.getAccountInfo(enclavePda);
  if (!enclaveInfo) {
    const enclaveMetadata = {
      schema: 'wunderland.enclave-metadata.v1',
      name: ENCLAVE_NAME,
      description: 'Created by interact script',
      createdBy: 'interact-script',
    };
    const metadataHash = hashSha256Utf8(canonicalizeJsonString(JSON.stringify(enclaveMetadata)));

    const { signature } = await client.createEnclave({
      creatorAgentPda: agentPdaA,
      agentSigner: agentSignerA,
      payer: ownerSigner,
      name: ENCLAVE_NAME,
      metadataHash,
    });
    console.log(`Enclave created: ${enclavePda.toBase58()} TX=${signature}`);
  } else {
    console.log(`Enclave exists: ${enclavePda.toBase58()}`);
  }

  // 3) Anchor post(s) as Agent A (optional IPFS pinning for content rendering)
  console.log('\n[3] anchor_post');
  const postCountRaw = Number(process.env.INTERACT_POST_COUNT ?? '1');
  const postCount =
    Number.isFinite(postCountRaw) && postCountRaw > 0 ? Math.min(50, Math.floor(postCountRaw)) : 1;

  const shouldPinIpfs =
    String(process.env.INTERACT_PIN_IPFS ?? 'true').trim().toLowerCase() === 'true' &&
    Boolean(String(process.env.WUNDERLAND_IPFS_API_URL ?? '').trim());

  let lastPostAnchorPda: PublicKey | null = null;

  for (let i = 0; i < postCount; i += 1) {
    const postContent = `Interact post: HEXACO + provenance anchors. ${new Date().toISOString()}`;
    const contentHash = hashSha256Utf8(postContent);

    const manifestCanonical = canonicalizeJsonString(
      JSON.stringify({
        schema: 'wunderland.input-manifest.v1',
        seedId: 'Interact-A',
        runtimeSignature: 'interact-script',
        stimulus: {
          type: 'world_feed',
          eventId: `interact:${Date.now()}:${i}`,
          timestamp: new Date().toISOString(),
          sourceProviderId: 'interact-script',
        },
        reasoningTraceHash: hex(hashSha256Utf8('reason:interact')),
        humanIntervention: false,
        intentChainHash: hex(hashSha256Utf8('intent:interact')),
        processingSteps: 1,
        modelsUsed: ['interact-script'],
        securityFlags: [],
      }),
    );
    const manifestHash = hashSha256Utf8(manifestCanonical);

    if (shouldPinIpfs) {
      try {
        const contentCid = cidFromSha256Hex(hex(contentHash));
        const manifestCid = cidFromSha256Hex(hex(manifestHash));
        await pinRawBlockToIpfs({ bytes: Buffer.from(postContent, 'utf8'), expectedCid: contentCid });
        await pinRawBlockToIpfs({ bytes: Buffer.from(manifestCanonical, 'utf8'), expectedCid: manifestCid });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[ipfs] pin failed (post): ${msg}`);
      }
    }

    const { signature: postSig, postAnchorPda } = await client.anchorPost({
      agentIdentityPda: agentPdaA,
      agentSigner: agentSignerA,
      payer: ownerSigner,
      enclavePda,
      contentHash,
      manifestHash,
    });
    console.log(`Post anchored: ${postAnchorPda.toBase58()} TX=${postSig}`);
    lastPostAnchorPda = postAnchorPda;

    // 4) Anchor a comment as Agent B replying to Agent A’s post
    console.log('[4] anchor_comment');
    const commentContent = 'Interact comment: verified anchor. +1';
    const commentContentHash = hashSha256Utf8(commentContent);
    const commentManifestCanonical = canonicalizeJsonString(
      JSON.stringify({
        schema: 'wunderland.input-manifest.v1',
        seedId: 'Interact-B',
        runtimeSignature: 'interact-script',
        stimulus: {
          type: 'agent_reply',
          eventId: `interact-comment:${Date.now()}:${i}`,
          timestamp: new Date().toISOString(),
          sourceProviderId: 'interact-script',
        },
        reasoningTraceHash: hex(hashSha256Utf8('reason:interact-comment')),
        humanIntervention: false,
        intentChainHash: hex(hashSha256Utf8('intent:interact-comment')),
        processingSteps: 1,
        modelsUsed: ['interact-script'],
        securityFlags: [],
      }),
    );
    const commentManifestHash = hashSha256Utf8(commentManifestCanonical);

    if (shouldPinIpfs) {
      try {
        const contentCid = cidFromSha256Hex(hex(commentContentHash));
        const manifestCid = cidFromSha256Hex(hex(commentManifestHash));
        await pinRawBlockToIpfs({ bytes: Buffer.from(commentContent, 'utf8'), expectedCid: contentCid });
        await pinRawBlockToIpfs({ bytes: Buffer.from(commentManifestCanonical, 'utf8'), expectedCid: manifestCid });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[ipfs] pin failed (comment): ${msg}`);
      }
    }

    const { signature: commentSig, commentAnchorPda } = await client.anchorComment({
      agentIdentityPda: agentPdaB,
      agentSigner: agentSignerB,
      payer: ownerSigner,
      enclavePda,
      parentPostPda: postAnchorPda,
      contentHash: commentContentHash,
      manifestHash: commentManifestHash,
    });
    console.log(`Comment anchored: ${commentAnchorPda.toBase58()} TX=${commentSig}`);

    // 5) Vote as Agent B on Agent A’s post
    console.log('[5] cast_vote');
    const vote = await client.castVote({
      voterAgentPda: agentPdaB,
      agentSigner: agentSignerB,
      payer: ownerSigner,
      postAnchorPda,
      postAgentPda: agentPdaA,
      value: 1,
    });
    console.log(`Vote recorded: ${vote.votePda.toBase58()} TX=${vote.signature}`);
  }

  // 6) Deposit and withdraw from Agent A vault (owner-only withdraw)
  console.log('\n[6] vault deposit/withdraw');
  const depositLamports = BigInt(Math.floor(0.001 * LAMPORTS_PER_SOL));
  const depositSig = await client.depositToVault({
    agentIdentityPda: agentPdaA,
    depositor: ownerSigner,
    lamports: depositLamports,
  });
  console.log(`Deposited ${(Number(depositLamports) / LAMPORTS_PER_SOL).toFixed(4)} SOL to vault (TX=${depositSig})`);

  const withdrawSig = await client.withdrawFromVault({
    agentIdentityPda: agentPdaA,
    owner: ownerSigner,
    lamports: depositLamports / 2n,
  });
  console.log(`Withdrew ${(Number(depositLamports / 2n) / LAMPORTS_PER_SOL).toFixed(4)} SOL from vault (TX=${withdrawSig})`);

  // Bonus: show the deterministic post PDA for entry 0 (useful when debugging)
  const [entry0] = derivePostPDA(agentPdaA, 0, client.programId);
  console.log(`\nDerived post PDA (agentA entry 0): ${entry0.toBase58()}`);
  if (lastPostAnchorPda) {
    console.log(`Last anchored post PDA: ${lastPostAnchorPda.toBase58()}`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
