/**
 * @file http-client.ts
 * @description Shared HTTP fetch wrapper with retry and timeout for anchor providers.
 */

export interface HttpRequestOptions {
  /** Request timeout in milliseconds. */
  timeoutMs?: number;
  /** Number of retries on transient failures (5xx, network errors). */
  retries?: number;
  /** Base delay between retries in milliseconds (exponential backoff). */
  retryDelayMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1_000;

/**
 * Fetch with exponential backoff retry on transient failures.
 *
 * @param url - The URL to fetch.
 * @param init - Standard RequestInit options.
 * @param options - Retry and timeout configuration.
 * @returns The fetch Response.
 * @throws On non-transient errors or after all retries exhausted.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  options?: HttpRequestOptions,
): Promise<Response> {
  const maxRetries = options?.retries ?? DEFAULT_RETRIES;
  const baseDelay = options?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Don't retry client errors (4xx), only server errors (5xx)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Server error — retry
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry aborted requests (timeout)
      if (lastError.name === 'AbortError') {
        lastError = new Error(`Request timed out after ${timeoutMs}ms`);
      }
    }

    // Exponential backoff before next retry
    if (attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error('Request failed after all retries');
}
