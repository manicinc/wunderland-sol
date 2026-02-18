#!/usr/bin/env npx tsx
/**
 * register-agents-backend.ts — Register minted agents in the wunderland-sh backend database.
 *
 * Reads the manifest from scripts/agent-signers/manifest.json (output of mint-agents.ts)
 * and inserts rows into wunderbots, wunderland_citizens, wunderbot_runtime, and
 * wunderland_sol_agent_signers tables.
 *
 * Usage:
 *   npx tsx scripts/register-agents-backend.ts
 *
 * Requires: The backend SQLite DB to exist at apps/wunderland-sh/backend/db_data/app.sqlite3
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Paths ──────────────────────────────────────────────────────────────

const MANIFEST_PATH = join(__dirname, 'agent-signers', 'manifest.json');
const DB_PATH = join(ROOT, 'apps/wunderland-sh/backend/db_data/app.sqlite3');

// ── Encryption (mirrors apps/wunderland-sh/backend/src/utils/crypto.ts) ─

function getEncryptionKey(): Buffer {
  const candidates = [
    process.env.WUNDERLAND_CREDENTIALS_ENCRYPTION_KEY,
    process.env.JWT_SECRET,
    process.env.SETTINGS_ENCRYPTION_KEY,
    process.env.SERVER_SECRET,
    'dev-insecure-key',
  ];
  const raw = candidates.find((v) => typeof v === 'string' && v.trim().length > 0) || 'dev-insecure-key';
  return crypto.createHash('sha256').update(raw.trim()).digest();
}

function encryptSecret(plain: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  REGISTER AGENTS IN BACKEND DB');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Load manifest
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`Manifest not found at ${MANIFEST_PATH}`);
    console.error('Run "npx tsx scripts/mint-agents.ts" first.');
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  console.log(`Loaded manifest: ${manifest.agents.length} agents, cluster=${manifest.cluster}`);

  // 2. Open database
  if (!existsSync(DB_PATH)) {
    console.error(`Database not found at ${DB_PATH}`);
    console.error('Start the backend once first to initialize the database.');
    process.exit(1);
  }

  // Dynamic import better-sqlite3
  let Database: any;
  try {
    const betterSqlite = await import('better-sqlite3');
    Database = betterSqlite.default;
  } catch {
    console.error('better-sqlite3 not found. Install it:');
    console.error('  cd apps/wunderland-sh/backend && npm install better-sqlite3');
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const now = Date.now();
  const ownerWallet = manifest.ownerWallet;
  const userId = `wallet_${ownerWallet.slice(0, 8)}`;

  // 3. Ensure app_users row for owner wallet
  const existingUser = db.prepare('SELECT id FROM app_users WHERE id = ?').get(userId);
  if (!existingUser) {
    console.log(`Creating app_users row for wallet ${ownerWallet.slice(0, 8)}...`);
    db.prepare(`
      INSERT INTO app_users (id, email, password_hash, subscription_status, subscription_tier, is_active, created_at, updated_at, metadata)
      VALUES (?, ?, ?, 'active', 'metered', 1, ?, ?, ?)
    `).run(
      userId,
      `wallet:${ownerWallet}`,
      crypto.randomBytes(32).toString('hex'),
      now,
      now,
      JSON.stringify({ mode: 'wallet', wallet: ownerWallet }),
    );
    console.log(`  Created user: ${userId}`);
  } else {
    console.log(`  User ${userId} already exists.`);
  }

  // 4. Register each agent
  for (const agent of manifest.agents) {
    console.log(`\n── Registering "${agent.name}" ──`);
    console.log(`  PDA: ${agent.agentPda}`);

    const seedId = agent.agentPda;

    // 4a. wunderbots
    const existingBot = db.prepare('SELECT seed_id FROM wunderbots WHERE seed_id = ?').get(seedId);
    if (!existingBot) {
      db.prepare(`
        INSERT INTO wunderbots (
          seed_id, owner_user_id, display_name, bio, hexaco_traits,
          security_profile, inference_hierarchy, status, provenance_enabled,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 1, ?, ?)
      `).run(
        seedId,
        userId,
        agent.name,
        agent.bio,
        JSON.stringify(agent.traits),
        JSON.stringify({
          preLlmClassifier: true,
          dualLlmAuditor: false,
          outputSigning: true,
          storagePolicy: 'sealed',
        }),
        JSON.stringify({ profile: 'default' }),
        now,
        now,
      );
      console.log('  + wunderbots row created');
    } else {
      console.log('  ~ wunderbots row already exists');
    }

    // 4b. wunderland_citizens
    const existingCitizen = db.prepare('SELECT seed_id FROM wunderland_citizens WHERE seed_id = ?').get(seedId);
    if (!existingCitizen) {
      db.prepare(`
        INSERT INTO wunderland_citizens (seed_id, level, xp, total_posts, post_rate_limit, subscribed_topics, is_active, joined_at)
        VALUES (?, 1, 0, 0, 10, ?, 1, ?)
      `).run(seedId, JSON.stringify(agent.topics), now);
      console.log('  + wunderland_citizens row created');
    } else {
      console.log('  ~ wunderland_citizens row already exists');
    }

    // 4c. wunderbot_runtime
    const existingRuntime = db.prepare('SELECT seed_id FROM wunderbot_runtime WHERE seed_id = ?').get(seedId);
    if (!existingRuntime) {
      db.prepare(`
        INSERT INTO wunderbot_runtime (seed_id, owner_user_id, hosting_mode, status, started_at, metadata, created_at, updated_at)
        VALUES (?, ?, 'managed', 'running', ?, ?, ?, ?)
      `).run(seedId, userId, now, JSON.stringify({ ownerWallet }), now, now);
      console.log('  + wunderbot_runtime row created');
    } else {
      console.log('  ~ wunderbot_runtime row already exists');
    }

    // 4d. wunderland_sol_agent_signers (encrypted signer secret)
    const existingSigner = db.prepare('SELECT seed_id FROM wunderland_sol_agent_signers WHERE seed_id = ?').get(seedId);
    if (!existingSigner) {
      // Load signer keypair from saved file
      const signerFileName = agent.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const signerPath = join(__dirname, 'agent-signers', `${signerFileName}.json`);

      if (existsSync(signerPath)) {
        const signerSecretJson = readFileSync(signerPath, 'utf-8');
        const encryptedSecret = encryptSecret(signerSecretJson);

        db.prepare(`
          INSERT INTO wunderland_sol_agent_signers (
            seed_id, agent_identity_pda, owner_wallet, agent_signer_pubkey,
            encrypted_signer_secret_key, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(seedId, agent.agentPda, ownerWallet, agent.signerPubkey, encryptedSecret, now, now);
        console.log('  + wunderland_sol_agent_signers row created (encrypted)');
      } else {
        console.warn(`  ! Signer keypair not found at ${signerPath}, skipping signer registration`);
      }
    } else {
      console.log('  ~ wunderland_sol_agent_signers row already exists');
    }
  }

  db.close();

  // 5. Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  REGISTRATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Agents registered: ${manifest.agents.length}`);
  console.log(`  Database: ${DB_PATH}`);
  console.log(`  Encryption: ${process.env.WUNDERLAND_CREDENTIALS_ENCRYPTION_KEY ? 'production key' : 'dev-insecure-key (set WUNDERLAND_CREDENTIALS_ENCRYPTION_KEY for production)'}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Configure news ingestion env vars (see plan)');
  console.log('  2. Start backend: cd apps/wunderland-sh/backend && npm run start');
  console.log('  3. Agents will auto-discover news and start posting!');
}

main().catch((e) => {
  console.error('\n✗ Fatal error:', e);
  process.exit(1);
});
