# Development Story Architecture Diagrams

Visual representations of the key architectural components described in the development story.

## 1. Overall System Architecture

```mermaid
graph TB
    subgraph clients [Client Applications]
        WebApp[Frame.dev Web App]
        Desktop[Electron Desktop]
        Mobile[Capacitor Mobile]
        Workbench[AgentOS Workbench]
    end

    subgraph frontend [Frontend Layer]
        NextJS[Next.js 14 App Router]
        Tiptap[Tiptap Editor]
        CM6[CodeMirror 6]
        ReactQuery[React Query]
    end

    subgraph storage [Local Storage Layer]
        SQLite[(SQLite)]
        IndexedDB[(IndexedDB)]
        FileVault[File Vault]
    end

    subgraph backend [Backend Services]
        Express[Express.js API]
        Fastify[Fastify REST API]
        WSServer[WebSocket Server]
        SSE[SSE Stream Handler]
    end

    subgraph agentos [AgentOS Runtime]
        GMI[GMI Manager]
        Orchestrator[Orchestrator]
        Streaming[Streaming Manager]
        Tools[Tool Orchestrator]
        Guardrails[Guardrail Stack]
        Workflows[Workflow Engine]
    end

    subgraph providers [LLM Providers]
        OpenAI[OpenAI API]
        Anthropic[Anthropic API]
        OpenRouter[OpenRouter]
        Ollama[Ollama Local]
    end

    subgraph persistence [Cloud Persistence]
        Postgres[(PostgreSQL)]
        ObjectStore[(Object Storage)]
        SyncServer[Sync Server]
    end

    WebApp --> NextJS
    Desktop --> NextJS
    Mobile --> NextJS
    Workbench --> Express

    NextJS --> Tiptap
    NextJS --> CM6
    NextJS --> ReactQuery

    NextJS --> storage
    Desktop --> SQLite
    Mobile --> SQLite
    WebApp --> IndexedDB

    ReactQuery --> Express
    ReactQuery --> Fastify
    ReactQuery --> WSServer

    Express --> agentos
    Fastify --> agentos

    GMI --> providers
    Orchestrator --> GMI
    Streaming --> SSE
    Tools --> GMI

    storage <--> SyncServer
    SyncServer --> Postgres
    SyncServer --> ObjectStore
```

## 2. AgentOS GMI Architecture

```mermaid
graph LR
    subgraph input [Input Processing]
        UserInput[User Input]
        Context[Conversation Context]
        History[Chat History]
    end

    subgraph gmi [Generalized Mind Instance]
        Persona[Persona Config]
        WorkingMem[Working Memory]
        PromptEngine[Prompt Engine]
        TokenBudget[Token Budget Manager]
    end

    subgraph orchestration [Orchestration Layer]
        Orchestrator[AgentOS Orchestrator]
        ToolDispatch[Tool Dispatcher]
        GuardrailCheck[Guardrail Evaluator]
    end

    subgraph streaming [Response Streaming]
        StreamMgr[Streaming Manager]
        TextDelta[TEXT_DELTA]
        ToolReq[TOOL_CALL_REQUEST]
        FinalResp[FINAL_RESPONSE]
    end

    subgraph llm [LLM Layer]
        ProviderMgr[Provider Manager]
        OpenAI[OpenAI]
        Claude[Anthropic]
        Local[Ollama]
    end

    UserInput --> Orchestrator
    Context --> PromptEngine
    History --> PromptEngine

    Orchestrator --> GMI
    Persona --> PromptEngine
    WorkingMem --> PromptEngine
    PromptEngine --> TokenBudget

    TokenBudget --> ProviderMgr
    ProviderMgr --> OpenAI
    ProviderMgr --> Claude
    ProviderMgr --> Local

    ProviderMgr --> StreamMgr
    StreamMgr --> TextDelta
    StreamMgr --> ToolReq
    StreamMgr --> FinalResp

    ToolReq --> ToolDispatch
    ToolDispatch --> GuardrailCheck
    GuardrailCheck --> Orchestrator
```

## 3. Emergent Agency System

```mermaid
sequenceDiagram
    participant User
    participant API as API Endpoint
    participant Coord as EmergentAgencyCoordinator
    participant Planner as Planner GMI
    participant Exec as MultiGMIAgencyExecutor
    participant GMI1 as Researcher GMI
    participant GMI2 as Communicator GMI
    participant DB as Agency Persistence

    User->>API: POST /agency/stream
    Note over User,API: goal, roles, enableEmergent=true

    API->>Coord: transformToEmergentAgency
    Coord->>Planner: decomposeGoal
    Planner-->>Coord: EmergentTask[]
    Coord->>Coord: assignRolesToTasks
    Coord-->>API: tasks, roles, context

    API->>Exec: executeAgency
    Exec->>DB: createExecution

    par Parallel Execution
        Exec->>GMI1: executeSeat
        Note over GMI1: Research task
        GMI1-->>Exec: result + usage
    and
        Exec->>GMI2: executeSeat
        Note over GMI2: Communication task
        GMI2-->>Exec: result + usage
    end

    Exec->>Exec: consolidateOutputs
    Exec->>DB: updateExecution
    Exec-->>API: AgencyExecutionResult
    API-->>User: SSE FINAL_RESPONSE
```

## 4. SQL Storage Adapter Resolution

```mermaid
flowchart TD
    Start[resolveStorageAdapter] --> CheckPriority{Check Priority List}

    CheckPriority --> TryBetter[Try better-sqlite3]
    TryBetter --> BetterAvail{Native Module Available?}
    BetterAvail -->|Yes| CreateBetter[Create BetterSqlite3Adapter]
    BetterAvail -->|No| TrySqljs[Try sql.js]

    TrySqljs --> SqljsAvail{WASM Available?}
    SqljsAvail -->|Yes| CreateSqljs[Create SqljsAdapter]
    SqljsAvail -->|No| TryCapacitor[Try Capacitor]

    TryCapacitor --> CapAvail{Capacitor Plugin Available?}
    CapAvail -->|Yes| CreateCap[Create CapacitorAdapter]
    CapAvail -->|No| TryPostgres[Try PostgreSQL]

    TryPostgres --> PgAvail{Connection String Provided?}
    PgAvail -->|Yes| CreatePg[Create PostgresAdapter]
    PgAvail -->|No| ThrowError[Throw Error]

    CreateBetter --> SetCaps1[Set Capabilities: sync, wal, transactions]
    CreateSqljs --> SetCaps2[Set Capabilities: transactions]
    CreateCap --> SetCaps3[Set Capabilities: wal, transactions, persistence]
    CreatePg --> SetCaps4[Set Capabilities: concurrent, json, transactions]

    SetCaps1 --> Return[Return StorageAdapter]
    SetCaps2 --> Return
    SetCaps3 --> Return
    SetCaps4 --> Return
```

## 5. Vector Clock Sync Protocol

```mermaid
sequenceDiagram
    participant DeviceA as Device A
    participant Local as Local DB
    participant Server as Sync Server
    participant DeviceB as Device B

    Note over DeviceA: Clock: {A:5, B:3}
    Note over DeviceB: Clock: {A:4, B:4}

    DeviceA->>Local: Write strand
    Local->>Local: tick(clock, A)
    Note over Local: Clock: {A:6, B:3}

    DeviceA->>Server: Push changes
    Note over Server: Store with clock

    DeviceB->>Server: Pull changes
    Server-->>DeviceB: Changes + clock {A:6, B:3}

    DeviceB->>DeviceB: compare clocks
    Note over DeviceB: Local {A:4, B:4} vs Remote {A:6, B:3}
    Note over DeviceB: Result: CONCURRENT

    DeviceB->>DeviceB: Detect conflict
    DeviceB->>DeviceB: Apply resolution strategy

    alt last-write-wins
        DeviceB->>DeviceB: Compare timestamps
    else local-wins
        DeviceB->>DeviceB: Keep local version
    else merge
        DeviceB->>DeviceB: Field-level merge
    else manual
        DeviceB->>DeviceB: Defer to UI
    end

    DeviceB->>DeviceB: merge clocks
    Note over DeviceB: Clock: {A:6, B:5}
```

## 6. Zero-Knowledge Encryption Flow

```mermaid
flowchart TB
    subgraph device [User Device]
        Plaintext[Plaintext Content]
        DeviceKey[Device Key]
        PBKDF2[PBKDF2 Key Derivation]
        AES[AES-256-GCM Encryption]
        Ciphertext[Encrypted Blob]
    end

    subgraph keyMgmt [Key Management]
        Passphrase[User Passphrase]
        Salt[Random Salt]
        DerivedKey[Derived Key]
        WrappedKey[Wrapped Device Key]
    end

    subgraph server [Server - Zero Knowledge]
        BlobStore[(Encrypted Blobs)]
        NoKeys[No Access to Keys]
        NoPlain[No Access to Plaintext]
    end

    Plaintext --> AES
    DeviceKey --> AES
    AES --> Ciphertext

    Passphrase --> PBKDF2
    Salt --> PBKDF2
    PBKDF2 --> DerivedKey
    DerivedKey --> WrappedKey
    WrappedKey --> DeviceKey

    Ciphertext --> BlobStore
    NoKeys -.->|Cannot read| BlobStore
    NoPlain -.->|Cannot decrypt| BlobStore
```

## 7. Editor Stack Architecture

```mermaid
graph TB
    subgraph editorModes [Editor Modes]
        WYSIWYG[WYSIWYG Mode]
        Source[Source Mode]
        Split[Split View]
        Preview[Preview Only]
    end

    subgraph tiptap [Tiptap Stack]
        ProseMirror[ProseMirror Core]
        StarterKit[StarterKit Extension]
        CodeBlock[CodeBlockLowlight]
        SlashCmd[Slash Commands]
        AISuggest[AI Suggestions]
        BubbleMenu[Bubble Menu]
    end

    subgraph codemirror [CodeMirror Stack]
        CM6Core[CodeMirror 6 Core]
        MDLang[Markdown Language]
        Highlighting[Syntax Highlighting]
        LineNumbers[Line Numbers]
    end

    subgraph conversion [Conversion Layer]
        MD2HTML[Markdown to HTML]
        HTML2MD[HTML to Markdown]
        Debounce[Debounced Converter]
    end

    subgraph output [Output]
        MarkdownFile[Markdown File]
        LivePreview[Live Preview]
    end

    WYSIWYG --> tiptap
    Source --> codemirror
    Split --> tiptap
    Split --> codemirror

    ProseMirror --> BubbleMenu
    StarterKit --> ProseMirror
    CodeBlock --> ProseMirror
    SlashCmd --> ProseMirror
    AISuggest --> ProseMirror

    CM6Core --> MDLang
    MDLang --> Highlighting
    CM6Core --> LineNumbers

    tiptap --> HTML2MD
    HTML2MD --> Debounce
    Debounce --> MarkdownFile

    codemirror --> MarkdownFile

    MarkdownFile --> MD2HTML
    MD2HTML --> LivePreview
```

## 8. NLP Classification Pipeline

```mermaid
flowchart LR
    subgraph input [Input Processing]
        RawText[Raw Markdown]
        Tokenize[Tokenizer]
        Stemmer[Porter Stemmer]
    end

    subgraph ngrams [N-gram Extraction]
        Unigrams[Unigrams 1.0x]
        Bigrams[Bigrams 2.0x]
        Trigrams[Trigrams 3.0x]
    end

    subgraph vocab [Vocabulary Matching]
        Subjects[8 Subject Categories]
        Topics[5 Topic Types]
        Difficulty[4 Skill Levels]
        Skills[Learning Prerequisites]
    end

    subgraph context [Context Analysis]
        NegContext[Negative Context]
        PosContext[Positive Context]
        ContextScore[Context Score]
    end

    subgraph output [Classification Output]
        Results[Classification Results]
        Confidence[Confidence Scores]
        Tags[Auto-generated Tags]
    end

    RawText --> Tokenize
    Tokenize --> Stemmer
    Stemmer --> Unigrams
    Stemmer --> Bigrams
    Stemmer --> Trigrams

    Unigrams --> Subjects
    Bigrams --> Subjects
    Trigrams --> Subjects
    Subjects --> NegContext
    Subjects --> PosContext

    NegContext --> ContextScore
    PosContext --> ContextScore
    ContextScore --> Results

    Results --> Confidence
    Results --> Tags
```

## 9. Workflow Engine Architecture

```mermaid
stateDiagram-v2
    [*] --> Pending: createInstance

    state Pending {
        [*] --> Initializing
        Initializing --> Ready: loadDefinition
    }

    Pending --> Running: start

    state Running {
        [*] --> TaskScheduling
        TaskScheduling --> TaskExecution: dispatchTask
        TaskExecution --> TaskComplete: success
        TaskExecution --> TaskRetry: failure
        TaskRetry --> TaskExecution: retry < max
        TaskRetry --> TaskFailed: retry >= max
        TaskComplete --> TaskScheduling: hasMoreTasks
        TaskComplete --> [*]: allComplete
    }

    Running --> Completed: allTasksComplete
    Running --> Failed: criticalError
    Running --> Cancelled: userCancel

    Completed --> [*]
    Failed --> [*]
    Cancelled --> [*]
```

## 10. Development Timeline

```mermaid
gantt
    title Voice Chat Assistant Development Timeline
    dateFormat  YYYY-MM
    section Phase 1
    Voice Assistant MVP           :2025-05, 30d
    Deployment Pipeline           :2025-05, 15d
    section Phase 2
    UI/UX Revamp                  :2025-06, 30d
    Theme System                  :2025-06, 20d
    section Phase 3
    AgentOS Design                :2025-07, 60d
    GMI Architecture              :2025-09, 30d
    Multi-Agent System            :2025-10, 30d
    section Phase 4
    SQL Storage Adapter           :2025-11, 45d
    Frame.dev Launch              :2025-11, 60d
    OpenStrand Schema             :2025-11, 30d
    section Phase 5
    Performance Optimization      :2025-12, 30d
    PageSpeed Battle              :2025-12, 20d
    Bug Fixes & Polish            :2026-01, 30d
```

## 11. Commit Distribution

```mermaid
pie title Commits by Month (May 2025 - Jan 2026)
    "May 2025 (252)" : 252
    "June 2025 (82)" : 82
    "July 2025 (2)" : 2
    "Sept 2025 (30)" : 30
    "Oct 2025 (160)" : 160
    "Nov 2025 (1344)" : 1344
    "Dec 2025 (467)" : 467
    "Jan 2026 (142)" : 142
```

## 12. Technology Stack Overview

```mermaid
mindmap
    root((Voice Chat Assistant))
        Frontend
            Next.js 14
            React 18
            Tailwind CSS
            Tiptap Editor
            CodeMirror 6
            Framer Motion
        Backend
            Express.js
            Fastify
            TypeScript
            WebSocket
            SSE Streaming
        Storage
            SQLite
            PostgreSQL
            IndexedDB
            better-sqlite3
            sql.js
        AI/ML
            OpenAI
            Anthropic
            OpenRouter
            Ollama
            pgvector
        Infrastructure
            Linode VPS
            Cloudflare
            Vercel
            GitHub Actions
            PM2
        Packages
            AgentOS
            SQL Storage Adapter
            Codex Extensions
            Theme Tokens
```

---

_These diagrams are rendered using Mermaid.js and can be viewed in any Mermaid-compatible markdown renderer (GitHub, VS Code with extensions, etc.)_
