/**
 * @file billing.controller.ts
 * @description NestJS controller for subscription billing endpoints. Delegates
 * to the existing Express route handlers via the passthrough pattern (@Req/@Res)
 * to maintain full API compatibility during the migration.
 *
 * Routes migrated:
 *   POST /billing/checkout            -> postCheckoutSession  (authenticated)
 *   GET  /billing/status/:checkoutId  -> getCheckoutStatus    (authenticated)
 *   POST /billing/webhook             -> postLemonWebhook     (public - webhook)
 */

import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  Body,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import {
  postCheckoutSession,
  getCheckoutStatus,
  postLemonWebhook,
} from '../../features/billing/billing.routes.js';
import { findUserById, updateUserStripeSubscription } from '../../features/auth/user.repository.js';

/**
 * Handles all `/billing` prefixed routes for subscription management.
 *
 * Checkout and status endpoints require authentication via {@link AuthGuard}.
 * The webhook endpoint is public because it receives callbacks from the
 * payment provider (Lemon Squeezy).
 */
@Controller('billing')
export class BillingController {
  /**
   * POST /billing/checkout
   * Creates a new checkout session for the authenticated user. Requires a
   * valid subscription plan and configured billing provider.
   */
  @UseGuards(AuthGuard)
  @Post('checkout')
  async checkout(@Req() req: Request, @Res() res: Response): Promise<void> {
    return postCheckoutSession(req, res);
  }

  /**
   * GET /billing/status/:checkoutId
   * Retrieves the status of a previously created checkout session. On
   * successful payment, returns a fresh auth token for the upgraded user.
   */
  @UseGuards(AuthGuard)
  @Get('status/:checkoutId')
  async getStatus(
    @Param('checkoutId') _checkoutId: string,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    return getCheckoutStatus(req, res);
  }

  /**
   * POST /billing/webhook
   * Receives and processes Lemon Squeezy webhook events (e.g. subscription
   * created/updated). Public endpoint -- signature verification is handled
   * within the route handler itself.
   */
  @Public()
  @Post('webhook')
  async webhook(@Req() req: Request, @Res() res: Response): Promise<void> {
    return postLemonWebhook(req, res);
  }

  /**
   * PATCH /billing/subscription-update
   *
   * Internal endpoint used by the Next.js Stripe webhook/sync layer
   * to persist subscription status into the backend user record. Protected via
   * `X-Internal-Secret` header.
   */
  @Public()
  @Patch('subscription-update')
  @HttpCode(HttpStatus.OK)
  async stripeSubscriptionUpdate(
    @Req() req: Request,
    @Body()
    body: {
      userId?: string;
      status?: string;
      planId?: string | null;
      stripeCustomerId?: string | null;
      stripeSubscriptionId?: string | null;
    }
  ): Promise<{ ok: true }> {
    const expectedSecret = process.env.INTERNAL_API_SECRET || '';
    if (!expectedSecret) {
      throw new ForbiddenException('Internal API secret is not configured.');
    }

    const providedSecret = String(req.headers['x-internal-secret'] || '');
    if (!providedSecret || providedSecret !== expectedSecret) {
      throw new ForbiddenException('Forbidden.');
    }

    const userId = body?.userId;
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('userId is required.');
    }

    const statusRaw = body?.status;
    if (!statusRaw || typeof statusRaw !== 'string') {
      throw new BadRequestException('status is required.');
    }

    const normalizedStatus =
      statusRaw.trim().toLowerCase() === 'cancelled' ? 'canceled' : statusRaw.trim().toLowerCase();

    const planId = body?.planId ?? null;
    if (planId !== null && typeof planId !== 'string') {
      throw new BadRequestException('planId must be a string or null.');
    }

    const stripeCustomerId = body?.stripeCustomerId ?? null;
    if (stripeCustomerId !== null && typeof stripeCustomerId !== 'string') {
      throw new BadRequestException('stripeCustomerId must be a string or null.');
    }

    const stripeSubscriptionId = body?.stripeSubscriptionId ?? null;
    if (stripeSubscriptionId !== null && typeof stripeSubscriptionId !== 'string') {
      throw new BadRequestException('stripeSubscriptionId must be a string or null.');
    }

    const existing = await findUserById(userId);
    if (!existing) {
      throw new NotFoundException('User not found.');
    }

    await updateUserStripeSubscription(userId, {
      status: normalizedStatus,
      planId,
      stripeCustomerId,
      stripeSubscriptionId,
    });

    return { ok: true };
  }
}
