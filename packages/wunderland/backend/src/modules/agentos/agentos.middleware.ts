/**
 * @file agentos.middleware.ts
 * @description NestJS middleware that bridges the existing AgentOS Express
 * router into the NestJS request pipeline.
 *
 * The AgentOS integration layer exposes a full Express {@link Router} with
 * many sub-routes (core CRUD, streaming SSE, agency coordination). Rather
 * than re-implementing each route as a NestJS controller method, this
 * middleware lazily initialises the Express router on first request and
 * delegates all subsequent requests to it.
 *
 * Lazy initialisation is used because AgentOS boot involves asynchronous
 * work (persona loading, storage adapter setup, provenance key generation)
 * that should not block NestJS application startup.
 *
 * @example
 * ```ts
 * // In the module's configure() method:
 * consumer.apply(AgentOSMiddleware).forRoutes('agentos');
 * ```
 */

import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import {
  isAgentOSEnabled,
  getAgentOSRouter,
} from '../../integrations/agentos/agentos.integration.js';
import { populateOptionalAuthContext } from '../../features/auth/requestAuthContext.js';

/**
 * Cached promise for the Express router initialisation.
 * Ensures we only call {@link getAgentOSRouter} once, even under concurrent requests.
 */
let routerPromise: Promise<any> | null = null;

/**
 * Resolved Express router instance. After the first successful initialisation
 * this is used directly, avoiding repeated `await` overhead.
 */
let resolvedRouter: any = null;

/**
 * Middleware that forwards incoming requests to the AgentOS Express router.
 *
 * When AgentOS is disabled (`AGENTOS_ENABLED` is not `true`), the middleware
 * immediately calls `next()` so the request falls through to NestJS's own
 * 404 handling.
 */
@Injectable()
export class AgentOSMiddleware implements NestMiddleware {
  /**
   * Process an incoming HTTP request.
   *
   * @param req  - Express request object
   * @param res  - Express response object
   * @param next - Express next function; called when AgentOS is disabled
   *               or when the router does not match the request
   */
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!isAgentOSEnabled()) {
      return next();
    }

    // AgentOS routes are mounted via Express middleware, so Nest guards do not run.
    // Populate `req.user` here to keep behavior consistent with the rest of the API.
    try {
      await populateOptionalAuthContext(req);
    } catch {
      // Optional auth must never block AgentOS routes.
    }

    if (!resolvedRouter) {
      if (!routerPromise) {
        routerPromise = getAgentOSRouter();
      }
      resolvedRouter = await routerPromise;
    }

    resolvedRouter(req, res, next);
  }
}
