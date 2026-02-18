/**
 * @fileoverview Google OAuth provider for RabbitHole
 * @module @framers/rabbithole/auth/providers/GoogleProvider
 */

import { OAuthClient } from '../OAuthClient.js';
import type { OAuthProviderConfig, OAuthUserProfile } from '../types.js';

/**
 * Default Google OAuth configuration.
 */
export const GOOGLE_OAUTH_DEFAULTS: Partial<OAuthProviderConfig> = {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile'],
};

/**
 * Google OAuth provider configuration.
 */
export interface GoogleOAuthConfig {
    /** Google OAuth client ID */
    clientId: string;

    /** Google OAuth client secret */
    clientSecret: string;

    /** OAuth redirect URI */
    redirectUri: string;

    /** Additional scopes (openid, email, profile are always included) */
    additionalScopes?: string[];
}

/**
 * Google OAuth provider.
 *
 * Implements Google-specific OAuth flow with proper user profile parsing.
 *
 * @example
 * ```typescript
 * const google = new GoogleProvider({
 *   clientId: process.env.GOOGLE_CLIENT_ID!,
 *   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
 *   redirectUri: 'https://your-app.com/api/auth/google/callback',
 * });
 *
 * // Generate auth URL
 * const { url } = google.buildAuthUrl('/dashboard');
 *
 * // Handle callback
 * const { tokens, profile } = await google.handleCallback({ code, state });
 * ```
 */
export class GoogleProvider extends OAuthClient {
    constructor(config: GoogleOAuthConfig) {
        const scopes = [
            ...GOOGLE_OAUTH_DEFAULTS.scopes!,
            ...(config.additionalScopes || []),
        ];

        // Remove duplicates
        const uniqueScopes = [...new Set(scopes)];

        super(
            {
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                redirectUri: config.redirectUri,
                authorizationUrl: GOOGLE_OAUTH_DEFAULTS.authorizationUrl!,
                tokenUrl: GOOGLE_OAUTH_DEFAULTS.tokenUrl!,
                userInfoUrl: GOOGLE_OAUTH_DEFAULTS.userInfoUrl!,
                scopes: uniqueScopes,
            },
            'google'
        );
    }

    /**
     * Parse Google user profile response.
     */
    protected override parseUserProfile(data: Record<string, unknown>): OAuthUserProfile {
        return {
            providerId: String(data.id || ''),
            provider: 'google',
            email: String(data.email || ''),
            emailVerified: Boolean(data.verified_email),
            name: data.name ? String(data.name) : undefined,
            avatarUrl: data.picture ? String(data.picture) : undefined,
            raw: data,
        };
    }

    /**
     * Revoke Google access token.
     *
     * @param token - Access or refresh token to revoke
     */
    override async revokeAccess(token: string): Promise<void> {
        const response = await fetch(
            `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to revoke Google token: ${response.statusText}`);
        }
    }
}
