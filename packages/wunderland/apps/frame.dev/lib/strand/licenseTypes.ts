/**
 * Strand License Types and Metadata
 * @module lib/strand/licenseTypes
 *
 * Comprehensive licensing system for strands in Quarry.
 * Supports Creative Commons, open source, commercial, and custom licenses.
 */

// ============================================================================
// LICENSE TYPES
// ============================================================================

/**
 * Available license types for strands
 */
export type StrandLicense =
  | 'none'           // No license specified (default)
  | 'cc-by'          // Creative Commons Attribution
  | 'cc-by-sa'       // CC Attribution-ShareAlike
  | 'cc-by-nc'       // CC Attribution-NonCommercial
  | 'cc-by-nc-sa'    // CC Attribution-NonCommercial-ShareAlike
  | 'cc-by-nd'       // CC Attribution-NoDerivatives
  | 'cc-by-nc-nd'    // CC Attribution-NonCommercial-NoDerivatives
  | 'cc0'            // Public Domain / CC Zero
  | 'mit'            // MIT License
  | 'apache-2.0'     // Apache License 2.0
  | 'gpl-3.0'        // GNU GPL v3
  | 'bsd-3-clause'   // BSD 3-Clause
  | 'commercial'     // Commercial / All Rights Reserved
  | 'private'        // Private / Confidential
  | 'fair-use'       // Fair Use (for research/education)
  | 'custom'         // Custom license (see licenseText field)

/**
 * How the license was detected/set
 */
export type LicenseDetectionSource =
  | 'manual'         // User manually selected
  | 'file'           // Detected from file headers/metadata
  | 'scrape'         // Detected from scraped webpage
  | 'research'       // Inferred from academic/research source
  | 'inferred'       // Inferred from content analysis

// ============================================================================
// LICENSE METADATA
// ============================================================================

/**
 * Detailed metadata for each license type
 */
export interface LicenseInfo {
  id: StrandLicense
  name: string
  shortName: string
  description: string
  url?: string
  icon: string           // Lucide icon name
  color: string          // Tailwind color class
  isOpenSource: boolean
  allowsCommercialUse: boolean
  allowsModification: boolean
  requiresAttribution: boolean
  requiresShareAlike: boolean
  isCreativeCommons: boolean
}

/**
 * License metadata lookup
 */
export const LICENSE_INFO: Record<StrandLicense, LicenseInfo> = {
  'none': {
    id: 'none',
    name: 'No License Specified',
    shortName: 'Unspecified',
    description: 'No license has been specified. Usage rights are unclear.',
    icon: 'HelpCircle',
    color: 'gray',
    isOpenSource: false,
    allowsCommercialUse: false,
    allowsModification: false,
    requiresAttribution: false,
    requiresShareAlike: false,
    isCreativeCommons: false,
  },
  'cc-by': {
    id: 'cc-by',
    name: 'Creative Commons Attribution 4.0',
    shortName: 'CC BY',
    description: 'Free to share and adapt with attribution.',
    url: 'https://creativecommons.org/licenses/by/4.0/',
    icon: 'Share2',
    color: 'green',
    isOpenSource: true,
    allowsCommercialUse: true,
    allowsModification: true,
    requiresAttribution: true,
    requiresShareAlike: false,
    isCreativeCommons: true,
  },
  'cc-by-sa': {
    id: 'cc-by-sa',
    name: 'Creative Commons Attribution-ShareAlike 4.0',
    shortName: 'CC BY-SA',
    description: 'Free to share and adapt with attribution. Derivatives must use same license.',
    url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    icon: 'RefreshCw',
    color: 'green',
    isOpenSource: true,
    allowsCommercialUse: true,
    allowsModification: true,
    requiresAttribution: true,
    requiresShareAlike: true,
    isCreativeCommons: true,
  },
  'cc-by-nc': {
    id: 'cc-by-nc',
    name: 'Creative Commons Attribution-NonCommercial 4.0',
    shortName: 'CC BY-NC',
    description: 'Free to share and adapt for non-commercial purposes with attribution.',
    url: 'https://creativecommons.org/licenses/by-nc/4.0/',
    icon: 'DollarSign',
    color: 'yellow',
    isOpenSource: false,
    allowsCommercialUse: false,
    allowsModification: true,
    requiresAttribution: true,
    requiresShareAlike: false,
    isCreativeCommons: true,
  },
  'cc-by-nc-sa': {
    id: 'cc-by-nc-sa',
    name: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0',
    shortName: 'CC BY-NC-SA',
    description: 'Non-commercial use with attribution. Derivatives must use same license.',
    url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    icon: 'RefreshCw',
    color: 'yellow',
    isOpenSource: false,
    allowsCommercialUse: false,
    allowsModification: true,
    requiresAttribution: true,
    requiresShareAlike: true,
    isCreativeCommons: true,
  },
  'cc-by-nd': {
    id: 'cc-by-nd',
    name: 'Creative Commons Attribution-NoDerivatives 4.0',
    shortName: 'CC BY-ND',
    description: 'Free to share with attribution but no modifications allowed.',
    url: 'https://creativecommons.org/licenses/by-nd/4.0/',
    icon: 'Lock',
    color: 'orange',
    isOpenSource: false,
    allowsCommercialUse: true,
    allowsModification: false,
    requiresAttribution: true,
    requiresShareAlike: false,
    isCreativeCommons: true,
  },
  'cc-by-nc-nd': {
    id: 'cc-by-nc-nd',
    name: 'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0',
    shortName: 'CC BY-NC-ND',
    description: 'Most restrictive CC license. Non-commercial, no modifications, with attribution.',
    url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    icon: 'Shield',
    color: 'orange',
    isOpenSource: false,
    allowsCommercialUse: false,
    allowsModification: false,
    requiresAttribution: true,
    requiresShareAlike: false,
    isCreativeCommons: true,
  },
  'cc0': {
    id: 'cc0',
    name: 'CC0 1.0 Universal (Public Domain)',
    shortName: 'CC0 / Public Domain',
    description: 'No rights reserved. Free for any use without attribution.',
    url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    icon: 'Globe',
    color: 'emerald',
    isOpenSource: true,
    allowsCommercialUse: true,
    allowsModification: true,
    requiresAttribution: false,
    requiresShareAlike: false,
    isCreativeCommons: true,
  },
  'mit': {
    id: 'mit',
    name: 'MIT License',
    shortName: 'MIT',
    description: 'Permissive open source license. Free for any use with copyright notice.',
    url: 'https://opensource.org/licenses/MIT',
    icon: 'Code',
    color: 'blue',
    isOpenSource: true,
    allowsCommercialUse: true,
    allowsModification: true,
    requiresAttribution: true,
    requiresShareAlike: false,
    isCreativeCommons: false,
  },
  'apache-2.0': {
    id: 'apache-2.0',
    name: 'Apache License 2.0',
    shortName: 'Apache 2.0',
    description: 'Permissive open source with patent protection.',
    url: 'https://www.apache.org/licenses/LICENSE-2.0',
    icon: 'Feather',
    color: 'blue',
    isOpenSource: true,
    allowsCommercialUse: true,
    allowsModification: true,
    requiresAttribution: true,
    requiresShareAlike: false,
    isCreativeCommons: false,
  },
  'gpl-3.0': {
    id: 'gpl-3.0',
    name: 'GNU General Public License v3.0',
    shortName: 'GPL v3',
    description: 'Copyleft license requiring derivatives to also be open source.',
    url: 'https://www.gnu.org/licenses/gpl-3.0.html',
    icon: 'Copyleft',
    color: 'purple',
    isOpenSource: true,
    allowsCommercialUse: true,
    allowsModification: true,
    requiresAttribution: true,
    requiresShareAlike: true,
    isCreativeCommons: false,
  },
  'bsd-3-clause': {
    id: 'bsd-3-clause',
    name: 'BSD 3-Clause License',
    shortName: 'BSD 3-Clause',
    description: 'Permissive open source license similar to MIT.',
    url: 'https://opensource.org/licenses/BSD-3-Clause',
    icon: 'FileCode',
    color: 'blue',
    isOpenSource: true,
    allowsCommercialUse: true,
    allowsModification: true,
    requiresAttribution: true,
    requiresShareAlike: false,
    isCreativeCommons: false,
  },
  'commercial': {
    id: 'commercial',
    name: 'Commercial / All Rights Reserved',
    shortName: 'Commercial',
    description: 'All rights reserved. Contact the author for licensing.',
    icon: 'Copyright',
    color: 'red',
    isOpenSource: false,
    allowsCommercialUse: false,
    allowsModification: false,
    requiresAttribution: true,
    requiresShareAlike: false,
    isCreativeCommons: false,
  },
  'private': {
    id: 'private',
    name: 'Private / Confidential',
    shortName: 'Private',
    description: 'Private content. Not for distribution or sharing.',
    icon: 'EyeOff',
    color: 'zinc',
    isOpenSource: false,
    allowsCommercialUse: false,
    allowsModification: false,
    requiresAttribution: false,
    requiresShareAlike: false,
    isCreativeCommons: false,
  },
  'fair-use': {
    id: 'fair-use',
    name: 'Fair Use',
    shortName: 'Fair Use',
    description: 'Used under fair use doctrine for research, education, or commentary.',
    icon: 'BookOpen',
    color: 'cyan',
    isOpenSource: false,
    allowsCommercialUse: false,
    allowsModification: false,
    requiresAttribution: true,
    requiresShareAlike: false,
    isCreativeCommons: false,
  },
  'custom': {
    id: 'custom',
    name: 'Custom License',
    shortName: 'Custom',
    description: 'Custom license terms. See licenseText field for details.',
    icon: 'FileText',
    color: 'indigo',
    isOpenSource: false,
    allowsCommercialUse: false,
    allowsModification: false,
    requiresAttribution: false,
    requiresShareAlike: false,
    isCreativeCommons: false,
  },
}

// ============================================================================
// LICENSE GROUPS
// ============================================================================

/**
 * Grouped licenses for UI display
 */
export const LICENSE_GROUPS = {
  common: ['none', 'cc-by', 'cc0', 'private'] as StrandLicense[],
  creativeCommons: [
    'cc-by',
    'cc-by-sa',
    'cc-by-nc',
    'cc-by-nc-sa',
    'cc-by-nd',
    'cc-by-nc-nd',
    'cc0',
  ] as StrandLicense[],
  openSource: ['mit', 'apache-2.0', 'gpl-3.0', 'bsd-3-clause'] as StrandLicense[],
  restricted: ['commercial', 'private', 'fair-use'] as StrandLicense[],
  special: ['custom'] as StrandLicense[],
}

/**
 * Default license for new strands
 */
export const DEFAULT_LICENSE: StrandLicense = 'none'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get license info by ID
 */
export function getLicenseInfo(license: StrandLicense): LicenseInfo {
  return LICENSE_INFO[license] || LICENSE_INFO['none']
}

/**
 * Check if a license allows commercial use
 */
export function allowsCommercialUse(license: StrandLicense): boolean {
  return LICENSE_INFO[license]?.allowsCommercialUse ?? false
}

/**
 * Check if a license allows modifications
 */
export function allowsModification(license: StrandLicense): boolean {
  return LICENSE_INFO[license]?.allowsModification ?? false
}

/**
 * Check if a license is open source
 */
export function isOpenSource(license: StrandLicense): boolean {
  return LICENSE_INFO[license]?.isOpenSource ?? false
}

/**
 * Get all licenses as options for UI selects
 */
export function getLicenseOptions(): Array<{ value: StrandLicense; label: string; group: string }> {
  const options: Array<{ value: StrandLicense; label: string; group: string }> = []

  // Add common licenses first
  for (const id of LICENSE_GROUPS.common) {
    const info = LICENSE_INFO[id]
    options.push({ value: id, label: info.name, group: 'Common' })
  }

  // Add Creative Commons (excluding those already in common)
  for (const id of LICENSE_GROUPS.creativeCommons) {
    if (!LICENSE_GROUPS.common.includes(id)) {
      const info = LICENSE_INFO[id]
      options.push({ value: id, label: info.name, group: 'Creative Commons' })
    }
  }

  // Add Open Source
  for (const id of LICENSE_GROUPS.openSource) {
    const info = LICENSE_INFO[id]
    options.push({ value: id, label: info.name, group: 'Open Source' })
  }

  // Add Restricted (excluding those already in common)
  for (const id of LICENSE_GROUPS.restricted) {
    if (!LICENSE_GROUPS.common.includes(id)) {
      const info = LICENSE_INFO[id]
      options.push({ value: id, label: info.name, group: 'Restricted' })
    }
  }

  // Add Special
  for (const id of LICENSE_GROUPS.special) {
    const info = LICENSE_INFO[id]
    options.push({ value: id, label: info.name, group: 'Other' })
  }

  return options
}

/**
 * Parse a license string to a StrandLicense type
 * Handles various formats and aliases
 */
export function parseLicense(licenseString: string | undefined): StrandLicense {
  if (!licenseString) return 'none'

  const normalized = licenseString.toLowerCase().trim()

  // Direct matches
  if (normalized in LICENSE_INFO) {
    return normalized as StrandLicense
  }

  // Creative Commons aliases
  if (normalized.includes('creative commons') || normalized.includes('cc ')) {
    if (normalized.includes('by-nc-sa') || normalized.includes('attribution-noncommercial-sharealike')) {
      return 'cc-by-nc-sa'
    }
    if (normalized.includes('by-nc-nd') || normalized.includes('attribution-noncommercial-noderivatives')) {
      return 'cc-by-nc-nd'
    }
    if (normalized.includes('by-nc') || normalized.includes('attribution-noncommercial')) {
      return 'cc-by-nc'
    }
    if (normalized.includes('by-sa') || normalized.includes('attribution-sharealike')) {
      return 'cc-by-sa'
    }
    if (normalized.includes('by-nd') || normalized.includes('attribution-noderivatives')) {
      return 'cc-by-nd'
    }
    if (normalized.includes('by') || normalized.includes('attribution')) {
      return 'cc-by'
    }
    if (normalized.includes('zero') || normalized.includes('cc0') || normalized.includes('public domain')) {
      return 'cc0'
    }
  }

  // MIT aliases
  if (normalized === 'mit' || normalized === 'mit license' || normalized === 'the mit license') {
    return 'mit'
  }

  // Apache aliases
  if (normalized.includes('apache') && normalized.includes('2')) {
    return 'apache-2.0'
  }

  // GPL aliases
  if (normalized.includes('gpl') && normalized.includes('3')) {
    return 'gpl-3.0'
  }

  // BSD aliases
  if (normalized.includes('bsd') && (normalized.includes('3') || normalized.includes('three'))) {
    return 'bsd-3-clause'
  }

  // Public domain
  if (normalized.includes('public domain') || normalized === 'pd') {
    return 'cc0'
  }

  // All rights reserved
  if (normalized.includes('all rights reserved') || normalized.includes('copyright') || normalized === 'arr') {
    return 'commercial'
  }

  // Fair use
  if (normalized.includes('fair use') || normalized.includes('educational') || normalized.includes('research')) {
    return 'fair-use'
  }

  // Private/confidential
  if (normalized.includes('private') || normalized.includes('confidential') || normalized.includes('internal')) {
    return 'private'
  }

  // Unknown - return none
  return 'none'
}

/**
 * Format license for display in frontmatter
 */
export function formatLicenseForFrontmatter(license: StrandLicense): string {
  const info = LICENSE_INFO[license]
  if (!info) return 'none'

  // Use SPDX-style identifiers where applicable
  switch (license) {
    case 'cc-by':
      return 'CC-BY-4.0'
    case 'cc-by-sa':
      return 'CC-BY-SA-4.0'
    case 'cc-by-nc':
      return 'CC-BY-NC-4.0'
    case 'cc-by-nc-sa':
      return 'CC-BY-NC-SA-4.0'
    case 'cc-by-nd':
      return 'CC-BY-ND-4.0'
    case 'cc-by-nc-nd':
      return 'CC-BY-NC-ND-4.0'
    case 'cc0':
      return 'CC0-1.0'
    case 'mit':
      return 'MIT'
    case 'apache-2.0':
      return 'Apache-2.0'
    case 'gpl-3.0':
      return 'GPL-3.0'
    case 'bsd-3-clause':
      return 'BSD-3-Clause'
    default:
      return license
  }
}
