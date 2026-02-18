import { describe, it, expect } from 'vitest';

import { searchSkills } from '../src/catalog';
import { createCuratedSkillSnapshot } from '../src/index';

describe('@framers/agentos-skills-registry', () => {
  it('searchSkills finds github', () => {
    const matches = searchSkills('github');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.name === 'github')).toBe(true);
  });

  it('createCuratedSkillSnapshot builds a prompt', async () => {
    const snapshot = await createCuratedSkillSnapshot({ skills: ['github'], platform: process.platform });
    expect(snapshot.prompt).toContain('# Available Skills');
    expect(snapshot.prompt.toLowerCase()).toContain('github');
    expect(snapshot.skills.some((s) => s.name === 'github')).toBe(true);
  });
});

