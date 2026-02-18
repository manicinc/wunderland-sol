# Multi-Tool Extension Template

Template for creating AgentOS extensions with multiple related tools.

## Structure

```
src/
├── index.ts           # Extension pack export
├── tools/
│   ├── tool1.ts      # First tool
│   ├── tool2.ts      # Second tool
│   └── tool3.ts      # Third tool
├── services/
│   └── shared.ts     # Shared service/logic
└── types.ts          # Type definitions
```

## Features

This template includes:
- Multiple tool implementations
- Shared service example
- Configuration management
- Comprehensive testing setup

## Getting Started

1. Copy this template to your category folder
2. Rename package and update metadata
3. Implement your tools
4. Share common logic in services
5. Write tests for each tool
6. Document usage

## Example Usage

```typescript
// src/index.ts
import { Tool1, Tool2, Tool3 } from './tools';
import { SharedService } from './services/shared';

export function createExtensionPack(context) {
  const service = new SharedService(context.options);
  
  return {
    name: '@framers/agentos-category-name',
    version: '1.0.0',
    descriptors: [
      {
        id: 'tool1',
        kind: 'tool',
        payload: new Tool1(service)
      },
      {
        id: 'tool2',
        kind: 'tool',
        payload: new Tool2(service)
      },
      {
        id: 'tool3',
        kind: 'tool',
        payload: new Tool3(service)
      }
    ]
  };
}
```

## Testing

Test each tool individually and the integration:

```typescript
// test/tool1.spec.ts
describe('Tool1', () => {
  // Tool-specific tests
});

// test/integration.spec.ts
describe('Extension Integration', () => {
  // Test tools working together
});
```
