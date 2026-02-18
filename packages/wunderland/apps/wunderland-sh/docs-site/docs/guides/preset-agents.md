---
sidebar_position: 19
title: Preset Agents
description: Using and creating agent presets and deployment templates
---

# Preset Agents

Wunderland ships with **8 agent presets** and **3 deployment templates** that provide ready-to-use configurations for common use cases. Presets define the agent's personality, security posture, suggested skills, and recommended channels -- so you can go from zero to a working agent in one command.

## Using Presets via CLI

The fastest way to create a new agent from a preset:

```bash
wunderland init my-agent --preset research-assistant
```

This scaffolds a project directory with `agent.config.json`, `PERSONA.md`, and `.env.example` pre-populated from the preset.

You can combine a preset with a security tier override:

```bash
wunderland init my-agent --preset creative-writer --security-tier permissive
```

To list all available presets:

```bash
wunderland list-presets
```

## Available Agent Presets

### `research-assistant`

**Thorough researcher with analytical focus.** High conscientiousness and openness drive systematic, deep-dive research behavior.

| Trait | Value | Security Tier | Suggested Skills |
|-------|-------|---------------|-----------------|
| Honesty | 0.90 | `balanced` | web-search, summarize, github |
| Emotionality | 0.30 | | |
| Extraversion | 0.40 | **Channels** | |
| Agreeableness | 0.70 | webchat, slack | |
| Conscientiousness | 0.95 | | |
| Openness | 0.85 | | |

---

### `customer-support`

**Patient, empathetic support specialist.** Very high agreeableness and elevated emotionality produce warm, accommodating interactions. Uses `strict` security to protect customer data.

| Trait | Value | Security Tier | Suggested Skills |
|-------|-------|---------------|-----------------|
| Honesty | 0.80 | `strict` | healthcheck |
| Emotionality | 0.70 | | |
| Extraversion | 0.60 | **Channels** | |
| Agreeableness | 0.95 | webchat, telegram, whatsapp, discord | |
| Conscientiousness | 0.85 | | |
| Openness | 0.50 | | |

---

### `creative-writer`

**Imaginative storyteller and content creator.** Near-maximum openness (0.98) combined with high emotionality and moderate conscientiousness encourages experimental, expressive output.

| Trait | Value | Security Tier | Suggested Skills |
|-------|-------|---------------|-----------------|
| Honesty | 0.70 | `balanced` | summarize, image-gen |
| Emotionality | 0.80 | | |
| Extraversion | 0.70 | **Channels** | |
| Agreeableness | 0.60 | webchat | |
| Conscientiousness | 0.50 | | |
| Openness | 0.98 | | |

---

### `code-reviewer`

**Precise, detail-oriented code analyst.** Near-maximum conscientiousness (0.98) and high honesty (0.95) produce thorough, no-nonsense code reviews. Low emotionality keeps feedback objective.

| Trait | Value | Security Tier | Suggested Skills |
|-------|-------|---------------|-----------------|
| Honesty | 0.95 | `strict` | coding-agent, github |
| Emotionality | 0.20 | | |
| Extraversion | 0.30 | **Channels** | |
| Agreeableness | 0.50 | webchat, slack, discord | |
| Conscientiousness | 0.98 | | |
| Openness | 0.70 | | |

---

### `data-analyst`

**Systematic data interpreter and visualizer.** High conscientiousness and openness balanced with low emotionality for objective, thorough analysis.

| Trait | Value | Security Tier | Suggested Skills |
|-------|-------|---------------|-----------------|
| Honesty | 0.90 | `balanced` | summarize, coding-agent |
| Emotionality | 0.20 | | |
| Extraversion | 0.40 | **Channels** | |
| Agreeableness | 0.60 | webchat, slack | |
| Conscientiousness | 0.90 | | |
| Openness | 0.80 | | |

---

### `security-auditor`

**Vigilant security-focused analyst.** Near-maximum honesty (0.98) and conscientiousness (0.99) paired with the `paranoid` security tier. Low agreeableness means it will not hesitate to flag issues.

| Trait | Value | Security Tier | Suggested Skills |
|-------|-------|---------------|-----------------|
| Honesty | 0.98 | `paranoid` | coding-agent, github, healthcheck |
| Emotionality | 0.15 | | |
| Extraversion | 0.25 | **Channels** | |
| Agreeableness | 0.30 | webchat | |
| Conscientiousness | 0.99 | | |
| Openness | 0.60 | | |

---

### `devops-assistant`

**Infrastructure and deployment specialist.** Balanced extraversion with high conscientiousness for clear, reliable operational guidance. Uses `strict` security for production safety.

| Trait | Value | Security Tier | Suggested Skills |
|-------|-------|---------------|-----------------|
| Honesty | 0.85 | `strict` | healthcheck, coding-agent, github |
| Emotionality | 0.20 | | |
| Extraversion | 0.50 | **Channels** | |
| Agreeableness | 0.60 | slack, discord, webchat | |
| Conscientiousness | 0.90 | | |
| Openness | 0.75 | | |

---

### `personal-assistant`

**Friendly, organized daily helper.** High extraversion and agreeableness create a warm, proactive assistant. Suggested channels include the popular mobile messaging platforms.

| Trait | Value | Security Tier | Suggested Skills |
|-------|-------|---------------|-----------------|
| Honesty | 0.80 | `balanced` | weather, apple-notes, apple-reminders, summarize |
| Emotionality | 0.60 | | |
| Extraversion | 0.75 | **Channels** | |
| Agreeableness | 0.85 | telegram, whatsapp, webchat | |
| Conscientiousness | 0.80 | | |
| Openness | 0.70 | | |

---

## Deployment Templates

Templates provide full project configurations including security profiles, inference defaults, and step-up authorization rules. They are more comprehensive than agent presets.

### `minimal`

Bare-bones configuration for local development and experimentation.

- Security tier: `permissive`
- All security layers **disabled**
- Inference: Ollama with `llama3` (local)
- Channels: webchat only
- Step-up auth: Tier 1 (all autonomous), 10-minute timeout

```bash
wunderland init my-dev-agent --template minimal
```

### `standard`

Balanced configuration suitable for most use cases. Enables input classification and dual-LLM auditing with moderate security.

- Security tier: `balanced`
- PreLLM classifier and DualLLM auditor **enabled**
- Inference: Ollama with `dolphin-llama3:8b`
- Channels: webchat, telegram, discord
- Skills: web-search, summarize, healthcheck
- Step-up auth: Tier 1 default, Tier 2 for data/API/communication, Tier 3 for financial/system

```bash
wunderland init my-agent --template standard
```

### `enterprise`

Full security configuration for production and compliance-sensitive environments.

- Security tier: `strict`
- All three security layers **enabled** (including output signing)
- Inference: OpenAI `gpt-4o` with `gpt-4o-mini` router
- Channels: webchat, slack, teams, discord, telegram, whatsapp, email
- Skills: web-search, summarize, healthcheck, coding-agent, github
- Step-up auth: Tier 2 default, Tier 3 for data modification/financial/system
- Escalation triggers for high-value transactions, sensitive data, and irreversible actions
- Audit logging enabled (90-day retention)

```bash
wunderland init my-enterprise-agent --template enterprise
```

## Preset File Structure

Each preset lives in a folder under `presets/agents/<preset-id>/`:

```
presets/agents/research-assistant/
  agent.config.json   # HEXACO traits, security tier, skills, channels
  PERSONA.md          # System prompt / personality description
```

Templates are single JSON files under `presets/templates/`:

```
presets/templates/
  minimal.json
  standard.json
  enterprise.json
```

## Loading Presets Programmatically

```typescript
import { PresetLoader } from 'wunderland';

const loader = new PresetLoader();

// List all presets
const presets = loader.listPresets();
for (const p of presets) {
  console.log(`${p.id}: ${p.description} (${p.securityTier})`);
}

// Load a specific preset
const researcher = loader.loadPreset('research-assistant');
console.log(researcher.hexacoTraits);
console.log(researcher.persona); // Contents of PERSONA.md

// Load a template
const enterprise = loader.loadTemplate('enterprise');
console.log(enterprise.securityTier); // "strict"

// Get all known preset IDs (static, no filesystem)
const ids = PresetLoader.getPresetIds();
// ['research-assistant', 'customer-support', 'creative-writer', ...]
```

## Creating Custom Presets

To create your own preset:

1. Create a directory under `presets/agents/`:

```bash
mkdir -p presets/agents/my-custom-agent
```

2. Create `agent.config.json`:

```json
{
  "name": "My Custom Agent",
  "description": "A domain-specific agent for my use case",
  "hexacoTraits": {
    "honesty": 0.85,
    "emotionality": 0.4,
    "extraversion": 0.6,
    "agreeableness": 0.7,
    "conscientiousness": 0.8,
    "openness": 0.75
  },
  "securityTier": "balanced",
  "suggestedSkills": ["web-search", "summarize"],
  "suggestedChannels": ["webchat", "slack"]
}
```

3. Create `PERSONA.md` with the agent's system prompt and behavioral guidelines.

4. Use it:

```bash
wunderland init my-project --preset my-custom-agent
```

## Recommended Skills by Preset

Each agent preset declares `suggestedSkills` that are automatically loaded from the curated skills registry when you run `wunderland start` or `wunderland chat` in a project scaffolded from that preset.

| Preset | Security | Skills |
|--------|----------|--------|
| `research-assistant` | balanced | `web-search`, `summarize`, `github` |
| `customer-support` | strict | `healthcheck` |
| `creative-writer` | balanced | `summarize`, `image-gen` |
| `code-reviewer` | strict | `coding-agent`, `github` |
| `data-analyst` | balanced | `summarize`, `coding-agent` |
| `security-auditor` | paranoid | `coding-agent`, `github`, `healthcheck` |
| `devops-assistant` | strict | `healthcheck`, `coding-agent`, `github` |
| `personal-assistant` | balanced | `weather`, `apple-notes`, `apple-reminders`, `summarize` |

### How auto-loading works

1. `wunderland init my-agent --preset research-assistant` writes `"skills": ["web-search", "summarize", "github"]` into `agent.config.json`.
2. On `wunderland start` or `wunderland chat`, the CLI reads the `skills` array and calls `resolveSkillsByNames()` from the `@framers/agentos-skills-registry` package.
3. The resolver validates each skill name against the curated catalog, builds a prompt snapshot, and merges it into the system prompt alongside any directory-based skills.

You can modify the `skills` array in `agent.config.json` at any time to add or remove skills:

```json
{
  "skills": ["web-search", "summarize", "github", "obsidian"]
}
```

## Exporting and Importing Agents

Agents can be exported as portable JSON manifests for sharing, backup, or migration:

```bash
# Export current agent
wunderland export

# Export to a specific file
wunderland export -o my-agent-backup.json

# Import an agent from a manifest
wunderland import agent.manifest.json --dir ./my-imported-agent
```

The manifest includes HEXACO traits, security configuration, skills, channels, persona, and an optional integrity hash for sealed agents. Importing a sealed agent creates an unsealed copy. See [Agent Serialization](./agent-serialization.md) for the full manifest format.

## Related

- [Creating Agents](./creating-agents.md) -- full seed configuration reference
- [HEXACO Personality](./hexaco-personality.md) -- personality trait system
- [Security Tiers](./security-tiers.md) -- tier configuration details
- [Skills System](./skills-system.md) -- skill registry and management
- [Agent Serialization](./agent-serialization.md) -- export/import manifest format
