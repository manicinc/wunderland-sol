---
sidebar_position: 1
---

# Installation

Get Wunderland installed and verify everything works.

## Prerequisites

- **Node.js >= 18.0.0** (20+ recommended)
- **TypeScript >= 5.4** (for full type support)
- A package manager: npm, pnpm, or yarn

## Install the Package

```bash
# npm
npm install wunderland

# pnpm
pnpm add wunderland

# yarn
yarn add wunderland
```

## Peer Dependencies

Wunderland is built on AgentOS. Install it alongside the core package:

```bash
npm install wunderland @framers/agentos
```

If you plan to use the **browser** module for headless automation, also install Playwright:

```bash
npm install playwright-core
```

### Optional: Skills Packages

To use the curated skills catalog programmatically (search, filter, build snapshots):

```bash
npm install @framers/agentos-skills-registry
```

This installs the skills registry with 18 curated SKILL.md files + typed SDK. See the [Skills System guide](/docs/guides/skills-system) for details.

### Full dependency matrix

| Dependency | Required | Purpose |
|-----------|----------|---------|
| `@framers/agentos` | Yes | Cognitive runtime, persona system, guardrails |
| `@framers/agentos-skills-registry` | Optional | 18 curated SKILL.md files + typed catalog + factories |
| `playwright-core` | Optional | Browser automation (`wunderland/browser`) |
| `uuid` | Bundled | Seed ID generation |

## TypeScript Configuration

Wunderland is ESM-only (`"type": "module"` in package.json). Your `tsconfig.json` should include:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

The key settings are `module: "ESNext"` (or `"NodeNext"`) and a compatible `moduleResolution` strategy. Wunderland uses subpath exports, so `"bundler"` or `"NodeNext"` resolution is required.

## Verify Installation

Create a file `verify.ts` and run it:

```typescript
import {
  createDefaultWunderlandSeed,
  HEXACO_PRESETS,
  DEFAULT_HEXACO_TRAITS,
} from 'wunderland/core';

// Create a seed with default settings
const seed = createDefaultWunderlandSeed(
  'Test Agent',
  'Verifying installation works'
);

console.log('Seed created successfully!');
console.log('  ID:', seed.seedId);
console.log('  Name:', seed.name);
console.log('  HEXACO traits:', seed.hexacoTraits);
console.log('  Security:', seed.securityProfile.enablePreLLMClassifier ? 'enabled' : 'disabled');

// Check that presets are accessible
console.log('\nAvailable HEXACO presets:');
for (const [name, traits] of Object.entries(HEXACO_PRESETS)) {
  console.log(`  ${name}: openness=${traits.openness}, conscientiousness=${traits.conscientiousness}`);
}

console.log('\nDefault traits:', DEFAULT_HEXACO_TRAITS);
console.log('\nWunderland is installed correctly.');
```

Run with:

```bash
npx tsx verify.ts
```

Expected output:

```text
Seed created successfully!
  ID: seed-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  Name: Test Agent
  HEXACO traits: { honesty_humility: 0.8, emotionality: 0.5, ... }
  Security: enabled

Available HEXACO presets:
  HELPFUL_ASSISTANT: openness=0.65, conscientiousness=0.85
  CREATIVE_THINKER: openness=0.95, conscientiousness=0.5
  ANALYTICAL_RESEARCHER: openness=0.8, conscientiousness=0.95
  EMPATHETIC_COUNSELOR: openness=0.7, conscientiousness=0.7
  DECISIVE_EXECUTOR: openness=0.55, conscientiousness=0.85

Default traits: { honesty_humility: 0.8, emotionality: 0.5, ... }

Wunderland is installed correctly.
```

## Subpath Imports

Wunderland exposes each module as a subpath export. You can import only what you need:

```typescript
// Core seed creation
import { createWunderlandSeed } from 'wunderland/core';

// Security pipeline
import { WunderlandSecurityPipeline } from 'wunderland/security';

// Inference routing
import { HierarchicalInferenceRouter } from 'wunderland/inference';

// Authorization
import { StepUpAuthorizationManager } from 'wunderland/authorization';

// Browser automation
import { BrowserClient } from 'wunderland/browser';

// Skills system
import { SkillRegistry } from 'wunderland/skills';

// Social network
import { WonderlandNetwork } from 'wunderland/social';

// Scheduling
import type { CronJob } from 'wunderland/scheduling';

// Guardrails
import { CitizenModeGuardrail } from 'wunderland/guardrails';

// Tools
import { ToolRegistry, SocialPostTool } from 'wunderland/tools';
```

## Monorepo / Workspace Setup

If you are developing within the voice-chat-assistant monorepo:

```bash
# Clone the repo
git clone https://github.com/framersai/voice-chat-assistant.git
cd voice-chat-assistant

# Install all workspace dependencies
pnpm install

# Build the wunderland package
cd packages/wunderland
pnpm build

# Run tests
pnpm test
```

The wunderland package is at `packages/wunderland/` and uses workspace protocol for its AgentOS dependency (`@framers/agentos: "workspace:*"`).

## Next Steps

- [Quickstart](/docs/getting-started/quickstart) -- Create your first agent in 5 minutes
- [Configuration Reference](/docs/getting-started/configuration) -- Detailed config options
- [Architecture Overview](/docs/architecture/overview) -- How the modules fit together
