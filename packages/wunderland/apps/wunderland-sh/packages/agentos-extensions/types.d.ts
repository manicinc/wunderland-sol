/**
 * Type declarations for @framers/agentos-extensions registry catalog.
 * @module @framers/agentos-extensions
 */

export interface ExtensionAuthor {
  name: string;
  email?: string;
  url?: string;
}

export interface ExtensionEntry {
  id: string;
  name: string;
  package: string;
  version: string;
  category: string;
  path: string;
  description: string;
  author?: ExtensionAuthor;
  features: string[];
  tools: string[];
  keywords: string[];
  npm?: string;
  repository?: string;
  verified: boolean;
  verifiedAt?: string;
  verificationChecklistVersion?: string;
  downloads: number;
}

export interface TemplateEntry {
  id: string;
  name: string;
  package: string;
  version: string;
  path: string;
  description: string;
  repository?: string;
}

export interface RegistryStats {
  totalExtensions: number;
  curatedCount: number;
  communityCount: number;
  templateCount: number;
  totalDownloads: number;
}

export interface ExtensionRegistry {
  version: string;
  updated: string;
  categories: {
    templates: string[];
    curated: string[];
    community: string[];
  };
  extensions: {
    curated: ExtensionEntry[];
    community: ExtensionEntry[];
    templates: TemplateEntry[];
  };
  stats: RegistryStats;
}

declare const registry: ExtensionRegistry;
export default registry;
