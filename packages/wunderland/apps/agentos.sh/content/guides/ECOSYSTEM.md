# AgentOS Ecosystem

> Related repositories, packages, and resources for building with AgentOS.

---

## Core Packages

### [@framers/agentos](https://github.com/framersai/agentos)
**Main SDK** — The core orchestration runtime for building adaptive AI agents.

```bash
npm install @framers/agentos
```

[![npm](https://img.shields.io/npm/v/@framers/agentos?logo=npm&color=cb3837)](https://www.npmjs.com/package/@framers/agentos)
[![GitHub](https://img.shields.io/github/stars/framersai/agentos?style=social)](https://github.com/framersai/agentos)

---

### [@framers/sql-storage-adapter](https://github.com/framersai/sql-storage-adapter)
**SQL Storage** — Cross-platform SQL storage abstraction with automatic fallbacks. Supports SQLite, PostgreSQL, and in-memory storage.

```bash
npm install @framers/sql-storage-adapter
```

[![npm](https://img.shields.io/npm/v/@framers/sql-storage-adapter?logo=npm&color=cb3837)](https://www.npmjs.com/package/@framers/sql-storage-adapter)
[![GitHub](https://img.shields.io/github/stars/framersai/sql-storage-adapter?style=social)](https://github.com/framersai/sql-storage-adapter)

**Features:**
- SQLite (better-sqlite3, sql.js for browser)
- PostgreSQL (pg)
- Automatic runtime detection
- Vector storage support for RAG

---

### [@framers/agentos-extensions-registry](https://github.com/framersai/agentos-extensions)
**Curated Extensions Registry** — Load all official extensions with a single `createCuratedManifest()` call. Handles lazy loading, secret resolution, and factory invocation.

```bash
npm install @framers/agentos-extensions-registry
```

[![npm](https://img.shields.io/npm/v/@framers/agentos-extensions-registry?logo=npm&color=cb3837)](https://www.npmjs.com/package/@framers/agentos-extensions-registry)
[![GitHub](https://img.shields.io/github/stars/framersai/agentos-extensions?style=social)](https://github.com/framersai/agentos-extensions)

```typescript
import { createCuratedManifest } from '@framers/agentos-extensions-registry';

const manifest = await createCuratedManifest({
  tools: 'all',
  channels: 'none',
  secrets: { 'serper.apiKey': process.env.SERPER_API_KEY! },
});

const agentos = new AgentOS();
await agentos.initialize({ extensionManifest: manifest });
```

Only installed extension packages will load — missing ones are skipped silently.

---

### [@framers/agentos-skills-registry](https://github.com/framersai/agentos-skills-registry)
**Curated Skills Registry** — 18 SKILL.md prompt modules + typed catalog + lazy-loading factories.

```bash
npm install @framers/agentos-skills-registry
```

[![npm](https://img.shields.io/npm/v/@framers/agentos-skills-registry?logo=npm&color=cb3837)](https://www.npmjs.com/package/@framers/agentos-skills-registry)

This is the **single package** for AgentOS skills. It bundles 18 curated SKILL.md prompt modules, a `registry.json` index, typed query helpers, and factory functions for runtime skill loading.

Each skill is a directory with a `SKILL.md` file containing YAML frontmatter (metadata, requirements, install specs) and markdown instructions that get injected into an agent's system prompt.

**Available Skills:** weather, github, slack, discord, notion, obsidian, trello, apple-notes, apple-reminders, healthcheck, spotify-player, whisper-transcribe, 1password, image-gen, coding-agent, summarize, git, web-search

```typescript
// Lightweight — no peer deps needed
import { searchSkills, getSkillsByCategory } from '@framers/agentos-skills-registry/catalog';

// Full registry — requires @framers/agentos peer dep
import { createCuratedSkillSnapshot } from '@framers/agentos-skills-registry';
const snapshot = await createCuratedSkillSnapshot({ skills: ['github', 'weather'] });
```

**Two import paths:**
- `@framers/agentos-skills-registry/catalog` — Zero peer deps. Static queries only.
- `@framers/agentos-skills-registry` — Lazy-loads `@framers/agentos` for live SkillRegistry + snapshot generation.

**Contributing:** Community skills are welcome via PR. See the [Contributing Guide](https://github.com/framersai/agentos-skills-registry/blob/main/CONTRIBUTING.md) for the SKILL.md format spec and submission process.

---

### [@framers/agentos-extensions](https://github.com/framersai/agentos-extensions)
**Extensions Catalog** — Static `registry.json` catalog of all available extensions.

```bash
npm install @framers/agentos-extensions
```

[![npm](https://img.shields.io/npm/v/@framers/agentos-extensions?logo=npm&color=cb3837)](https://www.npmjs.com/package/@framers/agentos-extensions)

**Available Extensions:**

| Category | Extensions |
|----------|-----------|
| **Research** | web-search, web-browser, news-search |
| **Media** | giphy, image-search, voice-synthesis |
| **System** | cli-executor, auth |
| **Integrations** | telegram, telegram-bot |
| **Provenance** | anchor-providers, tip-ingestion |
| **Channels** | telegram, whatsapp, discord, slack, webchat |

---

## Applications

### [agentos.sh](https://github.com/framersai/agentos.sh)
**Documentation Website** — Official documentation and marketing site.

🌐 **Live:** [agentos.sh](https://agentos.sh)

---

### [agentos-workbench](https://github.com/framersai/agentos-workbench)
**Development Workbench** — Visual development environment for building and testing AgentOS agents.

**Features:**
- Interactive agent playground
- Tool testing interface
- Conversation history viewer
- Real-time streaming visualization

---

## Quick Links

| Resource | Link |
|----------|------|
| Documentation | [agentos.sh/docs](https://agentos.sh/docs) |
| API Reference | [agentos-live-docs branch](https://github.com/framersai/agentos/tree/agentos-live-docs) |
| npm: @framers/agentos | [@framers/agentos](https://www.npmjs.com/package/@framers/agentos) |
| npm: @framers/agentos-skills-registry | [@framers/agentos-skills-registry](https://www.npmjs.com/package/@framers/agentos-skills-registry) |
| Discord | [Join Community](https://discord.gg/agentos) |
| Twitter | [@framersai](https://twitter.com/framersai) |

---

## Contributing

We welcome contributions to any repository in the ecosystem:

1. **Bug reports** — [Open an issue](https://github.com/framersai/agentos/issues)
2. **Feature requests** — [Start a discussion](https://github.com/framersai/agentos/discussions)
3. **Extensions** — Submit to [agentos-extensions](https://github.com/framersai/agentos-extensions)
4. **Documentation** — PRs welcome on any repo

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Your Application                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    @framers/agentos                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   AgentOS   │  │     GMI     │  │   Tool Orchestrator │  │
│  │   Runtime   │  │   Manager   │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
     │            │                │               │
     ▼            ▼                ▼               ▼
┌──────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐
│ sql-     │ │   agentos-   │ │   agentos-   │ │   LLM     │
│ storage- │ │  extensions  │ │ skills-      │ │ Providers │
│ adapter  │ │              │ │ registry     │ │           │
└──────────┘ └──────────────┘ └──────────────┘ └───────────┘
                                    │
                                    ▼
                              ┌──────────────┐
                              │   agentos-   │
                              │    skills    │
                              │ (SKILL.md)   │
                              └──────────────┘
```

---

<p align="center">
  <sub>Part of the <a href="https://agentos.sh">AgentOS</a> ecosystem by <a href="https://frame.dev">Frame.dev</a></sub>
</p>
