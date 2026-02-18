# Frame Codex FAQ

> Frequently asked questions about Frame Codex - the knowledge infrastructure for AI and humans

---

## What is Frame Codex?

**Frame Codex** is an AI-native knowledge management system and documentation viewer built for the Frame.dev ecosystem. It provides:

- **Knowledge hierarchy**: Fabric → Weave → Loom → Strand organization
- **Semantic search**: AI-powered search using embeddings
- **Client-side processing**: All AI runs in your browser - no server required
- **Beautiful reading experience**: Multiple themes, typography, and accessibility features

---

## Core Concepts

### What is a Strand?

A **Strand** is the atomic unit of knowledge in Frame Codex. It can be:

1. **File-Strand**: A single markdown file with YAML frontmatter
2. **Folder-Strand**: A directory with `strand.yml` containing related files

Every strand has:

- A unique ID (UUID)
- A URL-safe slug
- A title and version
- Content type (lesson, reference, exercise, etc.)

### What is a Loom?

A **Loom** is a collection of related strands organized as a subdirectory. Think of it as a chapter or module that groups related knowledge together.

### What is a Weave?

A **Weave** is a top-level universe or domain of knowledge (e.g., `weaves/technology/`, `weaves/science/`). It's the broadest organizational level.

### What is Fabric?

The **Fabric** is the entire repository - the complete knowledge base containing all weaves, looms, and strands.

---

## Taxonomy & Classification

### What's the difference between Subjects, Topics, and Tags?

| Level        | Scope       | Example                                 | Purpose                              |
| ------------ | ----------- | --------------------------------------- | ------------------------------------ |
| **Subjects** | Generalized | "Technology", "Science"                 | High-level domain classification     |
| **Topics**   | Specific    | "Machine Learning", "Quantum Computing" | More targeted categorization         |
| **Tags**     | Detailed    | "neural-networks", "backpropagation"    | Fine-grained filtering and discovery |

- **Subjects** are the broadest categorization
- **Topics** narrow down within subjects
- **Tags** are the most specific, useful for detailed filtering

### Do blocks have their own tags?

Yes! Block-level tagging is supported. Individual sections (headings, code blocks, etc.) can have their own tags for granular knowledge retrieval. However:

- **Documents** can have subjects, topics, AND tags
- **Blocks** only have tags (they inherit subject/topic from their parent document)

---

## Search & Discovery

### How does semantic search work?

Frame Codex uses **client-side semantic search** powered by:

1. **Pre-computed embeddings**: Document vectors generated at build time
2. **Runtime query embedding**: Your searches are vectorized in-browser
3. **Cosine similarity**: Finding conceptually related content

The search runs entirely in your browser using:

- ONNX Runtime Web (WebGPU/WASM)
- Transformers.js as fallback
- Lexical search (BM25) as final fallback

### What if semantic search doesn't work?

The system gracefully degrades:

1. Try WebGPU (fastest, requires modern browser)
2. Fall back to WASM-SIMD
3. Fall back to Transformers.js
4. Fall back to keyword-only (lexical) search

You'll always get search results - just with varying quality.

---

## UI & Features

### What themes are available?

- **Light**: Clean white background
- **Dark**: Dark mode for low-light environments
- **Sepia Light**: Warm paper-like reading experience
- **Sepia Dark**: Dark mode with warm tones

All themes affect the entire viewer - content, sidebars, and panels.

### How do I navigate the document?

- **Left sidebar**: Knowledge tree, outline (TOC), tags browser
- **Right sidebar**: Metadata, reader mode, export options
- **Breadcrumbs**: Click any level to navigate up
- **Internal links**: Click wiki-style links to navigate between strands

### What keyboard shortcuts are available?

| Shortcut | Action                |
| -------- | --------------------- |
| `/`      | Focus search          |
| `m`      | Toggle metadata panel |
| `s`      | Toggle left sidebar   |
| `b`      | Toggle bookmark       |
| `e`      | Edit current strand   |
| `q`      | Open Q&A interface    |
| `?`      | Show all shortcuts    |
| `Esc`    | Close modals/panels   |

### How do bookmarks work?

Bookmarks are stored locally in your browser. You can:

- Bookmark any strand with `b` or the bookmark button
- View bookmarks from the sidebar menu
- Bookmarks persist across sessions

---

## Reader Mode & Summaries

### What is Reader Mode?

Reader Mode shows **extractive summaries** of your document:

- **Paragraph summaries**: Key sentences from each paragraph
- **Block summaries**: Summaries of headings, code blocks, lists
- **AI summaries**: (When available) AI-generated abstractive summaries

### How are summaries generated?

1. **Extractive summaries**: Generated during indexing using NLP techniques
2. **AI summaries**: Optionally generated using LLM enhancement
3. **Pre-computed**: Built at deploy time for fast access

### What are illustrations in Reader Mode?

Illustrations are images linked to specific blocks. When a block has an associated illustration, it appears alongside the summary. Configure these in `strand.yml`:

```yaml
blockSummaries:
  - blockId: 'intro-section'
    illustrations:
      - id: 'diagram-1'
        src: 'images/diagram.svg'
        showForBlock: true
```

---

## Contributing & Editing

### How do I contribute a new strand?

1. Click **Contribute** in the toolbar
2. Choose to upload or create from scratch
3. Fill in metadata (title, tags, subjects, topics)
4. Preview your content
5. Submit via GitHub (requires authentication)

### Can I edit existing strands?

Yes! Click **Edit** (or press `e`) to open the editor. Changes create a pull request on GitHub.

### What file formats are supported?

- **Markdown** (`.md`): Primary format
- **MDX** (`.mdx`): Markdown with React components
- Images: PNG, JPG, SVG, WebP, GIF
- Data: JSON, YAML for metadata and configurations

---

## Export & Sharing

### How do I export content?

The right sidebar's **Card** tab offers export options:

- **Copy as text**: Plain text format
- **Copy as JSON**: Structured metadata
- **Copy as Markdown**: With frontmatter
- **Download**: As JSON file
- **Print**: As index cards or full pages

### Can I print index cards?

Yes! The Card tab generates print-ready index cards with:

- Title and key information
- Summary (front)
- Detailed metadata (back)
- Optimized for standard card sizes

---

## Technical Details

### Does this require a server?

**No!** Frame Codex is 100% client-side:

- Static files hosted on GitHub Pages
- AI models run in WebAssembly
- Search indexes pre-computed at build
- All data processing happens in your browser

### What browsers are supported?

- **Chrome 113+**: Full WebGPU support
- **Firefox**: WASM-SIMD support
- **Safari 17+**: WebGPU support
- **Edge**: Same as Chrome

For best performance, use Chrome or Edge with a GPU.

### Is my data private?

**Yes!** Since everything runs client-side:

- Your searches never leave your device
- No analytics on query content
- No server-side logging
- Works completely offline after initial load

---

## Troubleshooting

### Search is slow or not working

1. Wait for model download (first visit takes 5-30s)
2. Check browser console for errors
3. Try a different browser
4. Refresh the page

### Content not loading

1. Check your internet connection
2. Verify GitHub API rate limits
3. Try clearing browser cache
4. Check if repository is accessible

### Theme not applying everywhere

Ensure you're using the theme selector in preferences (`Cmd/Ctrl + ,`). Some components may need a page refresh.

---

## Getting Help

- **Documentation**: Visit `/codex/landing` for full docs
- **GitHub Issues**: Report bugs at [@framersai](https://github.com/framersai)
- **Keyboard Shortcuts**: Press `?` anywhere
- **Help Panel**: Click Help in the sidebar menu

---

_Last updated: December 2024_
