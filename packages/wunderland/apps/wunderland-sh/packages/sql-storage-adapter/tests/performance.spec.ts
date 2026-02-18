/**
 * Unit tests for Performance Configuration System
 * 
 * @module @framers/sql-storage-adapter/tests/performance
 */

import { describe, it, expect } from 'vitest';
import {
  resolvePerformanceConfig,
  isTransientError,
  TIER_DEFAULTS,
  type PerformanceConfig,
  type PerformanceTier,
} from '../src/core/contracts/performance';

describe('Performance Configuration', () => {
  describe('resolvePerformanceConfig', () => {
    it('should return balanced tier defaults when no config provided', () => {
      const settings = resolvePerformanceConfig();
      
      expect(settings).toEqual(TIER_DEFAULTS.balanced);
    });
    
    it('should return fast tier defaults when tier is fast', () => {
      const settings = resolvePerformanceConfig({ tier: 'fast' });
      
      expect(settings).toEqual(TIER_DEFAULTS.fast);
      expect(settings.cacheEnabled).toBe(true);
      expect(settings.cacheTtlMs).toBe(30000);
      expect(settings.validateSql).toBe(false);
    });
    
    it('should return accurate tier defaults when tier is accurate', () => {
      const settings = resolvePerformanceConfig({ tier: 'accurate' });
      
      expect(settings).toEqual(TIER_DEFAULTS.accurate);
      expect(settings.cacheEnabled).toBe(false);
      expect(settings.validateSql).toBe(true);
      expect(settings.retryOnError).toBe(true);
    });
    
    it('should return efficient tier defaults when tier is efficient', () => {
      const settings = resolvePerformanceConfig({ tier: 'efficient' });
      
      expect(settings).toEqual(TIER_DEFAULTS.efficient);
      expect(settings.batchWrites).toBe(true);
      expect(settings.batchFlushIntervalMs).toBe(500);
    });
    
    it('should merge custom overrides with tier defaults', () => {
      const config: PerformanceConfig = {
        tier: 'balanced',
        cacheTtlMs: 10000, // Override
        trackMetrics: false, // Override
      };
      
      const settings = resolvePerformanceConfig(config);
      
      // Overridden values
      expect(settings.cacheTtlMs).toBe(10000);
      expect(settings.trackMetrics).toBe(false);
      
      // Defaults from balanced tier
      expect(settings.cacheEnabled).toBe(true);
      expect(settings.validateSql).toBe(true);
    });
    
    it('should handle custom tier with all defaults', () => {
      const settings = resolvePerformanceConfig({ tier: 'custom' });
      
      // Custom tier uses conservative defaults
      expect(settings.cacheEnabled).toBe(false);
      expect(settings.batchWrites).toBe(false);
      expect(settings.validateSql).toBe(true);
    });
    
    it('should handle custom tier with full overrides', () => {
      const config: PerformanceConfig = {
        tier: 'custom',
        cacheEnabled: true,
        cacheTtlMs: 5000,
        cacheMaxEntries: 100,
        batchWrites: true,
        batchFlushIntervalMs: 200,
        batchMaxSize: 25,
        validateSql: false,
        trackMetrics: true,
        slowQueryThresholdMs: 150,
        retryOnError: true,
        maxRetries: 5,
        retryDelayMs: 250,
      };
      
      const settings = resolvePerformanceConfig(config);
      
      expect(settings.cacheEnabled).toBe(true);
      expect(settings.cacheTtlMs).toBe(5000);
      expect(settings.cacheMaxEntries).toBe(100);
      expect(settings.batchWrites).toBe(true);
      expect(settings.batchFlushIntervalMs).toBe(200);
      expect(settings.batchMaxSize).toBe(25);
      expect(settings.validateSql).toBe(false);
      expect(settings.trackMetrics).toBe(true);
      expect(settings.slowQueryThresholdMs).toBe(150);
      expect(settings.retryOnError).toBe(true);
      expect(settings.maxRetries).toBe(5);
      expect(settings.retryDelayMs).toBe(250);
    });
  });
  
  describe('TIER_DEFAULTS', () => {
    it('should have all expected tiers', () => {
      const tiers: Exclude<PerformanceTier, 'custom'>[] = ['fast', 'balanced', 'accurate', 'efficient'];
      
      tiers.forEach(tier => {
        expect(TIER_DEFAULTS[tier]).toBeDefined();
      });
    });
    
    it('should have correct properties for each tier', () => {
      const requiredKeys = [
        'cacheEnabled',
        'cacheTtlMs',
        'cacheMaxEntries',
        'batchWrites',
        'batchFlushIntervalMs',
        'batchMaxSize',
        'validateSql',
        'trackMetrics',
        'slowQueryThresholdMs',
        'retryOnError',
        'maxRetries',
        'retryDelayMs',
      ];
      
      Object.values(TIER_DEFAULTS).forEach(tierSettings => {
        requiredKeys.forEach(key => {
          expect(tierSettings).toHaveProperty(key);
        });
      });
    });
    
    it('should have fast tier optimized for speed', () => {
      const fast = TIER_DEFAULTS.fast;
      
      expect(fast.cacheEnabled).toBe(true);
      expect(fast.cacheTtlMs).toBeGreaterThan(TIER_DEFAULTS.balanced.cacheTtlMs);
      expect(fast.validateSql).toBe(false);
      expect(fast.trackMetrics).toBe(false);
    });
    
    it('should have accurate tier optimized for correctness', () => {
      const accurate = TIER_DEFAULTS.accurate;
      
      expect(accurate.cacheEnabled).toBe(false);
      expect(accurate.batchWrites).toBe(false);
      expect(accurate.validateSql).toBe(true);
      expect(accurate.maxRetries).toBeGreaterThan(TIER_DEFAULTS.balanced.maxRetries);
    });
    
    it('should have efficient tier optimized for battery/bandwidth', () => {
      const efficient = TIER_DEFAULTS.efficient;
      
      expect(efficient.batchWrites).toBe(true);
      expect(efficient.batchFlushIntervalMs).toBeGreaterThan(TIER_DEFAULTS.balanced.batchFlushIntervalMs);
      expect(efficient.cacheTtlMs).toBeGreaterThan(TIER_DEFAULTS.balanced.cacheTtlMs);
    });
  });
  
  describe('isTransientError', () => {
    it('should return false for non-Error values', () => {
      expect(isTransientError('error string')).toBe(false);
      expect(isTransientError(null)).toBe(false);
      expect(isTransientError(undefined)).toBe(false);
      expect(isTransientError(42)).toBe(false);
    });
    
    it('should return true for timeout errors', () => {
      expect(isTransientError(new Error('Connection timeout'))).toBe(true);
      expect(isTransientError(new Error('Query timeout exceeded'))).toBe(true);
      expect(isTransientError(new Error('ETIMEDOUT'))).toBe(true);
    });
    
    it('should return true for connection errors', () => {
      expect(isTransientError(new Error('Connection reset by peer'))).toBe(true);
      expect(isTransientError(new Error('ECONNRESET'))).toBe(true);
      expect(isTransientError(new Error('Connection refused'))).toBe(true);
      expect(isTransientError(new Error('ECONNREFUSED'))).toBe(true);
    });
    
    it('should return true for network errors', () => {
      expect(isTransientError(new Error('Network error'))).toBe(true);
      expect(isTransientError(new Error('Network unavailable'))).toBe(true);
    });
    
    it('should return true for deadlock errors', () => {
      expect(isTransientError(new Error('Deadlock detected'))).toBe(true);
      expect(isTransientError(new Error('Lock wait timeout exceeded'))).toBe(true);
    });
    
    it('should return true for connection pool errors', () => {
      expect(isTransientError(new Error('Too many connections'))).toBe(true);
      expect(isTransientError(new Error('Connection pool exhausted'))).toBe(true);
    });
    
    it('should return true for database busy errors', () => {
      expect(isTransientError(new Error('Database is busy'))).toBe(true);
      expect(isTransientError(new Error('Resource temporarily unavailable'))).toBe(true);
    });
    
    it('should return false for permanent errors', () => {
      expect(isTransientError(new Error('Syntax error in SQL'))).toBe(false);
      expect(isTransientError(new Error('Table does not exist'))).toBe(false);
      expect(isTransientError(new Error('Unique constraint violation'))).toBe(false);
      expect(isTransientError(new Error('Foreign key violation'))).toBe(false);
    });
    
    it('should be case-insensitive', () => {
      expect(isTransientError(new Error('TIMEOUT'))).toBe(true);
      expect(isTransientError(new Error('DEADLOCK'))).toBe(true);
      expect(isTransientError(new Error('NETWORK ERROR'))).toBe(true);
    });
  });
});



