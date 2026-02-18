/**
 * Demo Content for Canvas Showcase
 * @module quarry/canvas-showcase/demoContent
 *
 * Pre-populated shapes and content for demonstrating the infinite canvas capabilities.
 * Includes various shape types arranged in an aesthetically pleasing layout.
 */

import type { TLShapeId } from '@tldraw/tldraw'
import { createShapeId } from '@tldraw/tldraw'

/** Generate unique shape IDs */
const id = (name: string): TLShapeId => createShapeId(name)

/**
 * Demo sticky notes with various colors and content
 */
export const DEMO_STICKY_NOTES = [
  {
    id: id('sticky-1'),
    type: 'stickynote' as const,
    x: 100,
    y: 100,
    props: {
      w: 200,
      h: 180,
      text: '💡 Big Ideas\n\n• Knowledge graphs\n• Infinite canvases\n• Visual thinking',
      color: 'yellow' as const,
      fontSize: 'md' as const,
      rotation: -2,
    },
  },
  {
    id: id('sticky-2'),
    type: 'stickynote' as const,
    x: 340,
    y: 120,
    props: {
      w: 180,
      h: 160,
      text: '🔥 Hot takes\n\nCanvas > Documents\nfor brainstorming',
      color: 'pink' as const,
      fontSize: 'md' as const,
      rotation: 3,
    },
  },
  {
    id: id('sticky-3'),
    type: 'stickynote' as const,
    x: 550,
    y: 80,
    props: {
      w: 200,
      h: 200,
      text: '🎯 Goals\n\n1. Ship the canvas\n2. Add more shapes\n3. World domination',
      color: 'blue' as const,
      fontSize: 'md' as const,
      rotation: -1,
    },
  },
  {
    id: id('sticky-4'),
    type: 'stickynote' as const,
    x: 780,
    y: 140,
    props: {
      w: 180,
      h: 150,
      text: '✨ Remember:\nSimplicity wins',
      color: 'green' as const,
      fontSize: 'lg' as const,
      rotation: 2,
    },
  },
]

/**
 * Demo frames for organizing content
 */
export const DEMO_FRAMES = [
  {
    id: id('frame-research'),
    type: 'frame' as const,
    x: 50,
    y: 350,
    props: {
      w: 500,
      h: 400,
      title: 'Research & Inspiration',
      backgroundColor: '#eff6ff',
      showTitle: true,
      collapsed: false,
      borderColor: '#3b82f6',
      borderStyle: 'dashed' as const,
    },
  },
  {
    id: id('frame-tech'),
    type: 'frame' as const,
    x: 600,
    y: 350,
    props: {
      w: 450,
      h: 400,
      title: 'Tech Stack',
      backgroundColor: '#f0fdf4',
      showTitle: true,
      collapsed: false,
      borderColor: '#22c55e',
      borderStyle: 'dashed' as const,
    },
  },
  {
    id: id('frame-ideas'),
    type: 'frame' as const,
    x: 1100,
    y: 100,
    props: {
      w: 350,
      h: 650,
      title: 'Feature Ideas',
      backgroundColor: '#faf5ff',
      showTitle: true,
      collapsed: false,
      borderColor: '#a855f7',
      borderStyle: 'dashed' as const,
    },
  },
]

/**
 * Demo link previews for reference materials
 */
export const DEMO_LINK_PREVIEWS = [
  {
    id: id('link-tldraw'),
    type: 'linkpreview' as const,
    x: 80,
    y: 400,
    props: {
      w: 280,
      h: 140,
      url: 'https://tldraw.dev',
      title: 'tldraw',
      description: 'A very good library for creating infinite canvas experiences.',
      thumbnailUrl: '',
      siteName: 'tldraw',
      faviconUrl: 'https://tldraw.dev/favicon.ico',
      loading: false,
      error: '',
    },
  },
  {
    id: id('link-obsidian'),
    type: 'linkpreview' as const,
    x: 80,
    y: 560,
    props: {
      w: 280,
      h: 140,
      url: 'https://obsidian.md/canvas',
      title: 'Obsidian Canvas',
      description: 'A new way to brainstorm and organize your ideas alongside your notes.',
      thumbnailUrl: '',
      siteName: 'Obsidian',
      faviconUrl: 'https://obsidian.md/favicon.ico',
      loading: false,
      error: '',
    },
  },
  {
    id: id('link-nextjs'),
    type: 'linkpreview' as const,
    x: 620,
    y: 400,
    props: {
      w: 280,
      h: 140,
      url: 'https://nextjs.org',
      title: 'Next.js by Vercel',
      description: 'The React Framework for the Web. Used by some of the world\'s largest companies.',
      thumbnailUrl: '',
      siteName: 'Next.js',
      faviconUrl: 'https://nextjs.org/favicon.ico',
      loading: false,
      error: '',
    },
  },
  {
    id: id('link-tailwind'),
    type: 'linkpreview' as const,
    x: 620,
    y: 560,
    props: {
      w: 280,
      h: 140,
      url: 'https://tailwindcss.com',
      title: 'Tailwind CSS',
      description: 'Rapidly build modern websites without ever leaving your HTML.',
      thumbnailUrl: '',
      siteName: 'Tailwind CSS',
      faviconUrl: 'https://tailwindcss.com/favicons/favicon.ico',
      loading: false,
      error: '',
    },
  },
]

/**
 * Demo strands representing knowledge units
 */
export const DEMO_STRANDS = [
  {
    id: id('strand-canvas-basics'),
    type: 'strand' as const,
    x: 1130,
    y: 160,
    props: {
      w: 280,
      h: 150,
      strandId: 'canvas-basics',
      strandPath: '/quarry/weaves/design/looms/ui/strands/canvas-basics',
      title: 'Infinite Canvas Basics',
      summary: 'An introduction to infinite canvas interfaces, their history, and design principles.',
      thumbnailPath: undefined,
      tags: ['canvas', 'ui', 'design'],
      difficulty: 'beginner' as const,
      weaveSlug: 'design',
      loomSlug: 'ui',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      collapsed: false,
      highlighted: true,
      colorOverride: undefined,
    },
  },
  {
    id: id('strand-tldraw-custom'),
    type: 'strand' as const,
    x: 1130,
    y: 330,
    props: {
      w: 280,
      h: 150,
      strandId: 'tldraw-custom-shapes',
      strandPath: '/quarry/weaves/tech/looms/libraries/strands/tldraw-custom',
      title: 'Custom Shapes in tldraw',
      summary: 'How to extend tldraw with custom shapes, tools, and behaviors.',
      thumbnailPath: undefined,
      tags: ['tldraw', 'react', 'typescript'],
      difficulty: 'intermediate' as const,
      weaveSlug: 'tech',
      loomSlug: 'libraries',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      collapsed: false,
      highlighted: false,
      colorOverride: undefined,
    },
  },
  {
    id: id('strand-knowledge-graphs'),
    type: 'strand' as const,
    x: 1130,
    y: 500,
    props: {
      w: 280,
      h: 150,
      strandId: 'knowledge-graphs',
      strandPath: '/quarry/weaves/research/looms/methods/strands/knowledge-graphs',
      title: 'Knowledge Graphs 101',
      summary: 'Understanding knowledge graphs, their structure, and applications in learning systems.',
      thumbnailPath: undefined,
      tags: ['knowledge', 'graphs', 'learning'],
      difficulty: 'advanced' as const,
      weaveSlug: 'research',
      loomSlug: 'methods',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      collapsed: false,
      highlighted: false,
      colorOverride: undefined,
    },
  },
]

/**
 * Demo collection grouping related strands
 */
export const DEMO_COLLECTIONS = [
  {
    id: id('collection-getting-started'),
    type: 'collection' as const,
    x: 1500,
    y: 150,
    props: {
      w: 320,
      h: 280,
      collectionId: 'getting-started',
      collectionPath: undefined,
      title: '🚀 Getting Started',
      description: 'Essential strands for newcomers to the canvas experience',
      strandCount: 3,
      color: '#8b5cf6',
      icon: 'rocket',
      expanded: true,
      highlighted: false,
      viewMode: 'cards' as const,
      strands: [
        { id: 'canvas-basics', title: 'Infinite Canvas Basics', path: '/path/1' },
        { id: 'tldraw-custom-shapes', title: 'Custom Shapes in tldraw', path: '/path/2' },
        { id: 'knowledge-graphs', title: 'Knowledge Graphs 101', path: '/path/3' },
      ],
      crossWeave: true,
      crossLoom: false,
      weavesSlugs: ['design', 'tech', 'research'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSmart: false,
    },
  },
]

/**
 * Additional sticky notes inside frames
 */
export const DEMO_FRAME_STICKIES = [
  {
    id: id('sticky-frame-1'),
    type: 'stickynote' as const,
    x: 400,
    y: 420,
    props: {
      w: 120,
      h: 120,
      text: 'Miro\n✅ Real-time\n✅ Templates',
      color: 'orange' as const,
      fontSize: 'sm' as const,
      rotation: 1,
    },
  },
  {
    id: id('sticky-frame-2'),
    type: 'stickynote' as const,
    x: 400,
    y: 560,
    props: {
      w: 120,
      h: 120,
      text: 'FigJam\n✅ Design tool\n✅ Playful',
      color: 'purple' as const,
      fontSize: 'sm' as const,
      rotation: -2,
    },
  },
  {
    id: id('sticky-tech-1'),
    type: 'stickynote' as const,
    x: 920,
    y: 420,
    props: {
      w: 110,
      h: 100,
      text: 'React 18+\n⚡ Concurrent',
      color: 'blue' as const,
      fontSize: 'sm' as const,
      rotation: 2,
    },
  },
  {
    id: id('sticky-tech-2'),
    type: 'stickynote' as const,
    x: 920,
    y: 540,
    props: {
      w: 110,
      h: 100,
      text: 'TypeScript\n💪 Type-safe',
      color: 'blue' as const,
      fontSize: 'sm' as const,
      rotation: -1,
    },
  },
]

/**
 * Combined array of all demo shapes
 */
export const ALL_DEMO_SHAPES = [
  ...DEMO_FRAMES,
  ...DEMO_STICKY_NOTES,
  ...DEMO_LINK_PREVIEWS,
  ...DEMO_STRANDS,
  ...DEMO_COLLECTIONS,
  ...DEMO_FRAME_STICKIES,
]

/**
 * Canvas view settings for the demo
 */
export const DEMO_CANVAS_SETTINGS = {
  initialZoom: 0.85,
  initialCenter: { x: 700, y: 400 },
  backgroundColor: '#fafafa',
}

/**
 * Export format for saving canvas state
 */
export interface CanvasExportData {
  version: number
  shapes: typeof ALL_DEMO_SHAPES
  settings: typeof DEMO_CANVAS_SETTINGS
  exportedAt: string
}

/**
 * Create exportable canvas data
 */
export function createCanvasExportData(): CanvasExportData {
  return {
    version: 1,
    shapes: ALL_DEMO_SHAPES,
    settings: DEMO_CANVAS_SETTINGS,
    exportedAt: new Date().toISOString(),
  }
}

