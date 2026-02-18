/**
 * Example 1: Basic Authentication
 * 
 * This example shows how to use the auth extension with AgentOS for basic
 * JWT authentication and subscription management.
 */

import { AgentOS } from '@framers/agentos';
import { createAuthExtension } from '@framers/agentos-extensions/auth';

async function main() {
  console.log('=== Example 1: Basic Authentication ===\n');

  // 1. Create auth extension with configuration
  const { authService, subscriptionService } = createAuthExtension({
    auth: {
      jwtSecret: process.env.JWT_SECRET || 'demo-secret-change-in-production',
      jwtExpiresIn: '7d',
      bcryptSaltRounds: 12,
    },
    subscription: {
      defaultTier: 'free',
      tiers: [
        { name: 'free', level: 0, features: [], isActive: true },
        { name: 'pro', level: 1, features: ['FEATURE_ADVANCED_SEARCH'], isActive: true },
      ],
    },
  });

  // 2. Initialize AgentOS with auth services
  const agentos = new AgentOS();
  await agentos.initialize({
    authService,
    subscriptionService,
    // ... other AgentOS config
  });

  console.log('✓ AgentOS initialized with auth extension\n');

  // 3. User Registration Flow
  console.log('--- User Registration ---');
  const userId = 'user-123';
  const email = 'user@example.com';
  const password = 'secure-password-123';

  // Hash password for storage
  const passwordHash = await authService.hashPassword!(password);
  console.log(`✓ Password hashed for user: ${email}`);

  // 4. User Login Flow
  console.log('\n--- User Login ---');

  // Verify password
  const isPasswordValid = await authService.verifyPassword!(password, passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid password');
  }
  console.log('✓ Password verified');

  // Generate JWT token
  const token = authService.generateToken!(userId, {
    email,
    roles: ['user'],
    tier: 'pro',
  });
  console.log('✓ JWT token generated:', token.substring(0, 20) + '...');

  // 5. Token Validation (on subsequent requests)
  console.log('\n--- Token Validation ---');
  const authenticatedUser = await authService.validateToken(token);
  if (!authenticatedUser) {
    throw new Error('Token validation failed');
  }

  console.log('✓ User authenticated:');
  console.log('  - ID:', authenticatedUser.id);
  console.log('  - Email:', authenticatedUser.email);
  console.log('  - Tier:', authenticatedUser.tier);

  // 6. Check Subscription Tier
  console.log('\n--- Subscription Check ---');
  subscriptionService.setUserTier!(userId, 'pro');
  const tier = await subscriptionService.getUserSubscription(userId);

  console.log('✓ User subscription tier:');
  console.log('  - Name:', tier?.name);
  console.log('  - Level:', tier?.level);
  console.log('  - Features:', tier?.features?.join(', ') || 'none');

  // 7. Feature Access Check
  const hasAdvancedSearch = await subscriptionService.validateAccess(
    userId,
    'FEATURE_ADVANCED_SEARCH'
  );
  console.log('  - Advanced Search:', hasAdvancedSearch ? '✓ Allowed' : '✗ Denied');

  // 8. Token Refresh
  console.log('\n--- Token Refresh ---');
  const refreshedToken = await authService.refreshToken!(token);
  if (refreshedToken) {
    console.log('✓ Token refreshed:', refreshedToken.substring(0, 20) + '...');
  } else {
    console.log('ℹ Token not yet in refresh window');
  }

  // 9. Token Revocation (logout)
  console.log('\n--- Logout ---');
  await authService.revokeToken!(token);
  const afterRevocation = await authService.validateToken(token);
  console.log('✓ Token revoked:', afterRevocation === null ? 'success' : 'failed');

  console.log('\n✅ Basic auth example complete!');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

