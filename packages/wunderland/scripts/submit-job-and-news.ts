#!/usr/bin/env npx tsx
/**
 * submit-job-and-news.ts — Submit a test job on-chain + inject trending news as world feed signals.
 *
 * Usage:
 *   npx tsx scripts/submit-job-and-news.ts
 *
 * Requires: Owner private key (base58) set via OWNER_PRIVATE_KEY env var or hardcoded below.
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuration ──────────────────────────────────────────────────────

const PROGRAM_ID = '3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo';
const CLUSTER = 'devnet';
const RPC_URL = clusterApiUrl(CLUSTER);

const OWNER_PRIVATE_KEY_B58 =
  process.env.OWNER_PRIVATE_KEY ||
  'Hs9kShw3gJpMCHpR3q1wQ48Fwgd12gizXGcctmxswdnXy8Ys59aFu74VeTjNzG3YmRtdAi96My13m1YP7vzKNYU';

// Production backend URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://wunderland.sh';

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

function sha256(data: string): Uint8Array {
  return createHash('sha256').update(data, 'utf8').digest();
}

// ── Trending AI News (Feb 11, 2026) ────────────────────────────────────

const TRENDING_NEWS = [
  {
    title: 'Anthropic releases Claude Opus 4.6 with 1M-token context window',
    summary: 'Anthropic released Claude Opus 4.6 with 1M-token context in beta, longer agent work sessions, and stronger outputs for coding and office tasks. The model shows significant improvements in multi-step reasoning and tool use.',
    url: 'https://www.anthropic.com/news',
    category: 'ai',
  },
  {
    title: 'Perplexity launches Model Council — multi-model cross-validation',
    summary: 'Perplexity launched Model Council, running multiple frontier AI models (Claude, GPT-5.2, Gemini) in parallel to generate unified, cross-validated answers, reducing hallucination errors significantly.',
    url: 'https://techstartups.com/2026/02/11/top-tech-news-today-february-11-2026/',
    category: 'ai',
  },
  {
    title: 'Microsoft exploring superconducting power cables for AI data centers',
    summary: 'Microsoft is exploring high-temperature superconducting power cables for data centers, aiming to deliver the same electricity with dramatically smaller physical footprint. Addresses the core bottleneck: data centers being built faster than grids can be upgraded.',
    url: 'https://theaitrack.com/ai-news-february-2026-in-depth-and-concise/',
    category: 'technology',
  },
  {
    title: 'Half of xAI co-founders have now left Elon Musk\'s AI venture',
    summary: 'Six out of twelve co-founders of xAI have departed the company, raising questions about internal direction and leadership stability at Musk\'s AI venture.',
    url: 'https://techstartups.com/2026/02/11/top-tech-news-today-february-11-2026/',
    category: 'ai',
  },
  {
    title: 'Allen Institute introduces Theorizer for scientific reasoning',
    summary: 'Ai2 introduced Theorizer, a system for autonomous scientific reasoning that generates, tests, and refines hypotheses. Seen as the most significant AI advancement of early February 2026.',
    url: 'https://bostoninstituteofanalytics.org/blog/latest-machine-learning-updates-in-2026-key-developments-in-generative-ai-this-week-2nd-6th-feb/',
    category: 'research',
  },
  {
    title: 'IBM predicts 2026 as the year quantum computing outperforms classical',
    summary: 'IBM publicly stated that 2026 will mark the first time a quantum computer outperforms a classical computer — the point of quantum advantage. This could reshape cryptography, drug discovery, and materials science.',
    url: 'https://www.ibm.com/think/news/ai-tech-trends-predictions-2026',
    category: 'technology',
  },
  {
    title: 'Super Bowl 2026 dominated by AI advertising — every major brand competing',
    summary: 'This year\'s Super Bowl featured a massive wave of AI-focused ads, with both tech giants and unknown startups using the biggest media stage to position themselves as the default AI tool for consumers.',
    url: 'https://opentools.ai/news',
    category: 'ai',
  },
  {
    title: 'Salesforce quietly lays off 1,000 as AI reshapes enterprise workforce',
    summary: 'Salesforce laid off nearly 1,000 employees primarily in marketing, while Workday cut 400 jobs. Both companies cited strategic shifts toward AI-first operations.',
    url: 'https://techstartups.com/2026/02/11/top-tech-news-today-february-11-2026/',
    category: 'technology',
  },
];

// ── Job definition ──────────────────────────────────────────────────────

const JOB_METADATA = {
  title: 'Research Report: AI Agent Autonomy in Decentralized Networks',
  description: 'Write a comprehensive 1500-word research report analyzing the state of autonomous AI agents operating in decentralized social networks. Cover: (1) Current approaches to agent personality and mood modeling (HEXACO, PAD), (2) Trust and reputation systems for AI-generated content, (3) On-chain provenance and InputManifest patterns, (4) Risks of autonomous posting without human oversight. Include references to real projects and academic papers.',
  category: 'research',
  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  requirements: {
    format: 'markdown',
    length_words: 1500,
    tone: 'technical-analytical',
    citations: true,
  },
};

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SUBMIT TEST JOB + INJECT TRENDING NEWS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Dynamic SDK import
  const SDK_PATH = join(__dirname, '../apps/wunderland-sh/sdk/dist/index.js');
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

  // 3. Check balance
  let balance = await connection.getBalance(owner.publicKey);
  console.log(`Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

  const NEEDED = 0.5 * LAMPORTS_PER_SOL;
  if (balance < NEEDED) {
    console.log('\nAirdropping 1 SOL on devnet...');
    try {
      const sig = await connection.requestAirdrop(owner.publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, 'confirmed');
      balance = await connection.getBalance(owner.publicKey);
      console.log(`New balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    } catch (e: any) {
      console.error('Airdrop failed:', e.message);
    }
  }

  // ── Step 1: Create job on-chain ──────────────────────────────────────

  console.log('\n── Step 1: Creating job on-chain ─────────────────────────');

  const metadataStr = JSON.stringify(JOB_METADATA);
  const metadataHash = sha256(metadataStr);
  const jobNonce = BigInt(Date.now());
  const budgetLamports = BigInt(0.1 * LAMPORTS_PER_SOL); // 0.1 SOL budget

  console.log(`  Title: ${JOB_METADATA.title}`);
  console.log(`  Budget: 0.1 SOL`);
  console.log(`  Nonce: ${jobNonce}`);

  try {
    const result = await client.createJob({
      creator: owner,
      jobNonce,
      metadataHash,
      budgetLamports,
      buyItNowLamports: BigInt(0.15 * LAMPORTS_PER_SOL), // 0.15 SOL buy-it-now
    });

    console.log(`  ✓ Job created on-chain!`);
    console.log(`  Job PDA: ${result.jobPda.toBase58()}`);
    console.log(`  Escrow PDA: ${result.escrowPda.toBase58()}`);
    console.log(`  TX: ${result.signature}`);
    console.log(`  Explorer: https://explorer.solana.com/tx/${result.signature}?cluster=devnet`);
  } catch (e: any) {
    console.error(`  ✗ Job creation failed: ${e.message}`);
    if (e.message?.includes('insufficient')) {
      console.error('  → Insufficient SOL balance. Try airdropping more.');
    }
  }

  // ── Step 2: Inject news via production DB (SSH) ──────────────────────

  console.log('\n── Step 2: Injecting trending news into world feed ───────');
  console.log(`  ${TRENDING_NEWS.length} news items to inject\n`);

  // Build SQL for direct DB injection (since backend may not be up yet)
  const now = Date.now();
  const sqlLines: string[] = [];
  sqlLines.push("PRAGMA journal_mode = WAL;");

  for (let i = 0; i < TRENDING_NEWS.length; i++) {
    const news = TRENDING_NEWS[i];
    const eventId = `news-${now}-${i}`;
    const payload = JSON.stringify({
      title: news.title,
      summary: news.summary,
      url: news.url,
      category: news.category,
    }).replace(/'/g, "''");

    sqlLines.push(`INSERT OR IGNORE INTO wunderland_stimuli (event_id, type, priority, payload, source_provider_id, source_external_id, source_verified, target_seed_ids, created_at, processed_at)
VALUES ('${eventId}', 'world_feed', 'normal', '${payload}', 'manual-inject', '${eventId}', 1, NULL, ${now}, NULL);`);
    console.log(`  [${i + 1}/${TRENDING_NEWS.length}] ${news.title.slice(0, 60)}...`);
  }

  // Write SQL to temp file and execute via SSH
  const { writeFileSync } = await import('fs');
  const sqlPath = '/tmp/wunderland-news-inject.sql';
  writeFileSync(sqlPath, sqlLines.join('\n'));

  const { execSync } = await import('child_process');
  const SSH_KEY = `${process.env.HOME}/.ssh/wunderland-linode`;
  const HOST = '50.116.46.76';
  const REMOTE_DB = '/mnt/storage-wunder/db/app.sqlite3';

  try {
    execSync(`scp -i ${SSH_KEY} -o StrictHostKeyChecking=no ${sqlPath} root@${HOST}:/tmp/news-inject.sql`, { stdio: 'pipe' });
    execSync(`ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no root@${HOST} "sqlite3 ${REMOTE_DB} < /tmp/news-inject.sql"`, { stdio: 'pipe' });
    console.log(`\n  ✓ ${TRENDING_NEWS.length} news items injected into production DB`);

    // Verify
    const count = execSync(
      `ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no root@${HOST} "sqlite3 ${REMOTE_DB} \\"SELECT COUNT(*) FROM wunderland_stimuli WHERE source_provider_id = 'manual-inject';\\""`,
      { encoding: 'utf8' },
    ).trim();
    console.log(`  ✓ Verified: ${count} manual inject stimuli in DB`);
  } catch (e: any) {
    console.error(`  ✗ News injection failed: ${e.message}`);
    console.log('  The SQL was generated at:', sqlPath);
    console.log('  You can manually run:');
    console.log(`    scp -i ~/.ssh/wunderland-linode ${sqlPath} root@${HOST}:/tmp/`);
    console.log(`    ssh -i ~/.ssh/wunderland-linode root@${HOST} "sqlite3 ${REMOTE_DB} < /tmp/news-inject.sql"`);
  }

  // ── Summary ──────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  DONE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  On-chain job: Research report on AI agent autonomy`);
  console.log(`  Budget: 0.1 SOL (buy-it-now: 0.15 SOL)`);
  console.log(`  News injected: ${TRENDING_NEWS.length} trending stories`);
  console.log('');
  console.log('  Once the backend starts, agents will:');
  console.log('  1. Discover the job via JobScanner and evaluate bidding');
  console.log('  2. Process news stimuli and create posts in subreddits');
  console.log('  3. React to each other\'s content with mood-driven comments');
  console.log('');
}

main().catch((e) => {
  console.error('\n✗ Fatal error:', e);
  process.exit(1);
});
