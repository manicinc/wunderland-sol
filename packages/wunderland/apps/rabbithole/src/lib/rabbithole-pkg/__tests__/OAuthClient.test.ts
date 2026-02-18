/**
 * @fileoverview Unit tests for OAuth authentication module
 * @module @framers/rabbithole/auth/__tests__
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    OAuthClient,
    SessionManager,
    InMemorySessionStore,
    GoogleProvider,
    GitHubProvider,
    STATE_EXPIRATION_MS,
    DEFAULT_SESSION_DURATION_MS,
} from '../index.js';
import type { OAuthProviderConfig, RabbitHoleUser, UserSession } from '../auth/types.js';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OAuthClient', () => {
    let client: OAuthClient;
    const testConfig: OAuthProviderConfig = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        authorizationUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
        userInfoUrl: 'https://auth.example.com/userinfo',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['openid', 'email', 'profile'],
    };

    beforeEach(() => {
        client = new OAuthClient(testConfig, 'google');
        mockFetch.mockReset();
    });

    describe('buildAuthUrl', () => {
        it('should generate valid authorization URL', () => {
            const { url, state } = client.buildAuthUrl();

            expect(url).toContain(testConfig.authorizationUrl);
            expect(url).toContain(`client_id=${testConfig.clientId}`);
            expect(url).toContain(`redirect_uri=${encodeURIComponent(testConfig.redirectUri)}`);
            expect(url).toContain('response_type=code');
            expect(url).toContain('scope=openid+email+profile');
            expect(state.state).toBeDefined();
            expect(state.provider).toBe('google');
        });

        it('should include returnUrl in state', () => {
            const returnUrl = '/dashboard';
            const { state } = client.buildAuthUrl(returnUrl);

            expect(state.returnUrl).toBe(returnUrl);
        });

        it('should generate unique state for each call', () => {
            const { state: state1 } = client.buildAuthUrl();
            const { state: state2 } = client.buildAuthUrl();

            expect(state1.state).not.toBe(state2.state);
        });
    });

    describe('validateState', () => {
        it('should validate valid state', () => {
            const { state } = client.buildAuthUrl('/return');

            const result = client.validateState(state.state);

            expect(result).not.toBeNull();
            expect(result?.provider).toBe('google');
        });

        it('should reject unknown state', () => {
            const result = client.validateState('unknown-state');

            expect(result).toBeNull();
        });

        it('should consume state after validation (one-time use)', () => {
            const { state } = client.buildAuthUrl();

            const first = client.validateState(state.state);
            const second = client.validateState(state.state);

            expect(first).not.toBeNull();
            expect(second).toBeNull();
        });
    });

    describe('exchangeCode', () => {
        it('should exchange code for tokens', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    access_token: 'test-access-token',
                    refresh_token: 'test-refresh-token',
                    token_type: 'Bearer',
                    expires_in: 3600,
                    scope: 'openid email profile',
                }),
            });

            const tokens = await client.exchangeCode('test-auth-code');

            expect(tokens.accessToken).toBe('test-access-token');
            expect(tokens.refreshToken).toBe('test-refresh-token');
            expect(tokens.tokenType).toBe('Bearer');
            expect(tokens.expiresAt).toBeGreaterThan(Date.now());
        });

        it('should throw on error response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Bad Request',
                json: async () => ({
                    error: 'invalid_grant',
                    error_description: 'Code expired',
                }),
            });

            await expect(client.exchangeCode('expired-code')).rejects.toThrow('Code expired');
        });
    });

    describe('refreshTokens', () => {
        it('should refresh access token', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    access_token: 'new-access-token',
                    token_type: 'Bearer',
                    expires_in: 3600,
                }),
            });

            const tokens = await client.refreshTokens('test-refresh-token');

            expect(tokens.accessToken).toBe('new-access-token');
            expect(tokens.refreshToken).toBe('test-refresh-token'); // Preserved
        });
    });

    describe('getUserProfile', () => {
        it('should fetch user profile', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: '12345',
                    email: 'test@example.com',
                    verified_email: true,
                    name: 'Test User',
                    picture: 'https://example.com/avatar.jpg',
                }),
            });

            const profile = await client.getUserProfile('test-access-token');

            expect(profile.providerId).toBe('12345');
            expect(profile.email).toBe('test@example.com');
            expect(profile.emailVerified).toBe(true);
            expect(profile.name).toBe('Test User');
        });
    });

    describe('isTokenExpired', () => {
        it('should return true for expired tokens', () => {
            const tokens = {
                accessToken: 'token',
                tokenType: 'Bearer',
                expiresAt: Date.now() - 1000,
                scope: 'openid',
            };

            expect(client.isTokenExpired(tokens)).toBe(true);
        });

        it('should return false for valid tokens', () => {
            const tokens = {
                accessToken: 'token',
                tokenType: 'Bearer',
                expiresAt: Date.now() + 60 * 60 * 1000,
                scope: 'openid',
            };

            expect(client.isTokenExpired(tokens)).toBe(false);
        });

        it('should account for buffer time', () => {
            const tokens = {
                accessToken: 'token',
                tokenType: 'Bearer',
                expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes from now
                scope: 'openid',
            };

            // With default 5-minute buffer, should be considered expired
            expect(client.isTokenExpired(tokens)).toBe(true);

            // With 1-minute buffer, should be valid
            expect(client.isTokenExpired(tokens, 60 * 1000)).toBe(false);
        });
    });
});

describe('SessionManager', () => {
    let sessionManager: SessionManager;
    let sessionStore: InMemorySessionStore;

    const testUser: RabbitHoleUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        providers: [{ provider: 'google', providerId: 'google-123', linkedAt: new Date() }],
        role: 'user',
        permissions: [],
        createdAt: new Date(),
    };

    beforeEach(() => {
        sessionStore = new InMemorySessionStore();
        sessionManager = new SessionManager(sessionStore);
    });

    describe('createSession', () => {
        it('should create a new session', async () => {
            const session = await sessionManager.createSession({
                user: testUser,
                provider: 'google',
            });

            expect(session.sessionId).toBeDefined();
            expect(session.userId).toBe(testUser.id);
            expect(session.provider).toBe('google');
            expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
        });

        it('should use custom duration', async () => {
            const shortDuration = 60 * 1000; // 1 minute
            const session = await sessionManager.createSession({
                user: testUser,
                provider: 'google',
                durationMs: shortDuration,
            });

            const expectedExpiry = Date.now() + shortDuration;
            expect(session.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry);
            expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
        });

        it('should store metadata', async () => {
            const session = await sessionManager.createSession({
                user: testUser,
                provider: 'google',
                metadata: {
                    userAgent: 'Test Browser',
                    ipAddress: '127.0.0.1',
                },
            });

            expect(session.metadata?.userAgent).toBe('Test Browser');
            expect(session.metadata?.ipAddress).toBe('127.0.0.1');
        });
    });

    describe('validateSession', () => {
        it('should validate a valid session', async () => {
            const session = await sessionManager.createSession({
                user: testUser,
                provider: 'google',
            });

            const validated = await sessionManager.validateSession(session.sessionId);

            expect(validated).not.toBeNull();
            expect(validated?.userId).toBe(testUser.id);
        });

        it('should return null for unknown session', async () => {
            const result = await sessionManager.validateSession('unknown-session-id');

            expect(result).toBeNull();
        });

        it('should return null for expired session', async () => {
            // Create session that expires immediately
            const session = await sessionManager.createSession({
                user: testUser,
                provider: 'google',
                durationMs: 1, // 1ms
            });

            // Wait for expiration
            await new Promise((resolve) => setTimeout(resolve, 10));

            const result = await sessionManager.validateSession(session.sessionId);

            expect(result).toBeNull();
        });
    });

    describe('refreshSession', () => {
        it('should update lastActivityAt', async () => {
            const session = await sessionManager.createSession({
                user: testUser,
                provider: 'google',
            });

            const originalActivity = session.lastActivityAt;

            // Wait a bit
            await new Promise((resolve) => setTimeout(resolve, 10));

            const refreshed = await sessionManager.refreshSession(session.sessionId);

            expect(refreshed).not.toBeNull();
            expect(refreshed!.lastActivityAt.getTime()).toBeGreaterThan(originalActivity.getTime());
        });

        it('should extend expiry by default', async () => {
            const session = await sessionManager.createSession({
                user: testUser,
                provider: 'google',
            });

            const originalExpiry = session.expiresAt;

            // Wait a bit
            await new Promise((resolve) => setTimeout(resolve, 10));

            const refreshed = await sessionManager.refreshSession(session.sessionId);

            expect(refreshed!.expiresAt.getTime()).toBeGreaterThan(originalExpiry.getTime());
        });

        it('should not extend expiry when disabled', async () => {
            const session = await sessionManager.createSession({
                user: testUser,
                provider: 'google',
            });

            // Wait a bit
            await new Promise((resolve) => setTimeout(resolve, 10));

            const refreshed = await sessionManager.refreshSession(session.sessionId, false);

            // Expiry should not have changed significantly
            expect(Math.abs(refreshed!.expiresAt.getTime() - session.expiresAt.getTime())).toBeLessThan(100);
        });
    });

    describe('revokeSession', () => {
        it('should revoke an existing session', async () => {
            const session = await sessionManager.createSession({
                user: testUser,
                provider: 'google',
            });

            const revoked = await sessionManager.revokeSession(session.sessionId);

            expect(revoked).toBe(true);

            const validated = await sessionManager.validateSession(session.sessionId);
            expect(validated).toBeNull();
        });

        it('should return false for unknown session', async () => {
            const revoked = await sessionManager.revokeSession('unknown-session-id');

            expect(revoked).toBe(false);
        });
    });

    describe('revokeAllSessions', () => {
        it('should revoke all sessions for a user', async () => {
            // Create multiple sessions
            const session1 = await sessionManager.createSession({
                user: testUser,
                provider: 'google',
            });
            const session2 = await sessionManager.createSession({
                user: testUser,
                provider: 'github',
            });

            const count = await sessionManager.revokeAllSessions(testUser.id);

            expect(count).toBe(2);

            const v1 = await sessionManager.validateSession(session1.sessionId);
            const v2 = await sessionManager.validateSession(session2.sessionId);

            expect(v1).toBeNull();
            expect(v2).toBeNull();
        });
    });

    describe('getSessionTimeRemaining', () => {
        it('should return time remaining', async () => {
            const session = await sessionManager.createSession({
                user: testUser,
                provider: 'google',
            });

            const remaining = await sessionManager.getSessionTimeRemaining(session.sessionId);

            expect(remaining).toBeGreaterThan(0);
            expect(remaining).toBeLessThanOrEqual(DEFAULT_SESSION_DURATION_MS);
        });

        it('should return null for unknown session', async () => {
            const remaining = await sessionManager.getSessionTimeRemaining('unknown');

            expect(remaining).toBeNull();
        });
    });
});

describe('InMemorySessionStore', () => {
    let store: InMemorySessionStore;

    beforeEach(() => {
        store = new InMemorySessionStore();
    });

    it('should create and retrieve sessions', async () => {
        const session: UserSession = {
            sessionId: 'test-session',
            userId: 'user-123',
            provider: 'google',
            expiresAt: new Date(Date.now() + 60000),
            createdAt: new Date(),
            lastActivityAt: new Date(),
        };

        await store.create(session);
        const retrieved = await store.get('test-session');

        expect(retrieved).toEqual(session);
    });

    it('should return null for expired sessions on get', async () => {
        const session: UserSession = {
            sessionId: 'expired-session',
            userId: 'user-123',
            provider: 'google',
            expiresAt: new Date(Date.now() - 1000), // Already expired
            createdAt: new Date(),
            lastActivityAt: new Date(),
        };

        await store.create(session);
        const retrieved = await store.get('expired-session');

        expect(retrieved).toBeNull();
    });

    it('should clean up expired sessions', async () => {
        const validSession: UserSession = {
            sessionId: 'valid-session',
            userId: 'user-123',
            provider: 'google',
            expiresAt: new Date(Date.now() + 60000),
            createdAt: new Date(),
            lastActivityAt: new Date(),
        };

        const expiredSession: UserSession = {
            sessionId: 'expired-session',
            userId: 'user-456',
            provider: 'google',
            expiresAt: new Date(Date.now() - 1000),
            createdAt: new Date(),
            lastActivityAt: new Date(),
        };

        await store.create(validSession);
        await store.create(expiredSession);

        const cleaned = await store.cleanupExpired();

        expect(cleaned).toBe(1);
        expect(store.getAllSessions()).toHaveLength(1);
        expect(store.getAllSessions()[0].sessionId).toBe('valid-session');
    });
});

describe('GoogleProvider', () => {
    it('should configure with Google OAuth endpoints', () => {
        const provider = new GoogleProvider({
            clientId: 'google-client-id',
            clientSecret: 'google-client-secret',
            redirectUri: 'https://app.example.com/callback',
        });

        const config = provider.getConfig();

        expect(config.authorizationUrl).toContain('accounts.google.com');
        expect(config.tokenUrl).toContain('oauth2.googleapis.com');
        expect(config.scopes).toContain('openid');
        expect(config.scopes).toContain('email');
        expect(config.scopes).toContain('profile');
    });

    it('should add additional scopes', () => {
        const provider = new GoogleProvider({
            clientId: 'google-client-id',
            clientSecret: 'google-client-secret',
            redirectUri: 'https://app.example.com/callback',
            additionalScopes: ['https://www.googleapis.com/auth/calendar.readonly'],
        });

        const config = provider.getConfig();

        expect(config.scopes).toContain('https://www.googleapis.com/auth/calendar.readonly');
    });
});

describe('GitHubProvider', () => {
    it('should configure with GitHub OAuth endpoints', () => {
        const provider = new GitHubProvider({
            clientId: 'github-client-id',
            clientSecret: 'github-client-secret',
            redirectUri: 'https://app.example.com/callback',
        });

        const config = provider.getConfig();

        expect(config.authorizationUrl).toContain('github.com');
        expect(config.tokenUrl).toContain('github.com');
        expect(config.scopes).toContain('read:user');
        expect(config.scopes).toContain('user:email');
    });
});
