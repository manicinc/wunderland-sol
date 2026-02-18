/**
 * @file credits.routes.ts
 * @description GET /api/credits — returns the full credit snapshot for the current user.
 *              Works for both authenticated and unauthenticated users.
 */

import { Request, Response } from 'express';
import {
  creditAllocationService,
  type CreditContext,
} from '../../core/cost/creditAllocation.service.js';
import { resolveSessionUserId } from '../../utils/session.utils.js';

export async function GET(req: Request, res: Response): Promise<void> {
  try {
    const userContext = (req as any)?.user;
    const userId = resolveSessionUserId(req);

    const creditContext: CreditContext = {
      isAuthenticated: Boolean(userContext?.authenticated),
      tier: userContext?.tier,
      mode: userContext?.mode,
    };

    creditAllocationService.syncProfile(userId, creditContext);
    const snapshot = creditAllocationService.getSnapshot(userId, creditContext);

    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    res.status(200).json({
      userId,
      allocationKey: snapshot.allocationKey,
      llm: snapshot.llm,
      speech: snapshot.speech,
      resetAt: endOfDay.toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Credits Routes: Error in GET /api/credits:', error.message);
    res.status(500).json({
      message: 'Error retrieving credit information.',
      error: 'CREDITS_RETRIEVAL_ERROR',
    });
  }
}
