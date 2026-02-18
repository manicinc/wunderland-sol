/**
 * Compatibility Checker - Validates plugin compatibility
 * @module @framers/codex-extensions/loader
 */

import * as semver from 'semver';
import type {
  Plugin,
  PluginManifest,
  PluginCompatibilityResult,
  CompatibilityIssue,
  PluginConflict,
} from '../types';

export interface CompatibilityContext {
  loadedPlugins: Map<string, Plugin>;
  codexViewerVersion?: string;
  codexVersion?: string;
  nodeVersion?: string;
  browserInfo?: BrowserInfo;
}

export interface BrowserInfo {
  name: string;
  version: string;
  userAgent: string;
}

/**
 * Checks plugin compatibility against system requirements and other plugins
 */
export class CompatibilityChecker {
  private systemInfo: SystemInfo;

  constructor() {
    this.systemInfo = this.detectSystemInfo();
  }

  /**
   * Perform full compatibility check
   */
  async check(
    manifest: PluginManifest,
    context: CompatibilityContext
  ): Promise<PluginCompatibilityResult> {
    const issues: CompatibilityIssue[] = [];

    // Version checks
    issues.push(...this.checkVersionCompatibility(manifest, context));

    // Dependency checks
    issues.push(...this.checkDependencies(manifest, context));

    // Conflict checks
    issues.push(...this.checkConflicts(manifest, context));

    // Browser compatibility
    issues.push(...this.checkBrowserCompatibility(manifest));

    // Permission checks
    issues.push(...this.checkPermissions(manifest));

    const hasErrors = issues.some(i => i.severity === 'error');

    return {
      compatible: !hasErrors,
      issues,
    };
  }

  /**
   * Quick compatibility check (version only)
   */
  quickCheck(manifest: PluginManifest): boolean {
    const { compatibility } = manifest;
    if (!compatibility) return true;

    // Check codex-viewer version
    if (compatibility.codexViewer && this.systemInfo.codexViewerVersion) {
      const { current, minimum, maximum } = compatibility.codexViewer;
      const targetVersion = this.systemInfo.codexViewerVersion;

      if (minimum && !semver.gte(targetVersion, minimum)) return false;
      if (maximum && !semver.lte(targetVersion, maximum)) return false;
      if (current && !semver.satisfies(targetVersion, current)) return false;
    }

    return true;
  }

  /**
   * Check if two plugins conflict
   */
  checkPluginConflict(plugin1: PluginManifest, plugin2: PluginManifest): PluginConflict | null {
    // Check explicit conflicts
    const conflict1 = plugin1.conflicts?.find(c => c.id === plugin2.id);
    if (conflict1) return conflict1;

    const conflict2 = plugin2.conflicts?.find(c => c.id === plugin1.id);
    if (conflict2) return conflict2;

    // Check implicit conflicts (same UI slots, etc.)
    // This would require deeper analysis of plugin capabilities

    return null;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private checkVersionCompatibility(
    manifest: PluginManifest,
    context: CompatibilityContext
  ): CompatibilityIssue[] {
    const issues: CompatibilityIssue[] = [];
    const { compatibility } = manifest;

    if (!compatibility) return issues;

    // Check codex-viewer version
    if (compatibility.codexViewer) {
      const issue = this.checkVersionRequirement(
        'codex-viewer',
        compatibility.codexViewer,
        context.codexViewerVersion || this.systemInfo.codexViewerVersion
      );
      if (issue) issues.push(issue);
    }

    // Check codex version
    if (compatibility.codex) {
      const issue = this.checkVersionRequirement(
        'codex',
        compatibility.codex,
        context.codexVersion || this.systemInfo.codexVersion
      );
      if (issue) issues.push(issue);
    }

    // Check Node.js version (for codex plugins)
    if (compatibility.node && typeof process !== 'undefined') {
      const issue = this.checkVersionRequirement(
        'node',
        compatibility.node,
        context.nodeVersion || process.version.slice(1)
      );
      if (issue) issues.push(issue);
    }

    return issues;
  }

  private checkVersionRequirement(
    name: string,
    requirement: { current?: string; minimum?: string; maximum?: string },
    installedVersion?: string
  ): CompatibilityIssue | null {
    if (!installedVersion) {
      return {
        type: 'version',
        severity: 'warning',
        message: `Cannot verify ${name} version compatibility (version unknown)`,
        resolution: `Ensure ${name} is installed`,
      };
    }

    const { current, minimum, maximum } = requirement;

    if (minimum && !semver.gte(installedVersion, minimum)) {
      return {
        type: 'version',
        severity: 'error',
        message: `${name} version ${installedVersion} is below minimum ${minimum}`,
        resolution: `Upgrade ${name} to at least ${minimum}`,
      };
    }

    if (maximum && !semver.lte(installedVersion, maximum)) {
      return {
        type: 'version',
        severity: 'error',
        message: `${name} version ${installedVersion} exceeds maximum ${maximum}`,
        resolution: `Downgrade ${name} to at most ${maximum} or wait for plugin update`,
      };
    }

    if (current && !semver.satisfies(installedVersion, current)) {
      return {
        type: 'version',
        severity: 'warning',
        message: `${name} version ${installedVersion} may not be fully compatible (expected ${current})`,
        resolution: `Consider using ${name} version ${current}`,
      };
    }

    return null;
  }

  private checkDependencies(
    manifest: PluginManifest,
    context: CompatibilityContext
  ): CompatibilityIssue[] {
    const issues: CompatibilityIssue[] = [];
    const { dependencies } = manifest;

    if (!dependencies) return issues;

    for (const dep of dependencies) {
      const loadedPlugin = context.loadedPlugins.get(dep.id);

      if (!loadedPlugin) {
        if (dep.optional) {
          issues.push({
            type: 'dependency',
            severity: 'warning',
            message: `Optional dependency ${dep.id} not installed`,
            resolution: `Install ${dep.id} for full functionality`,
          });
        } else {
          issues.push({
            type: 'dependency',
            severity: 'error',
            message: `Required dependency ${dep.id} not installed`,
            resolution: `Install ${dep.id} before enabling this plugin`,
          });
        }
        continue;
      }

      // Check version compatibility
      const loadedVersion = loadedPlugin.manifest.version;
      if (!semver.satisfies(loadedVersion, dep.version)) {
        issues.push({
          type: 'dependency',
          severity: 'error',
          message: `Dependency ${dep.id} version ${loadedVersion} doesn't satisfy ${dep.version}`,
          resolution: `Update ${dep.id} to version ${dep.version}`,
        });
      }
    }

    return issues;
  }

  private checkConflicts(
    manifest: PluginManifest,
    context: CompatibilityContext
  ): CompatibilityIssue[] {
    const issues: CompatibilityIssue[] = [];
    const { conflicts } = manifest;

    if (!conflicts) return issues;

    for (const conflict of conflicts) {
      const loadedPlugin = context.loadedPlugins.get(conflict.id);

      if (loadedPlugin) {
        issues.push({
          type: 'conflict',
          severity: 'error',
          message: `Conflicts with ${conflict.id}: ${conflict.reason}`,
          resolution: this.getConflictResolution(conflict, loadedPlugin),
        });
      }
    }

    return issues;
  }

  private getConflictResolution(conflict: PluginConflict, loadedPlugin: Plugin): string {
    switch (conflict.resolution) {
      case 'disable':
        return `Disable ${loadedPlugin.manifest.name} to use this plugin`;
      case 'upgrade':
        return `Upgrade ${loadedPlugin.manifest.name} to resolve conflict`;
      case 'manual':
        return `Manual configuration required - see plugin documentation`;
      default:
        return `Disable one of the conflicting plugins`;
    }
  }

  private checkBrowserCompatibility(manifest: PluginManifest): CompatibilityIssue[] {
    const issues: CompatibilityIssue[] = [];
    const { compatibility } = manifest;

    if (!compatibility?.browser || typeof window === 'undefined') {
      return issues;
    }

    const browserInfo = this.systemInfo.browser;
    if (!browserInfo) return issues;

    for (const requirement of compatibility.browser) {
      const match = requirement.match(/^(\w+)\s*(>=|<=|>|<|=)?\s*(\d+)?$/);
      if (!match) continue;

      const [, browserName, operator = '>=', versionStr] = match;
      const requiredVersion = versionStr ? parseInt(versionStr, 10) : 0;

      if (browserInfo.name.toLowerCase() !== browserName.toLowerCase()) {
        continue; // Different browser, skip this requirement
      }

      const currentVersion = parseInt(browserInfo.version, 10);
      let compatible = true;

      switch (operator) {
        case '>=':
          compatible = currentVersion >= requiredVersion;
          break;
        case '<=':
          compatible = currentVersion <= requiredVersion;
          break;
        case '>':
          compatible = currentVersion > requiredVersion;
          break;
        case '<':
          compatible = currentVersion < requiredVersion;
          break;
        case '=':
          compatible = currentVersion === requiredVersion;
          break;
      }

      if (!compatible) {
        issues.push({
          type: 'browser',
          severity: 'warning',
          message: `Browser ${browserInfo.name} ${browserInfo.version} may not be fully compatible (requires ${requirement})`,
          resolution: `Update your browser or use a different browser`,
        });
      }
    }

    return issues;
  }

  private checkPermissions(manifest: PluginManifest): CompatibilityIssue[] {
    const issues: CompatibilityIssue[] = [];
    const { permissions } = manifest;

    if (!permissions) return issues;

    for (const permission of permissions) {
      if (permission.required && !this.isPermissionAvailable(permission.name)) {
        issues.push({
          type: 'permission',
          severity: 'error',
          message: `Required permission "${permission.name}" not available: ${permission.description}`,
          resolution: 'Grant the required permission or use a different plugin',
        });
      }
    }

    return issues;
  }

  private isPermissionAvailable(permissionName: string): boolean {
    // Check common browser permissions
    if (typeof navigator === 'undefined') return true;

    switch (permissionName) {
      case 'clipboard':
        return 'clipboard' in navigator;
      case 'storage':
        return typeof localStorage !== 'undefined';
      case 'indexeddb':
        return typeof indexedDB !== 'undefined';
      case 'notifications':
        return 'Notification' in window;
      case 'geolocation':
        return 'geolocation' in navigator;
      default:
        return true; // Unknown permissions pass by default
    }
  }

  private detectSystemInfo(): SystemInfo {
    const info: SystemInfo = {};

    // Detect browser
    if (typeof navigator !== 'undefined') {
      info.browser = this.detectBrowser();
    }

    // Try to detect versions from global objects
    if (typeof window !== 'undefined') {
      // @ts-expect-error - Global version info
      info.codexViewerVersion = window.__CODEX_VIEWER_VERSION__ || '1.0.0';
      // @ts-expect-error - Global version info
      info.codexVersion = window.__CODEX_VERSION__ || '1.0.0';
    }

    return info;
  }

  private detectBrowser(): BrowserInfo | undefined {
    if (typeof navigator === 'undefined') return undefined;

    const ua = navigator.userAgent;
    let name = 'unknown';
    let version = '0';

    if (ua.includes('Firefox/')) {
      name = 'firefox';
      version = ua.match(/Firefox\/(\d+)/)?.[1] || '0';
    } else if (ua.includes('Chrome/')) {
      name = 'chrome';
      version = ua.match(/Chrome\/(\d+)/)?.[1] || '0';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      name = 'safari';
      version = ua.match(/Version\/(\d+)/)?.[1] || '0';
    } else if (ua.includes('Edge/') || ua.includes('Edg/')) {
      name = 'edge';
      version = ua.match(/Edg\/(\d+)/)?.[1] || '0';
    }

    return { name, version, userAgent: ua };
  }
}

interface SystemInfo {
  codexViewerVersion?: string;
  codexVersion?: string;
  browser?: BrowserInfo;
}
