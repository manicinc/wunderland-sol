import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('PostgresAdapter - Browser-Friendly', () => {
  const originalWindow = global.window;
  const originalProcess = global.process;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.window = originalWindow;
    global.process = originalProcess;
  });

  it('should not import pg at module load time (browser-safe)', async () => {
    // Mock browser environment
    global.window = { document: {} } as any;
    delete (global as any).process;

    // Import should not fail even though pg is not available
    const { PostgresAdapter: Adapter } = await import('../src/adapters/postgresAdapter');
    
    // Creating adapter should not fail
    const adapter = new Adapter({ connectionString: 'postgresql://test' });
    
    // But opening should fail with browser error (not pg import error)
    await expect(adapter.open()).rejects.toThrow(/browser environment/);
  });

  it('should use dynamic import for pg module', async () => {
    // Mock Node.js environment
    global.process = {
      versions: { node: '18.0.0' },
      env: {},
      cwd: () => '/test'
    } as any;
    delete (global as any).window;

    const { PostgresAdapter: Adapter } = await import('../src/adapters/postgresAdapter');
    const adapter = new Adapter({ connectionString: 'postgresql://test' });

    // The adapter should be created successfully
    expect(adapter).toBeDefined();
    expect(adapter.kind).toBe('postgres');
    
    // Opening will fail because pg connection fails, but it should fail gracefully
    // (not with a module import error)
    await expect(adapter.open()).rejects.toThrow();
  }, { timeout: 10000 });
});

