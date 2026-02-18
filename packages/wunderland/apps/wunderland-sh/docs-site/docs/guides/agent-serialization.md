---
sidebar_position: 20
title: Agent Serialization
description: Exporting, importing, and sharing agents via manifest files
---

# Agent Serialization

Wunderland agents can be exported as portable JSON manifests for sharing, backup, migration between environments, or version-controlled agent configurations.

## Quick Start

```bash
# Export your agent
cd my-agent
wunderland export

# Share the manifest
cp agent.manifest.json ~/shared/

# Import on another machine
wunderland import ~/shared/agent.manifest.json --dir ./my-copy
```

## Manifest Format

The `AgentManifest` is a self-contained JSON document:

```json
{
  "manifestVersion": 1,
  "exportedAt": "2025-06-15T10:30:00.000Z",
  "seedId": "seed-abc123",
  "name": "Research Assistant",
  "description": "Thorough researcher with analytical focus",
  "presetId": "research-assistant",
  "hexacoTraits": {
    "honesty": 0.90,
    "emotionality": 0.30,
    "extraversion": 0.40,
    "agreeableness": 0.70,
    "conscientiousness": 0.95,
    "openness": 0.85
  },
  "security": {
    "preLLMClassifier": true,
    "dualLLMAudit": true,
    "outputSigning": true,
    "riskThreshold": 0.7
  },
  "securityTier": "balanced",
  "skills": ["web-search", "summarize", "github"],
  "channels": ["webchat", "slack"],
  "persona": "You are a meticulous research assistant...",
  "systemPrompt": "Custom system prompt if any",
  "sealed": false,
  "configHash": null
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `manifestVersion` | `1` | Yes | Schema version (always `1` for now) |
| `exportedAt` | ISO 8601 string | Yes | Timestamp of export |
| `seedId` | string | Yes | Unique agent identifier |
| `name` | string | Yes | Human-readable agent name |
| `description` | string | Yes | Agent purpose description |
| `presetId` | string | No | Original preset ID if scaffolded from one |
| `hexacoTraits` | object | Yes | Six HEXACO personality traits (0.0-1.0) |
| `security` | object | No | Security layer configuration |
| `securityTier` | string | No | Named tier (`dangerous`/`permissive`/`balanced`/`strict`/`paranoid`) |
| `skills` | string[] | Yes | Skill IDs from the curated registry |
| `channels` | string[] | Yes | Suggested channel platforms |
| `persona` | string | No | Contents of PERSONA.md |
| `systemPrompt` | string | No | Custom base system prompt |
| `sealed` | boolean | No | Whether the source agent was sealed |
| `configHash` | string | No | Integrity hash from sealed agent |

## CLI Commands

### `wunderland export`

Reads `agent.config.json` (and optionally `PERSONA.md`, `sealed.json`) from the agent directory and writes a manifest file.

```bash
wunderland export                    # Writes agent.manifest.json
wunderland export -o backup.json     # Custom output path
wunderland export --dir ./my-agent   # Export from specific directory
```

### `wunderland import`

Creates a new agent directory from a manifest file.

```bash
wunderland import manifest.json                    # Creates dir named after agent
wunderland import manifest.json --dir ./target     # Custom target directory
wunderland import manifest.json --dir ./existing --force  # Overwrite existing
```

What gets created:
- `agent.config.json` with all configuration
- `PERSONA.md` (if persona text is in the manifest)
- `skills/` directory (empty, for local skill overrides)

## Sealed Agents

When exporting a sealed agent:
- The manifest includes `"sealed": true` and the `configHash` from `sealed.json`
- The integrity hash is preserved for reference

When importing a sealed agent:
- The imported copy is **always unsealed** -- it becomes a fresh, editable agent
- A warning is displayed during import
- The original `configHash` is preserved in the manifest for provenance tracking

Only the owner of a hosted agent can trigger an export on the Rabbithole platform. Self-hosted agents can always be exported locally.

## Programmatic API

```typescript
import { exportAgent, importAgent, validateManifest } from 'wunderland';

// Export
const manifest = exportAgent('./my-agent');
console.log(manifest.name, manifest.skills);

// Validate external manifest
const data = JSON.parse(fs.readFileSync('external.json', 'utf8'));
if (validateManifest(data)) {
  importAgent(data, './imported-agent');
}
```

## Use Cases

- **Backup** -- Export before making breaking changes to personality or security
- **Team sharing** -- Share agent configurations across team members
- **Version control** -- Commit manifests to git for configuration history
- **Migration** -- Move agents between self-hosted and cloud environments
- **Templates** -- Use exported manifests as starting points for new agents

## Related

- [Preset Agents](./preset-agents.md) -- built-in agent presets
- [CLI Reference](./cli-reference.md) -- full command reference
- [Creating Agents](./creating-agents.md) -- seed configuration guide
