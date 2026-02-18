# Ask Interface Guide

The Ask Interface is Quarry Codex's unified knowledge discovery system. It combines on-device semantic search, cloud AI integration, and RAG (Retrieval Augmented Generation) for intelligent question answering.

## Overview

The Ask interface provides four modes:
- **Brain** - On-device semantic/lexical search using local AI models
- **Cloud AI** - LLM-powered answers via Claude, GPT, or Ollama
- **Hybrid** - Combines local search with cloud AI enhancement
- **Planner** - Oracle AI assistant for task management

## Accessing the Ask Interface

Open the Ask interface from the navigation sidebar or use keyboard shortcuts:
- Click the **Ask** icon in the sidebar
- Press `Cmd/Ctrl + K` for quick access

## Modes

### Brain Mode (On-Device)

Uses local AI models running entirely in your browser:

```
┌─────────────────────────────────────────┐
│  Your Question                          │
│         ↓                               │
│  ┌───────────────────────┐              │
│  │ ONNX Runtime / TF.js  │ (WebAssembly)│
│  │ Semantic Embeddings   │              │
│  └───────────────────────┘              │
│         ↓                               │
│  Cosine Similarity Search               │
│         ↓                               │
│  Top Matching Documents                 │
└─────────────────────────────────────────┘
```

**Features:**
- 100% private - queries never leave your device
- Works offline after initial model download
- Fast response times (~50-250ms)
- Falls back to lexical search if semantic unavailable

### Cloud AI Mode

Uses external LLM providers for conversational answers:

**Supported Providers:**
| Provider | Model | Setup |
|----------|-------|-------|
| Anthropic | Claude 3.5 | API key in Settings |
| OpenAI | GPT-4 | API key in Settings |
| Ollama | Local LLMs | Install Ollama locally |

**Features:**
- Streaming responses
- Conversation history (last 5 exchanges)
- RAG context injection from selected strands

### Hybrid Mode

Best of both worlds - local search enhanced by cloud AI:

1. Performs local semantic search first
2. If confidence > 75%, shows local result
3. Otherwise, enhances with LLM using local context
4. Includes source citations from local search

### Planner Mode (Oracle)

AI-powered task management assistant:

```
You: "Add a task 'Review emails' for today"
Oracle: I'll create that task for you.
        [Confirm] [Cancel]
```

**Capabilities:**
- Create and schedule tasks
- Find free time slots
- Suggest daily priorities
- Timebox your day

## RAG Context Features

### Multi-Strand Context Selection

Select multiple knowledge sources to enhance your queries:

1. **Sidebar Selection** - Use MultiStrandPicker in Learning Studio
2. **Inline Picker** - Add strands directly in Ask interface
3. **Shared Context** - Sidebar selections automatically sync to Ask

When strands are selected:
```
┌─────────────────────────────────────────────┐
│ 📚 3 strands selected from sidebar (2,450 words) │
└─────────────────────────────────────────────┘
```

### File Attachments

Drag-drop or click to attach files as context:

**Supported Types:**
- Images (PNG, JPG, GIF, WebP)
- PDFs
- Text files (.txt, .md, .json)

Files are processed locally:
- Images: Preview thumbnail generated
- Text: Content extracted for RAG injection
- PDFs: Text extraction (when supported)

### RAG Mode Toggle

Control how context is processed:

| Mode | Description |
|------|-------------|
| **Local** | Fast local search only |
| **Re-rank** | AI re-ranks search results |
| **Synthesize** | AI generates comprehensive answer |

## Context Injection

When you have selected strands or files, they're automatically injected into your prompts:

```
I have the following context from my knowledge base:

**Selected Knowledge Sources (2):**
## Introduction to APIs
REST APIs use HTTP methods like GET, POST, PUT...

## Authentication Guide
OAuth 2.0 provides secure authorization...

---

Based on this context, please answer: How do I authenticate API requests?
```

## Citation Display

Answers include interactive source citations:

```
┌─────────────────────────────────────────┐
│ Sources (3)                             │
├─────────────────────────────────────────┤
│ [1] API Authentication Guide     95%    │
│     /docs/auth.md                       │
│     "OAuth tokens are issued..."        │
├─────────────────────────────────────────┤
│ [2] REST API Reference           78%    │
│     /docs/api.md                        │
│     "Authentication headers..."         │
└─────────────────────────────────────────┘
```

**Features:**
- Relevance score color coding (green > 80%, amber > 60%)
- Click to open source document
- Snippet preview on hover

## Settings

Access settings via the gear icon in the header:

### Search Mode (Brain)
- **Semantic** - AI-powered meaning-based search
- **Lexical** - Traditional keyword matching

### Answer Mode (Brain/Hybrid)
- **Local** - Fast, no API required
- **Re-rank** - Better ordering, requires API
- **Synthesize** - AI-generated answers, requires API

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Submit question |
| `Esc` | Close Ask interface |
| `Cmd/Ctrl + K` | Open Ask interface |

## Voice Input

Click the microphone icon for voice input:
- Automatic speech-to-text transcription
- Auto-submits if question ends with "?"

## Text-to-Speech

Click the speaker icon on any answer to hear it read aloud.

## Developer Integration

### SelectedStrandsProvider

Wrap your app to enable shared strand context:

```tsx
import { SelectedStrandsProvider } from '@/components/quarry/contexts/SelectedStrandsContext'

<SelectedStrandsProvider>
  <App />
</SelectedStrandsProvider>
```

### useSelectedStrands Hook

Access and modify selected strands from any component:

```tsx
import { useSelectedStrands } from '@/components/quarry/contexts/SelectedStrandsContext'

function MyComponent() {
  const { strands, addStrand, removeStrand, clearAll } = useSelectedStrands()

  return (
    <div>
      {strands.length} strands selected ({totalWords} words)
    </div>
  )
}
```

### useMultiStrandContent Hook

Enable automatic sync to Ask context:

```tsx
const multiStrand = useMultiStrandContent(availableStrands, fetchContent, {
  syncToAsk: true,      // Sync selections to Ask interface
  syncContent: true,    // Include full content (enables RAG)
})
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    UnifiedAskInterface                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ ContextPicker│  │FileUploadZone│  │  RAGModeToggle    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │                │                    │              │
│         └────────────────┼────────────────────┘              │
│                          ▼                                   │
│              ┌──────────────────────┐                        │
│              │    ragContext        │ (memoized)             │
│              │ Selected strands +   │                        │
│              │ Uploaded files       │                        │
│              └──────────────────────┘                        │
│                          │                                   │
│         ┌────────────────┼────────────────┐                  │
│         ▼                ▼                ▼                  │
│  ┌────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │handleLocal │  │handleCloud  │  │handleHybrid │           │
│  │  Search    │  │  Search     │  │  Search     │           │
│  └────────────┘  └─────────────┘  └─────────────┘           │
│                          │                                   │
│                          ▼                                   │
│              ┌──────────────────────┐                        │
│              │   CitationsList      │                        │
│              │  (source display)    │                        │
│              └──────────────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Curated Suggested Questions

Content authors can add curated suggested questions directly to strand frontmatter. These questions take priority over auto-generated suggestions in the Ask Interface.

### Frontmatter Schema

```yaml
---
title: "Introduction to React"
tags: [react, frontend]
suggestedQuestions:
  - question: "What is the difference between props and state?"
    difficulty: beginner
    tags: [props, state, fundamentals]
  - question: "How does React's virtual DOM improve performance?"
    difficulty: intermediate
    tags: [virtual-dom, performance]
  - question: "When should I use useEffect vs useLayoutEffect?"
    difficulty: advanced
    tags: [hooks, effects]
---
```

### Schema Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | Yes | The question text |
| `difficulty` | enum | No | `beginner`, `intermediate`, `advanced` (default: `intermediate`) |
| `tags` | string[] | No | Tags for categorization |

### Priority Order

The Ask Interface loads suggested questions in this order:

1. **Manual questions** from strand frontmatter (highest priority, marked "Curated")
2. **Pre-built questions** from `suggested-questions.json` (generated at build time)
3. **Dynamic NLP generation** (fallback, generated client-side from content)

### Build-Time Generation

Run `npm run generate:questions` to regenerate the suggested questions JSON from the Codex repository. This script:

1. Fetches all markdown strands from the configured Codex repo
2. Parses YAML frontmatter for manual `suggestedQuestions`
3. Falls back to NLP-based auto-generation for strands without manual questions
4. Outputs to `/public/assets/suggested-questions.json`

---

## Related Documentation

- [Semantic Search Architecture](./SEMANTIC_SEARCH_ARCHITECTURE.md)
- [Planner Guide](./PLANNER_GUIDE.md)
- [Learning System Guide](./LEARNING_SYSTEM_GUIDE.md)
- [Strand Architecture](./STRAND_ARCHITECTURE.md) - Full frontmatter schema reference
