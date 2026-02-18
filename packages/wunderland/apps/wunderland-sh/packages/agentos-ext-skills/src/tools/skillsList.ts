import type {
  ITool,
  JSONSchemaObject,
  ToolExecutionContext,
  ToolExecutionResult,
} from '@framers/agentos';
import type { SkillRegistryEntry as SkillCatalogEntry, SkillsRegistry } from '@framers/agentos-skills-registry';

import {
  buildInstallCommands,
  computeEligibility,
  loadSkillsRegistry,
  resolveSkillAbsoluteDir,
  type SkillCatalogItem,
} from '../catalog.js';

type SkillsListInput = {
  query?: string;
  verifiedOnly?: boolean;
  includeCommunity?: boolean;
  platform?: string;
  limit?: number;
};

type SkillsListOutput = {
  source: 'agentos-skills';
  registryVersion: string;
  updated: string;
  skills: SkillCatalogItem[];
};

function normalizeQuery(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

function matchesQuery(entry: SkillCatalogEntry, query: string): boolean {
  if (!query) return true;
  const haystack = [entry.id, entry.name, entry.description, ...(entry.keywords ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function flattenSkills(registry: SkillsRegistry, includeCommunity: boolean): SkillCatalogEntry[] {
  const curated = registry.skills?.curated ?? [];
  const community = includeCommunity ? (registry.skills?.community ?? []) : [];
  return [...curated, ...community];
}

export class SkillsListTool implements ITool<SkillsListInput, SkillsListOutput> {
  public readonly id = 'agentos-skills-list-v1';
  public readonly name = 'skills_list';
  public readonly displayName = 'List Skills';
  public readonly description =
    'List curated skills from the installed @framers/agentos-skills-registry catalog. Includes basic eligibility checks (OS/bins/env) and suggested install commands.';
  public readonly category = 'system';
  public readonly hasSideEffects = false;

  public readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search by name/keywords/description' },
      verifiedOnly: { type: 'boolean', description: 'Only include verified skills', default: true },
      includeCommunity: {
        type: 'boolean',
        description: 'Include community skills (if present)',
        default: false,
      },
      platform: {
        type: 'string',
        description: 'Platform for OS gating (default: process.platform)',
      },
      limit: { type: 'number', description: 'Max results', default: 50, minimum: 1, maximum: 500 },
    },
    additionalProperties: false,
  };

  async execute(
    input: SkillsListInput,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<SkillsListOutput>> {
    try {
      const registry = await loadSkillsRegistry();
      const query = normalizeQuery(input.query);
      const platform = (input.platform && String(input.platform).trim()) || process.platform;
      const verifiedOnly = input.verifiedOnly !== false;
      const includeCommunity = input.includeCommunity === true;
      const limit = typeof input.limit === 'number' ? Math.max(1, Math.min(500, input.limit)) : 50;

      const skills = flattenSkills(registry, includeCommunity)
        .filter((e) => (verifiedOnly ? e.verified === true : true))
        .filter((e) => matchesQuery(e, query))
        .slice(0, limit)
        .map((entry) => ({
          ...entry,
          absolutePath: resolveSkillAbsoluteDir(entry),
          eligibility: computeEligibility(entry, platform),
          installCommands: buildInstallCommands(entry, platform),
        }));

      return {
        success: true,
        output: {
          source: 'agentos-skills',
          registryVersion: registry.version,
          updated: registry.updated,
          skills,
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
