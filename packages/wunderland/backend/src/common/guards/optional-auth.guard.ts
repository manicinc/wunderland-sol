/**
 * @file optional-auth.guard.ts
 * @description Global guard that attempts to authenticate but never rejects.
 * Populates req.user with authenticated user data if a valid token is present,
 * otherwise sets req.user to a default unauthenticated state.
 */

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { populateOptionalAuthContext } from '../../features/auth/requestAuthContext.js';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    await populateOptionalAuthContext(request);
    return true;
  }
}
