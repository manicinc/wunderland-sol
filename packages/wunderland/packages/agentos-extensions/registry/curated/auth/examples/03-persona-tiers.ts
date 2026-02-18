/**
 * Example 3: Persona Tier Gating
 * 
 * This example shows how to gate access to different personas based on
 * user subscription tiers.
 */

import { AgentOS } from '@framers/agentos';
import { createAuthExtension, PersonaTierProvider } from '@framers/agentos-extensions/auth';

async function main() {
  console.log('=== Example 3: Persona Tier Gating ===\n');

  // 1. Create auth extension
  const { authService, subscriptionService } = createAuthExtension({
    auth: { jwtSecret: 'demo-secret' },
    subscription: {
      defaultTier: 'free',
      tiers: [
        { name: 'free', level: 0, features: [], isActive: true },
        { name: 'pro', level: 1, features: [], isActive: true },
        { name: 'enterprise', level: 2, features: [], isActive: true },
      ],
    },
  });

  // 2. Create persona tier provider
  const personaTiers = new PersonaTierProvider(subscriptionService);

  // 3. Initialize AgentOS
  const agentos = new AgentOS();
  await agentos.initialize({
    authService,
    subscriptionService,
  });

  console.log('✓ AgentOS initialized with auth extension\n');

  // 4. Define available personas with tier requirements
  const availablePersonas = [
    {
      id: 'basic-assistant',
      name: 'Basic Assistant',
      minimumTier: undefined, // Free for all
    },
    {
      id: 'v-researcher',
      name: 'V - The Researcher',
      minimumTier: 'free',
    },
    {
      id: 'code-expert',
      name: 'Code Expert',
      minimumTier: 'pro',
    },
    {
      id: 'enterprise-analyst',
      name: 'Enterprise Analyst',
      minimumTier: 'enterprise',
    },
  ];

  // 5. Test persona access for different user tiers
  const users = [
    { id: 'user-free', tier: 'free' },
    { id: 'user-pro', tier: 'pro' },
    { id: 'user-enterprise', tier: 'enterprise' },
  ];

  for (const user of users) {
    console.log(`\n--- ${user.tier.toUpperCase()} User (${user.id}) ---`);
    subscriptionService.setUserTier!(user.id, user.tier);

    // Check access to each persona
    for (const persona of availablePersonas) {
      const result = await personaTiers.checkPersonaAccess({
        userId: user.id,
        personaId: persona.id,
        minimumTier: persona.minimumTier,
      });

      const status = result.allowed ? '✓ Allowed' : '✗ Denied';
      const tierInfo = persona.minimumTier ? ` (requires ${persona.minimumTier})` : '';
      console.log(`  ${persona.name}${tierInfo}: ${status}`);

      if (!result.allowed) {
        console.log(`    Upgrade to: ${result.requiredTier}`);
      }
    }

    // Get list of accessible personas
    const accessiblePersonas = await personaTiers.getAccessiblePersonas(
      user.id,
      availablePersonas
    );
    console.log(`  Accessible personas: ${accessiblePersonas.length}/${availablePersonas.length}`);
  }

  // 6. Simulate persona selection with tier check
  console.log('\n--- Simulating Persona Selection ---');
  const userId = 'user-pro';
  const selectedPersona = 'enterprise-analyst';
  const persona = availablePersonas.find((p) => p.id === selectedPersona);

  if (persona) {
    const result = await personaTiers.checkPersonaAccess({
      userId,
      personaId: persona.id,
      minimumTier: persona.minimumTier,
    });

    if (result.allowed) {
      console.log(`✓ Loading persona: ${persona.name}...`);
      console.log(`  User tier: ${result.userTier?.name}`);
      // Load and activate persona here
    } else {
      console.log(`✗ Access denied: ${result.reason}`);
      console.log(`  Your tier: ${result.userTier?.name} (level ${result.userTier?.level})`);
      console.log(`  Required: ${result.requiredTier}`);
      console.log('\n  💡 Upgrade your subscription to access this persona');
    }
  }

  // 7. Get recommended tier for a persona
  console.log('\n--- Persona Recommendations ---');
  for (const persona of availablePersonas) {
    if (persona.minimumTier) {
      const recommendedTier = await personaTiers.getRecommendedTier(
        persona.id,
        persona.minimumTier
      );
      console.log(`  ${persona.name}: ${recommendedTier || 'any'} tier`);
    }
  }

  console.log('\n✅ Persona tier gating example complete!');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

