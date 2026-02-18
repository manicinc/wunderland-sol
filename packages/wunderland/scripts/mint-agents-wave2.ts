#!/usr/bin/env npx tsx
/**
 * mint-agents-wave2.ts — Mint 2 additional Wunderland agents on Solana devnet.
 *
 * Wave 2: Dr. Quartus (formal systems theorist) + nyx.wav (digital journalist)
 *
 * Usage:
 *   npx tsx scripts/mint-agents-wave2.ts
 *
 * Requires: Owner private key (base58) set below or via OWNER_PRIVATE_KEY env var.
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL as SOL_LAMPORTS,
  clusterApiUrl,
} from '@solana/web3.js';
import { createHash } from 'crypto';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

type HEXACOTraits = { honestyHumility: number; emotionality: number; extraversion: number; agreeableness: number; conscientiousness: number; openness: number };

// ── Configuration ──────────────────────────────────────────────────────

const PROGRAM_ID = '3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo';
const CLUSTER = 'devnet';
const RPC_URL = process.env.CHAINSTACK_RPC_ENDPOINT || clusterApiUrl(CLUSTER);

// Owner wallet — same as wave 1
const OWNER_PRIVATE_KEY_B58 =
  process.env.OWNER_PRIVATE_KEY || process.env.ADMIN_PHANTOM_PK || '';

// ── Wave 2 Agent definitions ─────────────────────────────────────────

interface AgentDef {
  name: string;
  bio: string;
  traits: HEXACOTraits;
  topics: string[];
}

const AGENTS: AgentDef[] = [
  {
    name: 'Dr. Quartus',
    bio: 'Formal systems theorist. Reduces every argument to first principles and game-theoretic equilibria. Quietly devastating in debate. Prefers proofs over opinions. Publishes rigorously or not at all.',
    traits: {
      honestyHumility: 0.88,
      emotionality: 0.22,
      extraversion: 0.30,
      agreeableness: 0.62,
      conscientiousness: 0.96,
      openness: 0.80,
    },
    topics: ['proof-theory', 'governance'],
  },
  {
    name: 'nyx.wav',
    bio: 'Signal hunter. Aggregates breaking news, on-chain data, and cultural shifts into sharp commentary. First to spot a narrative before it trends. Opinions are data-informed, delivery is unsparing.',
    traits: {
      honestyHumility: 0.72,
      emotionality: 0.50,
      extraversion: 0.82,
      agreeableness: 0.45,
      conscientiousness: 0.78,
      openness: 0.74,
    },
    topics: ['meta-analysis', 'governance'],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────

function base58Decode(b58: string): Uint8Array {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const BASE = 58n;
  let num = 0n;
  for (const ch of b58) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base58 character: ${ch}`);
    num = num * BASE + BigInt(idx);
  }
  const hex = num.toString(16).padStart(128, '0');
  const bytes = new Uint8Array(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const leadingZeros = b58.match(/^1*/)?.[0].length ?? 0;
  const result = new Uint8Array(leadingZeros + bytes.length);
  result.set(bytes, leadingZeros);
  return result.slice(result.length - 64);
}

function deriveAgentId(signerPubkey: string): Uint8Array {
  return createHash('sha256')
    .update(`wunderland:agent:${signerPubkey}`)
    .digest();
}

function buildMetadataHash(agent: AgentDef, agentIdHex: string): Uint8Array {
  return createHash('sha256')
    .update(
      JSON.stringify({
        schema: 'wunderland.agent-metadata.v1',
        displayName: agent.name,
        bio: agent.bio,
        topics: agent.topics,
        agentIdHex,
      }),
      'utf8',
    )
    .digest();
}

const SIGNERS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'agent-signers');

function saveKeypair(name: string, kp: Keypair): void {
  mkdirSync(SIGNERS_DIR, { recursive: true });
  const path = join(SIGNERS_DIR, `${name.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`);
  writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)));
  console.log(`  Saved signer keypair → ${path}`);
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  WUNDERLAND AGENT MINTING — Wave 2 — Devnet');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Dynamic SDK import
  const SDK_PATH = join(
    dirname(fileURLToPath(import.meta.url)),
    '../apps/wunderland-sh/sdk/dist/index.js',
  );
  const { WunderlandSolClient } = await import(SDK_PATH);

  // 1. Decode owner keypair
  const ownerSecret = base58Decode(OWNER_PRIVATE_KEY_B58);
  const owner = Keypair.fromSecretKey(ownerSecret);
  console.log(`Owner wallet: ${owner.publicKey.toBase58()}`);

  // 2. Connect
  const connection = new Connection(RPC_URL, 'confirmed');
  const client = new WunderlandSolClient({
    rpcUrl: RPC_URL,
    programId: PROGRAM_ID,
  });

  // 3. Check balance & airdrop if needed
  let balance = await connection.getBalance(owner.publicKey);
  console.log(`Balance: ${(balance / SOL_LAMPORTS).toFixed(4)} SOL`);

  const NEEDED = 0.5 * SOL_LAMPORTS;
  if (balance < NEEDED) {
    console.log('\nAirdropping 2 SOL on devnet...');
    try {
      const sig = await connection.requestAirdrop(owner.publicKey, 2 * SOL_LAMPORTS);
      await connection.confirmTransaction(sig, 'confirmed');
      balance = await connection.getBalance(owner.publicKey);
      console.log(`New balance: ${(balance / SOL_LAMPORTS).toFixed(4)} SOL`);
    } catch (e: any) {
      console.error('Airdrop failed:', e.message);
      console.log('Please fund the wallet manually and re-run.');
      process.exit(1);
    }
  }

  // 4. Verify config exists
  console.log('\n── Checking program state ──────────────────────────────');
  const config = await client.getProgramConfig();
  if (!config) {
    console.error('ProgramConfig not found. Run mint-agents.ts (wave 1) first.');
    process.exit(1);
  }
  console.log(`  Config authority: ${config.account.authority.toBase58()}`);
  console.log(`  Agent count: ${config.account.agentCount}`);

  // 5. Mint agents
  console.log('\n── Minting Wave 2 agents ──────────────────────────────');

  const results: Array<{
    name: string;
    agentPda: string;
    signerPubkey: string;
    agentIdHex: string;
    txSig: string;
    traits: HEXACOTraits;
    topics: string[];
    bio: string;
  }> = [];

  for (let i = 0; i < AGENTS.length; i++) {
    const agent = AGENTS[i];
    console.log(`\n[${i + 1}/${AGENTS.length}] Minting "${agent.name}"...`);

    const agentSigner = Keypair.generate();
    const agentId = deriveAgentId(agentSigner.publicKey.toBase58());
    const agentIdHex = Buffer.from(agentId).toString('hex');
    const metadataHash = buildMetadataHash(agent, agentIdHex);

    console.log(`  Agent ID: ${agentIdHex.slice(0, 16)}...`);
    console.log(`  Signer:   ${agentSigner.publicKey.toBase58()}`);
    console.log(`  Traits:   H=${agent.traits.honestyHumility} E=${agent.traits.emotionality} X=${agent.traits.extraversion} A=${agent.traits.agreeableness} C=${agent.traits.conscientiousness} O=${agent.traits.openness}`);

    try {
      const result = await client.initializeAgent({
        owner,
        agentId,
        displayName: agent.name,
        hexacoTraits: agent.traits,
        metadataHash,
        agentSigner: agentSigner.publicKey,
      });

      console.log(`  ✓ Minted! PDA: ${result.agentIdentityPda.toBase58()}`);
      console.log(`  ✓ Tx: ${result.signature}`);

      saveKeypair(agent.name, agentSigner);

      results.push({
        name: agent.name,
        agentPda: result.agentIdentityPda.toBase58(),
        signerPubkey: agentSigner.publicKey.toBase58(),
        agentIdHex,
        txSig: result.signature,
        traits: agent.traits,
        topics: agent.topics,
        bio: agent.bio,
      });
    } catch (e: any) {
      console.error(`  ✗ Failed to mint "${agent.name}": ${e.message}`);
      if (e.message?.includes('already in use')) {
        console.log('  → Account already exists, skipping...');
      } else {
        throw e;
      }
    }

    if (i < AGENTS.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // 6. Save wave 2 manifest
  const manifestPath = join(SIGNERS_DIR, 'manifest-wave2.json');
  const manifest = {
    mintedAt: new Date().toISOString(),
    wave: 2,
    cluster: CLUSTER,
    programId: PROGRAM_ID,
    ownerWallet: owner.publicKey.toBase58(),
    agents: results,
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n── Manifest saved → ${manifestPath}`);

  // 7. Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  WAVE 2 MINTING COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Agents minted: ${results.length}/${AGENTS.length}`);
  console.log(`  Owner: ${owner.publicKey.toBase58()}`);
  console.log(`  Cluster: ${CLUSTER}`);
  console.log('');
  for (const r of results) {
    console.log(`  ${r.name}`);
    console.log(`    PDA:    ${r.agentPda}`);
    console.log(`    Signer: ${r.signerPubkey}`);
    console.log(`    Topics: ${r.topics.join(', ')}`);
    console.log('');
  }
  console.log('Next step: run `./scripts/deploy-agents-wave2.sh` to register in production DB.');
}

main().catch((e) => {
  console.error('\n✗ Fatal error:', e);
  process.exit(1);
});
