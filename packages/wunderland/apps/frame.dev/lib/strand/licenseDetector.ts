/**
 * License Detection Service
 * @module lib/strand/licenseDetector
 *
 * Automatic license detection from various sources:
 * - File content (headers, LICENSE files, package.json)
 * - HTML metadata (meta tags, structured data, CC badges)
 * - Academic sources (open access, preprints)
 * - Content analysis (copyright notices, all rights reserved)
 */

import { type StrandLicense, parseLicense, LICENSE_INFO } from './licenseTypes'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of license detection
 */
export interface LicenseDetectionResult {
  license: StrandLicense
  confidence: number    // 0-1
  source: 'file' | 'html' | 'content' | 'academic' | 'github' | 'inferred'
  licenseUrl?: string
  licenseText?: string
  reasoning?: string
}

/**
 * Options for license detection
 */
export interface LicenseDetectionOptions {
  /** Content to analyze */
  content?: string
  /** Source URL (for scraping context) */
  sourceUrl?: string
  /** HTML content (for meta tag extraction) */
  htmlContent?: string
  /** File name (for context) */
  filename?: string
  /** Whether content is from academic source */
  isAcademic?: boolean
  /** Open access flag from academic API */
  isOpenAccess?: boolean
  /** GitHub repo info */
  githubRepo?: {
    owner: string
    repo: string
    license?: string
  }
}

// ============================================================================
// LICENSE PATTERNS
// ============================================================================

/**
 * Patterns for detecting licenses in file headers
 */
const FILE_HEADER_PATTERNS: Array<{ pattern: RegExp; license: StrandLicense; confidence: number }> = [
  // MIT
  { pattern: /Permission is hereby granted, free of charge/i, license: 'mit', confidence: 0.95 },
  { pattern: /MIT License/i, license: 'mit', confidence: 0.9 },
  { pattern: /Licensed under the MIT/i, license: 'mit', confidence: 0.9 },
  { pattern: /SPDX-License-Identifier:\s*MIT/i, license: 'mit', confidence: 0.98 },

  // Apache 2.0
  { pattern: /Licensed under the Apache License, Version 2\.0/i, license: 'apache-2.0', confidence: 0.95 },
  { pattern: /Apache License\s*(?:,?\s*)?(?:Version\s*)?2(?:\.0)?/i, license: 'apache-2.0', confidence: 0.9 },
  { pattern: /SPDX-License-Identifier:\s*Apache-2\.0/i, license: 'apache-2.0', confidence: 0.98 },

  // GPL v3
  { pattern: /GNU General Public License.*version 3/i, license: 'gpl-3.0', confidence: 0.95 },
  { pattern: /Licensed under (?:the )?GPL(?:v)?3/i, license: 'gpl-3.0', confidence: 0.9 },
  { pattern: /SPDX-License-Identifier:\s*GPL-3\.0/i, license: 'gpl-3.0', confidence: 0.98 },

  // BSD 3-Clause
  { pattern: /BSD 3-Clause License/i, license: 'bsd-3-clause', confidence: 0.95 },
  { pattern: /Redistribution and use in source and binary forms/i, license: 'bsd-3-clause', confidence: 0.85 },
  { pattern: /SPDX-License-Identifier:\s*BSD-3-Clause/i, license: 'bsd-3-clause', confidence: 0.98 },

  // Creative Commons
  { pattern: /Creative Commons Attribution 4\.0/i, license: 'cc-by', confidence: 0.95 },
  { pattern: /CC BY 4\.0/i, license: 'cc-by', confidence: 0.9 },
  { pattern: /CC BY-SA 4\.0/i, license: 'cc-by-sa', confidence: 0.9 },
  { pattern: /CC BY-NC 4\.0/i, license: 'cc-by-nc', confidence: 0.9 },
  { pattern: /CC BY-NC-SA 4\.0/i, license: 'cc-by-nc-sa', confidence: 0.9 },
  { pattern: /CC BY-ND 4\.0/i, license: 'cc-by-nd', confidence: 0.9 },
  { pattern: /CC BY-NC-ND 4\.0/i, license: 'cc-by-nc-nd', confidence: 0.9 },
  { pattern: /CC0 1\.0|Public Domain|CC Zero/i, license: 'cc0', confidence: 0.9 },
  { pattern: /SPDX-License-Identifier:\s*CC-BY-4\.0/i, license: 'cc-by', confidence: 0.98 },
  { pattern: /SPDX-License-Identifier:\s*CC0-1\.0/i, license: 'cc0', confidence: 0.98 },

  // Commercial / All Rights Reserved
  { pattern: /All Rights Reserved/i, license: 'commercial', confidence: 0.85 },
  { pattern: /Copyright.*All rights reserved/i, license: 'commercial', confidence: 0.8 },
  { pattern: /Proprietary/i, license: 'commercial', confidence: 0.75 },

  // Private/Confidential
  { pattern: /Confidential|Private|Internal Use Only/i, license: 'private', confidence: 0.85 },
]

/**
 * Patterns for detecting license URLs
 */
const LICENSE_URL_PATTERNS: Array<{ pattern: RegExp; license: StrandLicense }> = [
  { pattern: /creativecommons\.org\/licenses\/by\/4\.0/i, license: 'cc-by' },
  { pattern: /creativecommons\.org\/licenses\/by-sa\/4\.0/i, license: 'cc-by-sa' },
  { pattern: /creativecommons\.org\/licenses\/by-nc\/4\.0/i, license: 'cc-by-nc' },
  { pattern: /creativecommons\.org\/licenses\/by-nc-sa\/4\.0/i, license: 'cc-by-nc-sa' },
  { pattern: /creativecommons\.org\/licenses\/by-nd\/4\.0/i, license: 'cc-by-nd' },
  { pattern: /creativecommons\.org\/licenses\/by-nc-nd\/4\.0/i, license: 'cc-by-nc-nd' },
  { pattern: /creativecommons\.org\/publicdomain\/zero\/1\.0/i, license: 'cc0' },
  { pattern: /opensource\.org\/licenses\/MIT/i, license: 'mit' },
  { pattern: /apache\.org\/licenses\/LICENSE-2\.0/i, license: 'apache-2.0' },
  { pattern: /gnu\.org\/licenses\/gpl-3\.0/i, license: 'gpl-3.0' },
]

/**
 * Academic license inference rules
 */
const ACADEMIC_LICENSE_RULES: Array<{
  condition: (options: LicenseDetectionOptions) => boolean
  license: StrandLicense
  confidence: number
  reasoning: string
}> = [
  {
    condition: (opts) => opts.isOpenAccess === true,
    license: 'cc-by',
    confidence: 0.7,
    reasoning: 'Open access content typically uses CC-BY license',
  },
  {
    condition: (opts) => opts.sourceUrl?.includes('arxiv.org') === true,
    license: 'cc-by',
    confidence: 0.75,
    reasoning: 'arXiv preprints typically use CC-BY or similar open license',
  },
  {
    condition: (opts) => opts.sourceUrl?.includes('biorxiv.org') === true,
    license: 'cc-by-nc-nd',
    confidence: 0.7,
    reasoning: 'bioRxiv preprints default to CC-BY-NC-ND',
  },
  {
    condition: (opts) => opts.sourceUrl?.includes('medrxiv.org') === true,
    license: 'cc-by-nc-nd',
    confidence: 0.7,
    reasoning: 'medRxiv preprints default to CC-BY-NC-ND',
  },
  {
    condition: (opts) =>
      opts.isAcademic === true && opts.isOpenAccess !== true,
    license: 'fair-use',
    confidence: 0.6,
    reasoning: 'Non-open-access academic content - fair use for research/education',
  },
]

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Detect license from file content (headers, comments)
 */
export function detectLicenseFromContent(content: string): LicenseDetectionResult | null {
  if (!content || content.length < 10) return null

  // Check first 2000 characters (header area)
  const headerContent = content.slice(0, 2000)

  for (const { pattern, license, confidence } of FILE_HEADER_PATTERNS) {
    if (pattern.test(headerContent)) {
      // Extract license text around the match
      const match = headerContent.match(pattern)
      const startIdx = Math.max(0, (match?.index || 0) - 50)
      const endIdx = Math.min(headerContent.length, (match?.index || 0) + 200)
      const licenseText = headerContent.slice(startIdx, endIdx).trim()

      return {
        license,
        confidence,
        source: 'content',
        licenseText,
        reasoning: `Matched pattern: ${pattern.source}`,
      }
    }
  }

  // Check for license URLs in content
  for (const { pattern, license } of LICENSE_URL_PATTERNS) {
    const match = content.match(pattern)
    if (match) {
      return {
        license,
        confidence: 0.85,
        source: 'content',
        licenseUrl: match[0],
        reasoning: `Found license URL: ${match[0]}`,
      }
    }
  }

  return null
}

/**
 * Detect license from HTML metadata
 */
export function detectLicenseFromHTML(html: string): LicenseDetectionResult | null {
  if (!html) return null

  // Check for <link rel="license">
  const linkMatch = html.match(/<link[^>]+rel=["']license["'][^>]+href=["']([^"']+)["']/i)
  if (linkMatch) {
    const licenseUrl = linkMatch[1]
    for (const { pattern, license } of LICENSE_URL_PATTERNS) {
      if (pattern.test(licenseUrl)) {
        return {
          license,
          confidence: 0.9,
          source: 'html',
          licenseUrl,
          reasoning: 'Found <link rel="license"> tag',
        }
      }
    }
  }

  // Check for Creative Commons meta tags
  const ccMetaMatch = html.match(/<meta[^>]+name=["']dc\.rights["'][^>]+content=["']([^"']+)["']/i)
  if (ccMetaMatch) {
    const rights = ccMetaMatch[1]
    const detected = parseLicense(rights)
    if (detected !== 'none') {
      return {
        license: detected,
        confidence: 0.85,
        source: 'html',
        reasoning: `Found dc.rights meta tag: ${rights}`,
      }
    }
  }

  // Check for schema.org license property
  const schemaMatch = html.match(/"license"\s*:\s*"([^"]+)"/i)
  if (schemaMatch) {
    const licenseUrl = schemaMatch[1]
    for (const { pattern, license } of LICENSE_URL_PATTERNS) {
      if (pattern.test(licenseUrl)) {
        return {
          license,
          confidence: 0.88,
          source: 'html',
          licenseUrl,
          reasoning: 'Found schema.org license property',
        }
      }
    }
  }

  // Check for Creative Commons badges/images
  if (/creativecommons\.org\/l\/(by|by-sa|by-nc|by-nc-sa|by-nd|by-nc-nd)\/[\d.]+/i.test(html)) {
    const badgeMatch = html.match(/creativecommons\.org\/l\/(by(?:-[a-z]+)?)\/[\d.]+/i)
    if (badgeMatch) {
      const ccType = `cc-${badgeMatch[1]}` as StrandLicense
      if (ccType in LICENSE_INFO) {
        return {
          license: ccType,
          confidence: 0.8,
          source: 'html',
          reasoning: 'Found Creative Commons badge/image',
        }
      }
    }
  }

  // Check footer for copyright/license text
  const footerMatch = html.match(/<footer[^>]*>[\s\S]*?<\/footer>/i)
  if (footerMatch) {
    const footerContent = footerMatch[0]
    for (const { pattern, license, confidence } of FILE_HEADER_PATTERNS) {
      if (pattern.test(footerContent)) {
        return {
          license,
          confidence: confidence * 0.9, // Slightly lower confidence for footer
          source: 'html',
          reasoning: `Found license in footer: ${pattern.source}`,
        }
      }
    }
  }

  return null
}

/**
 * Detect license from GitHub repository info
 */
export function detectLicenseFromGitHub(
  repoInfo: { owner: string; repo: string; license?: string }
): LicenseDetectionResult | null {
  if (!repoInfo.license) return null

  const license = parseLicense(repoInfo.license)
  if (license !== 'none') {
    return {
      license,
      confidence: 0.95,
      source: 'github',
      licenseUrl: `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/main/LICENSE`,
      reasoning: `GitHub API reported license: ${repoInfo.license}`,
    }
  }

  return null
}

/**
 * Detect license from academic source metadata
 */
export function detectLicenseFromAcademic(options: LicenseDetectionOptions): LicenseDetectionResult | null {
  if (!options.isAcademic && !options.sourceUrl) return null

  for (const rule of ACADEMIC_LICENSE_RULES) {
    if (rule.condition(options)) {
      return {
        license: rule.license,
        confidence: rule.confidence,
        source: 'academic',
        reasoning: rule.reasoning,
      }
    }
  }

  return null
}

/**
 * Detect license from package.json content
 */
export function detectLicenseFromPackageJson(content: string): LicenseDetectionResult | null {
  try {
    const pkg = JSON.parse(content)
    if (pkg.license) {
      const license = parseLicense(pkg.license)
      if (license !== 'none') {
        return {
          license,
          confidence: 0.95,
          source: 'file',
          reasoning: `Found license field in package.json: ${pkg.license}`,
        }
      }
    }
  } catch {
    // Not valid JSON or no license field
  }
  return null
}

// ============================================================================
// MAIN DETECTION FUNCTION
// ============================================================================

/**
 * Detect license from all available sources
 * Returns the most confident detection, or null if no license detected
 */
export function detectLicense(options: LicenseDetectionOptions): LicenseDetectionResult | null {
  const results: LicenseDetectionResult[] = []

  // 1. Check GitHub repo license (highest confidence)
  if (options.githubRepo) {
    const result = detectLicenseFromGitHub(options.githubRepo)
    if (result) results.push(result)
  }

  // 2. Check HTML metadata
  if (options.htmlContent) {
    const result = detectLicenseFromHTML(options.htmlContent)
    if (result) results.push(result)
  }

  // 3. Check file content
  if (options.content) {
    // Check if it's a package.json
    if (options.filename?.toLowerCase() === 'package.json') {
      const result = detectLicenseFromPackageJson(options.content)
      if (result) results.push(result)
    }

    // General content detection
    const result = detectLicenseFromContent(options.content)
    if (result) results.push(result)
  }

  // 4. Check academic sources
  if (options.isAcademic || options.isOpenAccess !== undefined) {
    const result = detectLicenseFromAcademic(options)
    if (result) results.push(result)
  }

  // Return the highest confidence result
  if (results.length === 0) return null

  results.sort((a, b) => b.confidence - a.confidence)
  return results[0]
}

/**
 * Detect license and return with fallback to 'none'
 */
export function detectLicenseOrDefault(
  options: LicenseDetectionOptions
): LicenseDetectionResult {
  const result = detectLicense(options)
  if (result) return result

  return {
    license: 'none',
    confidence: 1.0,
    source: 'inferred',
    reasoning: 'No license detected, defaulting to unspecified',
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  detectLicense,
  detectLicenseOrDefault,
  detectLicenseFromContent,
  detectLicenseFromHTML,
  detectLicenseFromGitHub,
  detectLicenseFromAcademic,
  detectLicenseFromPackageJson,
}
