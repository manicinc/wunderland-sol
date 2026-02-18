# Collections Feature

Visual organization of strands on an infinite canvas, similar to Vilva/Obsidian Canvas.

## Overview

Collections are curated groupings of related strands that can span across weaves and looms. They provide a visual way to organize and connect your knowledge, showing relationships through connection lines.

## Key Features

- **Visual Canvas**: Browse strands as connected cards on an infinite canvas
- **Cross-Weave Connections**: Show relationships across different looms/weaves
- **Auto-Discovery**: Automatically discover connections via shared tags, topics, and hierarchy
- **Smart Collections**: Dynamic collections that update based on filters
- **Click-to-Expand**: View strand content in a slide-out panel

## Quick Start

### Creating a Collection

```typescript
import { useCollections } from '@/lib/collections'

function MyComponent() {
  const { createCollection, collections } = useCollections()

  const handleCreate = async () => {
    const collection = await createCollection({
      title: 'My Course Plan',
      description: 'AI and ML fundamentals',
      icon: 'brain',
      color: '#8b5cf6',
      strandPaths: ['weaves/technology/ml/intro.md'],
    })
    console.log('Created:', collection.id)
  }

  return <button onClick={handleCreate}>Create Collection</button>
}
```

### Adding Strands to a Collection

```typescript
const { addStrandToCollection } = useCollections()

await addStrandToCollection(
  'collection-id',
  'weaves/technology/react/hooks.md'
)
```

### Managing Positions

```typescript
const { updateStrandPosition, updateStrandPositions } = useCollections()

// Update single position
await updateStrandPosition('collection-id', 'path/to/strand.md', {
  x: 100,
  y: 200,
  z: 1, // optional z-index
})

// Batch update positions
await updateStrandPositions('collection-id', {
  'path/a.md': { x: 0, y: 0 },
  'path/b.md': { x: 300, y: 0 },
})
```

## Collection Types

### Standard Collection

A manually curated collection where you add strands explicitly.

```yaml
# collection.yml
title: "React Fundamentals"
description: "Core React concepts and patterns"
icon: "book"
color: "#00C896"
viewMode: cards
strandPaths:
  - weaves/technology/react/intro.md
  - weaves/technology/react/hooks.md
  - weaves/technology/react/context.md
```

### Smart Collection

A dynamic collection that auto-updates based on filters.

```yaml
title: "Recent AI Articles"
smartFilter:
  tags: ["ai", "machine-learning"]
  subjects: ["technology"]
  dateRange:
    start: "2025-01-01"
  limit: 50
```

## Connection Types

### User-Created

| Type | Description | Strength |
|------|-------------|----------|
| `references` | Cites or mentions | 0.9 |
| `prerequisites` | Required before | 1.0 |
| `seeAlso` | Related content | 0.7 |
| `extends` | Builds upon | 0.8 |
| `contradicts` | Opposing view | 0.6 |
| `implements` | Concrete implementation | 0.8 |
| `exemplifies` | Example of | 0.7 |
| `custom` | User-defined | 0.5 |

### Auto-Discovered

| Type | Description | Strength |
|------|-------------|----------|
| `sharedTags` | Shared tags | 0.33-1.0 |
| `sharedTopics` | Shared topics | 0.5-1.0 |
| `sameLoom` | Same loom | 0.6 |
| `sameWeave` | Same weave | 0.3 |
| `backlink` | Content reference | 0.8 |

## Canvas Integration

### CollectionShape

The `CollectionShape` is a custom tldraw shape for displaying collections on the canvas.

```typescript
import { CollectionShapeUtil } from '@/components/quarry/ui/canvas/shapes'

// Shape is automatically registered in KnowledgeCanvas
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `collectionId` | string | Unique identifier |
| `title` | string | Display title |
| `strandCount` | number | Number of strands |
| `color` | string | Accent color (hex) |
| `expanded` | boolean | Show children |
| `viewMode` | 'cards' \| 'grid' \| 'compact' | Layout mode |
| `crossWeave` | boolean | Spans multiple weaves |

## API Reference

### useCollections Hook

```typescript
interface UseCollectionsReturn {
  // State
  collections: CollectionMetadata[]
  isLoading: boolean
  error: string | null

  // CRUD
  createCollection: (data: CreateCollectionInput) => Promise<CollectionMetadata>
  updateCollection: (id: string, data: UpdateCollectionInput) => Promise<void>
  deleteCollection: (id: string) => Promise<void>
  getCollection: (id: string) => CollectionMetadata | undefined

  // Strand operations
  addStrandToCollection: (collectionId: string, strandPath: string) => Promise<void>
  removeStrandFromCollection: (collectionId: string, strandPath: string) => Promise<void>
  moveStrand: (strandPath: string, from: string, to: string) => Promise<void>

  // Position operations
  updateStrandPosition: (id: string, path: string, pos: CollectionStrandPosition) => Promise<void>
  updateStrandPositions: (id: string, positions: Record<string, CollectionStrandPosition>) => Promise<void>

  // Connection operations
  addConnection: (id: string, connection: CollectionConnection) => Promise<void>
  removeConnection: (id: string, source: string, target: string) => Promise<void>

  // Utility
  refreshCollections: () => Promise<void>
  duplicateCollection: (id: string, newTitle?: string) => Promise<CollectionMetadata>
}
```

### Connection Discovery

```typescript
import {
  discoverConnections,
  analyzeSharedTags,
  analyzeSharedTopics,
} from '@/lib/collections'

// Discover all connections between strands
const strands = [
  { path: 'a.md', tags: ['react'], weaveSlug: 'tech' },
  { path: 'b.md', tags: ['react'], weaveSlug: 'tech' },
]
const connections = discoverConnections(strands)

// Analyze shared tags
const tagMap = analyzeSharedTags(strands)
// Map<string, string[]> - tag -> strand paths

// Analyze shared topics
const topicMap = analyzeSharedTopics(strands)
```

## UI Components

### CanvasStrandPreviewPanel

Slide-out panel for viewing strand content when clicking cards.

```tsx
import { CanvasStrandPreviewPanel } from '@/components/quarry/ui/CanvasStrandPreviewPanel'

<CanvasStrandPreviewPanel
  strandPath={selectedPath}
  isOpen={isPanelOpen}
  onClose={() => setPanelOpen(false)}
  onNavigate={(path) => router.push(`/quarry/${path}`)}
  hasPrev={index > 0}
  hasNext={index < strands.length - 1}
  onNavigatePrev={() => setIndex(i => i - 1)}
  onNavigateNext={() => setIndex(i => i + 1)}
/>
```

### BrowseViewToggle

View mode switcher with collections support.

```tsx
import { BrowseViewToggle } from '@/components/quarry/ui/BrowseViewToggle'

<BrowseViewToggle
  value="collections"
  onChange={(mode) => setViewMode(mode)}
  isDark={true}
/>
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Esc` | Close preview panel |
| `←` | Previous strand |
| `→` | Next strand |
| `Double-click` | Toggle collection expanded |

## File-Based Persistence

Collections are stored as YAML files for version control:

```
codex/collections/
├── ai-course-plan/
│   └── collection.yml
├── react-fundamentals/
│   └── collection.yml
└── weekly-review/
    └── collection.yml
```

## Best Practices

1. **Use descriptive titles**: Make collection names clear and searchable
2. **Add icons**: Visual icons help quickly identify collections
3. **Color coding**: Use consistent colors for related collections
4. **Smart filters**: Use smart collections for frequently-updated views
5. **Position strands logically**: Group related strands spatially
6. **Document connections**: Add labels to important user-created connections
