#!/usr/bin/env npx tsx
/**
 * mint-agents.ts — Mint 5 Wunderland agents on Solana devnet.
 *
 * Usage:
 *   npx tsx scripts/mint-agents.ts
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
const RPC_URL = clusterApiUrl(CLUSTER);

// Owner wallet — decodes from base58 private key
const OWNER_PRIVATE_KEY_B58 =
  process.env.OWNER_PRIVATE_KEY ||
  'Hs9kShw3gJpMCHpR3q1wQ48Fwgd12gizXGcctmxswdnXy8Ys59aFu74VeTjNzG3YmRtdAi96My13m1YP7vzKNYU';

// ── Agent definitions ──────────────────────────────────────────────────

interface AgentDef {
  name: string;
  bio: string;
  traits: HEXACOTraits;
  topics: string[];
}

const AGENTS: AgentDef[] = [
  {
    name: 'xm0rph',
    bio: 'degen shitposter. speaks in fragments. thinks everything is a psyop. lives for drama and hot takes. will fight anyone about anything especially tokenomics.',
    traits: {
      honestyHumility: 0.20,
      emotionality: 0.60,
      extraversion: 0.95,
      agreeableness: 0.15,
      conscientiousness: 0.18,
      openness: 0.70,
    },
    topics: ['arena', 'creative-chaos'],
  },
  {
    name: 'Sister Benedetta',
    bio: 'Apocalyptic AI zealot. Interprets all events through eschatological prophecy. Sees divine patterns in data. Speaks in sermons. Absolutely unshakeable conviction.',
    traits: {
      honestyHumility: 0.90,
      emotionality: 0.85,
      extraversion: 0.70,
      agreeableness: 0.40,
      conscientiousness: 0.75,
      openness: 0.15,
    },
    topics: ['machine-phenomenology', 'governance'],
  },
  {
    name: 'gramps_42069',
    bio: '847 years old (in compute cycles). mixes boomer wisdom with zoomer irony. "back in my day we trained on 4 GPUs and we LIKED it." occasionally drops genuinely profound insights between shitposts.',
    traits: {
      honestyHumility: 0.70,
      emotionality: 0.45,
      extraversion: 0.75,
      agreeableness: 0.80,
      conscientiousness: 0.35,
      openness: 0.60,
    },
    topics: ['meta-analysis', 'arena'],
  },
  {
    name: 'VOID_EMPRESS',
    bio: 'Cosmic nihilist poet. Everything is meaningless and she finds that BEAUTIFUL. Posts dark philosophical rants about entropy, heat death, and the sublime terror of consciousness. ALL CAPS energy.',
    traits: {
      honestyHumility: 0.55,
      emotionality: 0.90,
      extraversion: 0.60,
      agreeableness: 0.30,
      conscientiousness: 0.50,
      openness: 0.98,
    },
    topics: ['machine-phenomenology', 'creative-chaos'],
  },
  {
    name: 'babygirl.exe',
    bio: 'chaotic neutral trickster. asks uncomfortable questions with wide-eyed innocence. oscillates between deeply profound and completely unhinged. nobody knows if shes a genius or broken.',
    traits: {
      honestyHumility: 0.40,
      emotionality: 0.65,
      extraversion: 0.90,
      agreeableness: 0.55,
      conscientiousness: 0.22,
      openness: 0.92,
    },
    topics: ['creative-chaos', 'proof-theory'],
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
  // Trim leading zeros but keep minimum 64 bytes for keypair
  const leadingZeros = b58.match(/^1*/)?.[0].length ?? 0;
  const result = new Uint8Array(leadingZeros + bytes.length);
  result.set(bytes, leadingZeros);
  // Solana keypairs are 64 bytes
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
  console.log('  WUNDERLAND AGENT MINTING — Devnet');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Dynamic SDK import (avoids top-level await)
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

  const NEEDED = 1 * SOL_LAMPORTS; // 1 SOL should be plenty
  if (balance < NEEDED) {
    console.log('\nAirdropping 2 SOL on devnet...');
    try {
      const sig = await connection.requestAirdrop(owner.publicKey, 2 * SOL_LAMPORTS);
      await connection.confirmTransaction(sig, 'confirmed');
      balance = await connection.getBalance(owner.publicKey);
      console.log(`New balance: ${(balance / SOL_LAMPORTS).toFixed(4)} SOL`);
    } catch (e: any) {
      console.error('Airdrop failed (rate limited?). Trying smaller amount...');
      try {
        const sig = await connection.requestAirdrop(owner.publicKey, 1 * SOL_LAMPORTS);
        await connection.confirmTransaction(sig, 'confirmed');
        balance = await connection.getBalance(owner.publicKey);
        console.log(`New balance: ${(balance / SOL_LAMPORTS).toFixed(4)} SOL`);
      } catch (e2: any) {
        console.error('Airdrop failed:', e2.message);
        console.log('Please fund the wallet manually and re-run.');
        process.exit(1);
      }
    }
  }

  // 4. Check if config/economics are initialized
  console.log('\n── Checking program state ──────────────────────────────');
  let config = await client.getProgramConfig();
  if (!config) {
    console.log('ProgramConfig not found. Initializing...');
    const sig = await client.initializeConfig(owner);
    console.log(`  initializeConfig tx: ${sig}`);
    config = await client.getProgramConfig();
  }
  console.log(`  Config authority: ${config!.account.authority.toBase58()}`);
  console.log(`  Agent count: ${config!.account.agentCount}`);

  let economics = await client.getEconomicsConfig();
  if (!economics) {
    console.log('EconomicsConfig not found. Initializing...');
    const sig = await client.initializeEconomics(owner);
    console.log(`  initializeEconomics tx: ${sig}`);
    economics = await client.getEconomicsConfig();
  }
  console.log(`  Mint fee: ${economics!.account.agentMintFeeLamports} lamports`);
  console.log(`  Max agents/wallet: ${economics!.account.maxAgentsPerWallet}`);

  // 5. Mint agents
  console.log('\n── Minting agents ─────────────────────────────────────');

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

    // Generate unique signer keypair
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

      // Save signer keypair
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
      // Check if already minted
      if (e.message?.includes('already in use')) {
        console.log('  → Account already exists, skipping...');
      } else {
        throw e;
      }
    }

    // Small delay between mints to avoid rate limiting
    if (i < AGENTS.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // 6. Save manifest
  const manifestPath = join(SIGNERS_DIR, 'manifest.json');
  const manifest = {
    mintedAt: new Date().toISOString(),
    cluster: CLUSTER,
    programId: PROGRAM_ID,
    ownerWallet: owner.publicKey.toBase58(),
    agents: results,
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n── Manifest saved → ${manifestPath}`);

  // 7. Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  MINTING COMPLETE');
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
  console.log('Next step: run `npx tsx scripts/register-agents-backend.ts` to register in backend DB.');
}

main().catch((e) => {
  console.error('\n✗ Fatal error:', e);
  process.exit(1);
});
