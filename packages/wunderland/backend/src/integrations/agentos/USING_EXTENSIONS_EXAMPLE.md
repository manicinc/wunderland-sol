# Using Extensions in AgentOS Backend

## Example: Adding Search Extension to Backend

This shows how to integrate the search extension into the backend AgentOS configuration.

```typescript
// backend/src/integrations/agentos/agentos.integration.ts

import { createExtensionPack as createSearchExtension } from '@framers/agentos-ext-search';

async function buildEmbeddedAgentOSConfig(): Promise<AgentOSConfig> {
  // ... existing config
  
  return {
    // ... other config
    
    // Extension configuration
    extensionManifest: {
      packs: [
        // Search Extension
        {
          factory: () => createSearchExtension({
            manifestEntry: {
              priority: 10,
              enabled: true
            } as any,
            source: { 
              sourceName: '@framers/agentos-ext-search',
              sourceVersion: '1.0.0'
            },
            options: {
              search: {
                provider: process.env.SEARCH_PROVIDER || 'serper',
                apiKey: process.env.SERPER_API_KEY || process.env.SERPAPI_API_KEY,
                rateLimit: 10
              }
            }
          }),
          priority: 10,
          enabled: true
        },
        
        // Add more extensions here
        // { factory: () => createWeatherExtension(...) },
        // { factory: () => createDatabaseExtension(...) }
      ],
      
      // Optional: Override specific tools
      overrides: {
        tools: {
          'researchAggregator': {
            enabled: true,  // Enable research aggregator by default
            priority: 15
          },
          'factCheck': {
            enabled: false  // Disable fact checker initially
          }
        }
      }
    },
    
    // Rest of config...
  };
}
```

## Environment Setup

Add to `backend/.env`:
```bash
# Search Extension Configuration
SEARCH_PROVIDER=serper
SERPER_API_KEY=your_serper_api_key_here

# Or use SerpAPI
# SEARCH_PROVIDER=serpapi
# SERPAPI_API_KEY=your_serpapi_key_here
```

## Testing the Integration

```typescript
// backend/test/extensions.test.ts

import { AgentOS } from '@framers/agentos';
import { agentosService } from '../src/integrations/agentos/agentos.integration';

describe('Search Extension Integration', () => {
  it('should have search tools available', async () => {
    // Get personas with search tools
    const personas = await agentosService.listAvailablePersonas();
    
    // Check tools are registered
    const agentosInstance = await agentosService.getAgentOS();
    const toolExecutor = agentosInstance.toolExecutor;
    
    expect(toolExecutor.getTool('webSearch')).toBeDefined();
    expect(toolExecutor.getTool('researchAggregator')).toBeDefined();
  });
  
  it('should execute search successfully', async () => {
    const input = {
      userId: 'test-user',
      sessionId: 'test-session',
      textInput: 'Search for information about quantum computing',
      selectedPersonaId: 'v_researcher'
    };
    
    const responses = await agentosService.processThroughAgentOS(input);
    
    // Should include tool call for webSearch
    const toolCalls = responses.filter(r => r.type === 'TOOL_CALL_REQUEST');
    expect(toolCalls.length).toBeGreaterThan(0);
  });
});
```

## Persona Configuration

Update personas to use the search tools:

```typescript
// backend/src/integrations/agentos/agentos.persona-registry.ts

const PERSONAS: AgentOSPersonaDefinition[] = [
  {
    personaId: 'v_researcher',
    agentIds: ['v_agent'],
    label: 'V',
    description: 'Advanced polymathic researcher',
    category: 'general',
    promptKey: 'v_default_assistant',
    promptPath: resolvePromptPath('v_default_assistant'),
    tags: ['research', 'analysis', 'deep-dive'],
    toolsetIds: ['search_tools'],  // Reference search tools
  },
  // ... other personas
];
```

Note: With the extension system, you don't need to hardcode toolsets. The tools are automatically available once the extension is loaded.

## API Usage

Once configured, the search tools are available through the API:

```bash
# Chat endpoint will use search tools when appropriate
POST /api/agentos/chat
{
  "userId": "user-123",
  "conversationId": "conv-456",
  "mode": "v_researcher",
  "messages": [
    {
      "role": "user",
      "content": "Search for the latest AI developments"
    }
  ]
}

# Response will include tool calls and results
{
  "type": "TOOL_CALL_REQUEST",
  "toolCall": {
    "name": "webSearch",
    "arguments": {
      "query": "latest AI developments",
      "numResults": 5,
      "timeRange": "week"
    }
  }
}
```

## Monitoring Extension Usage

```typescript
// Listen to extension events
extensionManager.on((event) => {
  if (event.type === 'pack:loaded') {
    console.log(`Extension loaded: ${event.source.sourceName}`);
  }
  if (event.type === 'descriptor:activated') {
    console.log(`Tool activated: ${event.descriptor.id}`);
  }
});

// Track tool usage
const toolOrchestrator = new ToolOrchestrator({
  logToolCalls: true,
  onToolExecuted: (toolName, input, result) => {
    // Log to analytics
    analytics.track('tool_used', {
      tool: toolName,
      success: result.success,
      provider: result.output?.provider
    });
  }
});
```

## Troubleshooting

### Extension Not Loading
```typescript
// Check if extension is registered
const extensionManager = agentos.extensionManager;
const toolRegistry = extensionManager.getRegistry('tool');
console.log('Registered tools:', toolRegistry.listActive());
```

### API Key Issues
```typescript
// Verify configuration
const searchTool = toolExecutor.getTool('webSearch');
const testResult = await searchTool.execute(
  { query: 'test' },
  { configuration: { search: { provider: 'serper' } } }
);
if (!testResult.success) {
  console.error('Search tool error:', testResult.error);
}
```

### Rate Limiting
The extension automatically handles rate limiting based on provider:
- Serper: 10 requests/second
- SerpAPI: 5 requests/second
- Brave: 5 requests/second
- DuckDuckGo: 1 request/second

