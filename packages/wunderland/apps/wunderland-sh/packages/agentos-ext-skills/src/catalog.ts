import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';

import type { SkillRegistryEntry as SkillCatalogEntry, SkillsRegistry, SkillInstallSpec } from '@framers/agentos-skills-registry';

const require = createRequire(import.meta.url);

export type SkillRef = string;

export type SkillsCatalogSource = 'curated' | 'community';

export type SkillInstallCommand = {
  id: string;
  kind: SkillInstallSpec['kind'];
  label: string;
  bins: string[];
  command?: string;
};

export type SkillEligibilityReport = {
  platform: string;
  eligible: boolean;
  missing: {
    os: string[];
    bins: string[];
    anyBins: string[];
    env: string[];
  };
};

export type SkillCatalogItem = SkillCatalogEntry & {
  absolutePath: string;
  eligibility: SkillEligibilityReport;
  installCommands: SkillInstallCommand[];
};

export function resolveSkillsPackageDir(): string {
  const pkgJsonPath = require.resolve('@framers/agentos-skills-registry/package.json');
  return path.dirname(pkgJsonPath);
}

export function resolveSkillsRegistryPath(): string {
  return require.resolve('@framers/agentos-skills-registry/registry.json');
}

export async function loadSkillsRegistry(): Promise<SkillsRegistry> {
  const registryPath = resolveSkillsRegistryPath();
  const raw = await fs.readFile(registryPath, 'utf-8');
  return JSON.parse(raw) as SkillsRegistry;
}

export function resolveDefaultEnableDir(): string {
  const agentosDir = (process.env['AGENTOS_SKILLS_DIR'] || '').trim();
  if (agentosDir) return agentosDir;

  const codexHome = (process.env['CODEX_HOME'] || '').trim();
  if (codexHome) return path.join(codexHome, 'skills');

  return path.join(os.homedir(), '.codex', 'skills');
}

export function findSkillEntry(
  registry: SkillsRegistry,
  ref: SkillRef
): SkillCatalogEntry | undefined {
  const needle = ref.trim();
  if (!needle) return undefined;

  const all = [...(registry.skills?.curated ?? []), ...(registry.skills?.community ?? [])];
  return all.find((e) => e.id === needle || e.name === needle);
}

export function computeEligibility(
  entry: SkillCatalogEntry,
  platform: string
): SkillEligibilityReport {
  const meta = entry.metadata;

  const missingOs: string[] = [];
  const allowedOs = meta?.os ?? [];
  if (allowedOs.length > 0 && !allowedOs.includes(platform)) {
    missingOs.push(...allowedOs);
  }

  const requires = meta?.requires;
  const requiredBins = requires?.bins ?? [];
  const requiredAnyBins = requires?.anyBins ?? [];
  const requiredEnv = requires?.env ?? [];

  const missingBins = requiredBins.filter((bin) => !hasBinary(bin));
  const missingAnyBins =
    requiredAnyBins.length > 0 && !requiredAnyBins.some((bin) => hasBinary(bin))
      ? requiredAnyBins.slice()
      : [];

  const missingEnv = requiredEnv.filter((envName) => !process.env[envName]);

  const eligible =
    missingOs.length === 0 &&
    missingBins.length === 0 &&
    missingAnyBins.length === 0 &&
    missingEnv.length === 0;

  return {
    platform,
    eligible,
    missing: {
      os: missingOs,
      bins: missingBins,
      anyBins: missingAnyBins,
      env: missingEnv,
    },
  };
}

export function buildInstallCommands(
  entry: SkillCatalogEntry,
  platform: string
): SkillInstallCommand[] {
  const install = entry.metadata?.install ?? [];
  const filtered = install.filter((spec) => {
    const osList = spec.os ?? [];
    return osList.length === 0 || osList.includes(platform);
  });

  const commands: SkillInstallCommand[] = [];
  for (const [index, spec] of filtered.entries()) {
    const id = (spec.id ?? `${spec.kind}-${index}`).trim();
    const bins = spec.bins ?? [];
    const label = spec.label?.trim() ? spec.label.trim() : `Install (${spec.kind})`;
    commands.push({
      id,
      kind: spec.kind,
      label,
      bins,
      command: formatInstallCommand(spec),
    });
  }

  return commands;
}

export function resolveSkillAbsoluteDir(entry: SkillCatalogEntry): string {
  return path.join(resolveSkillsPackageDir(), entry.path);
}

export async function readSkillMarkdown(entry: SkillCatalogEntry): Promise<string> {
  const dir = resolveSkillAbsoluteDir(entry);
  const filePath = path.join(dir, 'SKILL.md');
  return fs.readFile(filePath, 'utf-8');
}

function hasBinary(bin: string): boolean {
  const pathEnv = process.env.PATH ?? '';
  const parts = pathEnv.split(path.delimiter).filter(Boolean);

  const candidates =
    process.platform === 'win32' ? [bin, `${bin}.exe`, `${bin}.cmd`, `${bin}.bat`] : [bin];

  for (const part of parts) {
    for (const candidateName of candidates) {
      const candidate = path.join(part, candidateName);
      try {
        fsSync.accessSync(candidate, fsSync.constants.X_OK);
        return true;
      } catch {
        // keep scanning
      }
    }
  }
  return false;
}

function formatInstallCommand(spec: SkillInstallSpec): string | undefined {
  switch (spec.kind) {
    case 'brew':
      return spec.formula ? `brew install ${spec.formula}` : undefined;
    case 'apt':
      return spec.package
        ? `sudo apt-get update && sudo apt-get install -y ${spec.package}`
        : undefined;
    case 'node':
      return spec.package ? `npm install -g ${spec.package}` : undefined;
    case 'go':
      return spec.module ? `go install ${spec.module}` : undefined;
    case 'uv':
      return spec.package ? `uv tool install ${spec.package}` : undefined;
    case 'download':
      return spec.url ? `curl -L ${spec.url}` : undefined;
    default:
      return undefined;
  }
}
