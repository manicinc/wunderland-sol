/**
 * Example 4: Custom Auth Provider
 * 
 * This example shows how to create your own custom auth provider
 * that implements the IAuthService interface.
 */

import { AgentOS } from '@framers/agentos';
import type { IAuthService, IAuthenticatedUser } from '@framers/agentos-extensions/auth';
import { SubscriptionAdapter } from '@framers/agentos-extensions/auth';

/**
 * Custom Auth Provider (could integrate with Auth0, Clerk, Supabase, etc.)
 */
class MyCustomAuthProvider implements IAuthService {
  private users: Map<string, { id: string; email: string; tier: string }>;
  private sessions: Map<string, string>; // token -> userId

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
  }

  async initialize(): Promise<void> {
    console.log('✓ Custom auth provider initialized');
    
    // Add some demo users
    this.users.set('user1', { id: 'user1', email: 'user1@example.com', tier: 'pro' });
    this.users.set('user2', { id: 'user2', email: 'user2@example.com', tier: 'free' });
  }

  async validateToken(token: string): Promise<IAuthenticatedUser | null> {
    // In a real implementation, this would validate the token with your auth provider
    // For demo, we just look it up in our sessions map
    const userId = this.sessions.get(token);
    if (!userId) {
      return null;
    }

    const user = this.users.get(userId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      tier: user.tier,
      roles: ['user'],
    };
  }

  generateToken(userId: string): string {
    // In a real implementation, this would call your auth provider's API
    // For demo, we generate a simple token
    const token = `custom-token-${userId}-${Date.now()}`;
    this.sessions.set(token, userId);
    return token;
  }

  async revokeToken(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  // Additional custom methods specific to your auth system
  async loginWithOAuth(provider: 'google' | 'github'): Promise<string> {
    console.log(`Logging in with ${provider}...`);
    // OAuth flow here
    return this.generateToken('user1');
  }

  async loginWithSAML(assertion: string): Promise<string> {
    console.log('Logging in with SAML...');
    // SAML flow here
    return this.generateToken('user1');
  }
}

async function main() {
  console.log('=== Example 4: Custom Auth Provider ===\n');

  // 1. Create your custom auth provider
  const customAuth = new MyCustomAuthProvider();
  await customAuth.initialize();

  // 2. Create subscription service (or use your own)
  const subscriptionService = new SubscriptionAdapter({
    defaultTier: 'free',
  });

  // 3. Initialize AgentOS with your custom auth
  const agentos = new AgentOS();
  await agentos.initialize({
    authService: customAuth,
    subscriptionService,
    // ... other config
  });

  console.log('✓ AgentOS initialized with custom auth provider\n');

  // 4. Use custom auth methods
  console.log('--- Custom Authentication Methods ---');

  // OAuth login
  const oauthToken = await customAuth.loginWithOAuth('google');
  console.log('✓ OAuth token generated:', oauthToken.substring(0, 30) + '...');

  // Validate token
  const user = await customAuth.validateToken(oauthToken);
  console.log('✓ User authenticated via OAuth:');
  console.log('  - ID:', user?.id);
  console.log('  - Email:', user?.email);
  console.log('  - Tier:', user?.tier);

  // SAML login
  const samlToken = await customAuth.loginWithSAML('saml-assertion-here');
  console.log('\n✓ SAML token generated:', samlToken.substring(0, 30) + '...');

  // 5. Use with AgentOS
  console.log('\n--- Using with AgentOS ---');
  
  if (user) {
    subscriptionService.setUserTier!(user.id, user.tier || 'free');
    const tier = await subscriptionService.getUserSubscription(user.id);
    console.log('✓ User subscription tier:', tier?.name);
  }

  // 6. Revoke token (logout)
  console.log('\n--- Logout ---');
  await customAuth.revokeToken(oauthToken);
  const afterRevoke = await customAuth.validateToken(oauthToken);
  console.log('✓ Token revoked:', afterRevoke === null ? 'success' : 'failed');

  console.log('\n✅ Custom auth provider example complete!');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

