/**
 * @file types.spec.ts
 * @description Tests for shared types and config resolution.
 */

import { describe, it, expect } from 'vitest';
import { resolveBaseConfig } from '../src/types.js';
import type { BaseProviderConfig } from '../src/types.js';

describe('resolveBaseConfig', () => {
  it('should return defaults when no config provided', () => {
    const resolved = resolveBaseConfig();
    expect(resolved.timeoutMs).toBe(30_000);
    expect(resolved.retries).toBe(3);
    expect(resolved.retryDelayMs).toBe(1_000);
  });

  it('should return defaults when empty object provided', () => {
    const resolved = resolveBaseConfig({});
    expect(resolved.timeoutMs).toBe(30_000);
    expect(resolved.retries).toBe(3);
    expect(resolved.retryDelayMs).toBe(1_000);
  });

  it('should override specific fields', () => {
    const config: Partial<BaseProviderConfig> = {
      timeoutMs: 5000,
      retries: 1,
    };
    const resolved = resolveBaseConfig(config);
    expect(resolved.timeoutMs).toBe(5000);
    expect(resolved.retries).toBe(1);
    expect(resolved.retryDelayMs).toBe(1_000); // default
  });

  it('should override all fields', () => {
    const config: BaseProviderConfig = {
      timeoutMs: 10_000,
      retries: 5,
      retryDelayMs: 500,
    };
    const resolved = resolveBaseConfig(config);
    expect(resolved.timeoutMs).toBe(10_000);
    expect(resolved.retries).toBe(5);
    expect(resolved.retryDelayMs).toBe(500);
  });

  it('should return a Required<BaseProviderConfig>', () => {
    const resolved = resolveBaseConfig();
    // All fields should be defined (not undefined)
    expect(typeof resolved.timeoutMs).toBe('number');
    expect(typeof resolved.retries).toBe('number');
    expect(typeof resolved.retryDelayMs).toBe('number');
  });
});
