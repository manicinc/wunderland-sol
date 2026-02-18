import type { IAuthService as AgentOSAuthServiceInterface } from '@framers/agentos/services/user_auth/types';
import { verifyToken, hashPassword, verifyPassword } from '../../features/auth/auth.service.js';
import { verifySupabaseToken, supabaseAuthEnabled } from '../../features/auth/supabaseAuth.service.js';

/**
 * Adapter that satisfies the legacy AgentOS auth-service contract by delegating
 * to the Voice Chat Assistant authentication helpers (JWT + Supabase).
 */
export class AgentOSAuthAdapter implements AgentOSAuthServiceInterface {
  async initialize(): Promise<void> {
    // No-op: the upstream auth stack is already initialized by the backend bootstrap.
  }

  async validateToken(token: string): Promise<any> {
    const legacyPayload = verifyToken(token);
    if (legacyPayload) {
      return {
        userId: legacyPayload.sub,
        email: legacyPayload.email,
        tier: legacyPayload.tier,
        mode: legacyPayload.mode,
      };
    }

    if (supabaseAuthEnabled) {
      const supabaseResult = await verifySupabaseToken(token);
      if (supabaseResult) {
        return {
          userId: supabaseResult.appUser.id,
          email: supabaseResult.appUser.email,
          tier: supabaseResult.appUser.subscription_tier,
          mode: 'standard',
        };
      }
    }

    return null;
  }

  async generateToken(_userId: string): Promise<string> {
    throw new Error('AgentOSAuthAdapter.generateToken is not supported. Use the primary auth service.');
  }

  async hashPassword(password: string): Promise<string> {
    return hashPassword(password);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return verifyPassword(password, hash);
  }
}

export const createAgentOSAuthAdapter = (): AgentOSAuthServiceInterface => new AgentOSAuthAdapter();


