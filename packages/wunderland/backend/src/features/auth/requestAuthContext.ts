/**
 * @file requestAuthContext.ts
 * @description Shared helpers to populate `req.user` for both Nest guards and
 * Express-style middleware/routes.
 *
 * AgentOS endpoints are mounted as Express routers via Nest middleware, which
 * means Nest guards do not run for those routes. To keep auth behavior
 * consistent across the API surface, we centralize token extraction + optional
 * auth hydration here.
 */

import type { Request } from 'express';
import { verifyToken, toSessionUserPayload } from './auth.service.js';
import { verifySupabaseToken, supabaseAuthEnabled } from './supabaseAuth.service.js';

export type RequestUserContext =
  | { authenticated: false; mode: string }
  | ({
      authenticated: true;
      id: string;
      token: string;
      tokenProvider: 'internal' | 'registration' | 'global' | 'supabase';
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

  // Try Supabase verification (optional)
  if (supabaseAuthEnabled) {
    try {
      const supabaseResult = await verifySupabaseToken(token);
      if (supabaseResult) {
        const tier =
          supabaseResult.appUser.subscription_tier === 'unlimited' ? 'unlimited' : 'metered';
        const sessionUser = toSessionUserPayload(supabaseResult.appUser, {
          mode: 'standard',
          tierOverride: tier,
          roleOverride: 'subscriber',
        });
        const hydrated: RequestUserContext = {
          ...(sessionUser as any),
          authenticated: true,
          token,
          tokenProvider: 'supabase',
          supabaseUserId: supabaseResult.supabaseUser.id,
        };
        (request as any).user = hydrated;
        return hydrated;
      }
    } catch {
      // swallow; optional auth must not throw
    }
  }

  return unauthenticated;
};
