/**
 * @file Tests for JWTAuthAdapter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JWTAuthAdapter } from '../src/adapters/JWTAuthAdapter.js';

describe('JWTAuthAdapter', () => {
  let auth: JWTAuthAdapter;

  beforeEach(() => {
    auth = new JWTAuthAdapter({
      jwtSecret: 'test-secret-key-for-testing',
      jwtExpiresIn: '1h',
      bcryptSaltRounds: 4, // Lower for faster tests
    });
  });

  describe('Token Generation', () => {
    it('should generate a valid JWT token', () => {
      const token = auth.generateToken('user123');
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include additional claims in token', () => {
      const token = auth.generateToken('user123', {
        email: 'test@example.com',
        roles: ['admin'],
        tier: 'pro',
      });

      const decoded = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );

      expect(decoded.sub).toBe('user123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.roles).toEqual(['admin']);
      expect(decoded.tier).toBe('pro');
    });
  });

  describe('Token Validation', () => {
    it('should validate a valid token', async () => {
      const token = auth.generateToken('user123', {
        email: 'test@example.com',
        tier: 'pro',
      });

      const user = await auth.validateToken(token);

      expect(user).toBeTruthy();
      expect(user?.id).toBe('user123');
      expect(user?.email).toBe('test@example.com');
      expect(user?.tier).toBe('pro');
    });

    it('should reject an invalid token', async () => {
      const user = await auth.validateToken('invalid.token.here');
      expect(user).toBeNull();
    });

    it('should reject an empty token', async () => {
      const user = await auth.validateToken('');
      expect(user).toBeNull();
    });

    it('should reject a token signed with wrong secret', async () => {
      const otherAuth = new JWTAuthAdapter({ jwtSecret: 'different-secret' });
      const token = otherAuth.generateToken('user123');

      const user = await auth.validateToken(token);
      expect(user).toBeNull();
    });
  });

  describe('Token Revocation', () => {
    it('should revoke a token', async () => {
      const token = auth.generateToken('user123');

      // Token should be valid initially
      const user1 = await auth.validateToken(token);
      expect(user1).toBeTruthy();

      // Revoke the token
      await auth.revokeToken(token);

      // Token should now be invalid
      const user2 = await auth.validateToken(token);
      expect(user2).toBeNull();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh a token within refresh window', async () => {
      // Create auth with short expiry for testing
      const shortAuth = new JWTAuthAdapter({
        jwtSecret: 'test-secret',
        jwtExpiresIn: '10s',
        refreshWindow: 20, // 20 seconds
        enableTokenRefresh: true,
      });

      const originalToken = shortAuth.generateToken('user123', {
        email: 'test@example.com',
      });

      const newToken = await shortAuth.refreshToken(originalToken);

      expect(newToken).toBeTruthy();
      expect(newToken).not.toBe(originalToken);

      // New token should be valid
      const user = await shortAuth.validateToken(newToken!);
      expect(user?.id).toBe('user123');
      expect(user?.email).toBe('test@example.com');
    });

    it('should not refresh when disabled', async () => {
      const noRefreshAuth = new JWTAuthAdapter({
        jwtSecret: 'test-secret',
        enableTokenRefresh: false,
      });

      const token = noRefreshAuth.generateToken('user123');
      const refreshed = await noRefreshAuth.refreshToken(token);

      expect(refreshed).toBeNull();
    });
  });

  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'secure-password-123';
      const hash = await auth.hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true); // BCrypt hashes start with $2
    });

    it('should verify correct password', async () => {
      const password = 'secure-password-123';
      const hash = await auth.hashPassword(password);

      const isValid = await auth.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'secure-password-123';
      const hash = await auth.hashPassword(password);

      const isValid = await auth.verifyPassword('wrong-password', hash);
      expect(isValid).toBe(false);
    });

    it('should handle invalid hash gracefully', async () => {
      const isValid = await auth.verifyPassword('password', 'invalid-hash');
      expect(isValid).toBe(false);
    });
  });

  describe('Initialization', () => {
    it('should initialize with config', async () => {
      const newAuth = new JWTAuthAdapter({ jwtSecret: 'initial-secret' });

      await newAuth.initialize({ jwtSecret: 'updated-secret' });

      // Should use updated secret
      const token = newAuth.generateToken('user123');
      expect(token).toBeTruthy();
    });
  });
});

