/**
 * Plugin Manager - Central hub for managing plugins and themes
 * Handles enable/disable, conflicts, persistence, and UI state
 * @module @framers/codex-extensions/manager
 */

import type {
  Plugin,
  PluginManifest,
  PluginState,
  PluginManagerConfig,
  PluginLoadResult,
  PluginEvent,
  PluginEventHandler,
  PluginEventType,
  Theme,
  ThemeManifest,
  PluginSearchOptions,
  PluginSearchResult,
  ViewerPlugin,
  CodexPlugin,
} from '../types';
import { PluginLoader } from '../loader/PluginLoader';
import { CompatibilityChecker } from '../loader/CompatibilityChecker';

const DEFAULT_CONFIG: PluginManagerConfig = {
  registryUrl: 'https://registry.frame.dev',
  autoUpdate: false,
  lazyLoad: true,
  maxConcurrentLoads: 3,
  timeout: 30000,
};

const STORAGE_KEY = 'codex-extensions-state';

/**
 * Manages the lifecycle of plugins and themes
 */
export class PluginManager {
  private config: PluginManagerConfig;
  private loader: PluginLoader;
  private compatibilityChecker: CompatibilityChecker;
  
  // State
  private pluginStates = new Map<string, PluginState>();
  private themes = new Map<string, Theme>();
  private activeTheme: string | null = null;
  
  // Event handlers
  private eventHandlers = new Map<PluginEventType, Set<PluginEventHandler>>();
  
  // Registry cache
  private registryCache: RegistryData | null = null;
  private lastRegistrySync = 0;

  constructor(config: Partial<PluginManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loader = new PluginLoader({
      baseUrl: this.config.registryUrl,
      lazyLoad: this.config.lazyLoad,
      maxConcurrent: this.config.maxConcurrentLoads,
      timeout: this.config.timeout,
    });
    this.compatibilityChecker = new CompatibilityChecker();
    
    // Restore state from storage
    this.restoreState();
  }

  // ==========================================================================
  // Plugin Lifecycle
  // ==========================================================================

  /**
   * Install a plugin from manifest
   */
  async install(manifest: PluginManifest): Promise<PluginLoadResult> {
    const { id } = manifest;

    // Check for conflicts with enabled plugins
    const conflicts = this.checkConflicts(manifest);
    if (conflicts.length > 0) {
      return {
        success: false,
        error: `Plugin conflicts with: ${conflicts.map(c => c.name).join(', ')}`,
        warnings: conflicts.map(c => `Conflicts with ${c.name}: ${c.reason}`),
      };
    }

    // Set initial state
    this.pluginStates.set(id, {
      id,
      status: 'loading',
      enabled: false,
    });

    // Load the plugin
    const result = await this.loader.load(manifest);

    if (result.success) {
      this.pluginStates.set(id, {
        id,
        status: 'inactive',
        enabled: false,
        loadedAt: new Date(),
      });

      this.emit({
        type: 'plugin:load',
        pluginId: id,
        timestamp: new Date(),
      });
    } else {
      this.pluginStates.set(id, {
        id,
        status: 'error',
        enabled: false,
        error: result.error,
      });

      this.emit({
        type: 'plugin:error',
        pluginId: id,
        timestamp: new Date(),
        data: { error: result.error },
      });
    }

    this.persistState();
    return result;
  }

  /**
   * Uninstall a plugin
   */
  async uninstall(id: string): Promise<boolean> {
    const state = this.pluginStates.get(id);
    if (!state) return false;

    // Disable first if enabled
    if (state.enabled) {
      await this.disable(id);
    }

    // Unload from loader
    await this.loader.unload(id);

    // Remove state
    this.pluginStates.delete(id);

    this.emit({
      type: 'plugin:unload',
      pluginId: id,
      timestamp: new Date(),
    });

    this.persistState();
    return true;
  }

  /**
   * Enable a plugin
   */
  async enable(id: string): Promise<boolean> {
    const plugin = this.loader.getPlugin(id);
    const state = this.pluginStates.get(id);

    if (!plugin || !state) {
      console.error(`[PluginManager] Plugin ${id} not found`);
      return false;
    }

    if (state.enabled) {
      return true; // Already enabled
    }

    // Check for conflicts with currently enabled plugins
    const conflicts = this.checkConflicts(plugin.manifest);
    const enabledConflicts = conflicts.filter(c => 
      this.pluginStates.get(c.id)?.enabled
    );

    if (enabledConflicts.length > 0) {
      console.error(
        `[PluginManager] Cannot enable ${id}: conflicts with enabled plugins:`,
        enabledConflicts.map(c => c.name)
      );
      
      this.pluginStates.set(id, {
        ...state,
        status: 'conflict',
        error: `Conflicts with: ${enabledConflicts.map(c => c.name).join(', ')}`,
      });
      
      return false;
    }

    try {
      // Call activation hook
      if ('onActivate' in plugin && typeof plugin.onActivate === 'function') {
        await plugin.onActivate();
      }

      this.pluginStates.set(id, {
        ...state,
        status: 'active',
        enabled: true,
      });

      this.emit({
        type: 'plugin:activate',
        pluginId: id,
        timestamp: new Date(),
      });

      this.persistState();
      return true;
    } catch (error) {
      console.error(`[PluginManager] Error enabling ${id}:`, error);
      
      this.pluginStates.set(id, {
        ...state,
        status: 'error',
        enabled: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return false;
    }
  }

  /**
   * Disable a plugin
   */
  async disable(id: string): Promise<boolean> {
    const plugin = this.loader.getPlugin(id);
    const state = this.pluginStates.get(id);

    if (!plugin || !state) return false;
    if (!state.enabled) return true; // Already disabled

    try {
      // Call deactivation hook
      if ('onDeactivate' in plugin && typeof plugin.onDeactivate === 'function') {
        await plugin.onDeactivate();
      }

      this.pluginStates.set(id, {
        ...state,
        status: 'inactive',
        enabled: false,
      });

      this.emit({
        type: 'plugin:deactivate',
        pluginId: id,
        timestamp: new Date(),
      });

      this.persistState();
      return true;
    } catch (error) {
      console.error(`[PluginManager] Error disabling ${id}:`, error);
      return false;
    }
  }

  /**
   * Toggle plugin enabled state
   */
  async toggle(id: string): Promise<boolean> {
    const state = this.pluginStates.get(id);
    if (!state) return false;

    return state.enabled ? this.disable(id) : this.enable(id);
  }

  // ==========================================================================
  // Plugin Query
  // ==========================================================================

  /**
   * Get plugin state
   */
  getState(id: string): PluginState | undefined {
    return this.pluginStates.get(id);
  }

  /**
   * Get all plugin states
   */
  getAllStates(): PluginState[] {
    return Array.from(this.pluginStates.values());
  }

  /**
   * Get enabled plugins
   */
  getEnabled(): Plugin[] {
    return this.loader
      .getAllLoaded()
      .filter(p => this.pluginStates.get(p.manifest.id)?.enabled);
  }

  /**
   * Get enabled viewer plugins
   */
  getEnabledViewerPlugins(): ViewerPlugin[] {
    return this.getEnabled().filter(
      (p): p is ViewerPlugin => p.manifest.type === 'viewer'
    );
  }

  /**
   * Get enabled codex plugins
   */
  getEnabledCodexPlugins(): CodexPlugin[] {
    return this.getEnabled().filter(
      (p): p is CodexPlugin => p.manifest.type === 'codex'
    );
  }

  /**
   * Get plugin by ID
   */
  getPlugin(id: string): Plugin | undefined {
    return this.loader.getPlugin(id);
  }

  /**
   * Check if plugin is enabled
   */
  isEnabled(id: string): boolean {
    return this.pluginStates.get(id)?.enabled ?? false;
  }

  // ==========================================================================
  // Conflict Detection
  // ==========================================================================

  /**
   * Check for conflicts with a plugin
   */
  checkConflicts(manifest: PluginManifest): Array<{ id: string; name: string; reason: string }> {
    const conflicts: Array<{ id: string; name: string; reason: string }> = [];

    // Check explicit conflicts
    if (manifest.conflicts) {
      for (const conflict of manifest.conflicts) {
        const loadedPlugin = this.loader.getPlugin(conflict.id);
        if (loadedPlugin) {
          conflicts.push({
            id: conflict.id,
            name: loadedPlugin.manifest.name,
            reason: conflict.reason,
          });
        }
      }
    }

    // Check if other plugins conflict with this one
    for (const plugin of this.loader.getAllLoaded()) {
      const theirConflict = plugin.manifest.conflicts?.find(c => c.id === manifest.id);
      if (theirConflict) {
        conflicts.push({
          id: plugin.manifest.id,
          name: plugin.manifest.name,
          reason: theirConflict.reason,
        });
      }
    }

    return conflicts;
  }

  /**
   * Get all conflicting plugin pairs
   */
  getAllConflicts(): Array<{
    plugin1: PluginManifest;
    plugin2: PluginManifest;
    reason: string;
  }> {
    const conflicts: Array<{
      plugin1: PluginManifest;
      plugin2: PluginManifest;
      reason: string;
    }> = [];

    const plugins = this.loader.getAllLoaded();

    for (let i = 0; i < plugins.length; i++) {
      for (let j = i + 1; j < plugins.length; j++) {
        const conflict = this.compatibilityChecker.checkPluginConflict(
          plugins[i].manifest,
          plugins[j].manifest
        );

        if (conflict) {
          conflicts.push({
            plugin1: plugins[i].manifest,
            plugin2: plugins[j].manifest,
            reason: conflict.reason,
          });
        }
      }
    }

    return conflicts;
  }

  // ==========================================================================
  // Theme Management
  // ==========================================================================

  /**
   * Install a theme
   */
  installTheme(theme: Theme): void {
    this.themes.set(theme.manifest.id, theme);
    this.persistState();
  }

  /**
   * Uninstall a theme
   */
  uninstallTheme(id: string): boolean {
    if (this.activeTheme === id) {
      this.activeTheme = null;
    }
    const result = this.themes.delete(id);
    this.persistState();
    return result;
  }

  /**
   * Set active theme
   */
  setTheme(id: string | null): boolean {
    if (id && !this.themes.has(id)) {
      console.error(`[PluginManager] Theme ${id} not found`);
      return false;
    }

    this.activeTheme = id;
    
    this.emit({
      type: 'theme:change',
      themeId: id ?? undefined,
      timestamp: new Date(),
    });

    this.persistState();
    return true;
  }

  /**
   * Get active theme
   */
  getActiveTheme(): Theme | null {
    return this.activeTheme ? this.themes.get(this.activeTheme) ?? null : null;
  }

  /**
   * Get all installed themes
   */
  getAllThemes(): Theme[] {
    return Array.from(this.themes.values());
  }

  /**
   * Export theme to JSON
   */
  exportTheme(id: string): string | null {
    const theme = this.themes.get(id);
    if (!theme) return null;
    return JSON.stringify(theme, null, 2);
  }

  /**
   * Import theme from JSON
   */
  importTheme(json: string): Theme | null {
    try {
      const theme = JSON.parse(json) as Theme;
      
      // Validate theme structure
      if (!theme.manifest?.id || !theme.manifest?.name || !theme.colors) {
        throw new Error('Invalid theme structure');
      }

      this.installTheme(theme);
      return theme;
    } catch (error) {
      console.error('[PluginManager] Error importing theme:', error);
      return null;
    }
  }

  // ==========================================================================
  // Registry
  // ==========================================================================

  /**
   * Search registry for plugins
   */
  async searchRegistry(options: PluginSearchOptions): Promise<PluginSearchResult> {
    await this.syncRegistry();

    if (!this.registryCache) {
      return { plugins: [], total: 0, hasMore: false };
    }

    let plugins = [...this.registryCache.plugins];

    // Filter by query
    if (options.query) {
      const query = options.query.toLowerCase();
      plugins = plugins.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    // Filter by type
    if (options.type) {
      plugins = plugins.filter(p => p.type === options.type);
    }

    // Filter by category
    if (options.category) {
      plugins = plugins.filter(p => p.category === options.category);
    }

    // Filter by verified
    if (options.verified !== undefined) {
      plugins = plugins.filter(p => p.verified === options.verified);
    }

    // Sort
    const sortBy = options.sortBy || 'name';
    const sortOrder = options.sortOrder || 'asc';
    
    plugins.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'downloads':
          comparison = (a.downloads || 0) - (b.downloads || 0);
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Paginate
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    const total = plugins.length;
    plugins = plugins.slice(offset, offset + limit);

    return {
      plugins,
      total,
      hasMore: offset + plugins.length < total,
    };
  }

  /**
   * Sync with remote registry
   */
  async syncRegistry(): Promise<void> {
    const now = Date.now();
    const cacheAge = now - this.lastRegistrySync;
    const cacheMaxAge = 5 * 60 * 1000; // 5 minutes

    if (this.registryCache && cacheAge < cacheMaxAge) {
      return;
    }

    try {
      const response = await fetch(`${this.config.registryUrl}/registry.json`);
      if (!response.ok) {
        throw new Error(`Registry fetch failed: ${response.status}`);
      }

      const data = await response.json();
      this.registryCache = {
        plugins: [
          ...(data.plugins?.curated || []),
          ...(data.plugins?.community || []),
        ],
        themes: [
          ...(data.themes?.curated || []),
          ...(data.themes?.community || []),
        ],
      };
      this.lastRegistrySync = now;

      this.emit({
        type: 'registry:sync',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[PluginManager] Error syncing registry:', error);
    }
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  /**
   * Subscribe to plugin events
   */
  on(type: PluginEventType, handler: PluginEventHandler): () => void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    this.eventHandlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(type)?.delete(handler);
    };
  }

  /**
   * Emit an event
   */
  private emit(event: PluginEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[PluginManager] Event handler error:', error);
      }
    }
  }

  // ==========================================================================
  // Persistence
  // ==========================================================================

  /**
   * Persist state to storage
   */
  private persistState(): void {
    if (typeof localStorage === 'undefined') return;

    const state = {
      plugins: Object.fromEntries(
        Array.from(this.pluginStates.entries()).map(([id, state]) => [
          id,
          { enabled: state.enabled, config: state.config },
        ])
      ),
      activeTheme: this.activeTheme,
      themes: Object.fromEntries(this.themes),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('[PluginManager] Error persisting state:', error);
    }
  }

  /**
   * Restore state from storage
   */
  private restoreState(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const state = JSON.parse(stored);

      // Restore theme preference
      this.activeTheme = state.activeTheme || null;

      // Restore themes
      if (state.themes) {
        for (const [id, theme] of Object.entries(state.themes)) {
          this.themes.set(id, theme as Theme);
        }
      }

      // Note: Plugin enabled states will be applied when plugins are loaded
      // Store for later application
      if (state.plugins) {
        for (const [id, pluginState] of Object.entries(state.plugins)) {
          const ps = pluginState as { enabled: boolean; config?: Record<string, unknown> };
          this.pluginStates.set(id, {
            id,
            status: 'inactive',
            enabled: ps.enabled,
            config: ps.config,
          });
        }
      }
    } catch (error) {
      console.error('[PluginManager] Error restoring state:', error);
    }
  }

  /**
   * Clear all state
   */
  clearState(): void {
    this.pluginStates.clear();
    this.themes.clear();
    this.activeTheme = null;

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

interface RegistryData {
  plugins: PluginManifest[];
  themes: ThemeManifest[];
}

// Export singleton instance
export const pluginManager = new PluginManager();
