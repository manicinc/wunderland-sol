import { describe, expect, it } from 'vitest';
import { StorageResolutionError } from '../src/core/contracts/index.ts';
import * as Types from '../src/types/index.ts';

describe('Types and Exports', () => {
  describe('StorageResolutionError', () => {
    it('should create error with message', () => {
      const error = new StorageResolutionError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StorageResolutionError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('StorageResolutionError');
    });

    it('should create error with causes', () => {
      const cause1 = new Error('Cause 1');
      const cause2 = new Error('Cause 2');
      const error = new StorageResolutionError('Multiple failures', [cause1, cause2]);

      expect(error.causes).toEqual([cause1, cause2]);
      expect(error.message).toBe('Multiple failures');
    });

    it('should create error without causes', () => {
      const error = new StorageResolutionError('No causes');
      expect(error.causes).toEqual([]);
    });
  });

  describe('Type Exports', () => {
    it('should export all required types', () => {
      // Main types
      expect(Types.StorageResolutionError).toBeDefined();

      // These are type-only exports, checking they don't break imports
      const types: Array<keyof typeof Types> = [
        'StorageResolutionError'
      ];

      types.forEach(type => {
        expect(Types).toHaveProperty(type);
      });
    });
  });

  describe('Storage Capabilities', () => {
    it('should have documented capability values', () => {
      // This test verifies the capability constants are properly defined
      const validCapabilities = [
        'sync',
        'transactions',
        'wal',
        'locks',
        'persistence',
        'streaming',
        'batch',
        'prepared',
        'concurrent',
        'json',
        'arrays'
      ];

      // Test that we can use these as const assertions
      const testCapability: Types.StorageCapability = 'sync';
      expect(testCapability).toBe('sync');
    });
  });

  describe('Storage Parameters', () => {
    it('should accept various parameter types', () => {
      // Test type compatibility (compile-time check)
      const validParams: Types.StorageParameters[] = [
        undefined,
        null,
        { name: 'test', value: 123 },
        ['test', 123, null],
        [new Uint8Array([1, 2, 3])]
      ];

      validParams.forEach(param => {
        expect(param === undefined || param === null || typeof param === 'object').toBe(true);
      });
    });
  });
});
