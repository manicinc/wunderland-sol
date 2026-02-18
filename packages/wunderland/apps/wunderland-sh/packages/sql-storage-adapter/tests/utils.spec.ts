import { describe, expect, it } from 'vitest';
import { normaliseParameters } from '../src/shared/parameterUtils.js';

describe('Parameter Utilities', () => {
  describe('normaliseParameters', () => {
    it('should handle undefined parameters', () => {
      const result = normaliseParameters(undefined);
      expect(result.named).toBeUndefined();
      expect(result.positional).toBeUndefined();
    });

    it('should handle null parameters', () => {
      const result = normaliseParameters(null);
      expect(result.named).toBeUndefined();
      expect(result.positional).toBeUndefined();
    });

    it('should handle empty object parameters', () => {
      const result = normaliseParameters({});
      expect(result.named).toEqual({});
      expect(result.positional).toBeUndefined();
    });

    it('should handle named parameters (object)', () => {
      const params = { name: 'John', age: 30 };
      const result = normaliseParameters(params);
      expect(result.named).toEqual(params);
      expect(result.positional).toBeUndefined();
    });

    it('should handle positional parameters (array)', () => {
      const params = ['John', 30, null];
      const result = normaliseParameters(params);
      expect(result.named).toBeUndefined();
      expect(result.positional).toEqual(params);
    });

    it('should handle empty array', () => {
      const result = normaliseParameters([]);
      expect(result.named).toBeUndefined();
      expect(result.positional).toEqual([]);
    });

    it('should handle array with various types', () => {
      const buffer = new Uint8Array([1, 2, 3]);
      const params = ['string', 123, null, buffer, { nested: 'object' }];
      const result = normaliseParameters(params);
      expect(result.named).toBeUndefined();
      expect(result.positional).toEqual(params);
    });

    it('should handle object with various value types', () => {
      const params = {
        string: 'value',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
        nested: { key: 'value' }
      };
      const result = normaliseParameters(params);
      expect(result.named).toEqual(params);
      expect(result.positional).toBeUndefined();
    });
  });
});
