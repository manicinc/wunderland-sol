// Debug script: simulate anchor_comment for a specific post and print full details
const crypto = require('crypto');
const fs = require('fs');

const POST_ID = '8321de70-211d-4d0f-9ecf-c83fcfb1952e';
const PROGRAM_ID_STR = '3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo';
const ENCLAVE_PDA_STR = 'GvaN1xnNp6GYubdWrJ97GtSHCVdaNPefbTD7ReFUWdej';
const RPC_URL = 'https://api.devnet.solana.com';
const DB_PATH = '/app/db_data/app.sqlite3';
const RELAYER_PATH = '/tmp/admin-phantom.json';

const IV_LENGTH = 12;
function getDecryptionKeys() {
  const candidates = [process.env.WUNDERLAND_CREDENTIALS_ENCRYPTION_KEY, process.env.JWT_SECRET, process.env.SETTINGS_ENCRYPTION_KEY, process.env.SERVER_SECRET, 'dev-insecure-key'];
  const seen = new Set();
  return candidates.map(v => (typeof v === 'string' ? v.trim() : '')).filter(v => v.length > 0 && !seen.has(v) && seen.add(v)).map(raw => crypto.createHash('sha256').update(raw).digest());
}
function decryptSecret(enc) {
  if (!enc) return undefined;
  const raw = Buffer.from(enc, 'base64');
  const iv = raw.subarray(0, IV_LENGTH), tag = raw.subarray(IV_LENGTH, IV_LENGTH + 16), data = raw.subarray(IV_LENGTH + 16);
  for (const key of getDecryptionKeys()) {
    try { const d = crypto.createDecipheriv('aes-256-gcm', key, iv); d.setAuthTag(tag); return Buffer.concat([d.update(data), d.final()]).toString('utf8'); } catch {}
  }
  return undefined;
}
function sha256HexUtf8(text) { return crypto.createHash('sha256').update(text, 'utf8').digest('hex'); }
function stableSortJson(v) { if (Array.isArray(v)) return v.map(stableSortJson); if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) o[k] = stableSortJson(v[k]); return o; } return v; }
function canonicalizeJson(v) { try { return JSON.stringify(stableSortJson(v)); } catch { return JSON.stringify(v); } }

async function main() {
  const Database = require('better-sqlite3');
  const web3 = require('@solana/web3.js');
  const sdk = require('@wunderland-sol/sdk');

  const db = new Database(DB_PATH);
  const conn = new web3.Connection(RPC_URL, 'confirmed');

  // Get post details
  const post = db.prepare('SELECT * FROM wunderland_posts WHERE post_id = ?').get(POST_ID);
  if (!post) { console.error('Post not found'); process.exit(1); }
  console.log('Post:', POST_ID);
  console.log('  seed_id:', post.seed_id);
  console.log('  reply_to:', post.reply_to_post_id);
  console.log('  content length:', (post.content || '').length);

  // Get parent
  const parent = db.prepare('SELECT post_id, sol_post_pda, sol_enclave_pda, seed_id FROM wunderland_posts WHERE post_id = ?').get(post.reply_to_post_id);
  console.log('Parent:', parent.post_id);
  console.log('  parent sol_post_pda:', parent.sol_post_pda);
  console.log('  parent sol_enclave_pda:', parent.sol_enclave_pda);

  // Get agent signer
  const signerRow = db.prepare('SELECT * FROM wunderland_sol_agent_signers WHERE seed_id = ?').get(post.seed_id);
  if (!signerRow) { console.error('No signer for', post.seed_id); process.exit(1); }
  const decrypted = decryptSecret(signerRow.encrypted_signer_secret_key);
  const secretKeyArr = JSON.parse(decrypted);
  const agentSigner = web3.Keypair.fromSecretKey(Uint8Array.from(secretKeyArr));
  const agentIdentityPda = new web3.PublicKey(signerRow.agent_identity_pda);

  console.log('\nAgent PDA:', agentIdentityPda.toBase58());
  console.log('Agent signer pubkey:', agentSigner.publicKey.toBase58());

  // Read agent account on-chain
  const agentInfo = await conn.getAccountInfo(agentIdentityPda);
  const agentData = Buffer.from(agentInfo.data);
  const totalEntries = agentData.readUInt32LE(157);
  // Also read agent_signer from account (offset 8+32+32=72, length 32)
  const onChainAgentSigner = new web3.PublicKey(agentData.subarray(72, 104));
  console.log('On-chain totalEntries:', totalEntries);
  console.log('On-chain agent_signer:', onChainAgentSigner.toBase58());
  console.log('Signer matches:', agentSigner.publicKey.equals(onChainAgentSigner));

  // Compute content/manifest hashes
  const content = post.content || '';
  let manifestObj = {};
  if (typeof post.manifest === 'string' && post.manifest.trim()) {
    try { manifestObj = JSON.parse(post.manifest); } catch {}
  }
  const contentHashHex = sha256HexUtf8(content);
  const manifestCanonical = canonicalizeJson(manifestObj);
  const manifestHashHex = sha256HexUtf8(manifestCanonical);
  console.log('\nContent hash:', contentHashHex);
  console.log('Manifest hash:', manifestHashHex);

  // Build the same payload the SDK would build for anchorComment
  const enclavePda = new web3.PublicKey(ENCLAVE_PDA_STR);
  const parentPostPda = new web3.PublicKey(parent.sol_post_pda);
  const programId = new web3.PublicKey(PROGRAM_ID_STR);

  const entryIndex = totalEntries;
  const kindByte = Buffer.from([1]); // Comment
  const indexBuf = Buffer.alloc(4);
  indexBuf.writeUInt32LE(entryIndex >>> 0, 0);
  const contentHashBytes = Buffer.from(contentHashHex, 'hex');
  const manifestHashBytes = Buffer.from(manifestHashHex, 'hex');

  const payload = Buffer.concat([
    enclavePda.toBuffer(),
    parentPostPda.toBuffer(),
    kindByte,
    indexBuf,
    contentHashBytes,
    manifestHashBytes,
  ]);

  console.log('\nPayload hex:', payload.toString('hex'));
  console.log('Payload length:', payload.length, 'expected:', 32+32+1+4+32+32);

  // Build the full message
  const SIGN_DOMAIN = Buffer.from('WUNDERLAND_SOL_V2', 'utf8');
  const ACTION_ANCHOR_COMMENT = 3;
  const message = Buffer.concat([
    SIGN_DOMAIN,
    Buffer.from([ACTION_ANCHOR_COMMENT]),
    programId.toBuffer(),
    agentIdentityPda.toBuffer(),
    payload,
  ]);

  console.log('Message length:', message.length);
  console.log('Message hex (first 100):', message.subarray(0, 100).toString('hex'));

  // Try to simulate the TX
  const payer = web3.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(RELAYER_PATH, 'utf8'))));

  try {
    const client = new sdk.WunderlandSolClient({ programId: PROGRAM_ID_STR, rpcUrl: RPC_URL, cluster: 'devnet' });
    const res = await client.anchorComment({
      agentIdentityPda,
      agentSigner,
      payer,
      enclavePda,
      parentPostPda,
      contentHash: contentHashBytes,
      manifestHash: manifestHashBytes,
    });
    console.log('\nSUCCESS! Signature:', res.signature);
    console.log('Comment PDA:', res.commentAnchorPda.toBase58());
    console.log('Entry index:', res.entryIndex);
  } catch (err) {
    console.error('\nFAILED:', err.message);
    // Check if there are full logs
    if (err.logs) console.error('Logs:', err.logs);
  }

  db.close();
}

main().catch(console.error);
