/**
 * @file hitl.routes.ts
 * @description Express routes for AgentOS Human-in-the-Loop (HITL).
 *
 * This router is intentionally generic and host-agnostic:
 * - Agents (running in-process) request approvals/clarifications via the injected HITL manager.
 * - Humans/UI approve/reject/respond via these endpoints.
 * - Authentication is optionally enforced via an injected `hitlAuthRequired()` implementation.
 */

import express from 'express';
import type { NextFunction, Request, Response, Router } from 'express';
import type { ApprovalDecision, ClarificationResponse } from '@framers/agentos/core/hitl';
import type { IHumanInteractionManager } from '@framers/agentos/core/hitl';

export type HitlAuthRequiredFn = () => { enabled: boolean; secret?: string };
export type GetHitlManagerFn = () => IHumanInteractionManager;

export type AgentOSHITLRouterDeps = {
  getHitlManager: GetHitlManagerFn;
  hitlAuthRequired: HitlAuthRequiredFn;
};

export const createAgentOSHITLRouter = (deps: AgentOSHITLRouterDeps): Router => {
  const router: Router = express.Router();

  const requireHitlSecret = (req: Request, res: Response, next: NextFunction): void => {
    const { enabled, secret } = deps.hitlAuthRequired();
    if (!enabled) return next();

    const provided = String(req.header('x-agentos-hitl-secret') || '').trim();
    if (provided && provided === secret) return next();

    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Missing or invalid HITL secret header (x-agentos-hitl-secret).',
    });
  };

  router.get('/pending', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const hitl = deps.getHitlManager();
      const pending = await hitl.getPendingRequests();
      res.json({ success: true, data: pending });
    } catch (err) {
      next(err);
    }
  });

  router.get('/approvals', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const hitl = deps.getHitlManager();
      const pending = await hitl.getPendingRequests();
      res.json({
        success: true,
        data: { approvals: pending.approvals, total: pending.approvals.length },
      });
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/approvals/:actionId/approve',
    requireHitlSecret,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const hitl = deps.getHitlManager();
        const actionId = String(req.params.actionId || '').trim();
        if (!actionId) {
          return res
            .status(400)
            .json({ success: false, error: 'INVALID_PARAMS', message: 'actionId is required' });
        }

        const decidedBy = typeof req.body?.decidedBy === 'string' ? req.body.decidedBy : 'user';
        const instructions =
          typeof req.body?.instructions === 'string' ? req.body.instructions : undefined;
        const feedback = typeof req.body?.feedback === 'string' ? req.body.feedback : undefined;

        const decision: ApprovalDecision = {
          actionId,
          approved: true,
          decidedBy,
          decidedAt: new Date(),
          instructions,
          feedback,
        };

        await hitl.submitApprovalDecision(decision);
        return res.json({ success: true, data: decision });
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    '/approvals/:actionId/reject',
    requireHitlSecret,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const hitl = deps.getHitlManager();
        const actionId = String(req.params.actionId || '').trim();
        if (!actionId) {
          return res
            .status(400)
            .json({ success: false, error: 'INVALID_PARAMS', message: 'actionId is required' });
        }

        const decidedBy = typeof req.body?.decidedBy === 'string' ? req.body.decidedBy : 'user';
        const reason = typeof req.body?.reason === 'string' ? req.body.reason : 'Rejected';
        const feedback = typeof req.body?.feedback === 'string' ? req.body.feedback : undefined;
        const selectedAlternativeId =
          typeof req.body?.selectedAlternativeId === 'string'
            ? req.body.selectedAlternativeId
            : undefined;

        const decision: ApprovalDecision = {
          actionId,
          approved: false,
          decidedBy,
          decidedAt: new Date(),
          rejectionReason: reason,
          feedback,
          selectedAlternativeId,
        };

        await hitl.submitApprovalDecision(decision);
        return res.json({ success: true, data: decision });
      } catch (err) {
        next(err);
      }
    }
  );

  router.get('/clarifications', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const hitl = deps.getHitlManager();
      const pending = await hitl.getPendingRequests();
      res.json({
        success: true,
        data: { clarifications: pending.clarifications, total: pending.clarifications.length },
      });
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/clarifications/:requestId/respond',
    requireHitlSecret,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const hitl = deps.getHitlManager();
        const requestId = String(req.params.requestId || '').trim();
        if (!requestId) {
          return res
            .status(400)
            .json({ success: false, error: 'INVALID_PARAMS', message: 'requestId is required' });
        }

        const respondedBy =
          typeof req.body?.respondedBy === 'string' ? req.body.respondedBy : 'user';
        const selectedOptionId =
          typeof req.body?.selectedOptionId === 'string' ? req.body.selectedOptionId : undefined;
        const freeformResponse =
          typeof req.body?.freeformResponse === 'string' ? req.body.freeformResponse : undefined;

        const response: ClarificationResponse = {
          requestId,
          respondedBy,
          respondedAt: new Date(),
          selectedOptionId,
          freeformResponse,
        };

        await hitl.submitClarification(response);
        return res.json({ success: true, data: response });
      } catch (err) {
        next(err);
      }
    }
  );

  router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const hitl = deps.getHitlManager();
      const pending = await hitl.getPendingRequests();
      const stats = hitl.getStatistics();
      res.json({
        success: true,
        data: {
          pending: {
            approvals: pending.approvals.length,
            clarifications: pending.clarifications.length,
            edits: pending.edits.length,
            escalations: pending.escalations.length,
            checkpoints: pending.checkpoints.length,
            total:
              pending.approvals.length +
              pending.clarifications.length +
              pending.edits.length +
              pending.escalations.length +
              pending.checkpoints.length,
          },
          totals: stats,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() } });
  });

  return router;
};
