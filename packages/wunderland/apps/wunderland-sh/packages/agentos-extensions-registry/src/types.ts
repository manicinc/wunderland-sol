/**
 * @fileoverview Configuration types for the extensions registry bundle.
 * @module @framers/agentos-extensions-registry/types
 */

import type { ChannelPlatform } from '@framers/agentos';

export interface RegistryLogger {
  info?: (...args: any[]) => void;
  warn?: (...args: any[]) => void;
  error?: (...args: any[]) => void;
  debug?: (...args: any[]) => void;
}

/**
 * Options for building a curated extension manifest.
 */
export interface RegistryOptions {
  /**
   * Which messaging channels to enable.
   * - Array of platform names: selectively enable specific channels.
   * - `'all'`: enable all available channels (default).
   * - `'none'`: disable all channels.
   */
  channels?: ChannelPlatform[] | 'all' | 'none';

  /**
   * Which tool extensions to enable.
   * - Array of tool pack names (e.g., 'web-search', 'giphy').
   * - `'all'`: enable all available tools (default).
   * - `'none'`: disable all tools.
   */
  tools?: string[] | 'all' | 'none';

  /**
   * Which voice provider extensions to enable.
   * - Array of provider names (e.g., 'voice-twilio', 'voice-telnyx').
   * - `'all'`: enable all available voice providers (default).
   * - `'none'`: disable all voice providers.
   */
  voice?: string[] | 'all' | 'none';

  /**
   * Which productivity extensions to enable.
   * - Array of names (e.g., 'calendar-google', 'email-gmail').
   * - `'all'`: enable all available productivity extensions (default).
   * - `'none'`: disable all productivity extensions.
   */
  productivity?: string[] | 'all' | 'none';

  /**
   * Secrets map (API keys, tokens, credentials).
   * Keys match secret IDs from `extension-secrets.json` (e.g., 'telegram.botToken').
   * Falls back to environment variables if not provided here.
   */
  secrets?: Record<string, string>;

  /**
   * Optional logger passed to extension-pack factories. Defaults to `console`.
   */
  logger?: RegistryLogger;

  /**
   * Base priority for all extensions. Individual packs add their own
   * offset on top of this. Default: 0.
   */
  basePriority?: number;

  /**
   * Per-extension overrides. Keys are pack names or descriptor IDs.
   */
  overrides?: Record<string, ExtensionOverrideConfig>;
}

/**
 * Override configuration for a specific extension pack or descriptor.
 */
export interface ExtensionOverrideConfig {
  /** Force enable/disable. */
  enabled?: boolean;
  /** Override priority. */
  priority?: number;
  /** Additional options passed to the pack factory. */
  options?: Record<string, unknown>;
}

/**
 * Metadata about an extension available in the registry.
 */
export interface ExtensionInfo {
  /** Package name (e.g., '@framers/agentos-ext-telegram'). */
  packageName: string;
  /** Short name (e.g., 'telegram'). */
  name: string;
  /** Category (e.g., 'channel', 'tool', 'integration'). */
  category: 'channel' | 'tool' | 'integration' | 'provenance' | 'voice' | 'productivity';
  /** Whether the package's dependencies are installed and importable. */
  available: boolean;
  /** Human-readable display name. */
  displayName: string;
  /** Description. */
  description: string;
  /** Required secret IDs. */
  requiredSecrets: string[];
  /** Default priority. */
  defaultPriority: number;
}

/**
 * Registry entry for a channel extension.
 */
export interface ChannelRegistryEntry extends ExtensionInfo {
  category: 'channel';
  /** Platform identifier. */
  platform: ChannelPlatform;
  /** SDK package name (e.g., 'grammy', 'discord.js'). */
  sdkPackage: string;
}
