import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import { createAgentOSRagRouter } from './rag.routes.js';

describe('createAgentOSRagRouter', () => {
  it('creates an Express router', () => {
    const router = createAgentOSRagRouter({
      isEnabled: () => false,
      ragService: {} as any,
    });

    expect(router).toBeTruthy();
    expect(typeof (router as any).use).toBe('function');
  });

  it('passes queryVariants and rewrite to ragService.query', async () => {
    const querySpy = vi.fn().mockResolvedValue({
      success: true,
      query: 'hello',
      chunks: [],
      totalResults: 0,
      processingTimeMs: 1,
    });

    const ragService = {
      query: querySpy,
    } as any;

    const app = express();
    app.use(express.json());
    app.use(
      '/api/agentos/rag',
      createAgentOSRagRouter({
        isEnabled: () => true,
        ragService,
      })
    );

    const server = app.listen(0);
    try {
      const address = server.address();
      const port =
        typeof address === 'object' && address && 'port' in address ? (address as any).port : null;
      expect(typeof port).toBe('number');

      const response = await fetch(`http://127.0.0.1:${port}/api/agentos/rag/query`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: 'hello',
          queryVariants: ['hi', 'greetings'],
          rewrite: { enabled: true, maxVariants: 2 },
        }),
      });

      expect(response.status).toBe(200);
      expect(querySpy).toHaveBeenCalledTimes(1);
      expect(querySpy.mock.calls[0]?.[0]).toMatchObject({
        query: 'hello',
        queryVariants: ['hi', 'greetings'],
        rewrite: { enabled: true, maxVariants: 2 },
      });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
