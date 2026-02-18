import type { ISubscriptionService, ISubscriptionTier } from '@framers/agentos/services/user_auth/types';
import { PLAN_CATALOG, type PlanId } from '@framers/shared/planCatalog';
import { resolveUserAccessLevel, compareAccessLevels } from './agentos.access-control.js';
import type { AgentOSAccessLevel } from './agentos.persona-registry.js';

const ACCESS_LEVEL_TO_PLAN: Record<AgentOSAccessLevel, PlanId> = {
  public: 'free',
  metered: 'basic',
  global: 'global-pass',
  unlimited: 'organization',
};

const ACCESS_LEVEL_WEIGHT: Record<AgentOSAccessLevel, number> = {
  public: 0,
  metered: 1,
  global: 2,
  unlimited: 3,
};

export class AgentOSSubscriptionAdapter implements ISubscriptionService {
  async initialize(): Promise<void> {
    // No-op for now; plan catalog is already loaded.
  }

  async getUserSubscription(userId: string): Promise<ISubscriptionTier | null> {
    const level = resolveUserAccessLevel(userId);
    const planId = ACCESS_LEVEL_TO_PLAN[level] ?? 'free';
    const plan = PLAN_CATALOG[planId];
    if (!plan) {
      return null;
    }
    return {
      name: plan.displayName,
      level: ACCESS_LEVEL_WEIGHT[level],
      features: plan.bullets,
      isActive: level !== 'public',
    };
  }

  async getUserSubscriptionTier(userId: string): Promise<ISubscriptionTier | null> {
    return this.getUserSubscription(userId);
  }

  async validateAccess(userId: string, feature: string): Promise<boolean> {
    const level = resolveUserAccessLevel(userId);
    const required = parseFeatureRequirement(feature);
    if (!required) return true;
    return compareAccessLevels(level, required);
  }
}

const parseFeatureRequirement = (feature: string): AgentOSAccessLevel | null => {
  if (feature.startsWith('persona:')) {
    const [, requirement] = feature.split(':');
    if (requirement && ['public', 'metered', 'global', 'unlimited'].includes(requirement)) {
      return requirement as AgentOSAccessLevel;
    }
  }
  return null;
};

export const createAgentOSSubscriptionAdapter = (): ISubscriptionService => new AgentOSSubscriptionAdapter();


