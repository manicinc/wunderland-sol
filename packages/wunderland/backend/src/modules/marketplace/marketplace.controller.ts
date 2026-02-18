/**
 * @file marketplace.controller.ts
 * @description NestJS controller for marketplace agent listings.
 *
 * Delegates to the Express handlers defined in the marketplaceRouter
 * (features/marketplace/marketplace.routes.ts). Public GET routes use
 * the @Public() decorator; mutating routes require AuthGuard.
 */

import { Controller, Get, Post, Patch, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { marketplaceRouter } from '../../features/marketplace/marketplace.routes.js';

/**
 * Helper that dispatches a request through the Express marketplaceRouter.
 *
 * The router is a standard Express Router instance. We invoke its `handle`
 * method directly, which walks the route table and calls the matching
 * handler. This avoids duplicating validation and RBAC logic that already
 * lives in the Express handlers.
 */
function delegateToRouter(req: Request, res: Response): void {
  // Express Router instances are callable middleware (req, res, next).
  // Passing a no-op next ensures unmatched sub-paths yield a 404 from
  // Express rather than hanging.
  (marketplaceRouter as any)(req, res, (err?: unknown) => {
    if (err) {
      const status = typeof (err as any)?.status === 'number' ? (err as any).status : 500;
      const message = err instanceof Error ? err.message : 'Internal server error';
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    }
  });
}

@Controller('marketplace')
export class MarketplaceController {
  /**
   * List marketplace agents (public, no auth required).
   * GET /marketplace/agents
   */
  @Public()
  @Get('agents')
  listAgents(@Req() req: Request, @Res() res: Response): void {
    return delegateToRouter(req, res);
  }

  /**
   * Get a single marketplace agent by ID (public, no auth required).
   * GET /marketplace/agents/:id
   */
  @Public()
  @Get('agents/:id')
  getAgent(@Req() req: Request, @Res() res: Response): void {
    return delegateToRouter(req, res);
  }

  /**
   * Create a new marketplace listing (requires authentication).
   * POST /marketplace/agents
   */
  @UseGuards(AuthGuard)
  @Post('agents')
  createAgent(@Req() req: Request, @Res() res: Response): void {
    return delegateToRouter(req, res);
  }

  /**
   * Update an existing marketplace listing (requires authentication).
   * PATCH /marketplace/agents/:id
   */
  @UseGuards(AuthGuard)
  @Patch('agents/:id')
  updateAgent(@Req() req: Request, @Res() res: Response): void {
    return delegateToRouter(req, res);
  }
}
