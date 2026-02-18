/**
 * Example 2: Tool Permission Integration
 * 
 * This example shows how to integrate the auth extension with AgentOS tool
 * permissions to control which tools users can access based on their subscription tier.
 */

import { AgentOS } from '@framers/agentos';
import { createAuthExtension, ToolPermissionProvider } from '@framers/agentos-extensions/auth';

async function main() {
  console.log('=== Example 2: Tool Permission Integration ===\n');

  // 1. Create auth extension with tiered features
  const { authService, subscriptionService } = createAuthExtension({
    auth: { jwtSecret: 'demo-secret' },
    subscription: {
      defaultTier: 'free',
      tiers: [
        {
          name: 'free',
          level: 0,
          features: [],
          isActive: true,
        },
        {
          name: 'basic',
          level: 1,
          features: ['FEATURE_WEB_SEARCH'],
          isActive: true,
        },
        {
          name: 'pro',
          level: 2,
          features: ['FEATURE_WEB_SEARCH', 'FEATURE_CODE_EXECUTION'],
          isActive: true,
        },
        {
          name: 'enterprise',
          level: 3,
          features: [
            'FEATURE_WEB_SEARCH',
            'FEATURE_CODE_EXECUTION',
            'FEATURE_DATABASE_ACCESS',
          ],
          isActive: true,
        },
      ],
    },
  });

  // 2. Create tool permission provider
  const toolPermissions = new ToolPermissionProvider(subscriptionService);

  // 3. Initialize AgentOS
  const agentos = new AgentOS();
  await agentos.initialize({
    authService,
    subscriptionService,
  });

  console.log('✓ AgentOS initialized with auth extension\n');

  // 4. Define available tools with their requirements
  const availableTools = [
    {
      id: 'basic-calculator',
      name: 'calculator',
      requiredFeatures: [], // Free for all
    },
    {
      id: 'web-search',
      name: 'webSearch',
      requiredFeatures: ['FEATURE_WEB_SEARCH'],
    },
    {
      id: 'code-executor',
      name: 'executeCode',
      requiredFeatures: ['FEATURE_CODE_EXECUTION'],
    },
    {
      id: 'database-query',
      name: 'queryDatabase',
      requiredFeatures: ['FEATURE_DATABASE_ACCESS'],
    },
  ];

  // 5. Test access for different user tiers
  const users = [
    { id: 'user-free', tier: 'free' },
    { id: 'user-basic', tier: 'basic' },
    { id: 'user-pro', tier: 'pro' },
    { id: 'user-enterprise', tier: 'enterprise' },
  ];

  for (const user of users) {
    console.log(`\n--- ${user.tier.toUpperCase()} User (${user.id}) ---`);
    subscriptionService.setUserTier!(user.id, user.tier);

    // Check access to each tool
    for (const tool of availableTools) {
      const result = await toolPermissions.checkToolAccess({
        userId: user.id,
        toolId: tool.id,
        toolName: tool.name,
        requiredFeatures: tool.requiredFeatures,
      });

      const status = result.allowed ? '✓ Allowed' : '✗ Denied';
      console.log(`  ${tool.name}: ${status}`);

      if (!result.allowed && result.missingFeatures) {
        console.log(`    Missing: ${result.missingFeatures.join(', ')}`);
      }
    }

    // Get list of accessible tools
    const accessibleTools = await toolPermissions.getAccessibleTools(
      user.id,
      availableTools
    );
    console.log(`  Accessible tools: ${accessibleTools.join(', ')}`);
  }

  // 6. Simulate tool execution with permission check
  console.log('\n--- Simulating Tool Execution ---');
  const userId = 'user-basic';
  const toolToExecute = 'webSearch';
  const tool = availableTools.find((t) => t.name === toolToExecute);

  if (tool) {
    const result = await toolPermissions.checkToolAccess({
      userId,
      toolId: tool.id,
      toolName: tool.name,
      requiredFeatures: tool.requiredFeatures,
    });

    if (result.allowed) {
      console.log(`✓ Executing ${toolToExecute}...`);
      // Execute tool here
      console.log(`  Result: [search results]`);
    } else {
      console.log(`✗ Access denied: ${result.reason}`);
      console.log('  Upgrade to:', result.missingFeatures?.join(', '));
    }
  }

  console.log('\n✅ Tool permissions example complete!');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

