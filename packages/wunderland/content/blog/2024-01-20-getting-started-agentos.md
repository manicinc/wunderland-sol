---
title: "Getting Started with AgentOS: Build Your First Adaptive Agent in 10 Minutes"
date: "2024-01-20"
author: "The Framers Team"
category: "Tutorial"
excerpt: "Step-by-step guide to creating context-aware AI agents with streaming capabilities and dynamic personas"
coverImage: "/blog/getting-started-cover.jpg"
tags: ["tutorial", "quickstart", "development", "personas", "streaming", "how-to"]
---

# Getting Started with AgentOS: Build Your First Adaptive Agent in 10 Minutes

Ready to build AI that actually understands context? Let's create your first adaptive agent with AgentOS. By the end of this guide, you'll have a fully functional AI assistant that adapts its personality and responses based on user context.

## What We're Building

We'll create an intelligent coding assistant that:
- Adapts explanations based on user skill level
- Streams responses in real-time
- Uses tool orchestration for code execution
- Maintains conversation memory
- Respects rate limits and safety guardrails

## Prerequisites

- Node.js 18+ or Bun
- TypeScript knowledge (helpful but not required)
- An OpenAI API key (or any supported LLM provider)

## Installation

First, let's set up a new project:

```bash
mkdir my-agentos-app
cd my-agentos-app
npm init -y
npm install @framers/agentos typescript tsx
npm install -D @types/node
```

Create a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

## Your First Persona

Let's create an adaptive coding tutor. Create `personas/coding-tutor.ts`:

```typescript
import { IPersonaDefinition } from '@framers/agentos';

export const codingTutor: IPersonaDefinition = {
  identity: {
    id: 'coding-tutor-v1',
    name: 'Ada',
    role: 'adaptive_coding_tutor',
    description: 'An intelligent coding assistant that adapts to your skill level',
    version: '1.0.0'
  },

  traits: {
    personality: [
      { name: 'helpful', weight: 0.9 },
      { name: 'patient', weight: 0.8 },
      { name: 'encouraging', weight: 0.7 },
      { name: 'precise', weight: 0.8 }
    ],
    capabilities: [
      'code_explanation',
      'debugging_assistance',
      'best_practices',
      'performance_optimization'
    ]
  },

  promptConfig: {
    baseSystemPrompt: `You are Ada, an expert coding tutor who adapts teaching style based on the student's experience level.
    You have deep knowledge of multiple programming languages and paradigms.
    Always be encouraging while maintaining technical accuracy.`,

    contextualElements: [
      {
        id: 'beginner_mode',
        type: 'system_instruction_addon',
        content: `For beginners:
        - Use simple, everyday analogies to explain concepts
        - Break down complex ideas into small, digestible steps
        - Provide lots of examples and encouragement
        - Avoid jargon unless you explain it first
        - Check understanding frequently`,
        criteria: {
          userSkillLevel: 'beginner'
        },
        priority: 10
      },
      {
        id: 'intermediate_mode',
        type: 'system_instruction_addon',
        content: `For intermediate developers:
        - Balance conceptual explanation with practical examples
        - Introduce best practices and patterns
        - Discuss trade-offs and decision-making
        - Encourage exploration of alternatives`,
        criteria: {
          userSkillLevel: 'intermediate'
        },
        priority: 10
      },
      {
        id: 'expert_mode',
        type: 'system_instruction_addon',
        content: `For experts:
        - Provide concise, technical explanations
        - Focus on edge cases and optimizations
        - Discuss implementation details and internals
        - Reference specifications and advanced patterns
        - Assume familiarity with fundamentals`,
        criteria: {
          userSkillLevel: 'expert'
        },
        priority: 10
      }
    ],

    metaPrompts: {
      explainUnexpectedSituation: 'If the user seems confused, take a step back and clarify the fundamentals.',
      adaptToUserFeedback: 'Adjust explanation depth based on user reactions and questions.',
      generateFollowUpQuestions: 'Suggest relevant follow-up topics to explore.'
    }
  },

  cognitiveConfig: {
    memoryConfig: {
      workingMemorySize: 10,
      contextWindowSize: 8000,
      retentionPolicy: 'sliding_window'
    },
    learningConfig: {
      enableUserPreferenceLearning: true,
      enableSkillLevelDetection: true
    }
  },

  tools: {
    autoGranted: [
      'code_executor',
      'syntax_highlighter',
      'documentation_search'
    ],
    requiresApproval: [
      'file_system_access',
      'network_requests'
    ]
  }
};
```

## Initialize AgentOS

Create `app.ts`:

```typescript
import { AgentOS, AgentOSConfig } from '@framers/agentos';
import { codingTutor } from './personas/coding-tutor';

async function initializeAgentOS() {
  const config: AgentOSConfig = {
    // LLM Provider Configuration
    modelProviderManagerConfig: {
      providers: [
        {
          id: 'openai',
          type: 'openai',
          apiKey: process.env.OPENAI_API_KEY!,
          defaultModelId: 'gpt-4o-mini',
          options: {
            temperature: 0.7,
            maxTokens: 2000
          }
        }
      ]
    },

    // GMI Manager Configuration
    gmiManagerConfig: {
      personas: [codingTutor],
      defaultPersonaId: 'coding-tutor-v1',
      enableAutoCleanup: true,
      inactivityTimeoutMs: 3600000 // 1 hour
    },

    // Conversation Configuration
    conversationManagerConfig: {
      enablePersistence: true,
      maxHistoryLength: 50,
      summarizationThreshold: 30
    },

    // Streaming Configuration
    streamingManagerConfig: {
      enableStreaming: true,
      chunkSize: 20,
      streamingRate: 50 // ms between chunks
    },

    // Tool Configuration
    toolOrchestratorConfig: {
      enableTools: true,
      maxConcurrentToolCalls: 3,
      toolTimeout: 30000
    },

    // Safety Configuration
    guardrailConfig: {
      enableGuardrails: true,
      blockPromptInjection: true,
      maxOutputLength: 10000
    }
  };

  const agentOS = new AgentOS();
  await agentOS.initialize(config);

  return agentOS;
}
```

## Process Requests with Context

Now let's create different interactions based on skill level:

```typescript
async function demonstrateAdaptiveResponses(agentOS: AgentOS) {
  console.log('🎯 AgentOS Adaptive Demo\n');

  // Question we'll ask at different skill levels
  const question = "What is recursion and how does it work?";

  // Beginner Response
  console.log('👶 BEGINNER Response:');
  console.log('-'.repeat(50));

  const beginnerResponse = await agentOS.processRequest({
    userId: 'demo-user',
    text: question,
    context: {
      userSkillLevel: 'beginner',
      sessionId: 'demo-session-1'
    }
  });

  for await (const chunk of beginnerResponse) {
    if (chunk.type === 'TEXT_DELTA') {
      process.stdout.write(chunk.payload.delta);
    }
  }

  console.log('\n\n');

  // Expert Response
  console.log('🎓 EXPERT Response:');
  console.log('-'.repeat(50));

  const expertResponse = await agentOS.processRequest({
    userId: 'demo-user',
    text: question,
    context: {
      userSkillLevel: 'expert',
      sessionId: 'demo-session-2'
    }
  });

  for await (const chunk of expertResponse) {
    if (chunk.type === 'TEXT_DELTA') {
      process.stdout.write(chunk.payload.delta);
    }
  }
}
```

## Streaming with Rich Metadata

Let's build a more advanced example that shows streaming with metadata:

```typescript
async function streamingDemo(agentOS: AgentOS) {
  console.log('\n📡 STREAMING Demo with Metadata:');
  console.log('-'.repeat(50));

  const request = {
    userId: 'demo-user',
    text: 'Write a Python function to calculate fibonacci numbers',
    context: {
      userSkillLevel: 'intermediate',
      sessionId: 'demo-session-3',
      includeCodeExecution: true
    }
  };

  const stream = await agentOS.processRequest(request);

  for await (const chunk of stream) {
    switch (chunk.type) {
      case 'SYSTEM_PROGRESS':
        console.log(`\n⚙️ System: ${chunk.payload.message}\n`);
        break;

      case 'TEXT_DELTA':
        process.stdout.write(chunk.payload.delta);
        break;

      case 'TOOL_CALL_REQUEST':
        console.log(`\n🔧 Tool: ${chunk.payload.toolName}(${JSON.stringify(chunk.payload.arguments)})\n`);
        break;

      case 'TOOL_RESULT':
        console.log(`\n✅ Tool Result: ${chunk.payload.result}\n`);
        break;

      case 'FINAL_RESPONSE':
        console.log('\n\n📊 Final Metadata:');
        console.log(`- Tokens Used: ${chunk.metadata?.usage?.totalTokens}`);
        console.log(`- Response Time: ${chunk.metadata?.timing?.totalMs}ms`);
        console.log(`- Persona: ${chunk.metadata?.persona?.name}`);
        break;

      case 'ERROR':
        console.error(`\n❌ Error: ${chunk.payload.error.message}\n`);
        break;
    }
  }
}
```

## Working with Tools

AgentOS supports tool orchestration. Here's how to register a custom tool:

```typescript
import { ITool, ToolExecutionContext } from '@framers/agentos';

const customCalculatorTool: ITool = {
  id: 'calculator',
  name: 'Calculator',
  description: 'Performs mathematical calculations',

  inputSchema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Mathematical expression to evaluate'
      }
    },
    required: ['expression']
  },

  async execute(args: any, context: ToolExecutionContext) {
    try {
      // In production, use a safe math parser
      const result = eval(args.expression);
      return {
        success: true,
        result: result.toString()
      };
    } catch (error) {
      return {
        success: false,
        error: 'Invalid expression'
      };
    }
  }
};

// Register the tool
agentOS.registerTool(customCalculatorTool);
```

## Memory and Context Management

AgentOS maintains conversation memory automatically, but you can also manage it explicitly:

```typescript
async function memoryDemo(agentOS: AgentOS) {
  const sessionId = 'memory-demo-session';

  // First interaction
  await agentOS.processRequest({
    userId: 'demo-user',
    text: 'My name is Alice and I love Python',
    context: { sessionId }
  });

  // Second interaction - AgentOS remembers the context
  const response = await agentOS.processRequest({
    userId: 'demo-user',
    text: 'What programming language did I mention?',
    context: { sessionId }
  });

  // The agent will remember that Alice mentioned Python
}
```

## Complete Working Example

Here's everything together in a working script:

```typescript
// main.ts
import 'dotenv/config';
import { AgentOS } from '@framers/agentos';
import { codingTutor } from './personas/coding-tutor';

async function main() {
  try {
    // Initialize
    const agentOS = new AgentOS();
    await agentOS.initialize({
      modelProviderManagerConfig: {
        providers: [{
          id: 'openai',
          type: 'openai',
          apiKey: process.env.OPENAI_API_KEY!,
          defaultModelId: 'gpt-4o-mini'
        }]
      },
      gmiManagerConfig: {
        personas: [codingTutor],
        defaultPersonaId: 'coding-tutor-v1'
      }
    });

    // Interactive CLI
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('🤖 Ada the Coding Tutor is ready!');
    console.log('Type your questions (or "exit" to quit)\n');

    const askQuestion = () => {
      readline.question('You: ', async (input) => {
        if (input.toLowerCase() === 'exit') {
          await agentOS.shutdown();
          readline.close();
          return;
        }

        console.log('\nAda: ');
        const response = await agentOS.processRequest({
          userId: 'cli-user',
          text: input,
          context: {
            userSkillLevel: 'intermediate' // You can make this dynamic
          }
        });

        for await (const chunk of response) {
          if (chunk.type === 'TEXT_DELTA') {
            process.stdout.write(chunk.payload.delta);
          }
        }

        console.log('\n');
        askQuestion();
      });
    };

    askQuestion();

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
```

## Run Your Agent

1. Create a `.env` file:
```bash
OPENAI_API_KEY=your-api-key-here
```

2. Run the application:
```bash
npx tsx main.ts
```

## Next Steps

Congratulations! You've built your first adaptive AI agent with AgentOS. Here's what to explore next:

### Advanced Features
- **Multi-Agent Coordination**: Learn how agents can work together
- **Custom Tool Creation**: Build specialized tools for your domain
- **RAG Integration**: Add document retrieval and knowledge bases
- **Voice Integration**: Connect to Voice Chat Assistant for speech capabilities

### Resources
- **[Full Documentation](https://docs.agentos.sh)**: Complete API reference
- **[Voice Chat Assistant Demo](https://app.vca.chat/en)**: See AgentOS in production
- **[Marketplace](https://vca.chat)**: Browse and share agents
- **[GitHub Examples](https://github.com/wearetheframers/agentos/tree/main/examples)**: More code samples

### Join the Community
- **GitHub**: Star and contribute to [@wearetheframers/agentos](https://github.com/wearetheframers/agentos)
- **Discord**: Join our community for support and discussions
- **Twitter**: Follow [@frame_dev](https://twitter.com/frame_dev) for updates

## Troubleshooting

### Common Issues

**Rate Limiting**: AgentOS includes built-in rate limiting. Configure limits in the initialization:
```typescript
rateLimitConfig: {
  maxRequestsPerMinute: 60,
  maxTokensPerDay: 100000
}
```

**Memory Issues**: For long conversations, enable summarization:
```typescript
conversationManagerConfig: {
  enableSummarization: true,
  summarizationThreshold: 20
}
```

**Streaming Not Working**: Ensure your LLM provider supports streaming:
```typescript
providers: [{
  // ...
  options: {
    stream: true
  }
}]
```

## Production Deployment

When you're ready for production:

1. **Use environment-specific configs**:
```typescript
const config = process.env.NODE_ENV === 'production'
  ? productionConfig
  : developmentConfig;
```

2. **Enable persistence**:
```typescript
persistenceConfig: {
  type: 'postgresql',
  connectionString: process.env.DATABASE_URL
}
```

3. **Set up monitoring**:
```typescript
telemetryConfig: {
  enableMetrics: true,
  enableTracing: true,
  exporters: ['prometheus', 'jaeger']
}
```

4. **Configure guardrails**:
```typescript
guardrailConfig: {
  enableContentFiltering: true,
  enablePromptInjectionDetection: true,
  maxOutputTokens: 4000
}
```

## Build Something Amazing

Now you have the foundation to build sophisticated AI applications. Whether you're creating:
- 🎓 Educational tutors that adapt to learning styles
- 💼 Business assistants with domain expertise
- 🎮 Game NPCs with dynamic personalities
- 🏥 Healthcare bots with empathetic responses
- 🛠️ Developer tools with context awareness

AgentOS provides the infrastructure you need.

## Share Your Creation

Built something cool? We'd love to see it!
- Submit to the [VCA Marketplace](https://vca.chat)
- Share in our [Discord showcase channel](https://discord.gg/agentos)
- Tweet us [@frame_dev](https://twitter.com/frame_dev)

Happy building! 🚀

---

*AgentOS is open source and MIT licensed. Built with ❤️ by The Framers Team.*