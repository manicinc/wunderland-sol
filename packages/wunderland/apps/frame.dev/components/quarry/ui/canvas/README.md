# Quarry Codex Canvas System

> Infinite canvas with custom shapes for voice notes, transcripts, and attachments

## Overview

The Quarry Codex Canvas System extends [tldraw](https://tldraw.com) with custom interactive shapes for knowledge capture. Quarry Codex is our official public digital garden. It provides:

- **VoiceNoteShape** - Audio player with waveform visualization
- **TranscriptShape** - Editable text cards linked to voice notes
- **AttachmentShape** - File/image embeds with previews
- **Smart Export** - Convert canvas content to structured markdown strands

## Quick Start

### Basic Usage

```tsx
import WhiteboardCanvas from '@/components/quarry/ui/WhiteboardCanvas'

function MyComponent() {
  const [canvasOpen, setCanvasOpen] = useState(false)

  return (
    <WhiteboardCanvas
      isOpen={canvasOpen}
      onClose={() => setCanvasOpen(false)}
      onSave={(svg, png) => {
        // Handle exported drawing
        console.log('Saved:', svg)
      }}
      theme="dark"
    />
  )
}
```

### With Canvas Export

```tsx
import { useCanvasExport } from '@/components/quarry/hooks/useCanvasExport'
import CanvasExportModal from '@/components/quarry/ui/CanvasExportModal'

function MyComponent() {
  const { exportModal, openExportModal, handleExport } = useCanvasExport({
    onExportComplete: (result) => {
      // Save the strand
      saveStrand(result.markdown, result.frontmatter)
      // Save assets
      result.assets.forEach(asset => saveAsset(asset))
    }
  })

  return (
    <>
      <button onClick={openExportModal}>Export Canvas</button>
      <CanvasExportModal {...exportModal} />
    </>
  )
}
```

---

## Custom Shapes

### VoiceNoteShape

Audio player with waveform visualization and transcription support.

```typescript
interface VoiceNoteShapeProps {
  w: number                    // Width (default: 400)
  h: number                    // Height (default: 120)
  audioPath: string            // Path to audio file
  duration: number             // Duration in seconds
  currentTime: number          // Playback position
  isPlaying: boolean           // Playback state
  waveformData: number[]       // Normalized waveform (0-1)
  transcriptText: string       // Inline transcript preview
  linkedTranscriptId: string   // Link to TranscriptShape
  recordedAt: string           // ISO timestamp
  title: string                // User-editable title
  transcriptionStatus: TranscriptionStatus
}

type TranscriptionStatus =
  | 'idle'       // Not transcribed
  | 'pending'    // Queued
  | 'processing' // In progress
  | 'done'       // Complete
  | 'error'      // Failed
  | 'cancelled'  // User cancelled
```

**Features:**
- Play/pause/seek controls
- Waveform visualization with progress indicator
- Click-to-seek on waveform
- Transcription status with cancel option
- Link to transcript navigation

### TranscriptShape

Editable text card for transcripts and notes.

```typescript
interface TranscriptShapeProps {
  w: number                      // Width (default: 300)
  h: number                      // Height (auto-grows)
  title: string                  // Header title
  text: string                   // Transcript content
  linkedVoiceNoteId: string      // Link to VoiceNoteShape
  tags: string[]                 // Hashtags
  timestamps: TranscriptTimestamp[]  // Audio sync points
  color: string                  // Card theme color
  createdAt: string              // ISO timestamp
}
```

**Features:**
- Auto-resize based on content
- Tag pills with click-to-filter
- Timestamp sync with voice notes
- Markdown support in text
- "Jump to audio" link

### AttachmentShape

File and image embeds with previews.

```typescript
interface AttachmentShapeProps {
  w: number                    // Width (default: 200)
  h: number                    // Height (default: 200)
  fileName: string             // Display name
  filePath: string             // Path in assets/
  mimeType: string             // Content type
  fileSize: number             // Size in bytes
  thumbnailPath: string        // Preview image
  dimensions: MediaDimensions | null  // For images/videos
  uploadedAt: string           // ISO timestamp
}
```

**Features:**
- Thumbnail preview for images
- File icon for documents
- Download button
- File size display
- Drag-drop from desktop

---

## Hooks

### useCanvasShapes

Create and manage custom shapes on the canvas.

```tsx
import { useCanvasShapes } from './canvas/useCanvasShapes'

function CanvasComponent({ editor }) {
  const {
    createVoiceNote,
    createTranscript,
    createAttachment,
    createVoiceNoteWithTranscript,
  } = useCanvasShapes({ editor })

  // Create a voice note at cursor position
  const handleRecording = async (blob, path) => {
    await createVoiceNote({
      audioPath: path,
      audioBlob: blob,
      title: 'My Recording',
      duration: 30,
      autoTranscribe: true,
      position: { x: 100, y: 100 },
    })
  }
}
```

### useCanvasExport

Manage canvas export workflow.

```tsx
import { useCanvasExport } from '@/components/quarry/hooks/useCanvasExport'

function ExportButton({ editor }) {
  const {
    isExporting,
    exportResult,
    exportError,
    startExport,
    resetExport,
  } = useCanvasExport({
    editor,
    onExportComplete: (result) => console.log('Exported:', result),
  })

  return (
    <button onClick={startExport} disabled={isExporting}>
      {isExporting ? 'Exporting...' : 'Export'}
    </button>
  )
}
```

### useHaptics

Provide haptic feedback on touch devices.

```tsx
import { useHaptics } from '@/components/quarry/hooks/useHaptics'

function TouchButton() {
  const { haptic, canVibrate } = useHaptics()

  return (
    <button onClick={() => {
      haptic('medium')  // 50ms vibration
      // do action
    }}>
      Tap me
    </button>
  )
}
```

**Haptic Patterns:**
- `light` - 10ms (button taps)
- `medium` - 50ms (standard feedback)
- `heavy` - 100ms (confirmations)
- `success` - [50, 30, 50] (double pulse)
- `error` - [100, 50, 100, 50, 100] (triple pulse)
- `selection` - 30ms (menu items)
- `longPress` - 80ms (context menus)

---

## Export Utilities

### canvasToMarkdown

Convert canvas shapes to structured markdown.

```tsx
import { canvasToMarkdown, canvasHasContent } from './canvas/canvasToMarkdown'

// Check if canvas has exportable content
if (canvasHasContent(editor)) {
  const result = await canvasToMarkdown(editor, {
    title: 'My Canvas Notes',
    tags: ['canvas', 'voice-notes'],
    includeDrawings: true,
    groupBy: 'type',
  })

  console.log(result.markdown)      // Generated markdown
  console.log(result.frontmatter)   // YAML frontmatter object
  console.log(result.assets)        // Files to save
  console.log(result.metadata)      // Export statistics
}
```

**Export Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | 'Canvas Export' | Strand title |
| `tags` | string[] | ['canvas', 'export'] | Strand tags |
| `includeDrawings` | boolean | true | Export drawings as SVG |
| `groupBy` | 'type' \| 'position' | 'type' | Content organization |
| `includeLinkedAudio` | boolean | true | Include linked audio with transcripts |

**Shape-to-Markdown Mapping:**

| Shape | Markdown Output |
|-------|----------------|
| VoiceNoteShape | `## Title` + `<audio>` + transcript |
| TranscriptShape | `## Title` + blockquote + tags |
| AttachmentShape (image) | `![alt](path)` |
| AttachmentShape (file) | `**[filename](path)**` |
| Drawing shapes | Exported SVG embedded as image |

---

## Mobile Touch Support

### Long-Press Context Menu

The canvas supports long-press (500ms) to open the radial menu on touch devices.

```tsx
// Already integrated in WhiteboardCanvas
<div
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
  onTouchCancel={handleTouchEnd}
>
  <Tldraw ... />
</div>
```

**Behavior:**
- 500ms hold triggers menu
- 10px movement cancels
- Haptic feedback on activation

### Touch Target Utilities

CSS utilities for touch-friendly interfaces:

```css
/* In globals.css */
.touch-target     { min-height: 44px; min-width: 44px; }
.touch-target-lg  { min-height: 48px; min-width: 48px; }
.touch-target-xl  { min-height: 56px; min-width: 56px; }

.touch-button     { /* 44px + padding + no-select */ }
.touch-button-lg  { /* 48px + padding + no-select */ }

.pb-safe          { padding-bottom: env(safe-area-inset-bottom); }
.pt-safe          { padding-top: env(safe-area-inset-top); }
```

### MobileCanvasToolbar

Bottom-positioned toolbar for touch devices.

```tsx
import MobileCanvasToolbar from './canvas/MobileCanvasToolbar'

<MobileCanvasToolbar
  editor={editor}
  activeTool="draw"
  canUndo={true}
  canRedo={false}
  onOpenVoice={() => setVoiceRecorderOpen(true)}
  onOpenCamera={() => setCameraOpen(true)}
  theme="dark"
  visible={isMobile}
/>
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+N` / `Ctrl+N` | Create new blank strand |
| `Cmd+Shift+N` / `Ctrl+Shift+N` | Open strand wizard |
| `Cmd+E` / `Ctrl+E` | Export canvas as strand |
| `Cmd+S` / `Ctrl+S` | Save/export drawing |

---

## Theme Colors

Shapes automatically adapt to light/dark themes:

```typescript
const SHAPE_THEME_COLORS = {
  voicenote: {
    light: { bg: '#fef2f2', border: '#fecaca', accent: '#ef4444', text: '#991b1b' },
    dark:  { bg: '#450a0a', border: '#7f1d1d', accent: '#f87171', text: '#fecaca' },
  },
  transcript: {
    light: { bg: '#faf5ff', border: '#e9d5ff', accent: '#a855f7', text: '#6b21a8' },
    dark:  { bg: '#3b0764', border: '#6b21a8', accent: '#c084fc', text: '#e9d5ff' },
  },
  attachment: {
    light: { bg: '#f0fdf4', border: '#bbf7d0', accent: '#22c55e', text: '#166534' },
    dark:  { bg: '#052e16', border: '#166534', accent: '#4ade80', text: '#bbf7d0' },
  },
}
```

---

## Size Constraints

| Shape | Min | Default | Max |
|-------|-----|---------|-----|
| VoiceNote | 200×100 | 400×120 | 600×200 |
| Transcript | 200×100 | 300×200 | 500×∞ |
| Attachment | 150×150 | 200×200 | 400×400 |

---

## File Structure

```
components/quarry/ui/canvas/
├── shapes/
│   ├── VoiceNoteShape/
│   │   ├── VoiceNoteShapeUtil.tsx   # Shape definition
│   │   ├── VoiceNoteComponent.tsx   # Interactive UI
│   │   └── WaveformCanvas.tsx       # Waveform visualization
│   ├── TranscriptShape/
│   │   ├── TranscriptShapeUtil.tsx
│   │   └── TranscriptComponent.tsx
│   ├── AttachmentShape/
│   │   ├── AttachmentShapeUtil.tsx
│   │   └── AttachmentComponent.tsx
│   ├── types.ts                     # Type definitions
│   └── index.ts                     # Exports
├── canvasToMarkdown.ts              # Export utility
├── MobileCanvasToolbar.tsx          # Touch toolbar
├── useCanvasShapes.ts               # Shape creation hook
└── README.md                        # This file

components/quarry/hooks/
├── useHaptics.ts                    # Haptic feedback
├── useCanvasExport.ts               # Export workflow
├── useCodexHotkeys.ts               # Keyboard shortcuts
└── useIsTouchDevice.ts              # Touch detection

components/quarry/ui/
├── WhiteboardCanvas.tsx             # Main canvas component
├── CanvasExportModal.tsx            # Export modal
├── QuickCreateFAB.tsx               # Quick create button
└── RadialMediaMenu.tsx              # Context menu
```

---

## Integration Example

Complete integration with a Codex viewer:

```tsx
import { useState, useCallback } from 'react'
import WhiteboardCanvas from '@/components/quarry/ui/WhiteboardCanvas'
import CanvasExportModal from '@/components/quarry/ui/CanvasExportModal'
import QuickCreateFAB from '@/components/quarry/ui/QuickCreateFAB'
import { useCodexHotkeys } from '@/components/quarry/hooks/useCodexHotkeys'
import { canvasHasContent } from '@/components/quarry/ui/canvas/canvasToMarkdown'

function CodexViewer() {
  const [canvasOpen, setCanvasOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [editor, setEditor] = useState(null)

  // Keyboard shortcuts
  useCodexHotkeys({
    onNewBlank: () => router.push('/quarry/new?mode=blank'),
    onNewWizard: () => router.push('/quarry/new'),
    onExportCanvas: () => setExportOpen(true),
  })

  const handleExport = useCallback((result) => {
    // Save strand with generated markdown
    saveStrand({
      content: result.markdown,
      frontmatter: result.frontmatter,
    })

    // Save assets
    result.assets.forEach(async (asset) => {
      if (asset.blob) {
        await saveAsset(asset.path, asset.blob)
      }
    })
  }, [])

  return (
    <>
      {/* Quick Create FAB */}
      <QuickCreateFAB
        onNewBlank={() => router.push('/quarry/new?mode=blank')}
        onFromCanvas={() => setExportOpen(true)}
        onFromTemplate={() => router.push('/quarry/new')}
        canvasHasContent={editor ? canvasHasContent(editor) : false}
        theme="dark"
      />

      {/* Canvas */}
      <WhiteboardCanvas
        isOpen={canvasOpen}
        onClose={() => setCanvasOpen(false)}
        onSave={(svg) => console.log('Saved drawing')}
        theme="dark"
      />

      {/* Export Modal */}
      <CanvasExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        editor={editor}
        onExport={handleExport}
        theme="dark"
      />
    </>
  )
}
```

---

## Best Practices

### Performance

1. **Lazy load canvas** - Use `dynamic()` import for WhiteboardCanvas
2. **Memoize callbacks** - Use `useCallback` for shape creation handlers
3. **Debounce exports** - Don't export on every change

### Accessibility

1. **Touch targets** - Use `.touch-target` (44px min) on all buttons
2. **Keyboard navigation** - Support all shortcuts with Cmd/Ctrl variants
3. **Screen readers** - Add aria-labels to interactive elements

### Mobile

1. **Safe areas** - Use `.pb-safe` for bottom-positioned UI
2. **Haptics** - Call `haptic()` on significant interactions
3. **Large targets** - Use 48-56px buttons on touch devices

---

---

## KnowledgeCanvas

> High-level knowledge visualization canvas for strands, looms, and weaves

The KnowledgeCanvas is a **separate canvas** from WhiteboardCanvas, designed specifically for organizing and visualizing knowledge structure. While WhiteboardCanvas is for drawing and media capture, KnowledgeCanvas is for drag-and-drop organization of existing content.

### Quick Start

```tsx
import KnowledgeCanvas from '@/components/quarry/ui/KnowledgeCanvas'

function BrowsePage() {
  const [layout, setLayout] = useState<LayoutPreset>('grid')

  return (
    <KnowledgeCanvas
      strands={strands}
      layout={layout}
      onLayoutChange={setLayout}
      onStrandClick={(strand) => router.push(strand.path)}
      onStrandDrop={(data, position) => console.log('Dropped:', data)}
      isDark={theme === 'dark'}
      canvasId="browse-canvas"
    />
  )
}
```

### Layout Presets

| Preset | Description | Best For |
|--------|-------------|----------|
| `freeform` | User-positioned, no auto-layout | Manual organization |
| `grid` | Row-major grid layout | Clean overview |
| `force` | D3 force-directed graph | Relationship visualization |
| `timeline` | Horizontal date-based layout | Chronological view |
| `cluster` | K-means clustering by tags | Topic grouping |

### Custom Shapes

#### StrandShape

Knowledge unit card with metadata.

```typescript
interface StrandShapeProps {
  strandId: string           // Unique identifier
  strandPath: string         // File path
  title: string              // Display title
  summary?: string           // Short description
  thumbnailUrl?: string      // Preview image
  tags: string[]             // Tag pills
  weaveSlug?: string         // Parent weave
  loomSlug?: string          // Parent loom
  createdAt: string          // ISO timestamp
  collapsed: boolean         // Compact mode
  highlighted: boolean       // Visual emphasis
}
```

#### LoomShape

Container grouping multiple strands.

```typescript
interface LoomShapeProps {
  loomId: string             // Unique identifier
  loomPath: string           // File path
  title: string              // Display title
  description?: string       // Description
  childStrandIds: string[]   // Contained strands
  backgroundColor: string    // Theme color
  expanded: boolean          // Show children
}
```

#### WeaveShape

Knowledge universe region.

```typescript
interface WeaveShapeProps {
  weaveId: string            // Unique identifier
  weavePath: string          // File path
  title: string              // Display title
  description?: string       // Description
  childLoomIds: string[]     // Contained looms
  childStrandIds: string[]   // Direct strands
  regionColor: string        // Background color
  regionOpacity: number      // 0-1 transparency
}
```

#### ConnectionShape

Relationship link between strands.

```typescript
interface ConnectionShapeProps {
  connectionId: string       // Unique identifier
  sourceStrandId: string     // Start shape
  targetStrandId: string     // End shape
  relationshipType: 'related' | 'references' | 'contradicts' | 'supports'
  strength: number           // 0-1 visual weight
  label?: string             // Optional label
}
```

### Drag and Drop

#### Making Elements Draggable

```tsx
import { useCanvasDragSource, CANVAS_DROP_MIME } from '@/components/quarry/ui/canvas/useCanvasDrop'

function DraggableStrandCard({ strand }) {
  const dragProps = useCanvasDragSource({
    type: 'strand',
    id: strand.id,
    path: strand.path,
    title: strand.title,
    summary: strand.summary,
    tags: strand.tags,
  })

  return (
    <div {...dragProps} className="cursor-grab">
      <StrandCard strand={strand} />
    </div>
  )
}
```

#### Handling Drops

```tsx
import { useCanvasDrop } from '@/components/quarry/ui/canvas/useCanvasDrop'

function CanvasWrapper({ editor }) {
  const { dropZoneRef, dropState, dropHandlers } = useCanvasDrop(
    editor,
    (data, position) => {
      console.log(`Dropped ${data.title} at (${position.x}, ${position.y})`)
    }
  )

  return (
    <div
      ref={dropZoneRef}
      {...dropHandlers}
      className={dropState.isOver ? 'ring-2 ring-emerald-500' : ''}
    >
      <Tldraw ... />
    </div>
  )
}
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `V` | Toggle view mode (list/split/canvas) |
| `G` | Toggle snap-to-grid |
| `1-5` | Switch layout preset |
| `F` | Fit to view |
| `Cmd+0` | Reset zoom |
| `Cmd++` | Zoom in |
| `Cmd+-` | Zoom out |
| `Delete` | Remove selected shapes |
| `Cmd+A` | Select all |
| `Escape` | Deselect all |

### State Persistence

Canvas state is automatically saved to localStorage:

```tsx
import { useCanvasPersistence } from '@/components/quarry/ui/canvas/useCanvasPersistence'

function CanvasComponent({ editor, layout }) {
  const {
    saveState,      // Manual save
    loadState,      // Load saved state
    restoreCamera,  // Restore viewport
    clearState,     // Clear saved data
    getPersistedLayout,  // Get saved layout
  } = useCanvasPersistence({
    canvasId: 'my-canvas',
    editor,
    layout,
    autoSave: true,        // Enable auto-save
    autoSaveInterval: 2000 // Debounce interval
  })

  // State is automatically restored on mount
  // and saved on changes
}
```

### Source Tracking

Auto-detect platform from URLs for imported content:

```tsx
import { detectPlatform, extractPlatformMetadata } from '@/lib/canvas/sourceDetection'

// Detect platform
const platform = detectPlatform('https://pinterest.com/pin/123456')
// Returns: 'pinterest'

// Extract metadata
const metadata = extractPlatformMetadata('https://youtube.com/watch?v=abc123')
// Returns: {
//   platform: 'youtube',
//   contentId: 'abc123',
//   thumbnailUrl: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
//   embedUrl: 'https://www.youtube.com/embed/abc123',
//   platformName: 'YouTube',
//   accentColor: '#FF0000',
//   iconName: 'youtube'
// }
```

**Supported Platforms:**
- Pinterest, Instagram, Twitter/X, YouTube
- GitHub, Medium, Notion, TikTok
- LinkedIn, Reddit, Dribbble, Behance
- Figma, Spotify, SoundCloud
- Generic (any URL with OG tags)

### Source Badge Component

```tsx
import { SourceBadge, SourceIndicator } from '@/components/quarry/ui/canvas/SourceBadge'

// Full badge with label
<SourceBadge
  source={metadata}
  size="md"
  showLabel={true}
/>

// Compact icon only
<SourceIndicator
  platform="youtube"
  url="https://youtube.com/watch?v=abc"
  size={20}
/>
```

### Mobile Support

The KnowledgeMobileToolbar provides touch-optimized controls:

```tsx
import { KnowledgeMobileToolbar } from '@/components/quarry/ui/canvas/KnowledgeMobileToolbar'

<KnowledgeMobileToolbar
  currentLayout={layout}
  onLayoutChange={setLayout}
  isDark={theme === 'dark'}
  visible={isMobile}
/>
```

**Features:**
- Bottom-positioned for thumb reach
- Layout preset picker popup
- Zoom controls (in/out/fit)
- Safe area inset support
- Spring animations

### View Modes in Browse

The browse page supports three view modes:

```tsx
import BrowseViewToggle from '@/components/quarry/ui/BrowseViewToggle'

<BrowseViewToggle
  value={viewMode}
  onChange={setViewMode}
  options={['list', 'split', 'canvas']}
/>
```

| Mode | Description |
|------|-------------|
| `list` | Traditional grid view of strand cards |
| `canvas` | Full KnowledgeCanvas replacing content area |
| `split` | Resizable split view with list + canvas |

### File Structure

```
components/quarry/ui/
├── KnowledgeCanvas.tsx          # Main knowledge canvas
├── BrowseViewToggle.tsx         # View mode switcher
└── canvas/
    ├── shapes/
    │   ├── StrandShape/         # Knowledge unit cards
    │   ├── LoomShape/           # Topic containers
    │   ├── WeaveShape/          # Universe regions
    │   └── ConnectionShape/     # Relationship links
    ├── useCanvasDrop.ts         # Drag-drop handling
    ├── useCanvasShortcuts.ts    # Keyboard shortcuts
    ├── useCanvasPersistence.ts  # State persistence
    ├── KnowledgeMobileToolbar.tsx  # Mobile toolbar
    └── SourceBadge.tsx          # Platform badges

lib/canvas/
└── sourceDetection.ts           # Platform detection
```

---

## Troubleshooting

### Canvas not loading

```tsx
// Ensure dynamic import for SSR
const WhiteboardCanvas = dynamic(
  () => import('./WhiteboardCanvas'),
  { ssr: false }
)
```

### Shapes not rendering

```tsx
// Register custom shape utils
<Tldraw
  shapeUtils={CUSTOM_SHAPE_UTILS}
  ...
/>
```

### Audio not playing

Check that audio files are served from correct path:
```
/strand-folder/assets/audio/voice-*.webm
```

### Export missing assets

Ensure blob data is available before export:
```tsx
// Assets with blobs need to be saved separately
result.assets.filter(a => a.blob).forEach(saveAsset)
```
