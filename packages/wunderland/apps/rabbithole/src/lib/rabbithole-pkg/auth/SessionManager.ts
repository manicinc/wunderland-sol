/**
 * @fileoverview Session manager for RabbitHole authentication
 * @module @framers/rabbithole/auth/SessionManager
 *
 * Manages user sessions with opaque session tokens.
 * Sessions are server-side and stateful for security.
 */

import { randomBytes } from 'crypto';
import type {
    UserSession,
    SessionStore,
    SessionCreateOptions,
} from './types.js';
import { DEFAULT_SESSION_DURATION_MS } from './types.js';

/**
 * In-memory session store for development/testing.
 * Replace with Redis/database in production.
 */
export class InMemorySessionStore implements SessionStore {
    private readonly sessions = new Map<string, UserSession>();

    async get(sessionId: string): Promise<UserSession | null> {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        // Check if expired
        if (new Date() > session.expiresAt) {
            this.sessions.delete(sessionId);
            return null;
        }

        return session;
    }

    async create(session: UserSession): Promise<void> {
        this.sessions.set(session.sessionId, session);
    }

    async update(sessionId: string, updates: Partial<UserSession>): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (session) {
            Object.assign(session, updates);
        }
    }

    async delete(sessionId: string): Promise<void> {
        this.sessions.delete(sessionId);
    }

    async deleteAllForUser(userId: string): Promise<number> {
        let count = 0;
        for (const [id, session] of this.sessions.entries()) {
            if (session.userId === userId) {
                this.sessions.delete(id);
                count++;
            }
        }
        return count;
    }

    async cleanupExpired(): Promise<number> {
        const now = new Date();
        let count = 0;
        for (const [id, session] of this.sessions.entries()) {
            if (now > session.expiresAt) {
                this.sessions.delete(id);
                count++;
            }
        }
        return count;
    }

    /** Get all sessions (for debugging) */
    getAllSessions(): UserSession[] {
        return Array.from(this.sessions.values());
    }
}

/**
 * Session manager for RabbitHole authentication.
 *
 * Handles:
 * - Session creation with opaque tokens
 * - Session validation
 * - Session refresh
 * - Session revocation
 *
 * @example
 * ```typescript
 * const sessionStore = new InMemorySessionStore();
 * const sessionManager = new SessionManager(sessionStore);
 *
 * // Create session after OAuth
 * const session = await sessionManager.createSession({
 *   user: rabbitHoleUser,
 *   provider: 'google',
 * });
 *
 * // Validate session from API request
 * const validSession = await sessionManager.validateSession(sessionId);
 *
 * // Refresh session activity
 * await sessionManager.refreshSession(sessionId);
 *
 * // Revoke session on logout
 * await sessionManager.revokeSession(sessionId);
 * ```
 */
export class SessionManager {
    private readonly store: SessionStore;

    constructor(store: SessionStore) {
        this.store = store;
    }

    /**
     * Create a new session for a user.
     *
     * @param options - Session creation options
     * @returns Created session
     */
    async createSession(options: SessionCreateOptions): Promise<UserSession> {
        const { user, provider, durationMs = DEFAULT_SESSION_DURATION_MS, metadata } = options;

        const now = new Date();
        const session: UserSession = {
            sessionId: this.generateSessionId(),
            userId: user.id,
            provider,
            expiresAt: new Date(now.getTime() + durationMs),
            createdAt: now,
            lastActivityAt: now,
            metadata,
        };

        await this.store.create(session);

        return session;
    }

    /**
     * Validate a session by ID.
     *
     * @param sessionId - Session ID to validate
     * @returns Valid session or null if invalid/expired
     */
    async validateSession(sessionId: string): Promise<UserSession | null> {
        const session = await this.store.get(sessionId);

        if (!session) {
            return null;
        }

        // Check expiration
        if (new Date() > session.expiresAt) {
            await this.store.delete(sessionId);
            return null;
        }

        return session;
    }

    /**
     * Refresh session activity timestamp.
     * This extends the session sliding window.
     *
     * @param sessionId - Session ID to refresh
     * @param extendExpiry - Whether to extend expiry (default: true)
     * @returns Updated session or null if not found
     */
    async refreshSession(sessionId: string, extendExpiry = true): Promise<UserSession | null> {
        const session = await this.validateSession(sessionId);

        if (!session) {
            return null;
        }

        const now = new Date();
        const updates: Partial<UserSession> = {
            lastActivityAt: now,
        };

        // Optionally extend expiry (sliding window)
        if (extendExpiry) {
            const originalDuration = session.expiresAt.getTime() - session.createdAt.getTime();
            updates.expiresAt = new Date(now.getTime() + originalDuration);
        }

        await this.store.update(sessionId, updates);

        return {
            ...session,
            ...updates,
        };
    }

    /**
     * Revoke a session (logout).
     *
     * @param sessionId - Session ID to revoke
     * @returns Whether session was found and revoked
     */
    async revokeSession(sessionId: string): Promise<boolean> {
        const session = await this.store.get(sessionId);
        if (!session) {
            return false;
        }

        await this.store.delete(sessionId);
        return true;
    }

    /**
     * Revoke all sessions for a user (logout all devices).
     *
     * @param userId - User ID
     * @returns Number of sessions revoked
     */
    async revokeAllSessions(userId: string): Promise<number> {
        return this.store.deleteAllForUser(userId);
    }

    /**
     * Clean up expired sessions.
     * Should be called periodically (e.g., via cron job).
     *
     * @returns Number of sessions cleaned up
     */
    async cleanupExpiredSessions(): Promise<number> {
        return this.store.cleanupExpired();
    }

    /**
     * Get session expiry time remaining.
     *
     * @param sessionId - Session ID
     * @returns Milliseconds until expiry, or null if not found
     */
    async getSessionTimeRemaining(sessionId: string): Promise<number | null> {
        const session = await this.store.get(sessionId);
        if (!session) {
            return null;
        }

        return Math.max(0, session.expiresAt.getTime() - Date.now());
    }

    // ============================================================================
    // PRIVATE METHODS
    // ============================================================================

    /**
     * Generate cryptographically secure session ID.
     */
    private generateSessionId(): string {
        return randomBytes(32).toString('base64url');
    }
}
