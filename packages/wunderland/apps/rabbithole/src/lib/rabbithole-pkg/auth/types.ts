/**
 * @fileoverview OAuth authentication types for RabbitHole
 * @module @framers/rabbithole/auth/types
 */

// ============================================================================
// PROVIDER TYPES
// ============================================================================

/**
 * Supported OAuth providers.
 */
export type OAuthProvider = 'google' | 'github' | 'credentials';

/**
 * OAuth provider configuration.
 */
export interface OAuthProviderConfig {
    /** OAuth client ID */
    clientId: string;

    /** OAuth client secret */
    clientSecret: string;

    /** Authorization endpoint URL */
    authorizationUrl: string;

    /** Token exchange endpoint URL */
    tokenUrl: string;

    /** User info endpoint URL */
    userInfoUrl: string;

    /** OAuth redirect URI */
    redirectUri: string;

    /** Requested scopes */
    scopes: string[];
}

/**
 * OAuth tokens returned from provider.
 */
export interface OAuthTokens {
    /** Access token for API calls */
    accessToken: string;

    /** Refresh token for obtaining new access tokens */
    refreshToken?: string;

    /** Token type (usually 'Bearer') */
    tokenType: string;

    /** Expiry timestamp (Unix ms) */
    expiresAt: number;

    /** Granted scopes */
    scope: string;
}

/**
 * Authorization request state for CSRF protection.
 */
export interface AuthorizationState {
    /** Random state value */
    state: string;

    /** Provider being used */
    provider: OAuthProvider;

    /** Original redirect destination after auth */
    returnUrl?: string;

    /** Timestamp when state was created */
    createdAt: Date;
}

// ============================================================================
// USER & SESSION TYPES
// ============================================================================

/**
 * User profile from OAuth provider.
 */
export interface OAuthUserProfile {
    /** Provider-specific user ID */
    providerId: string;

    /** OAuth provider */
    provider: OAuthProvider;

    /** User's email address */
    email: string;

    /** Whether email is verified */
    emailVerified: boolean;

    /** Display name */
    name?: string;

    /** Profile picture URL */
    avatarUrl?: string;

    /** Raw provider data */
    raw?: Record<string, unknown>;
}

/**
 * Registered user in RabbitHole.
 */
export interface RabbitHoleUser {
    /** Internal user ID */
    id: string;

    /** Email address */
    email: string;

    /** Display name */
    name?: string;

    /** Profile picture URL */
    avatarUrl?: string;

    /** Linked OAuth providers */
    providers: Array<{
        provider: OAuthProvider;
        providerId: string;
        linkedAt: Date;
    }>;

    /** User role */
    role: 'user' | 'assistant' | 'admin';

    /** User permissions */
    permissions: string[];

    /** Account creation timestamp */
    createdAt: Date;

    /** Last login timestamp */
    lastLoginAt?: Date;
}

/**
 * User session for API authentication.
 */
export interface UserSession {
    /** Session ID (opaque token) */
    sessionId: string;

    /** User ID */
    userId: string;

    /** Provider used for this session */
    provider: OAuthProvider;

    /** Session expiry timestamp */
    expiresAt: Date;

    /** Session creation timestamp */
    createdAt: Date;

    /** Last activity timestamp */
    lastActivityAt: Date;

    /** Client metadata */
    metadata?: {
        userAgent?: string;
        ipAddress?: string;
    };
}

/**
 * Session creation options.
 */
export interface SessionCreateOptions {
    /** User to create session for */
    user: RabbitHoleUser;

    /** Provider used for authentication */
    provider: OAuthProvider;

    /** Session duration in milliseconds (default: 7 days) */
    durationMs?: number;

    /** Client metadata */
    metadata?: UserSession['metadata'];
}

// ============================================================================
// STORE INTERFACES
// ============================================================================

/**
 * Session store interface for persistence.
 */
export interface SessionStore {
    /** Get session by ID */
    get(sessionId: string): Promise<UserSession | null>;

    /** Create new session */
    create(session: UserSession): Promise<void>;

    /** Update session (e.g., last activity) */
    update(sessionId: string, updates: Partial<UserSession>): Promise<void>;

    /** Delete session */
    delete(sessionId: string): Promise<void>;

    /** Delete all sessions for a user */
    deleteAllForUser(userId: string): Promise<number>;

    /** Cleanup expired sessions */
    cleanupExpired(): Promise<number>;
}

/**
 * User store interface for persistence.
 */
export interface UserStore {
    /** Get user by ID */
    getById(userId: string): Promise<RabbitHoleUser | null>;

    /** Get user by email */
    getByEmail(email: string): Promise<RabbitHoleUser | null>;

    /** Get user by OAuth provider */
    getByProvider(provider: OAuthProvider, providerId: string): Promise<RabbitHoleUser | null>;

    /** Create new user */
    create(user: RabbitHoleUser): Promise<void>;

    /** Update user */
    update(userId: string, updates: Partial<RabbitHoleUser>): Promise<void>;

    /** Link OAuth provider to user */
    linkProvider(userId: string, provider: OAuthProvider, providerId: string): Promise<void>;
}

// ============================================================================
// CALLBACK TYPES
// ============================================================================

/**
 * OAuth authorization callback data.
 */
export interface OAuthCallbackData {
    /** Authorization code from provider */
    code: string;

    /** State parameter for CSRF validation */
    state: string;

    /** Error code if authorization failed */
    error?: string;

    /** Error description */
    errorDescription?: string;
}

/**
 * OAuth authentication result.
 */
export interface OAuthResult {
    /** Whether authentication succeeded */
    success: boolean;

    /** User session if successful */
    session?: UserSession;

    /** User profile if successful */
    user?: RabbitHoleUser;

    /** Error message if failed */
    error?: string;

    /** Error code */
    errorCode?: 'invalid_state' | 'token_exchange_failed' | 'user_info_failed' | 'user_creation_failed';
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default session duration (7 days).
 */
export const DEFAULT_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * State expiration time (10 minutes).
 */
export const STATE_EXPIRATION_MS = 10 * 60 * 1000;
