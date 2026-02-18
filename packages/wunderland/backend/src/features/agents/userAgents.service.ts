import { PLAN_CATALOG, type PlanId } from '@framers/shared/planCatalog';
import { userAgentsRepository } from './userAgents.repository.js';
import { findUserById } from '../auth/user.repository.js';

// cspell:ignore normalise

const CREATION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface UserAgentInput {
  label: string;
  slug?: string | null;
  config: Record<string, unknown>;
}

export interface UpdateUserAgentInput {
  label?: string;
  slug?: string | null;
  status?: string;
  config?: Record<string, unknown>;
  archived?: boolean;
}

export interface AgentLimitSnapshot {
  maxActiveAgents: number;
  monthlyCreationAllowance: number;
  knowledgeDocumentsPerAgent: number;
  agencySeats: number;
  agencyLaunchesPerWeek: number;
  planId: PlanId;
}

const DEFAULT_LIMITS: AgentLimitSnapshot = {
  maxActiveAgents: 1,
  monthlyCreationAllowance: 1,
  knowledgeDocumentsPerAgent: 0,
  agencySeats: 0,
  agencyLaunchesPerWeek: 0,
  planId: 'free',
};

const PLAN_BY_TIER: Record<string, PlanId> = {
  unlimited: 'creator',
  metered: 'basic',
  none: 'free',
};

const PLAN_BY_MODE: Record<string, PlanId> = {
  global: 'global-pass',
};

const normaliseLabel = (label: string): string => label.trim();

interface ServiceError extends Error {
  statusCode: number;
  code: string;
}

const createServiceError = (message: string, statusCode: number, code: string): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const resolvePlanIdForUser = (user: Awaited<ReturnType<typeof findUserById>>): PlanId => {
  if (!user) {
    return 'free';
  }

  if (user.subscription_plan_id) {
    const planId = user.subscription_plan_id as PlanId;
    if (PLAN_CATALOG[planId]) {
      return planId;
    }
  }

  const tierPlan = PLAN_BY_TIER[user.subscription_tier] ?? null;
  if (tierPlan && PLAN_CATALOG[tierPlan]) {
    return tierPlan;
  }

  const statusPlan = PLAN_BY_MODE[user.subscription_status] ?? null;
  if (statusPlan && PLAN_CATALOG[statusPlan]) {
    return statusPlan;
  }

  return 'free';
};

export const getPlanAgentLimits = (planId: PlanId): AgentLimitSnapshot => {
  const entry = PLAN_CATALOG[planId];
  const limits = entry?.metadata?.agentLimits;
  if (!limits) {
    return { ...DEFAULT_LIMITS, planId };
  }
  return {
    planId,
    maxActiveAgents: limits.maxActiveAgents,
    monthlyCreationAllowance: limits.monthlyCreationAllowance,
    knowledgeDocumentsPerAgent: limits.knowledgeDocumentsPerAgent,
    agencySeats: limits.agencySeats ?? 0,
    agencyLaunchesPerWeek: limits.agencyLaunchesPerWeek ?? 0,
  };
};

const assertCreationCapacity = async (userId: string, limits: AgentLimitSnapshot) => {
  const activeCount = await userAgentsRepository.countActive(userId);
  if (activeCount >= limits.maxActiveAgents) {
    const message =
      limits.maxActiveAgents === 0
        ? 'Custom agents are not available on your current plan.'
        : `You have reached the limit of ${limits.maxActiveAgents} active agents for your plan.`;
    throw createServiceError(message, 403, 'AGENT_LIMIT_REACHED');
  }

  const since = Date.now() - CREATION_WINDOW_MS;
  const createdCount = await userAgentsRepository.countCreationsSince(userId, since);
  if (createdCount >= limits.monthlyCreationAllowance) {
    throw createServiceError(
      'Monthly agent creation allowance exhausted for your plan.',
      403,
      'AGENT_CREATION_QUOTA_EXCEEDED',
    );
  }
};

export const userAgentsService = {
  async list(userId: string) {
    return userAgentsRepository.listByUser(userId);
  },

  async get(userId: string, agentId: string) {
    return userAgentsRepository.getById(userId, agentId);
  },

  async create(userId: string, input: UserAgentInput) {
    const user = await findUserById(userId);
    if (!user) {
  throw createServiceError('User account not found.', 404, 'USER_NOT_FOUND');
    }

    const planId = resolvePlanIdForUser(user);
    const limits = getPlanAgentLimits(planId);
    await assertCreationCapacity(userId, limits);

    const label = normaliseLabel(input.label);
    const slug = input.slug ? slugify(input.slug) : slugify(label);

    return userAgentsRepository.create({
      userId,
      label,
      slug,
      planId,
      config: input.config,
    });
  },

  async update(userId: string, agentId: string, updates: UpdateUserAgentInput) {
    const existing = await userAgentsRepository.getById(userId, agentId);
    if (!existing) {
  throw createServiceError('Agent not found.', 404, 'AGENT_NOT_FOUND');
    }

    const payload = {
      id: agentId,
      userId,
      label: typeof updates.label === 'string' ? normaliseLabel(updates.label) : undefined,
      slug: typeof updates.slug !== 'undefined'
        ? updates.slug
          ? slugify(updates.slug)
          : null
        : undefined,
      status: updates.status,
      config: updates.config,
      archivedAt: typeof updates.archived !== 'undefined'
        ? (updates.archived ? Date.now() : null)
        : undefined,
    };

    if (updates.status === 'active' && existing.status !== 'active') {
      const user = await findUserById(userId);
      const planId = resolvePlanIdForUser(user ?? null);
      const limits = getPlanAgentLimits(planId);
      await assertCreationCapacity(userId, limits);
    }

    return userAgentsRepository.update(payload);
  },

  async remove(userId: string, agentId: string) {
    await userAgentsRepository.delete(userId, agentId);
  },

  async getPlanSnapshot(userId: string) {
    const user = await findUserById(userId);
    const planId = resolvePlanIdForUser(user ?? null);
    const limits = getPlanAgentLimits(planId);
    const active = await userAgentsRepository.countActive(userId);
    const creations = await userAgentsRepository.countCreationsSince(userId, Date.now() - CREATION_WINDOW_MS);
    return {
      planId,
      limits,
      usage: {
        activeAgents: active,
        monthlyCreations: creations,
      },
    };
  },
};
