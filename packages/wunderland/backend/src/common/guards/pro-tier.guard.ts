/**
 * @file pro-tier.guard.ts
 * @description Guard that restricts access to Pro-tier (or higher) subscribers.
 * Checks subscription_status and subscription plan from JWT claims.
 */

import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class ProTierGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user?.authenticated) {
      throw new ForbiddenException('Authentication required.');
    }

    // VA admins always have access (they're staff)
    if (user.isVaAdmin) {
      return true;
    }

    // Global access users have full access
    if (user.role === 'global' || user.tier === 'unlimited') {
      return true;
    }

    const status = user.subscriptionStatus || user.subscription_status || 'none';
    const isActive = status === 'active' || status === 'trialing' || status === 'unlimited';

    if (!isActive) {
      throw new ForbiddenException(
        'An active Pro or Enterprise subscription is required for human VA support.'
      );
    }

    return true;
  }
}
