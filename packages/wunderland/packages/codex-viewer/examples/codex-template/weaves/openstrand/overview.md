---
title: "OpenStrand Overview"
tags: ["openstrand", "schema", "os-for-humans"]
publishing:
  status: published
summary: "What OpenStrand is, why it exists, and how strands, looms, and weaves map to the analog OS."
---

# OpenStrand Overview

OpenStrand is the shared schema that powers Frame Codex—a hierarchy built for humans but optimized for machines. It treats knowledge as a fabric:

- **Fabric** – the entire repository (`weaves/`)
- **Weave** – a self-contained universe (for example, this `openstrand/` weave)
- **Loom** – curated topic folder inside a weave (`schema/`, `playbooks/`, etc.)
- **Strand** – atomic markdown file

The goal: ship knowledge that feels like a handcrafted book yet remains machine-readable, versioned, and searchable like Wikipedia.

## Design principles

1. **Deterministic structure** – predictable paths ensure every strand has a stable URL and metadata envelope.
2. **Frontmatter-first** – YAML metadata becomes API-friendly tags and surfaces in the Codex viewer.
3. **Privacy by default** – bookmarks/history live locally; analytics are optional and anonymized.
4. **Shared theming** – Frame.dev and the Codex viewer use the same Tailwind preset, so your knowledge base inherits the analog look instantly.

Want to go deeper? Open the `schema/` loom for specifications or the `playbooks/` loom for practical how-to guides. The same content is documented on [frame.dev/codex](https://frame.dev/codex) but mirrored here so your template repo doubles as living docs.

