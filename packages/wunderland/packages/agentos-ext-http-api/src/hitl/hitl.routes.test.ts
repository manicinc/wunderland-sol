import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import { createAgentOSHITLRouter } from './hitl.routes.js';

describe('createAgentOSHITLRouter', () => {
  it('requires x-agentos-hitl-secret when enabled', async () => {
    const hitl = {
      getPendingRequests: vi.fn().mockResolvedValue({
        approvals: [],
        clarifications: [],
        edits: [],
        escalations: [],
        checkpoints: [],
      }),
      submitApprovalDecision: vi.fn().mockResolvedValue(undefined),
      submitClarification: vi.fn().mockResolvedValue(undefined),
      getStatistics: vi.fn().mockReturnValue({ approvals: 0, clarifications: 0 }),
    } as any;

    const app = express();
    app.use(express.json());
    app.use(
      '/api/agentos/hitl',
      createAgentOSHITLRouter({
        getHitlManager: () => hitl,
        hitlAuthRequired: () => ({ enabled: true, secret: 'secret123' }),
      })
    );

    const server = app.listen(0);
    try {
      const address = server.address();
      const port =
        typeof address === 'object' && address && 'port' in address ? (address as any).port : null;
      expect(typeof port).toBe('number');

      const response = await fetch(
        `http://127.0.0.1:${port}/api/agentos/hitl/approvals/action_1/approve`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ decidedBy: 'tester' }),
        }
      );

      expect(response.status).toBe(401);
      expect(hitl.submitApprovalDecision).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('submits an approval decision when authorized', async () => {
    const hitl = {
      getPendingRequests: vi.fn().mockResolvedValue({
        approvals: [],
        clarifications: [],
        edits: [],
        escalations: [],
        checkpoints: [],
      }),
      submitApprovalDecision: vi.fn().mockResolvedValue(undefined),
      submitClarification: vi.fn().mockResolvedValue(undefined),
      getStatistics: vi.fn().mockReturnValue({ approvals: 0, clarifications: 0 }),
    } as any;

    const app = express();
    app.use(express.json());
    app.use(
      '/api/agentos/hitl',
      createAgentOSHITLRouter({
        getHitlManager: () => hitl,
        hitlAuthRequired: () => ({ enabled: true, secret: 'secret123' }),
      })
    );

    const server = app.listen(0);
    try {
      const address = server.address();
      const port =
        typeof address === 'object' && address && 'port' in address ? (address as any).port : null;
      expect(typeof port).toBe('number');

      const response = await fetch(
        `http://127.0.0.1:${port}/api/agentos/hitl/approvals/action_1/approve`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-agentos-hitl-secret': 'secret123',
          },
          body: JSON.stringify({ decidedBy: 'tester', instructions: 'ok' }),
        }
      );

      expect(response.status).toBe(200);
      expect(hitl.submitApprovalDecision).toHaveBeenCalledTimes(1);
      const decision = hitl.submitApprovalDecision.mock.calls[0]?.[0] as any;
      expect(decision.actionId).toBe('action_1');
      expect(decision.approved).toBe(true);
      expect(decision.decidedBy).toBe('tester');
      expect(decision.instructions).toBe('ok');
      expect(decision.decidedAt).toBeInstanceOf(Date);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
