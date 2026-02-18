/**
 * @file Integration tests for auth extension
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createAuthExtension } from '../src/index.js';
import { ToolPermissionProvider } from '../src/providers/ToolPermissionProvider.js';
import { PersonaTierProvider } from '../src/providers/PersonaTierProvider.js';

describe('Auth Extension Integration', () => {
  describe('createAuthExtension', () => {
    it('should create both auth and subscription services', () => {
      const { authService, subscriptionService } = createAuthExtension({
        auth: { jwtSecret: 'test-secret' },
        subscription: { defaultTier: 'free' },
      });

      expect(authService).toBeTruthy();
      expect(subscriptionService).toBeTruthy();
    });

    it('should work with minimal config', () => {
      const { authService, subscriptionService } = createAuthExtension();

      expect(authService).toBeTruthy();
      expect(subscriptionService).toBeTruthy();
    });
  });

  describe('End-to-End Auth Flow', () => {
    it('should complete full authentication cycle', async () => {
      const { authService, subscriptionService } = createAuthExtension({
        auth: { jwtSecret: 'test-secret' },
        subscription: { defaultTier: 'free' },
      });

      // 1. Register user (hash password)
      const password = 'secure-password-123';
      const hash = await authService.hashPassword!(password);
      expect(hash).toBeTruthy();

      // 2. Login (verify password + generate token)
      const passwordValid = await authService.verifyPassword!(password, hash);
      expect(passwordValid).toBe(true);

      const token = authService.generateToken!('user123', {
        email: 'test@example.com',
        tier: 'pro',
      });

      // 3. Validate token
      const user = await authService.validateToken(token);
      expect(user).toBeTruthy();
      expect(user?.id).toBe('user123');
      expect(user?.email).toBe('test@example.com');
      expect(user?.tier).toBe('pro');

      // 4. Check subscription
      const tier = await subscriptionService.getUserSubscription('user123');
      expect(tier).toBeTruthy();
    });
  });

  describe('Tool Permission Integration', () => {
    let toolPermissions: ToolPermissionProvider;
    let subscriptionService: ReturnType<typeof createAuthExtension>['subscriptionService'];

    beforeEach(() => {
      const extension = createAuthExtension({
        subscription: {
          defaultTier: 'free',
          tiers: [
            { name: 'free', level: 0, features: [], isActive: true },
            { name: 'pro', level: 1, features: ['FEATURE_ADVANCED_TOOLS'], isActive: true },
          ],
        },
      });

      subscriptionService = extension.subscriptionService;
      toolPermissions = new ToolPermissionProvider(subscriptionService);
    });

    it('should allow tool access with correct features', async () => {
      subscriptionService.setUserTier!('user123', 'pro');

      const result = await toolPermissions.checkToolAccess({
        userId: 'user123',
        toolId: 'advanced-tool',
        toolName: 'advancedTool',
        requiredFeatures: ['FEATURE_ADVANCED_TOOLS'],
      });

      expect(result.allowed).toBe(true);
    });

    it('should deny tool access without required features', async () => {
      subscriptionService.setUserTier!('user123', 'free');

      const result = await toolPermissions.checkToolAccess({
        userId: 'user123',
        toolId: 'advanced-tool',
        toolName: 'advancedTool',
        requiredFeatures: ['FEATURE_ADVANCED_TOOLS'],
      });

      expect(result.allowed).toBe(false);
      expect(result.missingFeatures).toContain('FEATURE_ADVANCED_TOOLS');
    });

    it('should get list of accessible tools', async () => {
      subscriptionService.setUserTier!('user123', 'pro');

      const tools = [
        { id: 'basic-tool', name: 'basic', requiredFeatures: [] },
        { id: 'advanced-tool', name: 'advanced', requiredFeatures: ['FEATURE_ADVANCED_TOOLS'] },
        { id: 'enterprise-tool', name: 'enterprise', requiredFeatures: ['FEATURE_ENTERPRISE'] },
      ];

      const accessible = await toolPermissions.getAccessibleTools('user123', tools);

      expect(accessible).toContain('basic-tool');
      expect(accessible).toContain('advanced-tool');
      expect(accessible).not.toContain('enterprise-tool');
    });
  });

  describe('Persona Tier Integration', () => {
    let personaTiers: PersonaTierProvider;
    let subscriptionService: ReturnType<typeof createAuthExtension>['subscriptionService'];

    beforeEach(() => {
      const extension = createAuthExtension({
        subscription: {
          defaultTier: 'free',
          tiers: [
            { name: 'free', level: 0, features: [], isActive: true },
            { name: 'pro', level: 1, features: [], isActive: true },
            { name: 'enterprise', level: 2, features: [], isActive: true },
          ],
        },
      });

      subscriptionService = extension.subscriptionService;
      personaTiers = new PersonaTierProvider(subscriptionService);
    });

    it('should allow persona access with sufficient tier', async () => {
      subscriptionService.setUserTier!('user123', 'pro');

      const result = await personaTiers.checkPersonaAccess({
        userId: 'user123',
        personaId: 'researcher',
        minimumTier: 'free',
      });

      expect(result.allowed).toBe(true);
    });

    it('should deny persona access with insufficient tier', async () => {
      subscriptionService.setUserTier!('user123', 'free');

      const result = await personaTiers.checkPersonaAccess({
        userId: 'user123',
        personaId: 'enterprise-researcher',
        minimumTier: 'enterprise',
      });

      expect(result.allowed).toBe(false);
      expect(result.requiredTier).toBe('enterprise');
    });

    it('should get list of accessible personas', async () => {
      subscriptionService.setUserTier!('user123', 'pro');

      const personas = [
        { id: 'free-persona', minimumTier: 'free' },
        { id: 'pro-persona', minimumTier: 'pro' },
        { id: 'enterprise-persona', minimumTier: 'enterprise' },
      ];

      const accessible = await personaTiers.getAccessiblePersonas('user123', personas);

      expect(accessible).toContain('free-persona');
      expect(accessible).toContain('pro-persona');
      expect(accessible).not.toContain('enterprise-persona');
    });
  });
});

