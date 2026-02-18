/**
 * @file Tests for SubscriptionAdapter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SubscriptionAdapter } from '../src/adapters/SubscriptionAdapter.js';

describe('SubscriptionAdapter', () => {
  let subscriptions: SubscriptionAdapter;

  beforeEach(() => {
    subscriptions = new SubscriptionAdapter({
      defaultTier: 'free',
      tiers: [
        { name: 'free', level: 0, features: [], isActive: true },
        { name: 'basic', level: 1, features: ['FEATURE_A'], isActive: true },
        { name: 'pro', level: 2, features: ['FEATURE_A', 'FEATURE_B'], isActive: true },
        { name: 'enterprise', level: 3, features: ['FEATURE_A', 'FEATURE_B', 'FEATURE_C'], isActive: true },
      ],
    });
  });

  describe('User Tier Management', () => {
    it('should return default tier for new user', async () => {
      const tier = await subscriptions.getUserSubscription('user123');

      expect(tier).toBeTruthy();
      expect(tier?.name).toBe('free');
      expect(tier?.level).toBe(0);
    });

    it('should set and get user tier', async () => {
      subscriptions.setUserTier('user123', 'pro');

      const tier = await subscriptions.getUserSubscription('user123');
      expect(tier?.name).toBe('pro');
      expect(tier?.level).toBe(2);
    });

    it('should throw error for invalid tier', () => {
      expect(() => {
        subscriptions.setUserTier('user123', 'invalid-tier');
      }).toThrow();
    });

    it('should return null for empty userId', async () => {
      const tier = await subscriptions.getUserSubscription('');
      expect(tier).toBeNull();
    });
  });

  describe('Tier Information', () => {
    it('should get tier by name', async () => {
      const tier = await subscriptions.getTierByName('pro');

      expect(tier).toBeTruthy();
      expect(tier?.name).toBe('pro');
      expect(tier?.level).toBe(2);
      expect(tier?.features).toContain('FEATURE_A');
      expect(tier?.features).toContain('FEATURE_B');
    });

    it('should return null for unknown tier', async () => {
      const tier = await subscriptions.getTierByName('unknown');
      expect(tier).toBeNull();
    });

    it('should list all tiers in order', async () => {
      const tiers = await subscriptions.listTiers();

      expect(tiers).toHaveLength(4);
      expect(tiers[0].name).toBe('free');
      expect(tiers[1].name).toBe('basic');
      expect(tiers[2].name).toBe('pro');
      expect(tiers[3].name).toBe('enterprise');

      // Check they're sorted by level
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i].level).toBeGreaterThan(tiers[i - 1].level);
      }
    });
  });

  describe('Feature Access', () => {
    it('should allow access to feature in tier', async () => {
      subscriptions.setUserTier('user123', 'pro');

      const hasFeatureA = await subscriptions.validateAccess('user123', 'FEATURE_A');
      const hasFeatureB = await subscriptions.validateAccess('user123', 'FEATURE_B');

      expect(hasFeatureA).toBe(true);
      expect(hasFeatureB).toBe(true);
    });

    it('should deny access to feature not in tier', async () => {
      subscriptions.setUserTier('user123', 'basic');

      const hasFeatureB = await subscriptions.validateAccess('user123', 'FEATURE_B');
      expect(hasFeatureB).toBe(false);
    });

    it('should deny access for user with no tier', async () => {
      const hasFeature = await subscriptions.validateAccess('', 'FEATURE_A');
      expect(hasFeature).toBe(false);
    });
  });

  describe('Tier Comparison', () => {
    it('should validate user meets minimum tier', async () => {
      subscriptions.setUserTier('user123', 'pro');

      const meetsBasic = await subscriptions.validateTierAccess('user123', 'basic');
      expect(meetsBasic).toBe(true);

      const meetsPro = await subscriptions.validateTierAccess('user123', 'pro');
      expect(meetsPro).toBe(true);
    });

    it('should reject user below minimum tier', async () => {
      subscriptions.setUserTier('user123', 'basic');

      const meetsPro = await subscriptions.validateTierAccess('user123', 'pro');
      expect(meetsPro).toBe(false);
    });

    it('should handle unknown minimum tier', async () => {
      subscriptions.setUserTier('user123', 'pro');

      const result = await subscriptions.validateTierAccess('user123', 'unknown');
      expect(result).toBe(false);
    });
  });

  describe('Tier Management', () => {
    it('should add new tier', async () => {
      subscriptions.addTier({
        name: 'custom',
        level: 4,
        features: ['FEATURE_CUSTOM'],
        isActive: true,
      });

      const tier = await subscriptions.getTierByName('custom');
      expect(tier).toBeTruthy();
      expect(tier?.level).toBe(4);
    });

    it('should update existing tier', async () => {
      subscriptions.addTier({
        name: 'pro',
        level: 2,
        features: ['FEATURE_A', 'FEATURE_B', 'FEATURE_NEW'],
        isActive: true,
      });

      const tier = await subscriptions.getTierByName('pro');
      expect(tier?.features).toContain('FEATURE_NEW');
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(subscriptions.initialize()).resolves.not.toThrow();
    });
  });
});

