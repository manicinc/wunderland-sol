# Supernotes Guide

> Compact, structured notecards for rapid knowledge capture and zettelkasten-style linking.

## Overview

**Supernotes** are a specialized type of strand designed for quick, atomic notes with structured metadata. Think of them as digital index cards that combine the flexibility of markdown with the power of supertags for structured data.

```
┌─────────────────────────────────────────────────────────────────┐
│  Strand Ecosystem                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   File-Strand   │    │  Folder-Strand  │    │  Supernote  │ │
│  │   (long-form)   │    │  (collection)   │    │ (notecard)  │ │
│  │                 │    │                 │    │             │ │
│  │  Full articles  │    │  Multi-file     │    │  Quick notes│ │
│  │  Tutorials      │    │  projects       │    │  Ideas      │ │
│  │  Guides         │    │  Research       │    │  Tasks      │ │
│  │  Documentation  │    │  Courses        │    │  Concepts   │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why Supernotes?

| Traditional Strands | Supernotes |
|---------------------|------------|
| Long-form content | Atomic notes |
| Full articles/guides | Quick capture |
| Detailed explanations | Single ideas |
| Optional structure | Required supertag |
| Flexible metadata | Structured fields |

**Supernotes are perfect for:**
- ✅ Zettelkasten-style note networks
- ✅ Quick idea capture
- ✅ Task/todo items with structure
- ✅ Concept definitions
- ✅ People/contact notes
- ✅ Book/article highlights
- ✅ Meeting notes
- ✅ Index cards for learning

---

## The Zettelkasten Connection

Supernotes implement principles from the Zettelkasten (slip-box) method:

### 1. Atomicity
Each supernote contains **one idea, one concept, one thought**. This makes notes reusable, linkable, and findable.

### 2. Connections
Supernotes link to other strands and supernotes via bidirectional links, creating a knowledge graph:

```markdown
---
strandType: supernote
supernote:
  primarySupertag: concept
---
# Emergence

Emergence is when complex patterns arise from simple rules.
Related: [[complexity-theory]], [[cellular-automata]], [[ant-colonies]]
```

### 3. Unique Identifiers
Every supernote has a unique ID and supertag for organization and retrieval.

### 4. Supertag Structure
Unlike freeform notes, supernotes require a **supertag** that provides consistent structure:

```markdown
---
strandType: supernote
supernote:
  primarySupertag: book
  cardSize: 4x6
---
#book/atomic-habits

**Author:** James Clear
**Status:** Reading
**Rating:** ★★★★☆

Key insight: Habits are the compound interest of self-improvement.
```

---

## Creating Supernotes

### Method 1: Create Node Wizard

1. Click **+ Create** in the sidebar
2. Select **Supernote** (orange card with sticky note icon)
3. Choose a **Supertag** (required) - e.g., `task`, `idea`, `book`, `person`
4. Enter title and content
5. Select card size and visual style
6. Click **Create**

### Method 2: Infinite Canvas

1. Open any canvas
2. Drag from the toolbar or use keyboard shortcut
3. Double-click to edit
4. Fill in supertag and content

### Method 3: Quick Capture

Use the global capture shortcut:
- `Cmd/Ctrl + Shift + N` → New supernote

---

## Supernote Frontmatter

```yaml
---
id: 550e8400-e29b-41d4-a716-446655440000
slug: quick-meeting-note
title: Quick Meeting Note
version: 1.0.0

# Required for supernotes
strandType: supernote

supernote:
  # Required: The supertag that provides structure
  primarySupertag: meeting
  
  # Optional: Card size preset
  cardSize: 3x5      # 3x5, 4x6, 5x7, compact, square
  
  # Optional: Visual style
  backgroundColor: "#fef9c3"
  textColor: "#1f2937"
  borderColor: "#fde047"
  
  # Optional: Paper effect
  hasCornerFold: true
  texture: paper     # paper, none

tags:
  - meetings
  - project-alpha
---
```

### Required Fields

| Field | Description |
|-------|-------------|
| `strandType: supernote` | Marks this strand as a supernote |
| `supernote.primarySupertag` | The supertag providing structure |

### Optional Fields

| Field | Default | Description |
|-------|---------|-------------|
| `cardSize` | `3x5` | Card size preset |
| `backgroundColor` | `#fef9c3` | Card background |
| `textColor` | `#1f2937` | Text color |
| `hasCornerFold` | `true` | Show corner fold effect |
| `texture` | `paper` | Visual texture |

---

## Card Sizes

| Size | Dimensions | Best For |
|------|------------|----------|
| `3x5` | 200×150 | Quick notes, tasks |
| `4x6` | 280×200 | Detailed notes (default) |
| `5x7` | 360×250 | Longer content |
| `compact` | 180×120 | Minimal notes |
| `square` | 200×200 | Visual balance |

---

## Visual Styles

Supernotes support multiple visual styles:

### Paper (Default)
Classic notecard look with:
- Subtle gradient background
- Corner fold effect
- Paper texture

### Minimal
Clean, borderless design for:
- Professional contexts
- Embedding in documents
- Print-friendly output

### Colored
Vibrant colors for:
- Visual categorization
- Status indication
- Priority marking

### Glass
Modern glassmorphism effect:
- Translucent background
- Blur effect
- Contemporary UI

### Terminal
Developer-focused style:
- Monospace font
- Dark background
- Code-friendly

---

## Supertags for Supernotes

Supernotes **require** a supertag. Common supertags include:

### Built-in Supertags

```yaml
#task
  - status: todo | in-progress | done
  - priority: low | medium | high
  - dueDate: date

#idea
  - status: raw | developing | refined
  - domain: string

#person
  - role: string
  - company: string
  - email: string

#book
  - author: string
  - status: to-read | reading | finished
  - rating: 1-5

#meeting
  - date: datetime
  - attendees: string[]
  - decisions: string[]

#concept
  - domain: string
  - relates-to: string[]
```

### Creating Custom Supertags

```yaml
# In supertags/recipe.yaml
name: recipe
description: Cooking recipes
icon: 🍳
fields:
  - name: cuisine
    type: select
    options: [Italian, Mexican, Asian, American, Other]
  - name: prepTime
    type: number
    unit: minutes
  - name: servings
    type: number
  - name: difficulty
    type: select
    options: [Easy, Medium, Hard]
```

---

## Infinite Canvas Integration

Supernotes are first-class citizens on the infinite canvas:

### Drag & Drop
- Drag from sidebar → canvas creates SupernoteShape
- Visual notecard appearance
- Resize with constraints

### Editing
- Double-click to edit inline
- Title and summary visible on card
- Supertag badge always shown

### Connections
- Draw links between supernotes
- Auto-create bidirectional links
- Visual knowledge graph

### Organization
- Group by supertag
- Color-code by status
- Filter visible supernotes

---

## Views for Supernotes

### Board/Kanban View
Group supernotes by supertag field:
```
| Todo        | In Progress | Done        |
|-------------|-------------|-------------|
| [Task 1]    | [Task 2]    | [Task 3]    |
| [Task 4]    |             |             |
```

### Gallery View
Visual grid with corner-fold styling:
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ 📝 idea  ◢│  │ 📚 book  ◢│  │ ✅ task ◢│
│ New      │  │ Atomic   │  │ Review   │
│ concept  │  │ Habits   │  │ PR #123  │
└──────────┘  └──────────┘  └──────────┘
```

### Table View
Supertag fields as columns:
```
| Title       | Supertag | Status | Priority |
|-------------|----------|--------|----------|
| Task 1      | #task    | todo   | high     |
| New idea    | #idea    | raw    | -        |
```

---

## Filtering Supernotes

### By Type
```
strandType:supernote
```

### By Supertag
```
supernote.primarySupertag:task
```

### By Status
```
supernote.primarySupertag:task status:todo
```

### In Views
Each view component supports:
- Show/hide supernotes toggle
- Filter by specific supertags
- Sort by supertag fields

---

## Best Practices

### 1. One Idea Per Note
```markdown
# Good ✅
Title: Emergence in Complex Systems
Content: Single concept explained clearly.

# Bad ❌
Title: Everything About Complexity
Content: 10 different concepts crammed together.
```

### 2. Use Meaningful Supertags
```yaml
# Good ✅
primarySupertag: meeting
primarySupertag: book-highlight
primarySupertag: project-idea

# Bad ❌
primarySupertag: note
primarySupertag: stuff
primarySupertag: misc
```

### 3. Link Liberally
```markdown
This relates to [[other-concept]] and builds on [[foundation-idea]].
See also: [[related-topic]]
```

### 4. Keep It Short
Supernotes are notecards, not essays. If you're writing more than a paragraph, consider a full strand.

### 5. Use Supertag Fields
Let the supertag structure do the work:
```yaml
supernote:
  primarySupertag: task
# Then the task fields (status, priority, etc.) are automatically available
```

---

## API Reference

### Types

```typescript
import type { SupernoteProps, SupernoteCardSize } from '@/lib/supernotes'

// Card size presets
type SupernoteCardSize = 'sm' | 'md' | 'lg' | 'auto'

// Full props interface
interface SupernoteProps {
  w: number
  h: number
  supernoteId: string
  strandPath: string
  title: string
  summary?: string
  supertag: string
  supertagFields: Record<string, any>
  color: string
  cardSize: SupernoteCardSize
  // ... styling props
}
```

### Validation

```typescript
import { validateSupernoteProps } from '@/lib/supernotes'

const errors = validateSupernoteProps(props)
// Returns: string[] of validation errors
```

### Detection

```typescript
import { validateStrandSchema } from '@/lib/strand/detection'

const result = validateStrandSchema(schema, 'supernote')
// Ensures primarySupertag is present
```

---

## Examples

### Task Supernote

```markdown
---
strandType: supernote
supernote:
  primarySupertag: task
  cardSize: 3x5
tags: [project-alpha, urgent]
---
#task/review-pr-123

**Status:** In Progress
**Priority:** High
**Due:** 2024-12-15

Review the authentication refactor PR.
Check for security issues and test coverage.
```

### Idea Supernote

```markdown
---
strandType: supernote
supernote:
  primarySupertag: idea
  cardSize: 4x6
  backgroundColor: "#dbeafe"
---
#idea/voice-to-canvas

What if we could speak ideas and have them appear as connected nodes on a canvas?

**Domain:** Product
**Status:** Raw

Links to: [[voice-transcription]], [[infinite-canvas]], [[knowledge-graph]]
```

### Book Highlight Supernote

```markdown
---
strandType: supernote
supernote:
  primarySupertag: book
  cardSize: 4x6
---
#book/atomic-habits/ch3-highlight

> "You do not rise to the level of your goals. You fall to the level of your systems."

**Book:** Atomic Habits
**Author:** James Clear
**Chapter:** 3

This connects to [[systems-thinking]] and [[habit-loops]].
```

---

## Related Documentation

- [Strand Architecture](./STRAND_ARCHITECTURE.md) - Full strand system overview
- [Supertags Guide](./SUPERTAGS_GUIDE.md) - Creating and using supertags
- [Bidirectional Links](./BIDIRECTIONAL_LINKS.md) - Linking between notes
- [Block-Level Tagging](./BLOCK_LEVEL_TAGGING.md) - Section-level organization
- [Canvas Guide](../components/quarry/ui/canvas/README.md) - Infinite canvas features


