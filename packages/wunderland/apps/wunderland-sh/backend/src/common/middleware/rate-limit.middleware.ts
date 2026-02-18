/**
 * @file rate-limit.middleware.ts
 * @description NestJS middleware wrapping the existing rateLimiter instance.
 * Applies IP-based rate limiting to all API routes for unauthenticated users.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { rateLimiter } from '../../../middleware/ratelimiter.js';

/** Cached Express middleware function from the rate limiter. */
let rateLimitMiddlewareFn: ((req: Request, res: Response, next: NextFunction) => void) | null =
  null;

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (!rateLimitMiddlewareFn) {
      rateLimitMiddlewareFn = rateLimiter.middleware();
    }
    rateLimitMiddlewareFn(req, res, next);
  }
}
