import { describe, it, expect } from 'vitest';

import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

import { SkillsEnableTool } from '../src/tools/skillsEnable';
import { SkillsListTool } from '../src/tools/skillsList';
import { SkillsReadTool } from '../src/tools/skillsRead';

describe('@framers/agentos-ext-skills tools', () => {
  it('skills_list returns catalog entries', async () => {
    const tool = new SkillsListTool();
    const result = await tool.execute({}, {} as any);

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
    expect(result.output!.skills.length).toBeGreaterThan(0);
    expect(result.output!.skills.some((s) => s.name === 'github')).toBe(true);
  });

  it('skills_read returns SKILL.md content', async () => {
    const tool = new SkillsReadTool();
    const result = await tool.execute({ skill: 'github' }, {} as any);

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
    expect(result.output!.skill.name).toBe('github');
    expect(result.output!.markdown.length).toBeGreaterThan(20);
    expect(result.output!.markdown).toMatch(/name:\s*github/i);
  });

  it('skills_enable supports dryRun', async () => {
    const targetDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentos-skills-enable-'));
    const tool = new SkillsEnableTool();
    const result = await tool.execute({ skill: 'github', targetDir, dryRun: true }, {} as any);

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
    expect(result.output!.copied).toBe(false);
    expect(result.output!.destDir).toBe(path.join(targetDir, 'github'));
  });

  it('skills_enable copies a skill directory', async () => {
    const targetDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentos-skills-enable-'));
    const tool = new SkillsEnableTool();

    const result = await tool.execute({ skill: 'github', targetDir }, {} as any);
    expect(result.success).toBe(true);
    expect(result.output?.copied).toBe(true);

    const skillPath = path.join(targetDir, 'github', 'SKILL.md');
    const stat = await fs.stat(skillPath);
    expect(stat.isFile()).toBe(true);

    await fs.rm(targetDir, { recursive: true, force: true });
  });
});
