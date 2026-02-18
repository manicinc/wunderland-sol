<div align="center">

<p align="center">
  <a href="https://agentos.sh"><img src="../logos/agentos-primary-no-tagline-transparent-2x.png" alt="AgentOS" height="64" /></a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://frame.dev" target="_blank" rel="noopener"><img src="../logos/frame-logo-green-no-tagline.svg" alt="Frame.dev" height="40" /></a>
</p>

# AgentOS Extension Registry

The official registry of extensions compatible with the AgentOS extension architecture.

*The OS for humans, the codex of humanity.*

[Frame.dev](https://frame.dev) • [AgentOS](https://agentos.sh)

</div>

---

## 📚 Understanding Extensions

### What are Extensions?

Extensions are modular packages that provide capabilities to AgentOS agents (GMIs). They can include:
- **Tools**: Implement the `ITool` interface (e.g., web search, API calls)
- **Guardrails**: Safety and compliance checks
- **Workflows**: Multi-step processes
- **Response Processors**: Transform or enhance outputs

### Tools vs Extensions

- **Extension**: The package/container that provides capabilities
- **Tool**: A specific type of extension content (implements `ITool`)
- One extension can provide multiple tools

Example:
```
Extension: @framers/agentos-ext-telegram
├── Tool: telegramSendMessage
├── Tool: telegramSendPhoto
├── Tool: telegramGetChatInfo
└── Tool: telegramManageGroup
```

### How Extensions Work

1. **Registration**: Extensions are loaded via the `ExtensionManager`
2. **Discovery**: The registry tracks all available extensions
3. **Activation**: Extensions are activated with lifecycle hooks
4. **Availability**: All GMIs in an agency can access registered tools
5. **Execution**: Tools are invoked through the `ToolExecutor`

## 🏛️ Registry Structure

```
registry/
├── curated/          # Official & verified extensions
│   ├── core/         # Essential AgentOS tools
│   ├── research/     # Research & analysis
│   ├── integrations/ # External service connectors
│   ├── productivity/ # Task automation
│   ├── ai-models/    # LLM/AI integrations
│   └── enterprise/   # Enterprise features
│
└── community/        # Community contributions
    ├── research/     
    ├── productivity/ 
    ├── development/  
    ├── integrations/ 
    └── utilities/    
```

## 🎯 Featured Extensions

### Curated Extensions

| Extension | Category | Description | Tools Provided |
|-----------|----------|-------------|----------------|
| [web-search](./curated/research/web-search) | Research | Multi-provider web search | webSearch, researchAggregator, factCheck |
| [telegram](./curated/integrations/telegram) | Integration | Telegram Bot API | sendMessage, sendPhoto, manageGroup |

### Community Extensions

| Extension | Category | Description | Author |
|-----------|----------|-------------|--------|
| - | - | Be the first contributor! | - |

## 🚀 Using Extensions

### Installation

```bash
# Curated extension
npm install @framers/agentos-ext-web-search

# Community extension
npm install @framers/agentos-productivity-tasks
```

### Basic Usage

```typescript
import { AgentOS } from '@framers/agentos';
import webSearchExtension from '@framers/agentos-ext-web-search';
import telegramExtension from '@framers/agentos-ext-telegram';

const agentos = new AgentOS({
  extensionManifest: {
    packs: [
      { factory: () => webSearchExtension({ /* config */ }) },
      { factory: () => telegramExtension({ /* config */ }) }
    ]
  }
});

await agentos.initialize();
```

### Environment Variables

Extensions support flexible API key configuration:

```bash
# .env file
TELEGRAM_BOT_TOKEN=your-bot-token
SERPER_API_KEY=your-serper-key
SERPAPI_API_KEY=your-serpapi-key
```

```typescript
// Extensions automatically read from env
const extension = createExtensionPack({
  options: {
    // Reads from process.env automatically
    // Or specify custom env var names
    botTokenEnv: 'MY_CUSTOM_TOKEN'
  }
});
```

## 🤝 Agency Collaboration

Extensions enable multiple GMIs to work together:

```typescript
// Research GMI uses web search tools
const researcher = await gmiManager.createGMI({
  personaId: 'researcher',
  tools: ['webSearch', 'factCheck']
});

// Communications GMI uses Telegram tools
const communicator = await gmiManager.createGMI({
  personaId: 'communicator',
  tools: ['telegramSendMessage']
});

// They collaborate through workflows
const workflow = {
  tasks: [
    { executor: 'researcher', tool: 'webSearch' },
    { executor: 'communicator', tool: 'telegramSendMessage' }
  ]
};
```

See [AGENCY_COLLABORATION_EXAMPLE.md](../AGENCY_COLLABORATION_EXAMPLE.md) for detailed examples.

## 📋 Extension Requirements

### Required Files

Every extension must have:
- `package.json` - NPM package configuration
- `manifest.json` - Extension metadata
- `src/index.ts` - Main entry point
- `README.md` - Documentation
- `LICENSE` - MIT license
- Tests with >80% coverage

### Extension Manifest

```json
{
  "id": "com.vendor.category.name",
  "name": "Extension Name",
  "version": "1.0.0",
  "description": "What this extension does",
  "extensions": [
    {
      "kind": "tool",
      "id": "toolName",
      "displayName": "Tool Display Name",
      "description": "What this tool does"
    }
  ]
}
```

### Tool Implementation

```typescript
export class MyTool implements ITool {
  readonly id = 'myTool';
  readonly name = 'myTool';
  readonly displayName = 'My Tool';
  readonly description = 'What this tool does';
  readonly inputSchema = { /* JSON Schema */ };
  readonly outputSchema = { /* JSON Schema */ };
  
  async execute(args: any, context: ToolExecutionContext) {
    // Tool logic here
    return { success: true, output: result };
  }
}
```

## 🏗️ Creating Extensions

1. **Choose location**:
   - `curated/` - For official extensions (requires review)
   - `community/` - For community contributions

2. **Use template**:
```bash
cp -r ../templates/basic-tool community/category/my-extension
```

3. **Implement tools**:
```typescript
import { ITool } from '@framers/agentos';

export class MyTool implements ITool {
  // Implementation
}
```

4. **Test thoroughly**:
```bash
npm test
npm run test:coverage  # Must be >80%
```

5. **Submit PR**:
   - Include tests
   - Document usage
   - Follow naming conventions

## 🔧 Technical Details

### Extension Loading

```typescript
// Extensions are loaded in priority order
const manifest = {
  packs: [
    { factory: () => ext1, priority: 10 },  // Loads first
    { factory: () => ext2, priority: 20 },  // Can override ext1
  ]
};
```

### Lifecycle Hooks

```typescript
const extension = {
  onActivate: async () => {
    // Initialize resources
  },
  onDeactivate: async () => {
    // Cleanup resources
  }
};
```

### Tool Discovery

```typescript
// Get all registered tools
const tools = registry.getDescriptorStack('tool');

// Get specific tool
const webSearch = tools.find(t => t.id === 'webSearch');
```

## 📊 Quality Standards

### All Extensions
- ✅ TypeScript with strict mode
- ✅ >80% test coverage
- ✅ Comprehensive documentation
- ✅ MIT license
- ✅ No hardcoded secrets
- ✅ Proper error handling

### Curated Extensions Additional
- ✅ Professional code review
- ✅ Security audit
- ✅ Performance benchmarks
- ✅ Integration tests
- ✅ Migration guides

## 🆓 Free CI/CD

We provide free GitHub Actions CI/CD for all extensions:
- Automated testing
- Coverage reporting
- npm publishing
- Documentation generation
- Security scanning

## 📚 Resources

- [How Extensions Work](../HOW_EXTENSIONS_WORK.md)
- [Agency Collaboration Examples](../AGENCY_COLLABORATION_EXAMPLE.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [Migration Guide](../MIGRATION_GUIDE.md)

## 🤔 FAQ

### Q: Can one extension provide multiple tools?
A: Yes! Extensions are packages that can contain multiple tools, guardrails, and other components.

### Q: How do extensions access API keys?
A: Extensions can read from environment variables, config objects, or use custom env var names. Never hardcode keys.

### Q: Can extensions depend on each other?
A: Yes, but minimize dependencies. Use peer dependencies for shared core packages.

### Q: How do GMIs share tool results?
A: Through workflows, working memory, and the conversation context.

### Q: Are extensions sandboxed?
A: No, extensions run in the same process. Use guardrails for safety.

## 📝 License

All extensions in this registry are MIT licensed.
