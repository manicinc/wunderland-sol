---
title: "Indexing & Search"
tags: ["playbook", "search"]
publishing:
  status: published
---

The Codex viewer supports two search layers:

1. **Tree filter** – instant client-side filtering of names by prefix.
2. **Full-text + semantic search** – powered by a JSON index (`codex-index.json`) plus optional embeddings reranking.

### Recommended workflow

1. **Author strands** in `weaves/**`.
2. **Run the Codex indexer** (script lives in `apps/codex` of this monorepo) to emit the latest `codex-index.json`.
3. **Commit `codex-index.json`** alongside your content (or host it behind an API).
4. **Deploy** – the viewer fetches the index on load and caches strands in IndexedDB.

```bash
# inside the Frame.dev monorepo
pnpm --filter apps/codex run index
git add apps/codex/codex-index.json
git commit -m "docs: refresh codex index"
```

For lightweight personal deployments, you can skip the advanced index—the viewer still fetches raw markdown on demand. Indexing just enables semantic search, metadata summaries, and faster initial loads.

