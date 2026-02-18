// File: backend/src/config/appConfig.ts
/**
 * @file appConfig.ts
 * @description Centralised configuration loader for environment driven settings.
 * Ensures required secrets exist at boot and exposes typed helpers for other modules.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');
const envCandidatePaths = [path.join(projectRoot, '.env'), path.resolve(projectRoot, '..', '.env')];

for (const candidate of envCandidatePaths) {
  try {
    if (dotenv.config({ path: candidate }).parsed) {
      console.log(`[Config] Loaded environment variables from ${candidate}`);
    }
  } catch (error) {
    console.warn(`[Config] Failed to load env file at ${candidate}:`, error);
  }
}

type AuthMode = 'global' | 'standard' | 'registration';

export interface AuthTokenPayload {
  sub: string;
  role: 'global' | 'subscriber' | 'admin' | 'va_admin';
  mode: AuthMode;
  tier: 'unlimited' | 'metered';
  type: 'session';
  isVaAdmin?: boolean;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

const requiredEnv = (key: string, value: string | undefined): string => {
  if (!value) {
    console.warn(
      `[Config] Required env var "${key}" missing. Using insecure fallback value. Set it in production!`
    );
    return `missing_${key}_${Math.random().toString(36).slice(2, 10)}`;
  }
  return value;
};

export const appConfig = {
  auth: {
    globalPassword: process.env.GLOBAL_ACCESS_PASSWORD || process.env.PASSWORD || '',
    jwtSecret: requiredEnv('AUTH_JWT_SECRET', process.env.JWT_SECRET),
    jwtExpiresIn: process.env.AUTH_JWT_EXPIRES_IN || '12h',
  },
  lemonsqueezy: {
    apiKey: process.env.LEMONSQUEEZY_API_KEY || '',
    storeId: process.env.LEMONSQUEEZY_STORE_ID || '',
    webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '',
    defaultSuccessUrl: process.env.LEMONSQUEEZY_SUCCESS_URL || '',
    defaultCancelUrl: process.env.LEMONSQUEEZY_CANCEL_URL || '',
    enabled: Boolean(process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID),
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    enabled: Boolean(process.env.STRIPE_SECRET_KEY),
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    enabled: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  },
  rateLimits: {
    publicDaily: parseInt(process.env.RATE_LIMIT_PUBLIC_DAILY || '100', 10),
    globalLoginWindowMinutes: parseInt(process.env.GLOBAL_LOGIN_RATE_WINDOW_MINUTES || '10', 10),
    globalLoginMaxAttempts: parseInt(process.env.GLOBAL_LOGIN_RATE_MAX_ATTEMPTS || '20', 10),
  },
  security: {
    trustedProxy: process.env.TRUSTED_PROXY_IPS
      ? process.env.TRUSTED_PROXY_IPS.split(',').map((ip) => ip.trim())
      : [],
  },
} as const;

if (!appConfig.auth.globalPassword) {
  console.warn('[Config] GLOBAL_ACCESS_PASSWORD not set. Global login is disabled.');
}

if (!appConfig.stripe.enabled) {
  console.info('[Config] STRIPE_SECRET_KEY not set. Stripe billing is disabled.');
}

if (!appConfig.supabase.enabled) {
  console.warn(
    '[Config] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Supabase authentication is disabled.'
  );
}
export type AuthRole = AuthTokenPayload['role'];
export type AuthTier = AuthTokenPayload['tier'];
export type AuthModeType = AuthMode;
