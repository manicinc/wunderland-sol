# AgentOS Extension Architecture

AgentOS extensions are **runtime code** loaded into the platform via an `ExtensionManifest`.

Extensions can provide:

- Tools (`ITool`) for LLM tool calling
- Guardrails (`IGuardrailService`)
- Workflows (definitions + executors)
- Messaging channels, memory providers, provenance hooks, and other extension kinds

For the practical “how do I load packs and call tools?” walkthrough, see `HOW_EXTENSIONS_WORK.md`.

## Core Types

### Extension Pack

An extension pack is a bundle of descriptors.

```ts
export interface ExtensionPack {
  name: string;
  version?: string;
  descriptors: ExtensionDescriptor[];
  onActivate?: (ctx) => Promise<void> | void;
  onDeactivate?: (ctx) => Promise<void> | void;
}
```

### Extension Descriptor

Each descriptor registers into a kind-specific registry (tools, guardrails, workflows, etc.).

```ts
export interface ExtensionDescriptor<TPayload = unknown> {
  id: string;
  kind: string; // 'tool', 'guardrail', ...
  payload: TPayload;
  priority?: number;
  requiredSecrets?: Array<{ id: string; optional?: boolean }>;
  onActivate?: (ctx) => Promise<void> | void;
  onDeactivate?: (ctx) => Promise<void> | void;
}
```

## Tool Calling Key Detail: `descriptor.id === tool.name`

Tool calling resolves tools by the tool-call name (`ITool.name`).

AgentOS registers tools into the tool registry using `descriptor.id`, so tool descriptors must set:

- `descriptor.id` to `tool.name`

This keeps `ToolExecutor.getTool(toolName)` and `processToolCall({ name: toolName })` consistent.

## Loading Model

At runtime:

1. `ExtensionManager` loads packs from the manifest (sequentially)
2. Pack descriptors register into an `ExtensionRegistry` per kind
3. `ToolExecutor` reads tools from the `ExtensionRegistry('tool')`
4. `ToolOrchestrator` exposes tool schemas and executes tool calls

```mermaid
graph TD
  M[ExtensionManifest] --> EM[ExtensionManager.loadManifest]
  EM --> P[ExtensionPack]
  P --> D[Descriptors]
  D --> R[ExtensionRegistry (per kind)]
  R --> TE[ToolExecutor]
  TE --> TO[ToolOrchestrator]
```

## Priority & Stacking

Descriptors with the same `(kind, id)` form a stack:

- higher `priority` becomes active
- if equal, the most recently registered descriptor wins

Pack entry `priority` is the default for all descriptors emitted by a pack, unless an individual descriptor sets its own `priority`.

Per-descriptor overrides can disable or reprioritize:

- tools
- guardrails
- response processors

## Secrets & `requiredSecrets`

Descriptors can declare `requiredSecrets` so AgentOS can skip descriptors that can’t function.

At runtime, secrets resolve from:

1. `extensionSecrets` passed to AgentOS
2. `packs[].options.secrets` (if present)
3. environment variables mapped via the shared secret catalog (`extension-secrets.json`)

For tooling and safety, prefer `requiredSecrets` + `ctx.getSecret()` over ad-hoc `process.env` lookups.

## Best Practices

- Keep `ITool.name` stable; it is the public API for tool calling.
- Set `ITool.hasSideEffects = true` for write/execute tools so hosts can gate approvals.
- Keep descriptor `priority` undefined by default so hosts can control pack ordering via the manifest.
- Define strict `inputSchema`/`outputSchema` and return structured errors in `ToolExecutionResult`.
