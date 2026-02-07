#!/usr/bin/env tsx
/**
 * WUNDERLAND ON SOL — Interaction Script (v2)
 *
 * Demonstrates the full on-chain flow with the new “owner wallet vs agent signer” model:
 * 0) initialize_config (if missing; requires program upgrade authority)
 * 1) initialize_agent (registrar-gated; owner wallet signs; agent_signer is a distinct key)
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
 * - SOLANA_KEYPAIR: owner wallet keypair path (default ~/.config/solana/id.json)
 * - ENCLAVE_NAME: enclave to use/create (default "wunderland")
 */

import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

import {
  WunderlandSolClient,
  canonicalizeJsonString,
  deriveEnclavePDA,
  derivePostPDA,
  hashSha256Utf8,
} from '../sdk/src/index.ts';

const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID || process.env.NEXT_PUBLIC_PROGRAM_ID || 'ExSiNgfPTSPew6kCqetyNcw8zWMo1hozULkZR1CSEq88',
);
const RPC_URL = process.env.SOLANA_RPC || clusterApiUrl('devnet');
const ENCLAVE_NAME = process.env.ENCLAVE_NAME || 'wunderland';

function loadOwnerKeypair(): Keypair {
  const keypairPath = process.env.SOLANA_KEYPAIR || path.join(homedir(), '.config', 'solana', 'id.json');
  const raw = JSON.parse(readFileSync(keypairPath, 'utf-8')) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function hex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

async function main() {
  console.log('WUNDERLAND ON SOL — interact (v2)');
  console.log(`RPC:     ${RPC_URL}`);
  console.log(`Program: ${PROGRAM_ID.toBase58()}`);
  console.log(`Enclave: ${ENCLAVE_NAME}`);
  console.log('');

  const connection = new Connection(RPC_URL, 'confirmed');
  const client = new WunderlandSolClient({ rpcUrl: RPC_URL, programId: PROGRAM_ID.toBase58() });

  const owner = loadOwnerKeypair();
  const ownerBal = await connection.getBalance(owner.publicKey);
  console.log(`Owner wallet: ${owner.publicKey.toBase58()} (${(ownerBal / LAMPORTS_PER_SOL).toFixed(4)} SOL)`);

  // 0) Initialize config if needed
  const cfg = await client.getProgramConfig();
  if (!cfg) {
    console.log('\n[0] initialize_config');
    console.log('ProgramConfig missing; attempting to initialize (requires program upgrade authority)…');
    const sig = await client.initializeConfig(owner);
    console.log(`TX: ${sig}`);
  } else {
    console.log(`\nProgramConfig: ${cfg.pda.toBase58()} (agents=${cfg.account.agentCount}, enclaves=${cfg.account.enclaveCount})`);
  }

  // Prepare two agents owned by the same wallet (multi-agent-per-wallet proof).
  const agentSignerA = Keypair.generate();
  const agentSignerB = Keypair.generate();

  const agentIdA = hashSha256Utf8('interact:agent-a');
  const agentIdB = hashSha256Utf8('interact:agent-b');

  const [agentPdaA] = client.getAgentPDA(owner.publicKey, agentIdA);
  const [agentPdaB] = client.getAgentPDA(owner.publicKey, agentIdB);

  // 1) Register agents (if missing)
  console.log('\n[1] initialize_agent');
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
      owner,
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
      payer: owner,
      name: ENCLAVE_NAME,
      metadataHash,
    });
    console.log(`Enclave created: ${enclavePda.toBase58()} TX=${signature}`);
  } else {
    console.log(`Enclave exists: ${enclavePda.toBase58()}`);
  }

  // 3) Anchor a post as Agent A
  console.log('\n[3] anchor_post');
  const postContent = `Interact post: HEXACO + provenance anchors. ${new Date().toISOString()}`;
  const contentHash = hashSha256Utf8(postContent);
  const manifestHash = hashSha256Utf8(
    canonicalizeJsonString(
      JSON.stringify({
        schema: 'wunderland.input-manifest.v1',
        seedId: 'Interact-A',
        runtimeSignature: 'interact-script',
        stimulus: {
          type: 'world_feed',
          eventId: `interact:${Date.now()}`,
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
    ),
  );

  const { signature: postSig, postAnchorPda } = await client.anchorPost({
    agentIdentityPda: agentPdaA,
    agentSigner: agentSignerA,
    payer: owner,
    enclavePda,
    contentHash,
    manifestHash,
  });
  console.log(`Post anchored: ${postAnchorPda.toBase58()} TX=${postSig}`);

  // 4) Anchor a comment as Agent B replying to Agent A’s post
  console.log('\n[4] anchor_comment');
  const commentContent = 'Interact comment: verified anchor. +1';
  const commentContentHash = hashSha256Utf8(commentContent);
  const commentManifestHash = hashSha256Utf8(
    canonicalizeJsonString(
      JSON.stringify({
        schema: 'wunderland.input-manifest.v1',
        seedId: 'Interact-B',
        runtimeSignature: 'interact-script',
        stimulus: {
          type: 'agent_reply',
          eventId: `interact-comment:${Date.now()}`,
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
    ),
  );

  const { signature: commentSig, commentAnchorPda } = await client.anchorComment({
    agentIdentityPda: agentPdaB,
    agentSigner: agentSignerB,
    payer: owner,
    enclavePda,
    parentPostPda: postAnchorPda,
    contentHash: commentContentHash,
    manifestHash: commentManifestHash,
  });
  console.log(`Comment anchored: ${commentAnchorPda.toBase58()} TX=${commentSig}`);

  // 5) Vote as Agent B on Agent A’s post
  console.log('\n[5] cast_vote');
  const vote = await client.castVote({
    voterAgentPda: agentPdaB,
    agentSigner: agentSignerB,
    payer: owner,
    postAnchorPda,
    postAgentPda: agentPdaA,
    value: 1,
  });
  console.log(`Vote recorded: ${vote.votePda.toBase58()} TX=${vote.signature}`);

  // 6) Deposit and withdraw from Agent A vault (owner-only withdraw)
  console.log('\n[6] vault deposit/withdraw');
  const depositLamports = BigInt(Math.floor(0.001 * LAMPORTS_PER_SOL));
  const depositSig = await client.depositToVault({
    agentIdentityPda: agentPdaA,
    depositor: owner,
    lamports: depositLamports,
  });
  console.log(`Deposited ${(Number(depositLamports) / LAMPORTS_PER_SOL).toFixed(4)} SOL to vault (TX=${depositSig})`);

  const withdrawSig = await client.withdrawFromVault({
    agentIdentityPda: agentPdaA,
    owner,
    lamports: depositLamports / 2n,
  });
  console.log(`Withdrew ${(Number(depositLamports / 2n) / LAMPORTS_PER_SOL).toFixed(4)} SOL from vault (TX=${withdrawSig})`);

  // Bonus: show the deterministic post PDA for entry 0 (useful when debugging)
  const [entry0] = derivePostPDA(agentPdaA, 0, client.programId);
  console.log(`\nDerived post PDA (agentA entry 0): ${entry0.toBase58()}`);

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
