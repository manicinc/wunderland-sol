// File: backend/src/features/auth/supabaseAuth.service.ts
/**
 * @file supabaseAuth.service.ts
 * @description Helpers for validating Supabase sessions and syncing local user records.
 */

import bcrypt from 'bcryptjs';
import { createClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { appConfig } from '../../config/appConfig.js';
import {
  findUserBySupabaseId,
  findUserByEmail,
  createUser,
  updateUserSupabaseLink,
  updateUserProfile,
  type AppUser,
} from './user.repository.js';

const SALT_ROUNDS = 10;

const supabaseAdmin = appConfig.supabase.enabled
  ? createClient(appConfig.supabase.url, appConfig.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export const supabaseAuthEnabled = Boolean(supabaseAdmin);

const normalizeEmail = (email?: string | null): string | null => {
  if (!email) return null;
  return email.trim().toLowerCase();
};

const generatePlaceholderPasswordHash = async (): Promise<string> => {
  return bcrypt.hash(`supabase-${Date.now()}-${Math.random().toString(36).slice(2)}`, SALT_ROUNDS);
};

const ensureLocalUserForSupabase = async (supabaseUser: SupabaseUser): Promise<AppUser> => {
  const supabaseId = supabaseUser.id;
  const email = normalizeEmail(supabaseUser.email) || `user_${supabaseId}@supabase.local`;

  let existing = await findUserBySupabaseId(supabaseId);
  if (!existing) {
    existing = (await findUserByEmail(email)) ?? null;
  }

  if (!existing) {
    const passwordHash = await generatePlaceholderPasswordHash();
    existing = await createUser({
      email,
      passwordHash,
      subscriptionStatus: 'none',
      subscriptionTier: 'metered',
      supabaseUserId: supabaseId,
      metadata: { authProvider: 'supabase' },
    });
    return existing;
  }

  if (!existing.supabase_user_id || existing.supabase_user_id !== supabaseId) {
    await updateUserSupabaseLink(existing.id, supabaseId);
    existing = { ...existing, supabase_user_id: supabaseId };
  }
  if (email && existing.email !== email) {
    await updateUserProfile(existing.id, { email });
    existing = { ...existing, email };
  }
  return existing;
};

export interface SupabaseAuthResult {
  appUser: AppUser;
  supabaseUser: SupabaseUser;
}

export const verifySupabaseToken = async (token: string): Promise<SupabaseAuthResult | null> => {
  if (!supabaseAdmin) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return null;
    }
    const appUser = await ensureLocalUserForSupabase(data.user);
    return { appUser, supabaseUser: data.user };
  } catch (error) {
    console.error('[SupabaseAuth] Failed to verify token:', error);
    return null;
  }
};

export const createSupabaseUserAccount = async (email: string, password: string): Promise<{ id: string } | null> => {
  if (!supabaseAdmin) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data?.user) {
      throw error ?? new Error('Failed to create Supabase user');
    }
    return { id: data.user.id };
  } catch (error) {
    console.error('[SupabaseAuth] Failed to create Supabase user account:', error);
    throw error;
  }
};
