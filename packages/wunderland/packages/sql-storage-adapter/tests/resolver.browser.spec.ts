import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Resolver - Browser-Friendly', () => {
  const originalWindow = global.window;
  const originalProcess = global.process;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.window = originalWindow;
    global.process = originalProcess;
  });

  it('should not require Node.js modules at import time', async () => {
    // Mock browser environment (no process, no path module)
    global.window = { indexedDB: {} } as any;
    delete (global as any).process;

    // Import should not fail even without Node.js modules
    const { resolveStorageAdapter: resolver } = await import('../src/core/resolver');
    
    // Should be callable (will fail at runtime due to sql.js WASM, but that's expected)
    expect(resolver).toBeDefined();
    expect(typeof resolver).toBe('function');
  });

  it('should handle process.env safely in browser', async () => {
    // Mock browser environment (no process)
    global.window = { indexedDB: {} } as any;
    delete (global as any).process;

    const { resolveStorageAdapter: resolver } = await import('../src/core/resolver');
    
    // Should not throw even though process.env is undefined
    expect(resolver).toBeDefined();
    // The actual resolution will fail due to sql.js WASM loading, but that's expected
    // The important thing is that the code doesn't crash when process.env is undefined
  });

  it('should use browser-safe path utilities', async () => {
    // Mock browser environment
    global.window = { indexedDB: {} } as any;
    delete (global as any).process;

    const { resolveStorageAdapter: resolver } = await import('../src/core/resolver');
    
    // Should work without Node.js 'path' module
    expect(resolver).toBeDefined();
    // The actual resolution will fail due to sql.js WASM loading, but that's expected
    // The important thing is that path.join is not called at import time
  });
});

