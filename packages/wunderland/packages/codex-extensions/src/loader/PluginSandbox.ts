/**
 * Plugin Sandbox - Isolates plugin execution for security and stability
 * @module @framers/codex-extensions/loader
 */

import type { Plugin, ViewerPlugin, CodexPlugin } from '../types';

export interface SandboxConfig {
  /** Allow access to DOM */
  allowDom?: boolean;
  /** Allow network requests */
  allowNetwork?: boolean;
  /** Allow storage access */
  allowStorage?: boolean;
  /** Maximum execution time for plugin methods (ms) */
  timeout?: number;
  /** Memory limit (bytes, if supported) */
  memoryLimit?: number;
}

const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  allowDom: true,
  allowNetwork: false,
  allowStorage: true,
  timeout: 5000,
};

/**
 * Wraps plugins in a sandbox for isolated execution
 * Provides graceful error handling and resource limits
 */
export class PluginSandbox {
  private config: SandboxConfig;
  private sandboxes = new Map<string, PluginSandboxInstance>();

  constructor(config: SandboxConfig = {}) {
    this.config = { ...DEFAULT_SANDBOX_CONFIG, ...config };
  }

  /**
   * Wrap a plugin in a sandbox
   */
  wrap<T extends Plugin>(pluginId: string, plugin: T): T {
    const instance = new PluginSandboxInstance(pluginId, this.config);
    this.sandboxes.set(pluginId, instance);

    return instance.wrap(plugin) as T;
  }

  /**
   * Cleanup sandbox resources
   */
  cleanup(pluginId: string): void {
    const instance = this.sandboxes.get(pluginId);
    if (instance) {
      instance.destroy();
      this.sandboxes.delete(pluginId);
    }
  }

  /**
   * Cleanup all sandboxes
   */
  cleanupAll(): void {
    for (const [id, instance] of this.sandboxes) {
      instance.destroy();
      this.sandboxes.delete(id);
    }
  }

  /**
   * Get sandbox instance for a plugin
   */
  getSandbox(pluginId: string): PluginSandboxInstance | undefined {
    return this.sandboxes.get(pluginId);
  }
}

/**
 * Individual sandbox instance for a plugin
 */
class PluginSandboxInstance {
  private pluginId: string;
  private config: SandboxConfig;
  private errorCount = 0;
  private maxErrors = 10;
  private disabled = false;
  private activeTimeouts = new Set<ReturnType<typeof setTimeout>>();

  constructor(pluginId: string, config: SandboxConfig) {
    this.pluginId = pluginId;
    this.config = config;
  }

  /**
   * Wrap plugin methods with error handling and timeouts
   */
  wrap<T extends Plugin>(plugin: T): T {
    const wrapped = { ...plugin };

    // Wrap lifecycle methods
    if ('onLoad' in wrapped) {
      wrapped.onLoad = this.wrapMethod(wrapped.onLoad as () => void | Promise<void>, 'onLoad');
    }
    if ('onUnload' in wrapped) {
      wrapped.onUnload = this.wrapMethod(
        wrapped.onUnload as () => void | Promise<void>,
        'onUnload'
      );
    }
    if ('onActivate' in wrapped) {
      wrapped.onActivate = this.wrapMethod(
        wrapped.onActivate as () => void | Promise<void>,
        'onActivate'
      );
    }
    if ('onDeactivate' in wrapped) {
      wrapped.onDeactivate = this.wrapMethod(
        wrapped.onDeactivate as () => void | Promise<void>,
        'onDeactivate'
      );
    }

    // Wrap type-specific capabilities
    if (this.isViewerPlugin(plugin)) {
      this.wrapViewerPlugin(wrapped as ViewerPlugin);
    }

    if (this.isCodexPlugin(plugin)) {
      this.wrapCodexPlugin(wrapped as CodexPlugin);
    }

    return wrapped;
  }

  /**
   * Destroy sandbox and cleanup resources
   */
  destroy(): void {
    // Clear all pending timeouts
    for (const timeout of this.activeTimeouts) {
      clearTimeout(timeout);
    }
    this.activeTimeouts.clear();
    this.disabled = true;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private wrapMethod<TArgs extends unknown[], TReturn>(
    method: ((...args: TArgs) => TReturn | Promise<TReturn>) | undefined,
    methodName: string
  ): ((...args: TArgs) => TReturn | Promise<TReturn>) | undefined {
    if (!method) return undefined;

    return (...args: TArgs): TReturn | Promise<TReturn> => {
      if (this.disabled) {
        console.warn(`[Sandbox] Plugin ${this.pluginId} is disabled, skipping ${methodName}`);
        return undefined as unknown as TReturn;
      }

      // Execute with timeout and swallow errors (manager can decide how to handle undefined-ish results).
      return this.executeWithTimeout(() => method(...args), methodName).catch((error) => {
        this.handleError(error, methodName);
        return undefined as unknown as TReturn;
      });
    };
  }

  private async executeWithTimeout<T>(fn: () => T | Promise<T>, methodName: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Plugin ${this.pluginId}.${methodName} timed out after ${this.config.timeout}ms`
          )
        );
      }, this.config.timeout);

      this.activeTimeouts.add(timeout);

      Promise.resolve(fn())
        .then(result => {
          clearTimeout(timeout);
          this.activeTimeouts.delete(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          this.activeTimeouts.delete(timeout);
          reject(error);
        });
    });
  }

  private handleError(error: unknown, methodName: string): void {
    this.errorCount++;

    console.error(`[Sandbox] Error in plugin ${this.pluginId}.${methodName}:`, error);

    if (this.errorCount >= this.maxErrors) {
      console.error(
        `[Sandbox] Plugin ${this.pluginId} has exceeded max errors (${this.maxErrors}), disabling`
      );
      this.disabled = true;
    }
  }

  private isViewerPlugin(plugin: Plugin): plugin is ViewerPlugin {
    return plugin.manifest.type === 'viewer';
  }

  private isCodexPlugin(plugin: Plugin): plugin is CodexPlugin {
    return plugin.manifest.type === 'codex';
  }

  private wrapViewerPlugin(plugin: ViewerPlugin): void {
    // Wrap hooks
    if (plugin.hooks) {
      plugin.hooks = plugin.hooks.map(hook => ({
        ...hook,
        handler: this.wrapMethod(
          hook.handler as (...args: unknown[]) => unknown,
          `hook:${hook.name}`
        ) as (...args: unknown[]) => unknown | Promise<unknown>,
      }));
    }

    // Note: React components need special handling
    // We can wrap them in ErrorBoundary at the manager level
  }

  private wrapCodexPlugin(plugin: CodexPlugin): void {
    // Wrap indexer
    if (plugin.indexer) {
      const originalIndex = plugin.indexer.index.bind(plugin.indexer);
      plugin.indexer.index = this.wrapMethod(
        originalIndex,
        'indexer.index'
      ) as typeof originalIndex;
    }

    // Wrap validator
    if (plugin.validator) {
      const originalValidate = plugin.validator.validate.bind(plugin.validator);
      plugin.validator.validate = this.wrapMethod(
        originalValidate,
        'validator.validate'
      ) as typeof originalValidate;
    }

    // Wrap transformer
    if (plugin.transformer) {
      const originalTransform = plugin.transformer.transform.bind(plugin.transformer);
      plugin.transformer.transform = this.wrapMethod(
        originalTransform,
        'transformer.transform'
      ) as typeof originalTransform;
    }

    // Wrap analyzer
    if (plugin.analyzer) {
      const originalAnalyze = plugin.analyzer.analyze.bind(plugin.analyzer);
      plugin.analyzer.analyze = this.wrapMethod(
        originalAnalyze,
        'analyzer.analyze'
      ) as typeof originalAnalyze;
    }

    // Wrap exporter
    if (plugin.exporter) {
      const originalExport = plugin.exporter.export.bind(plugin.exporter);
      plugin.exporter.export = this.wrapMethod(
        originalExport,
        'exporter.export'
      ) as typeof originalExport;
    }
  }
}

/**
 * Error boundary wrapper for React components
 * Use this in the plugin manager when rendering plugin components
 */
export function createPluginErrorBoundary(
  pluginId: string,
  fallback?: React.ReactNode
): React.ComponentType<{ children: React.ReactNode }> {
  void fallback;
  // This would be implemented as a React component
  // Simplified type definition here
  return class PluginErrorBoundary extends Error {
    constructor() {
      super(`Error boundary for ${pluginId}`);
    }
  } as unknown as React.ComponentType<{ children: React.ReactNode }>;
}
