/**
 * @fileoverview Auth module exports for RabbitHole
 * @module @framers/rabbithole/auth
 *
 * OAuth 2.0 authentication for the RabbitHole marketplace.
 *
 * @example
 * ```typescript
 * import {
 *   GoogleProvider,
 *   GitHubProvider,
 *   SessionManager,
 *   InMemorySessionStore,
 * } from '@framers/rabbithole/auth';
 *
 * // Initialize providers
 * const google = new GoogleProvider({
 *   clientId: process.env.GOOGLE_CLIENT_ID!,
 *   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
 *   redirectUri: 'https://rabbithole.inc/api/auth/google/callback',
 * });
 *
 * // Initialize session manager
 * const sessionStore = new InMemorySessionStore();
 * const sessionManager = new SessionManager(sessionStore);
 *
 * // OAuth flow
 * const { url } = google.buildAuthUrl('/dashboard');
 * // Redirect user to url...
 *
 * // Handle callback
 * const { tokens, profile } = await google.handleCallback({ code, state });
 *
 * // Create session
 * const session = await sessionManager.createSession({
 *   user: { id: profile.providerId, email: profile.email, ... },
 *   provider: 'google',
 * });
 *
 * // Validate session in middleware
 * const validSession = await sessionManager.validateSession(sessionId);
 * ```
 */

// Types
export type {
    OAuthProvider,
    OAuthProviderConfig,
    OAuthTokens,
    AuthorizationState,
    OAuthUserProfile,
    RabbitHoleUser,
    UserSession,
    SessionCreateOptions,
    SessionStore,
    UserStore,
    OAuthCallbackData,
    OAuthResult,
} from './types.js';

export {
    DEFAULT_SESSION_DURATION_MS,
    STATE_EXPIRATION_MS,
} from './types.js';

// OAuth Client
export { OAuthClient } from './OAuthClient.js';

// Providers
export { GoogleProvider, GOOGLE_OAUTH_DEFAULTS } from './providers/GoogleProvider.js';
export type { GoogleOAuthConfig } from './providers/GoogleProvider.js';

export { GitHubProvider, GITHUB_OAUTH_DEFAULTS } from './providers/GitHubProvider.js';
export type { GitHubOAuthConfig } from './providers/GitHubProvider.js';

// Session Management
export { SessionManager, InMemorySessionStore } from './SessionManager.js';
