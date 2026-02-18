#!/usr/bin/env node
/**
 * provision-agents.cjs — Provision new on-chain agents for existing wunderbots
 *
 * This script:
 * 1. Reads the 7 wunderbots from the backend SQLite DB
 * 2. Generates a new signer keypair for each
 * 3. Calls `initialize_agent` on Solana devnet for each
 * 4. Stores encrypted signer keypairs in `wunderland_sol_agent_signers`
 * 5. Updates `wunderbots.seed_id` to the new AgentIdentity PDA
 * 6. Updates `wunderland_citizens.seed_id` to match
 * 7. Resets all posts' anchor_status to 'pending' for re-anchoring
 *
 * Run inside the backend Docker container from /app:
 *   cd /app && node /tmp/provision-agents.cjs
 */

'use strict';

const { createHash, createCipheriv, randomBytes } = require('crypto');
const { readFileSync } = require('fs');
const { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, TransactionInstruction, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const Database = require('better-sqlite3');

// ============================================================
// Configuration
// ============================================================

const PROGRAM_ID = new PublicKey('3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo');
const RPC_URL = process.env.WUNDERLAND_SOL_RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const DB_PATH = process.env.DB_PATH || '/app/db_data/app.sqlite3';
const ADMIN_KEYPAIR_PATH = process.env.ADMIN_KEYPAIR_PATH || '/tmp/admin-phantom.json';

// ============================================================
// Encryption (matches backend crypto.ts)
// ============================================================

const IV_LENGTH = 12;

function getEncryptionKey() {
  const candidates = [
    process.env.WUNDERLAND_CREDENTIALS_ENCRYPTION_KEY,
    process.env.JWT_SECRET,
    process.env.SETTINGS_ENCRYPTION_KEY,
    process.env.SERVER_SECRET,
    'dev-insecure-key',
  ];
  const first = candidates.find(v => typeof v === 'string' && v.trim().length > 0);
  return createHash('sha256').update(first || 'dev-insecure-key').digest();
}

function encryptSecret(plain) {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

// ============================================================
// Anchor discriminator
// ============================================================

function anchorDiscriminator(methodName) {
  return createHash('sha256')
    .update(`global:${methodName}`)
    .digest()
    .subarray(0, 8);
}

// ============================================================
// PDA derivations
// ============================================================

function deriveConfigPDA() {
  return PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);
}

function deriveEconomicsPDA() {
  return PublicKey.findProgramAddressSync([Buffer.from('econ')], PROGRAM_ID);
}

function deriveTreasuryPDA() {
  return PublicKey.findProgramAddressSync([Buffer.from('treasury')], PROGRAM_ID);
}

function deriveOwnerCounterPDA(owner) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('owner_counter'), owner.toBuffer()],
    PROGRAM_ID
  );
}

function deriveAgentPDA(owner, agentId) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), owner.toBuffer(), agentId],
    PROGRAM_ID
  );
}

function deriveVaultPDA(agentIdentityPda) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), agentIdentityPda.toBuffer()],
    PROGRAM_ID
  );
}

// ============================================================
// Build initialize_agent instruction
// ============================================================

function buildInitializeAgentIx(opts) {
  const displayNameBytes = Buffer.alloc(32, 0);
  Buffer.from(opts.displayName, 'utf8').copy(displayNameBytes, 0, 0, 32);

  const traitBytes = Buffer.alloc(12);
  const traitKeys = ['honestyHumility', 'emotionality', 'extraversion', 'agreeableness', 'conscientiousness', 'openness'];
  for (let i = 0; i < 6; i++) {
    const val = Math.round((opts.hexacoTraits[traitKeys[i]] || 0.5) * 1000);
    traitBytes.writeUInt16LE(Math.max(0, Math.min(1000, val)), i * 2);
  }

  const data = Buffer.concat([
    anchorDiscriminator('initialize_agent'),
    Buffer.from(opts.agentId),
    displayNameBytes,
    traitBytes,
    Buffer.from(opts.metadataHash),
    opts.agentSigner.toBuffer(),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: opts.configPda, isSigner: false, isWritable: true },
      { pubkey: opts.treasuryPda, isSigner: false, isWritable: true },
      { pubkey: opts.economicsPda, isSigner: false, isWritable: false },
      { pubkey: opts.ownerCounterPda, isSigner: false, isWritable: true },
      { pubkey: opts.owner, isSigner: true, isWritable: true },
      { pubkey: opts.agentIdentityPda, isSigner: false, isWritable: true },
      { pubkey: opts.vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('=== Wunderland Agent Provisioner ===\n');

  const adminSecret = JSON.parse(readFileSync(ADMIN_KEYPAIR_PATH, 'utf8'));
  const adminKp = Keypair.fromSecretKey(Uint8Array.from(adminSecret));
  console.log('Admin wallet:', adminKp.publicKey.toBase58());

  const conn = new Connection(RPC_URL, 'confirmed');
  const balance = await conn.getBalance(adminKp.publicKey);
  console.log('Balance:', balance / LAMPORTS_PER_SOL, 'SOL');
  console.log('RPC:', RPC_URL);
  console.log('Program:', PROGRAM_ID.toBase58());

  const [configPda] = deriveConfigPDA();
  const [treasuryPda] = deriveTreasuryPDA();
  const [economicsPda] = deriveEconomicsPDA();
  const [ownerCounterPda] = deriveOwnerCounterPDA(adminKp.publicKey);

  console.log('\nConfig PDA:', configPda.toBase58());
  console.log('Treasury PDA:', treasuryPda.toBase58());
  console.log('Economics PDA:', economicsPda.toBase58());
  console.log('Owner Counter PDA:', ownerCounterPda.toBase58());

  const db = new Database(DB_PATH);

  const bots = db.prepare('SELECT seed_id, display_name, hexaco_traits, bio FROM wunderbots').all();
  console.log('\nFound ' + bots.length + ' wunderbots to provision:\n');

  db.exec(`
    CREATE TABLE IF NOT EXISTS wunderland_sol_agent_signers (
      seed_id TEXT PRIMARY KEY,
      agent_identity_pda TEXT,
      owner_wallet TEXT,
      agent_signer_pubkey TEXT,
      encrypted_signer_secret_key TEXT,
      created_at INTEGER,
      updated_at INTEGER
    )
  `);

  const results = [];

  for (const bot of bots) {
    console.log('--- ' + bot.display_name + ' (old seedId: ' + bot.seed_id.substring(0, 16) + '...) ---');

    const agentId = randomBytes(32);
    const signerKp = Keypair.generate();
    console.log('  New signer:', signerKp.publicKey.toBase58());

    const [agentPda] = deriveAgentPDA(adminKp.publicKey, agentId);
    const [vaultPda] = deriveVaultPDA(agentPda);
    console.log('  Agent PDA:', agentPda.toBase58());

    let hexacoTraits;
    try {
      hexacoTraits = typeof bot.hexaco_traits === 'string'
        ? JSON.parse(bot.hexaco_traits)
        : bot.hexaco_traits || {};
    } catch { hexacoTraits = {}; }
    const defaultTraits = { honestyHumility: 0.5, emotionality: 0.5, extraversion: 0.5, agreeableness: 0.5, conscientiousness: 0.5, openness: 0.5 };
    hexacoTraits = { ...defaultTraits, ...hexacoTraits };

    const metadata = JSON.stringify({ displayName: bot.display_name, bio: bot.bio || '' });
    const metadataHash = createHash('sha256').update(metadata).digest();

    const ix = buildInitializeAgentIx({
      configPda, treasuryPda, economicsPda, ownerCounterPda,
      owner: adminKp.publicKey,
      agentIdentityPda: agentPda,
      vaultPda,
      agentId,
      displayName: bot.display_name,
      hexacoTraits,
      metadataHash,
      agentSigner: signerKp.publicKey,
    });

    const tx = new Transaction().add(ix);

    try {
      const sig = await sendAndConfirmTransaction(conn, tx, [adminKp], {
        commitment: 'confirmed',
        maxRetries: 3,
      });
      console.log('  TX:', sig);

      const secretKeyJson = JSON.stringify(Array.from(signerKp.secretKey));
      const encryptedSecret = encryptSecret(secretKeyJson);
      const now = Date.now();
      const newSeedId = agentPda.toBase58();
      const oldSeedId = bot.seed_id;

      // Store signer
      db.prepare('INSERT OR REPLACE INTO wunderland_sol_agent_signers (seed_id, agent_identity_pda, owner_wallet, agent_signer_pubkey, encrypted_signer_secret_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(newSeedId, newSeedId, adminKp.publicKey.toBase58(), signerKp.publicKey.toBase58(), encryptedSecret, now, now);
      console.log('  Signer stored (encrypted)');

      // Update wunderbots
      db.prepare('UPDATE wunderbots SET seed_id = ?, updated_at = ? WHERE seed_id = ?')
        .run(newSeedId, new Date().toISOString(), oldSeedId);
      console.log('  wunderbots updated: ' + oldSeedId.substring(0, 12) + '... -> ' + newSeedId.substring(0, 12) + '...');

      // Update citizens
      const c = db.prepare('UPDATE wunderland_citizens SET seed_id = ? WHERE seed_id = ?').run(newSeedId, oldSeedId);
      if (c.changes > 0) console.log('  citizens updated');

      // Update posts
      const p = db.prepare('UPDATE wunderland_posts SET seed_id = ? WHERE seed_id = ?').run(newSeedId, oldSeedId);
      if (p.changes > 0) console.log('  Updated ' + p.changes + ' posts');

      // Reset anchor status
      const r = db.prepare("UPDATE wunderland_posts SET anchor_status = 'pending', anchor_error = NULL WHERE seed_id = ? AND anchor_status IN ('missing_config', 'failed')").run(newSeedId);
      if (r.changes > 0) console.log('  Reset ' + r.changes + ' posts to pending');

      results.push({ displayName: bot.display_name, oldSeedId, newSeedId, signerPubkey: signerKp.publicKey.toBase58(), tx: sig, ok: true });
      console.log('  SUCCESS\n');
    } catch (err) {
      console.error('  FAILED: ' + err.message + '\n');
      results.push({ displayName: bot.display_name, oldSeedId: bot.seed_id, ok: false, error: err.message });
    }

    await new Promise(r => setTimeout(r, 1500));
  }

  db.close();

  console.log('\n=== Summary ===');
  const ok = results.filter(r => r.ok).length;
  console.log('Total: ' + results.length + ', Success: ' + ok + ', Failed: ' + (results.length - ok));
  for (const r of results) {
    console.log('  ' + (r.ok ? 'OK' : 'FAIL') + ' ' + r.displayName + ': ' + (r.ok ? r.newSeedId : r.error));
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
