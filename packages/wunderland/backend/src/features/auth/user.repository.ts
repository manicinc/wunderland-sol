// File: backend/src/features/auth/user.repository.ts
/**
 * @file user.repository.ts
 * @description Persistence helper for authentication and subscription related data.
 */

import { getAppDatabase, generateId } from '../../core/database/appDatabase.js';

export interface AppUser {
  id: string;
  email: string;
  password_hash: string;
  supabase_user_id?: string | null;
  subscription_plan_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status: string;
  subscription_tier: string;
  lemon_customer_id?: string | null;
  lemon_subscription_id?: string | null;
  subscription_renews_at?: number | null;
  subscription_expires_at?: number | null;
  is_active: number;
  created_at: number;
  updated_at: number;
  last_login_at?: number | null;
  last_login_ip?: string | null;
  metadata?: string | null;
}

export const findUserByEmail = async (email: string): Promise<AppUser | null> => {
  const db = getAppDatabase();
  return (
    (await db.get<AppUser>('SELECT * FROM app_users WHERE email = ? LIMIT 1', [email])) ?? null
  );
};

export const findUserById = async (id: string): Promise<AppUser | null> => {
  const db = getAppDatabase();
  return (await db.get<AppUser>('SELECT * FROM app_users WHERE id = ? LIMIT 1', [id])) ?? null;
};

export const createUser = async (data: {
  email: string;
  passwordHash: string;
  subscriptionStatus?: string;
  subscriptionTier?: string;
  lemonCustomerId?: string;
  lemonSubscriptionId?: string;
  supabaseUserId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<AppUser> => {
  const db = getAppDatabase();
  const id = generateId();
  const now = Date.now();
  await db.run(
    `
    INSERT INTO app_users (
      id, email, password_hash, supabase_user_id, subscription_status, subscription_tier, lemon_customer_id,
      lemon_subscription_id, is_active, created_at, updated_at, metadata
    ) VALUES (@id, @email, @password_hash, @supabase_user_id, @subscription_status, @subscription_tier, @lemon_customer_id,
             @lemon_subscription_id, 1, @created_at, @updated_at, @metadata)
  `,
    {
      id,
      email: data.email,
      password_hash: data.passwordHash,
      supabase_user_id: data.supabaseUserId ?? null,
      subscription_status: data.subscriptionStatus ?? 'active',
      subscription_tier: data.subscriptionTier ?? 'unlimited',
      lemon_customer_id: data.lemonCustomerId ?? null,
      lemon_subscription_id: data.lemonSubscriptionId ?? null,
      created_at: now,
      updated_at: now,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    }
  );

  return (await findUserById(id)) as AppUser;
};

export const findUserBySupabaseId = async (supabaseUserId: string): Promise<AppUser | null> => {
  if (!supabaseUserId) return null;
  const db = getAppDatabase();
  return (
    (await db.get<AppUser>('SELECT * FROM app_users WHERE supabase_user_id = ? LIMIT 1', [
      supabaseUserId,
    ])) ?? null
  );
};

export const updateUserSupabaseLink = async (
  userId: string,
  supabaseUserId: string | null
): Promise<void> => {
  const db = getAppDatabase();
  await db.run(
    `
    UPDATE app_users
       SET supabase_user_id = @supabase_user_id,
           updated_at = @updated_at
     WHERE id = @user_id
  `,
    { user_id: userId, supabase_user_id: supabaseUserId ?? null, updated_at: Date.now() }
  );
};

export const updateUserProfile = async (
  userId: string,
  data: {
    email?: string;
    subscriptionStatus?: string | null;
    subscriptionTier?: string | null;
    lemonCustomerId?: string | null;
    lemonSubscriptionId?: string | null;
    metadata?: Record<string, unknown> | null;
  }
): Promise<void> => {
  const db = getAppDatabase();
  await db.run(
    `
    UPDATE app_users
       SET email = COALESCE(@email, email),
           subscription_status = COALESCE(@subscription_status, subscription_status),
           subscription_tier = COALESCE(@subscription_tier, subscription_tier),
           lemon_customer_id = COALESCE(@lemon_customer_id, lemon_customer_id),
           lemon_subscription_id = COALESCE(@lemon_subscription_id, lemon_subscription_id),
           metadata = COALESCE(@metadata, metadata),
           updated_at = @updated_at
     WHERE id = @user_id
  `,
    {
      user_id: userId,
      email: data.email ?? null,
      subscription_status: data.subscriptionStatus ?? null,
      subscription_tier: data.subscriptionTier ?? null,
      lemon_customer_id: data.lemonCustomerId ?? null,
      lemon_subscription_id: data.lemonSubscriptionId ?? null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      updated_at: Date.now(),
    }
  );
};

export const updateUserSubscription = async (
  userId: string,
  updates: {
    status?: string;
    tier?: string;
    lemonCustomerId?: string | null;
    lemonSubscriptionId?: string | null;
    renewsAt?: number | null;
    expiresAt?: number | null;
  }
): Promise<void> => {
  const db = getAppDatabase();
  const now = Date.now();
  await db.run(
    `
    UPDATE app_users
       SET subscription_status = COALESCE(@status, subscription_status),
           subscription_tier = COALESCE(@tier, subscription_tier),
           lemon_customer_id = COALESCE(@lemonCustomerId, lemon_customer_id),
           lemon_subscription_id = COALESCE(@lemonSubscriptionId, lemon_subscription_id),
           subscription_renews_at = @renewsAt,
           subscription_expires_at = @expiresAt,
           updated_at = @updated_at
     WHERE id = @userId
  `,
    {
      userId,
      status: updates.status ?? null,
      tier: updates.tier ?? null,
      lemonCustomerId: updates.lemonCustomerId ?? null,
      lemonSubscriptionId: updates.lemonSubscriptionId ?? null,
      renewsAt: updates.renewsAt ?? null,
      expiresAt: updates.expiresAt ?? null,
      updated_at: now,
    }
  );
};

export const updateUserStripeSubscription = async (
  userId: string,
  updates: {
    status: string;
    planId: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  }
): Promise<void> => {
  const db = getAppDatabase();
  const now = Date.now();

  await db.run(
    `
    UPDATE app_users
       SET subscription_status = @status,
           subscription_plan_id = @planId,
           stripe_customer_id = @stripeCustomerId,
           stripe_subscription_id = @stripeSubscriptionId,
           updated_at = @updated_at
     WHERE id = @userId
  `,
    {
      userId,
      status: updates.status,
      planId: updates.planId,
      stripeCustomerId: updates.stripeCustomerId,
      stripeSubscriptionId: updates.stripeSubscriptionId,
      updated_at: now,
    }
  );
};

export const recordLoginEvent = async (data: {
  userId?: string;
  mode: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> => {
  const db = getAppDatabase();
  const id = generateId();
  const now = Date.now();
  await db.run(
    `
    INSERT INTO login_events (id, user_id, mode, ip_address, user_agent, created_at)
    VALUES (@id, @user_id, @mode, @ip_address, @user_agent, @created_at)
  `,
    {
      id,
      user_id: data.userId ?? null,
      mode: data.mode,
      ip_address: data.ip ?? null,
      user_agent: data.userAgent ?? null,
      created_at: now,
    }
  );
};

export const updateLastLogin = async (userId: string, ip?: string | null): Promise<void> => {
  const db = getAppDatabase();
  await db.run(
    `
    UPDATE app_users
       SET last_login_at = @last_login_at,
           last_login_ip = COALESCE(@last_login_ip, last_login_ip),
           updated_at = @updated_at
     WHERE id = @user_id
  `,
    {
      user_id: userId,
      last_login_at: Date.now(),
      last_login_ip: ip ?? null,
      updated_at: Date.now(),
    }
  );
};

export const logGlobalAccess = async (data: {
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> => {
  const db = getAppDatabase();
  const id = generateId();
  const now = Date.now();
  await db.run(
    `
    INSERT INTO global_access_logs (id, ip_address, user_agent, created_at)
    VALUES (@id, @ip_address, @user_agent, @created_at)
  `,
    {
      id,
      ip_address: data.ip ?? null,
      user_agent: data.userAgent ?? null,
      created_at: now,
    }
  );
};

export const countGlobalAccessAttempts = async (
  ip: string,
  sinceEpochMs: number
): Promise<number> => {
  if (!ip) return 0;
  const db = getAppDatabase();
  const row = await db.get<{ count: number }>(
    "SELECT COUNT(1) as count FROM login_events WHERE ip_address = ? AND created_at >= ? AND mode LIKE 'global%'",
    [ip, sinceEpochMs]
  );
  return row?.count ?? 0;
};

export const storeLemonSqueezyEvent = async (data: {
  id: string;
  eventName: string;
  payload: string;
  processed?: boolean;
}): Promise<void> => {
  const db = getAppDatabase();
  await db.run(
    `
    INSERT OR REPLACE INTO lemonsqueezy_events (id, event_name, payload, processed_at, created_at)
    VALUES (@id, @event_name, @payload, @processed_at, @created_at)
  `,
    {
      id: data.id,
      event_name: data.eventName,
      payload: data.payload,
      processed_at: data.processed ? Date.now() : null,
      created_at: Date.now(),
    }
  );
};
