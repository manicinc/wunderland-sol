/**
 * @file auth.service.ts (NestJS)
 * @description Injectable wrapper around the existing auth.service.ts functions.
 * Re-exports key auth operations for use in other NestJS modules.
 */

import { Injectable } from '@nestjs/common';
import { verifyToken, toSessionUserPayload } from '../../features/auth/auth.service.js';

@Injectable()
export class AuthNestService {
  /** Verify a JWT token and return the payload, or null if invalid. */
  verifyToken(token: string): ReturnType<typeof verifyToken> {
    return verifyToken(token);
  }

  /** Convert a database user record to a session-safe payload. */
  toSessionUserPayload(
    appUser: Parameters<typeof toSessionUserPayload>[0],
    options: Parameters<typeof toSessionUserPayload>[1]
  ): ReturnType<typeof toSessionUserPayload> {
    return toSessionUserPayload(appUser, options);
  }
}
