/**
 * Public Access Mode Configuration
 * @module lib/config/publicAccess
 *
 * @description
 * Controls public access mode for Quarry Codex deployments.
 * When enabled, plugin installation/removal is locked to prevent
 * modifications in public or shared environments.
 *
 * This is an experimental developer feature for:
 * - Sharing your Codex on a public URL
 * - Demo/showcase deployments
 * - Team environments where plugins should be centrally managed
 *
 * @example
 * ```typescript
 * import { isPublicAccess } from '@/lib/config/publicAccess'
 *
 * if (isPublicAccess()) {
 *   // Lock down plugin management
 *   return { success: false, error: 'Disabled in public access mode' }
 * }
 * ```
 */

/**
 * Check if public access mode is enabled
 *
 * When enabled:
 * - Plugin installation from URL, ZIP, or registry is disabled
 * - Plugin uninstallation/removal is disabled
 *
 * When disabled (default):
 * - Normal plugin management is allowed
 *
 * Always available regardless of mode:
 * - Enabling/disabling installed plugins
 * - Configuring plugin settings
 * - Viewing plugin information
 *
 * @returns true if public access mode is enabled
 */
export function isPublicAccess(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: check process.env directly
    return process.env.NEXT_PUBLIC_PUBLIC_ACCESS === 'true'
  }
  // Client-side: NEXT_PUBLIC_* vars are inlined at build time
  return process.env.NEXT_PUBLIC_PUBLIC_ACCESS === 'true'
}

/**
 * Get a user-friendly message explaining why an action is blocked
 */
export function getPublicAccessMessage(): string {
  return 'This action is disabled in public access mode. Contact the administrator to modify plugin configuration.'
}

/**
 * Check if plugin installation is allowed
 */
export function canInstallPlugins(): boolean {
  return !isPublicAccess()
}

/**
 * Check if plugin removal is allowed
 */
export function canRemovePlugins(): boolean {
  return !isPublicAccess()
}

/**
 * Check if security settings can be modified
 *
 * In public access mode, security settings (password enable/disable/change)
 * are locked to prevent unauthorized modifications.
 *
 * @returns true if security settings can be modified
 */
export function canModifySecuritySettings(): boolean {
  return !isPublicAccess()
}

/**
 * Check if storage/content source settings can be modified
 *
 * In public access mode, storage settings (GitHub PAT, mode selection, sync)
 * are locked to prevent unauthorized modifications.
 *
 * @returns true if storage settings can be modified
 */
export function canModifyStorageSettings(): boolean {
  return !isPublicAccess()
}

/**
 * Check if connection settings can be modified
 *
 * In public access mode, connection settings (database connections, sync servers)
 * are locked to prevent unauthorized modifications.
 *
 * @returns true if connection settings can be modified
 */
export function canModifyConnectionSettings(): boolean {
  return !isPublicAccess()
}

/**
 * Check if instance settings can be modified
 *
 * In public access mode, instance settings (name, vault)
 * are locked to prevent unauthorized modifications.
 *
 * @returns true if instance settings can be modified
 */
export function canModifyInstanceSettings(): boolean {
  return !isPublicAccess()
}

/**
 * Get a tooltip message for a disabled setting
 *
 * @param setting - The name of the setting being disabled
 * @returns A user-friendly tooltip message
 */
export function getDisabledTooltip(setting?: string): string {
  if (setting) {
    return `${setting} is locked in public access mode`
  }
  return 'Locked in public access mode'
}


