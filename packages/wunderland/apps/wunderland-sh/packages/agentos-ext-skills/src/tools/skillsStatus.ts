import * as path from 'node:path';
import * as fs from 'node:fs/promises';

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
  resolveDefaultEnableDir,
  resolveSkillAbsoluteDir,
  type SkillInstallCommand,
} from '../catalog.js';

type SkillsStatusInput = {
  query?: string;
  verifiedOnly?: boolean;
  includeCommunity?: boolean;
  platform?: string;
  enableDir?: string;
  eligibleOnly?: boolean;
  limit?: number;
  /** Optional config object used to evaluate `requires.config` paths. */
  config?: Record<string, unknown>;
};

type SkillStatusConfigCheck = {
  path: string;
  value: unknown;
  satisfied: boolean;
};

type SkillStatusEntry = {
  id: string;
  name: string;
  version: string;
  description: string;
  verified: boolean;
  verifiedAt?: string;
  keywords?: string[];
  category: 'curated' | 'community';
  absolutePath: string;
  enabled: boolean;
  enabledPath?: string;
  filePath: string;
  baseDir: string;
  skillKey: string;
  primaryEnv?: string;
  emoji?: string;
  homepage?: string;
  always: boolean;
  disabled: boolean;
  blockedByAllowlist: boolean;
  eligible: boolean;
  requirements: {
    bins: string[];
    anyBins: string[];
    env: string[];
    config: string[];
    os: string[];
  };
  missing: {
    bins: string[];
    anyBins: string[];
    env: string[];
    config: string[];
    os: string[];
  };
  configChecks: SkillStatusConfigCheck[];
  install: SkillInstallCommand[];
};

type SkillsStatusOutput = {
  source: 'agentos-skills';
  registryVersion: string;
  updated: string;
  enableDir: string;
  summary: {
    total: number;
    enabled: number;
    eligible: number;
  };
  skills: SkillStatusEntry[];
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

function flattenSkills(
  registry: SkillsRegistry,
  includeCommunity: boolean
): Array<{ entry: SkillCatalogEntry; category: 'curated' | 'community' }> {
  const curated = (registry.skills?.curated ?? []).map((entry) => ({
    entry,
    category: 'curated' as const,
  }));
  const community = includeCommunity
    ? (registry.skills?.community ?? []).map((entry) => ({ entry, category: 'community' as const }))
    : [];
  return [...curated, ...community];
}

function isTruthy(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function resolveConfigPath(config: Record<string, unknown> | undefined, pathStr: string): unknown {
  if (!config) return undefined;
  const parts = pathStr.split('.').filter(Boolean);
  let current: unknown = config;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function isConfigPathTruthy(config: Record<string, unknown> | undefined, pathStr: string): boolean {
  const value = resolveConfigPath(config, pathStr);
  return isTruthy(value);
}

async function isSkillEnabled(
  enableDir: string,
  skillName: string
): Promise<{ enabled: boolean; enabledPath: string }> {
  const enabledPath = path.join(enableDir, skillName, 'SKILL.md');
  const enabledDir = path.dirname(enabledPath);
  const ok = await fs
    .stat(enabledPath)
    .then((s) => s.isFile())
    .catch(() => false);
  return { enabled: ok, enabledPath: enabledDir };
}

function resolveSkillKey(entry: SkillCatalogEntry): string {
  return entry.metadata?.skillKey ?? entry.name;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function resolveRequirements(entry: SkillCatalogEntry): SkillStatusEntry['requirements'] {
  const meta = entry.metadata;
  return {
    bins: asStringList(meta?.requires?.bins),
    anyBins: asStringList(meta?.requires?.anyBins),
    env: asStringList(meta?.requires?.env),
    config: asStringList(meta?.requires?.config),
    os: asStringList(meta?.os),
  };
}

export class SkillsStatusTool implements ITool<SkillsStatusInput, SkillsStatusOutput> {
  public readonly id = 'agentos-skills-status-v1';
  public readonly name = 'skills_status';
  public readonly displayName = 'Skills Status';
  public readonly description =
    'Report which curated skills are enabled/eligible and what requirements are missing, similar to OpenClaw’s skills status.';
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
      enableDir: {
        type: 'string',
        description:
          'Directory where enabled skills live (default: AGENTOS_SKILLS_DIR, CODEX_HOME/skills, or ~/.codex/skills)',
      },
      eligibleOnly: {
        type: 'boolean',
        description: 'Only include eligible (ready) skills',
        default: false,
      },
      limit: {
        type: 'number',
        description: 'Max results',
        default: 200,
        minimum: 1,
        maximum: 2000,
      },
      config: {
        type: 'object',
        description: 'Optional config object for evaluating requires.config paths',
      },
    },
    additionalProperties: false,
  };

  async execute(
    input: SkillsStatusInput,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<SkillsStatusOutput>> {
    try {
      const registry = await loadSkillsRegistry();
      const query = normalizeQuery(input.query);
      const platform = (input.platform && String(input.platform).trim()) || process.platform;
      const verifiedOnly = input.verifiedOnly !== false;
      const includeCommunity = input.includeCommunity === true;
      const eligibleOnly = input.eligibleOnly === true;
      const limit =
        typeof input.limit === 'number' ? Math.max(1, Math.min(2000, input.limit)) : 200;
      const enableDir = path.resolve(
        (input.enableDir && String(input.enableDir).trim()) || resolveDefaultEnableDir()
      );
      const config = input.config;

      const entries = flattenSkills(registry, includeCommunity)
        .filter(({ entry }) => (verifiedOnly ? entry.verified === true : true))
        .filter(({ entry }) => matchesQuery(entry, query))
        .slice(0, limit);

      const skills: SkillStatusEntry[] = [];
      for (const { entry, category } of entries) {
        const baseDir = resolveSkillAbsoluteDir(entry);
        const filePath = path.join(baseDir, 'SKILL.md');
        const { enabled, enabledPath } = await isSkillEnabled(enableDir, entry.name);
        const requirements = resolveRequirements(entry);

        const configChecks: SkillStatusConfigCheck[] = config
          ? requirements.config.map((cfgPath) => ({
              path: cfgPath,
              value: resolveConfigPath(config, cfgPath),
              satisfied: isConfigPathTruthy(config, cfgPath),
            }))
          : [];
        const missingConfig = config
          ? configChecks.filter((c) => !c.satisfied).map((c) => c.path)
          : [];

        const eligibility = computeEligibility(entry, platform);
        const metaAlways = entry.metadata?.always === true;

        const missing = metaAlways
          ? { bins: [], anyBins: [], env: [], config: [], os: [] }
          : {
              bins: eligibility.missing.bins,
              anyBins: eligibility.missing.anyBins,
              env: eligibility.missing.env,
              config: missingConfig,
              os: eligibility.missing.os,
            };

        const eligible =
          metaAlways || (eligibility.eligible && (config ? missingConfig.length === 0 : true));

        if (eligibleOnly && !eligible) {
          continue;
        }

        skills.push({
          id: entry.id,
          name: entry.name,
          version: entry.version,
          description: entry.description,
          verified: entry.verified,
          verifiedAt: entry.verifiedAt,
          keywords: entry.keywords,
          category,
          absolutePath: baseDir,
          enabled,
          enabledPath: enabled ? enabledPath : undefined,
          filePath,
          baseDir,
          skillKey: resolveSkillKey(entry),
          primaryEnv: entry.metadata?.primaryEnv,
          emoji: entry.metadata?.emoji,
          homepage: entry.metadata?.homepage,
          always: metaAlways,
          disabled: false,
          blockedByAllowlist: false,
          eligible,
          requirements,
          missing,
          configChecks,
          install: buildInstallCommands(entry, platform),
        });
      }

      const summary = {
        total: skills.length,
        enabled: skills.filter((s) => s.enabled).length,
        eligible: skills.filter((s) => s.eligible).length,
      };

      return {
        success: true,
        output: {
          source: 'agentos-skills',
          registryVersion: registry.version,
          updated: registry.updated,
          enableDir,
          summary,
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
