/**
 * Plan Catalog Tests
 * @module __tests__/unit/lib/planCatalog.test
 *
 * Tests for Codex pricing plan catalog.
 */

import { describe, it, expect } from 'vitest'
import { getCodexPlans, type PlanCatalogEntry, type PlanId, type PriceType } from '@/lib/planCatalog'

describe('getCodexPlans', () => {
  let plans: PlanCatalogEntry[]

  beforeAll(() => {
    plans = getCodexPlans()
  })

  describe('structure', () => {
    it('returns an array of plans', () => {
      expect(Array.isArray(plans)).toBe(true)
    })

    it('returns exactly 2 plans', () => {
      expect(plans).toHaveLength(2)
    })

    it('each plan has required fields', () => {
      for (const plan of plans) {
        expect(plan).toHaveProperty('id')
        expect(plan).toHaveProperty('displayName')
        expect(plan).toHaveProperty('headline')
        expect(plan).toHaveProperty('priceUsd')
        expect(plan).toHaveProperty('priceType')
        expect(plan).toHaveProperty('bullets')
        expect(plan).toHaveProperty('targetAudience')
      }
    })
  })

  describe('Community Edition', () => {
    let community: PlanCatalogEntry

    beforeAll(() => {
      community = plans.find(p => p.id === 'codex-community')!
    })

    it('exists', () => {
      expect(community).toBeDefined()
    })

    it('has correct id', () => {
      expect(community.id).toBe('codex-community')
    })

    it('is free', () => {
      expect(community.priceUsd).toBe(0)
      expect(community.priceType).toBe('free')
    })

    it('has Community Edition display name', () => {
      expect(community.displayName).toBe('Community Edition')
    })

    it('has Free & Open Source headline', () => {
      expect(community.headline).toBe('Free & Open Source')
    })

    it('has bullets listing features', () => {
      expect(community.bullets.length).toBeGreaterThan(0)
    })

    it('bullets include semantic search', () => {
      expect(community.bullets.some(b => b.toLowerCase().includes('semantic search'))).toBe(true)
    })

    it('bullets include MIT license', () => {
      expect(community.bullets.some(b => b.toLowerCase().includes('mit'))).toBe(true)
    })

    it('has limitations defined', () => {
      expect(community.limitations).toBeDefined()
      expect(community.limitations!.length).toBeGreaterThan(0)
    })

    it('limitations include no AI Q&A', () => {
      expect(community.limitations!.some(l => l.toLowerCase().includes('ai') || l.toLowerCase().includes('q&a'))).toBe(true)
    })

    it('has target audience', () => {
      expect(community.targetAudience.length).toBeGreaterThan(0)
    })
  })

  describe('Premium Edition', () => {
    let premium: PlanCatalogEntry

    beforeAll(() => {
      premium = plans.find(p => p.id === 'codex-premium')!
    })

    it('exists', () => {
      expect(premium).toBeDefined()
    })

    it('has correct id', () => {
      expect(premium.id).toBe('codex-premium')
    })

    it('has one-time price type', () => {
      expect(premium.priceType).toBe('one-time')
    })

    it('has regular price of $149', () => {
      expect(premium.priceUsd).toBe(149)
    })

    it('has launch price of $49', () => {
      expect(premium.launchPriceUsd).toBe(49)
    })

    it('launch price is less than regular price', () => {
      expect(premium.launchPriceUsd!).toBeLessThan(premium.priceUsd)
    })

    it('has Premium Edition display name', () => {
      expect(premium.displayName).toBe('Premium Edition')
    })

    it('has bullets listing features', () => {
      expect(premium.bullets.length).toBeGreaterThan(0)
    })

    it('has more bullets than community', () => {
      const community = plans.find(p => p.id === 'codex-community')!
      expect(premium.bullets.length).toBeGreaterThan(community.bullets.length)
    })

    it('bullets include everything in Community', () => {
      expect(premium.bullets.some(b => b.toLowerCase().includes('everything'))).toBe(true)
    })

    it('bullets include AI features', () => {
      expect(premium.bullets.some(b => b.toLowerCase().includes('ai'))).toBe(true)
    })

    it('bullets include offline', () => {
      expect(premium.bullets.some(b => b.toLowerCase().includes('offline'))).toBe(true)
    })

    it('bullets include SQLite', () => {
      expect(premium.bullets.some(b => b.toLowerCase().includes('sqlite'))).toBe(true)
    })

    it('has no limitations', () => {
      expect(premium.limitations).toBeUndefined()
    })

    it('has target audience', () => {
      expect(premium.targetAudience.length).toBeGreaterThan(0)
    })
  })

  describe('type safety', () => {
    it('plan ids are valid PlanId type', () => {
      const validIds: PlanId[] = ['codex-community', 'codex-premium']
      for (const plan of plans) {
        expect(validIds).toContain(plan.id)
      }
    })

    it('price types are valid PriceType', () => {
      const validTypes: PriceType[] = ['free', 'one-time', 'subscription']
      for (const plan of plans) {
        expect(validTypes).toContain(plan.priceType)
      }
    })

    it('prices are non-negative numbers', () => {
      for (const plan of plans) {
        expect(typeof plan.priceUsd).toBe('number')
        expect(plan.priceUsd).toBeGreaterThanOrEqual(0)
      }
    })

    it('bullets are arrays of strings', () => {
      for (const plan of plans) {
        expect(Array.isArray(plan.bullets)).toBe(true)
        for (const bullet of plan.bullets) {
          expect(typeof bullet).toBe('string')
        }
      }
    })
  })

  describe('freshness', () => {
    it('returns new array on each call', () => {
      const plans1 = getCodexPlans()
      const plans2 = getCodexPlans()
      expect(plans1).not.toBe(plans2)
    })

    it('returns independent copies', () => {
      const plans1 = getCodexPlans()
      plans1[0].displayName = 'Modified'
      const plans2 = getCodexPlans()
      expect(plans2[0].displayName).not.toBe('Modified')
    })
  })
})
