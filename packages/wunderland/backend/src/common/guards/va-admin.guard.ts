/**
 * @file va-admin.guard.ts
 * @description Guard that restricts access to VA (Virtual Assistant) admin users only.
 * Requires the request user to have isVaAdmin set to true in their JWT claims.
 */

import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class VaAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user?.authenticated) {
      throw new ForbiddenException('Authentication required.');
    }

    if (!user.isVaAdmin) {
      throw new ForbiddenException('VA Admin access required.');
    }

    return true;
  }
}
