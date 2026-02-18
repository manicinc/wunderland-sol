/**
 * @fileoverview Generic OAuth 2.0 client for RabbitHole
 * @module @framers/rabbithole/auth/OAuthClient
 *
 * Provides a base OAuth 2.0 implementation that can be extended
 * by provider-specific implementations (Google, GitHub, etc.).
 */

import { randomBytes } from 'crypto';
import type {
    OAuthProviderConfig,
    OAuthTokens,
    OAuthCallbackData,
    AuthorizationState,
    OAuthUserProfile,
    OAuthProvider,
} from './types.js';
import { STATE_EXPIRATION_MS } from './types.js';

/**
 * Generic OAuth 2.0 client.
 *
 * Handles the OAuth 2.0 authorization code flow:
 * 1. Generate authorization URL with state
 * 2. Exchange authorization code for tokens
 * 3. Refresh access tokens
 * 4. Fetch user profile
 *
 * @example
 * ```typescript
 * const client = new OAuthClient({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
 *   tokenUrl: 'https://oauth2.googleapis.com/token',
 *   userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
 *   redirectUri: 'https://your-app.com/api/auth/callback',
 *   scopes: ['openid', 'email', 'profile'],
 * });
 *
 * // Generate auth URL
 * const { url, state } = client.buildAuthUrl();
 *
 * // After user returns with code
 * const tokens = await client.exchangeCode(code);
 * const profile = await client.getUserProfile(tokens.accessToken);
 * ```
 */
export class OAuthClient {
    protected readonly config: OAuthProviderConfig;
    protected readonly provider: OAuthProvider;

    // In-memory state store (should be replaced with Redis/DB in production)
    private readonly stateStore = new Map<string, AuthorizationState>();

    constructor(config: OAuthProviderConfig, provider: OAuthProvider) {
        this.config = config;
        this.provider = provider;
    }

    /**
     * Build OAuth authorization URL.
     *
     * @param returnUrl - URL to redirect to after successful auth
     * @returns Authorization URL and state for CSRF validation
     */
    buildAuthUrl(returnUrl?: string): { url: string; state: AuthorizationState } {
        const stateValue = this.generateState();

        const authState: AuthorizationState = {
            state: stateValue,
            provider: this.provider,
            returnUrl,
            createdAt: new Date(),
        };

        // Store state for validation
        this.stateStore.set(stateValue, authState);

        // Clean up expired states
        this.cleanupExpiredStates();

        const params = new URLSearchParams({
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            response_type: 'code',
            scope: this.config.scopes.join(' '),
            state: stateValue,
            access_type: 'offline', // Request refresh token
            prompt: 'consent', // Force consent screen for refresh token
        });

        const url = `${this.config.authorizationUrl}?${params.toString()}`;

        return { url, state: authState };
    }

    /**
     * Validate state parameter from callback.
     *
     * @param state - State value from callback
     * @returns Authorization state if valid, null otherwise
     */
    validateState(state: string): AuthorizationState | null {
        const authState = this.stateStore.get(state);

        if (!authState) {
            return null;
        }

        // Check expiration
        const elapsed = Date.now() - authState.createdAt.getTime();
        if (elapsed > STATE_EXPIRATION_MS) {
            this.stateStore.delete(state);
            return null;
        }

        // Remove used state (one-time use)
        this.stateStore.delete(state);

        return authState;
    }

    /**
     * Exchange authorization code for tokens.
     *
     * @param code - Authorization code from callback
     * @returns OAuth tokens
     * @throws Error if token exchange fails
     */
    async exchangeCode(code: string): Promise<OAuthTokens> {
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: this.config.redirectUri,
        });

        const response = await fetch(this.config.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as { error_description?: string; error?: string };
            throw new Error(
                `Token exchange failed: ${errorData.error_description || errorData.error || response.statusText}`
            );
        }

        const data = (await response.json()) as Record<string, unknown>;

        return {
            accessToken: String(data.access_token),
            refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
            tokenType: String(data.token_type || 'Bearer'),
            expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
            scope: String(data.scope || this.config.scopes.join(' ')),
        };
    }

    /**
     * Refresh access token using refresh token.
     *
     * @param refreshToken - Refresh token
     * @returns New OAuth tokens
     * @throws Error if refresh fails
     */
    async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        });

        const response = await fetch(this.config.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as { error_description?: string; error?: string };
            throw new Error(
                `Token refresh failed: ${errorData.error_description || errorData.error || response.statusText}`
            );
        }

        const data = (await response.json()) as Record<string, unknown>;

        return {
            accessToken: String(data.access_token),
            // Some providers don't return a new refresh token
            refreshToken: data.refresh_token ? String(data.refresh_token) : refreshToken,
            tokenType: String(data.token_type || 'Bearer'),
            expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
            scope: String(data.scope || this.config.scopes.join(' ')),
        };
    }

    /**
     * Fetch user profile from OAuth provider.
     *
     * @param accessToken - Valid access token
     * @returns User profile
     * @throws Error if fetch fails
     */
    async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
        const response = await fetch(this.config.userInfoUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch user profile: ${response.statusText}`);
        }

        const data = (await response.json()) as Record<string, unknown>;

        // Default implementation - should be overridden by provider-specific classes
        return this.parseUserProfile(data);
    }

    /**
     * Parse raw user data into standardized profile.
     * Override in provider-specific implementations.
     *
     * @param data - Raw user data from provider
     * @returns Standardized user profile
     */
    protected parseUserProfile(data: Record<string, unknown>): OAuthUserProfile {
        return {
            providerId: String(data.id || data.sub || ''),
            provider: this.provider,
            email: String(data.email || ''),
            emailVerified: Boolean(data.email_verified || data.verified_email),
            name: data.name ? String(data.name) : undefined,
            avatarUrl: data.picture ? String(data.picture) : data.avatar_url ? String(data.avatar_url) : undefined,
            raw: data,
        };
    }

    /**
     * Revoke access token.
     *
     * @param token - Access or refresh token to revoke
     */
    async revokeAccess(_token: string): Promise<void> {
        // Default implementation - may be overridden by provider-specific classes
        // Google: https://oauth2.googleapis.com/revoke
        // GitHub: DELETE /applications/{client_id}/grant
        console.warn(`[OAuthClient] Token revocation not implemented for ${this.provider}`);
    }

    /**
     * Process OAuth callback.
     *
     * @param callbackData - Data from OAuth callback
     * @returns Tokens and user profile
     */
    async handleCallback(callbackData: OAuthCallbackData): Promise<{
        tokens: OAuthTokens;
        profile: OAuthUserProfile;
        returnUrl?: string;
    }> {
        // Check for errors from provider
        if (callbackData.error) {
            throw new Error(`OAuth error: ${callbackData.errorDescription || callbackData.error}`);
        }

        // Validate state
        const authState = this.validateState(callbackData.state);
        if (!authState) {
            throw new Error('Invalid or expired state parameter');
        }

        // Exchange code for tokens
        const tokens = await this.exchangeCode(callbackData.code);

        // Fetch user profile
        const profile = await this.getUserProfile(tokens.accessToken);

        return {
            tokens,
            profile,
            returnUrl: authState.returnUrl,
        };
    }

    /**
     * Check if access token is expired.
     *
     * @param tokens - OAuth tokens
     * @param bufferMs - Buffer before expiry (default: 5 minutes)
     * @returns Whether token is expired
     */
    isTokenExpired(tokens: OAuthTokens, bufferMs = 5 * 60 * 1000): boolean {
        return Date.now() >= tokens.expiresAt - bufferMs;
    }

    /**
     * Get current configuration.
     */
    getConfig(): Readonly<OAuthProviderConfig> {
        return this.config;
    }

    /**
     * Get provider name.
     */
    getProvider(): OAuthProvider {
        return this.provider;
    }

    // ============================================================================
    // PRIVATE METHODS
    // ============================================================================

    /**
     * Generate cryptographically secure state value.
     */
    private generateState(): string {
        return randomBytes(32).toString('base64url');
    }

    /**
     * Clean up expired states from memory.
     */
    private cleanupExpiredStates(): void {
        const now = Date.now();
        for (const [key, value] of this.stateStore.entries()) {
            if (now - value.createdAt.getTime() > STATE_EXPIRATION_MS) {
                this.stateStore.delete(key);
            }
        }
    }
}
