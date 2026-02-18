/**
 * Tutorial tour definitions for Quarry Codex
 * @module codex/tutorials
 */

import type { TutorialStep } from '../ui/misc/TutorialTour'

/**
 * Getting Started tutorial
 * Introduces users to the basic features of Quarry Codex
 */
export const GETTING_STARTED_TUTORIAL: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Codex!',
    description:
      'Your forever second brain. Let\'s take a quick tour of the key features that help you organize and find your knowledge.',
    target: '.quarry-codex-viewer',
    placement: 'bottom',
  },
  {
    id: 'sidebar',
    title: 'Knowledge Tree',
    description:
      'The left sidebar shows your hierarchical knowledge tree. Switch between "Tree" and "Outline" views to navigate your notes.',
    target: '[role="navigation"]',
    placement: 'right',
  },
  {
    id: 'search',
    title: 'Search Your Notes',
    description:
      'Use the search bar to find content instantly. Try semantic search to find ideas by meaning, not just keywords.',
    target: '#codex-search-input',
    placement: 'bottom',
  },
  {
    id: 'content',
    title: 'View Content',
    description:
      'Click any file to view its content. Markdown files are beautifully rendered with syntax highlighting and wiki-style links.',
    target: '.codex-content',
    placement: 'left',
  },
  {
    id: 'bookmarks',
    title: 'Bookmark Files',
    description:
      'Press \'b\' or click the bookmark button to save files for quick access. Your bookmarks and reading progress are saved locally.',
    target: '[title*="bookmark"]',
    placement: 'bottom',
  },
  {
    id: 'metadata',
    title: 'Metadata & Connections',
    description:
      'The metadata panel shows tags, related notes, and backlinks. Toggle it with the Info button or press \'m\'.',
    target: '[title*="metadata"]',
    placement: 'left',
  },
  {
    id: 'preferences',
    title: 'Personalize Your Experience',
    description:
      'Press \',\' or click Settings to customize theme, font size, and more. All your data stays private in your browser.',
    target: '[title*="Preferences"]',
    placement: 'bottom',
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description:
      'Start exploring your knowledge base. Check out the other tutorials to learn about semantic search, block tagging, and more.',
    target: '.quarry-codex-viewer',
    placement: 'bottom',
  },
]

/**
 * Semantic Search tutorial
 * Explains how to use semantic search and the query system
 */
export const SEMANTIC_SEARCH_TUTORIAL: TutorialStep[] = [
  {
    id: 'search-intro',
    title: 'Search by Meaning',
    description:
      'Unlike keyword search, semantic search understands what you mean. Search for "how to authenticate users" and find results even if they don\'t contain those exact words.',
    target: '#codex-search-input',
    placement: 'bottom',
  },
  {
    id: 'search-modes',
    title: 'Search Modes',
    description:
      'Toggle between "Name Only" (quick filename search) and "Full-Text" (searches content). For semantic search, use the Q&A panel.',
    target: '[title*="Search"]',
    placement: 'bottom',
  },
  {
    id: 'query-palette',
    title: 'Quick Query Palette',
    description:
      'Press Cmd+P to open the Query Palette. Use powerful query syntax like #tag, weave:technology, type:code, and more.',
    target: '#codex-search-input',
    placement: 'bottom',
  },
  {
    id: 'query-syntax',
    title: 'Query Syntax',
    description:
      'Try: #react (tag filter), weave:tech (by category), type:heading (content type), created:>2024-01-01 (date filter), or combine with AND/OR.',
    target: '#codex-search-input',
    placement: 'bottom',
  },
  {
    id: 'save-queries',
    title: 'Save Queries',
    description:
      'Frequently used queries can be saved and pinned for quick access. Build your own saved searches for topics you visit often.',
    target: '#codex-search-input',
    placement: 'bottom',
  },
  {
    id: 'keyboard-nav',
    title: 'Keyboard Navigation',
    description:
      'Press \'/\' to focus search, arrow keys to navigate results, Enter to open. Cmd+J/Cmd+Shift+J jump between results.',
    target: '#codex-search-input',
    placement: 'bottom',
  },
]

/**
 * Block Tagging tutorial
 * Explains the Tana-inspired block-level tagging system
 */
export const BLOCK_TAGGING_TUTORIAL: TutorialStep[] = [
  {
    id: 'block-intro',
    title: 'Block-Level Tagging',
    description:
      'Tag individual paragraphs, not just entire documents. Every heading, code block, or bullet point can have its own tags.',
    target: '.codex-content',
    placement: 'left',
  },
  {
    id: 'add-tag',
    title: 'Adding Tags',
    description:
      'Press Cmd+T on any block to add a tag. Type #tag-name inline or use the tag panel. Tags auto-complete from your existing tags.',
    target: '.codex-content',
    placement: 'left',
  },
  {
    id: 'supertags',
    title: 'Supertags (Structured Tags)',
    description:
      'Supertags are tags with typed fields. Use #task for tasks with status/priority, #person for contacts, #book for reading lists.',
    target: '.codex-content',
    placement: 'left',
  },
  {
    id: 'supertag-fields',
    title: 'Fill in Fields',
    description:
      'When you add a supertag, a form appears for its fields. Example: #task status:in_progress priority:high due_date:2024-12-31.',
    target: '.codex-content',
    placement: 'left',
  },
  {
    id: 'query-blocks',
    title: 'Query Tagged Blocks',
    description:
      'Search for blocks by tag: #task status:done finds completed tasks. Combine with other filters for powerful queries.',
    target: '#codex-search-input',
    placement: 'bottom',
  },
  {
    id: 'backlinks',
    title: 'Backlinks',
    description:
      'Press Cmd+B to see all places that reference the current block. Backlinks help you discover connections in your notes.',
    target: '.codex-content',
    placement: 'left',
  },
]

/**
 * Knowledge Graph tutorial
 * Explains the interactive graph visualization
 */
export const KNOWLEDGE_GRAPH_TUTORIAL: TutorialStep[] = [
  {
    id: 'graph-intro',
    title: 'Visualize Connections',
    description:
      'The Knowledge Graph shows how your notes connect. Each node is a document, and links show relationships between ideas.',
    target: '[title*="Graph"]',
    placement: 'bottom',
  },
  {
    id: 'graph-controls',
    title: 'Navigate the Graph',
    description:
      'Drag to pan, scroll to zoom. Click any node to open that document. Double-click to center and zoom on a node.',
    target: '[title*="Graph"]',
    placement: 'bottom',
  },
  {
    id: 'graph-filters',
    title: 'Filter Nodes',
    description:
      'Use the filter panel to show/hide nodes by weave, type, or tag. Focus on specific areas of your knowledge base.',
    target: '[title*="Graph"]',
    placement: 'bottom',
  },
  {
    id: 'graph-layout',
    title: 'Layout Options',
    description:
      'Switch between force-directed (organic), hierarchical (tree), or radial layouts. Each reveals different patterns.',
    target: '[title*="Graph"]',
    placement: 'bottom',
  },
  {
    id: 'graph-3d',
    title: '3D View',
    description:
      'Toggle 3D mode for an immersive exploration experience. Rotate with mouse, zoom with scroll.',
    target: '[title*="Graph"]',
    placement: 'bottom',
  },
]

/**
 * Strand Creation tutorial
 * Guides users through creating new content
 */
export const STRAND_CREATION_TUTORIAL: TutorialStep[] = [
  {
    id: 'create-intro',
    title: 'Creating New Notes',
    description:
      'Strands are individual notes in your knowledge base. Each strand has rich metadata for organization and discovery.',
    target: '[title*="Contribute"]',
    placement: 'bottom',
  },
  {
    id: 'create-new',
    title: 'Create a Strand',
    description:
      'Click the + button or use Cmd+N to create a new strand. Choose a weave (category) and give it a meaningful name.',
    target: '[title*="Contribute"]',
    placement: 'bottom',
  },
  {
    id: 'frontmatter',
    title: 'Frontmatter Metadata',
    description:
      'Each strand starts with YAML frontmatter. Add title, tags, summary, and difficulty level to help organize your notes.',
    target: '.codex-content',
    placement: 'left',
  },
  {
    id: 'relationships',
    title: 'Link Related Notes',
    description:
      'Use [[wiki links]] to connect notes. Add semantic relationships like "requires", "extends", or "see-also".',
    target: '.codex-content',
    placement: 'left',
  },
  {
    id: 'templates',
    title: 'Use Templates',
    description:
      'Start from templates for common note types: meeting notes, book reviews, project documentation, and more.',
    target: '[title*="Contribute"]',
    placement: 'bottom',
  },
  {
    id: 'validation',
    title: 'Auto-Validation',
    description:
      'Your notes are automatically validated for proper structure. The system helps ensure consistency across your knowledge base.',
    target: '.codex-content',
    placement: 'left',
  },
]

/**
 * Import & Export tutorial
 * Explains how to import and export content
 */
export const IMPORT_EXPORT_TUTORIAL: TutorialStep[] = [
  {
    id: 'import-intro',
    title: 'Import Your Notes',
    description:
      'Bring your existing notes into Codex. Import from Markdown, Notion, Obsidian, Roam Research, and more.',
    target: '[title*="Import"]',
    placement: 'bottom',
  },
  {
    id: 'import-markdown',
    title: 'Import Markdown',
    description:
      'Drag & drop Markdown files or folders. Codex preserves your structure and automatically extracts metadata.',
    target: '[title*="Import"]',
    placement: 'bottom',
  },
  {
    id: 'import-notion',
    title: 'Import from Notion',
    description:
      'Export from Notion as Markdown+CSV, then import the ZIP file. Links and databases are converted automatically.',
    target: '[title*="Import"]',
    placement: 'bottom',
  },
  {
    id: 'import-obsidian',
    title: 'Import from Obsidian',
    description:
      'Your Obsidian vault works directly! Just point Codex to your vault folder. Wiki links and tags are preserved.',
    target: '[title*="Import"]',
    placement: 'bottom',
  },
  {
    id: 'export-options',
    title: 'Export Your Knowledge',
    description:
      'Export individual strands or entire weaves. Choose Markdown, JSON, PDF, or ZIP archive format.',
    target: '[title*="Download"]',
    placement: 'bottom',
  },
  {
    id: 'export-backup',
    title: 'Full Backup',
    description:
      'Create a complete backup of your knowledge base anytime. Your data is always yours—no lock-in.',
    target: '[title*="Download"]',
    placement: 'bottom',
  },
]

/**
 * Flashcards & Learning tutorial
 * Explains the spaced repetition flashcard system
 */
export const FLASHCARDS_TUTORIAL: TutorialStep[] = [
  {
    id: 'flashcard-intro',
    title: 'Learn with Flashcards',
    description:
      'Turn your notes into flashcards for active recall. The FSRS algorithm schedules reviews for optimal retention.',
    target: '[title*="Flashcard"]',
    placement: 'bottom',
  },
  {
    id: 'generate-cards',
    title: 'Generate Flashcards',
    description:
      'AI automatically generates Q&A pairs from your notes. You can also create cards manually with {{question}}→{{answer}} syntax.',
    target: '[title*="Flashcard"]',
    placement: 'bottom',
  },
  {
    id: 'review-session',
    title: 'Review Session',
    description:
      'Start a review session to practice due cards. Rate each card (Again, Hard, Good, Easy) to adjust scheduling.',
    target: '[title*="Flashcard"]',
    placement: 'bottom',
  },
  {
    id: 'fsrs-algorithm',
    title: 'Smart Scheduling',
    description:
      'FSRS (Free Spaced Repetition Scheduler) adapts to your memory. Hard cards appear more often, easy ones less frequently.',
    target: '[title*="Flashcard"]',
    placement: 'bottom',
  },
  {
    id: 'deck-management',
    title: 'Organize Decks',
    description:
      'Cards are organized by strand and weave. Review specific topics or study everything due across your knowledge base.',
    target: '[title*="Flashcard"]',
    placement: 'bottom',
  },
]

/**
 * Text-to-Speech tutorial
 * Explains the TTS and audio features
 */
export const TTS_TUTORIAL: TutorialStep[] = [
  {
    id: 'tts-intro',
    title: 'Listen to Your Notes',
    description:
      'Convert any note to speech for hands-free learning. Perfect for commutes, exercise, or multitasking.',
    target: '[title*="Speaker"]',
    placement: 'bottom',
  },
  {
    id: 'tts-voices',
    title: 'Choose a Voice',
    description:
      'Pick from multiple voices and languages. Adjust speed to your preference—faster for review, slower for new material.',
    target: '[title*="Speaker"]',
    placement: 'bottom',
  },
  {
    id: 'tts-controls',
    title: 'Playback Controls',
    description:
      'Play, pause, skip forward/back. The reader highlights the current paragraph as it speaks.',
    target: '[title*="Speaker"]',
    placement: 'bottom',
  },
  {
    id: 'tts-download',
    title: 'Download Audio',
    description:
      'Export your notes as MP3 files for offline listening. Build a library of audio versions of your knowledge.',
    target: '[title*="Speaker"]',
    placement: 'bottom',
  },
]

/**
 * Soundscapes tutorial
 * Explains the ambient audio and animated scene system
 */
export const SOUNDSCAPES_TUTORIAL: TutorialStep[] = [
  {
    id: 'soundscape-intro',
    title: 'Ambient Soundscapes',
    description:
      'Create an immersive writing atmosphere with ambient sounds and audio-reactive animated scenes.',
    target: '[data-tutorial="ambience-button"]',
    placement: 'bottom',
  },
  {
    id: 'soundscape-select',
    title: 'Choose Your Soundscape',
    description:
      'Select from 7 ambient environments: rain, cafe, forest, ocean, fireplace, lo-fi beats, or white noise.',
    target: '[data-tutorial="soundscape-grid"]',
    placement: 'top',
  },
  {
    id: 'soundscape-scene',
    title: 'Animated Scenes',
    description:
      'Each soundscape has a beautiful animated scene that responds to the audio. Watch rain drops fall, flames flicker, or waves crash.',
    target: '[data-tutorial="scene-preview"]',
    placement: 'right',
  },
  {
    id: 'soundscape-volume',
    title: 'Adjust Volume',
    description:
      'Use the volume slider to set the perfect background level. The sounds are designed to be non-distracting for focused work.',
    target: '[data-tutorial="volume-slider"]',
    placement: 'top',
  },
  {
    id: 'soundscape-themes',
    title: 'Theme Integration',
    description:
      'Scenes adapt to your current theme. Terminal themes get a phosphor glow, sepia themes have warm tints, and oceanic themes have cool blue hues.',
    target: '[data-tutorial="theme-indicator"]',
    placement: 'left',
  },
  {
    id: 'soundscape-mood',
    title: 'Mood Sync',
    description:
      'Enable mood sync to automatically select soundscapes based on your current mood. Feeling focused? Lo-fi kicks in. Reflective? Rain sounds play.',
    target: '[data-tutorial="mood-sync"]',
    placement: 'bottom',
  },
]

/**
 * Q&A & AI Features tutorial
 * Explains the Q&A Oracle and AI assistance
 */
export const QA_AI_TUTORIAL: TutorialStep[] = [
  {
    id: 'qa-intro',
    title: 'Ask Questions',
    description:
      'Ask questions in natural language and get instant answers from your notes. The AI finds and synthesizes relevant information.',
    target: '[title*="Q&A"]',
    placement: 'bottom',
  },
  {
    id: 'qa-citations',
    title: 'Answers with Citations',
    description:
      'Every answer includes source citations. Click any citation to jump directly to the original note.',
    target: '[title*="Q&A"]',
    placement: 'bottom',
  },
  {
    id: 'qa-providers',
    title: 'Choose Your AI',
    description:
      'Use Claude, GPT, Mistral, or run 100% local with Ollama. Bring your own API key or use the built-in options.',
    target: '[title*="Q&A"]',
    placement: 'bottom',
  },
  {
    id: 'qa-offline',
    title: 'Works Offline',
    description:
      'Semantic search works entirely offline using local embeddings. No internet required for searching your notes.',
    target: '[title*="Q&A"]',
    placement: 'bottom',
  },
  {
    id: 'voice-input',
    title: 'Voice Questions',
    description:
      'Use the microphone button to ask questions by voice. Great for quick queries without typing.',
    target: '[title*="Q&A"]',
    placement: 'bottom',
  },
]

/**
 * All available tutorials
 */
export const TUTORIALS = {
  'getting-started': {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of navigating your knowledge base',
    steps: GETTING_STARTED_TUTORIAL,
    icon: 'Compass',
  },
  'semantic-search': {
    id: 'semantic-search',
    title: 'Semantic Search',
    description: 'Find notes by meaning, not just keywords',
    steps: SEMANTIC_SEARCH_TUTORIAL,
    icon: 'Search',
  },
  'block-tagging': {
    id: 'block-tagging',
    title: 'Block-Level Tagging',
    description: 'Tag individual blocks with structured supertags',
    steps: BLOCK_TAGGING_TUTORIAL,
    icon: 'Tag',
  },
  'knowledge-graph': {
    id: 'knowledge-graph',
    title: 'Knowledge Graph',
    description: 'Visualize connections between your notes',
    steps: KNOWLEDGE_GRAPH_TUTORIAL,
    icon: 'Network',
  },
  'strand-creation': {
    id: 'strand-creation',
    title: 'Creating Notes',
    description: 'Create and organize new content in your knowledge base',
    steps: STRAND_CREATION_TUTORIAL,
    icon: 'FilePlus',
  },
  'import-export': {
    id: 'import-export',
    title: 'Import & Export',
    description: 'Bring in notes from other apps or back up your data',
    steps: IMPORT_EXPORT_TUTORIAL,
    icon: 'FolderInput',
  },
  'flashcards': {
    id: 'flashcards',
    title: 'Flashcards & Learning',
    description: 'Use spaced repetition to remember what you learn',
    steps: FLASHCARDS_TUTORIAL,
    icon: 'GraduationCap',
  },
  'text-to-speech': {
    id: 'text-to-speech',
    title: 'Text-to-Speech',
    description: 'Listen to your notes anywhere, anytime',
    steps: TTS_TUTORIAL,
    icon: 'Volume2',
  },
  'qa-ai': {
    id: 'qa-ai',
    title: 'Q&A & AI Features',
    description: 'Ask questions and get AI-powered answers with citations',
    steps: QA_AI_TUTORIAL,
    icon: 'Sparkles',
  },
  'soundscapes': {
    id: 'soundscapes',
    title: 'Ambient Soundscapes',
    description: 'Set the mood with audio-reactive animated scenes',
    steps: SOUNDSCAPES_TUTORIAL,
    icon: 'Headphones',
  },
} as const

export type TutorialId = keyof typeof TUTORIALS
