/**
 * @file Tool permission provider for AgentOS integration
 */

import type { ISubscriptionService } from '../types.js';

export interface ToolPermissionContext {
  userId: string;
  toolId: string;
  toolName: string;
  requiredFeatures?: string[];
}

export interface ToolPermissionResult {
  allowed: boolean;
  reason?: string;
  missingFeatures?: string[];
}

/**
 * Provider that integrates subscription service with tool permissions
 */
export class ToolPermissionProvider {
  constructor(private subscriptionService: ISubscriptionService) {}

  async checkToolAccess(context: ToolPermissionContext): Promise<ToolPermissionResult> {
    const { userId, toolName, requiredFeatures } = context;

    if (!requiredFeatures || requiredFeatures.length === 0) {
      return { allowed: true };
    }

    const tier = await this.subscriptionService.getUserSubscription(userId);
    if (!tier) {
      return {
        allowed: false,
        reason: `User ${userId} has no active subscription`,
        missingFeatures: requiredFeatures,
      };
    }

    const userFeatures = new Set(tier.features || []);
    const missingFeatures = requiredFeatures.filter((f) => !userFeatures.has(f));

    if (missingFeatures.length > 0) {
      return {
        allowed: false,
        reason: `Tool '${toolName}' requires: ${missingFeatures.join(', ')}`,
        missingFeatures,
      };
    }

    return { allowed: true };
  }

  async getAccessibleTools(
    userId: string,
    tools: { id: string; name: string; requiredFeatures?: string[] }[]
  ): Promise<string[]> {
    const accessible: string[] = [];

    for (const tool of tools) {
      const result = await this.checkToolAccess({
        userId,
        toolId: tool.id,
        toolName: tool.name,
        requiredFeatures: tool.requiredFeatures,
      });

      if (result.allowed) {
        accessible.push(tool.id);
      }
    }

    return accessible;
  }
}

