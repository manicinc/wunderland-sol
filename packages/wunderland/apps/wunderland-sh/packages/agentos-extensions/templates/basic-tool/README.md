# Template Extension for AgentOS

A template for creating new AgentOS extensions.

## Quick Start

1. **Copy this template**:
```bash
cp -r ext-template ext-myextension
cd ext-myextension
```

2. **Update package.json**:
- Change name to `@framers/agentos-ext-{yourname}`
- Update description, author, keywords

3. **Update manifest.json**:
- Change id to `com.framers.ext.{yourname}`
- Update metadata

4. **Implement your tools**:
- Create tools in `src/tools/`
- Implement `ITool` interface
- Export from `src/index.ts`

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Lint
npm run lint
```

## Structure

```
ext-template/
├── src/
│   ├── index.ts           # Extension pack export
│   ├── tools/
│   │   └── exampleTool.ts # Example tool implementation
│   └── types.ts           # TypeScript definitions
├── test/
│   └── unit/
│       └── exampleTool.spec.ts
├── manifest.json          # Extension metadata
├── package.json
└── README.md
```

## Creating a Tool

```typescript
import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';

export class MyTool implements ITool {
  readonly id = 'com.framers.ext.myext.myTool';
  readonly name = 'myTool';
  readonly displayName = 'My Tool';
  readonly description = 'What this tool does';
  
  readonly inputSchema = {
    type: 'object',
    properties: {
      // Define inputs
    },
    required: []
  };
  
  async execute(input: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    try {
      // Your implementation
      return { success: true, output: {} };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

## Configuration

Extensions can access configuration through the context:

```typescript
async execute(input: any, context: ToolExecutionContext) {
  const config = context.configuration?.['myext'] || {};
  const apiKey = config.apiKey;
  // Use configuration
}
```

### Declaring Secrets

If your tool needs an API key, declare it on the descriptor so hosts can surface the requirement:

```ts
requiredSecrets: [{ id: 'openai.apiKey' }],
onActivate: (ctx) => {
  exampleTool.setApiKey(ctx.getSecret?.('openai.apiKey'));
},
```

Secret IDs correspond to `packages/agentos/src/config/extension-secrets.json` and are also visible inside the AgentOS client UI.

## Testing

Write comprehensive tests:

```typescript
import { describe, it, expect } from 'vitest';
import { MyTool } from '../src/tools/myTool';

describe('MyTool', () => {
  it('executes correctly', async () => {
    const tool = new MyTool();
    const result = await tool.execute(
      { /* input */ },
      { /* context */ } as any
    );
    expect(result.success).toBe(true);
  });
});
```

## Publishing

1. Build: `npm run build`
2. Test: `npm test`
3. Version: `npm version patch|minor|major`
4. Publish: `npm publish --access public`

## License

MIT - See LICENSE
