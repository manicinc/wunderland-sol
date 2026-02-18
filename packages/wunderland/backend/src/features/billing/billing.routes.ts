// File: backend/src/features/billing/billing.routes.ts
/**
 * @file billing.routes.ts
 * @description REST handlers for subscription checkout and webhooks.
 */

import type { Request, Response } from 'express';
import { appConfig } from '../../config/appConfig.js';
import {
  createCheckoutSession,
  verifyWebhookSignature,
  handleSubscriptionWebhook,
} from './lemonsqueezy.service.js';
import {
  createCheckoutSessionRecord,
  updateCheckoutSessionRecord,
  findCheckoutSessionById,
} from './checkout.repository.js';
import { PLAN_CATALOG, type PlanId, type PlanCatalogEntry } from '@framers/shared/planCatalog';
import { findUserById } from '../auth/user.repository.js';
import { createSessionForUser } from '../auth/auth.service.js';

const resolvePlan = (planId: string | undefined): PlanCatalogEntry | null => {
  if (!planId) return null;
  return (PLAN_CATALOG as Record<string, PlanCatalogEntry | undefined>)[planId] ?? null;
};

export const postCheckoutSession = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }
  if (user.mode === 'global') {
    res.status(403).json({ message: 'Global access users do not require a subscription.' });
    return;
  }
  if (!user.email) {
    res.status(400).json({ message: 'User email is required to start checkout.' });
    return;
  }

  const { planId, successUrl, cancelUrl, clientSessionId } = req.body as {
    planId?: PlanId;
    successUrl?: string;
    cancelUrl?: string;
    clientSessionId?: string;
  };

  const plan = resolvePlan(planId);
  if (!plan) {
    res.status(400).json({ message: 'Unknown plan.' });
    return;
  }
  const lemonDescriptor = plan.checkout.find((entry) => entry.provider === 'lemonsqueezy');
  if (!lemonDescriptor) {
    res.status(503).json({ message: 'Plan is not configured for billing.' });
    return;
  }
  const productId = process.env[lemonDescriptor.productEnvVar];
  const variantId = lemonDescriptor.variantEnvVar ? process.env[lemonDescriptor.variantEnvVar] : undefined;
  if (!productId || !variantId) {
    res.status(503).json({ message: 'Plan is missing Lemon Squeezy product or variant IDs.' });
    return;
  }
  if (!appConfig.lemonsqueezy.enabled) {
    res.status(503).json({ message: 'Billing is not configured.' });
    return;
  }

  const userId = user.sub ?? user.id;
  try {
    const record = await createCheckoutSessionRecord({ userId, planId: plan.id, sessionId: clientSessionId });
    const { checkoutUrl, checkoutId } = await createCheckoutSession({
      variantId,
      productId,
      planId: plan.id,
      checkoutSessionId: record.id,
      email: user.email,
      successUrl,
      cancelUrl,
      userId,
    });

    await updateCheckoutSessionRecord(record.id, {
      status: 'pending',
      lemonCheckoutId: checkoutId,
    });

    res.status(200).json({ checkoutUrl, checkoutSessionId: record.id });
  } catch (error: any) {
    console.error('[Billing] Failed to create checkout session:', error);
    res.status(500).json({ message: 'Failed to create checkout session.', error: error?.message ?? 'UNKNOWN_ERROR' });
  }
};

export const getCheckoutStatus = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  const { checkoutId } = req.params as { checkoutId: string };
  const record = await findCheckoutSessionById(checkoutId);
  if (!record) {
    res.status(404).json({ message: 'Checkout session not found.' });
    return;
  }

  const userId = user.sub ?? user.id;
  if (!userId || record.user_id !== userId) {
    res.status(403).json({ message: 'Not allowed to access this checkout session.' });
    return;
  }

  const responsePayload: any = {
    status: record.status,
    planId: record.plan_id,
  };

  if (record.status === 'paid') {
    const dbUser = await findUserById(record.user_id);
    if (dbUser) {
      const session = createSessionForUser(dbUser, { mode: 'standard' });
      responsePayload.token = session.token;
      responsePayload.user = session.user;
      await updateCheckoutSessionRecord(record.id, { status: 'complete' });
    }
  }

  res.status(200).json(responsePayload);
};

export const postLemonWebhook = async (req: Request, res: Response): Promise<void> => {
  if (!appConfig.lemonsqueezy.webhookSecret) {
    res.status(503).json({ message: 'Webhook secret not configured.' });
    return;
  }
  const signature = (req.headers['x-signature'] || req.headers['x-lemonsqueezy-signature']) as string | undefined;
  const eventId = (req.headers['x-event-id'] || req.headers['x-lemonsqueezy-event-id'] || req.body?.meta?.event_id || Date.now().toString()) as string;
  const payloadString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  if (!verifyWebhookSignature(payloadString, signature)) {
    res.status(401).json({ message: 'Invalid signature.' });
    return;
  }

  try {
    await handleSubscriptionWebhook(eventId, payloadString, typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as any));
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[Billing] Failed to process Lemon Squeezy webhook:', error);
    res.status(500).json({ message: 'Failed to process webhook.', error: error.message });
  }
};
