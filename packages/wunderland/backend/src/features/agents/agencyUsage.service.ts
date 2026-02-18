import { generateId, getAppDatabase } from '../../core/database/appDatabase.js';
import { getPlanAgentLimits, resolvePlanIdForUser } from './userAgents.service.js';
import { findUserById } from '../auth/user.repository.js';
import type { PlanId } from '@framers/shared/planCatalog';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const RETENTION_MS = 18 * 30 * 24 * 60 * 60 * 1000; // ~18 months

export interface AgencyLaunchReservation {
  planId: PlanId;
  limit: number;
}

export const agencyUsageService = {
  async assertLaunchCapacity(userId: string, seatCount: number): Promise<AgencyLaunchReservation> {
    const user = await findUserById(userId);
    const planId = resolvePlanIdForUser(user ?? null);
    const limits = getPlanAgentLimits(planId);

    if ((limits.agencySeats ?? 0) > 0 && seatCount > (limits.agencySeats ?? 0)) {
      const error: any = new Error(
        `This plan supports up to ${limits.agencySeats} concurrent agency seats. Reduce participants or upgrade.`,
      );
      error.statusCode = 403;
      error.code = 'AGENCY_SEAT_LIMIT_REACHED';
      throw error;
    }

    const weeklyLimit = limits.agencyLaunchesPerWeek ?? 0;
    if (weeklyLimit <= 0) {
      const error: any = new Error('Your current plan does not include agency launches.');
      error.statusCode = 403;
      error.code = 'AGENCY_LAUNCH_UNAVAILABLE';
      throw error;
    }

    const db = getAppDatabase();
    const since = Date.now() - WEEK_MS;
    const usage = await db.get<{ total: number }>(
      'SELECT COUNT(1) AS total FROM agency_usage_log WHERE user_id = ? AND launched_at >= ?',
      [userId, since],
    );
    if ((usage?.total ?? 0) >= weeklyLimit) {
      const error: any = new Error(
        `Weekly agency launch limit reached (${weeklyLimit}). Try again next week or upgrade your plan.`,
      );
      error.statusCode = 403;
      error.code = 'AGENCY_WEEKLY_LIMIT_REACHED';
      throw error;
    }

    return { planId, limit: weeklyLimit };
  },

  async recordLaunch(args: {
    userId: string;
    planId: PlanId;
    workflowDefinitionId: string;
    agencyId?: string | null;
    seats: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const db = getAppDatabase();
    const now = Date.now();
    const expiresAt = now + RETENTION_MS;

    await db.run(
      `
        INSERT INTO agency_usage_log (
          id,
          user_id,
          plan_id,
          workflow_definition_id,
          agency_id,
          seats,
          launched_at,
          expires_at,
          metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        generateId(),
        args.userId,
        args.planId,
        args.workflowDefinitionId,
        args.agencyId ?? null,
        args.seats,
        now,
        expiresAt,
        args.metadata ? JSON.stringify(args.metadata) : null,
      ],
    );
  },
};

