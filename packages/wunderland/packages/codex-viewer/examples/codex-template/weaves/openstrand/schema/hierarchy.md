---
title: 'Hierarchy & Vocabulary'
tags: ['schema', 'hierarchy']
publishing:
  status: published
---

OpenStrand organizes knowledge into **four named layers**:

```
FABRIC (Knowledge Repository)
└── WEAVE (Knowledge Universe)
└── LOOM (Topic Collection)
    └── STRAND (Atomic Knowledge Unit)
```

| Layer      | Description                                                                | Example                                 |
| ---------- | -------------------------------------------------------------------------- | --------------------------------------- |
| **Fabric** | The entire repository/collection of weaves. The root container.            | `framersai/codex`                       |
| **Weave**  | Complete, self-contained universe of strands. No cross-weave dependencies. | `weaves/openstrand`                     |
| **Loom**   | Curated folder inside a weave. Groups strands by topic or workflow.        | `weaves/openstrand/schema`              |
| **Strand** | Individual markdown file with YAML frontmatter metadata.                   | `weaves/openstrand/schema/hierarchy.md` |

### Visual encoding in the viewer

The Codex viewer applies **level-specific styling** with distinct colors:

| Level  | Color         | Icon       | Size    |
| ------ | ------------- | ---------- | ------- |
| Fabric | Zinc/Gray     | Repository | Largest |
| Weave  | Amber/Gold    | Folder     | Large   |
| Loom   | Cyan/Blue     | Subfolder  | Medium  |
| Strand | Violet/Purple | Document   | Small   |

### Graph visualization

The [Knowledge Graph](/codex/graph) displays the full hierarchy:

- **Fabric view**: See all weaves at a glance
- **Weave view**: Drill into looms and top-level strands
- **Loom view**: Explore strands within a topic
- **Strand relations**: Prerequisites, references, and tags

### Schema goals

1. **Nesting without magic** – folders on disk are the schema; no hidden database.
2. **Frontmatter as API** – every strand's YAML block becomes structured data for search, analytics, and embeddings.
3. **Machine-friendly URLs** – `https://frame.dev/codex?path=weaves/openstrand&file=schema/hierarchy.md`
4. **Graph-ready** – hierarchy naturally maps to force-directed graph nodes and edges.

For practical authoring tips see the `playbooks/indexing.md` strand.
