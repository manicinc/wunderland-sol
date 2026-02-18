# Migration Guide: From Hardcoded Tools to Extensions

## Current State

You currently have search tools hardcoded in:
- `backend/src/tools/search.tools.ts`
- `backend/src/services/searchProvider.service.ts`
- `backend/src/tools/handlers/searchToolHandler.ts`

## Migration Steps

### Step 1: Create Search Extension

```bash
# Copy template
cp -r packages/agentos-extensions/ext-template packages/agentos-extensions/ext-search

# Update package.json name to @framers/agentos-ext-search
# Update manifest.json id to com.framers.ext.search
```

### Step 2: Port Search Tool

Move logic from `backend/src/tools/search.tools.ts` to extension:

```typescript
// packages/agentos-extensions/ext-search/src/tools/webSearch.ts
import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';

export class WebSearchTool implements ITool {
  readonly id = 'com.framers.ext.search.webSearch';
  readonly name = 'webSearch';
  // ... port implementation
}
```

### Step 3: Port Search Service

Move `searchProvider.service.ts` logic into extension:

```typescript
// packages/agentos-extensions/ext-search/src/services/searchProvider.ts
export class SearchProviderService {
  // ... port implementation
}
```

### Step 4: Update AgentOS Configuration

```typescript
// backend/src/integrations/agentos/agentos.integration.ts
import { createExtensionPack as createSearchExtension } from '@framers/agentos-ext-search';

async function buildEmbeddedAgentOSConfig(): Promise<AgentOSConfig> {
  // ...
  return {
    // ... other config
    extensionManifest: {
      packs: [
        {
          factory: () => createSearchExtension({
            manifestEntry: {} as any,
            source: { sourceName: '@framers/agentos-ext-search' },
            options: {
              search: {
                provider: 'serper',
                apiKey: process.env.SERPER_API_KEY
              }
            }
          })
        }
      ]
    }
  };
}
```

### Step 5: Remove Hardcoded Tools

1. Delete:
   - `backend/src/tools/search.tools.ts`
   - `backend/src/services/searchProvider.service.ts`
   - `backend/src/tools/handlers/searchToolHandler.ts`
   - `backend/src/tools/handlers/index.ts` (if only search)

2. Remove from persona registry:
   - Remove `import { SearchAgentTools }` from `agentos.persona-registry.ts`
   - Remove `search_tools` from TOOLSETS
   - Remove `toolsetIds: ['search_tools']` from personas

### Step 6: Test Migration

```typescript
// Test that extension loads
const agentos = new AgentOS();
await agentos.initialize(config);
const tool = agentos.toolExecutor.getTool('webSearch');
expect(tool).toBeDefined();
```

## Benefits After Migration

1. **Modularity**: Search tools in separate package
2. **Versioning**: Independent version management
3. **Testing**: Isolated test suite
4. **Distribution**: Published to npm as `@framers/agentos-ext-search`
5. **Community**: Others can use/improve the extension

## Timeline

1. **Phase 1**: Create extension structure (done)
2. **Phase 2**: Port search tools to extension
3. **Phase 3**: Test with AgentOS runtime
4. **Phase 4**: Publish to npm
5. **Phase 5**: Remove hardcoded implementation

## Rollback Plan

If issues arise:
1. Keep hardcoded tools as fallback
2. Use feature flag to toggle between implementations
3. Gradual migration persona by persona

