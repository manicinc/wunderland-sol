# Competitor Analysis: Technical Deep Dive

A comprehensive technical comparison of AgentOS, Frame.dev/Quarry against competing solutions in the AI orchestration and personal knowledge management spaces.

---

## Table of Contents

1. [AI Orchestration Frameworks](#ai-orchestration-frameworks)
   - [LangChain](#langchain)
   - [AutoGen (Microsoft)](#autogen-microsoft)
   - [CrewAI](#crewai)
   - [Semantic Kernel (Microsoft)](#semantic-kernel-microsoft)
2. [Personal Knowledge Management](#personal-knowledge-management)
   - [Notion](#notion)
   - [Obsidian](#obsidian)
   - [Roam Research](#roam-research)
   - [Standard Notes](#standard-notes)
3. [Local-First Infrastructure](#local-first-infrastructure)
   - [Linear](#linear)
   - [Figma](#figma)
   - [Replicache](#replicache)
   - [ElectricSQL](#electricsql)
4. [Decision Matrix](#decision-matrix)

---

## AI Orchestration Frameworks

### LangChain

**Repository:** https://github.com/langchain-ai/langchain  
**Language:** Python (primary), JavaScript/TypeScript  
**License:** MIT

#### Architecture Comparison

**LangChain Approach:**

```python
# LangChain - Chain-based composition
from langchain.chains import LLMChain, SequentialChain
from langchain.agents import initialize_agent, AgentType
from langchain.callbacks import StreamingStdOutCallbackHandler

# Creating a simple chain
chain = LLMChain(
    llm=ChatOpenAI(
        model="gpt-4",
        streaming=True,
        callbacks=[StreamingStdOutCallbackHandler()]
    ),
    prompt=prompt_template,
    verbose=True
)

# Multi-step chain
overall_chain = SequentialChain(
    chains=[research_chain, summary_chain, formatting_chain],
    input_variables=["topic"],
    output_variables=["research", "summary", "formatted_output"],
    verbose=True
)

# Agent with tools
agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIBE,
    verbose=True,
    handle_parsing_errors=True,
    max_iterations=5
)
```

**AgentOS Approach:**

```typescript
// AgentOS - Streaming-first, GMI-based
const agentos = new AgentOS();
await agentos.initialize({
  gmiManagerConfig: {
    personaLoaderConfig: { personaSource: './personas', loaderType: 'file_system' },
    defaultWorkingMemoryType: 'in_memory',
  },
  streamingManagerConfig: {
    maxConcurrentStreams: 100,
    defaultStreamInactivityTimeoutMs: 300_000,
  },
});

// Process with true streaming
for await (const chunk of agentos.processRequest({
  userId: 'user-1',
  sessionId: 'session-1',
  textInput: 'Research quantum computing',
})) {
  switch (chunk.type) {
    case AgentOSResponseChunkType.TEXT_DELTA:
      process.stdout.write(chunk.textDelta);
      break;
    case AgentOSResponseChunkType.TOOL_CALL_REQUEST:
      const result = await executeTool(chunk.toolCall);
      await agentos.handleToolResult(chunk.streamId, result);
      break;
  }
}
```

#### Key Differences

| Aspect          | LangChain                                  | AgentOS                                           |
| --------------- | ------------------------------------------ | ------------------------------------------------- |
| **Streaming**   | Callback-based, often requires workarounds | Native async generator, first-class SSE/WebSocket |
| **Type Safety** | Python duck typing, runtime errors         | Full TypeScript, compile-time guarantees          |
| **Bundle Size** | ~50MB with dependencies                    | ~5MB core, modular extensions                     |
| **Multi-Agent** | Via AgentExecutor, complex setup           | Native GMI manager with emergent spawning         |
| **Memory**      | Various memory types, verbose setup        | Working memory + conversation manager integrated  |
| **Debugging**   | verbose=True, callback inspection          | Structured streaming events, guardrail metadata   |

#### LangChain Pain Points We Solved

1. **Callback Hell:**

```python
# LangChain - Nested callbacks for streaming
class MyHandler(BaseCallbackHandler):
    def on_llm_new_token(self, token: str, **kwargs):
        # Token received, but no easy way to correlate with tool calls
        print(token, end="")

    def on_tool_start(self, tool, input_str, **kwargs):
        # Different callback, hard to maintain state
        pass
```

vs AgentOS unified streaming:

```typescript
// AgentOS - Single stream, all event types
for await (const chunk of stream) {
  // chunk.type tells you exactly what happened
  // chunk.metadata contains guardrail decisions, costs, etc.
}
```

2. **Complex Agent Setup:**

```python
# LangChain - Many imports, verbose configuration
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools import tool
from langchain_openai import ChatOpenAI

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant"),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

agent = create_openai_functions_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
```

vs AgentOS persona-based:

```typescript
// AgentOS - Declarative persona, automatic tool binding
const persona = await registry.load('research-specialist');
const gmi = await gmiManager.createInstance(persona.id, userId);
// Tools, memory, prompts all configured via persona definition
```

---

### AutoGen (Microsoft)

**Repository:** https://github.com/microsoft/autogen  
**Language:** Python  
**License:** MIT

#### Architecture Comparison

**AutoGen Approach:**

```python
# AutoGen - Conversational agents
from autogen import AssistantAgent, UserProxyAgent, config_list_from_json

config_list = config_list_from_json(
    "OAI_CONFIG_LIST",
    filter_dict={"model": ["gpt-4"]}
)

assistant = AssistantAgent(
    name="assistant",
    llm_config={"config_list": config_list},
    system_message="You are a helpful AI assistant."
)

user_proxy = UserProxyAgent(
    name="user_proxy",
    human_input_mode="NEVER",  # or "ALWAYS", "TERMINATE"
    max_consecutive_auto_reply=10,
    code_execution_config={"work_dir": "coding"},
)

# Initiate chat
user_proxy.initiate_chat(
    assistant,
    message="Write a Python function to calculate fibonacci numbers."
)
```

**AgentOS Emergent Agency:**

```typescript
// AgentOS - Dynamic role spawning based on goal analysis
const result = await executor.executeAgency({
  goal: 'Write and test a fibonacci function',
  roles: [
    { roleId: 'coder', personaId: 'code-pilot', instruction: 'Write the function' },
    { roleId: 'reviewer', personaId: 'code-reviewer', instruction: 'Review and test' },
  ],
  enableEmergentBehavior: true, // May spawn additional roles if needed
  outputFormat: 'markdown',
});

// If emergent behavior detects need for documentation...
// result.emergentMetadata.rolesSpawned might include 'documenter'
```

#### Key Differences

| Aspect               | AutoGen                                      | AgentOS                                              |
| -------------------- | -------------------------------------------- | ---------------------------------------------------- |
| **Cloud Dependency** | Azure-optimized, config assumes Azure OpenAI | Provider-agnostic, supports Ollama for local         |
| **Language**         | Python only                                  | TypeScript, embeddable in Node.js, Electron, browser |
| **Streaming**        | Print-based, limited SSE support             | Native SSE/WebSocket with backpressure               |
| **Code Execution**   | Built-in Docker sandbox                      | Pluggable tool system, host provides sandbox         |
| **Customization**    | Subclass agents                              | Declarative persona configs + extensions             |
| **Cost Tracking**    | Manual                                       | Automatic aggregation per agency/seat                |

#### AutoGen Limitations We Addressed

1. **Azure Lock-in:**

```python
# AutoGen expects Azure-style config
config_list = config_list_from_json(
    env_or_file="OAI_CONFIG_LIST",
    filter_dict={"model": {"gpt-4"}}
)
# Switching to Anthropic requires significant changes
```

vs AgentOS provider abstraction:

```typescript
// AgentOS - Swap providers with env vars
modelProviderManagerConfig: {
  providers: [
    { providerId: 'openai', enabled: !!process.env.OPENAI_API_KEY },
    { providerId: 'anthropic', enabled: !!process.env.ANTHROPIC_API_KEY },
    { providerId: 'ollama', enabled: true, config: { baseURL: 'http://localhost:11434' } },
  ],
}
// Runtime selects available provider
```

2. **Limited Streaming Control:**

```python
# AutoGen - All output goes to stdout
user_proxy.initiate_chat(assistant, message="...")
# No way to capture intermediate results for UI
```

vs AgentOS granular streaming:

```typescript
// AgentOS - Every event is a typed chunk
chunk.type === 'AGENCY_UPDATE'; // Multi-agent progress
chunk.type === 'WORKFLOW_UPDATE'; // Task graph progress
chunk.type === 'TEXT_DELTA'; // LLM output
// Each chunk has metadata for UI state management
```

---

### CrewAI

**Repository:** https://github.com/joaomdmoura/crewAI  
**Language:** Python  
**License:** MIT

#### Architecture Comparison

**CrewAI Approach:**

```python
# CrewAI - Role-based crews
from crewai import Agent, Task, Crew, Process

researcher = Agent(
    role='Senior Research Analyst',
    goal='Uncover cutting-edge developments in AI',
    backstory='Expert analyst at a leading tech think tank',
    tools=[search_tool, scrape_tool],
    verbose=True
)

writer = Agent(
    role='Tech Content Strategist',
    goal='Craft compelling content on tech advancements',
    backstory='Renowned content strategist for tech publications',
    tools=[],
    verbose=True
)

research_task = Task(
    description='Conduct comprehensive analysis of AI trends',
    expected_output='Full analysis report in bullet points',
    agent=researcher
)

write_task = Task(
    description='Compose an engaging blog post',
    expected_output='Full blog post of at least 4 paragraphs',
    agent=writer
)

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, write_task],
    process=Process.sequential,  # or Process.hierarchical
    verbose=2
)

result = crew.kickoff()
```

**AgentOS Approach:**

```typescript
// AgentOS - Similar concepts, more control
const workflowDefinition: WorkflowDefinition = {
  id: 'content_creation',
  roles: [
    {
      roleId: 'researcher',
      personaId: 'research-specialist',
      evolutionRules: [{ trigger: 'always', patch: { mood: 'analytical' } }],
    },
    {
      roleId: 'writer',
      personaId: 'content-writer',
    },
  ],
  tasks: [
    {
      id: 'research',
      executor: { type: 'gmi', roleId: 'researcher' },
      dependsOn: [],
      policyTags: ['guardrail.factcheck'],
    },
    {
      id: 'write',
      executor: { type: 'gmi', roleId: 'writer' },
      dependsOn: ['research'],
      handoff: { summary: true }, // Pass summarized research to writer
    },
  ],
};

const instance = await agentos.startWorkflow('content_creation', input);

// Stream progress
for await (const update of agentos.getWorkflowUpdates(instance.workflowId)) {
  // update.tasks shows per-task progress
  // update.seats shows per-role status
}
```

#### Key Differences

| Aspect                 | CrewAI                          | AgentOS                                 |
| ---------------------- | ------------------------------- | --------------------------------------- |
| **Task Dependencies**  | Sequential or hierarchical only | DAG with arbitrary dependencies         |
| **Progress Streaming** | Print-based verbose mode        | Structured WORKFLOW_UPDATE chunks       |
| **Error Handling**     | Basic retry                     | Per-seat retry with exponential backoff |
| **Guardrails**         | None built-in                   | Pluggable guardrail stacks per task     |
| **Cost Tracking**      | None                            | Automatic per-seat and aggregate        |
| **Persistence**        | None                            | Pluggable IWorkflowStore                |

---

### Semantic Kernel (Microsoft)

**Repository:** https://github.com/microsoft/semantic-kernel  
**Languages:** C#, Python, Java  
**License:** MIT

#### Quick Comparison

Semantic Kernel focuses on enterprise .NET integration, making it less suitable for JavaScript/TypeScript web applications:

```csharp
// Semantic Kernel - C# focus
var kernel = Kernel.CreateBuilder()
    .AddAzureOpenAIChatCompletion(deploymentName, endpoint, apiKey)
    .Build();

var result = await kernel.InvokePromptAsync(
    "Write a poem about {{$input}}",
    new() { ["input"] = "AI" }
);
```

AgentOS provides the same capabilities natively in TypeScript, with better browser/Electron compatibility.

---

## Personal Knowledge Management

### Notion

**Type:** Cloud-first SaaS  
**Pricing:** Freemium, $8-15/user/month

#### Architecture Comparison

| Aspect             | Notion                      | Quarry                        |
| ------------------ | --------------------------- | ----------------------------- |
| **Data Location**  | Cloud only                  | Local-first, optional sync    |
| **Encryption**     | TLS in transit              | AES-256-GCM at rest + transit |
| **Zero-Knowledge** | No (Notion can read data)   | Yes (keys never leave device) |
| **Offline**        | Limited (cached pages)      | Full functionality            |
| **Export**         | Manual, limited formats     | Automatic Markdown vault      |
| **AI Features**    | Notion AI (additional cost) | Built-in, BYOK, local models  |
| **API**            | REST API                    | Local SDK + REST API          |

#### Notion Limitations We Addressed

1. **No True Offline:**

```javascript
// Notion - Requires network for most operations
const response = await notion.pages.create({
  parent: { database_id: databaseId },
  properties: { ... }
});
// Fails if offline
```

vs Quarry local-first:

```typescript
// Quarry - Works offline, syncs when online
await sqliteStore.createStrand({
  weaveId: 'notes',
  path: 'daily/2025-01-08',
  content: '# Today...',
});
// Immediately persisted locally
// Sync queue handles cloud push when online
```

2. **No End-to-End Encryption:**
   Notion employees can theoretically access your data. Quarry's zero-knowledge architecture makes this impossible.

---

### Obsidian

**Type:** Local-first desktop app  
**Pricing:** Free (sync $8/month, publish $16/month)

#### Architecture Comparison

| Aspect         | Obsidian                    | Quarry                              |
| -------------- | --------------------------- | ----------------------------------- |
| **Storage**    | Local filesystem            | SQLite + vault files                |
| **Sync**       | Obsidian Sync (proprietary) | Open protocol, self-hostable        |
| **Encryption** | Optional (Sync only)        | Always-on AES-256-GCM               |
| **Platform**   | Electron app                | Web + Electron + Mobile (Capacitor) |
| **AI**         | Via plugins                 | Native, multi-provider              |
| **Schema**     | Freeform markdown           | OpenStrand (structured)             |
| **Search**     | Text search                 | Semantic + text + structured        |

#### Obsidian Strengths We Learned From

1. **Plain Markdown Files:**
   Obsidian's vault-as-folder approach is excellent. Quarry adopted a hybrid model:

```
vault/
├── weaves/
│   └── technology/
│       ├── weave.yaml          # Metadata
│       └── frontend/
│           ├── loom.yaml       # Loom metadata
│           ├── react-hooks.md  # Strand (plain markdown)
│           └── css-grid.md
└── .quarry/
    ├── index.sqlite            # Search index, relationships
    └── sync/                   # Sync state
```

2. **Plugin Ecosystem:**
   Quarry's plugin system was inspired by Obsidian's:

```typescript
// packages/codex-extensions/src/types/index.ts
interface QuarryPlugin {
  id: string;
  name: string;
  version: string;

  // Lifecycle hooks
  onLoad(app: QuarryApp): Promise<void>;
  onUnload(): Promise<void>;

  // Extension points
  registerMarkdownPostProcessor?(processor: MarkdownProcessor): void;
  registerEditorExtension?(extension: EditorExtension): void;
  registerView?(view: ViewCreator): void;
}
```

---

### Roam Research

**Type:** Cloud-first outliner  
**Pricing:** $15/month or $165/year

#### Key Differentiators

| Aspect                  | Roam                    | Quarry                      |
| ----------------------- | ----------------------- | --------------------------- |
| **Structure**           | Outliner (bullet-based) | Documents + blocks          |
| **Bidirectional Links** | Core feature            | Supported via OpenStrand    |
| **Graph View**          | Built-in                | Built-in (D3.js + Three.js) |
| **Block References**    | Native                  | Transclusion support        |
| **Offline**             | Limited                 | Full                        |
| **Pricing**             | Premium only            | Free tier available         |

#### Roam Ideas We Incorporated

1. **Block-Level Addressing:**

```typescript
// OpenStrand block references
interface BlockReference {
  strandPath: string;
  blockId: string; // Unique within strand
  blockIndex: number; // Position for ordering
}

// Transclusion syntax in markdown
// {{embed: path/to/strand#block-id}}
```

2. **Daily Notes:**

```typescript
// Auto-create daily notes
async function ensureDailyNote(date: Date): Promise<Strand> {
  const path = `daily/${format(date, 'yyyy/MM/dd')}`;
  const existing = await sqliteStore.getStrandByPath(path);

  if (existing) return existing;

  return sqliteStore.createStrand({
    weaveId: 'daily',
    path,
    content: `# ${format(date, 'EEEE, MMMM d, yyyy')}\n\n`,
    metadata: {
      type: 'daily-note',
      date: date.toISOString(),
    },
  });
}
```

---

### Standard Notes

**Type:** Encrypted note-taking  
**Pricing:** Free (paid for extensions)

#### Encryption Comparison

| Aspect             | Standard Notes     | Quarry                       |
| ------------------ | ------------------ | ---------------------------- |
| **Algorithm**      | XChaCha20-Poly1305 | AES-256-GCM                  |
| **Key Derivation** | Argon2id           | PBKDF2/Argon2 (configurable) |
| **Zero-Knowledge** | Yes                | Yes                          |
| **E2E Encryption** | Always             | Always (when sync enabled)   |
| **Open Source**    | Yes                | Yes                          |

#### Why AES-256-GCM Over XChaCha20?

1. **Browser Native:**

```typescript
// AES-GCM is natively supported in Web Crypto API
const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
  'encrypt',
  'decrypt',
]);

// XChaCha20 requires external library (libsodium-wrappers)
// Adds ~200KB to bundle, async loading
```

2. **Hardware Acceleration:**
   Modern CPUs have AES-NI instructions. Web Crypto leverages this automatically.

3. **Established Standard:**
   AES-GCM is NIST-approved and widely audited.

---

## Local-First Infrastructure

### Linear

**Type:** Issue tracking SaaS  
**Architecture:** Local-first with sync

#### Sync Architecture Comparison

Linear uses a custom sync protocol optimized for issue tracking:

```
Linear Sync:
- Optimistic updates with server reconciliation
- Custom conflict resolution per entity type
- IndexedDB for client storage
- WebSocket for real-time updates
```

Quarry uses a more general-purpose approach:

```
Quarry Sync:
- Vector clocks for causality tracking
- Pluggable conflict resolution strategies
- SQLite for client storage (richer queries)
- WebSocket + HTTP fallback
- Works with any document type
```

### Figma

**Type:** Design tool  
**Architecture:** CRDT-based multiplayer

#### Why We Didn't Use CRDTs

Figma's CRDT implementation is optimized for canvas operations:

```
Figma CRDT Use Case:
- Many small, concurrent operations (move, resize, recolor)
- Operations are commutative (order doesn't matter)
- Real-time collaboration is primary use case
```

Quarry's document use case is different:

```
Quarry Use Case:
- Fewer, larger operations (edit paragraph, add section)
- Intent preservation matters (user A and B edit same paragraph)
- Offline-first is primary, collaboration is secondary
```

Vector clocks with explicit conflict resolution are simpler and more predictable for document editing.

### Replicache

**Repository:** https://github.com/rocicorp/replicache  
**Type:** Sync framework  
**Pricing:** Commercial license

#### Comparison

| Aspect                  | Replicache                         | Quarry Sync                           |
| ----------------------- | ---------------------------------- | ------------------------------------- |
| **Pricing**             | $500+/month                        | Open source                           |
| **Backend**             | Requires specific backend contract | Works with any backend                |
| **Conflict Resolution** | Server-authoritative               | Configurable (LWW, merge, manual)     |
| **Storage**             | IndexedDB                          | SQLite (via sql.js or better-sqlite3) |
| **Offline**             | Yes                                | Yes                                   |

We built our own sync layer to:

1. Avoid licensing costs
2. Support SQLite across all platforms
3. Enable zero-knowledge encryption

### ElectricSQL

**Repository:** https://github.com/electric-sql/electric  
**Type:** Postgres-to-SQLite sync

#### Comparison

| Aspect             | ElectricSQL       | Quarry SQL Adapter                        |
| ------------------ | ----------------- | ----------------------------------------- |
| **Database**       | PostgreSQL only   | Postgres + SQLite + sql.js                |
| **Sync Protocol**  | Electric-specific | Vector clocks (standard)                  |
| **Client Storage** | SQLite            | SQLite, sql.js, better-sqlite3, Capacitor |
| **Encryption**     | TLS only          | AES-256-GCM at rest                       |
| **Maturity**       | Early stage       | Production-ready                          |

ElectricSQL is promising but not yet production-ready. We needed a solution that works today.

---

## Decision Matrix

### AI Orchestration Framework Selection

| Criterion          | Weight | LangChain | AutoGen  | CrewAI   | AgentOS  |
| ------------------ | ------ | --------- | -------- | -------- | -------- |
| TypeScript Native  | 20%    | 2/5       | 0/5      | 0/5      | 5/5      |
| Streaming Quality  | 15%    | 2/5       | 2/5      | 1/5      | 5/5      |
| Multi-Agent        | 15%    | 3/5       | 4/5      | 4/5      | 5/5      |
| Bundle Size        | 10%    | 1/5       | N/A      | N/A      | 4/5      |
| Extensibility      | 15%    | 4/5       | 3/5      | 3/5      | 5/5      |
| Provider Agnostic  | 10%    | 4/5       | 2/5      | 3/5      | 5/5      |
| Documentation      | 10%    | 5/5       | 3/5      | 3/5      | 3/5      |
| Community          | 5%     | 5/5       | 4/5      | 3/5      | 1/5      |
| **Weighted Score** |        | **2.95**  | **2.55** | **2.35** | **4.60** |

### PKM Platform Selection

| Criterion          | Weight | Notion   | Obsidian | Roam     | Standard Notes | Quarry   |
| ------------------ | ------ | -------- | -------- | -------- | -------------- | -------- |
| Local-First        | 20%    | 1/5      | 5/5      | 2/5      | 4/5            | 5/5      |
| E2E Encryption     | 15%    | 0/5      | 2/5      | 0/5      | 5/5            | 5/5      |
| AI Integration     | 15%    | 3/5      | 2/5      | 2/5      | 1/5            | 5/5      |
| Cross-Platform     | 15%    | 5/5      | 4/5      | 3/5      | 4/5            | 5/5      |
| Open Source        | 10%    | 0/5      | 0/5      | 0/5      | 5/5            | 5/5      |
| Export/Portability | 10%    | 2/5      | 5/5      | 2/5      | 4/5            | 5/5      |
| Pricing            | 10%    | 3/5      | 4/5      | 2/5      | 4/5            | 5/5      |
| Feature Richness   | 5%     | 5/5      | 4/5      | 4/5      | 2/5            | 4/5      |
| **Weighted Score** |        | **2.15** | **3.50** | **1.85** | **3.55**       | **5.00** |

---

## Conclusion

The decision to build AgentOS and Quarry rather than using existing solutions was driven by:

1. **No TypeScript-native AI orchestration framework** existed with proper streaming
2. **No PKM combined** local-first + zero-knowledge + AI-native
3. **Existing sync solutions** either expensive (Replicache) or immature (ElectricSQL)
4. **Provider lock-in** in most AI frameworks was unacceptable for open source

The result is a cohesive stack where AI orchestration, knowledge management, and local-first sync are designed together rather than bolted on.

---

_Last updated: January 2026_
