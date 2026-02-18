/**
 * Example: lazy skill discovery + enablement via @framers/agentos-ext-skills.
 *
 * Run:
 *   # In the monorepo workspace, make sure @framers/agentos is built:
 *   #   cd ../agentos && pnpm build
 *   cd packages/agentos-ext-skills
 *   pnpm build
 *   node examples/enable-skill-and-snapshot.mjs
 */

import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

import { createExtensionPack } from '@framers/agentos-ext-skills';
import { SkillRegistry } from '@framers/agentos/skills';

async function main() {
  const ctx = { gmiId: 'demo', personaId: 'demo', userContext: { userId: 'demo' } };

  const pack = createExtensionPack({ options: {}, logger: console });
  const toolByName = new Map(
    (pack.descriptors || [])
      .filter((d) => d.kind === 'tool')
      .map((d) => [d.payload?.name, d.payload])
      .filter(([name]) => typeof name === 'string'),
  );

  const skillsList = toolByName.get('skills_list');
  const skillsRead = toolByName.get('skills_read');
  const skillsEnable = toolByName.get('skills_enable');

  if (!skillsList || !skillsRead || !skillsEnable) {
    throw new Error('Expected skills tools were not found in the extension pack.');
  }

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agentos-skills-demo-'));
  const skillsDir = path.join(tmpRoot, 'skills');

  console.log(`Temp dir: ${tmpRoot}`);
  console.log();

  const listRes = await skillsList.execute({ query: 'github', limit: 10 }, ctx);
  if (!listRes.success) throw new Error(listRes.error || 'skills_list failed');

  const first = listRes.output.skills?.[0];
  const skillRef = first?.name || first?.id || 'github';

  console.log(`Top match: ${skillRef}`);
  console.log();

  const readRes = await skillsRead.execute({ skill: skillRef }, ctx);
  if (!readRes.success) throw new Error(readRes.error || 'skills_read failed');

  const preview = String(readRes.output.markdown || '').split('\n').slice(0, 12).join('\n');
  console.log('SKILL.md (preview):');
  console.log(preview);
  console.log();

  const dryRunRes = await skillsEnable.execute({ skill: skillRef, targetDir: skillsDir, dryRun: true }, ctx);
  if (!dryRunRes.success) throw new Error(dryRunRes.error || 'skills_enable dryRun failed');

  console.log(`Enable (dry run): destDir=${dryRunRes.output.destDir}`);
  console.log();

  const enableRes = await skillsEnable.execute(
    { skill: skillRef, targetDir: skillsDir, overwrite: true },
    ctx,
  );
  if (!enableRes.success) throw new Error(enableRes.error || 'skills_enable failed');

  console.log(`Enabled: copied=${enableRes.output.copied} destDir=${enableRes.output.destDir}`);
  console.log();

  const registry = new SkillRegistry();
  await registry.loadFromDirs([skillsDir]);
  const snapshot = registry.buildSnapshot({ platform: process.platform, strict: true });

  console.log('Prompt snapshot (first 400 chars):');
  console.log(String(snapshot.prompt || '').slice(0, 400));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
