# Collections Guide

> Organize your strands into beautiful, cross-cutting collections for visual browsing and flexible organization.

## What are Collections?

Collections are a powerful way to group related (or unrelated) strands together, independent of their hierarchical structure in weaves and looms. Think of them as playlists for your knowledge—you can add any strand to any collection, creating flexible organizational layers.

### Key Features

- **Cross-cutting organization**: Group strands from different weaves and looms
- **Visual browsing**: Sleek bento grid with generated SVG covers
- **Smart patterns**: 10 unique cover patterns (geometric, waves, aurora, circuits, etc.)
- **Pin favorites**: Keep important collections easily accessible
- **Multiple views**: Grid, list, and timeline views
- **Connection discovery**: Auto-detect related strands via tags, topics, and backlinks

## Quick Start

### Creating a Collection

1. Navigate to **Collections** in the sidebar (or `/quarry/collections`)
2. Click **"Create Collection"**
3. Enter a title and optional description
4. Choose a color and cover pattern
5. Click **Create**

### Adding Strands

**From the Collection page:**
1. Open the collection
2. Click **"Add Strands"**
3. Search and select strands to add
4. Confirm

**From any strand:**
1. Click the **⋮** menu on a strand card
2. Select **"Add to Collection"**
3. Choose existing collection or create new

## Cover Patterns

Collections feature automatically generated SVG covers with 10 unique patterns:

| Pattern | Description | Best For |
|---------|-------------|----------|
| **Geometric** | Overlapping polygons | Tech, math, architecture |
| **Waves** | Flowing wave lines | Creative, music, design |
| **Mesh** | Soft gradient blobs | Modern, minimal |
| **Circuits** | Tech circuit board | Development, engineering |
| **Topography** | Contour map lines | Geography, data, research |
| **Aurora** | Northern lights effect | Science, space, nature |
| **Crystalline** | Faceted crystal shards | Art, geology, luxury |
| **Constellation** | Star connections | Astronomy, networking |
| **Abstract** | Organic fluid shapes | Art, creativity |
| **Hexagons** | Honeycomb grid | Chemistry, data, patterns |

Patterns are generated deterministically based on collection name and color, ensuring consistent visuals.

## Collection Views

### Bento Grid (Default)
Visual cards with stacked strand previews. Card sizes adapt based on strand count:
- 1-3 strands: Small (1×1)
- 4-8 strands: Medium (2×1)
- 9+ strands: Large (2×2)

### Grid View
Traditional grid of strand cards within a collection.

### List View
Compact table view for quick scanning.

### Timeline View
Strands organized chronologically.

## Smart Collections

Smart collections auto-update based on filters:

```yaml
smartFilter:
  tags: [research, 2024]
  weaveSlug: projects
  limit: 50
```

Fields available:
- `tags`: Filter by strand tags
- `subjects`: Filter by subjects
- `topics`: Filter by topics
- `weaveSlug`: Limit to specific weave
- `loomSlug`: Limit to specific loom
- `dateRange`: Filter by date range
- `limit`: Maximum strands

## Connection Discovery

Collections can auto-discover connections between strands:

- **Shared Tags**: Strands with common tags
- **Shared Topics**: Related topics detected
- **Same Loom**: Strands from the same loom
- **Backlinks**: Content cross-references

Enable in collection settings: `showDiscoveredConnections: true`

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl + N` | Create new collection |
| `⌘/Ctrl + P` | Toggle pin |
| `Delete` | Remove selected strands |
| `⌘/Ctrl + A` | Select all strands |

## API Reference

### useCollections Hook

```typescript
import { useCollections } from '@/lib/collections'

const {
  collections,
  isLoading,
  error,
  createCollection,
  updateCollection,
  deleteCollection,
  addStrandToCollection,
  removeStrandFromCollection,
} = useCollections()
```

### Creating a Collection

```typescript
const newCollection = await createCollection({
  title: 'My Research',
  description: 'Papers and notes on ML',
  color: '#6366f1',
  coverPattern: 'circuits',
  strandPaths: ['weaves/research/ml/intro.md'],
})
```

### Updating a Collection

```typescript
await updateCollection(collectionId, {
  title: 'Updated Title',
  pinned: true,
  coverPattern: 'aurora',
})
```

## Cover Generator API

Generate custom covers programmatically:

```typescript
import { generateCollectionCoverDataUrl, COVER_PATTERNS } from '@/lib/collections'

// Generate a cover data URL
const coverUrl = generateCollectionCoverDataUrl({
  pattern: 'constellation',
  primaryColor: '#8b5cf6',
  secondaryColor: '#06b6d4',
  seed: 42,
}, 400, 200)

// Use in an image
<img src={coverUrl} alt="Collection cover" />
```

## Best Practices

1. **Descriptive titles**: Use clear, searchable names
2. **Color coding**: Use consistent colors for related collections
3. **Pinning**: Pin your most-used collections
4. **Smart filters**: Use smart collections for dynamic organization
5. **Cross-reference**: Add strands to multiple collections for different contexts

## Troubleshooting

### Collections not saving
- Check browser localStorage quota
- Ensure API route is accessible
- Try refreshing the page

### Cover not displaying
- Verify color is valid hex format
- Check browser SVG support
- Try a different pattern

### Strands not appearing
- Verify strand paths are correct
- Check if strands exist in filesystem
- Refresh strand index

## Related Guides

- [Supernotes Guide](./SUPERNOTES_GUIDE.md) - Atomic note cards
- [Strand Architecture](./STRAND_ARCHITECTURE.md) - Content structure
- [Canvas Guide](./CANVAS_GUIDE.md) - Visual canvas workspace

