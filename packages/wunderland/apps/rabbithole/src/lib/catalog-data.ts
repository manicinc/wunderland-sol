/**
 * @fileoverview Catalog data for standalone builds.
 *
 * Single source of truth lives in:
 *   - packages/wunderland/presets/catalog-data.json
 *
 * Keep this file as a typed wrapper for UI + API route imports.
 */

// Copied from packages/wunderland/presets/catalog-data.json — keep in sync
import catalog from '../data/catalog-data.json';

// ============================================================================
// TYPES
// ============================================================================

export interface SkillCatalogEntry {
  name: string;
  displayName: string;
  description: string;
  category: string;
  tags: string[];
  requiredSecrets: string[];
  requiredTools: string[];
  skillPath: string;
  source?: 'curated' | 'community';
  namespace: 'wunderland';
}

export interface ExtensionInfo {
  packageName: string;
  name: string;
  category: 'channel' | 'tool' | 'integration' | 'provenance' | 'voice' | 'productivity';
  available: boolean;
  displayName: string;
  description: string;
  requiredSecrets: string[];
  defaultPriority: number;
}

export interface ChannelRegistryEntry extends ExtensionInfo {
  category: 'channel';
  platform: string;
  sdkPackage: string;
}

export interface ProviderRegistryEntry extends ExtensionInfo {
  providerId: string;
  defaultModel: string;
  smallModel: string;
  apiBaseUrl?: string;
}

// ============================================================================
// CATALOGS
// ============================================================================

export const SKILLS_CATALOG: SkillCatalogEntry[] = catalog.SKILLS_CATALOG as SkillCatalogEntry[];

export const CHANNEL_CATALOG: ChannelRegistryEntry[] =
  catalog.CHANNEL_CATALOG as ChannelRegistryEntry[];

export const PROVIDER_CATALOG: ProviderRegistryEntry[] =
  catalog.PROVIDER_CATALOG as ProviderRegistryEntry[];

export const TOOL_CATALOG: ExtensionInfo[] = catalog.TOOL_CATALOG as ExtensionInfo[];

// ============================================================================
// VOICE CATALOG (6 OpenAI + 8 ElevenLabs voices)
// ============================================================================

export interface VoiceCatalogEntry {
  id: string;
  provider: 'openai' | 'elevenlabs';
  voiceId: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  description: string;
  isDefault?: boolean;
}

export const VOICE_CATALOG: VoiceCatalogEntry[] = catalog.VOICE_CATALOG as VoiceCatalogEntry[];
