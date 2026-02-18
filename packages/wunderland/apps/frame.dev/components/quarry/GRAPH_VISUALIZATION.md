# Quarry Codex Graph Visualization Guide

## Overview

Quarry Codex provides **three complementary graph views** for exploring knowledge relationships:

| View | Location | Purpose |
|------|----------|---------|
| **Sidebar Graph** | Left sidebar (Graph tab) | Contextual view of current selection |
| **Full Fabric Graph** | `/quarry/graph` | Complete knowledge universe exploration |
| **Compact Relations** | Right metadata panel | Quick reference for strand relationships |

All graphs use **D3.js force-directed layouts** with custom physics simulations.

---

## 1. Sidebar Graph View

**Component**: `ui/SidebarGraphView.tsx`

### Features

- **Contextual**: Shows nodes related to the currently selected item
- **Interactive**: Click nodes to navigate, hover for tooltips
- **Drill-down**: Weave → Loom → Strand navigation
- **Compact**: Optimized for sidebar width (~240-300px)

### Interaction

| Action | Result |
|--------|--------|
| **Click node** | Navigate to that item |
| **Hover node** | Show tooltip with metadata |
| **Click back** | Return to previous view level |
| **Zoom +/-** | Adjust graph scale |
| **Drag node** | Reposition (D3 force relaxes) |
| **Click "Full"** | Open full graph at `/quarry/graph` |

### Visual Encoding

```
Node Colors (by level):
├── Fabric   │ #71717a (zinc-500)  │ ●●●●● (20px)
├── Weave    │ #f59e0b (amber-500) │ ●●●● (14px)
├── Loom     │ #06b6d4 (cyan-500)  │ ●●● (10px)
├── Strand   │ #8b5cf6 (violet-500)│ ●● (8px)
└── Folder   │ #6b7280 (gray-500)  │ ●● (6px)
```

### Usage

```tsx
import SidebarGraphView from '@/components/quarry/ui/SidebarGraphView'

<SidebarGraphView
  tree={knowledgeTree}
  selectedPath="weaves/frame"
  currentPath="weaves/frame/overview.md"
  onNavigate={(path) => router.push(`/codex?path=${path}`)}
  theme="dark"
/>
```

---

## 2. Full Fabric Graph

**Component**: `ui/FullFabricGraph.tsx`  
**Route**: `/quarry/graph`

### Features

- **Multi-level exploration**: Navigate entire knowledge hierarchy
- **Filtering**: By node type, strand count, tags
- **Search**: Real-time node highlighting
- **Breadcrumbs**: Track navigation path
- **Export**: (Planned) Download graph as SVG/PNG

### Controls

| Control | Description |
|---------|-------------|
| **Zoom slider** | Adjust viewport scale (0.1x - 3x) |
| **Fit view** | Auto-zoom to show all nodes |
| **Reset** | Return to fabric-level view |
| **Filter panel** | Toggle node types, set thresholds |
| **Search** | Highlight matching nodes |

### Navigation Flow

```
FABRIC (root)
    │
    ├── [click] ──► WEAVE view (shows looms + top strands)
    │                   │
    │                   ├── [click] ──► LOOM view (shows child strands)
    │                   │                   │
    │                   │                   └── [double-click] ──► Open strand
    │                   │
    │                   └── [double-click] ──► Open weave overview
    │
    └── [breadcrumb click] ──► Jump to any previous level
```

### Filter Options

| Filter | Type | Description |
|--------|------|-------------|
| **Show Weaves** | Toggle | Include weave-level nodes |
| **Show Looms** | Toggle | Include loom-level nodes |
| **Show Strands** | Toggle | Include strand-level nodes |
| **Min Strands** | Slider | Hide nodes with fewer strands |
| **Tag Filter** | Multi-select | Only show nodes with specific tags |

### Physics Simulation

The graph uses D3's force simulation with:

```typescript
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).distance(60))
  .force('charge', d3.forceManyBody().strength(-150))
  .force('center', d3.forceCenter(width/2, height/2))
  .force('collision', d3.forceCollide().radius(d => d.size + 5))
```

### Usage

```tsx
// Accessed via route: /quarry/graph
// Or programmatically:
import FullFabricGraph from '@/components/quarry/ui/FullFabricGraph'

<FullFabricGraph />
```

---

## 3. Compact Relation Graph

**Component**: `ui/CompactRelationGraph.tsx`

### Purpose

Ultra-compact display of a strand's immediate relationships for the metadata panel. No D3/SVG—uses semantic HTML for clarity.

### Displays

- **Current strand**: Highlighted center
- **Prerequisites**: Incoming dependencies (red)
- **References**: Outgoing links (green)
- **Tags**: Related categories (amber)

### Usage

```tsx
import CompactRelationGraph from '@/components/quarry/ui/CompactRelationGraph'

<CompactRelationGraph
  metadata={strandMetadata}
  currentFile={selectedFile}
  allFiles={allFiles}
  onNavigate={(path) => handleNavigation(path)}
  theme="dark"
  panelSize="s"
/>
```

---

## Technical Implementation

### D3.js Integration

Both `SidebarGraphView` and `FullFabricGraph` use D3 with React:

```tsx
// Pattern: useRef + useEffect
const svgRef = useRef<SVGSVGElement>(null)

useEffect(() => {
  if (!svgRef.current) return
  
  const svg = d3.select(svgRef.current)
  
  // Create simulation
  const simulation = d3.forceSimulation(nodes)
    // ... forces
  
  // Render nodes
  const nodeElements = svg.selectAll('.node')
    .data(nodes)
    .join('g')
    // ... attributes
  
  // Cleanup
  return () => { simulation.stop() }
}, [nodes, links])
```

### Node Data Structure

```typescript
interface GraphNode {
  id: string
  name: string
  level: 'fabric' | 'weave' | 'loom' | 'strand' | 'folder'
  path: string
  size: number
  strandCount?: number
  description?: string
  emoji?: string
  // D3 simulation adds:
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null  // Fixed position
  fy?: number | null
}
```

### Link Data Structure

```typescript
interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  type: 'parent-child' | 'reference' | 'prerequisite'
}
```

---

## Performance Considerations

### Large Graphs (500+ nodes)

| Optimization | Implementation |
|--------------|----------------|
| **Node culling** | Only render visible nodes (viewport check) |
| **Label hiding** | Hide labels when zoomed out |
| **Simulation cap** | Stop simulation after 300 ticks |
| **Lazy expansion** | Don't load all children until drilled |

### Recommended Limits

| Graph | Max Nodes | Notes |
|-------|-----------|-------|
| Sidebar | ~100 | Contextual, always small |
| Full graph | ~1000 | With filters/search |
| Relations | ~20 | Text-based, not SVG |

---

## Customization

### Adding Node Colors

Edit `LEVEL_COLORS` in the component:

```typescript
const LEVEL_COLORS: Record<NodeLevel, string> = {
  fabric: '#71717a',
  weave: '#f59e0b',
  loom: '#06b6d4',
  strand: '#8b5cf6',
  folder: '#6b7280',
  // Add new levels here
}
```

### Custom Node Shapes

Override the node rendering in D3:

```typescript
nodeElements.append('circle')  // Default
// Replace with:
nodeElements.append('rect')
  .attr('width', d => d.size * 2)
  .attr('height', d => d.size * 2)
  .attr('rx', 4)  // Rounded corners
```

### Adding Edge Labels

```typescript
linkElements.append('text')
  .attr('class', 'link-label')
  .text(d => d.type)
  .attr('font-size', 10)
  .attr('text-anchor', 'middle')
```

---

## Accessibility

All graph components include:

- **ARIA labels** on interactive elements
- **Keyboard navigation** (Tab through nodes)
- **Screen reader descriptions** for node counts
- **High contrast mode** support
- **Reduced motion** respect (prefers-reduced-motion)

---

## Related

- [NLP Guide](./NLP_GUIDE.md) - Content analysis
- [Search Guide](./SEARCH_GUIDE.md) - Finding nodes
- [Main README](./README.md) - Component overview

---

## Roadmap

- [ ] WebGL renderer for 10K+ node graphs
- [ ] Cluster detection and highlighting
- [ ] Path highlighting (A → B)
- [ ] Export to SVG/PNG/PDF
- [ ] 3D force-directed view
- [ ] Time-based animation (show growth)


