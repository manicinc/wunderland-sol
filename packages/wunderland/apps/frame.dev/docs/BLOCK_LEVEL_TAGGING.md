# Block-Level Tagging System

> **Phase 9 Feature** | Tana-inspired structured knowledge management at the block level

> **Interactive Tutorial Available!** 🎓
> Learn block tagging hands-on with our [guided tour](/codex?tutorial=block-tagging). The tutorial walks you through tagging blocks, using supertags, and querying your content.

The Block-Level Tagging System brings powerful structured data capabilities to Quarry Codex, allowing you to tag, query, and link individual blocks of content rather than just entire documents.

## Table of Contents

- [Overview](#overview)
- [Block Tags](#block-tags)
- [Supertags](#supertags)
- [Transclusion](#transclusion)
- [Query System](#query-system)
- [Query Examples & Templates](#query-examples--templates)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Settings](#settings)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

Traditional note-taking apps let you tag entire documents. Block-level tagging goes further—every paragraph, code block, heading, or list item can be individually tagged, linked, and queried.

### Key Features

| Feature | Description |
|---------|-------------|
| **Block Tags** | Apply tags to individual blocks within a document |
| **Supertags** | Structured tags with typed fields (like Tana) |
| **Transclusion** | Reference, embed, or mirror blocks across documents |
| **Query System** | Advanced search with boolean operators and field queries |
| **Backlinks** | See all references to any block |

---

## Block Tags

Tags can be applied to individual blocks using the tag syntax `#tag-name` inline or via the tag management panel.

### Hybrid Tagging System

The block tagging system supports **two complementary approaches** that work together:

| Approach | Source | Confidence | Description |
|----------|--------|------------|-------------|
| **Inline Tags** | `inline` | 100% | Explicit `#hashtag` in your markdown content |
| **Auto-Tags** | `nlp`/`llm` | 30-95% | Vocabulary matching, TF-IDF, AI suggestions |

**Inline tags take precedence** over automatic suggestions for the same tag. Both approaches can be used together—inline tags let you explicitly mark key concepts while the NLP pipeline fills in additional relevant tags.

### Adding Tags

There are multiple ways to add tags to blocks:

**1. Inline Syntax (Recommended):**
Write hashtags directly in your markdown content for 100% confidence tags:
```markdown
This is a paragraph about React hooks. #react #hooks #frontend
```

Inline tags are:
- Extracted with **100% confidence** (explicit user intent)
- Displayed with a **blue badge** in the UI
- Pattern: `#tag-name`, `#hierarchical/tag`, `#kebab-case-tag`

**2. Keyboard Shortcut:** `Cmd+T` to open the tag input for the current block.

**3. Selection Toolbar (NEW):**
When editing a block, select any text to reveal the floating toolbar. Click the **Tag icon** (🏷️) to open the Quick Tag Popover:

- The popover appears below your selection
- Type to search existing tags with autocomplete
- Press **Enter** to add the selected tag
- Create new tags by typing and pressing Enter
- Tags are applied to the containing block (not just the selected text)

> 💡 **Tip**: The selection toolbar is great for quickly tagging relevant passages while reading and editing content.

**4. Auto-Tagging (NLP + AI-Powered):**
Blocks are automatically tagged based on their content. The system uses:
- **Worthiness scoring**: Blocks are scored for significance (topic shift, entity density, semantic novelty)
- **NLP extraction**: Keywords, concepts, and entities are extracted automatically via vocabulary matching and TF-IDF
- **Confidence thresholds**: Only high-confidence tags are suggested
- **Tag suggestions**: Review and accept/reject suggestions in the Block Tags sidebar panel
- **AI enhancement** (optional): LLM-powered suggestions with chain-of-thought reasoning

### Tag Features

- **Auto-complete**: Type `#` to see tag suggestions based on existing tags
- **Hierarchical tags**: Use `/` for nested tags (e.g., `#programming/javascript`)
- **Tag colors**: Tags inherit colors from their supertag schema if defined

---

## Supertags

Supertags are tags with structured fields—turning simple tags into typed data schemas. Inspired by [Tana](https://tana.inc/).

### Built-in Supertag Schemas

| Schema | Icon | Fields |
|--------|------|--------|
| `#person` | User | name, role, company, email, phone, linkedin |
| `#task` | CheckSquare | title, status, priority, due_date, assignee, progress |
| `#meeting` | Calendar | title, date, attendees, location, agenda, notes |
| `#book` | Book | title, author, year, status, rating, notes |
| `#article` | FileText | title, author, source, date, summary |
| `#project` | Folder | name, status, progress, start_date, end_date, team |
| `#idea` | Lightbulb | title, category, status, related |
| `#question` | HelpCircle | question, answered, answer, source |
| `#decision` | GitBranch | title, date, context, outcome, stakeholders |
| `#event` | Calendar | name, date, location, attendees, description |

### Using Supertags

When you tag a block with a supertag (e.g., `#task`), the supertag editor appears allowing you to fill in structured fields:

```
#task status:in_progress priority:high due_date:2024-01-15
```

### Field Types

Supertags support these field types:

| Type | Description | Example |
|------|-------------|---------|
| `text` | Single-line text | Name, title |
| `textarea` | Multi-line text | Description, notes |
| `number` | Numeric value | Year, count |
| `date` | Date picker | Due date, start date |
| `datetime` | Date + time | Meeting time |
| `checkbox` | Boolean toggle | Completed, archived |
| `select` | Single choice | Status, priority |
| `multiselect` | Multiple choices | Tags, categories |
| `url` | Web link | Source URL, LinkedIn |
| `email` | Email address | Contact email |
| `phone` | Phone number | Contact phone |
| `rating` | 1-5 star rating | Book rating |
| `progress` | 0-100% slider | Task progress |
| `reference` | Link to another block | Related items |
| `tags` | Multiple tag references | Attendees |
| `image` | Image attachment | Cover image |
| `color` | Color picker | Category color |
| `formula` | Computed value | Calculated fields |

### Creating Custom Schemas

Use the Schema Designer (`Cmd+Shift+T` or Settings > Supertags) to create custom schemas:

1. Choose a tag name (e.g., `recipe`)
2. Select an icon and color
3. Add fields with types and validation
4. Save the schema

---

## Transclusion

Transclusion allows you to reference, embed, or mirror blocks from one location to another.

### Reference Syntax

| Syntax | Type | Description |
|--------|------|-------------|
| `[[strand#block-id]]` | Reference | Creates a link to the block |
| `![[strand#block-id]]` | Embed | Displays the block content inline |
| `^[[strand#block-id]]` | Citation | Shows as a citation with link |
| `=[[strand#block-id]]` | Mirror | Two-way sync (edits propagate) |

### Examples

**Reference (Link):**
```markdown
See [[react-hooks#custom-hooks-example]] for implementation details.
```

**Embed:**
```markdown
![[api-reference#authentication-flow]]
```
This will render the content of the `authentication-flow` block inline.

**Citation:**
```markdown
According to ^[[research-paper#conclusion]], the results were significant.
```

**Mirror (Bidirectional):**
```markdown
=[[project-status#current-blockers]]
```
Changes to this block will update the original, and vice versa.

### Backlinks Panel

Every block shows its backlinks—all places that reference it. Open with `Cmd+B` or click the backlink indicator.

---

## Query System

The query system provides powerful structured search capabilities.

### Basic Queries

| Query | Description |
|-------|-------------|
| `react` | Full-text search for "react" |
| `"react hooks"` | Exact phrase search |
| `#typescript` | Blocks tagged with typescript |
| `-#draft` | Exclude blocks tagged draft |

### Field Queries

| Query | Description |
|-------|-------------|
| `weave:technology` | In the technology weave |
| `loom:programming` | In the programming loom |
| `type:code` | Code blocks only |
| `type:heading` | Headings only |
| `title:~react` | Title contains "react" |
| `word_count:>1000` | More than 1000 words |
| `created:>2024-01-01` | Created after date |
| `updated:<=2024-06-30` | Updated before date |

### Operators

| Operator | Syntax | Description |
|----------|--------|-------------|
| Equals | `field:value` | Exact match |
| Contains | `field:~value` | Contains substring |
| Greater than | `field:>value` | Numeric/date comparison |
| Less than | `field:<value` | Numeric/date comparison |
| Greater or equal | `field:>=value` | Comparison |
| Less or equal | `field:<=value` | Comparison |
| Starts with | `field:^value` | Prefix match |
| Ends with | `field:$value` | Suffix match |

### Boolean Operators

```
react AND typescript        # Both terms
react OR vue                # Either term
NOT deprecated              # Exclude term
(react OR vue) AND frontend # Grouped expression
```

### Supertag Queries

Query supertag fields directly:

```
#task status:done                    # Completed tasks
#task status:done priority:high      # High priority completed tasks
#meeting date:>2024-01-01            # Meetings after date
#book rating:>=4                     # Books rated 4+ stars
```

### Sort and Pagination

```
react @sort:updated desc    # Sort by updated, descending
react @sort:created asc     # Sort by created, ascending
react @limit:20             # Limit to 20 results
react @offset:10            # Skip first 10 results
```

### Block-Level Queries

These queries target specific block types:

```
type:code language:typescript    # TypeScript code blocks
type:heading heading_level:>=2   # H2 and deeper headings
worthiness:>0.7                  # High-worthiness blocks
```

---

## Query Examples & Templates

### Quick Reference (Query Palette Hints)

Press **Tab** in the Quick Query Palette to see syntax hints. Click any hint to insert the example.

| Pattern | Description | Example |
|---------|-------------|---------|
| `#tag` | Filter by tag | `#typescript` |
| `-#tag` | Exclude tag | `-#draft` |
| `field:value` | Field query | `weave:technology` |
| `"exact"` | Exact phrase | `"react hooks"` |
| `type:block` | Content type | `type:code` |
| `AND/OR` | Boolean operators | `react AND hooks` |
| `@sort:field` | Sort results | `@sort:updated desc` |

### Common Query Templates

**Finding Content by Type:**
```
type:code                           # All code blocks
type:heading heading_level:2        # All H2 headings
type:blockquote                     # All blockquotes
type:table                          # All tables
```

**Tag-Based Queries:**
```
#react                              # Tagged with react
#react #typescript                  # Tagged with both (AND)
#react -#deprecated                 # React but not deprecated
#frontend OR #backend               # Either tag
```

**Field Queries:**
```
weave:technology                    # In technology weave
loom:programming                    # In programming loom
title:~hooks                        # Title contains "hooks"
word_count:>1000                    # Long documents
path:^docs/                         # Paths starting with docs/
```

**Date Filters:**
```
created:>2024-01-01                 # Created after date
updated:<=2024-06-30                # Updated before date
created:>2024-01-01 updated:<2024-12-31  # Date range
```

**Supertag Queries:**
```
#task status:todo                   # Pending tasks
#task status:done priority:high     # Completed high priority
#meeting date:>2024-01-01           # Upcoming meetings
#book rating:>=4 status:finished    # Highly rated books
#person company:~Google             # People at Google
```

**Complex Queries:**
```
# All TypeScript code blocks in technology weave
type:code #typescript weave:technology

# High-value recent content
worthiness:>0.7 updated:>2024-01-01 @sort:worthiness desc

# Questions that haven't been answered
#question answered:false

# Active projects with progress
#project status:active progress:<100

# Search across tags with boolean logic
(#react OR #vue) AND #frontend -#deprecated @sort:updated desc @limit:20
```

### Visual Query Builder

The Query Builder UI provides point-and-click query construction:

**Condition Types:**
| Type | Description | Icon |
|------|-------------|------|
| Text Search | Free text search | Search |
| Tag Filter | Include/exclude tags | Tag |
| Field Query | Query specific fields | Hash |
| Content Type | Filter by block type | FileText |
| Date Range | Filter by dates | Calendar |
| Supertag Query | Query supertag fields | Sparkles |

**Available Fields:**
- `title` - Document title
- `content` - Full content
- `summary` - Auto-generated summary
- `weave` - Parent weave
- `loom` - Parent loom
- `path` - Document path
- `difficulty` - Content difficulty
- `word_count` - Word count
- `worthiness` - AI-computed quality score
- `heading_level` - Heading depth (1-6)

**Sort Options:**
- Last Updated
- Created Date
- Title (alphabetical)
- Worthiness Score
- Word Count

### Saved & Pinned Queries

Save frequently used queries for quick access:

1. Build your query in the Query Builder
2. Click the **Save** button
3. Give it a name and optional description
4. Access from the Quick Query Palette

**Pinned queries** appear at the top of the palette for instant access. Pin queries from Settings > Query System > Saved Queries.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+P` | Open query palette |
| `Cmd+K` | Quick search |
| `Cmd+T` | Add tag to current block |
| `Cmd+Shift+T` | Add supertag to current block |
| `Cmd+B` | Open backlinks panel |
| `Cmd+\` | Toggle sidebar |
| `/` | Focus search (when not in input) |
| `Cmd+J` | Next search result |
| `Cmd+Shift+J` | Previous search result |

Shortcuts are customizable in Settings > Block Features > Shortcuts.

---

## Settings

Access block-level feature settings via the Settings panel or `Cmd+,`.

### Feature Toggles

- **Enable Block Tagging**: Turn block-level tagging on/off
- **Show Inline Fields**: Display supertag fields inline
- **Auto-suggest Tags**: Suggest tags while typing
- **Allow Custom Schemas**: Enable creating custom supertag schemas
- **Enable Transclusion**: Allow block references
- **Enable Backlinks**: Track and display backlinks
- **Enable Query System**: Enable advanced search

### Display Settings

- **Badge Mode**: Compact, expanded, or hidden
- **Field Display Limit**: Max fields to show inline
- **Backlink Display Limit**: Max backlinks to show
- **Transclusion Depth**: Max nesting for embeds

### Performance Settings

- **Cache TTL**: How long to cache query results
- **Max Cache Entries**: Maximum cached queries

---

## API Reference

### Block Database

```typescript
import { blockDatabase } from '@/lib/blockDatabase'

// Get block by ID
const block = await blockDatabase.getBlock('block-123')

// Get blocks for a strand
const blocks = await blockDatabase.getBlocksForStrand('strand-456')

// Save block with tags
await blockDatabase.saveBlock({
  id: 'block-123',
  strandId: 'strand-456',
  type: 'paragraph',
  content: 'Content here',
  tags: ['react', 'hooks'],
  supertagValues: {
    task: { status: 'in_progress', priority: 'high' }
  }
})
```

### Query Engine

```typescript
import { executeQuery, quickSearch } from '@/lib/query'

// Execute structured query
const results = await executeQuery('#task status:done @sort:updated desc')

// Quick search
const quick = await quickSearch('react hooks')
```

### Supertag Manager

```typescript
import { supertagManager } from '@/lib/supertags'

// Get schema
const taskSchema = supertagManager.getSchema('task')

// Apply supertag to block
await supertagManager.applySupertag('block-123', 'task', {
  status: 'in_progress',
  priority: 'high'
})

// Validate field values
const errors = supertagManager.validateFields('task', {
  status: 'invalid_status'
})
```

### Transclusion Manager

```typescript
import { 
  getBacklinksForStrand,
  getBacklinksForBlock,
  parseBlockReferences,
} from '@/lib/transclusion/transclusionManager'

// Get all backlinks for a strand (with context)
const backlinks = await getBacklinksForStrand('path/to/strand.md')
// Returns: BacklinkWithContext[] with sourceStrand, sourceBlock, contextSnippet

// Get backlinks for a specific block
const blockBacklinks = await getBacklinksForBlock('block-123')

// Parse block references from markdown
const refs = parseBlockReferences(content, 'current-strand.md')
// Returns: ParsedBlockReference[] with type, targetStrand, blockId
```

### Tag Level Stats

```typescript
import { 
  getDocumentTagCounts,
  getBlockTagCounts,
  getTagLevelStats,
  getAllDocumentTags,
  type TagLevelInfo,
} from '@/lib/blockDatabase'

// Get counts of document-level tags
const docCounts = await getDocumentTagCounts()
// Returns: Map<string, number> - tag name to doc count

// Get counts of block-level tags  
const blockCounts = await getBlockTagCounts()
// Returns: Map<string, number> - tag name to block count

// Get combined stats showing tag level origin
const levelStats = await getTagLevelStats()
// Returns: TagLevelInfo[] - { tag, docCount, blockCount, level: 'doc'|'block'|'both' }

// Get all unique document-level tags
const docTags = await getAllDocumentTags()
// Returns: string[]
```

### CrosslinkExplorer Component

```tsx
import { CrosslinkExplorer } from '@/components/quarry/ui/crosslinks'

<CrosslinkExplorer
  strandPath="path/to/strand.md"
  onNavigate={(path, blockId) => handleNavigation(path, blockId)}
  theme="dark"
  showGraph={true}
/>
```

The CrosslinkExplorer displays:
- Backlinks grouped by source strand
- Context snippets showing where references occur
- Reference type badges (Link, Embed, Citation, Mirror)
- Mini graph visualization with radial layout
- Stats summary (total backlinks, unique strands)

---

## Best Practices

### When to Use Block Tags vs Document Tags

- **Block tags**: For granular categorization within long documents
- **Document tags**: For high-level document classification

### Viewing Tags by Level

The Tags Browser (`/quarry/tags`) now distinguishes between document-level and block-level tags:

| Section | Description | Icon |
|---------|-------------|------|
| **Document Tags** | Tags in frontmatter metadata | 📄 FileText |
| **Block Tags** | Tags on individual content blocks | 📚 Layers |

Each tag badge shows its origin:
- 📄 = Document-level only
- 📚 = Block-level only  
- ⇌ = Both levels

Use the filter toggle (All / Docs / Blocks) to focus on specific tag levels.

### Reader Mode Tags

When viewing a strand in Reader Mode (right sidebar), block-level tags appear as teal badges below each block summary. This helps you:
- See tagged blocks at a glance while reading
- Identify key concepts in each section
- Navigate to tagged content quickly

### Supertag Schema Design

1. Keep schemas focused—don't add fields you won't use
2. Use sensible defaults for optional fields
3. Consider field order—most important fields first
4. Use select fields for constrained values

### Query Optimization

1. Use field queries when you know the field
2. Combine tag filters with text search for precision
3. Use `@limit` to avoid loading too many results
4. Save frequently-used queries for quick access

### Transclusion Guidelines

1. Use **references** for "see also" links
2. Use **embeds** for reusable content snippets
3. Use **citations** for academic/research references
4. Use **mirrors** sparingly—bidirectional sync can be confusing

---

## Troubleshooting

### Tags Not Appearing

1. Ensure block tagging is enabled in settings
2. Check that the block has been saved to the database
3. Verify the tag syntax is correct (`#tag-name`)

### Query Returns No Results

1. Check query syntax with the query validator
2. Try a simpler query first, then add conditions
3. Ensure the content has been indexed

### Backlinks Not Showing

1. Verify transclusion is enabled in settings
2. Check that references use correct syntax
3. Rebuild the backlink index if necessary

### Performance Issues

1. Reduce query cache TTL if memory is an issue
2. Use `@limit` on large queries
3. Disable unused features in settings

---

## FAQ

### What's the difference between document tags and block tags?

| Aspect | Document Tags | Block Tags |
|--------|---------------|------------|
| **Scope** | Entire document/strand | Individual paragraph, heading, code block |
| **Use case** | High-level categorization | Granular, contextual tagging |
| **Auto-tagging** | Based on document summary | Based on block worthiness & content |
| **Display** | Document header, sidebar | Inline gutter indicators, block popover |

Both tagging systems work together:
- **Document tags** help organize your knowledge base at a high level
- **Block tags** let you find specific passages and create semantic connections

### How does auto-tagging decide which blocks to tag?

The auto-tagging system evaluates each block using three signals:

1. **Topic Shift (0-1)**: How much the block diverges from the document's main theme
2. **Entity Density (0-1)**: Concentration of technical concepts, names, or keywords
3. **Semantic Novelty (0-1)**: How different the block is from surrounding content

Blocks scoring **≥0.5** on the combined worthiness score are candidates for tagging.

### Can I disable auto-tagging?

Yes! In Settings > Codex > Auto-Tagging:
- **Document Auto-Tag**: Toggle automatic document-level tagging
- **Block Auto-Tag**: Toggle automatic block-level tagging
- **Use LLM**: Enable/disable AI-powered suggestions (NLP-only is faster)
- **Confidence Threshold**: Adjust minimum confidence for suggestions

### Why do some suggested tags show confidence percentages?

Suggested tags come with confidence scores indicating how certain the system is:
- **100%**: Inline tags (`#hashtag` in content) - explicit user intent, shown with blue badge
- **90%+**: Very high confidence, likely a good fit
- **70-89%**: Good confidence, worth reviewing
- **60-69%**: Moderate confidence, may need human judgment

Tags below your configured threshold won't be suggested. Inline tags always have 100% confidence because they represent explicit author intent.

### How do I add tags while editing?

Three quick methods:
1. **Cmd+T**: Opens tag popover for current block
2. **Selection Toolbar**: Select text → click Tag icon (🏷️)
3. **Inline syntax**: Type `#tag-name` directly in content

### Do block tags affect document-level search?

Yes! Block tags are fully searchable alongside document tags:
- `#react` finds both document-tagged and block-tagged content
- Block tags can "bubble up" to document level if they appear frequently

---

## Dynamic Block Tag Extraction

Block tags are extracted **dynamically** when a strand is viewed, rather than being pre-computed and stored in a static file.

### How It Works

```
┌────────────────────────────────────────────────────────────┐
│                    useBlockTags Hook                        │
├────────────────────────────────────────────────────────────┤
│  1. Check memory cache (5 min TTL)                         │
│  2. Check StorageManager cache (24h TTL, SQLite/IDB)       │
│  3. If miss: extract via parseMarkdownBlocks + NLP         │
│  4. Cache results & return StrandBlocks                    │
├────────────────────────────────────────────────────────────┤
│  Auto-Invalidation:                                         │
│  - StorageManager.saveStrand() → clears cache              │
│  - StorageManager.deleteStrand() → clears cache            │
│  - invalidateBlocksCache(path) → manual API                │
└────────────────────────────────────────────────────────────┘
```

### Cache Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Memory TTL | 5 min | In-memory cache for fast repeated access |
| Storage TTL | 24 hours | Persistent cache in SQLite/IndexedDB |
| Worthiness threshold | 0.3 | Minimum score for NLP suggestions |
| Max suggestions/block | 3 | Limit per block to avoid clutter |

### Programmatic API

```typescript
import {
  invalidateBlocksCache,
  hasBlocksInCache,
  clearBlocksCache
} from '@/lib/hooks/useBlockTags'

// Check if blocks are cached for a strand
const cached = await hasBlocksInCache('wiki/my-strand')

// Manually invalidate cache (e.g., after external edit)
await invalidateBlocksCache('wiki/my-strand')

// Clear all in-memory caches
clearBlocksCache()
```

### When Cache is Invalidated

The block tags cache is automatically invalidated when:
- A strand is saved via `StorageManager.saveStrand()`
- A strand is deleted via `StorageManager.deleteStrand()`
- Content hash changes (cache key mismatch)
- TTL expires (24 hours)

### Performance Considerations

- **First view**: Full extraction (50-200ms depending on content length)
- **Cached view**: Instant (<10ms from memory, <50ms from storage)
- **Memory usage**: ~1KB per cached strand (blocks + metadata)
- **Storage usage**: Stored in `block_tags_cache` table
