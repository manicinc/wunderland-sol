/**
 * @file Cost API route handlers.
 * @description Handles requests to the /api/cost endpoint for cost tracking and management.
 * @version 1.2.0 - Added session-aware user resolution for public and authenticated callers.
 */

import { Request, Response } from 'express';
import { CostService, ISessionCostDetail } from '../../core/cost/cost.service.js';
import { resolveSessionUserId } from '../../utils/session.utils.js';

/**
 * Handle GET /api/cost - Get current session cost and related details.
 */
export async function GET(req: Request, res: Response): Promise<void> {
  try {
    const userId = resolveSessionUserId(req, (req.query.userId as string | undefined) ?? undefined);
    const sessionCostDetail: ISessionCostDetail = CostService.getSessionCost(userId);

    console.log(`CostRoutes: GET request for userId: ${userId}. Session cost: $${sessionCostDetail.totalCost.toFixed(6)}`);

    res.status(200).json({
      userId,
      sessionCost: sessionCostDetail.totalCost,
      costsByService: sessionCostDetail.costsByService,
      sessionStartTime: sessionCostDetail.sessionStartTime.toISOString(),
      entryCount: sessionCostDetail.entries.length,
      globalMonthlyCost: CostService.getGlobalMonthlyCost(),
      threshold: parseFloat(process.env.COST_THRESHOLD_USD_PER_SESSION || '2.00'),
      isThresholdReached: CostService.isSessionCostThresholdReached(userId),
    });
  } catch (error: any) {
    console.error('Cost Routes: Error in GET /api/cost:', error.message, error.stack ? `\nStack: ${error.stack}` : '');
    res.status(500).json({
      message: 'Error retrieving cost information.',
      error: 'COST_RETRIEVAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handle POST /api/cost - Reset session cost or perform other cost-related actions.
 */
export async function POST(req: Request, res: Response): Promise<void> {
  try {
    const requestingUserId = resolveSessionUserId(req);
    const { userId: targetUserIdParam, action = 'reset' } = req.body as { userId?: string; action?: string };

    const targetUserId = targetUserIdParam ? String(targetUserIdParam) : requestingUserId;

    console.log(`CostRoutes: POST request. Action: "${action}" for targetUserId: "${targetUserId}". Requested by: "${requestingUserId}"`);

    if (action === 'reset') {
      CostService.resetSessionCost(targetUserId);
      const newSessionDetail = CostService.getSessionCost(targetUserId);

      res.status(200).json({
        message: `Session cost reset successfully for user '${targetUserId}'.`,
        sessionCost: newSessionDetail.totalCost,
        sessionStartTime: newSessionDetail.sessionStartTime.toISOString(),
        costsByService: newSessionDetail.costsByService,
      });
    } else if (action === 'reset_global') {
      if (process.env.NODE_ENV !== 'development') {
        console.warn(`CostRoutes: Attempt to reset global costs by user '${requestingUserId}' in non-development environment DENIED.`);
        res.status(403).json({
          message: 'Global cost reset is restricted and not allowed under current conditions.',
          error: 'FORBIDDEN_ACTION',
        });
        return;
      }

      CostService.resetGlobalMonthlyCost();
      console.log(`CostRoutes: Global monthly cost reset initiated by '${requestingUserId}'.`);
      res.status(200).json({
        message: 'Global monthly cost reset successfully.',
        globalMonthlyCost: CostService.getGlobalMonthlyCost(),
      });
    } else {
      res.status(400).json({
        message: `Invalid action specified: '${action}'. Supported actions: 'reset', 'reset_global (dev only)'.`,
        error: 'INVALID_ACTION',
      });
    }
  } catch (error: any) {
    console.error('Cost Routes: Error in POST /api/cost:', error.message, error.stack ? `\nStack: ${error.stack}` : '');
    res.status(500).json({
      message: 'Error processing cost action.',
      error: 'COST_ACTION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
