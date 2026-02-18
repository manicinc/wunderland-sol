// File: backend/src/features/billing/lemonsqueezy.service.ts
/**
 * @file lemonsqueezy.service.ts
 * @description Helpers for interacting with the Lemon Squeezy API.
 */

import crypto from 'crypto';
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { appConfig } from '../../config/appConfig.js';
import { upsertUserFromSubscription } from '../auth/auth.service.js';
import { storeLemonSqueezyEvent } from '../auth/user.repository.js';
import {
  updateCheckoutSessionRecord,
  findCheckoutSessionById,
  findCheckoutSessionByLemonId,
  type CheckoutSessionRecord,
} from './checkout.repository.js';
import { PLAN_CATALOG } from '@framers/shared/planCatalog';

const LEMON_API_BASE = 'https://api.lemonsqueezy.com/v1';

const buildClient = (): AxiosInstance => {
  if (!appConfig.lemonsqueezy.enabled) {
    throw new Error('LEMONSQUEEZY_NOT_CONFIGURED');
  }
  return axios.create({
    baseURL: LEMON_API_BASE,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${appConfig.lemonsqueezy.apiKey}`,
    },
  });
};

export interface CreateCheckoutPayload {
  productId: string;
  variantId: string;
  planId: string;
  checkoutSessionId: string;
  email: string;
  successUrl?: string;
  cancelUrl?: string;
  userId: string;
}

export const createCheckoutSession = async (payload: CreateCheckoutPayload) => {
  const client = buildClient();
  const response = await client.post('/checkouts', {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email: payload.email,
          custom: {
            user_id: payload.userId,
            plan_id: payload.planId,
            checkout_session_id: payload.checkoutSessionId,
          },
        },
        checkout_options: {
          embed: false,
          media: false,
          logo_url: undefined,
        },
        redirect_url: payload.successUrl || appConfig.lemonsqueezy.defaultSuccessUrl || undefined,
        cancel_url: payload.cancelUrl || appConfig.lemonsqueezy.defaultCancelUrl || undefined,
      },
      relationships: {
        store: {
          data: {
            type: 'stores',
            id: appConfig.lemonsqueezy.storeId,
          },
        },
        product: {
          data: {
            type: 'products',
            id: payload.productId,
          },
        },
        variant: {
          data: {
            type: 'variants',
            id: payload.variantId,
          },
        },
      },
    },
  });

  const checkoutUrl = response.data?.data?.attributes?.url;
  const checkoutId = response.data?.data?.id;
  if (!checkoutUrl || !checkoutId) {
    throw new Error('LEMONSQUEEZY_CHECKOUT_URL_MISSING');
  }
  return { checkoutUrl, checkoutId };
};

export const verifyWebhookSignature = (payload: string, signature: string | undefined): boolean => {
  if (!appConfig.lemonsqueezy.webhookSecret) return false;
  if (!signature) return false;
  const digest = crypto
    .createHmac('sha256', appConfig.lemonsqueezy.webhookSecret)
    .update(payload, 'utf8')
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(digest, 'hex'));
};

interface LemonCustomData {
  user_id?: string;
  plan_id?: string;
  checkout_session_id?: string;
}

interface LemonCheckoutData {
  custom?: LemonCustomData;
}

interface LemonRelationships {
  order?: { data?: { id?: string } };
  product?: { data?: { id?: string } };
  checkout?: { data?: { id?: string } };
  customer?: { data?: { id?: string } };
}

interface LemonAttributes {
  status?: string;
  cancel_at?: string | null;
  renews_at?: string | null;
  expires_at?: string | null;
  user_email?: string;
  user_email_address?: string;
  checkout_data?: LemonCheckoutData;
}

interface LemonDataNode {
  id?: string;
  attributes?: LemonAttributes;
  relationships?: LemonRelationships;
}

interface LemonSqueezyWebhookData {
  meta?: { event_name?: string };
  data?: LemonDataNode;
}

export const handleSubscriptionWebhook = async (
  eventId: string,
  payload: string,
  parsed: LemonSqueezyWebhookData
): Promise<void> => {
  const eventName = parsed.meta?.event_name || 'unknown';
  const attributes: LemonAttributes = parsed.data?.attributes ?? {};
  const relationships: LemonRelationships = parsed.data?.relationships ?? {};
  const customData: LemonCustomData = attributes.checkout_data?.custom ?? {};

  const checkoutSessionId: string | undefined = customData?.checkout_session_id;
  const planId: string | undefined = customData?.plan_id;
  // userId is not currently required downstream
  const lemonCheckoutId: string | undefined = parsed.data?.id || relationships.checkout?.data?.id;
  const lemonSubscriptionId: string | undefined = relationships.order?.data?.id;
  const lemonCustomerId: string | undefined = relationships.customer?.data?.id;

  let checkoutStatus: CheckoutSessionRecord['status'] = 'pending';
  const normalizedStatus = (attributes.status || '').toLowerCase();
  if (normalizedStatus === 'active' || normalizedStatus === 'trialing') {
    checkoutStatus = 'paid';
  } else if (normalizedStatus === 'cancelled') {
    checkoutStatus = 'failed';
  } else if (normalizedStatus === 'expired') {
    checkoutStatus = 'expired';
  }

  let checkoutRecord = checkoutSessionId ? await findCheckoutSessionById(checkoutSessionId) : null;
  if (!checkoutRecord && lemonCheckoutId) {
    checkoutRecord = await findCheckoutSessionByLemonId(lemonCheckoutId);
  }

  if (checkoutRecord) {
    await updateCheckoutSessionRecord(checkoutRecord.id, {
      status: checkoutStatus,
      lemonCheckoutId: lemonCheckoutId ?? checkoutRecord.lemon_checkout_id ?? null,
      lemonSubscriptionId: lemonSubscriptionId ?? checkoutRecord.lemon_subscription_id ?? null,
      lemonCustomerId: lemonCustomerId ?? checkoutRecord.lemon_customer_id ?? null,
    });
  }

  await storeLemonSqueezyEvent({ id: eventId, eventName, payload, processed: checkoutStatus === 'paid' });

  const email = attributes.user_email || attributes.user_email_address || null;
  if (!email) {
    return;
  }

  const renewsAt = attributes?.renews_at ? Date.parse(attributes.renews_at) : null;
  const expiresAt = attributes?.expires_at ? Date.parse(attributes.expires_at) : null;
  type PlanCatalogItem = { metadata?: { tier?: string } };
  const plan: PlanCatalogItem | undefined = planId ? (PLAN_CATALOG as Record<string, PlanCatalogItem>)[planId] : undefined;

  await upsertUserFromSubscription({
    email,
    subscriptionStatus: normalizedStatus || 'active',
    subscriptionTier: plan?.metadata?.tier ?? (normalizedStatus === 'active' ? 'unlimited' : 'metered'),
    lemonSubscriptionId,
    lemonCustomerId,
    renewsAt,
    expiresAt,
  });
};
