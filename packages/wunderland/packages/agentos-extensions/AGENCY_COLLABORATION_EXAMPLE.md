# Agency Collaboration Example: Research & Communication Team

This example demonstrates how two GMIs (Generalized Mind Instances) collaborate in an AgentOS agency to research topics and communicate findings via Telegram.

## Understanding the Architecture

### Tools vs Extensions

- **Extensions**: Packages that provide capabilities to AgentOS (tools, guardrails, workflows)
- **Tools**: Specific type of extension (kind: "tool") implementing the `ITool` interface
- **Registration**: Extensions are loaded via the `ExtensionManager` and tools become available to all GMIs in the agency

## The Scenario

An agency with two GMIs working together:
1. **Research GMI** - Specializes in web research and fact-checking
2. **Communications GMI** - Manages Telegram communications and formatting

## Setup

### 1. Environment Configuration

```bash
# .env file
TELEGRAM_BOT_TOKEN=your-bot-token-here
SERPER_API_KEY=your-serper-key-here
SERPAPI_API_KEY=your-serpapi-key-here  # Optional
BRAVE_API_KEY=your-brave-key-here      # Optional
```

### 2. Extension Installation

```bash
npm install @framers/agentos-ext-web-search
npm install @framers/agentos-ext-telegram
```

### 3. Agency Configuration

```typescript
import { AgentOS, AgencyRegistry, GMIManager } from '@framers/agentos';
import { createExtensionPack as createSearchPack } from '@framers/agentos-ext-web-search';
import { createExtensionPack as createTelegramPack } from '@framers/agentos-ext-telegram';

// Initialize AgentOS with extensions
const agentos = new AgentOS({
  extensionManifest: {
    packs: [
      {
        // Web Search Extension - reads API keys from env
        factory: () => createSearchPack({
          options: {
            // Automatically reads from SERPER_API_KEY, SERPAPI_API_KEY, etc.
            defaultMaxResults: 10,
            rateLimit: {
              maxRequests: 10,
              windowMs: 60000
            }
          },
          logger: console
        })
      },
      {
        // Telegram Extension - flexible API key configuration
        factory: () => createTelegramPack({
          options: {
            // Option 1: Read from default env var (TELEGRAM_BOT_TOKEN)
            // botToken is automatically read from process.env.TELEGRAM_BOT_TOKEN
            
            // Option 2: Specify custom env var name
            // botTokenEnv: 'MY_CUSTOM_TELEGRAM_TOKEN'
            
            // Option 3: Direct token (not recommended for production)
            // botToken: 'direct-token-here'
            
            defaultParseMode: 'Markdown',
            enableTypingAction: true
          },
          logger: console
        })
      }
    ]
  }
});

await agentos.initialize();
```

## Agency Workflow Example

### Workflow Definition

```typescript
// Define a research and communication workflow
const researchWorkflow = {
  id: 'research-and-report',
  name: 'Research Topic and Send Report',
  description: 'Research a topic thoroughly and send findings via Telegram',
  
  roles: [
    {
      id: 'researcher',
      name: 'Research Specialist',
      capabilities: ['webSearch', 'researchAggregator', 'factCheck'],
      persona: 'research_specialist'
    },
    {
      id: 'communicator',
      name: 'Communications Manager',
      capabilities: ['telegramSendMessage', 'telegramSendDocument'],
      persona: 'communications_manager'
    }
  ],
  
  tasks: [
    {
      id: 'initial-research',
      executor: 'researcher',
      tool: 'researchAggregator',
      inputs: {
        topic: '{{input.topic}}',
        sources: 5,
        depth: 'comprehensive'
      }
    },
    {
      id: 'fact-check',
      executor: 'researcher',
      tool: 'factCheck',
      dependsOn: ['initial-research'],
      inputs: {
        statement: '{{input.claimsToVerify}}',
        checkSources: true
      }
    },
    {
      id: 'format-report',
      executor: 'communicator',
      dependsOn: ['initial-research', 'fact-check'],
      transform: async (context) => {
        const research = context.results['initial-research'];
        const factCheck = context.results['fact-check'];
        
        return {
          title: `📊 Research Report: ${context.input.topic}`,
          summary: formatSummary(research),
          factCheckResults: formatFactCheck(factCheck),
          sources: formatSources(research.aggregatedResults)
        };
      }
    },
    {
      id: 'send-telegram-report',
      executor: 'communicator',
      tool: 'telegramSendMessage',
      dependsOn: ['format-report'],
      inputs: {
        chatId: '{{input.telegramChatId}}',
        text: '{{results.format-report.output}}',
        parseMode: 'Markdown'
      }
    }
  ]
};
```

### Creating the Agency

```typescript
// Initialize GMI Manager
const gmiManager = new GMIManager(config, services);

// Create agency
const agencyRegistry = new AgencyRegistry();
const agency = await agencyRegistry.createAgency({
  workflowId: 'research-and-report',
  conversationId: 'conv-123',
  metadata: {
    name: 'Research & Communications Team',
    purpose: 'Automated research and reporting'
  }
});

// Register GMIs to agency seats
const researcherGMI = await gmiManager.createGMI({
  personaId: 'research_specialist',
  agencyContext: {
    agencyId: agency.agencyId,
    roleId: 'researcher',
    workflowId: 'research-and-report'
  }
});

const communicatorGMI = await gmiManager.createGMI({
  personaId: 'communications_manager',
  agencyContext: {
    agencyId: agency.agencyId,
    roleId: 'communicator',
    workflowId: 'research-and-report'
  }
});
```

### Executing the Workflow

```typescript
// Execute agency workflow
const result = await agentos.executeAgencyWorkflow({
  agencyId: agency.agencyId,
  input: {
    topic: 'Latest developments in quantum computing',
    claimsToVerify: 'Quantum computers can break current encryption',
    telegramChatId: '@mychannel'
  }
});

// The workflow will:
// 1. Research GMI searches for quantum computing info
// 2. Research GMI fact-checks the encryption claim
// 3. Communications GMI formats the findings
// 4. Communications GMI sends the report to Telegram
```

## Advanced Collaboration Patterns

### 1. Parallel Research with Aggregation

```typescript
const parallelResearchWorkflow = {
  tasks: [
    // Three GMIs research different aspects in parallel
    {
      id: 'research-technical',
      executor: 'researcher1',
      tool: 'webSearch',
      inputs: { query: '{{topic}} technical specifications' }
    },
    {
      id: 'research-market',
      executor: 'researcher2',
      tool: 'webSearch',
      inputs: { query: '{{topic}} market analysis' }
    },
    {
      id: 'research-news',
      executor: 'researcher3',
      tool: 'webSearch',
      inputs: { query: '{{topic}} latest news' }
    },
    // Aggregator combines all research
    {
      id: 'combine-research',
      executor: 'lead-researcher',
      dependsOn: ['research-technical', 'research-market', 'research-news'],
      tool: 'researchAggregator',
      transform: (context) => ({
        topic: context.input.topic,
        technical: context.results['research-technical'],
        market: context.results['research-market'],
        news: context.results['research-news']
      })
    }
  ]
};
```

### 2. Iterative Fact-Checking

```typescript
const iterativeFactCheckWorkflow = {
  tasks: [
    {
      id: 'initial-claim',
      executor: 'researcher',
      tool: 'factCheck',
      inputs: { statement: '{{claim}}' }
    },
    {
      id: 'verify-sources',
      executor: 'verifier',
      dependsOn: ['initial-claim'],
      condition: 'results.initial-claim.confidence < 80',
      tool: 'webSearch',
      inputs: { 
        query: '{{claim}} verified sources academic papers' 
      }
    },
    {
      id: 'final-verification',
      executor: 'researcher',
      dependsOn: ['verify-sources'],
      tool: 'factCheck',
      inputs: {
        statement: '{{claim}}',
        checkSources: true,
        confidence: 'high'
      }
    }
  ]
};
```

### 3. Scheduled Monitoring

```typescript
// GMIs can work autonomously on schedules
const monitoringAgency = await agencyRegistry.createAgency({
  workflowId: 'monitor-and-alert',
  schedule: '0 */6 * * *', // Every 6 hours
  tasks: [
    {
      executor: 'monitor-gmi',
      tool: 'webSearch',
      inputs: { query: 'breaking news {{monitored_topic}}' }
    },
    {
      executor: 'alert-gmi',
      condition: 'results.hasBreakingNews',
      tool: 'telegramSendMessage',
      inputs: {
        chatId: '{{alert_channel}}',
        text: '🚨 Breaking: {{results.summary}}'
      }
    }
  ]
});
```

## Environment Variable Flexibility

The extensions support multiple ways to provide API keys:

### Web Search Extension

```typescript
// Automatically checks these env vars in order:
// SERPER_API_KEY, SERPAPI_API_KEY, BRAVE_API_KEY

// Or provide explicitly:
createSearchPack({
  options: {
    serperApiKey: process.env.MY_SERPER_KEY,
    serpApiKey: process.env.MY_SERPAPI_KEY
  }
});
```

### Telegram Extension

```typescript
// Method 1: Default env var
// Reads from TELEGRAM_BOT_TOKEN
createTelegramPack({ options: {} });

// Method 2: Custom env var
createTelegramPack({
  options: {
    botTokenEnv: 'MY_BOT_TOKEN'
  }
});

// Method 3: Direct (for testing only)
createTelegramPack({
  options: {
    botToken: 'direct-token'
  }
});

// Method 4: Fallback chain
// Tries multiple env vars: TELEGRAM_BOT_TOKEN, TELEGRAM_TOKEN, BOT_TOKEN, etc.
```

## Error Handling & Recovery

```typescript
const robustWorkflow = {
  tasks: [
    {
      id: 'search-with-fallback',
      executor: 'researcher',
      tool: 'webSearch',
      inputs: { query: '{{query}}' },
      onError: {
        // If search fails, use cached results
        fallback: 'use-cache',
        // Or retry with different provider
        retry: {
          tool: 'webSearch',
          inputs: { 
            query: '{{query}}',
            provider: 'duckduckgo' // Free fallback
          }
        }
      }
    }
  ]
};
```

## Performance Optimization

### Rate Limiting

Both extensions handle rate limiting automatically:

```typescript
// Web Search: Automatic provider fallback on rate limit
// Telegram: Queues messages to respect 30 msg/sec limit

// Configure custom limits:
createTelegramPack({
  options: {
    rateLimit: {
      maxRequests: 20,
      windowMs: 1000
    }
  }
});
```

### Caching

```typescript
// GMIs can share cached results through working memory
const cachedSearchWorkflow = {
  tasks: [
    {
      id: 'check-cache',
      transform: async (context) => {
        const cached = await context.workingMemory.get('search_cache', context.input.query);
        if (cached && cached.timestamp > Date.now() - 3600000) {
          return cached.data;
        }
        return null;
      }
    },
    {
      id: 'perform-search',
      condition: '!results.check-cache',
      tool: 'webSearch',
      inputs: { query: '{{query}}' },
      onComplete: async (context, result) => {
        await context.workingMemory.set('search_cache', context.input.query, {
          data: result,
          timestamp: Date.now()
        });
      }
    }
  ]
};
```

## Monitoring & Debugging

```typescript
// Enable detailed logging
const agentos = new AgentOS({
  logging: {
    level: 'debug',
    includeToolCalls: true,
    includeAgencyEvents: true
  }
});

// Monitor agency performance
agency.on('task:start', (task) => {
  console.log(`Task ${task.id} started by ${task.executor}`);
});

agency.on('task:complete', (task, result) => {
  console.log(`Task ${task.id} completed in ${result.duration}ms`);
});

agency.on('workflow:error', (error) => {
  console.error('Workflow error:', error);
  // Send alert via Telegram
  telegramService.sendMessage({
    chatId: 'admin-chat',
    text: `⚠️ Workflow Error: ${error.message}`
  });
});
```

## Best Practices

1. **Separation of Concerns**: Each GMI should have a focused role
2. **Error Boundaries**: Always handle tool failures gracefully
3. **Rate Limit Awareness**: Configure appropriate limits for external APIs
4. **Environment Variables**: Use env vars for sensitive data, never hardcode
5. **Caching Strategy**: Cache expensive operations when appropriate
6. **Monitoring**: Log important events and errors for debugging
7. **Testing**: Test workflows with mock data before production

## Summary

This example shows how AgentOS enables sophisticated multi-agent collaboration through:
- **Extensions** that provide tools as modular capabilities
- **GMIs** that specialize in different tasks within an agency
- **Workflows** that orchestrate complex multi-step processes
- **Flexible configuration** supporting environment variables and multiple sources
- **Built-in resilience** with rate limiting, retries, and fallbacks

The combination of web search and Telegram extensions demonstrates how agencies can research, analyze, and communicate autonomously while maintaining human oversight through configuration and monitoring.
