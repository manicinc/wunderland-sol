# Quarry Codex Search Guide

## Overview

Quarry Codex now ships with a **two-layer search experience**:

1. **Sidebar Filtering** – Instant name/content filtering for the outline/tree.
2. **Advanced Search Overlay** – Ranked results using BM25 + optional semantic reranking.

Everything remains **100% client-side**: no servers, no API keys, no telemetry.

---

## 1. Sidebar Filtering (Outline / Tree)

- Driven by `useSearchFilter`.
- Filters the currently loaded directory + tree nodes.
- Options:
  - **Search names** (default ON)
  - **Full-text** (only cached files you opened)
  - **Case sensitive**
- Debounced 300ms to avoid thrash.
- Purpose: quick narrowing inside the sidebar while browsing.

Example:

```ts
const {
  options,
  setQuery,
  toggleSearchContent,
  filteredFiles,
} = useSearchFilter(files)
```

Limitations:

- Full-text scope only covers cached files (privacy + bandwidth reasons).
- Designed for navigation, not for ranked retrieval.

---

## 2. Advanced Search Overlay (BM25 + Semantic)

When you type a query, a results drawer appears under the toolbar. It uses precomputed data from `codex-search.json`.

### Data Pipeline

`apps/codex` ships a script:

```bash
npm run index         # builds codex-index.json
npm run build:search  # builds codex-search.json (BM25 + embeddings)
```

`codex-search.json` contains:

- **stats**: doc counts, avg length, vocabulary size
- **docs[]**: path, title, summary, weave, loom, docLength
- **vocabulary**: term → `[docId, termFrequency]`
- **embeddings**: base64 Float32Array (MiniLM-L6-v2, mean-pooled + normalized)

### BM25 Ranking

Implemented in `lib/search/bm25.ts`:

```ts
score = Σ idf(term) * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * docLength/avgDocLength))
```

- `k1 = 1.5`, `b = 0.75`.
- Query tokens → postings → accumulate scores → top 25 results.

### Semantic Rerank (Optional)

- Uses `@xenova/transformers` in the browser (ONNX WebAssembly).
- Model: `all-MiniLM-L6-v2` (downloaded once, cached in IndexedDB).
- Hybrid approach:
  1. BM25 → 25 candidates.
  2. Encode query vector on-device.
  3. Cosine similarity against precomputed doc embeddings.
  4. Combined score = `0.7 * semantic + 0.3 * normalized BM25`.
- Toggle button in the overlay enables/disables reranking.
- Falls back to BM25 if embeddings absent or model disabled.

### UI / UX

- **Overlay**: header shows query, result count, loading spinner.
- **Semantic toggle**: indicates availability (disabled if embeddings missing).
- **Scores**: BM25 and semantic badges per result.
- **Actions**: click row to open strand (keeps overlay open unless you clear).
- **Clear**: resets search (also clears sidebar filters).

---

## 3. Keyboard & Shortcuts

- `/` – focus sidebar search input.
- `Esc` – clear search + close overlay.
- `↑ / ↓` – navigate overlay results (coming soon).
- `Enter` – open highlighted result (coming soon).

---

## 4. Privacy & Performance

- All data stays inside the browser (IndexedDB + in-memory).
- `codex-search.json` + MiniLM model are static files served from GitHub Pages/CDN.
- Semantic model download happens only when you toggle “Semantic” for the first time.
- No telemetry, no cookies, no server calls beyond fetching static blobs.

---

## 5. NLP Integration

The search system now integrates with client-side NLP for enhanced discovery:

- **Entity Recognition**: Search results can be filtered by detected entities (languages, frameworks)
- **Content Classification**: Filter by content type (tutorial, reference, conceptual)
- **Reading Level**: Filter by difficulty (beginner, intermediate, advanced)
- **Auto-Tag Suggestions**: Search surfaces suggested tags based on content analysis

See [NLP_GUIDE.md](./NLP_GUIDE.md) for implementation details.

---

## 6. Future Enhancements

- [ ] Result highlighting / snippets.
- [x] ~~Filters (tags, difficulty, weave)~~ - ✅ Implemented via NLP
- [ ] Offline prefetch of `codex-search.json` via service worker.
- [ ] Progressive chunking for huge vocabularies.
- [ ] Voice / natural language query builder.
- [ ] Cross-strand relationship search
- [ ] Similar strands recommendation

No plans for:

- ❌ Hosted search APIs (privacy-first).
- ❌ Required API keys.
- ❌ Tracking/analytics.

---

## Related Guides

- [NLP Guide](./NLP_GUIDE.md) - Entity extraction and content analysis
- [Graph Visualization](./GRAPH_VISUALIZATION.md) - Visual exploration of search results
- [Main README](./README.md) - Component overview

---

Questions? Open an issue on [GitHub](https://github.com/framersai/frame.dev/issues) or join [Discord](https://discord.gg/VXXC4SJMKh).

