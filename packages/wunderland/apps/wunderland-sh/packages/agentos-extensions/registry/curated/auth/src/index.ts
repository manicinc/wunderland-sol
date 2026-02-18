/**
 * @module @framers/agentos-extensions/auth
 * @description Authentication and subscription extension for AgentOS
 * 
 * This extension provides JWT authentication and subscription management
 * that can be injected into AgentOS, keeping the core library auth-free.
 */

import { JWTAuthAdapter } from './adapters/JWTAuthAdapter.js';
import { SubscriptionAdapter } from './adapters/SubscriptionAdapter.js';
import type { AuthExtensionConfig, JWTAuthConfig, SubscriptionConfig } from './types.js';
import type { IAuthService, ISubscriptionService } from './types.js';

/**
 * Create a complete auth extension with both auth and subscription services
 * 
 * @example
 * ```typescript
 * import { createAuthExtension } from '@framers/agentos-extensions/auth';
 * 
 * const { authService, subscriptionService } = createAuthExtension({
 *   auth: {
 *     jwtSecret: process.env.JWT_SECRET!,
 *     jwtExpiresIn: '7d',
 *   },
 *   subscription: {
 *     defaultTier: 'free',
 *   },
 * });
 * 
 * // Inject into AgentOS
 * await agentos.initialize({
 *   authService,
 *   subscriptionService,
 * });
 * ```
 */
export function createAuthExtension(config: AuthExtensionConfig = {}): {
  authService: IAuthService;
  subscriptionService: ISubscriptionService;
} {
  const authService = new JWTAuthAdapter(config.auth || { jwtSecret: '' });
  const subscriptionService = new SubscriptionAdapter(config.subscription);
  
  return {
    authService,
    subscriptionService,
  };
}

// Export adapters for direct use
export { JWTAuthAdapter } from './adapters/JWTAuthAdapter.js';
export { SubscriptionAdapter } from './adapters/SubscriptionAdapter.js';

// Export providers
export { ToolPermissionProvider } from './providers/ToolPermissionProvider.js';
export { PersonaTierProvider } from './providers/PersonaTierProvider.js';

// Export types
export type {
  JWTPayload,
  JWTAuthConfig,
  SubscriptionConfig,
  AuthExtensionConfig,
} from './types.js';

export type {
  IAuthService,
  IAuthenticatedUser,
  ISubscriptionService,
  ISubscriptionTier,
} from './types.js';

