# Quarry Codex Viewer Components

Modular, type-safe, mobile-first components for browsing and contributing to **Quarry Codex** — our official public digital garden and knowledge repository.

## 📁 Structure

```
codex/
├── CodexViewer.tsx              # Main orchestrator (18 integrated components)
├── CodexSidebar.tsx             # File tree & knowledge tree with minimap
├── CodexContent.tsx             # Markdown renderer with fabric hierarchy guide
├── CodexMetadataPanel.tsx       # Right-hand info panel
├── CodexToolbar.tsx             # Actions & navigation (14 buttons)
├── types.ts                     # TypeScript definitions (12 interfaces)
├── constants.ts                 # Config, styling maps, neon color palette
├── utils.ts                     # Helper functions (15+ utilities)
├── index.ts                     # Barrel exports
├── hooks/
│   ├── useGithubTree.ts         # Fetch repo tree (GraphQL + REST fallback)
│   ├── useCodexHotkeys.ts       # Keyboard shortcuts (8 hotkeys)
│   ├── useSearchFilter.ts       # Advanced search with debouncing
│   ├── useBookmarks.ts          # localStorage bookmarks & history
│   ├── usePreferences.ts        # User preferences (theme, font, density)
│   ├── useSwipeGesture.ts       # Mobile swipe detection
│   ├── useFormValidation.ts     # Real-time form validation with debouncing
│   ├── useHelpSystem.ts         # Tour & contextual help state management
│   └── useUnsavedChangesWarning.ts # Beforeunload handler for forms
├── ui/
│   ├── SearchBar.tsx            # Search with expandable filters
│   ├── PaperCard.tsx            # Analog-styled container
│   ├── MobileToggle.tsx         # FAB for sidebar
│   ├── Tooltip.tsx              # Rich tooltips with keyboard hints
│   ├── HelpInfoPanel.tsx        # Keyboard shortcuts reference & tips
│   ├── HelpMenu.tsx             # Floating help button with tutorials
│   ├── BookmarksPanel.tsx       # Bookmarks & reading history
│   ├── PreferencesModal.tsx     # Settings (theme, font, density, etc.)
│   ├── TutorialTour.tsx         # Interactive guided tours
│   ├── MobileBottomNav.tsx      # Mobile 4-button navigation bar
│   ├── KnowledgeGraphView.tsx   # Force-directed graph visualization
│   ├── TimelineView.tsx         # Chronological reading history
│   ├── BreadcrumbMinimap.tsx    # Hover preview for breadcrumbs
│   ├── ContributeModal.tsx      # AI-assisted PR creation
│   ├── FlashcardQuizPopover.tsx # Anki-style flashcard quizzes with FSRS
│   ├── StrandMindMap.tsx        # D3 force-directed knowledge graph
│   ├── SuggestedQuestions.tsx   # Dynamic NLP-generated questions
│   ├── CreationStatusBar.tsx    # Live auto-save & NLP status
│   ├── GitHubPATConfig.tsx      # PAT configuration modal
│   ├── PublishWorkflow.tsx      # Draft → GitHub PR workflow
│   ├── LearningProgressDashboard.tsx  # XP, streaks, mastery tracking
│   ├── ValidatedFormField.tsx   # Inline validation display for forms
│   ├── MobileCreateWizardSheet.tsx # Mobile bottom sheet wizard (3 snap heights)
│   ├── TemplateContentEditor.tsx # WYSIWYG template editing
│   ├── TemplateEditorWithPreview.tsx # Split-view editor with live preview
│   ├── TemplateSourceSettings.tsx # Remote template repository management
│   ├── SocialSourceSettings.tsx # Social media import management
│   ├── SocialPlatformIcon.tsx   # Platform-branded icons (10+ platforms)
│   ├── SocialSourceBadge.tsx    # Attribution badges with engagement tooltips
│   ├── SocialImportCard.tsx     # URL paste → preview → import flow
│   └── tiptap/
│       └── PlaceholderMark.ts   # Tiptap extension for {placeholder} highlighting
├── hooks/
│   ├── useAutoSave.ts           # Auto-save with real-time NLP
│   └── ...
├── help/
│   ├── HelpContent.ts           # TypeScript interfaces for help data
│   ├── WizardTour.tsx           # Interactive spotlight walkthrough
│   ├── ContextualHelpPanel.tsx  # Collapsible help sidebar with search
│   ├── RichTooltip.tsx          # Enhanced tooltips with examples/cautions
│   └── content/
│       └── createNodeWizardHelp.ts # Help content for CreateNodeWizard
├── tutorials/
│   └── index.ts                 # 3 guided tours (Getting Started, Search, Contributing)
├── README.md                    # This file
├── MOBILE_GUIDE.md              # Mobile specifications
├── REFACTOR_SUMMARY.md          # Refactor details
├── SEARCH_GUIDE.md              # Search implementation guide
└── /docs/                       # Additional documentation
    ├── STRAND_CREATION_GUIDE.md # Creating & publishing strands
    ├── SUPERNOTES_GUIDE.md      # Zettelkasten-style index card notes
    ├── LEARNING_SYSTEM_GUIDE.md # Flashcards, quizzes, FSRS
    ├── NLP_GUIDE.md             # NLP implementation
    └── SEMANTIC_SEARCH_ARCHITECTURE.md # Search system
```

## 🚀 Quick Start

```tsx
import { CodexViewer } from '@/components/codex'

export default function MyPage() {
  return (
    <CodexViewer
      isOpen={true}
      mode="page"
      initialPath="weaves/tech"
    />
  )
}
```

### Point to ANY Codex Repository

The viewer can display **any** GitHub repository that follows the OpenStrand schema:

**Environment Configuration** (`.env.local`):
```bash
# Point to your own Codex
NEXT_PUBLIC_CODEX_REPO_OWNER=myorg
NEXT_PUBLIC_CODEX_REPO_NAME=my-knowledge-base
NEXT_PUBLIC_CODEX_REPO_BRANCH=main

# For private repositories
NEXT_PUBLIC_GH_PAT=ghp_your_personal_access_token
```

**How It Works**:
1. Viewer automatically fetches from the configured repository
2. Schema is analyzed and indexed on first load (instant after that)
3. Works with public repos (no PAT needed) or private repos (PAT required)
4. Must follow OpenStrand structure: weaves/looms/strands

**Create Your Own Codex**:
Use our [Codex Template](https://github.com/framersai/codex-template) which includes:
- Pre-configured OpenStrand schema
- GitHub Actions for auto-indexing
- Search index generation
- Example weaves and strands
- Ready to deploy to GitHub Pages

**NPM Package**:
The viewer is also available as a standalone package: [`@framers/codex-viewer`](https://www.npmjs.com/package/@framers/codex-viewer)

**Source Code**:
- Package: [frame.dev/packages/codex-viewer](https://github.com/framersai/frame.dev/tree/master/packages/codex-viewer)
- Components: [frame.dev/apps/frame.dev/components/codex](https://github.com/framersai/frame.dev/tree/master/apps/frame.dev/components/codex)
- Codex Repository: [framersai/codex](https://github.com/framersai/codex)

## 🎯 Features

### Knowledge Organization
- **Four-tier hierarchy**: **Fabric** (entire repo/collection of weaves) → **Weave** (self-contained universe) → **Loom** (any subdirectory) → **Strand** (markdown file at any depth)
- **Fabric**: Quarry Codex itself is a fabric containing multiple weaves
- **Organic structure**: No `/looms` or `/strands` folders required—hierarchy inferred dynamically from path depth
- **Auto-categorization**: Level badges with distinct neon colors (Fabric=monochrome, Weave=amber, Loom=cyan, Strand=violet)
- **Strand counts**: Each directory shows total markdown files in its subtree
- **Isolation**: Weaves are self-contained (no cross-weave references), strands can only link within their weave

### Search & Discovery
- **Hybrid overlay**: Ranked results drawer under the toolbar with quick-open actions
- **BM25 lexical ranking**: Uses `codex-search.json` postings generated in apps/codex (`npm run build:search`)
- **Semantic boost**: Optional on-device MiniLM rerank (no servers, no API keys, downloads once)
- **Hybrid embedding engine**: Automatic backend selection (ONNX Runtime Web → Transformers.js → Lexical fallback)
- **WebGPU acceleration**: 2-4× faster inference when available (see [ORT Integration Guide](./ORT_INTEGRATION.md))
- **Name/full-text filters**: Toggle scope, case sensitivity, active filter badges
- **File scope filtering**: 3 modes - Strands only (markdown), Strands + Media (markdown + images/audio/video/PDFs), or All files
- **Keyboard friendly**: `/` to focus search, `Esc` to clear, ↑/↓ to navigate results

### Metadata & Insights
- **Dual summaries**: Extractive (NLP/TF-IDF) and AI (LLM) summaries rendered independently with copy actions.
- **Resizable panel**: Three width presets (S/M/L) with instant preview, persisted via local preferences.
- **Personal notes**: Strand-scoped notes stored in localStorage with add/edit/delete controls—never synced to Frame servers.
- **Git + taxonomy context**: Reading stats, auto-generated difficulty, taxonomy chips, backlinks, and relationship graph.

### Navigation
- **Two modes**: Outline (current dir) or Tree (full hierarchy)
- **Breadcrumbs**: Click any segment to navigate, hover for minimap preview
- **Internal links**: Wiki-style relative paths (`./other.md`)
- **URL sync**: Query params for shareable links
- **Keyboard navigation system**: 
  - **Focus zones**: Sidebar, content, metadata, toolbar, modals
  - **Vim-style**: `j`/`k` for up/down, `gg` for first, `G` for last
  - **Navigation modes**: Browse, Search, Edit, Command
  - **Visual indicators**: Current zone highlighting
  - **Quick tips**: Contextual keyboard hints per mode
- **Standard shortcuts**:
  - `/` - Focus search (works anywhere)
  - `m` - Toggle metadata panel
  - `b` - Toggle bookmarks & history
  - `,` - Open preferences/settings
  - `?` - Toggle help panel
  - `s` - Toggle sidebar (mobile)
  - `g h` - Navigate to home
  - `Esc` - Exit current mode / Close modals
  - `Tab` - Navigate within zone
  - `F6` - Switch between zones

### Content Rendering
- **Markdown**: GitHub Flavored Markdown (GFM)
- **Syntax highlighting**: 100+ languages via Prism
- **Image rewriting**: Relative URLs → raw GitHub URLs
- **Styled elements**: Gradient headings, accent blockquotes
- **Responsive typography**: `prose-sm` → `prose-lg`

### Mobile Optimizations
- **80vw sidebar**: Doesn't overwhelm small screens
- **56px FAB**: Material Design floating action button
- **44px+ touch targets**: All buttons meet WCAG AAA
- **Auto-close**: Sidebar closes after file selection
- **Overscroll contain**: Prevents bounce on iOS
- **Backdrop blur**: Native feel on modern devices

### Visualization & Exploration
- **Knowledge Graph**: Force-directed network showing weaves/looms/strands (custom implementation, no D3)
- **Timeline View**: Chronological reading history grouped by time periods
- **Breadcrumb Minimap**: Hover any breadcrumb segment to see siblings & children with quick jump
- **Interactive Tours**: 3 guided tutorials with spotlight highlighting
- **Help Panel**: Keyboard shortcuts reference, pro tips, quick start guide (press `?`)

### Contribution Features
- **AI-Assisted Modal**: Pre-filled metadata, tag suggestions, weave/loom inference
- **GitHub Integration**: Direct PR creation via API or fallback to web editor
- **Optional Enhancement**: Toggle AI analysis (explains cost) or use free static NLP only
- **Preview Step**: See final markdown with frontmatter before submitting

### Create Node Wizard UX
- **Real-time Validation**: 300ms debounced field-level validation with inline error display
- **Mobile Bottom Sheet**: 3-height snapping (25vh/50vh/90vh) with velocity-based gestures
- **WYSIWYG Template Editing**: TiptapEditor integration with {placeholder} highlighting
- **Split-View Preview**: Live template preview with sample data interpolation
- **Interactive Walkthrough**: First-time user tour with spotlight highlighting
- **Contextual Help Panel**: Collapsible sidebar with searchable help content
- **Rich Tooltips**: Enhanced tooltips with examples, cautions, and doc links
- **Swipe Navigation**: Horizontal swipe to navigate wizard steps on mobile
- **Unsaved Changes Warning**: Prompts before leaving with uncommitted changes

### Template Sources
- **Remote Repositories**: Fetch templates from GitHub repos with registry.json
- **Official + Custom**: Default framersai/quarry-templates plus user-added repos
- **Offline Support**: IndexedDB caching with stale-while-revalidate
- **Rate Limit Aware**: Visual indicator and automatic throttling
- **Template Builder**: Create, edit, and publish custom templates via PR

### Social Media Import
- **URL Paste Import**: Paste any social media URL and automatically scrape content
- **Platform Detection**: Auto-detects 10+ platforms (Reddit, Twitter/X, Instagram, Pinterest, YouTube, TikTok, Facebook, LinkedIn, Mastodon, Threads)
- **Rich Metadata**: Extracts author, engagement stats (likes/comments/shares), hashtags, mentions
- **Platform Branding**: Color-coded icons and badges for each platform
- **Engagement Tooltips**: Hover to see upvotes, comments, shares, views
- **Import History**: Browse and manage all imported social sources
- **Tag Conversion**: Hashtags automatically become strand tags
- **Profile Links**: Direct links to source authors' profiles
- **No Auth Required**: Works with public posts via metadata scraping

### Editions & Availability
- **Community Edition (Free, MIT)**: Clone [`framersai/codex`](https://github.com/framersai/codex) or install `@framers/codex-viewer` to host the exact Quarry Codex experience. Ideal for personal knowledge bases, public fabrics, and experiments.
- **Lifetime Edition (One-Time Fee)**: Adds sovereign storage connectors (S3, Postgres, Snowflake, on-prem), scheduled exports, encrypted offline bundles, and premium governance tooling. Runs anywhere you deploy Kubernetes or a single VM.
- **Waitlist**: [Reserve a lifetime license](https://frame.dev/quarry/waitlist) to lock in one-time pricing and priority onboarding while keeping the free edition for experimentation.

### Text-to-Speech (Read Aloud)
- **Free & Client-Side**: Uses Web Speech API built into modern browsers
- **No API Keys**: Works completely offline, no servers or tracking
- **Radial Audio Controls**: Beautiful retro-futuristic HUD-style interface
- **Full Control**: Play, pause, stop, volume, speed (0.5x-2x), pitch
- **Voice Selection**: Choose from system voices (varies by OS/browser)
- **Progress Tracking**: Visual progress ring shows reading position
- **Smart Text Cleaning**: Automatically removes markdown syntax for better narration
- **Keyboard Integration**: Works with all theme modes (terminal, sepia, light, dark)
- **Read Selection**: Can read highlighted text or entire file content

### Analog Styling
- **Monochrome base**: Pure grey/black for backgrounds and shadows
- **Neon bursts**: Strategic color accents (amber=weave, cyan=loom, violet=strand, green=success)
- **Paper texture**: SVG noise overlay (0.02 opacity)
- **Inner shadows**: Embossed depth effect
- **Thick borders**: 2px for tactile feel
- **Rounded corners**: 3xl (24px) for modern look

## 📦 Components

### CodexViewer
Main orchestrator. Manages state, fetches data, coordinates child components.

**Props:**
- `isOpen` - Whether viewer is open (modal mode)
- `onClose` - Close callback (modal mode)
- `mode` - `'modal'` or `'page'`
- `initialPath` - Starting directory

### CodexSidebar
File browser with outline/tree toggle, search, breadcrumbs.

**Features:**
- Collapsible on mobile
- Two view modes (outline, tree)
- Advanced search bar
- Pagination (50 items per page)
- GitHub link in footer

### CodexContent
Markdown renderer with syntax highlighting and wiki features.

**Features:**
- GFM support (tables, task lists, strikethrough)
- Syntax highlighting (Prism)
- Internal link handling
- Image URL rewriting
- Empty state with quick guide

### CodexMetadataPanel
Right-hand panel with metadata chips, backlinks, graph controls.

**Features:**
- Parsed YAML frontmatter
- Styled chips (tags, difficulty, version, taxonomy)
- Backlink detection
- Keyboard shortcut hints
- Collapsible (animates width)

### CodexToolbar
Action buttons for search, diagram, contribute, info.

**Features:**
- Context-aware contribute dropdown
- Active state for info button
- Mobile-friendly (icons only on xs)
- Tooltips for accessibility

## 🎨 Styling

### Analog Theme
Use `PaperCard` for consistent analog styling:

```tsx
import { PaperCard } from '@/components/codex'

<PaperCard showTexture showShadow>
  <h2>My Content</h2>
</PaperCard>
```

### Level Styles
Access via `LEVEL_STYLES` constant:

```tsx
import { LEVEL_STYLES } from '@/components/codex'

const style = LEVEL_STYLES.weave
// { label: 'Weave', className: '...', icon: Folder }
```

## 🔧 Hooks

### useGithubTree
Fetch and build the full repository tree.

```tsx
const { tree, loading, error, totalStrands, totalWeaves } = useGithubTree()
```

### useCodexHotkeys
Register keyboard shortcuts.

```tsx
useCodexHotkeys({
  onToggleMeta: () => setMetaOpen(v => !v),
  onFocusSearch: () => searchRef.current?.focus(),
  onGoHome: () => router.push('/codex'),
})
```

### useSearchFilter
Advanced search with filters and debouncing.

```tsx
const {
  options,
  setQuery,
  toggleSearchContent,
  filteredFiles,
  isSearchActive,
} = useSearchFilter(files, contentMap)
```

## 🛠️ Utils

### shouldIgnorePath
Check if path should be filtered out.

```ts
shouldIgnorePath('.github/workflows') // true
shouldIgnorePath('weaves/tech/intro.md') // false
```

### isMarkdownFile
Check if file is markdown.

```ts
isMarkdownFile('intro.md') // true
isMarkdownFile('config.yaml') // false
```

### buildKnowledgeTree
Convert flat Git tree to hierarchical structure.

```ts
const tree = buildKnowledgeTree(gitTreeItems)
// Returns: KnowledgeTreeNode[]
```

### parseWikiMetadata
Extract YAML frontmatter from markdown.

```ts
const metadata = parseWikiMetadata(markdownContent)
// Returns: { title, tags, difficulty, ... }
```

## 📱 Mobile Testing

Run the full test suite:

```bash
npm run test:mobile
```

Or test manually:
1. Open DevTools
2. Toggle device toolbar (Cmd+Shift+M)
3. Test these viewports:
   - iPhone SE (375px)
   - iPhone 14 Pro (393px)
   - iPad Mini (768px)
   - iPad Pro (1024px)
4. Test landscape orientation
5. Verify touch targets (overlay grid in DevTools)

## 🎯 Performance

- **Initial load**: < 1s (tree fetch + render)
- **Search**: < 100ms (debounced, memoized)
- **File open**: < 500ms (GitHub CDN)
- **Tree expand**: < 50ms (client-side only)
- **ONNX local hosting**: WASM binaries served locally to avoid CDN 404s and improve privacy
  - Automatically copied from `node_modules` during build
  - Falls back to CDN if local files unavailable
  - See `public/onnx-wasm/README.md` for setup

## 🔮 Future Enhancements
