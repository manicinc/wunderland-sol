/**
 * @file requestAuthContext.ts
 * @description Shared helpers to populate `req.user` for both Nest guards and
 * Express-style middleware/routes.
 *
 * Simplified for standalone Wunderland backend — internal JWT only, no Supabase.
 */

import type { Request } from 'express';
import { verifyToken } from './auth.service.js';

export type RequestUserContext =
  | { authenticated: false; mode: string }
  | ({
      authenticated: true;
      id: string;
      token: string;
      tokenProvider: 'internal' | 'registration' | 'global';
    } & Record<string, unknown>);

export const extractAuthToken = (request: Request): string | null => {
  const authorization = request.headers.authorization;
  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.slice(7);
  }
  const cookieToken = (request as any).cookies?.authToken;
  return typeof cookieToken === 'string' && cookieToken.trim().length > 0 ? cookieToken : null;
};

export const populateOptionalAuthContext = async (
  request: Request
): Promise<RequestUserContext> => {
  // Default: unauthenticated
  const unauthenticated: RequestUserContext = { authenticated: false, mode: 'demo' };
  (request as any).user = unauthenticated;

  const token = extractAuthToken(request);
  if (!token) {
    return unauthenticated;
  }

  // Try internal JWT verification
  const payload = verifyToken(token);
  if (payload) {
    const tokenProvider =
      payload.mode === 'global'
        ? 'global'
        : payload.mode === 'registration'
          ? 'registration'
          : 'internal';
    const hydrated: RequestUserContext = {
      ...(payload as any),
      id: String(payload.sub),
      authenticated: true,
      token,
      tokenProvider,
    };
    (request as any).user = hydrated;
    return hydrated;
  }

  return unauthenticated;
};
