<div align="center">

<p align="center">
  <a href="https://agentos.sh"><img src="../../logos/agentos-primary-no-tagline-transparent-2x.png" alt="AgentOS" height="64" /></a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://frame.dev" target="_blank" rel="noopener"><img src="../../logos/frame-logo-green-no-tagline.svg" alt="Frame.dev" height="40" /></a>
</p>

# @framersai/agentos-personas

Curated personas and marketplace for AgentOS, part of the Frame.dev ecosystem.

*The OS for humans, the codex of humanity.*

[Frame.dev](https://frame.dev) • [AgentOS](https://agentos.sh)

</div>

---

Curated personas and marketplace for AgentOS. This package contains AI agent personalities that can be loaded dynamically into AgentOS.

## Why Separate from Extensions?

Personas are **identity** - they define how agents think and behave.  
Extensions are **capability** - they define what agents can do.

Keeping them separate allows:
- Different curation/review processes
- Marketplace vs. functional registry
- Independent versioning
- Clear concerns

## Installation

```bash
npm install @framersai/agentos-personas
# or
pnpm add @framersai/agentos-personas
```

## Usage

### Load from Registry

```typescript
import { AgentOS } from '@framers/agentos';

const agentos = new AgentOS();
await agentos.initialize({
  personaLoader: {
    sources: [
      {
        type: 'npm',
        location: '@framersai/agentos-personas',
        verified: true,
      }
    ]
  }
});

// Personas automatically loaded and available
```

### Configure Multiple Sources

```typescript
await agentos.initialize({
  personaLoader: {
    sources: [
      {
        type: 'npm',
        location: '@framersai/agentos-personas',
        verified: true,
      },
      {
        type: 'github',
        location: 'your-org/custom-personas',
        branch: 'main',
      },
      {
        type: 'file',
        location: './local-personas',
      }
    ]
  }
});
```

## Persona Structure

Each persona lives in its own directory:

```
registry/curated/v-researcher/
├── manifest.json        # Metadata
├── persona.json         # Persona definition
├── README.md            # Documentation
└── examples/            # Usage examples
```

### manifest.json

```json
{
  "id": "v_researcher",
  "name": "V - The Researcher",
  "version": "1.0.0",
  "author": {
    "name": "Framers AI",
    "email": "support@frame.dev"
  },
  "category": "research",
  "minimumTier": "free",
  "verified": true,
  "verifiedAt": "2025-11-14T00:00:00Z"
}
```

## Contributing Personas

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines on submitting personas to the community registry.

## Marketplace

Personas in this registry can be featured on the AgentOS marketplace at [agentos.sh](https://agentos.sh).

## License

MIT © Framers AI

