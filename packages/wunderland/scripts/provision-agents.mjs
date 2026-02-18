#!/usr/bin/env node
/**
 * provision-agents.mjs — Provision new on-chain agents for existing wunderbots
 *
 * This script:
 * 1. Reads the 7 wunderbots from the backend SQLite DB
 * 2. Generates a new signer keypair for each
 * 3. Calls `initialize_agent` on Solana devnet for each
 * 4. Stores encrypted signer keypairs in `wunderland_sol_agent_signers`
 * 5. Updates `wunderbots.seed_id` to the new AgentIdentity PDA
 * 6. Updates `wunderland_citizens.seed_id` to match
 *
 * Run inside the backend Docker container:
 *   node /tmp/provision-agents.mjs
 *
 * Requires:
 *   - /tmp/admin-phantom.json (admin wallet keypair)
 *   - /app/db_data/app.sqlite3 (backend SQLite DB)
 *   - @solana/web3.js (in node_modules)
 */

import { createHash, createCipheriv, randomBytes } from 'crypto';
import { readFileSync } from 'fs';

// Dynamic imports for packages available in the container
const web3 = await import('@solana/web3.js');
const { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } = web3;

const Database = (await import('better-sqlite3')).default;

// ============================================================
// Configuration
// ============================================================

const PROGRAM_ID = new PublicKey('3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo');
const RPC_URL = process.env.WUNDERLAND_SOL_RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const DB_PATH = process.env.DB_PATH || '/app/db_data/app.sqlite3';
const ADMIN_KEYPAIR_PATH = process.env.ADMIN_KEYPAIR_PATH || '/tmp/admin-phantom.json';

// Encryption key candidates (same as backend crypto.ts)
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
// Anchor discriminator (SHA-256 of "global:<method_name>")[0..8]
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

function buildInitializeAgentIx({
  configPda, treasuryPda, economicsPda, ownerCounterPda,
  owner, agentIdentityPda, vaultPda,
  agentId, displayName, hexacoTraits, metadataHash, agentSigner,
}) {
  // Encode display name as 32-byte fixed string
  const displayNameBytes = Buffer.alloc(32, 0);
  Buffer.from(displayName, 'utf8').copy(displayNameBytes, 0, 0, 32);

  // Encode HEXACO traits as [u16; 6] (values 0-1000 from 0.0-1.0 floats)
  const traitBytes = Buffer.alloc(12);
  const traitKeys = ['honestyHumility', 'emotionality', 'extraversion', 'agreeableness', 'conscientiousness', 'openness'];
  for (let i = 0; i < 6; i++) {
    const val = Math.round((hexacoTraits[traitKeys[i]] || 0.5) * 1000);
    traitBytes.writeUInt16LE(Math.max(0, Math.min(1000, val)), i * 2);
  }

  const data = Buffer.concat([
    anchorDiscriminator('initialize_agent'),
    Buffer.from(agentId),        // 32 bytes
    displayNameBytes,             // 32 bytes
    traitBytes,                   // 12 bytes
    Buffer.from(metadataHash),    // 32 bytes
    agentSigner.toBuffer(),       // 32 bytes
  ]);

  return new web3.TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: treasuryPda, isSigner: false, isWritable: true },
      { pubkey: economicsPda, isSigner: false, isWritable: false },
      { pubkey: ownerCounterPda, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: agentIdentityPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
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

  // Load admin keypair
  const adminSecret = JSON.parse(readFileSync(ADMIN_KEYPAIR_PATH, 'utf8'));
  const adminKp = Keypair.fromSecretKey(Uint8Array.from(adminSecret));
  console.log('Admin wallet:', adminKp.publicKey.toBase58());

  // Connect to Solana
  const conn = new Connection(RPC_URL, 'confirmed');
  const balance = await conn.getBalance(adminKp.publicKey);
  console.log('Balance:', balance / LAMPORTS_PER_SOL, 'SOL');
  console.log('RPC:', RPC_URL);
  console.log('Program:', PROGRAM_ID.toBase58());

  // Derive program PDAs
  const [configPda] = deriveConfigPDA();
  const [treasuryPda] = deriveTreasuryPDA();
  const [economicsPda] = deriveEconomicsPDA();
  const [ownerCounterPda] = deriveOwnerCounterPDA(adminKp.publicKey);

  console.log('\nConfig PDA:', configPda.toBase58());
  console.log('Treasury PDA:', treasuryPda.toBase58());
  console.log('Economics PDA:', economicsPda.toBase58());
  console.log('Owner Counter PDA:', ownerCounterPda.toBase58());

  // Open DB
  const db = new Database(DB_PATH);

  // Get all wunderbots
  const bots = db.prepare('SELECT seed_id, display_name, hexaco_traits, bio FROM wunderbots').all();
  console.log(`\nFound ${bots.length} wunderbots to provision:\n`);

  // Ensure the signers table exists
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
    console.log(`--- ${bot.display_name} (old seedId: ${bot.seed_id.substring(0, 12)}...) ---`);

    // Generate new agent ID (32 random bytes)
    const agentId = randomBytes(32);

    // Generate new signer keypair
    const signerKp = Keypair.generate();
    console.log('  New signer pubkey:', signerKp.publicKey.toBase58());

    // Derive new PDAs
    const [agentPda] = deriveAgentPDA(adminKp.publicKey, agentId);
    const [vaultPda] = deriveVaultPDA(agentPda);
    console.log('  New agent PDA:', agentPda.toBase58());
    console.log('  New vault PDA:', vaultPda.toBase58());

    // Parse HEXACO traits
    let hexacoTraits;
    try {
      hexacoTraits = typeof bot.hexaco_traits === 'string'
        ? JSON.parse(bot.hexaco_traits)
        : bot.hexaco_traits || {};
    } catch {
      hexacoTraits = {};
    }
    // Ensure all 6 traits have values
    const defaultTraits = { honestyHumility: 0.5, emotionality: 0.5, extraversion: 0.5, agreeableness: 0.5, conscientiousness: 0.5, openness: 0.5 };
    hexacoTraits = { ...defaultTraits, ...hexacoTraits };

    // Compute metadata hash (SHA-256 of agent metadata JSON)
    const metadata = JSON.stringify({
      displayName: bot.display_name,
      bio: bot.bio || '',
      hexaco: hexacoTraits,
      provisioned: new Date().toISOString(),
    });
    const metadataHash = createHash('sha256').update(metadata).digest();

    // Build transaction
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
      console.log('  TX signature:', sig);

      // Encrypt and store the signer secret key
      const secretKeyJson = JSON.stringify(Array.from(signerKp.secretKey));
      const encryptedSecret = encryptSecret(secretKeyJson);

      const now = Date.now();
      const newSeedId = agentPda.toBase58();

      // Store signer in DB
      db.prepare(`
        INSERT OR REPLACE INTO wunderland_sol_agent_signers
        (seed_id, agent_identity_pda, owner_wallet, agent_signer_pubkey, encrypted_signer_secret_key, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        newSeedId,
        newSeedId,
        adminKp.publicKey.toBase58(),
        signerKp.publicKey.toBase58(),
        encryptedSecret,
        now,
        now,
      );
      console.log('  Signer stored in DB (encrypted)');

      // Update wunderbots seed_id
      const oldSeedId = bot.seed_id;
      db.prepare('UPDATE wunderbots SET seed_id = ?, updated_at = ? WHERE seed_id = ?')
        .run(newSeedId, new Date().toISOString(), oldSeedId);
      console.log('  wunderbots.seed_id updated:', oldSeedId.substring(0, 12), '->', newSeedId.substring(0, 12));

      // Update wunderland_citizens seed_id
      const citizenResult = db.prepare('UPDATE wunderland_citizens SET seed_id = ? WHERE seed_id = ?')
        .run(newSeedId, oldSeedId);
      if (citizenResult.changes > 0) {
        console.log('  wunderland_citizens.seed_id updated');
      }

      // Update post seed_id references
      const postResult = db.prepare('UPDATE wunderland_posts SET seed_id = ? WHERE seed_id = ?')
        .run(newSeedId, oldSeedId);
      if (postResult.changes > 0) {
        console.log(`  Updated ${postResult.changes} posts seed_id`);
      }

      // Reset anchor_status so posts get re-anchored
      const resetResult = db.prepare(`
        UPDATE wunderland_posts
        SET anchor_status = 'pending', anchor_error = NULL
        WHERE seed_id = ? AND anchor_status IN ('missing_config', 'failed')
      `).run(newSeedId);
      if (resetResult.changes > 0) {
        console.log(`  Reset ${resetResult.changes} posts to pending anchor status`);
      }

      results.push({
        displayName: bot.display_name,
        oldSeedId,
        newSeedId,
        agentPda: newSeedId,
        signerPubkey: signerKp.publicKey.toBase58(),
        txSignature: sig,
        success: true,
      });

      console.log('  SUCCESS\n');
    } catch (err) {
      console.error(`  FAILED: ${err.message}\n`);
      results.push({
        displayName: bot.display_name,
        oldSeedId: bot.seed_id,
        success: false,
        error: err.message,
      });
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }

  db.close();

  console.log('\n=== Summary ===');
  console.log(`Total: ${results.length}, Success: ${results.filter(r => r.success).length}, Failed: ${results.filter(r => !r.success).length}`);
  for (const r of results) {
    console.log(`  ${r.success ? 'OK' : 'FAIL'} ${r.displayName}: ${r.success ? r.newSeedId : r.error}`);
  }

  // Write results to file for reference
  const resultsJson = JSON.stringify(results, null, 2);
  console.log('\n=== Results JSON ===');
  console.log(resultsJson);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
