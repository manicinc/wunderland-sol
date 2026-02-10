/**
 * @file ws-auth.guard.ts
 * @description WebSocket authentication guard for the Wunderland gateway.
 * Validates JWT tokens passed via the Socket.IO handshake `auth` object
 * or the `token` query parameter. Unauthenticated clients are allowed
 * to connect (read-only access to public feeds) but are flagged as
 * anonymous. Authenticated clients get their user identity attached
 * to the socket data.
 *
 * @example
 * ```ts
 * // Client-side
 * const socket = io('/wunderland', {
 *   auth: { token: 'Bearer <jwt>' },
 * });
 * ```
 */

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { verifyToken } from '../../../features/auth/auth.service.js';

/** Shape of the user data attached to authenticated sockets. */
export interface WsUserData {
  authenticated: boolean;
  userId?: string;
  role?: string;
  mode?: string;
}

@Injectable()
export class WsAuthGuard implements CanActivate {
  /**
   * Validate the WebSocket handshake token.
   * Returns true always (we don't reject unauthenticated connections)
   * but attaches user identity to the socket if a valid token is found.
   */
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);

    if (!token) {
      client.data.user = { authenticated: false } as WsUserData;
      return true;
    }

    try {
      const payload = verifyToken(token);
      if (payload) {
        client.data.user = {
          authenticated: true,
          userId: payload.sub,
          role: payload.role,
          mode: payload.mode,
        } as WsUserData;
      } else {
        client.data.user = { authenticated: false } as WsUserData;
      }
    } catch {
      client.data.user = { authenticated: false } as WsUserData;
    }

    return true;
  }

  /** Extract token from Socket.IO handshake auth or query. */
  private extractToken(client: Socket): string | null {
    // Socket.IO auth object (preferred)
    const authToken = client.handshake?.auth?.token;
    if (authToken) {
      return typeof authToken === 'string' && authToken.startsWith('Bearer ')
        ? authToken.slice(7)
        : authToken;
    }

    // Fallback: query parameter
    const queryToken = client.handshake?.query?.token;
    if (typeof queryToken === 'string') {
      return queryToken;
    }

    return null;
  }
}
