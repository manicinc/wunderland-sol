/**
 * @fileoverview Basic validation for the personas registry.
 *
 * This is intentionally lightweight: it ensures registry.json parses and its
 * stats match the listed personas. Deeper schema validation can be added later.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const registryPath = path.join(rootDir, 'registry.json');

async function main() {
  if (!existsSync(registryPath)) {
    console.error('[agentos-personas] Missing registry.json');
    process.exitCode = 1;
    return;
  }

  const raw = await readFile(registryPath, 'utf8');
  const reg = JSON.parse(raw);

  const curated = Array.isArray(reg?.personas?.curated) ? reg.personas.curated : [];
  const community = Array.isArray(reg?.personas?.community) ? reg.personas.community : [];
  const total = curated.length + community.length;

  const stats = reg?.stats || {};
  const ok =
    Number(stats.totalPersonas) === total &&
    Number(stats.curatedCount) === curated.length &&
    Number(stats.communityCount) === community.length;

  if (!ok) {
    console.error('[agentos-personas] registry.json stats mismatch');
    console.error(`  expected total=${total} curated=${curated.length} community=${community.length}`);
    console.error(`  got      total=${stats.totalPersonas} curated=${stats.curatedCount} community=${stats.communityCount}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[agentos-personas] OK (${total} personas)`);
}

main().catch((err) => {
  console.error('[agentos-personas] validate-personas failed:', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});

