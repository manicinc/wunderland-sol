// File: backend/src/utils/session.utils.ts
/**
 * @file session.utils.ts
 * @description Helpers for deriving a consistent session/user identifier for cost tracking
 *              across authenticated and unauthenticated (IP-based) users.
 */

import crypto from 'crypto';
import type { Request } from 'express';

const DEFAULT_SALT = process.env.ANON_SESSION_SALT || 'voice-chat-assistant-public';
const PUBLIC_PREFIX = process.env.ANON_SESSION_PREFIX || 'public';

const hashValue = (value: string): string => {
  return crypto.createHash('sha256').update(`${DEFAULT_SALT}:${value}`).digest('hex').slice(0, 16);
};

const extractClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ipFromHeader = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0]?.trim();
  const candidate =
    ipFromHeader ||
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    req.socket?.remoteAddress ||
    '';
  return candidate || 'unknown';
};

/**
 * Resolves the identifier that should be used for session-bound activities such as cost tracking.
 * Preference order:
 *   1. Authenticated user id injected by auth middleware.
 *   2. (Optional) Explicit *public* userId supplied by the client (demo-mode only).
 *   3. A deterministic hashed id derived from the caller's IP address.
 *
 * @param req Express request.
 * @param explicitUserId Optional user id provided by the caller.
 * @returns A stable identifier suitable for cost/session tracking.
 */
export const resolveSessionUserId = (req: Request, explicitUserId?: string | null): string => {
  const userContext = (req as any)?.user;
  const authenticatedUserId =
    userContext?.authenticated && typeof userContext?.id === 'string' ? userContext.id : null;
  if (authenticatedUserId) {
    return authenticatedUserId;
  }

  // Never trust arbitrary client-provided identifiers for authenticated namespaces.
  // For unauthenticated callers we allow only the "public_*" namespace for demo flows.
  if (explicitUserId && typeof explicitUserId === 'string') {
    const trimmed = explicitUserId.trim();
    const isPublicId =
      trimmed === `${PUBLIC_PREFIX}_unknown` ||
      new RegExp(`^${PUBLIC_PREFIX}_[a-f0-9]{16}$`, 'i').test(trimmed);
    if (isPublicId) {
      return trimmed;
    }
  }

  const clientIp = extractClientIp(req);
  if (clientIp === 'unknown') {
    return `${PUBLIC_PREFIX}_unknown`;
  }
  return `${PUBLIC_PREFIX}_${hashValue(clientIp)}`;
};

/**
 * Exposes the IP extraction for logging or other utilities.
 */
export const getClientIp = (req: Request): string => extractClientIp(req);
