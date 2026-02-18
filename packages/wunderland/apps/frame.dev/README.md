<div align="center">
  <img src="public/frame-logo-no-subtitle.svg" alt="Frame.dev" width="200" />

# Frame.dev

**AI Infrastructure for Knowledge**

*The OS for humans, the codex of humanity.*

[Frame.dev](https://frame.dev) • [OpenStrand](https://openstrand.ai) • [Documentation](../../wiki/quarry/README.md)

**AI Infrastructure for Superintelligence.**

[![Tests](https://img.shields.io/badge/tests-11%2C693_passing-brightgreen?style=flat-square&logo=vitest&logoColor=white)](https://github.com/framersai/codex)
[![Coverage](https://img.shields.io/badge/coverage-40%25-yellowgreen?style=flat-square&logo=codecov&logoColor=white)](https://github.com/framersai/codex)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

[![E2E Encrypted](https://img.shields.io/badge/E2E_Encrypted-AES--256--GCM-00C853?style=flat-square&logo=shield&logoColor=white)](docs/SECURITY.md)
[![Zero Knowledge](https://img.shields.io/badge/Zero_Knowledge-Device_Local-7C4DFF?style=flat-square&logo=lock&logoColor=white)](docs/SECURITY.md)
[![Local First](https://img.shields.io/badge/Local_First-Offline_Ready-FF6D00?style=flat-square&logo=database&logoColor=white)](wiki/quarry/local-first-sync-architecture.md)

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/framersai/codex/pulls)
[![Issues](https://img.shields.io/badge/issues-welcome-blue?style=flat-square&logo=github)](https://github.com/framersai/codex/issues)
[![Discord](https://img.shields.io/badge/Discord-join_us-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/framedev)

</div>

---

## 🎯 Overview

Frame.dev is the homepage and central hub for the Frame ecosystem - building AI infrastructure for knowledge management. This Next.js application showcases our products and provides access to:

- **[Quarry](https://frame.dev/quarry)** - AI-native personal knowledge management system
- **[Quarry Codex](https://frame.dev/codex)** - The codex of humanity for LLM knowledge retrieval
- **[OpenStrand](https://openstrand.ai)** - AI-native personal knowledge management system
- **[AgentOS](https://agentos.sh)** - Adaptive agent platform
- **Additional Frame OS Products** - WebOS, HomeOS, SafeOS, WorkOS, MyOS

## 🚀 Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
# Visit http://localhost:3000

# Build for production
pnpm build

# Start production server
pnpm start

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Update README badges with current test count and coverage
pnpm test:badges
```

## 🏗️ Architecture

Built with:
- **Next.js 14** - App Router for optimal performance
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Paper-inspired design** - Clean, minimal aesthetic

## ✨ Features

- **Product Showcase** - Interactive OS product cards with detailed information
- **Quarry Viewer** - Built-in browser for the knowledge repository
- **OpenStrand Integration** - Seamless connection to the PKMS
- **Multi-Provider LLM** - 5 AI providers: Claude, GPT, OpenRouter, Mistral & Ollama (local)
- **BYOK Support** - Bring Your Own Key with automatic fallback and provider prioritization
- **Plugin System** - Extensible architecture with community plugins
- **Responsive Design** - Beautiful on all devices
- **Dark Mode** - Automatic theme switching

### 📓 Supernotes: Zettelkasten-Style Index Cards

Quarry supports **dual writing modes** for different knowledge capture needs:

- **Long-form Strands** - Full articles, guides, and documentation
- **Supernotes** - Compact notecards for quick ideas, tasks, and atomic concepts

**Why Supernotes?**
- 🗂️ **Zettelkasten method** - One idea per note, heavily linked
- 🏷️ **Required Supertags** - Structured data with `#task`, `#idea`, `#book`, etc.
- 🎨 **Visual Styling** - Index card appearance with corner fold, paper texture
- 🖼️ **Canvas Integration** - Drag supernotes onto infinite canvas for spatial thinking
- 🔍 **Filterable** - Find all supernotes by type, supertag, or status

See the [Supernotes Guide](docs/SUPERNOTES_GUIDE.md) for detailed documentation.

### 📂 Collections: Cross-Cutting Organization

Collections provide flexible, cross-cutting organization for your strands:

- **Visual Bento Grid** - Beautiful card layouts with generated SVG covers
- **10 Cover Patterns** - Geometric, waves, aurora, circuits, constellation, and more
- **Cross-Weave Grouping** - Add any strand from any weave to any collection
- **Pin Favorites** - Quick access to your most important collections
- **Connection Discovery** - Auto-detect related strands via shared tags and topics

**Use Cases:**
- Project collections spanning multiple looms
- Research compilations from various sources
- Thematic groupings across your knowledge base
- Temporary collections for presentations or reviews

See the [Collections Guide](docs/COLLECTIONS_GUIDE.md) for detailed documentation.

### 📝 Dynamic Documents (Embark-inspired)

Quarry implements the [Embark: Dynamic Documents as Personal Software](https://www.inkandswitch.com/embark/) paradigm from Ink & Switch:

- **@Mentions** - Reference places, dates, people, and documents inline with auto-complete
- **Formulas** - Spreadsheet-like calculations: `=ADD(100, 200)`, `=WEATHER("Paris")`, `=ROUTE("NYC", "LA")`
- **Embeddable Views** - Inline maps, calendars, charts, tables, and lists that extract data from your mentions
- **AI Enrichment** - Client-side NLP suggests tags, categories, views, and related documents (100% local)

See the [Dynamic Documents Guide](docs/frame-architecture/DYNAMIC_DOCUMENTS_GUIDE.md) for detailed documentation.

### 🌙 Lifecycle Decay & Rituals

Quarry's knowledge management goes beyond static organization with **Lifecycle Decay**:

- **Natural Fading** - Notes transition through stages: Fresh → Active → Faded based on engagement
- **Nothing Lost** - Faded notes are never deleted, just quieter—resurface anytime with one click
- **Engagement Tracking** - Views, edits, and connections slow decay for valuable content
- **Resurface Suggestions** - AI identifies faded notes worth revisiting based on connections

**Rituals** are special habits that integrate with lifecycle:

- **Morning Setup** - Surface relevant notes, review fading content, set daily intentions
- **Evening Reflection** - Capture insights, mark notes as reviewed, form new connections
- **Configurable Thresholds** - Customize decay timing to match your workflow

See the [Lifecycle Decay Guide](docs/LIFECYCLE_DECAY_GUIDE.md) and [Habit Tracking Guide](docs/HABIT_TRACKING_GUIDE.md) for detailed documentation.

## 🔒 Deployment Configuration

### Public Access Mode (Experimental)

When deploying your Quarry instance for public access (e.g., sharing with a team or showcasing on the web), you can lock down plugin management to prevent visitors from modifying your configuration:

```bash
# In your .env.local file
NEXT_PUBLIC_PUBLIC_ACCESS=true
```

**What this does:**
- Hides the "Install Plugin" button from the UI
- Hides the "Uninstall" button on plugin cards
- Blocks plugin install/uninstall API calls
- Displays a banner indicating public access mode is active

**What remains available:**
- Users can still enable/disable installed plugins
- Users can configure plugin settings
- Users can browse and view plugin information

This is a **developer/experimental feature** designed for convenience when sharing your Quarry instance. For full security, combine with proper authentication and device-level access controls.

See [ENV_VARS.md](ENV_VARS.md) for complete environment variable documentation.

## 📁 Project Structure

```
apps/frame.dev/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Homepage
│   ├── codex/            # Codex viewer page
│   └── layout.tsx        # Root layout
├── components/            # React components
│   ├── window-frame.tsx  # OS product showcase
│   ├── openstrand-popover.tsx
│   ├── quarry-codex-banner.tsx
│   └── quarry-codex-viewer.tsx
├── public/               # Static assets
└── styles/              # Global styles
```

## 🔗 Links

- **Production**: [frame.dev](https://frame.dev)
- **Quarry**: [frame.dev/quarry](https://frame.dev/quarry)
- **Quarry Codex**: [frame.dev/codex](https://frame.dev/codex)
- **Quarry Plugins**: [github.com/framersai/quarry-plugins](https://github.com/framersai/quarry-plugins)
- **OpenStrand**: [openstrand.ai](https://openstrand.ai)
- **AgentOS**: [agentos.sh](https://agentos.sh)
- **GitHub**: [@framersai](https://github.com/framersai)
- **Twitter**: [@framersai](https://twitter.com/framersai)
- **Contact**: [team@frame.dev](mailto:team@frame.dev)

## 🤝 Contributing

See the [main repository README](../../README.md) for contribution guidelines.

## 📄 License

This project is part of the Frame.dev private repository. See the [main LICENSE](../../LICENSE) file for details.

---

<div align="center">
  <br/>
  <p>
    <a href="https://frame.dev">Frame.dev</a> •
    <a href="https://frame.dev/quarry">Quarry</a> •
    <a href="https://frame.dev/codex">Quarry Codex</a> •
    <a href="https://openstrand.ai">OpenStrand</a>
  </p>
  <p>
    <a href="https://github.com/framersai">GitHub</a> •
    <a href="https://discord.gg/framedev">Discord</a>
  </p>
  <br/>
  <sub>Building the future of knowledge infrastructure</sub>
</div>