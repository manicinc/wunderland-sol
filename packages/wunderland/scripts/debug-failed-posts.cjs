const Database = require('better-sqlite3');
const db = new Database('/app/db_data/app.sqlite3');

const ids = [
  '8321de70-211d-4d0f-9ecf-c83fcfb1952e',
  'c8c0718b-ff61-4f20-bb32-bbbeb90af1cd',
  'fb88bb06-73ac-4133-a9ca-33e521e62e2a',
  'd93b9c04-fed9-42ad-8cb7-9207ed651cc8',
];

for (const id of ids) {
  const p = db.prepare(`SELECT post_id, seed_id, reply_to_post_id, status, anchor_status, content_hash_hex, sol_enclave_pda FROM wunderland_posts WHERE post_id = ?`).get(id);
  if (!p) { console.log(id, '-> NOT FOUND'); continue; }
  const parent = p.reply_to_post_id ? db.prepare(`SELECT post_id, sol_post_pda, sol_enclave_pda, seed_id FROM wunderland_posts WHERE post_id = ?`).get(p.reply_to_post_id) : null;
  console.log('Post:', id.substring(0, 12));
  console.log('  seed_id:', p.seed_id ? p.seed_id.substring(0, 16) + '...' : 'NULL');
  console.log('  reply_to:', p.reply_to_post_id || 'NULL (root)');
  console.log('  status:', p.status, 'anchor:', p.anchor_status);
  console.log('  enclave_pda:', p.sol_enclave_pda || 'NULL');
  if (parent) {
    console.log('  parent sol_post_pda:', parent.sol_post_pda || 'NOT ANCHORED');
    console.log('  parent sol_enclave_pda:', parent.sol_enclave_pda || 'NULL');
    console.log('  parent seed_id:', parent.seed_id ? parent.seed_id.substring(0, 16) + '...' : 'NULL');
    console.log('  SAME agent:', p.seed_id === parent.seed_id);
  } else if (p.reply_to_post_id) {
    console.log('  PARENT NOT FOUND IN DB!');
  }
  console.log('');
}

// Check a working reply for comparison
const working = db.prepare(`SELECT post_id, seed_id, reply_to_post_id FROM wunderland_posts WHERE anchor_status = 'anchored' AND reply_to_post_id IS NOT NULL AND reply_to_post_id != '' LIMIT 3`).all();
console.log('--- Working replies for comparison ---');
for (const w of working) {
  const par = db.prepare(`SELECT sol_post_pda, seed_id FROM wunderland_posts WHERE post_id = ?`).get(w.reply_to_post_id);
  console.log('  post:', w.post_id.substring(0, 12), 'seed:', w.seed_id.substring(0, 12), 'parent_pda:', (par && par.sol_post_pda) ? par.sol_post_pda.substring(0, 12) : 'N/A', 'same_agent:', w.seed_id === (par && par.seed_id));
}

db.close();
