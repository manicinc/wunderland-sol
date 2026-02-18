/**
 * @file types.ts
 * @description Shared types for anchor provider implementations.
 */

/**
 * Base configuration shared by all anchor providers.
 */
export interface BaseProviderConfig {
  /** Request timeout in milliseconds. Default: 30000. */
  timeoutMs?: number;
  /** Number of retries on transient failures. Default: 3. */
  retries?: number;
  /** Base delay between retries in milliseconds. Default: 1000. */
  retryDelayMs?: number;
}

/**
 * Resolve a base config with defaults.
 */
export function resolveBaseConfig(config?: Partial<BaseProviderConfig>): Required<BaseProviderConfig> {
  return {
    timeoutMs: config?.timeoutMs ?? 30_000,
    retries: config?.retries ?? 3,
    retryDelayMs: config?.retryDelayMs ?? 1_000,
  };
}
