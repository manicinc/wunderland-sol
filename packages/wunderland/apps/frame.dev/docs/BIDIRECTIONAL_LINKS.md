# Bidirectional Links Guide

This document covers the complete bidirectional linking system in Quarry Codex, including wikilinks, backlinks, transclusion, and related features.

---

## Table of Contents

1. [Overview](#overview)
2. [Link Syntax](#link-syntax)
3. [Creating Links](#creating-links)
4. [Backlinks](#backlinks)
5. [Transclusion](#transclusion)
6. [Auto-Detection](#auto-detection)
7. [Settings](#settings)
8. [API Reference](#api-reference)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Bidirectional links create a network of connected knowledge. When you link from Document A to Document B, Quarry Codex automatically tracks this relationship and shows it as a backlink in Document B.

### Key Concepts

- **Wikilink**: A link using `[[...]]` syntax that connects two strands
- **Backlink**: An incoming reference from another strand
- **Transclusion**: Embedding content from one strand into another
- **Block Reference**: A link to a specific block within a strand
- **Unlinked Mention**: Text that matches a strand title but isn't linked yet

---

## Link Syntax

### Basic Links

```markdown
[[strand-path]]           # Link to strand (uses filename as display text)
[[strand-path|Display]]   # Link with custom display text
```

### Block References

```markdown
[[strand-path#block-id]]          # Link to specific block
[[strand-path#block-id|alias]]    # Link to block with alias
```

### Reference Types

| Syntax | Type | Description |
|--------|------|-------------|
| `[[...]]` | Link | Standard navigation link |
| `![[...]]` | Embed | Inline embed of content |
| `^[[...]]` | Citation | Citation reference with count |
| `=[[...]]` | Mirror | Live-synced mirror (experimental) |

### Examples

```markdown
# Simple link
Check out [[getting-started]] for more information.

# Link with alias
The [[react-hooks|React Hooks documentation]] explains this well.

# Block reference
As noted in [[architecture#security-layer]], we use JWT tokens.

# Embed
Here's the summary:
![[project-overview#summary]]

# Citation
This pattern was first described in ^[[design-patterns#factory-pattern]].
```

---

## Creating Links

### Method 1: Autocomplete (Recommended)

1. Type `[[` in the editor
2. Start typing the strand name
3. Select from suggestions using:
   - Arrow keys (↑↓) to navigate
   - Enter to select
   - Tab to select and continue typing
   - Escape to cancel

The autocomplete shows:
- Matching strand titles
- Path preview
- Tags on matching strands
- Option to create new strand if no match exists

### Method 2: Manual Typing

Simply type the full link syntax:

```markdown
[[path/to/strand]]
```

### Method 3: Selection + Link

1. Select text in the editor
2. Press `Cmd/Ctrl + K`
3. Enter the target strand path
4. The selected text becomes the link display text

### Creating New Strands from Links

When you type `[[new-strand-name]]` and the strand doesn't exist:
- The link is created immediately
- When you save, you'll be prompted to create the new strand
- Alternatively, use the autocomplete "Create new" option

---

## Backlinks

Backlinks show all strands that reference the current strand.

### Viewing Backlinks

1. Open any strand in the reader
2. Look for the "Backlinks" section in the right sidebar
3. Click on a backlink to navigate to the source

### Backlink Information

Each backlink shows:
- **Source strand title** - Where the link comes from
- **Reference type** - Link, Embed, Citation, or Mirror
- **Context snippet** - Text around the link for context
- **Block type** - What kind of block contains the link

### CrosslinkExplorer

For advanced backlink exploration:

1. Click the graph icon in the backlinks header
2. View the mini graph visualization
3. Filter by reference type
4. Search backlinks by content
5. Sort by count, name, or date

---

## Transclusion

Transclusion embeds content from one strand into another.

### Embed Syntax

```markdown
![[strand-path]]              # Embed entire strand
![[strand-path#block-id]]     # Embed specific block
```

### Behavior

- Embedded content is read-only by default
- Updates to the source reflect in all embeds
- Circular embeds are detected and prevented (max depth: 3)

### Mirror Syntax (Experimental)

```markdown
=[[strand-path#block-id]]
```

Mirrors enable two-way sync - changes in either location update both. Enable in Settings → Preferences → Links → Mirror sync.

---

## Auto-Detection

Quarry Codex can detect potential links in your content.

### How It Works

1. When you load a strand, the system scans the content
2. It matches text against existing strand titles
3. A banner shows detected potential links
4. You can accept (add link) or dismiss suggestions

### Enabling/Disabling

Go to **Settings → Preferences → Links → Unlinked mentions**

### Confidence Scores

Suggestions include a confidence percentage:
- **100%** - Exact title match
- **85-99%** - Close match (substring or similar)
- **70-84%** - Fuzzy match

---

## Settings

Access link settings via **Settings → Preferences → Bidirectional Links**

### Available Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Auto-update backlinks | Rebuild backlinks when content changes | On |
| Hover preview | Show preview popup on link hover | On |
| Preview delay | Delay before showing hover preview | 300ms |
| Backlink indicator | How to show blocks with backlinks (count/dot/none) | count |
| Transclusion depth | Maximum nested embed depth | 3 |
| Mirror sync | Enable experimental live mirroring | Off |
| Unlinked mentions | Show potential link suggestions | Off |

---

## API Reference

### Wikilink Autocomplete Hook

```typescript
import { useWikilinkAutocomplete } from '@/hooks/useWikilinkAutocomplete'

const { state, checkForWikilink, insertLink, close } = useWikilinkAutocomplete({
  editor,
  enabled: true,
  onOpen: (state) => console.log('Autocomplete opened', state),
  onClose: () => console.log('Autocomplete closed'),
})
```

### Auto-Detection

```typescript
import { detectUnlinkedMentions } from '@/lib/linkSuggestion/autoDetector'

const result = detectUnlinkedMentions(content, strands, {
  minConfidence: 0.7,
  maxSuggestions: 10,
})

console.log(result.mentions) // UnlinkedMention[]
```

### Link Preferences

```typescript
import { getPreferences, updatePreferences } from '@/lib/localStorage'
import type { LinkPreferences } from '@/lib/localStorage'

// Get current preferences
const prefs = getPreferences()
const linkPrefs = prefs.linkPreferences

// Update preferences
updatePreferences({
  linkPreferences: {
    ...linkPrefs,
    showHoverPreview: false,
  }
})
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `[[` | Open link autocomplete |
| `↑` / `↓` | Navigate suggestions |
| `Enter` | Select suggestion |
| `Tab` | Select and continue |
| `Escape` | Close autocomplete |
| `Cmd/Ctrl + K` | Link selected text |
| `Cmd/Ctrl + Shift + L` | Toggle backlinks panel |

---

## Troubleshooting

### Links Not Working

1. **Check path exists** - Ensure the target strand exists
2. **Check syntax** - Verify correct `[[...]]` format
3. **Check encoding** - Special characters in paths need URL encoding

### Backlinks Not Showing

1. **Wait for indexing** - Backlinks update asynchronously
2. **Refresh** - Click the refresh button in the backlinks panel
3. **Check auto-update setting** - Ensure "Auto-update backlinks" is enabled

### Autocomplete Not Appearing

1. **Check editor mode** - Must be in edit mode
2. **Type `[[` correctly** - Both brackets are required
3. **Wait for search** - There's a 150ms debounce

### Performance Issues

If you have many strands (1000+):
1. Consider disabling "Unlinked mentions" auto-detection
2. Reduce "Transclusion depth" if using many embeds
3. The system uses efficient indexing but very large codebases may need tuning

---

## Related Documentation

- [Block-Level Tagging](./BLOCK_LEVEL_TAGGING.md) - Tags and supertags for blocks
- [Transclusion Deep Dive](./features/transclusion.md) - Advanced transclusion features
- [Query System](./BLOCK_LEVEL_TAGGING.md#query-system) - Querying linked content

