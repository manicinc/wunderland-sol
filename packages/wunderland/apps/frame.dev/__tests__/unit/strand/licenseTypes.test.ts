/**
 * Tests for License Types
 * @module __tests__/unit/strand/licenseTypes.test
 */

import { describe, it, expect } from 'vitest'
import {
  type StrandLicense,
  LICENSE_INFO,
  LICENSE_GROUPS,
  DEFAULT_LICENSE,
  getLicenseInfo,
  allowsCommercialUse,
  allowsModification,
  isOpenSource,
  getLicenseOptions,
  parseLicense,
  formatLicenseForFrontmatter,
} from '@/lib/strand/licenseTypes'

// ============================================================================
// LICENSE_INFO TESTS
// ============================================================================

describe('LICENSE_INFO', () => {
  it('contains all expected licenses', () => {
    const expectedLicenses: StrandLicense[] = [
      'none', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa',
      'cc-by-nd', 'cc-by-nc-nd', 'cc0', 'mit', 'apache-2.0',
      'gpl-3.0', 'bsd-3-clause', 'commercial', 'private', 'fair-use', 'custom'
    ]

    expectedLicenses.forEach(license => {
      expect(LICENSE_INFO[license]).toBeDefined()
      expect(LICENSE_INFO[license].id).toBe(license)
    })
  })

  it('has required fields for each license', () => {
    Object.entries(LICENSE_INFO).forEach(([id, info]) => {
      expect(info.id).toBe(id)
      expect(info.name).toBeTruthy()
      expect(info.shortName).toBeTruthy()
      expect(info.description).toBeTruthy()
      expect(info.icon).toBeTruthy()
      expect(info.color).toBeTruthy()
      expect(typeof info.isOpenSource).toBe('boolean')
      expect(typeof info.allowsCommercialUse).toBe('boolean')
      expect(typeof info.allowsModification).toBe('boolean')
      expect(typeof info.requiresAttribution).toBe('boolean')
      expect(typeof info.requiresShareAlike).toBe('boolean')
      expect(typeof info.isCreativeCommons).toBe('boolean')
    })
  })

  it('has valid URLs for licenses that should have them', () => {
    const licensesWithUrls: StrandLicense[] = [
      'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nd',
      'cc-by-nc-nd', 'cc0', 'mit', 'apache-2.0', 'gpl-3.0', 'bsd-3-clause'
    ]

    licensesWithUrls.forEach(license => {
      expect(LICENSE_INFO[license].url).toBeTruthy()
      expect(LICENSE_INFO[license].url).toMatch(/^https?:\/\//)
    })
  })

  it('marks Creative Commons licenses correctly', () => {
    const ccLicenses: StrandLicense[] = [
      'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa',
      'cc-by-nd', 'cc-by-nc-nd', 'cc0'
    ]

    ccLicenses.forEach(license => {
      expect(LICENSE_INFO[license].isCreativeCommons).toBe(true)
    })

    // Non-CC licenses
    expect(LICENSE_INFO['mit'].isCreativeCommons).toBe(false)
    expect(LICENSE_INFO['apache-2.0'].isCreativeCommons).toBe(false)
    expect(LICENSE_INFO['gpl-3.0'].isCreativeCommons).toBe(false)
  })
})

// ============================================================================
// LICENSE_GROUPS TESTS
// ============================================================================

describe('LICENSE_GROUPS', () => {
  it('has common group with expected licenses', () => {
    expect(LICENSE_GROUPS.common).toContain('none')
    expect(LICENSE_GROUPS.common).toContain('cc-by')
    expect(LICENSE_GROUPS.common).toContain('private')
  })

  it('has creativeCommons group with all CC licenses', () => {
    expect(LICENSE_GROUPS.creativeCommons).toContain('cc-by')
    expect(LICENSE_GROUPS.creativeCommons).toContain('cc-by-sa')
    expect(LICENSE_GROUPS.creativeCommons).toContain('cc-by-nc')
    expect(LICENSE_GROUPS.creativeCommons).toContain('cc0')
  })

  it('has openSource group with OSS licenses', () => {
    expect(LICENSE_GROUPS.openSource).toContain('mit')
    expect(LICENSE_GROUPS.openSource).toContain('apache-2.0')
    expect(LICENSE_GROUPS.openSource).toContain('gpl-3.0')
    expect(LICENSE_GROUPS.openSource).toContain('bsd-3-clause')
  })

  it('has restricted group', () => {
    expect(LICENSE_GROUPS.restricted).toContain('commercial')
    expect(LICENSE_GROUPS.restricted).toContain('private')
    expect(LICENSE_GROUPS.restricted).toContain('fair-use')
  })
})

// ============================================================================
// DEFAULT_LICENSE TESTS
// ============================================================================

describe('DEFAULT_LICENSE', () => {
  it('is set to none', () => {
    expect(DEFAULT_LICENSE).toBe('none')
  })
})

// ============================================================================
// getLicenseInfo TESTS
// ============================================================================

describe('getLicenseInfo', () => {
  it('returns correct info for valid license', () => {
    const info = getLicenseInfo('mit')
    expect(info.id).toBe('mit')
    expect(info.name).toBe('MIT License')
    expect(info.shortName).toBe('MIT')
  })

  it('returns none info for invalid license', () => {
    const info = getLicenseInfo('invalid-license' as StrandLicense)
    expect(info.id).toBe('none')
  })
})

// ============================================================================
// PERMISSION HELPER TESTS
// ============================================================================

describe('Permission helpers', () => {
  describe('allowsCommercialUse', () => {
    it('returns true for permissive licenses', () => {
      expect(allowsCommercialUse('mit')).toBe(true)
      expect(allowsCommercialUse('apache-2.0')).toBe(true)
      expect(allowsCommercialUse('cc-by')).toBe(true)
      expect(allowsCommercialUse('cc0')).toBe(true)
    })

    it('returns false for non-commercial licenses', () => {
      expect(allowsCommercialUse('cc-by-nc')).toBe(false)
      expect(allowsCommercialUse('cc-by-nc-sa')).toBe(false)
      expect(allowsCommercialUse('commercial')).toBe(false)
      expect(allowsCommercialUse('private')).toBe(false)
    })
  })

  describe('allowsModification', () => {
    it('returns true for modifiable licenses', () => {
      expect(allowsModification('mit')).toBe(true)
      expect(allowsModification('cc-by')).toBe(true)
      expect(allowsModification('cc-by-sa')).toBe(true)
      expect(allowsModification('cc0')).toBe(true)
    })

    it('returns false for no-derivatives licenses', () => {
      expect(allowsModification('cc-by-nd')).toBe(false)
      expect(allowsModification('cc-by-nc-nd')).toBe(false)
      expect(allowsModification('commercial')).toBe(false)
    })
  })

  describe('isOpenSource', () => {
    it('returns true for open source licenses', () => {
      expect(isOpenSource('mit')).toBe(true)
      expect(isOpenSource('apache-2.0')).toBe(true)
      expect(isOpenSource('gpl-3.0')).toBe(true)
      expect(isOpenSource('cc-by')).toBe(true)
      expect(isOpenSource('cc0')).toBe(true)
    })

    it('returns false for proprietary licenses', () => {
      expect(isOpenSource('commercial')).toBe(false)
      expect(isOpenSource('private')).toBe(false)
      expect(isOpenSource('cc-by-nc')).toBe(false)
    })
  })
})

// ============================================================================
// getLicenseOptions TESTS
// ============================================================================

describe('getLicenseOptions', () => {
  it('returns array of options', () => {
    const options = getLicenseOptions()
    expect(Array.isArray(options)).toBe(true)
    expect(options.length).toBeGreaterThan(0)
  })

  it('each option has required fields', () => {
    const options = getLicenseOptions()
    options.forEach(option => {
      expect(option.value).toBeTruthy()
      expect(option.label).toBeTruthy()
      expect(option.group).toBeTruthy()
    })
  })

  it('includes common licenses first', () => {
    const options = getLicenseOptions()
    const firstFew = options.slice(0, 4)
    expect(firstFew.some(o => o.value === 'none')).toBe(true)
    expect(firstFew.some(o => o.value === 'cc-by')).toBe(true)
  })
})

// ============================================================================
// parseLicense TESTS
// ============================================================================

describe('parseLicense', () => {
  it('handles undefined and empty strings', () => {
    expect(parseLicense(undefined)).toBe('none')
    expect(parseLicense('')).toBe('none')
  })

  it('handles direct license IDs', () => {
    expect(parseLicense('mit')).toBe('mit')
    expect(parseLicense('cc-by')).toBe('cc-by')
    expect(parseLicense('apache-2.0')).toBe('apache-2.0')
  })

  it('handles MIT variations', () => {
    expect(parseLicense('MIT')).toBe('mit')
    expect(parseLicense('MIT License')).toBe('mit')
    expect(parseLicense('The MIT License')).toBe('mit')
  })

  it('handles Creative Commons variations', () => {
    expect(parseLicense('CC BY 4.0')).toBe('cc-by')
    expect(parseLicense('CC BY-SA 4.0')).toBe('cc-by-sa')
    expect(parseLicense('CC BY-NC 4.0')).toBe('cc-by-nc')
    expect(parseLicense('Creative Commons Attribution')).toBe('cc-by')
    expect(parseLicense('Creative Commons Attribution-ShareAlike')).toBe('cc-by-sa')
    expect(parseLicense('CC0')).toBe('cc0')
    expect(parseLicense('Public Domain')).toBe('cc0')
  })

  it('handles Apache variations', () => {
    expect(parseLicense('Apache 2.0')).toBe('apache-2.0')
    expect(parseLicense('Apache License 2.0')).toBe('apache-2.0')
    expect(parseLicense('Licensed under the Apache License, Version 2.0')).toBe('apache-2.0')
  })

  it('handles GPL variations', () => {
    expect(parseLicense('GPL 3')).toBe('gpl-3.0')
    expect(parseLicense('GPLv3')).toBe('gpl-3.0')
  })

  it('handles All Rights Reserved', () => {
    expect(parseLicense('All Rights Reserved')).toBe('commercial')
    expect(parseLicense('Copyright 2024. All rights reserved.')).toBe('commercial')
  })

  it('handles fair use', () => {
    expect(parseLicense('Fair Use')).toBe('fair-use')
    expect(parseLicense('Educational use only')).toBe('fair-use')
  })

  it('handles private/confidential', () => {
    expect(parseLicense('Private')).toBe('private')
    expect(parseLicense('Confidential')).toBe('private')
    expect(parseLicense('Internal Use Only')).toBe('private')
  })

  it('returns none for unknown licenses', () => {
    expect(parseLicense('Unknown License XYZ')).toBe('none')
    expect(parseLicense('Some Random Text')).toBe('none')
  })
})

// ============================================================================
// formatLicenseForFrontmatter TESTS
// ============================================================================

describe('formatLicenseForFrontmatter', () => {
  it('formats Creative Commons licenses with SPDX identifiers', () => {
    expect(formatLicenseForFrontmatter('cc-by')).toBe('CC-BY-4.0')
    expect(formatLicenseForFrontmatter('cc-by-sa')).toBe('CC-BY-SA-4.0')
    expect(formatLicenseForFrontmatter('cc-by-nc')).toBe('CC-BY-NC-4.0')
    expect(formatLicenseForFrontmatter('cc0')).toBe('CC0-1.0')
  })

  it('formats open source licenses with SPDX identifiers', () => {
    expect(formatLicenseForFrontmatter('mit')).toBe('MIT')
    expect(formatLicenseForFrontmatter('apache-2.0')).toBe('Apache-2.0')
    expect(formatLicenseForFrontmatter('gpl-3.0')).toBe('GPL-3.0')
    expect(formatLicenseForFrontmatter('bsd-3-clause')).toBe('BSD-3-Clause')
  })

  it('returns license ID for others', () => {
    expect(formatLicenseForFrontmatter('commercial')).toBe('commercial')
    expect(formatLicenseForFrontmatter('private')).toBe('private')
    expect(formatLicenseForFrontmatter('none')).toBe('none')
  })
})
