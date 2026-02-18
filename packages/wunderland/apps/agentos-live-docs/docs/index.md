---
title: 'AgentOS Documentation'
sidebar_position: 0
slug: /
---

# AgentOS Documentation

Modular orchestration runtime for AI agent systems.

```bash
npm install @framers/agentos
```

## Quick Navigation

### Getting Started

- [Documentation Index](/docs/getting-started/documentation-index) — Installation and quick start
- [Ecosystem](/docs/getting-started/ecosystem) — Related packages and resources
- [Releasing](/docs/getting-started/releasing) — Version history and release process

### Architecture & Core

- [System Architecture](/docs/architecture/system-architecture) — System design and core internals
- [Platform Support](/docs/architecture/platform-support) — Supported environments
- [Observability (OpenTelemetry)](/docs/architecture/observability) — Traces, metrics, and OTEL-compatible logging (opt-in)
- [Logging (Pino + OpenTelemetry)](/docs/architecture/logging) — Structured logs, trace correlation, and OTEL LogRecord export (opt-in)

### Planning & Orchestration

- [Planning Engine](/docs/features/planning-engine) — Multi-step task planning
- [Human-in-the-Loop](/docs/features/human-in-the-loop) — Approval workflows
- [Agent Communication](/docs/features/agent-communication) — Inter-agent messaging

### Safety & Security

- [Guardrails](/docs/features/guardrails) — Content filtering, PII redaction, and folder-level filesystem permissions
- [Safety Primitives](/docs/features/safety-primitives) — Circuit breakers, cost guards, stuck detection, and tool execution guards

### Memory & Storage

- [RAG Memory](/docs/features/rag-memory) — Vector storage and retrieval
- [SQL Storage](/docs/features/sql-storage) — Database adapters
- [Client-Side Storage](/docs/features/client-side-storage) — Browser and local persistence

### AI & LLM

- [Structured Output](/docs/features/structured-output) — JSON schema validation
- [Evaluation Framework](/docs/features/evaluation-framework) — Testing and benchmarks
- [Cost Optimization](/docs/features/cost-optimization) — Token usage and caching

### Advanced

- [Recursive Self-Building](/docs/features/recursive-self-building) — Self-modifying agent patterns
- [Agency Collaboration](/docs/features/agency-collaboration) — Multi-agent coordination

### Extensions

- [Extensions Overview](/docs/extensions/overview) — Available extensions catalog
- [How Extensions Work](/docs/extensions/how-extensions-work) — Loading and configuration
- [Extension Architecture](/docs/extensions/extension-architecture) — Building custom extensions
- [Auto-Loading](/docs/extensions/auto-loading) — Automatic extension discovery
- **Official**: [Web Search](/docs/extensions/built-in/web-search), [Telegram](/docs/extensions/built-in/telegram), [Voice Synthesis](/docs/extensions/built-in/voice-synthesis), [CLI Executor](/docs/extensions/built-in/cli-executor), [Image Search](/docs/extensions/built-in/image-search), [News Search](/docs/extensions/built-in/news-search), [Giphy](/docs/extensions/built-in/giphy), [Web Browser](/docs/extensions/built-in/web-browser), [Auth](/docs/extensions/built-in/auth)

### API Reference

- [TypeDoc API](/docs/api/) — Auto-generated API documentation
