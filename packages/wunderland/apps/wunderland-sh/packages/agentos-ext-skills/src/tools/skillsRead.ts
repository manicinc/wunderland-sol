import type {
  ITool,
  JSONSchemaObject,
  ToolExecutionContext,
  ToolExecutionResult,
} from '@framers/agentos';

import {
  buildInstallCommands,
  computeEligibility,
  findSkillEntry,
  loadSkillsRegistry,
  readSkillMarkdown,
  resolveSkillAbsoluteDir,
  type SkillCatalogItem,
} from '../catalog.js';

type SkillsReadInput = {
  skill: string;
  platform?: string;
};

type SkillsReadOutput = {
  skill: SkillCatalogItem;
  markdown: string;
};

export class SkillsReadTool implements ITool<SkillsReadInput, SkillsReadOutput> {
  public readonly id = 'agentos-skills-read-v1';
  public readonly name = 'skills_read';
  public readonly displayName = 'Read Skill';
  public readonly description =
    'Read a curated skill’s SKILL.md from the installed @framers/agentos-skills-registry catalog.';
  public readonly category = 'system';
  public readonly hasSideEffects = false;

  public readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    required: ['skill'],
    properties: {
      skill: {
        type: 'string',
        description: 'Skill name or id (e.g. "github" or "com.framers.skill.github")',
      },
      platform: {
        type: 'string',
        description: 'Platform for OS gating (default: process.platform)',
      },
    },
    additionalProperties: false,
  };

  async execute(
    input: SkillsReadInput,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<SkillsReadOutput>> {
    try {
      const ref = (input.skill || '').trim();
      if (!ref) {
        return { success: false, error: 'Missing required field: skill' };
      }

      const registry = await loadSkillsRegistry();
      const entry = findSkillEntry(registry, ref);
      if (!entry) {
        return { success: false, error: `Skill not found in catalog: ${ref}` };
      }

      const platform = (input.platform && String(input.platform).trim()) || process.platform;

      const item: SkillCatalogItem = {
        ...entry,
        absolutePath: resolveSkillAbsoluteDir(entry),
        eligibility: computeEligibility(entry, platform),
        installCommands: buildInstallCommands(entry, platform),
      };

      const markdown = await readSkillMarkdown(entry);

      return { success: true, output: { skill: item, markdown } };
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) };
    }
  }
}
