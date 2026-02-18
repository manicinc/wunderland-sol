/**
 * Type declarations for @framers/agentos-skills-registry catalog.
 * @module @framers/agentos-skills-registry
 */

export type SkillInstallKind = "brew" | "apt" | "node" | "go" | "uv" | "download";

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

export interface SkillCatalogEntry {
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

export interface SkillsRegistry {
  version: string;
  updated: string;
  categories: {
    curated: string[];
    community: string[];
  };
  skills: {
    curated: SkillCatalogEntry[];
    community: SkillCatalogEntry[];
  };
  stats: SkillsRegistryStats;
}

declare const registry: SkillsRegistry;
export default registry;

