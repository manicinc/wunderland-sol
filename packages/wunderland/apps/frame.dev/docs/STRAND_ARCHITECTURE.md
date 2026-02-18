# Strand Architecture

> Comprehensive guide to the OpenStrand knowledge hierarchy and the dual nature of Strands.

## Overview

In Quarry Codex, knowledge is organized hierarchically:

```
Fabric (entire repository)
└── Weave (top-level universe, e.g., weaves/technology/)
    └── Loom (subdirectory/module)
        └── Strand (atomic knowledge unit)
```

**Critical Concept**: A **Strand** is the atomic unit of knowledge. It can be:

1. **File-Strand**: A single markdown file with YAML frontmatter
2. **Folder-Strand**: A directory containing a `strand.yml` schema with multiple related files
3. **Supernote**: A compact notecard-style strand with required supertag (see [Supernotes Guide](./SUPERNOTES_GUIDE.md))

## Strand Types

### File-Strand (Traditional)

A single markdown file with frontmatter metadata:

```markdown
---
id: 550e8400-e29b-41d4-a716-446655440000
slug: introduction-to-react
title: Introduction to React
version: 1.0.0
contentType: lesson
---

# Introduction to React

Content here...
```

**Characteristics:**
- Single `.md` or `.mdx` file
- Frontmatter contains schema
- Self-contained knowledge unit

### Folder-Strand (Collection)

A directory with `strand.yml` that groups related files:

```
my-react-guide/
├── strand.yml          # REQUIRED: Schema definition
├── index.md            # Entry file
├── images/
│   ├── component-lifecycle.svg
│   └── hooks-diagram.png
├── notes/
│   ├── draft-notes.md
│   └── research.md
├── examples/
│   └── code-samples.md
└── data/
    └── benchmarks.json
```

**strand.yml:**
```yaml
id: 550e8400-e29b-41d4-a716-446655440001
slug: comprehensive-react-guide
title: Comprehensive React Guide
version: 1.0.0
strandType: folder
contentType: collection
entryFile: index.md

includes:
  content:
    - index.md
    - examples/code-samples.md
  images:
    - images/*.svg
    - images/*.png
  notes:
    - notes/*.md
  data:
    - data/benchmarks.json

excludes:
  - "*.draft.md"
  - "_*"

tags:
  - react
  - frontend
  - comprehensive
```

**Characteristics:**
- Directory with `strand.yml` or `strand.yaml`
- All files in directory belong to the strand
- Can include: content, images, media, data, notes
- Entry file is the main content (usually `index.md`)

### Supernote (Index Card)

A compact, structured notecard with required supertag:

```markdown
---
id: 550e8400-e29b-41d4-a716-446655440002
slug: quick-meeting-note
title: Quick Meeting Note
version: 1.0.0
strandType: supernote
supernote:
  primarySupertag: meeting
  cardSize: 3x5
  hasCornerFold: true
  texture: paper
tags:
  - meetings
  - project-alpha
---

# Quick Meeting Note

Discussed project timeline and assigned tasks.
```

**Characteristics:**
- Single `.md` file with `strandType: supernote`
- **Required**: `primarySupertag` in supernote config
- Compact content (one idea per note)
- Visual notecard styling on canvas/views
- Zettelkasten-compatible atomic notes

**Use supernotes when:**
- Capturing quick ideas or tasks
- Building a linked knowledge network
- Creating structured notes with supertag fields
- Index card style organization

See [Supernotes Guide](./SUPERNOTES_GUIDE.md) for complete documentation.

## Detection Rules

### How the Indexer Determines Strand Type

```
Is it a directory?
├── YES → Does it contain strand.yml?
│   ├── YES → It's a FOLDER-STRAND
│   └── NO  → It's a LOOM (or folder)
└── NO → Is it a .md/.mdx file?
    ├── YES → Check frontmatter strandType
    │   ├── strandType: supernote → It's a SUPERNOTE
    │   └── otherwise → It's a FILE-STRAND
    └── NO  → It's a regular file
```

**Key Rules:**
- A subfolder becomes a Strand (instead of a Loom) when it contains `strand.yml` or `strand.yaml`
- A markdown file becomes a Supernote when `strandType: supernote` and has a valid `primarySupertag`

### Required Schema Fields

Both file and folder strands MUST have:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier |
| `slug` | string | URL-safe slug (lowercase, hyphens) |
| `title` | string | Display title |
| `version` | string | Semantic version (x.y.z) |
| `contentType` | enum | Type of content |

**Valid contentType values:**
- `lesson` - Teaching material
- `reference` - Reference documentation
- `exercise` - Practice exercises
- `assessment` - Tests/quizzes
- `project` - Project-based learning
- `discussion` - Discussion topics
- `resource` - Additional resources
- `collection` - **Recommended for folder-strands**

## Folder-Strand Features

### File Categorization

Files are automatically categorized by extension:

| Category | Extensions |
|----------|------------|
| `content` | .md, .mdx, .markdown |
| `images` | .png, .jpg, .jpeg, .gif, .webp, .svg, .avif |
| `media` | .mp4, .webm, .mp3, .wav, .ogg, .m4a |
| `data` | .json, .yaml, .yml, .csv, .tsv, .xml |
| `notes` | .txt, .note, *.notes.md |

### Explicit Includes

Override auto-detection with explicit includes:

```yaml
includes:
  content:
    - intro.md
    - chapters/*.md
  images:
    - diagrams/*.svg
  data:
    - metrics.json
```

### Exclude Patterns

Exclude files from the strand:

```yaml
excludes:
  - "*.draft.md"      # Draft files
  - "*.wip.*"         # Work in progress
  - "_*"              # Hidden files
  - "node_modules/**" # Dependencies
```

**Defaults:** `['*.draft.md', '*.wip.*', '_*']`

## Block-Level Integration

Folder-strands enable rich block-level features:

### Block-Level Tags

Individual sections can have their own tags:

```yaml
# In strand.yml
blockSummaries:
  - blockId: "intro-section"
    tags: ["introduction", "overview"]
  - blockId: "advanced-section"
    tags: ["advanced", "optimization"]
```

### Block-Level Illustrations

Images can be linked to specific blocks:

```yaml
blockSummaries:
  - blockId: "lifecycle-section"
    illustrations:
      - id: "lifecycle-diagram"
        src: "images/component-lifecycle.svg"
        showForBlock: true
```

### Block-Level Media References

YouTube, videos, and audio can be linked to blocks:

```yaml
blockSummaries:
  - blockId: "tutorial-section"
    mediaRefs:
      - id: "video-tutorial"
        type: youtube
        url: "https://youtube.com/watch?v=..."
        refType: supplementary
```

## Best Practices

### When to Use File-Strand

✅ **Use file-strand when:**
- Content is self-contained in one file
- No supplementary images/media needed
- Simple documentation pages
- Single-topic explanations

### When to Use Folder-Strand

✅ **Use folder-strand when:**
- Multiple related files needed
- Custom illustrations/diagrams included
- Supplementary notes or research
- Data files referenced in content
- Comprehensive guide with multiple sections
- Project-based content with code examples

### Naming Conventions

```
# File-strands
introduction-to-react.md
api-reference.md
getting-started-guide.md

# Folder-strands
comprehensive-react-guide/
  └── strand.yml
advanced-typescript-patterns/
  └── strand.yml
complete-testing-tutorial/
  └── strand.yml
```

### Schema Location

```
# File-strand: frontmatter
---
id: ...
slug: my-strand
title: My Strand
---

# Folder-strand: strand.yml
my-strand/
  └── strand.yml  # Schema here
```

## Visualization Integration

Folder-strands work with the visualization library:

```yaml
# In strand.yml
visualizations:
  style: tech-minimal
  diagrams:
    - preset: flowchart-process
      variables:
        title: "Component Lifecycle"
        steps: "Mount, Update, Unmount"
```

## Validation

The indexer validates:

1. **Required fields present** - id, slug, title, version, contentType
2. **ID format** - Must be valid UUID
3. **Slug format** - Lowercase alphanumeric with hyphens
4. **Version format** - Semantic versioning (x.y.z)
5. **Entry file exists** - For folder-strands

### Validation Errors

```
❌ Missing required field: title
❌ slug must be lowercase alphanumeric: "My-Strand"
❌ Folder-strand has no entry file
```

### Validation Warnings

```
⚠️ id should be a valid UUID
⚠️ Folder-strands typically use contentType: collection
⚠️ No images found in folder-strand
```

## API Reference

### Detection Functions

```typescript
import { 
  detectStrand, 
  detectStrandSync,
  collectFolderStrandFiles,
  validateStrandSchema,
  isDirectoryAStrand 
} from '@/lib/strand/detection'

// Async detection
const result = await detectStrand(path, fileExists, isDirectory)

// Sync detection (browser)
const result = detectStrandSync(path, allFiles)

// Collect folder-strand files
const files = collectFolderStrandFiles(folderPath, allFiles, includes, excludes)

// Validate schema
const validation = validateStrandSchema(schema, 'folder')

// Quick check
const isStrand = isDirectoryAStrand(dirPath, filesInDir)
```

### Detection Result

```typescript
interface StrandDetectionResult {
  isStrand: boolean
  strandType: 'file' | 'folder' | null
  schemaPath: string | null  // Path to frontmatter or strand.yml
  entryPath: string | null   // Main content file
  errors: string[]
  warnings: string[]
}
```

## Migration Guide

### Converting File-Strand to Folder-Strand

1. Create directory with same slug
2. Move markdown file to `index.md`
3. Create `strand.yml` with schema
4. Move frontmatter to `strand.yml`
5. Add `strandType: folder`
6. Add images, notes, etc.

**Before:**
```
my-guide.md
```

**After:**
```
my-guide/
├── strand.yml
├── index.md
└── images/
```

### Converting Loom to Folder-Strand

If a loom (subdirectory) should be a single strand:

1. Add `strand.yml` to the directory
2. Define all required fields
3. The directory becomes a strand
4. All files now belong to that strand

## Examples

### Minimal Folder-Strand

```
minimal-example/
├── strand.yml
└── index.md
```

```yaml
# strand.yml
id: 123e4567-e89b-12d3-a456-426614174000
slug: minimal-example
title: Minimal Folder-Strand Example
version: 1.0.0
strandType: folder
contentType: lesson
entryFile: index.md
```

### Full Folder-Strand

```
comprehensive-guide/
├── strand.yml
├── index.md
├── chapters/
│   ├── 01-introduction.md
│   ├── 02-basics.md
│   └── 03-advanced.md
├── images/
│   ├── architecture.svg
│   └── workflow.png
├── examples/
│   └── code-samples.md
├── notes/
│   └── research.md
└── data/
    └── benchmarks.json
```

```yaml
# strand.yml
id: 123e4567-e89b-12d3-a456-426614174001
slug: comprehensive-guide
title: Comprehensive Development Guide
version: 2.1.0
strandType: folder
contentType: collection
entryFile: index.md

includes:
  content:
    - index.md
    - chapters/*.md
    - examples/*.md
  images:
    - images/*
  notes:
    - notes/*.md
  data:
    - data/*.json

excludes:
  - "*.draft.md"

tags:
  - comprehensive
  - development
  - guide

taxonomy:
  subjects:
    - technology
    - software-development
  topics:
    - best-practices
    - architecture

relationships:
  - targetSlug: prerequisites-guide
    type: follows
    strength: 0.9

blockSummaries:
  - blockId: "architecture-section"
    tags: ["architecture", "design"]
    illustrations:
      - id: "arch-diagram"
        src: "images/architecture.svg"
        showForBlock: true

autoTagConfig:
  documentAutoTag: true
  blockAutoTag: true
  preferExistingTags: true
```

## Taxonomy Hierarchy

Strands use a three-level taxonomy system to organize knowledge:

### The Three Levels

| Level | Purpose | Per-Doc Limit | Example |
|-------|---------|---------------|---------|
| **Subjects** | Broad categories | 2 | `programming`, `design` |
| **Topics** | Specific domains | 5 | `react`, `machine-learning` |
| **Tags** | Granular concepts | 15 | `hooks`, `gradient-descent` |

### Schema Structure

```yaml
# In strand.yml or frontmatter
taxonomy:
  subjects:
    - programming
    - technology
  topics:
    - react
    - state-management

tags:
  - hooks
  - useEffect
  - useState
```

### Hierarchy Rules

1. **A term can only exist at one level** - If "react" is a topic, it can't also be a tag
2. **Subjects are broadest** - Think library sections: Programming, Design, Business
3. **Topics are mid-level** - Specific technologies or domains within subjects
4. **Tags are most specific** - Detailed concepts unique to the document

### Deduplication

The system uses NLP to detect duplicate/similar terms:

| Match Type | Example |
|------------|---------|
| Acronym | `AI` ↔ `artificial-intelligence` |
| Plural | `frameworks` ↔ `framework` |
| CamelCase | `MachineLearning` ↔ `machine-learning` |
| Typo | `typscript` ↔ `typescript` |
| Phonetic | `colour` ↔ `color` |

For complete taxonomy documentation, see [Taxonomy Guide](./TAXONOMY_GUIDE.md).

---

## Related Documentation

- [NLP Guide](./NLP_GUIDE.md) - Natural Language Processing
- [Taxonomy Guide](./TAXONOMY_GUIDE.md) - Taxonomy hierarchy and deduplication
- [Learning System](./LEARNING_SYSTEM_GUIDE.md) - Flashcards & quizzes
- [Block-Level Tagging](./BLOCK_LEVEL_TAGGING.md) - Section-level tags

## Overview

In Quarry Codex, knowledge is organized hierarchically:

```
Fabric (entire repository)
└── Weave (top-level universe, e.g., weaves/technology/)
    └── Loom (subdirectory/module)
        └── Strand (atomic knowledge unit)
```

**Critical Concept**: A **Strand** is the atomic unit of knowledge. It can be:

1. **File-Strand**: A single markdown file with YAML frontmatter
2. **Folder-Strand**: A directory containing a `strand.yml` schema with multiple related files
3. **Supernote**: A compact notecard-style strand with required supertag (see [Supernotes Guide](./SUPERNOTES_GUIDE.md))

## Strand Types

### File-Strand (Traditional)

A single markdown file with frontmatter metadata:

```markdown
---
id: 550e8400-e29b-41d4-a716-446655440000
slug: introduction-to-react
title: Introduction to React
version: 1.0.0
contentType: lesson
---

# Introduction to React

Content here...
```

**Characteristics:**
- Single `.md` or `.mdx` file
- Frontmatter contains schema
- Self-contained knowledge unit

### Folder-Strand (Collection)

A directory with `strand.yml` that groups related files:

```
my-react-guide/
├── strand.yml          # REQUIRED: Schema definition
├── index.md            # Entry file
├── images/
│   ├── component-lifecycle.svg
│   └── hooks-diagram.png
├── notes/
│   ├── draft-notes.md
│   └── research.md
├── examples/
│   └── code-samples.md
└── data/
    └── benchmarks.json
```

**strand.yml:**
```yaml
id: 550e8400-e29b-41d4-a716-446655440001
slug: comprehensive-react-guide
title: Comprehensive React Guide
version: 1.0.0
strandType: folder
contentType: collection
entryFile: index.md

includes:
  content:
    - index.md
    - examples/code-samples.md
  images:
    - images/*.svg
    - images/*.png
  notes:
    - notes/*.md
  data:
    - data/benchmarks.json

excludes:
  - "*.draft.md"
  - "_*"

tags:
  - react
  - frontend
  - comprehensive
```

**Characteristics:**
- Directory with `strand.yml` or `strand.yaml`
- All files in directory belong to the strand
- Can include: content, images, media, data, notes
- Entry file is the main content (usually `index.md`)

### Supernote (Index Card)

A compact, structured notecard with required supertag:

```markdown
---
id: 550e8400-e29b-41d4-a716-446655440002
slug: quick-meeting-note
title: Quick Meeting Note
version: 1.0.0
strandType: supernote
supernote:
  primarySupertag: meeting
  cardSize: 3x5
  hasCornerFold: true
  texture: paper
tags:
  - meetings
  - project-alpha
---

# Quick Meeting Note

Discussed project timeline and assigned tasks.
```

**Characteristics:**
- Single `.md` file with `strandType: supernote`
- **Required**: `primarySupertag` in supernote config
- Compact content (one idea per note)
- Visual notecard styling on canvas/views
- Zettelkasten-compatible atomic notes

**Use supernotes when:**
- Capturing quick ideas or tasks
- Building a linked knowledge network
- Creating structured notes with supertag fields
- Index card style organization

See [Supernotes Guide](./SUPERNOTES_GUIDE.md) for complete documentation.

## Detection Rules

### How the Indexer Determines Strand Type

```
Is it a directory?
├── YES → Does it contain strand.yml?
│   ├── YES → It's a FOLDER-STRAND
│   └── NO  → It's a LOOM (or folder)
└── NO → Is it a .md/.mdx file?
    ├── YES → Check frontmatter strandType
    │   ├── strandType: supernote → It's a SUPERNOTE
    │   └── otherwise → It's a FILE-STRAND
    └── NO  → It's a regular file
```

**Key Rules:**
- A subfolder becomes a Strand (instead of a Loom) when it contains `strand.yml` or `strand.yaml`
- A markdown file becomes a Supernote when `strandType: supernote` and has a valid `primarySupertag`

### Required Schema Fields

Both file and folder strands MUST have:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier |
| `slug` | string | URL-safe slug (lowercase, hyphens) |
| `title` | string | Display title |
| `version` | string | Semantic version (x.y.z) |
| `contentType` | enum | Type of content |

**Valid contentType values:**
- `lesson` - Teaching material
- `reference` - Reference documentation
- `exercise` - Practice exercises
- `assessment` - Tests/quizzes
- `project` - Project-based learning
- `discussion` - Discussion topics
- `resource` - Additional resources
- `collection` - **Recommended for folder-strands**

## Folder-Strand Features

### File Categorization

Files are automatically categorized by extension:

| Category | Extensions |
|----------|------------|
| `content` | .md, .mdx, .markdown |
| `images` | .png, .jpg, .jpeg, .gif, .webp, .svg, .avif |
| `media` | .mp4, .webm, .mp3, .wav, .ogg, .m4a |
| `data` | .json, .yaml, .yml, .csv, .tsv, .xml |
| `notes` | .txt, .note, *.notes.md |

### Explicit Includes

Override auto-detection with explicit includes:

```yaml
includes:
  content:
    - intro.md
    - chapters/*.md
  images:
    - diagrams/*.svg
  data:
    - metrics.json
```

### Exclude Patterns

Exclude files from the strand:

```yaml
excludes:
  - "*.draft.md"      # Draft files
  - "*.wip.*"         # Work in progress
  - "_*"              # Hidden files
  - "node_modules/**" # Dependencies
```

**Defaults:** `['*.draft.md', '*.wip.*', '_*']`

## Block-Level Integration

Folder-strands enable rich block-level features:

### Block-Level Tags

Individual sections can have their own tags:

```yaml
# In strand.yml
blockSummaries:
  - blockId: "intro-section"
    tags: ["introduction", "overview"]
  - blockId: "advanced-section"
    tags: ["advanced", "optimization"]
```

### Block-Level Illustrations

Images can be linked to specific blocks:

```yaml
blockSummaries:
  - blockId: "lifecycle-section"
    illustrations:
      - id: "lifecycle-diagram"
        src: "images/component-lifecycle.svg"
        showForBlock: true
```

### Block-Level Media References

YouTube, videos, and audio can be linked to blocks:

```yaml
blockSummaries:
  - blockId: "tutorial-section"
    mediaRefs:
      - id: "video-tutorial"
        type: youtube
        url: "https://youtube.com/watch?v=..."
        refType: supplementary
```

## Best Practices

### When to Use File-Strand

✅ **Use file-strand when:**
- Content is self-contained in one file
- No supplementary images/media needed
- Simple documentation pages
- Single-topic explanations

### When to Use Folder-Strand

✅ **Use folder-strand when:**
- Multiple related files needed
- Custom illustrations/diagrams included
- Supplementary notes or research
- Data files referenced in content
- Comprehensive guide with multiple sections
- Project-based content with code examples

### Naming Conventions

```
# File-strands
introduction-to-react.md
api-reference.md
getting-started-guide.md

# Folder-strands
comprehensive-react-guide/
  └── strand.yml
advanced-typescript-patterns/
  └── strand.yml
complete-testing-tutorial/
  └── strand.yml
```

### Schema Location

```
# File-strand: frontmatter
---
id: ...
slug: my-strand
title: My Strand
---

# Folder-strand: strand.yml
my-strand/
  └── strand.yml  # Schema here
```

## Visualization Integration

Folder-strands work with the visualization library:

```yaml
# In strand.yml
visualizations:
  style: tech-minimal
  diagrams:
    - preset: flowchart-process
      variables:
        title: "Component Lifecycle"
        steps: "Mount, Update, Unmount"
```

## Validation

The indexer validates:

1. **Required fields present** - id, slug, title, version, contentType
2. **ID format** - Must be valid UUID
3. **Slug format** - Lowercase alphanumeric with hyphens
4. **Version format** - Semantic versioning (x.y.z)
5. **Entry file exists** - For folder-strands

### Validation Errors

```
❌ Missing required field: title
❌ slug must be lowercase alphanumeric: "My-Strand"
❌ Folder-strand has no entry file
```

### Validation Warnings

```
⚠️ id should be a valid UUID
⚠️ Folder-strands typically use contentType: collection
⚠️ No images found in folder-strand
```

## API Reference

### Detection Functions

```typescript
import { 
  detectStrand, 
  detectStrandSync,
  collectFolderStrandFiles,
  validateStrandSchema,
  isDirectoryAStrand 
} from '@/lib/strand/detection'

// Async detection
const result = await detectStrand(path, fileExists, isDirectory)

// Sync detection (browser)
const result = detectStrandSync(path, allFiles)

// Collect folder-strand files
const files = collectFolderStrandFiles(folderPath, allFiles, includes, excludes)

// Validate schema
const validation = validateStrandSchema(schema, 'folder')

// Quick check
const isStrand = isDirectoryAStrand(dirPath, filesInDir)
```

### Detection Result

```typescript
interface StrandDetectionResult {
  isStrand: boolean
  strandType: 'file' | 'folder' | null
  schemaPath: string | null  // Path to frontmatter or strand.yml
  entryPath: string | null   // Main content file
  errors: string[]
  warnings: string[]
}
```

## Migration Guide

### Converting File-Strand to Folder-Strand

1. Create directory with same slug
2. Move markdown file to `index.md`
3. Create `strand.yml` with schema
4. Move frontmatter to `strand.yml`
5. Add `strandType: folder`
6. Add images, notes, etc.

**Before:**
```
my-guide.md
```

**After:**
```
my-guide/
├── strand.yml
├── index.md
└── images/
```

### Converting Loom to Folder-Strand

If a loom (subdirectory) should be a single strand:

1. Add `strand.yml` to the directory
2. Define all required fields
3. The directory becomes a strand
4. All files now belong to that strand

## Examples

### Minimal Folder-Strand

```
minimal-example/
├── strand.yml
└── index.md
```

```yaml
# strand.yml
id: 123e4567-e89b-12d3-a456-426614174000
slug: minimal-example
title: Minimal Folder-Strand Example
version: 1.0.0
strandType: folder
contentType: lesson
entryFile: index.md
```

### Full Folder-Strand

```
comprehensive-guide/
├── strand.yml
├── index.md
├── chapters/
│   ├── 01-introduction.md
│   ├── 02-basics.md
│   └── 03-advanced.md
├── images/
│   ├── architecture.svg
│   └── workflow.png
├── examples/
│   └── code-samples.md
├── notes/
│   └── research.md
└── data/
    └── benchmarks.json
```

```yaml
# strand.yml
id: 123e4567-e89b-12d3-a456-426614174001
slug: comprehensive-guide
title: Comprehensive Development Guide
version: 2.1.0
strandType: folder
contentType: collection
entryFile: index.md

includes:
  content:
    - index.md
    - chapters/*.md
    - examples/*.md
  images:
    - images/*
  notes:
    - notes/*.md
  data:
    - data/*.json

excludes:
  - "*.draft.md"

tags:
  - comprehensive
  - development
  - guide

taxonomy:
  subjects:
    - technology
    - software-development
  topics:
    - best-practices
    - architecture

relationships:
  - targetSlug: prerequisites-guide
    type: follows
    strength: 0.9

blockSummaries:
  - blockId: "architecture-section"
    tags: ["architecture", "design"]
    illustrations:
      - id: "arch-diagram"
        src: "images/architecture.svg"
        showForBlock: true

autoTagConfig:
  documentAutoTag: true
  blockAutoTag: true
  preferExistingTags: true
```








