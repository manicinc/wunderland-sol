/**
 * License Types Tests
 * @module __tests__/unit/lib/license/types.test
 *
 * Tests for license type constants.
 */

import { describe, it, expect } from 'vitest'
import {
  LICENSE_TYPE_FEATURES,
  TRIAL_PERIOD_DAYS,
  LICENSE_CACHE_DURATION,
  LICENSE_REVALIDATION_INTERVAL,
  type LicenseType,
  type LicensedFeature,
} from '@/lib/license/types'

// ============================================================================
// LICENSE_TYPE_FEATURES
// ============================================================================

describe('LICENSE_TYPE_FEATURES', () => {
  describe('premium license', () => {
    it('has all features', () => {
      const premiumFeatures = LICENSE_TYPE_FEATURES.premium

      expect(premiumFeatures).toContain('quizzes')
      expect(premiumFeatures).toContain('flashcards')
      expect(premiumFeatures).toContain('qna')
      expect(premiumFeatures).toContain('export')
      expect(premiumFeatures).toContain('import')
      expect(premiumFeatures).toContain('advanced_themes')
      expect(premiumFeatures).toContain('desktop_app')
      expect(premiumFeatures).toContain('mobile_app')
      expect(premiumFeatures).toContain('priority_support')
      expect(premiumFeatures).toContain('offline_storage')
      expect(premiumFeatures).toContain('ai_generation')
    })

    it('has 11 features total', () => {
      expect(LICENSE_TYPE_FEATURES.premium.length).toBe(11)
    })
  })

  describe('trial license', () => {
    it('has basic features', () => {
      const trialFeatures = LICENSE_TYPE_FEATURES.trial

      expect(trialFeatures).toContain('quizzes')
      expect(trialFeatures).toContain('flashcards')
      expect(trialFeatures).toContain('qna')
      expect(trialFeatures).toContain('export')
      expect(trialFeatures).toContain('import')
    })

    it('does not have premium-only features', () => {
      const trialFeatures = LICENSE_TYPE_FEATURES.trial

      expect(trialFeatures).not.toContain('desktop_app')
      expect(trialFeatures).not.toContain('mobile_app')
      expect(trialFeatures).not.toContain('priority_support')
      expect(trialFeatures).not.toContain('offline_storage')
      expect(trialFeatures).not.toContain('ai_generation')
    })

    it('has 5 features total', () => {
      expect(LICENSE_TYPE_FEATURES.trial.length).toBe(5)
    })
  })

  describe('educational license', () => {
    it('has basic features plus advanced themes', () => {
      const eduFeatures = LICENSE_TYPE_FEATURES.educational

      expect(eduFeatures).toContain('quizzes')
      expect(eduFeatures).toContain('flashcards')
      expect(eduFeatures).toContain('qna')
      expect(eduFeatures).toContain('export')
      expect(eduFeatures).toContain('import')
      expect(eduFeatures).toContain('advanced_themes')
    })

    it('has 6 features total', () => {
      expect(LICENSE_TYPE_FEATURES.educational.length).toBe(6)
    })

    it('has more features than trial', () => {
      expect(LICENSE_TYPE_FEATURES.educational.length).toBeGreaterThan(
        LICENSE_TYPE_FEATURES.trial.length
      )
    })

    it('has fewer features than premium', () => {
      expect(LICENSE_TYPE_FEATURES.educational.length).toBeLessThan(
        LICENSE_TYPE_FEATURES.premium.length
      )
    })
  })

  it('trial features are subset of educational features', () => {
    for (const feature of LICENSE_TYPE_FEATURES.trial) {
      expect(LICENSE_TYPE_FEATURES.educational).toContain(feature)
    }
  })

  it('educational features are subset of premium features', () => {
    for (const feature of LICENSE_TYPE_FEATURES.educational) {
      expect(LICENSE_TYPE_FEATURES.premium).toContain(feature)
    }
  })

  it('all license types are defined', () => {
    const licenseTypes: LicenseType[] = ['premium', 'trial', 'educational']

    for (const type of licenseTypes) {
      expect(LICENSE_TYPE_FEATURES[type]).toBeDefined()
      expect(Array.isArray(LICENSE_TYPE_FEATURES[type])).toBe(true)
      expect(LICENSE_TYPE_FEATURES[type].length).toBeGreaterThan(0)
    }
  })

  it('all feature values are strings', () => {
    const licenseTypes: LicenseType[] = ['premium', 'trial', 'educational']

    for (const type of licenseTypes) {
      for (const feature of LICENSE_TYPE_FEATURES[type]) {
        expect(typeof feature).toBe('string')
      }
    }
  })
})

// ============================================================================
// CONSTANTS
// ============================================================================

describe('License Constants', () => {
  describe('TRIAL_PERIOD_DAYS', () => {
    it('is 14 days', () => {
      expect(TRIAL_PERIOD_DAYS).toBe(14)
    })

    it('is a positive integer', () => {
      expect(Number.isInteger(TRIAL_PERIOD_DAYS)).toBe(true)
      expect(TRIAL_PERIOD_DAYS).toBeGreaterThan(0)
    })

    it('is at least 7 days (reasonable trial)', () => {
      expect(TRIAL_PERIOD_DAYS).toBeGreaterThanOrEqual(7)
    })

    it('is less than 60 days (not too long)', () => {
      expect(TRIAL_PERIOD_DAYS).toBeLessThan(60)
    })
  })

  describe('LICENSE_CACHE_DURATION', () => {
    it('is 24 hours in milliseconds', () => {
      const expectedMs = 24 * 60 * 60 * 1000
      expect(LICENSE_CACHE_DURATION).toBe(expectedMs)
    })

    it('is 86400000 ms exactly', () => {
      expect(LICENSE_CACHE_DURATION).toBe(86400000)
    })

    it('is a positive integer', () => {
      expect(Number.isInteger(LICENSE_CACHE_DURATION)).toBe(true)
      expect(LICENSE_CACHE_DURATION).toBeGreaterThan(0)
    })

    it('is at least 1 hour', () => {
      const oneHour = 60 * 60 * 1000
      expect(LICENSE_CACHE_DURATION).toBeGreaterThanOrEqual(oneHour)
    })

    it('is less than 7 days', () => {
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      expect(LICENSE_CACHE_DURATION).toBeLessThan(sevenDays)
    })
  })

  describe('LICENSE_REVALIDATION_INTERVAL', () => {
    it('is 7 days in milliseconds', () => {
      const expectedMs = 7 * 24 * 60 * 60 * 1000
      expect(LICENSE_REVALIDATION_INTERVAL).toBe(expectedMs)
    })

    it('is 604800000 ms exactly', () => {
      expect(LICENSE_REVALIDATION_INTERVAL).toBe(604800000)
    })

    it('is a positive integer', () => {
      expect(Number.isInteger(LICENSE_REVALIDATION_INTERVAL)).toBe(true)
      expect(LICENSE_REVALIDATION_INTERVAL).toBeGreaterThan(0)
    })

    it('is at least 1 day', () => {
      const oneDay = 24 * 60 * 60 * 1000
      expect(LICENSE_REVALIDATION_INTERVAL).toBeGreaterThanOrEqual(oneDay)
    })

    it('is less than 30 days', () => {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000
      expect(LICENSE_REVALIDATION_INTERVAL).toBeLessThan(thirtyDays)
    })

    it('is longer than cache duration', () => {
      expect(LICENSE_REVALIDATION_INTERVAL).toBeGreaterThan(LICENSE_CACHE_DURATION)
    })
  })

  describe('relationship between constants', () => {
    it('revalidation interval is 7x cache duration', () => {
      expect(LICENSE_REVALIDATION_INTERVAL).toBe(LICENSE_CACHE_DURATION * 7)
    })

    it('trial period is 2 weeks (14 days)', () => {
      expect(TRIAL_PERIOD_DAYS).toBe(14)
    })

    it('cache duration in days is 1', () => {
      const cacheDays = LICENSE_CACHE_DURATION / (24 * 60 * 60 * 1000)
      expect(cacheDays).toBe(1)
    })

    it('revalidation interval in days is 7', () => {
      const revalidateDays = LICENSE_REVALIDATION_INTERVAL / (24 * 60 * 60 * 1000)
      expect(revalidateDays).toBe(7)
    })
  })
})
