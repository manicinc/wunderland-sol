/**
 * @file Persona tier provider for AgentOS integration
 */

import type { ISubscriptionService, ISubscriptionTier } from '../types.js';

export interface PersonaTierContext {
  userId: string;
  personaId: string;
  minimumTier?: string;
}

export interface PersonaTierResult {
  allowed: boolean;
  reason?: string;
  userTier?: ISubscriptionTier | null;
  requiredTier?: string;
}

/**
 * Provider that integrates subscription service with persona tier requirements
 */
export class PersonaTierProvider {
  constructor(private subscriptionService: ISubscriptionService) {}

  async checkPersonaAccess(context: PersonaTierContext): Promise<PersonaTierResult> {
    const { userId, personaId, minimumTier } = context;

    if (!minimumTier) {
      return { allowed: true };
    }

    const userTier = await this.subscriptionService.getUserSubscription(userId);
    if (!userTier) {
      return {
        allowed: false,
        reason: `User ${userId} has no active subscription`,
        userTier: null,
        requiredTier: minimumTier,
      };
    }

    const requiredTierInfo = await this.subscriptionService.getTierByName?.(minimumTier);
    if (!requiredTierInfo) {
      return { allowed: true, userTier };
    }

    if (userTier.level < requiredTierInfo.level) {
      return {
        allowed: false,
        reason: `Persona '${personaId}' requires '${minimumTier}' tier`,
        userTier,
        requiredTier: minimumTier,
      };
    }

    return { allowed: true, userTier };
  }

  async getAccessiblePersonas(
    userId: string,
    personas: { id: string; minimumTier?: string }[]
  ): Promise<string[]> {
    const accessible: string[] = [];

    for (const persona of personas) {
      const result = await this.checkPersonaAccess({
        userId,
        personaId: persona.id,
        minimumTier: persona.minimumTier,
      });

      if (result.allowed) {
        accessible.push(persona.id);
      }
    }

    return accessible;
  }
}

