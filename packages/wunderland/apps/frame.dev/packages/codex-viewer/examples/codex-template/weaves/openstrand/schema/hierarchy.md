---
title: "Hierarchy & Vocabulary"
tags: ["schema", "hierarchy", "architecture", "knowledge-graph"]
publishing:
  status: published
summary: "Complete guide to OpenStrand hierarchical organization: Fabric, Weave, Loom, and Strand."
---

OpenStrand organizes knowledge into a four-tier hierarchy that mirrors how humans naturally think about information—from broad domains down to atomic concepts:

```
WEAVE (Knowledge Universe)
└── LOOM (Topic Collection)
    └── STRAND (Atomic Knowledge Unit)
```

| Layer | Description | Example |
| ----- | ----------- | ------- |
| **Weave** | Complete, self-contained universe of strands. No cross-weave dependencies. | `weaves/openstrand` |
| **Loom** | Curated folder inside a weave. Groups strands by topic or workflow. | `weaves/openstrand/schema` |
| **Strand** | Individual markdown file with YAML frontmatter metadata. | `weaves/openstrand/schema/hierarchy.md` |

### Node levels surfaced in the viewer

The Codex viewer reads this hierarchy directly from GitHub and applies level-specific styling (fabric/weave/loom/strand) so humans can instantly see where they are. Metadata such as `tags`, `taxonomy`, or `publishing.status` flows into the sidebar and search filters.

### Schema goals

1. **Nesting without magic** – folders on disk are the schema; no hidden database.
2. **Frontmatter as API** – every strand’s YAML block becomes structured data for search, analytics, and embeddings.
3. **Machine-friendly URLs** – `https://frame.dev/codex?path=weaves/openstrand&file=schema/hierarchy.md`

For practical authoring tips see the `playbooks/indexing.md` strand.


---

## Why This Hierarchy Matters

### For Semantic Search

Each layer provides different search scopes:
- **Fabric-level:** Search across all knowledge
- **Weave-level:** Search within a domain
- **Loom-level:** Search within a topic
- **Strand-level:** Search within a document

### For AI Traversal

The hierarchy tells AI agents how to navigate:
1. **Breadth-first:** Explore Looms in order
2. **Depth-first:** Dive into prerequisites before moving on
3. **Prerequisite-ordered:** Follow relationship chains

### For Knowledge Graphs

The hierarchy maps to graph structures:
- **Strands** → Nodes
- **Relationships** → Edges
- **Looms** → Clusters
- **Weaves** → Subgraphs

---

## The Value of Structured Knowledge

| Use Case | Benefit |
|----------|---------|
| **Personal notes** | Semantic search finds related content by meaning, not keywords |
| **Team documentation** | AI agents answer questions with sourced citations |
| **Learning paths** | Prerequisite relationships create guided curricula |
| **Knowledge bases** | Graph visualization reveals hidden connections |

---

## Next Steps

- **[metadata.md](metadata.md)** — Complete frontmatter schema reference
- **[../playbooks/indexing.md](../playbooks/indexing.md)** — How to index your knowledge
- **[../overview.md](../overview.md)** — OpenStrand overview and value proposition
