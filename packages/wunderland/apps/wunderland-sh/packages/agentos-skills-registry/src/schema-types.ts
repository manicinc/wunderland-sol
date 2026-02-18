/**
 * @fileoverview Type declarations for registry.json schema.
 *
 * These types describe the shape of the SKILL.md registry catalog
 * (registry.json). They differ from the SkillCatalogEntry in catalog.ts,
 * which is a higher-level, UI-friendly representation.
 *
 * @module @framers/agentos-skills-registry/schema-types
 */

export type SkillInstallKind = 'brew' | 'apt' | 'node' | 'go' | 'uv' | 'download';

export interface SkillInstallSpec {
  id?: string;
  kind: SkillInstallKind;
  label?: string;
  bins?: string[];
  os?: readonly string[];
  formula?: string;
  package?: string;
  module?: string;
  url?: string;
  archive?: string;
  extract?: boolean;
  stripComponents?: number;
  targetDir?: string;
}

export interface SkillRequirements {
  bins?: string[];
  anyBins?: string[];
  env?: string[];
  config?: string[];
}

export interface SkillMetadata {
  always?: boolean;
  skillKey?: string;
  primaryEnv?: string;
  emoji?: string;
  homepage?: string;
  os?: readonly string[];
  requires?: SkillRequirements;
  install?: SkillInstallSpec[];
}

/** Shape of a single skill entry in registry.json */
export interface SkillRegistryEntry {
  id: string;
  name: string;
  version: string;
  path: string;
  description: string;
  verified: boolean;
  source?: 'curated' | 'community';
  verifiedAt?: string;
  keywords?: string[];
  metadata?: SkillMetadata;
}

export interface SkillsRegistryStats {
  totalSkills: number;
  curatedCount: number;
  communityCount: number;
}

/** Shape of the full registry.json file */
export interface SkillsRegistry {
  version: string;
  updated: string;
  categories: {
    curated: string[];
    community: string[];
  };
  skills: {
    curated: SkillRegistryEntry[];
    community: SkillRegistryEntry[];
  };
  stats: SkillsRegistryStats;
}
