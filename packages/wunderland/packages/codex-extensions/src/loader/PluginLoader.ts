/**
 * Plugin Loader - Lazy loading with game mod-inspired architecture
 * Supports dynamic imports, graceful fallback, and compatibility detection
 * @module @framers/codex-extensions/loader
 */

import type {
  Plugin,
  PluginManifest,
  PluginLoadResult,
  PluginCompatibilityResult,
  PluginPriority,
} from '../types';
import { CompatibilityChecker } from './CompatibilityChecker';
import { PluginSandbox } from './PluginSandbox';
import { SecurityScanner } from '../security/SecurityScanner';

export interface LoaderConfig {
  /** Base URL for fetching remote plugins */
  baseUrl?: string;
  /** Enable lazy loading by default */
  lazyLoad?: boolean;
  /** Maximum concurrent plugin loads */
  maxConcurrent?: number;
  /** Load timeout in milliseconds */
  timeout?: number;
  /** Enable plugin sandboxing */
  sandbox?: boolean;
  /** Enable security scanning */
  securityScan?: boolean;
  /** Custom fetch implementation */
  fetch?: typeof fetch;
}

interface LoadQueueItem {
  manifest: PluginManifest;
  priority: PluginPriority;
  resolve: (result: PluginLoadResult) => void;
  reject: (error: Error) => void;
}

const DEFAULT_CONFIG: Required<LoaderConfig> = {
  baseUrl: 'https://registry.frame.dev/plugins',
  lazyLoad: true,
  maxConcurrent: 3,
  timeout: 30000,
  sandbox: true,
  securityScan: true,
  fetch: globalThis.fetch,
};

const PRIORITY_ORDER: Record<PluginPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/**
 * Plugin Loader with lazy loading and graceful degradation
 *
 * Inspired by game mod loaders:
 * - Priority-based loading queue
 * - Dependency resolution
 * - Graceful fallback on errors
 * - Hot reload support
 * - Sandboxed execution
 */
export class PluginLoader {
  private config: Required<LoaderConfig>;
  private loadQueue: LoadQueueItem[] = [];
  private activeLoads = 0;
  private loadedPlugins = new Map<string, Plugin>();
  private loadPromises = new Map<string, Promise<PluginLoadResult>>();
  private compatibilityChecker: CompatibilityChecker;
  private securityScanner: SecurityScanner;
  private sandbox: PluginSandbox;

  constructor(config: LoaderConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.compatibilityChecker = new CompatibilityChecker();
    this.securityScanner = new SecurityScanner();
    this.sandbox = new PluginSandbox();
  }

  /**
   * Load a plugin by manifest
   * Supports lazy loading - returns immediately if lazy and not needed yet
   */
  async load(manifest: PluginManifest): Promise<PluginLoadResult> {
    const { id } = manifest;

    // Return cached if already loaded
    if (this.loadedPlugins.has(id)) {
      return {
        success: true,
        plugin: this.loadedPlugins.get(id)!,
        warnings: ['Plugin already loaded'],
      };
    }

    // Return existing promise if already loading
    if (this.loadPromises.has(id)) {
      return this.loadPromises.get(id)!;
    }

    // Check compatibility first
    const compatResult = await this.checkCompatibility(manifest);
    if (!compatResult.compatible) {
      const errors = compatResult.issues.filter(i => i.severity === 'error').map(i => i.message);

      return {
        success: false,
        error: `Compatibility check failed: ${errors.join('; ')}`,
        warnings: compatResult.issues.filter(i => i.severity === 'warning').map(i => i.message),
      };
    }

    // Create load promise
    const loadPromise = new Promise<PluginLoadResult>((resolve, reject) => {
      this.enqueue({
        manifest,
        priority: manifest.priority || 'normal',
        resolve,
        reject,
      });
    });

    this.loadPromises.set(id, loadPromise);
    this.processQueue();

    return loadPromise;
  }

  /**
   * Lazy load - register plugin but don't load until needed
   */
  registerLazy(manifest: PluginManifest): () => Promise<PluginLoadResult> {
    return () => this.load(manifest);
  }

  /**
   * Load multiple plugins in dependency order
   */
  async loadBatch(manifests: PluginManifest[]): Promise<Map<string, PluginLoadResult>> {
    const results = new Map<string, PluginLoadResult>();
    const sorted = this.sortByDependencies(manifests);

    for (const manifest of sorted) {
      try {
        const result = await this.load(manifest);
        results.set(manifest.id, result);
      } catch (error) {
        results.set(manifest.id, {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Unload a plugin gracefully
   */
  async unload(id: string): Promise<boolean> {
    const plugin = this.loadedPlugins.get(id);
    if (!plugin) return false;

    try {
      // Call plugin cleanup
      if ('onUnload' in plugin && typeof plugin.onUnload === 'function') {
        await plugin.onUnload();
      }

      // Remove from cache
      this.loadedPlugins.delete(id);
      this.loadPromises.delete(id);

      // Cleanup sandbox
      this.sandbox.cleanup(id);

      return true;
    } catch (error) {
      console.error(`[PluginLoader] Error unloading ${id}:`, error);
      return false;
    }
  }

  /**
   * Hot reload a plugin
   */
  async reload(manifest: PluginManifest): Promise<PluginLoadResult> {
    await this.unload(manifest.id);
    return this.load(manifest);
  }

  /**
   * Check if a plugin is loaded
   */
  isLoaded(id: string): boolean {
    return this.loadedPlugins.has(id);
  }

  /**
   * Get a loaded plugin
   */
  getPlugin(id: string): Plugin | undefined {
    return this.loadedPlugins.get(id);
  }

  /**
   * Get all loaded plugins
   */
  getAllLoaded(): Plugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Check plugin compatibility
   */
  async checkCompatibility(manifest: PluginManifest): Promise<PluginCompatibilityResult> {
    return this.compatibilityChecker.check(manifest, {
      loadedPlugins: this.loadedPlugins,
    });
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private enqueue(item: LoadQueueItem): void {
    // Insert based on priority
    const insertIndex = this.loadQueue.findIndex(
      existing => PRIORITY_ORDER[existing.priority] > PRIORITY_ORDER[item.priority]
    );

    if (insertIndex === -1) {
      this.loadQueue.push(item);
    } else {
      this.loadQueue.splice(insertIndex, 0, item);
    }
  }

  private async processQueue(): Promise<void> {
    while (this.loadQueue.length > 0 && this.activeLoads < this.config.maxConcurrent) {
      const item = this.loadQueue.shift();
      if (!item) break;

      this.activeLoads++;

      try {
        const result = await this.executeLoad(item.manifest);
        item.resolve(result);
      } catch (error) {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      } finally {
        this.activeLoads--;
        // Continue processing queue
        this.processQueue();
      }
    }
  }

  private async executeLoad(manifest: PluginManifest): Promise<PluginLoadResult> {
    const { id, main, browser } = manifest;
    const warnings: string[] = [];

    try {
      // Security scan if enabled
      if (this.config.securityScan) {
        const scanResult = await this.securityScanner.scan(manifest);
        if (!scanResult.safe) {
          return {
            success: false,
            error: `Security scan failed: ${scanResult.issues.join('; ')}`,
          };
        }
        warnings.push(...scanResult.warnings);
      }

      // Determine entry point
      const entryPoint = typeof window !== 'undefined' ? browser || main : main;
      if (!entryPoint) {
        return {
          success: false,
          error: 'No entry point specified in manifest',
        };
      }

      // Load the plugin module
      const plugin = await this.loadModule(manifest, entryPoint);

      // Validate plugin structure
      const validationResult = this.validatePlugin(plugin, manifest);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error,
        };
      }

      // Initialize plugin in sandbox if enabled
      const finalPlugin = this.config.sandbox ? this.sandbox.wrap(id, plugin) : plugin;

      // Call onLoad if exists
      if ('onLoad' in finalPlugin && typeof finalPlugin.onLoad === 'function') {
        await Promise.race([
          finalPlugin.onLoad(),
          this.timeout(this.config.timeout, 'Plugin onLoad timed out'),
        ]);
      }

      // Cache the loaded plugin
      this.loadedPlugins.set(id, finalPlugin);

      return {
        success: true,
        plugin: finalPlugin,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      // Graceful degradation - log and return error result
      console.error(`[PluginLoader] Failed to load ${id}:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during load',
        warnings,
      };
    }
  }

  private async loadModule(manifest: PluginManifest, entryPoint: string): Promise<Plugin> {
    // Handle different module locations
    const moduleUrl = entryPoint.startsWith('http')
      ? entryPoint
      : `${this.config.baseUrl}/${manifest.id}/${entryPoint}`;

    try {
      // Dynamic import with timeout
      const modulePromise = import(/* @vite-ignore */ moduleUrl);
      const module = await Promise.race([
        modulePromise,
        this.timeout(this.config.timeout, 'Module load timed out'),
      ]);

      // Handle different export formats
      const plugin = module.default || module.plugin || module;

      // Attach manifest
      plugin.manifest = manifest;

      return plugin;
    } catch (error) {
      // Try fallback strategies
      return this.loadWithFallback(manifest, entryPoint, error);
    }
  }

  private async loadWithFallback(
    manifest: PluginManifest,
    entryPoint: string,
    originalError: unknown
  ): Promise<Plugin> {
    // Strategy 1: Try alternate CDN
    const alternateCdns = [
      'https://unpkg.com/@framers/codex-extensions',
      'https://cdn.jsdelivr.net/npm/@framers/codex-extensions',
    ];

    for (const cdn of alternateCdns) {
      try {
        const module = await import(`${cdn}/${manifest.id}/${entryPoint}`);
        const plugin = module.default || module.plugin || module;
        plugin.manifest = manifest;
        console.warn(`[PluginLoader] Loaded ${manifest.id} from fallback CDN: ${cdn}`);
        return plugin;
      } catch {
        // Try next CDN
      }
    }

    // Strategy 2: Return stub plugin for graceful degradation
    console.warn(`[PluginLoader] Creating stub for ${manifest.id} - all fallbacks failed`);

    return this.createStubPlugin(manifest, originalError);
  }

  private createStubPlugin(manifest: PluginManifest, error: unknown): Plugin {
    // Create a minimal stub that won't break the system
    const stub: Plugin = {
      manifest,
      onLoad: () => {
        console.warn(`[PluginLoader] Stub plugin loaded: ${manifest.id}`);
        console.warn(`[PluginLoader] Original error:`, error);
      },
    } as Plugin;

    return stub;
  }

  private validatePlugin(
    plugin: unknown,
    manifest: PluginManifest
  ): { valid: boolean; error?: string } {
    if (!plugin || typeof plugin !== 'object') {
      return { valid: false, error: 'Plugin must be an object' };
    }

    // Type-specific validation
    if (manifest.type === 'viewer') {
      // Viewer plugins need at least one capability
      const viewerPlugin = plugin as { slots?: unknown; hooks?: unknown; component?: unknown };
      if (!viewerPlugin.slots && !viewerPlugin.hooks && !viewerPlugin.component) {
        return {
          valid: false,
          error: 'Viewer plugin must provide slots, hooks, or component',
        };
      }
    }

    if (manifest.type === 'codex') {
      // Codex plugins need at least one capability
      const codexPlugin = plugin as {
        indexer?: unknown;
        validator?: unknown;
        transformer?: unknown;
        analyzer?: unknown;
        exporter?: unknown;
      };
      if (
        !codexPlugin.indexer &&
        !codexPlugin.validator &&
        !codexPlugin.transformer &&
        !codexPlugin.analyzer &&
        !codexPlugin.exporter
      ) {
        return {
          valid: false,
          error: 'Codex plugin must provide at least one capability',
        };
      }
    }

    return { valid: true };
  }

  private sortByDependencies(manifests: PluginManifest[]): PluginManifest[] {
    const sorted: PluginManifest[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const manifestMap = new Map(manifests.map(m => [m.id, m]));

    const visit = (manifest: PluginManifest) => {
      if (visited.has(manifest.id)) return;
      if (visiting.has(manifest.id)) {
        console.warn(`[PluginLoader] Circular dependency detected: ${manifest.id}`);
        return;
      }

      visiting.add(manifest.id);

      // Visit dependencies first
      for (const dep of manifest.dependencies || []) {
        const depManifest = manifestMap.get(dep.id);
        if (depManifest) {
          visit(depManifest);
        } else if (!dep.optional) {
          console.warn(`[PluginLoader] Missing dependency: ${dep.id} for ${manifest.id}`);
        }
      }

      visiting.delete(manifest.id);
      visited.add(manifest.id);
      sorted.push(manifest);
    };

    for (const manifest of manifests) {
      visit(manifest);
    }

    return sorted;
  }

  private timeout(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }
}
