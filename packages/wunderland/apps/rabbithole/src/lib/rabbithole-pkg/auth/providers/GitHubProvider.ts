/**
 * @fileoverview GitHub OAuth provider for RabbitHole
 * @module @framers/rabbithole/auth/providers/GitHubProvider
 */

import { OAuthClient } from '../OAuthClient.js';
import type { OAuthProviderConfig, OAuthUserProfile } from '../types.js';

/**
 * Default GitHub OAuth configuration.
 */
export const GITHUB_OAUTH_DEFAULTS: Partial<OAuthProviderConfig> = {
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['read:user', 'user:email'],
};

/**
 * GitHub OAuth provider configuration.
 */
export interface GitHubOAuthConfig {
    /** GitHub OAuth client ID */
    clientId: string;

    /** GitHub OAuth client secret */
    clientSecret: string;

    /** OAuth redirect URI */
    redirectUri: string;

    /** Additional scopes beyond read:user and user:email */
    additionalScopes?: string[];
}

/**
 * GitHub OAuth provider.
 *
 * Implements GitHub-specific OAuth flow with proper user profile parsing.
 * Note: GitHub access tokens don't expire, so no refresh is needed.
 *
 * @example
 * ```typescript
 * const github = new GitHubProvider({
 *   clientId: process.env.GITHUB_CLIENT_ID!,
 *   clientSecret: process.env.GITHUB_CLIENT_SECRET!,
 *   redirectUri: 'https://your-app.com/api/auth/github/callback',
 * });
 *
 * // Generate auth URL
 * const { url } = github.buildAuthUrl('/dashboard');
 *
 * // Handle callback
 * const { tokens, profile } = await github.handleCallback({ code, state });
 * ```
 */
export class GitHubProvider extends OAuthClient {
    constructor(config: GitHubOAuthConfig) {
        const scopes = [
            ...GITHUB_OAUTH_DEFAULTS.scopes!,
            ...(config.additionalScopes || []),
        ];

        // Remove duplicates
        const uniqueScopes = [...new Set(scopes)];

        super(
            {
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                redirectUri: config.redirectUri,
                authorizationUrl: GITHUB_OAUTH_DEFAULTS.authorizationUrl!,
                tokenUrl: GITHUB_OAUTH_DEFAULTS.tokenUrl!,
                userInfoUrl: GITHUB_OAUTH_DEFAULTS.userInfoUrl!,
                scopes: uniqueScopes,
            },
            'github'
        );
    }

    /**
     * Override to handle GitHub's token response format.
     * GitHub returns tokens without JSON content-type by default.
     */
    override async exchangeCode(code: string): Promise<{
        accessToken: string;
        refreshToken?: string;
        tokenType: string;
        expiresAt: number;
        scope: string;
    }> {
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            code,
        });

        const response = await fetch(this.config.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json', // Request JSON response
            },
            body: params.toString(),
        });

        if (!response.ok) {
            throw new Error(`Token exchange failed: ${response.statusText}`);
        }

        const data = (await response.json()) as {
            access_token?: string;
            refresh_token?: string;
            token_type?: string;
            scope?: string;
            error?: string;
            error_description?: string;
        };

        if (data.error) {
            throw new Error(`Token exchange failed: ${data.error_description || data.error}`);
        }

        return {
            accessToken: data.access_token || '',
            refreshToken: data.refresh_token, // GitHub may provide this
            tokenType: data.token_type || 'bearer',
            // GitHub tokens don't expire by default, set far future
            expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
            scope: data.scope || this.config.scopes.join(' '),
        };
    }

    /**
     * Fetch GitHub user profile, including email from separate endpoint.
     */
    override async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
        // Fetch user data
        const userResponse = await fetch(this.config.userInfoUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });

        if (!userResponse.ok) {
            throw new Error(`Failed to fetch GitHub user: ${userResponse.statusText}`);
        }

        const userData = (await userResponse.json()) as {
            id: number | string;
            email?: string;
            name?: string;
            login?: string;
            avatar_url?: string;
        };

        // Fetch emails if not public
        let email = userData.email;
        let emailVerified = true;

        if (!email) {
            const emailsResponse = await fetch('https://api.github.com/user/emails', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                },
            });

            if (emailsResponse.ok) {
                const emails = (await emailsResponse.json()) as Array<{
                    email: string;
                    primary: boolean;
                    verified: boolean;
                }>;
                // Find primary verified email
                const primaryEmail = emails.find(
                    (e) => e.primary && e.verified
                );
                if (primaryEmail) {
                    email = primaryEmail.email;
                    emailVerified = primaryEmail.verified;
                } else if (emails.length > 0) {
                    // Fall back to first verified email
                    const verifiedEmail = emails.find((e) => e.verified);
                    if (verifiedEmail) {
                        email = verifiedEmail.email;
                        emailVerified = true;
                    }
                }
            }
        }

        return {
            providerId: String(userData.id),
            provider: 'github',
            email: email || '',
            emailVerified,
            name: userData.name || userData.login,
            avatarUrl: userData.avatar_url,
            raw: userData as Record<string, unknown>,
        };
    }

    /**
     * Revoke GitHub access token.
     *
     * @param token - Access token to revoke
     */
    override async revokeAccess(token: string): Promise<void> {
        // GitHub requires Basic auth with client credentials for revocation
        const credentials = Buffer.from(
            `${this.config.clientId}:${this.config.clientSecret}`
        ).toString('base64');

        const response = await fetch(
            `https://api.github.com/applications/${this.config.clientId}/token`,
            {
                method: 'DELETE',
                headers: {
                    Authorization: `Basic ${credentials}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ access_token: token }),
            }
        );

        if (!response.ok && response.status !== 204) {
            throw new Error(`Failed to revoke GitHub token: ${response.statusText}`);
        }
    }
}
