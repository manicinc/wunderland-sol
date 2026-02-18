// File: backend/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken, toSessionUserPayload } from '../src/features/auth/auth.service.js';
import { verifySupabaseToken, supabaseAuthEnabled } from '../src/features/auth/supabaseAuth.service.js';

const PUBLIC_AUTH_ROUTES: Array<{ method: string; path: string }> = [
  { method: 'POST', path: '/api/auth/global' },
  { method: 'POST', path: '/api/auth/login' },
  { method: 'POST', path: '/api/auth/register' },
  { method: 'DELETE', path: '/api/auth' },
];

declare global {
  // Augment Express Request safely without relying on express-serve-static-core module name
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Request {
      // Populated by auth middleware when a user is authenticated
      user?: any;
    }
  }
}

const extractToken = (req: Request): string | null => {
  const authorization = req.headers.authorization;
  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.slice(7);
  }
  const cookieToken = (req as any).cookies?.authToken;
  return cookieToken || null;
};

const isPublicAuthRoute = (req: Request): boolean => {
  return PUBLIC_AUTH_ROUTES.some((route) => {
    if (req.method !== route.method) return false;
    return req.originalUrl.startsWith(route.path);
  });
};

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (isPublicAuthRoute(req)) {
    return next();
  }

  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: Authentication required.', error: 'AUTHENTICATION_REQUIRED' });
  }

  const payload = verifyToken(token);
  if (payload) {
    const tokenProvider = payload.mode === 'registration' ? 'registration' : 'internal';
    (req as any).user = { ...payload, authenticated: true, token, tokenProvider };
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
      return next();
    }
  }

  return res.status(401).json({ message: 'Unauthorized: Invalid or expired session.', error: 'INVALID_TOKEN' });
};
