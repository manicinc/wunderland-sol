/**
 * Loader module exports
 * @module @framers/codex-extensions/loader
 */

export { PluginLoader } from './PluginLoader';
export type { LoaderConfig } from './PluginLoader';

export { CompatibilityChecker } from './CompatibilityChecker';
export type { CompatibilityContext, BrowserInfo } from './CompatibilityChecker';

export { PluginSandbox, createPluginErrorBoundary } from './PluginSandbox';
export type { SandboxConfig } from './PluginSandbox';

