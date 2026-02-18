// File: backend/middleware/optionalAuth.ts
/**
 * @file Optional Authentication Middleware
 * @description Attempts to authenticate a user based on a Bearer token if present.
 * Populates `req.user` if authentication is successful but does NOT reject
 * the request if authentication fails or no token is provided. This allows routes
 * to be "authentication-aware" for features like rate limiting or personalization,
 * while still being publicly accessible if stricter auth is not enforced later.
 * @version 1.0.0
 */
import { Request, Response, NextFunction } from 'express';
import { verifyToken, toSessionUserPayload } from '../src/features/auth/auth.service.js';
import { verifySupabaseToken, supabaseAuthEnabled } from '../src/features/auth/supabaseAuth.service.js';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  const cookieToken = (req as any).cookies?.authToken;
  return cookieToken || null;
};

export const optionalAuthMiddleware = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    (req as any).user = { authenticated: false, mode: 'demo' };
    const token = extractToken(req);
    if (!token) {
      return next();
    }

  const globalPayload = verifyToken(token);
  if (globalPayload) {
    const tokenProvider =
      globalPayload.mode === 'global'
        ? 'global'
        : globalPayload.mode === 'registration'
          ? 'registration'
          : 'internal';
    (req as any).user = { ...globalPayload, authenticated: true, token, tokenProvider };
    return next();
  }

    if (supabaseAuthEnabled) {
      const supabaseResult = await verifySupabaseToken(token);
      if (supabaseResult) {
        const tier = supabaseResult.appUser.subscription_tier === 'unlimited' ? 'unlimited' : 'metered';
        const sessionUser = toSessionUserPayload(supabaseResult.appUser, {
          mode: 'standard',
          tierOverride: tier,
          roleOverride: 'subscriber',
        });
        (req as any).user = {
          ...sessionUser,
          authenticated: true,
          token,
          tokenProvider: 'supabase',
          supabaseUserId: supabaseResult.supabaseUser.id,
        };
      }
    }

    next();
  } catch (error) {
    console.error('[optionalAuthMiddleware] Error verifying token:', error);
    next();
  }
};
