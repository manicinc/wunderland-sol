import * as path from 'node:path';
import * as fs from 'node:fs/promises';

import type {
  ITool,
  JSONSchemaObject,
  ToolExecutionContext,
  ToolExecutionResult,
} from '@framers/agentos';

import {
  findSkillEntry,
  loadSkillsRegistry,
  resolveDefaultEnableDir,
  resolveSkillAbsoluteDir,
} from '../catalog.js';

type SkillsEnableInput = {
  skill: string;
  targetDir?: string;
  overwrite?: boolean;
  dryRun?: boolean;
};

type SkillsEnableOutput = {
  skill: string;
  sourceDir: string;
  targetDir: string;
  destDir: string;
  copied: boolean;
};

export class SkillsEnableTool implements ITool<SkillsEnableInput, SkillsEnableOutput> {
  public readonly id = 'agentos-skills-enable-v1';
  public readonly name = 'skills_enable';
  public readonly displayName = 'Enable Skill';
  public readonly description =
    'Copy a curated skill from @framers/agentos-skills-registry into a local skills directory (e.g. ~/.codex/skills or ./skills). This has side effects and should be human-approved.';
  public readonly category = 'system';
  public readonly hasSideEffects = true;

  public readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    required: ['skill'],
    properties: {
      skill: { type: 'string', description: 'Skill name or id to enable' },
      targetDir: {
        type: 'string',
        description:
          'Directory to copy into (default: AGENTOS_SKILLS_DIR, CODEX_HOME/skills, or ~/.codex/skills)',
      },
      overwrite: {
        type: 'boolean',
        description: 'Overwrite if the destination already exists',
        default: false,
      },
      dryRun: {
        type: 'boolean',
        description: 'Return what would happen without copying',
        default: false,
      },
    },
    additionalProperties: false,
  };

  async execute(
    input: SkillsEnableInput,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<SkillsEnableOutput>> {
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

      const sourceDir = resolveSkillAbsoluteDir(entry);
      const targetDir = path.resolve(
        (input.targetDir && String(input.targetDir).trim()) || resolveDefaultEnableDir()
      );
      const destDir = path.join(targetDir, entry.name);

      const overwrite = input.overwrite === true;
      const dryRun = input.dryRun === true;

      if (dryRun) {
        return {
          success: true,
          output: {
            skill: entry.name,
            sourceDir,
            targetDir,
            destDir,
            copied: false,
          },
        };
      }

      await fs.mkdir(targetDir, { recursive: true });

      const exists = await fs
        .stat(destDir)
        .then(() => true)
        .catch(() => false);

      if (exists) {
        if (!overwrite) {
          return {
            success: false,
            error: `Destination already exists: ${destDir} (set overwrite=true to replace)`,
          };
        }
        await fs.rm(destDir, { recursive: true, force: true });
      }

      await fs.cp(sourceDir, destDir, { recursive: true, force: overwrite });

      return {
        success: true,
        output: {
          skill: entry.name,
          sourceDir,
          targetDir,
          destDir,
          copied: true,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || String(error),
      };
    }
  }
}
