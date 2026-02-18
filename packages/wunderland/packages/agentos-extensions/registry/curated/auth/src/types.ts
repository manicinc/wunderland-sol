/**
 * @file Type definitions for auth extension
 * @module @framers/agentos-extensions/auth
 */

// Re-export core types from AgentOS
export type {
  IAuthService,
  IAuthenticatedUser,
  ISubscriptionService,
  ISubscriptionTier,
} from '@framers/agentos';

/**
 * JWT token payload structure
 */
export interface JWTPayload {
  sub: string;
  email?: string;
  username?: string;
  roles?: string[];
  tier?: string;
  mode?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

/**
 * Configuration for JWT auth adapter
 */
export interface JWTAuthConfig {
  jwtSecret: string;
  jwtExpiresIn?: string;
  bcryptSaltRounds?: number;
  enableTokenRefresh?: boolean;
  refreshWindow?: number;
}

/**
 * Configuration for subscription adapter
 */
export interface SubscriptionConfig {
  defaultTier?: string;
  tiers?: Array<{
    name: string;
    level: number;
    features?: string[];
    isActive?: boolean;
    maxConcurrentRequests?: number;
    rateLimit?: number;
  }>;
}

/**
 * Complete auth extension configuration
 */
export interface AuthExtensionConfig {
  auth?: JWTAuthConfig;
  subscription?: SubscriptionConfig;
}

