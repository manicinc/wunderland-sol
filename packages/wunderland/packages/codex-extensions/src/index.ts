/**
 * @framers/codex-extensions
 * Plugin and theme registry for Frame Codex and Codex Viewer
 * @module @framers/codex-extensions
 */

// =============================================================================
// Types
// =============================================================================
export * from './types';

// =============================================================================
// Plugin System
// =============================================================================
export { PluginLoader } from './loader/PluginLoader';
export type { LoaderConfig } from './loader/PluginLoader';

export { CompatibilityChecker } from './loader/CompatibilityChecker';
export type { CompatibilityContext, BrowserInfo } from './loader/CompatibilityChecker';

export { PluginSandbox, createPluginErrorBoundary } from './loader/PluginSandbox';
export type { SandboxConfig } from './loader/PluginSandbox';

// =============================================================================
// Plugin Manager
// =============================================================================
export { PluginManager, pluginManager } from './manager/PluginManager';

// =============================================================================
// Security
// =============================================================================
export { SecurityScanner, generateChecksum } from './security/SecurityScanner';
export type {
  SecurityScanResult,
  SecurityScanDetails,
  PermissionReview,
  CodePatternMatch,
} from './security/SecurityScanner';

// =============================================================================
// Themes
// =============================================================================
export {
  ThemeBuilder,
  DEFAULT_THEMES,
  applyTheme,
  removeTheme,
} from './themes/ThemeBuilder';

// =============================================================================
// Loader Index (for lazy imports)
// =============================================================================
export { PluginLoader as default } from './loader/PluginLoader';

