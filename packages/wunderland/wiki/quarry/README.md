# Quarry

AI-native personal knowledge management with zero-knowledge encryption.

_Your knowledge, your device, your keys._

[![E2E Encrypted](https://img.shields.io/badge/E2E_Encrypted-AES--256--GCM-00C853?style=flat-square&logo=shield&logoColor=white)](./local-first-sync-architecture.md)
[![Zero Knowledge](https://img.shields.io/badge/Zero_Knowledge-Device_Local-7C4DFF?style=flat-square&logo=lock&logoColor=white)](./local-first-sync-architecture.md)
[![Local First](https://img.shields.io/badge/Local_First-Offline_Ready-FF6D00?style=flat-square&logo=database&logoColor=white)](./local-first-sync-architecture.md)
[![Open Source](https://img.shields.io/badge/Open_Source-MIT-blue?style=flat-square&logo=github&logoColor=white)](https://github.com/framersai)

## Mission

Frame.dev builds foundational infrastructure that enables AI systems to interact with knowledge in new ways. The platform focuses on adaptive AI intelligence that is emergent and permanent.

## Vision

Creating infrastructure where:

- Knowledge becomes universally accessible through AI
- AI systems amplify rather than replace human capabilities
- Personal knowledge management adapts to individual thinking patterns
- Open infrastructure enables innovation

## Current Products

### Frame Codex

Knowledge repository designed for LLM consumption. Open-source, structured collection of information organized into weaves, looms, and strands.

### OpenStrand

AI-native personal knowledge management system. Local-first architecture with cloud sync capabilities, knowledge graph visualization, and multi-format import.

### Frame OS (Planned)

Infrastructure for AI agents including secure execution, resource management, and deployment tools.

## Security & Privacy

### Zero-Knowledge Architecture

Quarry is built on zero-knowledge principles: **we cannot read your data, even if we wanted to**.

- **Device-Local Keys**: Encryption keys are generated on your device and never leave it
- **AES-256-GCM**: Military-grade encryption for all your notes and data
- **No Server Access**: The sync server only sees encrypted blobs - unreadable without your key
- **No Account Required**: Use Quarry fully offline with no registration

### How It Works

```
Your Device                           Server (if syncing)
┌─────────────────┐                  ┌─────────────────┐
│ 📝 Your Notes   │                  │ 🔒 Encrypted    │
│ 🔑 Your Key     │  ──encrypted──▶  │    Blobs Only   │
│ 🔓 Decrypted    │                  │ ❌ No Keys      │
│    locally      │                  │ ❌ No Plaintext │
└─────────────────┘                  └─────────────────┘
```

See [Local-First Sync Architecture](./local-first-sync-architecture.md) for technical details.

## Technical Philosophy

### Open Source First

Core infrastructure is open source, enabling developers to build on the foundation.

### Local-First Architecture

Privacy and data ownership through offline-first design. Your data lives on your device first, with optional encrypted sync.

### AI-Native Design

Built specifically for AI integration rather than retrofitted. Design decisions prioritize AI system interaction.

### Standards-Based

Embraces open standards and protocols to ensure interoperability.

## Getting Started

### For Developers

```bash
# Explore repositories
git clone https://github.com/framersai/codex.git
git clone https://github.com/framersai/openstrand.git

# Install SDK
npm install @framersai/sdk
```

### For Organizations

Contact team@frame.dev for:

- Enterprise deployments
- Custom integrations
- Partnership opportunities

## Documentation

- [Architecture](./architecture.md) - Technical design
- [Roadmap](./roadmap.md) - Development plans
- [API Reference](../api/README.md) - Integration guides

## Ecosystem Structure

```
Frame.dev (Infrastructure)
├── Frame Codex (Knowledge Database)
├── OpenStrand (Personal Knowledge Management)
└── Frame OS (Agent Infrastructure - Coming)
```

## Links

- Website: [frame.dev](https://frame.dev)
- GitHub: [github.com/framersai](https://github.com/framersai)
- Contact: team@frame.dev
