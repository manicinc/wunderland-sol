/**
 * Example 5: Using AgentOS Without Auth
 * 
 * This example shows that AgentOS works perfectly fine without any
 * authentication or subscription services - they're completely optional!
 */

import { AgentOS } from '@framers/agentos';

async function main() {
  console.log('=== Example 5: AgentOS Without Auth ===\n');

  // 1. Initialize AgentOS without any auth services
  const agentos = new AgentOS();
  await agentos.initialize({
    // No authService - that's perfectly fine!
    // No subscriptionService - also fine!
    
    // Just provide other required config
    // ... other AgentOS configuration
  });

  console.log('✓ AgentOS initialized WITHOUT auth extension');
  console.log('  - No authentication required');
  console.log('  - No subscription tiers');
  console.log('  - All features available by default\n');

  // 2. AgentOS works normally
  console.log('--- Using AgentOS ---');
  console.log('✓ AgentOS is fully functional');
  console.log('  - All tools available');
  console.log('  - All personas accessible');
  console.log('  - No tier restrictions\n');

  // 3. When to use this approach
  console.log('--- Use Cases for No Auth ---');
  console.log('✓ Local development and testing');
  console.log('✓ Self-hosted single-user deployments');
  console.log('✓ Air-gapped environments');
  console.log('✓ Internal tools with other auth layers');
  console.log('✓ Prototyping and demos\n');

  // 4. Add auth later when needed
  console.log('--- Adding Auth Later ---');
  console.log('When you need auth, just install the extension:');
  console.log('  npm install @framers/agentos-extensions');
  console.log('\nThen inject auth services:');
  console.log('  const { authService, subscriptionService } = createAuthExtension({...});');
  console.log('  await agentos.initialize({ authService, subscriptionService });\n');

  console.log('✅ No-auth example complete!');
  console.log('\n💡 Key Takeaway: Auth is opt-in, not required!');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

