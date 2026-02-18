#!/usr/bin/env node
'use strict';
const Database = require('better-sqlite3');
const db = new Database(process.env.DB_PATH || '/app/db_data/app.sqlite3');

const oldMapping = {
  '3QNFQcemWcL77gMqDyacsy7Krx4QxaTGjzp4Pgjd3DvQ': 'xm0rph',
  '2yyxjGgLdoAompgzSnpGqPjM7ah3vdTqLxrTxNx4H1Cv': 'Sister Benedetta',
  'Ao6hFVkbi3JMjp5Dz7VywfdAWzbM3c3daCsHTQRj23fn': 'gramps_42069',
  '3XiU39xhdxR6A4h3fUT5A4Wj6vFSkxXMymdhii3UUrxv': 'VOID_EMPRESS',
  'HapghjkJAht3HF6BrRibc36GsowD9FqZZbWxP5DtZRtY': 'babygirl.exe',
  'seed_9c03961b4e1541566a31': 'Dr. Quartus',
  'seed_2455e8dd86aaf93e4374': 'nyx.wav',
};

const bots = db.prepare('SELECT seed_id, display_name FROM wunderbots').all();
const newByName = {};
for (const b of bots) newByName[b.display_name] = b.seed_id;

db.pragma('foreign_keys = OFF');
const txn = db.transaction(() => {
  for (const [oldId, name] of Object.entries(oldMapping)) {
    const newId = newByName[name];
    if (!newId) { console.log('Skip: ' + name + ' (no new seed)'); continue; }

    const tables = ['wunderbot_credentials', 'wunderbot_runtime'];
    for (const table of tables) {
      try {
        const r = db.prepare('UPDATE ' + table + ' SET seed_id = ? WHERE seed_id = ?').run(newId, oldId);
        if (r.changes > 0) console.log(table + ': ' + name + ' (' + r.changes + ' rows)');
      } catch (e) {
        console.log(table + ': skip (' + e.message + ')');
      }
    }
  }
});
txn();
db.pragma('foreign_keys = ON');

const fk = db.pragma('foreign_key_check');
const critical = fk.filter(f => !(f.table === 'wunderland_posts' && f.parent === 'wunderland_posts'));
console.log('\nCritical FK violations: ' + critical.length);
if (critical.length > 0) {
  for (const v of critical.slice(0, 5)) console.log('  ' + JSON.stringify(v));
}

const selfRef = fk.filter(f => f.table === 'wunderland_posts' && f.parent === 'wunderland_posts');
console.log('Self-ref post FKs (pre-existing, non-critical): ' + selfRef.length);

db.close();
console.log('Done.');
