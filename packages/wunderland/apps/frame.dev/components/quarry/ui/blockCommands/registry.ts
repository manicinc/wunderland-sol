/**
 * Block Command Registry
 * @module quarry/ui/blockCommands/registry
 *
 * Defines all available block commands for the inline editor.
 * Commands are organized by category and include metadata for
 * display in the command palette.
 */

import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  CheckSquare,
  CheckCircle2,
  Image,
  ImagePlus,
  Code,
  Quote,
  AlertCircle,
  Minus,
  Video,
  Table,
  ChevronDown,
  Paperclip,
  Sparkles,
  Search,
  PenTool,
  FileText,
  Layers,
  LayoutGrid,
  Link2,
  Calculator,
  Map as MapIcon,
  Calendar,
  BarChart3,
  ListTree,
} from 'lucide-react'
import type { BlockCommand, BlockCommandCategory, BlockCommandCategoryInfo } from './types'

/**
 * Category definitions with display metadata
 */
export const BLOCK_COMMAND_CATEGORIES: BlockCommandCategoryInfo[] = [
  { id: 'basic', name: 'Basic', icon: Type, priority: 1 },
  { id: 'content', name: 'Content', icon: Layers, priority: 2 },
  { id: 'advanced', name: 'Advanced', icon: LayoutGrid, priority: 3 },
  { id: 'dynamic', name: 'Dynamic', icon: Calculator, priority: 4 },
  { id: 'ai', name: 'AI & Tools', icon: Sparkles, priority: 5 },
]

/**
 * Get category info by ID
 */
export function getCategoryInfo(category: BlockCommandCategory): BlockCommandCategoryInfo {
  return BLOCK_COMMAND_CATEGORIES.find(c => c.id === category) || BLOCK_COMMAND_CATEGORIES[0]
}

/**
 * All available block commands
 */
export const BLOCK_COMMANDS: BlockCommand[] = [
  // ─────────────────────────────────────────────────────────────
  // BASIC BLOCKS
  // ─────────────────────────────────────────────────────────────
  {
    id: 'paragraph',
    name: 'Paragraph',
    description: 'Plain text paragraph',
    keywords: ['text', 'plain', 'body', 'p'],
    icon: Type,
    category: 'basic',
    markdown: '\n\n',
  },
  {
    id: 'heading1',
    name: 'Heading 1',
    description: 'Large section heading',
    keywords: ['title', 'h1', 'header', 'big'],
    icon: Heading1,
    category: 'basic',
    shortcut: 'Cmd+Alt+1',
    markdown: '# ',
  },
  {
    id: 'heading2',
    name: 'Heading 2',
    description: 'Medium section heading',
    keywords: ['subtitle', 'h2', 'header'],
    icon: Heading2,
    category: 'basic',
    shortcut: 'Cmd+Alt+2',
    markdown: '## ',
  },
  {
    id: 'heading3',
    name: 'Heading 3',
    description: 'Small section heading',
    keywords: ['h3', 'header', 'subheading'],
    icon: Heading3,
    category: 'basic',
    shortcut: 'Cmd+Alt+3',
    markdown: '### ',
  },
  {
    id: 'heading4',
    name: 'Heading 4',
    description: 'Smallest heading',
    keywords: ['h4', 'header', 'minor'],
    icon: Heading4,
    category: 'basic',
    shortcut: 'Cmd+Alt+4',
    markdown: '#### ',
  },
  {
    id: 'bullet-list',
    name: 'Bullet List',
    description: 'Unordered list with bullets',
    keywords: ['ul', 'unordered', 'bullets', 'points'],
    icon: List,
    category: 'basic',
    markdown: '- ',
  },
  {
    id: 'numbered-list',
    name: 'Numbered List',
    description: 'Ordered list with numbers',
    keywords: ['ol', 'ordered', 'numbers', 'steps'],
    icon: ListOrdered,
    category: 'basic',
    markdown: '1. ',
  },
  {
    id: 'task-list',
    name: 'Task List',
    description: 'Checklist with checkboxes',
    keywords: ['todo', 'checkbox', 'checklist', 'tasks'],
    icon: CheckSquare,
    category: 'basic',
    markdown: '- [ ] ',
  },

  // ─────────────────────────────────────────────────────────────
  // CONTENT BLOCKS
  // ─────────────────────────────────────────────────────────────
  {
    id: 'image',
    name: 'Image',
    description: 'Upload or embed an image',
    keywords: ['photo', 'picture', 'img', 'upload'],
    icon: Image,
    category: 'content',
    markdown: '![Image description]()',
    requiresInput: true, // Will open file picker
  },
  {
    id: 'code-block',
    name: 'Code Block',
    description: 'Syntax-highlighted code',
    keywords: ['code', 'snippet', 'programming', 'syntax'],
    icon: Code,
    category: 'content',
    shortcut: 'Cmd+Alt+C',
    markdown: '```\n\n```',
  },
  {
    id: 'quote',
    name: 'Quote',
    description: 'Blockquote for citations',
    keywords: ['blockquote', 'citation', 'quotation'],
    icon: Quote,
    category: 'content',
    markdown: '> ',
  },
  {
    id: 'callout-info',
    name: 'Info Callout',
    description: 'Highlighted info box',
    keywords: ['alert', 'note', 'tip', 'info', 'box'],
    icon: AlertCircle,
    category: 'content',
    markdown: '> [!info] Info\n> Your content here\n',
  },
  {
    id: 'callout-warning',
    name: 'Warning Callout',
    description: 'Warning or caution box',
    keywords: ['alert', 'warning', 'caution', 'danger'],
    icon: AlertCircle,
    category: 'content',
    markdown: '> [!warning] Warning\n> Your content here\n',
  },
  {
    id: 'callout-success',
    name: 'Success Callout',
    description: 'Success or tip box',
    keywords: ['success', 'tip', 'done', 'check'],
    icon: AlertCircle,
    category: 'content',
    markdown: '> [!success] Success\n> Your content here\n',
  },
  {
    id: 'divider',
    name: 'Divider',
    description: 'Horizontal line separator',
    keywords: ['hr', 'line', 'separator', 'break'],
    icon: Minus,
    category: 'content',
    markdown: '\n---\n',
  },

  // ─────────────────────────────────────────────────────────────
  // ADVANCED BLOCKS
  // ─────────────────────────────────────────────────────────────
  {
    id: 'video-embed',
    name: 'Video Embed',
    description: 'Embed YouTube, Vimeo, etc.',
    keywords: ['youtube', 'vimeo', 'video', 'embed', 'movie'],
    icon: Video,
    category: 'advanced',
    markdown: '![Video](https://youtube.com/watch?v=)',
    requiresInput: true, // Will prompt for URL
  },
  {
    id: 'table',
    name: 'Table',
    description: 'Insert a data table',
    keywords: ['grid', 'spreadsheet', 'data', 'columns', 'rows'],
    icon: Table,
    category: 'advanced',
    markdown: '| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n',
    requiresInput: true, // Could open table dimension picker
  },
  {
    id: 'toggle',
    name: 'Toggle / Accordion',
    description: 'Collapsible content section',
    keywords: ['collapse', 'expand', 'accordion', 'details', 'spoiler'],
    icon: ChevronDown,
    category: 'advanced',
    markdown: '<details>\n<summary>Click to expand</summary>\n\nHidden content here\n\n</details>\n',
  },
  {
    id: 'file-attachment',
    name: 'File Attachment',
    description: 'Attach a file or document',
    keywords: ['file', 'attachment', 'document', 'upload', 'pdf'],
    icon: Paperclip,
    category: 'advanced',
    markdown: '[Download File]()',
    requiresInput: true, // Will open file picker
  },

  // ─────────────────────────────────────────────────────────────
  // DYNAMIC DOCUMENT (Embark-style)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'formula',
    name: 'Formula',
    description: 'Insert a computed formula expression',
    keywords: ['formula', 'calculate', 'compute', 'math', 'function', 'expression'],
    icon: Calculator,
    category: 'dynamic',
    markdown: '',
    requiresInput: true, // Opens formula builder modal
  },
  {
    id: 'map-view',
    name: 'Map View',
    description: 'Embed an interactive map from locations',
    keywords: ['map', 'location', 'places', 'geography', 'gps', 'travel'],
    icon: MapIcon,
    category: 'dynamic',
    markdown: ':::map\n<!-- Map view renders locations mentioned in this strand -->\n:::\n',
    requiresInput: true, // Opens view configuration modal
  },
  {
    id: 'calendar-view',
    name: 'Calendar View',
    description: 'Embed a calendar from dates and events',
    keywords: ['calendar', 'dates', 'events', 'schedule', 'timeline', 'planning'],
    icon: Calendar,
    category: 'dynamic',
    markdown: ':::calendar\n<!-- Calendar view renders dates and events mentioned in this strand -->\n:::\n',
    requiresInput: true, // Opens view configuration modal
  },
  {
    id: 'chart-view',
    name: 'Chart View',
    description: 'Embed a chart from structured data',
    keywords: ['chart', 'graph', 'visualization', 'data', 'statistics', 'bar', 'line'],
    icon: BarChart3,
    category: 'dynamic',
    markdown: ':::chart\n<!-- Chart view renders data from this strand -->\n:::\n',
    requiresInput: true, // Opens chart configuration modal
  },
  {
    id: 'list-view',
    name: 'List View',
    description: 'Embed a structured list from entities',
    keywords: ['list', 'entities', 'items', 'collection', 'view'],
    icon: ListTree,
    category: 'dynamic',
    markdown: ':::list\n<!-- List view renders structured items from this strand -->\n:::\n',
    requiresInput: true, // Opens view configuration modal
  },

  // ─────────────────────────────────────────────────────────────
  // AI & TOOLS
  // ─────────────────────────────────────────────────────────────
  {
    id: 'ai-generate',
    name: 'AI Generate',
    description: 'Generate content with AI',
    keywords: ['ai', 'generate', 'write', 'assistant', 'gpt', 'claude'],
    icon: Sparkles,
    category: 'ai',
    markdown: '',
    requiresInput: true, // Opens AI prompt modal
  },
  {
    id: 'generate-image',
    name: 'Generate Image',
    description: 'Create an AI-generated image',
    keywords: ['image', 'picture', 'illustration', 'generate', 'ai', 'dalle', 'art', 'photo'],
    icon: ImagePlus,
    category: 'ai',
    markdown: '',
    requiresInput: true, // Opens image generation modal
  },
  {
    id: 'research-panel',
    name: 'Research',
    description: 'Open research panel',
    keywords: ['research', 'search', 'find', 'lookup', 'web'],
    icon: Search,
    category: 'ai',
    markdown: '',
    requiresInput: true, // Opens research sidebar
  },
  {
    id: 'drawing-canvas',
    name: 'Drawing Canvas',
    description: 'Create a freehand drawing',
    keywords: ['draw', 'sketch', 'canvas', 'diagram', 'whiteboard'],
    icon: PenTool,
    category: 'ai',
    markdown: '',
    requiresInput: true, // Opens canvas modal
  },
  {
    id: 'template',
    name: 'From Template',
    description: 'Insert from template library',
    keywords: ['template', 'snippet', 'preset', 'boilerplate'],
    icon: FileText,
    category: 'ai',
    markdown: '',
    requiresInput: true, // Opens template picker
  },
  {
    id: 'accomplishments',
    name: 'Accomplishments',
    description: 'Insert today\'s completed tasks',
    keywords: ['done', 'completed', 'tasks', 'achievements', 'what got done', 'wgd'],
    icon: CheckCircle2,
    category: 'ai',
    markdown: '',
    requiresInput: true, // Will fetch and insert accomplishments
  },
  {
    id: 'cross-link',
    name: 'Link to Note',
    description: 'Create a cross-link to another note',
    keywords: ['link', 'wiki', 'backlink', 'reference', 'connect', '[['],
    icon: Link2,
    category: 'ai',
    markdown: '[[]]',
    requiresInput: true, // Will open note picker
  },
]

/**
 * Get commands grouped by category
 */
export function getCommandsByCategory(): Map<BlockCommandCategory, BlockCommand[]> {
  const grouped = new Map<BlockCommandCategory, BlockCommand[]>()

  // Initialize empty arrays for each category
  for (const cat of BLOCK_COMMAND_CATEGORIES) {
    grouped.set(cat.id, [])
  }

  // Group commands
  for (const cmd of BLOCK_COMMANDS) {
    const list = grouped.get(cmd.category) || []
    list.push(cmd)
    grouped.set(cmd.category, list)
  }

  return grouped
}

/**
 * Filter commands by search query (fuzzy matching)
 */
export function filterCommands(query: string): BlockCommand[] {
  if (!query.trim()) {
    return BLOCK_COMMANDS
  }

  const lowerQuery = query.toLowerCase().trim()

  return BLOCK_COMMANDS.filter(cmd => {
    // Check name
    if (cmd.name.toLowerCase().includes(lowerQuery)) return true
    // Check description
    if (cmd.description.toLowerCase().includes(lowerQuery)) return true
    // Check keywords
    if (cmd.keywords.some(k => k.toLowerCase().includes(lowerQuery))) return true
    // Check id
    if (cmd.id.toLowerCase().includes(lowerQuery)) return true
    return false
  }).sort((a, b) => {
    // Prioritize exact name matches
    const aExact = a.name.toLowerCase().startsWith(lowerQuery)
    const bExact = b.name.toLowerCase().startsWith(lowerQuery)
    if (aExact && !bExact) return -1
    if (!aExact && bExact) return 1
    // Then by category priority
    const aCat = getCategoryInfo(a.category).priority
    const bCat = getCategoryInfo(b.category).priority
    return aCat - bCat
  })
}

/**
 * Get a command by ID
 */
export function getCommandById(id: string): BlockCommand | undefined {
  return BLOCK_COMMANDS.find(cmd => cmd.id === id)
}
