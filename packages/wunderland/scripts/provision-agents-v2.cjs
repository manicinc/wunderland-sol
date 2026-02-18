#!/usr/bin/env node
/**
 * provision-agents-v2.cjs — Provision new on-chain agents for existing wunderbots
 * Fixes the FK constraint issue from v1 by disabling foreign keys during DB updates.
 *
 * Run inside the backend Docker container from /app:
 *   NODE_PATH=/app/node_modules node /tmp/provision-agents-v2.cjs
 */

'use strict';

const { createHash, createCipheriv, randomBytes } = require('crypto');
const { readFileSync } = require('fs');
const { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const Database = require('better-sqlite3');

// ============================================================
// Configuration
// ============================================================

const PROGRAM_ID = new PublicKey('3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo');
const RPC_URL = process.env.WUNDERLAND_SOL_RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const DB_PATH = process.env.DB_PATH || '/app/db_data/app.sqlite3';
const ADMIN_KEYPAIR_PATH = process.env.ADMIN_KEYPAIR_PATH || '/tmp/admin-phantom.json';
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

function anchorDiscriminator(methodName) {
  return createHash('sha256').update('global:' + methodName).digest().subarray(0, 8);
}

function deriveAgentPDA(owner, agentId) {
  return PublicKey.findProgramAddressSync([Buffer.from('agent'), owner.toBuffer(), agentId], PROGRAM_ID);
}

function deriveVaultPDA(agentIdentityPda) {
  return PublicKey.findProgramAddressSync([Buffer.from('vault'), agentIdentityPda.toBuffer()], PROGRAM_ID);
}

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
  console.log('=== Wunderland Agent Provisioner v2 ===\n');

  const adminSecret = JSON.parse(readFileSync(ADMIN_KEYPAIR_PATH, 'utf8'));
  const adminKp = Keypair.fromSecretKey(Uint8Array.from(adminSecret));
  console.log('Admin wallet:', adminKp.publicKey.toBase58());

  const conn = new Connection(RPC_URL, 'confirmed');
  const balance = await conn.getBalance(adminKp.publicKey);
  console.log('Balance:', balance / LAMPORTS_PER_SOL, 'SOL');

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);
  const [treasuryPda] = PublicKey.findProgramAddressSync([Buffer.from('treasury')], PROGRAM_ID);
  const [economicsPda] = PublicKey.findProgramAddressSync([Buffer.from('econ')], PROGRAM_ID);
  const [ownerCounterPda] = PublicKey.findProgramAddressSync([Buffer.from('owner_counter'), adminKp.publicKey.toBuffer()], PROGRAM_ID);

  const db = new Database(DB_PATH);
  const bots = db.prepare('SELECT seed_id, display_name, hexaco_traits, bio FROM wunderbots').all();
  console.log('Found ' + bots.length + ' wunderbots\n');

  // Phase 1: Create all on-chain agents and collect results
  const pendingUpdates = [];

  for (const bot of bots) {
    console.log('--- ' + bot.display_name + ' ---');

    const agentId = randomBytes(32);
    const signerKp = Keypair.generate();
    const [agentPda] = deriveAgentPDA(adminKp.publicKey, agentId);
    const [vaultPda] = deriveVaultPDA(agentPda);

    console.log('  Signer: ' + signerKp.publicKey.toBase58());
    console.log('  PDA:    ' + agentPda.toBase58());

    let hexacoTraits;
    try {
      hexacoTraits = typeof bot.hexaco_traits === 'string' ? JSON.parse(bot.hexaco_traits) : bot.hexaco_traits || {};
    } catch { hexacoTraits = {}; }
    const defaults = { honestyHumility: 0.5, emotionality: 0.5, extraversion: 0.5, agreeableness: 0.5, conscientiousness: 0.5, openness: 0.5 };
    hexacoTraits = { ...defaults, ...hexacoTraits };

    const metadataHash = createHash('sha256').update(JSON.stringify({ displayName: bot.display_name, bio: bot.bio || '' })).digest();

    const ix = buildInitializeAgentIx({
      configPda, treasuryPda, economicsPda, ownerCounterPda,
      owner: adminKp.publicKey, agentIdentityPda: agentPda, vaultPda,
      agentId, displayName: bot.display_name, hexacoTraits, metadataHash,
      agentSigner: signerKp.publicKey,
    });

    try {
      const sig = await sendAndConfirmTransaction(conn, new Transaction().add(ix), [adminKp], { commitment: 'confirmed', maxRetries: 3 });
      console.log('  TX: ' + sig);

      // Store result for Phase 2
      pendingUpdates.push({
        displayName: bot.display_name,
        oldSeedId: bot.seed_id,
        newSeedId: agentPda.toBase58(),
        signerPubkey: signerKp.publicKey.toBase58(),
        signerSecretKey: Array.from(signerKp.secretKey),
        txSignature: sig,
      });
      console.log('  ON-CHAIN OK\n');
    } catch (err) {
      console.error('  TX FAILED: ' + err.message + '\n');
    }

    await new Promise(r => setTimeout(r, 1500));
  }

  if (pendingUpdates.length === 0) {
    console.log('No successful transactions. Aborting.');
    db.close();
    return;
  }

  // Phase 2: Batch DB updates with FK constraints disabled
  console.log('\n=== Phase 2: Database Updates (FK disabled) ===\n');

  db.pragma('foreign_keys = OFF');
  const txn = db.transaction(() => {
    for (const upd of pendingUpdates) {
      const { displayName, oldSeedId, newSeedId, signerPubkey, signerSecretKey } = upd;
      console.log('DB: ' + displayName);

      // 1. Update wunderbots seed_id
      db.prepare('UPDATE wunderbots SET seed_id = ?, updated_at = ? WHERE seed_id = ?')
        .run(newSeedId, new Date().toISOString(), oldSeedId);

      // 2. Update citizens
      db.prepare('UPDATE wunderland_citizens SET seed_id = ? WHERE seed_id = ?')
        .run(newSeedId, oldSeedId);

      // 3. Update posts
      const p = db.prepare('UPDATE wunderland_posts SET seed_id = ? WHERE seed_id = ?')
        .run(newSeedId, oldSeedId);
      console.log('  Posts updated: ' + p.changes);

      // 4. Reset anchor status
      const r = db.prepare("UPDATE wunderland_posts SET anchor_status = 'pending', anchor_error = NULL WHERE seed_id = ? AND anchor_status IN ('missing_config', 'failed')")
        .run(newSeedId);
      console.log('  Posts reset to pending: ' + r.changes);

      // 5. Store encrypted signer
      const encryptedSecret = encryptSecret(JSON.stringify(signerSecretKey));
      db.prepare('INSERT OR REPLACE INTO wunderland_sol_agent_signers (seed_id, agent_identity_pda, owner_wallet, agent_signer_pubkey, encrypted_signer_secret_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(newSeedId, newSeedId, adminKp.publicKey.toBase58(), signerPubkey, encryptedSecret, Date.now(), Date.now());
      console.log('  Signer stored');
    }
  });

  txn();
  db.pragma('foreign_keys = ON');

  // Verify FK integrity
  const fkCheck = db.pragma('foreign_key_check');
  if (fkCheck.length > 0) {
    console.log('\nWARNING: FK violations found:', JSON.stringify(fkCheck));
  } else {
    console.log('\nFK integrity check: PASSED');
  }

  // Verify signers
  const signers = db.prepare('SELECT seed_id, agent_signer_pubkey FROM wunderland_sol_agent_signers').all();
  console.log('\nStored signers: ' + signers.length);
  for (const s of signers) {
    console.log('  ' + s.seed_id.substring(0, 16) + '... => ' + s.agent_signer_pubkey);
  }

  db.close();

  console.log('\n=== Summary ===');
  console.log('On-chain: ' + pendingUpdates.length + '/' + bots.length + ' agents created');
  console.log('Database: All seed_ids, posts, signers updated');
  for (const u of pendingUpdates) {
    console.log('  ' + u.displayName + ': ' + u.newSeedId);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
