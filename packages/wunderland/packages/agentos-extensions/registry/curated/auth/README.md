# Authentication Extension for AgentOS

Authentication and subscription management extension that integrates with AgentOS via the service injection pattern.

## Why This Exists

Auth logic doesn't belong in the core library. This extension demonstrates clean separation:
- Core AgentOS: Pure orchestration
- Auth Extension: Optional middleware
- Your choice: Use ours, bring your own, or omit entirely

## Installation

```typescript
import { createAuthExtension } from '@framers/agentos-extensions/auth';
import { AgentOS } from '@framers/agentos';

const authExtension = createAuthExtension({
  jwtSecret: process.env.JWT_SECRET,
  defaultTier: 'free',
});

const agentos = new AgentOS();
await agentos.initialize({
  authService: authExtension.authService,
  subscriptionService: authExtension.subscriptionService,
});
```

## Features

- **JWT Authentication**: Token generation, validation, refresh
- **Password Hashing**: BCrypt with configurable rounds
- **Subscription Tiers**: Multi-tier with feature flags
- **Tool Permissions**: Integrate with AgentOS tool system
- **Persona Gating**: Tier-based persona access

## Usage

See [examples](./examples/) for complete integration patterns.

## Author

Framers AI (support@frame.dev)

## License

MIT

