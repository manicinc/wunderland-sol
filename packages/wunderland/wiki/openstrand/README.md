# OpenStrand

AI-native personal knowledge management system built on Quarry.

_The OS for humans, the codex of humanity._

## Overview

OpenStrand is a personal knowledge management system (PKMS) that integrates AI capabilities with local-first architecture. Built on Quarry, it provides an interface for capturing, connecting, and discovering knowledge.

### Core Philosophy

- Local-first: Data stays on your device by default
- AI-native: Built with AI integration from the start
- Connected: Knowledge graph visualization and semantic linking
- Fast: Instant search with vector embeddings
- Private: End-to-end encryption for cloud sync

## Key Features

### Knowledge Management

- Universal import: 20+ formats including Markdown, Notion, Obsidian, Roam
- Smart organization: AI-powered categorization and tagging
- Visual knowledge graph: Interactive 3D visualization
- Block references: Transclusion and block-level linking
- Version history: Git-like branching and merging

### AI Integration

- Semantic search: Find by meaning, not just keywords
- AI assistant: Context-aware chat with your knowledge base
- Smart suggestions: AI-powered link and tag recommendations
- Content generation: AI-assisted writing with context
- Knowledge synthesis: Discover insights across notes

### Technical Features

- TypeScript monorepo architecture
- Database abstraction: PostgreSQL in cloud, PGlite locally
- Real-time sync: Conflict-free replicated data types
- Plugin system: Extensible architecture
- API-first: REST and GraphQL APIs

## Architecture Overview

```
OpenStrand Client
├── Next.js Web App
├── Editor Components
└── Knowledge Graph Visualization

OpenStrand SDK
├── Core API Methods
├── Sync Engine
└── AI Integration

OpenStrand Server
├── Fastify API
├── PostgreSQL Database
└── Vector Store

Quarry (Knowledge Repository)
```

## Getting Started

### Installation

```bash
# Clone repository
git clone https://github.com/framersai/openstrand.git
cd openstrand

# Install dependencies
npm install

# Start development
npm run dev
```

### Quick Start

```typescript
import { OpenStrand } from '@openstrand/sdk';

const os = new OpenStrand();
const vault = await os.createVault('My Knowledge');

// Import notes
await vault.import({
  source: './obsidian-vault',
  format: 'obsidian',
});

// Search knowledge
const results = await vault.search('machine learning concepts');
```

## Core Concepts

### Knowledge Organization

OpenStrand uses Quarry's model:

- **Strand**: Atomic knowledge unit (note, document, image)
- **Loom**: Collection of related strands (project, topic)
- **Weave**: Complete knowledge universe (vault, workspace)

### Local-First Architecture

```typescript
// Data stays local
const strand = await vault.createStrand({
  title: 'Private Thoughts',
  content: 'This stays on device...',
  syncEnabled: false,
});

// Selective sync
await strand.enableSync({
  encrypted: true,
  shareWith: ['team@example.com'],
});
```

### AI Features

```typescript
// Semantic search
const similar = await vault.findSimilar(strand, {
  threshold: 0.8,
  limit: 10,
});

// AI chat
const response = await vault.chat('Summarize quantum computing notes', {
  context: ['physics-loom'],
});

// Smart suggestions
const suggestions = await strand.getSuggestions({
  links: true,
  tags: true,
  relatedContent: true,
});
```

## Development

### Project Structure

```
openstrand/
├── apps/
│   ├── web/          # Next.js application
│   └── desktop/      # Electron app (planned)
├── packages/
│   ├── core/         # Business logic
│   ├── sdk/          # TypeScript SDK
│   ├── ui/           # UI components
│   └── sync/         # Sync engine
├── server/           # Fastify API
└── docs/            # Documentation
```

### Technology Stack

- Frontend: Next.js, React, TypeScript, Tailwind
- Backend: Fastify, PostgreSQL, Redis
- AI/ML: OpenAI, Anthropic, Ollama
- Search: pgvector, MeiliSearch
- Visualization: D3.js, Three.js

## Integrations

### Import Sources

- Markdown files
- Notion export
- Obsidian vault
- Roam Research
- Evernote
- OneNote
- Apple Notes
- Google Docs
- PDFs
- Web pages
- YouTube transcripts

### Export Formats

- Markdown
- HTML
- PDF
- OPML
- JSON
- Quarry format

### Third-Party Services

- AI Providers: OpenAI, Anthropic, Cohere, local models
- Storage: Local filesystem, S3-compatible, IPFS
- Sync: WebDAV, Git, proprietary sync
- Publishing: Static sites, blogs, wikis

## Security & Privacy

### Data Protection

- Encryption: AES-256 at rest
- Transport: TLS 1.3
- Zero-knowledge: Optional E2E encryption
- Local storage: SQLite/PGlite with encryption

### Privacy Features

- No telemetry by default
- Local AI options
- Export everything
- Complete data removal

## Documentation

- [Architecture](./architecture.md) - Technical design
- [Features](./features.md) - Feature documentation
- [API Reference](./api.md) - SDK and API docs
- [Plugins](./plugins.md) - Plugin development

## Community

- GitHub: [github.com/framersai/openstrand](https://github.com/framersai/openstrand)
- Discord: [discord.gg/openstrand](https://discord.gg/openstrand)
- Twitter: [@openstrand](https://twitter.com/openstrand)
- Forum: [community.openstrand.ai](https://community.openstrand.ai)

## License

OpenStrand is available under:

- Community Edition: MIT License
- Enterprise Edition: Commercial license

See [LICENSE](https://github.com/framersai/openstrand/LICENSE) for details.
