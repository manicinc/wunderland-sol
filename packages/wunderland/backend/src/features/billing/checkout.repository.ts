// File: backend/src/features/billing/checkout.repository.ts
/**
 * @file checkout.repository.ts
 * @description Persistence helpers for Lemon Squeezy checkout sessions.
 */

import { getAppDatabase, generateId } from '../../core/database/appDatabase.js';

export interface CheckoutSessionRecord {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'created' | 'pending' | 'paid' | 'complete' | 'failed' | 'expired';
  lemon_checkout_id: string | null;
  lemon_subscription_id: string | null;
  lemon_customer_id: string | null;
  created_at: number;
  updated_at: number;
}

const mapRow = (row: any): CheckoutSessionRecord | null => {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    plan_id: row.plan_id,
    status: row.status,
    lemon_checkout_id: row.lemon_checkout_id ?? null,
    lemon_subscription_id: row.lemon_subscription_id ?? null,
    lemon_customer_id: row.lemon_customer_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

/**
 * Creates a new checkout session record for the given user and plan.
 */
export const createCheckoutSessionRecord = async (data: {
  userId: string;
  planId: string;
  sessionId?: string;
}): Promise<CheckoutSessionRecord> => {
  const db = getAppDatabase();
  const id = data.sessionId ?? generateId();
  const now = Date.now();
  await db.run(
    `
    INSERT INTO checkout_sessions (id, user_id, plan_id, status, lemon_checkout_id, lemon_subscription_id, lemon_customer_id, created_at, updated_at)
    VALUES (@id, @user_id, @plan_id, 'created', NULL, NULL, NULL, @created_at, @updated_at)
  `,
    {
      id,
      user_id: data.userId,
      plan_id: data.planId,
      created_at: now,
      updated_at: now
    }
  );
  return (await findCheckoutSessionById(id)) as CheckoutSessionRecord;
};

/**
 * Updates a checkout session with new status or LemonSqueezy identifiers.
 */
export const updateCheckoutSessionRecord = async (
  id: string,
  updates: {
  status?: CheckoutSessionRecord['status'];
  lemonCheckoutId?: string | null;
  lemonSubscriptionId?: string | null;
  lemonCustomerId?: string | null;
}
): Promise<CheckoutSessionRecord | null> => {
  const db = getAppDatabase();
  const now = Date.now();
  await db.run(
    `
    UPDATE checkout_sessions
       SET status = COALESCE(@status, status),
           lemon_checkout_id = COALESCE(@lemon_checkout_id, lemon_checkout_id),
           lemon_subscription_id = COALESCE(@lemon_subscription_id, lemon_subscription_id),
           lemon_customer_id = COALESCE(@lemon_customer_id, lemon_customer_id),
           updated_at = @updated_at
     WHERE id = @id
  `,
    {
      id,
      status: updates.status ?? null,
      lemon_checkout_id: updates.lemonCheckoutId ?? null,
      lemon_subscription_id: updates.lemonSubscriptionId ?? null,
      lemon_customer_id: updates.lemonCustomerId ?? null,
      updated_at: now
    }
  );
  return await findCheckoutSessionById(id);
};

/**
 * Finds a checkout session by internal identifier.
 */
export const findCheckoutSessionById = async (id: string): Promise<CheckoutSessionRecord | null> => {
  const db = getAppDatabase();
  const row = await db.get('SELECT * FROM checkout_sessions WHERE id = ? LIMIT 1', [id]);
  return mapRow(row);
};

/**
 * Retrieves a checkout session using the external LemonSqueezy checkout identifier.
 */
export const findCheckoutSessionByLemonId = async (lemonCheckoutId: string): Promise<CheckoutSessionRecord | null> => {
  const db = getAppDatabase();
  const row = await db.get('SELECT * FROM checkout_sessions WHERE lemon_checkout_id = ? LIMIT 1', [lemonCheckoutId]);
  return mapRow(row);
};
