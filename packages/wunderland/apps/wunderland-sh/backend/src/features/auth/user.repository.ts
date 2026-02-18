/**
 * @file user.repository.ts
 * @description Persistence helper for authentication and subscription related data.
 * Simplified for standalone Wunderland backend — no Supabase, no Lemon Squeezy,
 * no organization queries.
 */

import { getAppDatabase, generateId } from '../../core/database/appDatabase.js';

export interface AppUser {
  id: string;
  email: string;
  password_hash: string;
  subscription_status: string;
  subscription_tier: string;
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
  metadata?: Record<string, unknown>;
}): Promise<AppUser> => {
  const db = getAppDatabase();
  const id = generateId();
  const now = Date.now();
  await db.run(
    `
    INSERT INTO app_users (
      id, email, password_hash, subscription_status, subscription_tier,
      is_active, created_at, updated_at, metadata
    ) VALUES (@id, @email, @password_hash, @subscription_status, @subscription_tier,
             1, @created_at, @updated_at, @metadata)
  `,
    {
      id,
      email: data.email,
      password_hash: data.passwordHash,
      subscription_status: data.subscriptionStatus ?? 'active',
      subscription_tier: data.subscriptionTier ?? 'unlimited',
      created_at: now,
      updated_at: now,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    }
  );

  return (await findUserById(id)) as AppUser;
};

export const updateUserSubscription = async (
  userId: string,
  updates: {
    status?: string;
    tier?: string;
  }
): Promise<void> => {
  const db = getAppDatabase();
  const now = Date.now();
  await db.run(
    `
    UPDATE app_users
       SET subscription_status = COALESCE(@status, subscription_status),
           subscription_tier = COALESCE(@tier, subscription_tier),
           updated_at = @updated_at
     WHERE id = @userId
  `,
    {
      userId,
      status: updates.status ?? null,
      tier: updates.tier ?? null,
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
