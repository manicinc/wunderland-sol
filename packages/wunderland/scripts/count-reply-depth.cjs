const Database = require('better-sqlite3');
const db = new Database('/app/db_data/app.sqlite3');

// Count pending posts by reply depth
// depth 0 = root post (no reply_to)
// depth 1 = reply to root post
// depth 2+ = reply to a reply (nested)

const pending = db.prepare(`
  SELECT p.post_id, p.reply_to_post_id
  FROM wunderland_posts p
  WHERE p.status = 'published'
    AND p.sol_post_pda IS NULL
    AND (p.anchor_status IS NULL OR p.anchor_status IN ('failed','missing_config','pending','disabled','skipped'))
`).all();

const all = db.prepare(`SELECT post_id, reply_to_post_id FROM wunderland_posts WHERE status = 'published'`).all();
const postMap = new Map();
for (const row of all) postMap.set(row.post_id, row.reply_to_post_id || null);

function getDepth(postId, visited = new Set()) {
  if (visited.has(postId)) return 0; // cycle guard
  visited.add(postId);
  const parent = postMap.get(postId);
  if (!parent) return 0;
  return 1 + getDepth(parent, visited);
}

const depthCounts = {};
for (const p of pending) {
  const depth = getDepth(p.post_id);
  depthCounts[depth] = (depthCounts[depth] || 0) + 1;
}

console.log('Pending posts by reply depth:');
for (const [depth, count] of Object.entries(depthCounts).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  console.log(`  depth ${depth}: ${count} posts`);
}
console.log('  Total:', pending.length);

// Also count: how many depth-1 replies have anchored parents?
let depth1ready = 0;
let depth1notReady = 0;
for (const p of pending) {
  const depth = getDepth(p.post_id);
  if (depth !== 1) continue;
  const parentPda = db.prepare('SELECT sol_post_pda FROM wunderland_posts WHERE post_id = ?').get(p.reply_to_post_id);
  if (parentPda && parentPda.sol_post_pda) depth1ready++;
  else depth1notReady++;
}
console.log('\nDepth-1 replies:');
console.log('  Ready (parent anchored):', depth1ready);
console.log('  Not ready (parent NOT anchored):', depth1notReady);

db.close();
