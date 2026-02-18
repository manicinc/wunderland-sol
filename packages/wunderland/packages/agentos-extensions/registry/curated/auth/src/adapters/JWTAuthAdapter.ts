/**
 * @file JWT-based authentication adapter
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import type { IAuthService, IAuthenticatedUser, JWTPayload, JWTAuthConfig } from '../types.js';

const DEFAULT_CONFIG: Required<JWTAuthConfig> = {
  jwtSecret: 'CHANGE_ME_IN_PRODUCTION',
  jwtExpiresIn: '7d',
  bcryptSaltRounds: 10,
  enableTokenRefresh: true,
  refreshWindow: 3600,
};

/**
 * JWT-based authentication adapter for AgentOS
 */
export class JWTAuthAdapter implements IAuthService {
  private config: Required<JWTAuthConfig>;
  private revokedTokens: Set<string> = new Set();

  constructor(config: JWTAuthConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.jwtSecret === DEFAULT_CONFIG.jwtSecret) {
      console.warn('[JWTAuthAdapter] Using default JWT secret! Set jwtSecret in production.');
    }
  }

  async initialize(config?: JWTAuthConfig): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  async validateToken(token: string): Promise<IAuthenticatedUser | null> {
    if (!token || this.revokedTokens.has(token)) {
      return null;
    }

    try {
      const decoded = jwt.verify(token, this.config.jwtSecret) as JWTPayload;
      
      return {
        id: decoded.sub,
        email: decoded.email,
        username: decoded.username,
        roles: decoded.roles,
        tier: decoded.tier,
        mode: decoded.mode,
        metadata: decoded,
      };
    } catch {
      return null;
    }
  }

  generateToken(userId: string, claims?: Partial<JWTPayload>): string {
    const payload: JWTPayload = {
      sub: userId,
      ...claims,
    };

    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn,
    });
  }

  async refreshToken(token: string): Promise<string | null> {
    if (!this.config.enableTokenRefresh) return null;

    try {
      const decoded = jwt.verify(token, this.config.jwtSecret) as JWTPayload;
      
      if (decoded.exp) {
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decoded.exp - now;
        
        if (timeUntilExpiry > this.config.refreshWindow) {
          return null;
        }
      }

      const { iat, exp, ...claims } = decoded;
      return this.generateToken(decoded.sub, claims);
    } catch {
      return null;
    }
  }

  async revokeToken(token: string): Promise<void> {
    this.revokedTokens.add(token);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.bcryptSaltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }
}

