# Frame.dev Wiki

_The OS for humans, the codex of humanity._

**AI Infrastructure for Knowledge and Superintelligence.**

Documentation for Frame.dev ecosystem components.

## Navigation

- [Quarry](./quarry/README.md) - AI infrastructure platform
- [Frame Codex](./codex/README.md) - Knowledge repository for LLMs
- [OpenStrand](./openstrand/README.md) - Personal knowledge management system
- [API Reference](./api/README.md) - Integration documentation

## Overview

Frame.dev builds infrastructure for AI-powered knowledge management. The ecosystem includes:

### Quarry

Personal knowledge management system built on Frame.dev infrastructure. Local-first architecture with AI integration, E2E encryption, and zero-knowledge sync.

### Frame Codex

Open-source repository containing structured knowledge optimized for LLM retrieval. Data-only repository consumed by Frame.dev and other applications.

### OpenStrand

The schema and data format standard for Quarry. Defines the Fabric → Weave → Loom → Strand hierarchy for structured knowledge organization.

## Integration

- Frame Codex provides the knowledge base
- OpenStrand adds AI functionality on top of the Codex
- Frame.dev infrastructure connects the ecosystem

## Quick Start

```bash
# Clone Frame Codex
git clone https://github.com/framersai/codex.git

# Explore OpenStrand
git clone https://github.com/framersai/openstrand.git
```

## Documentation Structure

```
wiki/
├── README.md                 # This file
├── quarry/                   # Quarry documentation
│   ├── README.md
│   ├── architecture.md
│   ├── local-first-sync-architecture.md
│   └── roadmap.md
├── codex/                    # Frame Codex documentation
│   ├── README.md
│   ├── schema.md
│   ├── api.md
│   └── contributing.md
├── openstrand/              # OpenStrand documentation
│   ├── README.md
│   ├── architecture.md
│   ├── features.md
│   └── api.md
└── api/                     # API documentation
    ├── README.md
    ├── authentication.md
    └── examples.md
```
