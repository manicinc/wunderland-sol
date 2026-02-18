/**
 * @file utils.spec.ts
 * @description Tests for shared utility functions: canonicalization, hashing, and HTTP retry.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { canonicalizeAnchor, hashCanonicalAnchor } from '../src/utils/serialization.js';
import { fetchWithRetry } from '../src/utils/http-client.js';
import type { AnchorRecord } from '@framers/agentos';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockAnchor(overrides?: Partial<AnchorRecord>): AnchorRecord {
  return {
    id: 'anchor-001',
    merkleRoot: 'abc123def456',
    sequenceFrom: 1,
    sequenceTo: 10,
    eventCount: 10,
    timestamp: '2025-01-15T00:00:00.000Z',
    signature: 'mock-signature-base64',
    ...overrides,
  };
}

// =============================================================================
// canonicalizeAnchor
// =============================================================================

describe('canonicalizeAnchor', () => {
  it('should produce valid JSON with sorted keys', () => {
    const anchor = createMockAnchor();
    const canonical = canonicalizeAnchor(anchor);
    const parsed = JSON.parse(canonical);

    expect(Object.keys(parsed)).toEqual([
      'eventCount',
      'id',
      'merkleRoot',
      'sequenceFrom',
      'sequenceTo',
      'signature',
      'timestamp',
    ]);
  });

  it('should produce deterministic output for the same anchor', () => {
    const anchor = createMockAnchor();
    const a = canonicalizeAnchor(anchor);
    const b = canonicalizeAnchor(anchor);
    expect(a).toBe(b);
  });

  it('should exclude externalRef and providerResults', () => {
    const anchor = createMockAnchor({
      externalRef: 'rekor:12345',
      providerResults: [{ providerId: 'rekor', success: true }],
    });
    const canonical = canonicalizeAnchor(anchor);
    expect(canonical).not.toContain('externalRef');
    expect(canonical).not.toContain('providerResults');
  });

  it('should include all required fields', () => {
    const anchor = createMockAnchor();
    const canonical = canonicalizeAnchor(anchor);
    const parsed = JSON.parse(canonical);

    expect(parsed.id).toBe('anchor-001');
    expect(parsed.merkleRoot).toBe('abc123def456');
    expect(parsed.sequenceFrom).toBe(1);
    expect(parsed.sequenceTo).toBe(10);
    expect(parsed.eventCount).toBe(10);
    expect(parsed.signature).toBe('mock-signature-base64');
    expect(parsed.timestamp).toBe('2025-01-15T00:00:00.000Z');
  });

  it('should produce different output for different anchors', () => {
    const a = canonicalizeAnchor(createMockAnchor({ id: 'anchor-A' }));
    const b = canonicalizeAnchor(createMockAnchor({ id: 'anchor-B' }));
    expect(a).not.toBe(b);
  });
});

// =============================================================================
// hashCanonicalAnchor
// =============================================================================

describe('hashCanonicalAnchor', () => {
  it('should produce a 64-character hex string (SHA-256)', async () => {
    const anchor = createMockAnchor();
    const hash = await hashCanonicalAnchor(anchor);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should produce deterministic hashes', async () => {
    const anchor = createMockAnchor();
    const a = await hashCanonicalAnchor(anchor);
    const b = await hashCanonicalAnchor(anchor);
    expect(a).toBe(b);
  });

  it('should produce different hashes for different anchors', async () => {
    const a = await hashCanonicalAnchor(createMockAnchor({ id: 'anchor-A' }));
    const b = await hashCanonicalAnchor(createMockAnchor({ id: 'anchor-B' }));
    expect(a).not.toBe(b);
  });

  it('should be sensitive to field changes', async () => {
    const base = createMockAnchor();
    const modified = createMockAnchor({ merkleRoot: 'different-root' });
    const a = await hashCanonicalAnchor(base);
    const b = await hashCanonicalAnchor(modified);
    expect(a).not.toBe(b);
  });
});

// =============================================================================
// fetchWithRetry
// =============================================================================

describe('fetchWithRetry', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return response on successful first attempt', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    fetchMock.mockResolvedValue(mockResponse);

    const response = await fetchWithRetry('https://example.com/api', {}, {
      retries: 3,
      retryDelayMs: 10,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should return 4xx errors without retrying', async () => {
    const mockResponse = new Response('not found', { status: 404 });
    fetchMock.mockResolvedValue(mockResponse);

    const response = await fetchWithRetry('https://example.com/api', {}, {
      retries: 3,
      retryDelayMs: 10,
    });

    expect(response.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should retry on 5xx errors', async () => {
    const fail = new Response('error', { status: 500, statusText: 'Internal Server Error' });
    const success = new Response('ok', { status: 200 });

    fetchMock
      .mockResolvedValueOnce(fail)
      .mockResolvedValueOnce(fail)
      .mockResolvedValueOnce(success);

    const response = await fetchWithRetry('https://example.com/api', {}, {
      retries: 3,
      retryDelayMs: 10,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('should retry on network errors', async () => {
    const success = new Response('ok', { status: 200 });

    fetchMock
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(success);

    const response = await fetchWithRetry('https://example.com/api', {}, {
      retries: 3,
      retryDelayMs: 10,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should throw after exhausting all retries', async () => {
    const fail = new Response('error', { status: 503, statusText: 'Service Unavailable' });
    fetchMock.mockResolvedValue(fail);

    await expect(
      fetchWithRetry('https://example.com/api', {}, {
        retries: 2,
        retryDelayMs: 10,
      }),
    ).rejects.toThrow('HTTP 503');
  });

  it('should use default values when options not provided', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    fetchMock.mockResolvedValue(mockResponse);

    const response = await fetchWithRetry('https://example.com/api');
    expect(response.status).toBe(200);
  });

  it('should pass AbortSignal for timeout', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    fetchMock.mockResolvedValue(mockResponse);

    await fetchWithRetry('https://example.com/api', {}, { timeoutMs: 5000, retries: 0 });

    const callInit = fetchMock.mock.calls[0][1];
    expect(callInit.signal).toBeDefined();
  });
});
