/**
 * @file auth.guard.ts
 * @description Strict authentication guard. Rejects requests without a valid
 * JWT token. Apply with @UseGuards(AuthGuard) on controllers/routes that
 * require authenticated access.
 */

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import {
  extractAuthToken,
  populateOptionalAuthContext,
} from '../../features/auth/requestAuthContext.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip auth for routes marked with @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = extractAuthToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }

    await populateOptionalAuthContext(request);
    if ((request as any).user?.authenticated) {
      return true;
    }
    throw new UnauthorizedException('Invalid or expired session.');
  }
}
