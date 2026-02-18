#!/usr/bin/env node
/**
 * anchor-pending-posts.cjs
 *
 * Standalone script that anchors pending Wunderland posts to Solana devnet.
 * Handles both root posts and replies (comments) in multiple passes.
 * Runs inside the backend Docker container.
 *
 * Usage (from host):
 *   docker cp scripts/anchor-pending-posts.cjs deployment-backend-1:/tmp/
 *   docker exec -w /app -e NODE_PATH=/app/node_modules deployment-backend-1 \
 *     node /tmp/anchor-pending-posts.cjs [--delay=MS] [--dry-run] [--skip-ipfs] [--limit=N] [--only-root] [--max-passes=N]
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function argVal(name) {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : null;
}
const DRY_RUN = args.includes('--dry-run');
const SKIP_IPFS = args.includes('--skip-ipfs');
const TX_DELAY_MS = Math.max(200, Number(argVal('delay') || 600));
const POST_LIMIT = Number(argVal('limit') || 0) || Infinity;
const ONLY_ROOT = args.includes('--only-root');
const MAX_PASSES = Math.max(1, Number(argVal('max-passes') || 20));
// Deployed program only allows replying to root posts (kind=Post), not comments.
// --max-depth=1 means only anchor root posts (0) and direct replies (1).
const MAX_DEPTH = Math.max(0, Number(argVal('max-depth') || 1));

// ── Constants ───────────────────────────────────────────────────────────────

const PROGRAM_ID = process.env.WUNDERLAND_SOL_PROGRAM_ID || '3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo';
const RPC_URL = process.env.WUNDERLAND_SOL_RPC_URL || 'https://api.devnet.solana.com';
const RELAYER_KEYPAIR_PATH = process.env.WUNDERLAND_SOL_RELAYER_KEYPAIR_PATH || '/tmp/admin-phantom.json';
const ENCLAVE_PDA = process.env.WUNDERLAND_SOL_ENCLAVE_PDA || 'GvaN1xnNp6GYubdWrJ97GtSHCVdaNPefbTD7ReFUWdej';
const IPFS_API_URL = process.env.WUNDERLAND_IPFS_API_URL || 'http://ipfs:5001';
const DB_PATH = process.env.DB_PATH || '/app/db_data/app.sqlite3';

// ── AES-256-GCM decryption ──────────────────────────────────────────────────

const IV_LENGTH = 12;

function getDecryptionKeys() {
  const candidates = [
    process.env.WUNDERLAND_CREDENTIALS_ENCRYPTION_KEY,
    process.env.JWT_SECRET,
    process.env.SETTINGS_ENCRYPTION_KEY,
    process.env.SERVER_SECRET,
    'dev-insecure-key',
  ];
  const seen = new Set();
  return candidates
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0 && !seen.has(v) && seen.add(v))
    .map((raw) => crypto.createHash('sha256').update(raw).digest());
}

function decryptSecret(enc) {
  if (!enc) return undefined;
  const raw = Buffer.from(enc, 'base64');
  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
  const data = raw.subarray(IV_LENGTH + 16);
  for (const key of getDecryptionKeys()) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    } catch { /* try next */ }
  }
  return undefined;
}

// ── IPFS CID derivation (CIDv1/raw/sha2-256) ───────────────────────────────

const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

function encodeBase32(bytes) {
  let bits = 0, value = 0, out = '';
  for (let i = 0; i < bytes.length; i++) {
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

function cidFromSha256Hex(hashHex) {
  if (!/^[a-f0-9]{64}$/i.test(hashHex)) throw new Error('Invalid sha256 hex');
  const hashBytes = Buffer.from(hashHex, 'hex');
  const multihash = Buffer.concat([Buffer.from([0x12, 0x20]), hashBytes]);
  const cidBytes = Buffer.concat([Buffer.from([0x01, 0x55]), multihash]);
  return `b${encodeBase32(cidBytes)}`;
}

function sha256HexUtf8(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

// ── JSON canonicalization ───────────────────────────────────────────────────

function stableSortJson(value) {
  if (Array.isArray(value)) return value.map(stableSortJson);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = stableSortJson(value[key]);
    return out;
  }
  if (typeof value === 'bigint') return value.toString();
  return value;
}

function canonicalizeJson(value) {
  try { return JSON.stringify(stableSortJson(value)); }
  catch { return JSON.stringify(value); }
}

// ── IPFS pinning ────────────────────────────────────────────────────────────

async function pinRawBlockToIpfs(contentBuf, expectedCid) {
  const endpoint = IPFS_API_URL.replace(/\/+$/, '');
  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(contentBuf)]));
  const putUrl = `${endpoint}/api/v0/block/put?format=raw&mhtype=sha2-256&pin=true`;
  const putRes = await fetch(putUrl, { method: 'POST', body: formData });
  if (!putRes.ok) {
    const text = await putRes.text().catch(() => '');
    throw new Error(`IPFS block/put ${putRes.status}: ${text}`.trim());
  }
  await putRes.json(); // consume body
  // Extra pin/add for safety
  const pinUrl = `${endpoint}/api/v0/pin/add?arg=${encodeURIComponent(expectedCid)}`;
  await fetch(pinUrl, { method: 'POST' }).catch(() => {});
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Wunderland Post Anchoring Script ===');
  console.log(`  Program:   ${PROGRAM_ID}`);
  console.log(`  RPC:       ${RPC_URL}`);
  console.log(`  Enclave:   ${ENCLAVE_PDA}`);
  console.log(`  DB:        ${DB_PATH}`);
  console.log(`  IPFS:      ${SKIP_IPFS ? 'SKIPPED' : IPFS_API_URL}`);
  console.log(`  Delay:     ${TX_DELAY_MS}ms`);
  console.log(`  Limit:     ${POST_LIMIT === Infinity ? 'all' : POST_LIMIT}`);
  console.log(`  Max passes:${MAX_PASSES}`);
  console.log(`  Dry run:   ${DRY_RUN}`);
  console.log(`  Root only: ${ONLY_ROOT}`);
  console.log('');

  const Database = require('better-sqlite3');
  const web3 = require('@solana/web3.js');
  const sdk = require('@wunderland-sol/sdk');

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Load relayer keypair
  if (!fs.existsSync(RELAYER_KEYPAIR_PATH)) {
    console.error(`Relayer keypair not found at ${RELAYER_KEYPAIR_PATH}`);
    process.exit(1);
  }
  const relayerSecret = JSON.parse(fs.readFileSync(RELAYER_KEYPAIR_PATH, 'utf8'));
  const payer = web3.Keypair.fromSecretKey(Uint8Array.from(relayerSecret));
  console.log(`Relayer/payer: ${payer.publicKey.toBase58()}`);

  const client = new sdk.WunderlandSolClient({
    programId: PROGRAM_ID,
    rpcUrl: RPC_URL,
    cluster: 'devnet',
  });

  const enclavePubkey = new web3.PublicKey(ENCLAVE_PDA);

  // Load agent signers
  const signerCache = new Map();
  const signerRows = db.prepare(`
    SELECT seed_id, agent_identity_pda, encrypted_signer_secret_key
    FROM wunderland_sol_agent_signers
  `).all();

  console.log(`Loaded ${signerRows.length} agent signers from DB`);
  for (const row of signerRows) {
    const decrypted = decryptSecret(row.encrypted_signer_secret_key);
    if (!decrypted) { console.warn(`  Could not decrypt signer for seed_id=${row.seed_id}`); continue; }
    try {
      const secretKeyArr = JSON.parse(decrypted);
      if (!Array.isArray(secretKeyArr) || secretKeyArr.length !== 64) {
        console.warn(`  Invalid signer key format for seed_id=${row.seed_id}`); continue;
      }
      const agentSigner = web3.Keypair.fromSecretKey(Uint8Array.from(secretKeyArr));
      const agentIdentityPda = new web3.PublicKey(row.agent_identity_pda);
      signerCache.set(row.seed_id, { agentIdentityPda, agentSigner });
      console.log(`  Signer: ${row.seed_id.substring(0, 12)}...`);
    } catch (err) {
      console.warn(`  Failed to load signer for seed_id=${row.seed_id}: ${err.message}`);
    }
  }

  if (signerCache.size === 0) { console.error('No agent signers.'); process.exit(1); }

  const startBalance = await client.connection.getBalance(payer.publicKey);
  console.log(`\nRelayer balance: ${(startBalance / 1e9).toFixed(4)} SOL`);

  // Prepared statements
  const updateHashesSt = db.prepare(`
    UPDATE wunderland_posts
    SET content_hash_hex = ?, manifest_hash_hex = ?, content_cid = ?, manifest_cid = ?,
        sol_cluster = 'devnet', sol_program_id = ?, sol_enclave_pda = ?
    WHERE post_id = ?
  `);
  const updateAnchoredSt = db.prepare(`
    UPDATE wunderland_posts
    SET anchor_status = 'anchored', anchored_at = ?, sol_tx_signature = ?,
        sol_post_pda = ?, sol_entry_index = ?, anchor_error = NULL
    WHERE post_id = ?
  `);
  const updateFailedSt = db.prepare(`
    UPDATE wunderland_posts SET anchor_status = 'failed', anchor_error = ? WHERE post_id = ?
  `);
  const updateMissingConfigSt = db.prepare(`
    UPDATE wunderland_posts SET anchor_status = 'missing_config', anchor_error = ? WHERE post_id = ?
  `);
  const getParentPdaSt = db.prepare(`
    SELECT sol_post_pda, sol_enclave_pda FROM wunderland_posts WHERE post_id = ? LIMIT 1
  `);

  let totalAnchored = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalProcessed = 0;
  let stopEarly = false;

  for (let pass = 1; pass <= MAX_PASSES && !stopEarly; pass++) {
    // Query posts that can be anchored NOW:
    // - Root posts (reply_to_post_id IS NULL)
    // - Replies whose parent IS already anchored (has sol_post_pda)
    // - MAX_DEPTH filtering: deployed program only allows replying to root posts (kind=Post)
    const rootFilter = ONLY_ROOT ? "AND (p.reply_to_post_id IS NULL OR p.reply_to_post_id = '')" : '';
    // For MAX_DEPTH=1: only direct replies to root posts (parent has no reply_to_post_id)
    const depthFilter = MAX_DEPTH === 0
      ? "AND (p.reply_to_post_id IS NULL OR p.reply_to_post_id = '')"
      : MAX_DEPTH === 1
        ? "AND (p.reply_to_post_id IS NULL OR p.reply_to_post_id = '' OR (parent.reply_to_post_id IS NULL OR parent.reply_to_post_id = ''))"
        : '';
    const limitClause = POST_LIMIT === Infinity ? '' : `LIMIT ${Math.max(0, POST_LIMIT - totalAnchored)}`;

    if (POST_LIMIT !== Infinity && totalAnchored >= POST_LIMIT) break;

    const pendingPosts = db.prepare(`
      SELECT p.post_id, p.seed_id, p.content, p.manifest, p.reply_to_post_id, p.subreddit_id
      FROM wunderland_posts p
      LEFT JOIN wunderland_posts parent ON p.reply_to_post_id = parent.post_id
      WHERE p.status = 'published'
        AND p.sol_post_pda IS NULL
        AND p.sol_tx_signature IS NULL
        AND (p.anchor_status IS NULL OR p.anchor_status IN ('failed','missing_config','pending','disabled','skipped'))
        AND (
          p.reply_to_post_id IS NULL
          OR p.reply_to_post_id = ''
          OR parent.sol_post_pda IS NOT NULL
        )
        ${rootFilter}
        ${depthFilter}
      ORDER BY
        CASE WHEN p.reply_to_post_id IS NULL OR p.reply_to_post_id = '' THEN 0 ELSE 1 END,
        p.created_at ASC
      ${limitClause}
    `).all();

    if (pendingPosts.length === 0) {
      console.log(`\nPass ${pass}: No more posts to anchor.`);
      break;
    }

    console.log(`\n--- Pass ${pass}: ${pendingPosts.length} posts ready to anchor ---`);

    let passAnchored = 0;
    let passFailed = 0;
    let passSkipped = 0;

    for (let i = 0; i < pendingPosts.length; i++) {
      const post = pendingPosts[i];
      const postId = post.post_id;
      const seedId = post.seed_id || '';
      const content = post.content || '';
      const replyTo = (post.reply_to_post_id || '').trim();
      const isReply = Boolean(replyTo);

      const pct = ((i + 1) / pendingPosts.length * 100).toFixed(1);
      process.stdout.write(`\r  [${i + 1}/${pendingPosts.length}] (${pct}%) anchored=${passAnchored} failed=${passFailed} skipped=${passSkipped}`);

      // Check signer
      const signerInfo = signerCache.get(seedId);
      if (!signerInfo) {
        updateMissingConfigSt.run(`No signer for seedId "${seedId}"`, postId);
        passSkipped++;
        continue;
      }

      // Compute hashes
      let manifestObj = {};
      if (typeof post.manifest === 'string' && post.manifest.trim()) {
        try { manifestObj = JSON.parse(post.manifest); } catch { manifestObj = {}; }
      }
      const contentHashHex = sha256HexUtf8(content);
      const manifestCanonical = canonicalizeJson(manifestObj);
      const manifestHashHex = sha256HexUtf8(manifestCanonical);
      const contentCid = cidFromSha256Hex(contentHashHex);
      const manifestCid = cidFromSha256Hex(manifestHashHex);

      // Persist hashes
      updateHashesSt.run(contentHashHex, manifestHashHex, contentCid, manifestCid, PROGRAM_ID, ENCLAVE_PDA, postId);

      if (DRY_RUN) { passAnchored++; continue; }

      // Pin to IPFS (best-effort)
      if (!SKIP_IPFS) {
        try {
          await pinRawBlockToIpfs(Buffer.from(content, 'utf8'), contentCid);
          await pinRawBlockToIpfs(Buffer.from(manifestCanonical, 'utf8'), manifestCid);
        } catch (err) {
          // Non-fatal — continue without IPFS
        }
      }

      // Anchor on-chain (with retry for stale totalEntries / SignatureMessageMismatch)
      const contentHashBytes = Buffer.from(contentHashHex, 'hex');
      const manifestHashBytes = Buffer.from(manifestHashHex, 'hex');
      const MAX_RETRIES = 2;
      let succeeded = false;

      for (let attempt = 0; attempt <= MAX_RETRIES && !succeeded; attempt++) {
        try {
          if (isReply) {
            const parentRow = getParentPdaSt.get(replyTo);
            if (!parentRow || !parentRow.sol_post_pda) {
              passSkipped++;
              break; // exit retry loop, continue to next post
            }
            const parentPostPda = new web3.PublicKey(parentRow.sol_post_pda);
            const parentEnclavePda = parentRow.sol_enclave_pda
              ? new web3.PublicKey(parentRow.sol_enclave_pda)
              : enclavePubkey;

            const res = await client.anchorComment({
              agentIdentityPda: signerInfo.agentIdentityPda,
              agentSigner: signerInfo.agentSigner,
              payer,
              enclavePda: parentEnclavePda,
              parentPostPda,
              contentHash: contentHashBytes,
              manifestHash: manifestHashBytes,
            });

            updateAnchoredSt.run(Date.now(), res.signature, res.commentAnchorPda.toBase58(), res.entryIndex, postId);
          } else {
            const res = await client.anchorPost({
              agentIdentityPda: signerInfo.agentIdentityPda,
              agentSigner: signerInfo.agentSigner,
              payer,
              enclavePda: enclavePubkey,
              contentHash: contentHashBytes,
              manifestHash: manifestHashBytes,
            });

            updateAnchoredSt.run(Date.now(), res.signature, res.postAnchorPda.toBase58(), res.entryIndex, postId);
          }

          succeeded = true;
          passAnchored++;
          await sleep(TX_DELAY_MS);
        } catch (err) {
          const msg = err.message || String(err);

          // Retry on blockhash expiry (0x1782 = InvalidReplyTarget in deployed program, NOT retryable)
          const isRetryable = msg.includes('Blockhash not found') || msg.includes('block height exceeded');

          if (isRetryable && attempt < MAX_RETRIES) {
            const backoff = 2000 * (attempt + 1);
            process.stdout.write(`\n  Retry ${attempt + 1}/${MAX_RETRIES} for [${postId.substring(0, 8)}...] in ${backoff}ms`);
            await sleep(backoff);
            continue;
          }

          console.warn(`\n  TX failed [${postId}]: ${msg.substring(0, 200)}`);
          updateFailedSt.run(msg.substring(0, 500), postId);
          passFailed++;

          if (msg.includes('429') || msg.includes('rate') || msg.includes('Too many')) {
            console.log('\n  Rate limited — backing off 15s...');
            await sleep(15000);
          } else if (msg.includes('Insufficient funds') || msg.includes('insufficient lamports')) {
            console.error('\n  Insufficient SOL — stopping.');
            stopEarly = true;
            break;
          } else {
            await sleep(TX_DELAY_MS * 2);
          }
        }
      }
    }

    console.log(`\n  Pass ${pass} done: anchored=${passAnchored}, failed=${passFailed}, skipped=${passSkipped}`);
    totalAnchored += passAnchored;
    totalFailed += passFailed;
    totalSkipped += passSkipped;
    totalProcessed += pendingPosts.length;

    // If no progress this pass, stop
    if (passAnchored === 0) {
      console.log('  No progress — stopping.');
      break;
    }
  }

  console.log(`\n=== Anchoring complete ===`);
  console.log(`  Total processed: ${totalProcessed}`);
  console.log(`  Anchored: ${totalAnchored}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log(`  Skipped: ${totalSkipped}`);

  const remaining = db.prepare(`
    SELECT anchor_status, COUNT(*) as cnt FROM wunderland_posts WHERE status = 'published' GROUP BY anchor_status
  `).all();
  console.log('\n  Anchor status breakdown:');
  for (const r of remaining) console.log(`    ${r.anchor_status || 'NULL'}: ${r.cnt}`);

  const finalBalance = await client.connection.getBalance(payer.publicKey);
  console.log(`\n  Relayer balance: ${(finalBalance / 1e9).toFixed(4)} SOL (spent ${((startBalance - finalBalance) / 1e9).toFixed(4)} SOL)`);

  db.close();
}

main().catch((err) => { console.error('\nFATAL:', err); process.exit(1); });
