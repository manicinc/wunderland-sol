/**
 * Quarry Plugin Manifest Validation
 *
 * Validates plugin manifest.json files before installation.
 *
 * @module lib/plugins/validation
 */

import {
  type PluginManifest,
  type ValidationResult,
  VALID_PLUGIN_TYPES,
  VALID_PLUGIN_POSITIONS,
  QUARRY_VERSION,
} from './types'

/**
 * Semantic version comparison
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0
    const numB = partsB[i] || 0
    if (numA < numB) return -1
    if (numA > numB) return 1
  }
  return 0
}

/**
 * Check if version string is valid semver format
 */
function isValidSemver(version: string): boolean {
  return /^\d+\.\d+\.\d+(-[a-z0-9.-]+)?(\+[a-z0-9.-]+)?$/i.test(version)
}

/**
 * Check if ID is in reverse domain notation
 */
function isValidPluginId(id: string): boolean {
  // com.author.plugin-name format
  return /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*){1,}$/.test(id)
}

/**
 * Validate a plugin manifest
 *
 * @param manifest - The manifest object to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = validateManifest(manifest)
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors)
 * }
 * ```
 */
export function validateManifest(manifest: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if manifest is an object
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be a valid JSON object'] }
  }

  const m = manifest as Record<string, unknown>

  // =========================================================================
  // REQUIRED FIELDS
  // =========================================================================

  // id
  if (!m.id || typeof m.id !== 'string') {
    errors.push('Missing or invalid "id" field (required)')
  } else if (!isValidPluginId(m.id)) {
    errors.push('ID must be in reverse domain notation (e.g., "com.author.plugin-name")')
  }

  // name
  if (!m.name || typeof m.name !== 'string') {
    errors.push('Missing or invalid "name" field (required)')
  } else if (m.name.length > 50) {
    warnings.push('Name is longer than 50 characters')
  }

  // version
  if (!m.version || typeof m.version !== 'string') {
    errors.push('Missing or invalid "version" field (required)')
  } else if (!isValidSemver(m.version)) {
    errors.push('Version must be valid semver format (e.g., "1.0.0")')
  }

  // description
  if (!m.description || typeof m.description !== 'string') {
    errors.push('Missing or invalid "description" field (required)')
  } else if (m.description.length > 200) {
    warnings.push('Description is longer than 200 characters')
  }

  // author
  if (!m.author || typeof m.author !== 'string') {
    errors.push('Missing or invalid "author" field (required)')
  }

  // minQuarryVersion
  if (!m.minQuarryVersion || typeof m.minQuarryVersion !== 'string') {
    errors.push('Missing or invalid "minQuarryVersion" field (required)')
  } else if (!isValidSemver(m.minQuarryVersion)) {
    errors.push('minQuarryVersion must be valid semver format')
  }

  // main
  if (!m.main || typeof m.main !== 'string') {
    errors.push('Missing or invalid "main" field (required)')
  } else if (!m.main.endsWith('.js')) {
    errors.push('Main entry point must be a .js file')
  }

  // type
  if (!m.type || typeof m.type !== 'string') {
    errors.push('Missing or invalid "type" field (required)')
  } else if (!VALID_PLUGIN_TYPES.includes(m.type as any)) {
    errors.push(`Invalid type "${m.type}". Must be one of: ${VALID_PLUGIN_TYPES.join(', ')}`)
  }

  // =========================================================================
  // OPTIONAL FIELDS
  // =========================================================================

  // authorUrl
  if (m.authorUrl !== undefined) {
    if (typeof m.authorUrl !== 'string') {
      errors.push('authorUrl must be a string')
    } else if (!isValidUrl(m.authorUrl)) {
      warnings.push('authorUrl is not a valid URL')
    }
  }

  // fundingUrl
  if (m.fundingUrl !== undefined) {
    if (typeof m.fundingUrl !== 'string') {
      errors.push('fundingUrl must be a string')
    } else if (!isValidUrl(m.fundingUrl)) {
      warnings.push('fundingUrl is not a valid URL')
    }
  }

  // styles
  if (m.styles !== undefined) {
    if (typeof m.styles !== 'string') {
      errors.push('styles must be a string')
    } else if (!m.styles.endsWith('.css')) {
      errors.push('Styles file must be a .css file')
    }
  }

  // position
  if (m.position !== undefined) {
    if (typeof m.position !== 'string') {
      errors.push('position must be a string')
    } else if (!VALID_PLUGIN_POSITIONS.includes(m.position as any)) {
      errors.push(`Invalid position "${m.position}". Must be one of: ${VALID_PLUGIN_POSITIONS.join(', ')}`)
    }
  }

  // Widget/panel types require position
  if (['widget', 'panel'].includes(m.type as string) && !m.position) {
    warnings.push(`Plugins of type "${m.type}" should specify a position`)
  }

  // permissions
  if (m.permissions !== undefined) {
    if (!Array.isArray(m.permissions)) {
      errors.push('permissions must be an array')
    } else if (!m.permissions.every((p) => typeof p === 'string')) {
      errors.push('All permissions must be strings')
    }
  }

  // settings
  if (m.settings !== undefined) {
    if (typeof m.settings !== 'object' || m.settings === null) {
      errors.push('settings must be an object')
    } else {
      // Validate each setting
      const settingsErrors = validateSettings(m.settings as Record<string, unknown>)
      errors.push(...settingsErrors)
    }
  }

  // keywords
  if (m.keywords !== undefined) {
    if (!Array.isArray(m.keywords)) {
      errors.push('keywords must be an array')
    } else if (!m.keywords.every((k) => typeof k === 'string')) {
      errors.push('All keywords must be strings')
    }
  }

  // repository
  if (m.repository !== undefined && typeof m.repository !== 'string') {
    errors.push('repository must be a string')
  }

  // license
  if (m.license !== undefined && typeof m.license !== 'string') {
    errors.push('license must be a string')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * Validate settings definitions
 */
function validateSettings(settings: Record<string, unknown>): string[] {
  const errors: string[] = []
  const validTypes = ['string', 'number', 'boolean', 'select', 'color', 'slider']

  for (const [key, def] of Object.entries(settings)) {
    if (typeof def !== 'object' || def === null) {
      errors.push(`Setting "${key}" must be an object`)
      continue
    }

    const setting = def as Record<string, unknown>

    // type is required
    if (!setting.type || typeof setting.type !== 'string') {
      errors.push(`Setting "${key}" missing type`)
    } else if (!validTypes.includes(setting.type)) {
      errors.push(`Setting "${key}" has invalid type. Must be one of: ${validTypes.join(', ')}`)
    }

    // default is required
    if (setting.default === undefined) {
      errors.push(`Setting "${key}" missing default value`)
    }

    // label is required
    if (!setting.label || typeof setting.label !== 'string') {
      errors.push(`Setting "${key}" missing label`)
    }

    // select type requires options
    if (setting.type === 'select' && !Array.isArray(setting.options)) {
      errors.push(`Setting "${key}" of type "select" requires options array`)
    }

    // slider/number with min > max
    if (
      typeof setting.min === 'number' &&
      typeof setting.max === 'number' &&
      setting.min > setting.max
    ) {
      errors.push(`Setting "${key}" has min > max`)
    }
  }

  return errors
}

/**
 * Check URL validity
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Check if plugin is compatible with current Quarry version
 *
 * @param manifest - The validated manifest
 * @returns Compatibility result
 */
export function checkCompatibility(manifest: PluginManifest): {
  compatible: boolean
  reason?: string
} {
  const minVersion = manifest.minQuarryVersion
  const currentVersion = QUARRY_VERSION

  const comparison = compareVersions(minVersion, currentVersion)

  if (comparison > 0) {
    return {
      compatible: false,
      reason: `Plugin requires Quarry ${minVersion}, but current version is ${currentVersion}`,
    }
  }

  return { compatible: true }
}

/**
 * Parse and validate a manifest JSON string
 *
 * @param json - JSON string to parse
 * @returns Validation result with parsed manifest
 */
export function parseManifest(json: string): ValidationResult & { manifest?: PluginManifest } {
  let parsed: unknown

  try {
    parsed = JSON.parse(json)
  } catch (e) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${(e as Error).message}`],
    }
  }

  const result = validateManifest(parsed)

  if (result.valid) {
    return {
      ...result,
      manifest: parsed as PluginManifest,
    }
  }

  return result
}

/**
 * Get default values from settings definitions
 */
export function getDefaultSettings(manifest: PluginManifest): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}

  if (manifest.settings) {
    for (const [key, def] of Object.entries(manifest.settings)) {
      defaults[key] = def.default
    }
  }

  return defaults
}
