/**
 * Quarry FAQ Page
 * Frequently Asked Questions about Quarry by Frame.dev
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Sparkles,
  ExternalLink,
  HelpCircle,
  MessageSquare
} from 'lucide-react'
import QuarryNavigationLanding from '@/components/quarry/ui/quarry-core/QuarryNavigationLanding'
import Footer from '@/components/footer'

// FAQ data organized by category
const faqCategories = [
  {
    name: 'Getting Started',
    questions: [
      {
        q: 'What is Quarry?',
        a: 'Quarry is an AI-native personal knowledge management system built by Frame.dev. It combines the simplicity of Markdown notes with advanced features like semantic search, knowledge graphs, and spaced repetition to help you organize and find your information more effectively. Core features work 100% offline with optional LLM enhancements.',
      },
      {
        q: 'Is Quarry free to use?',
        a: 'Yes! The Community Edition is completely free and open-source under the MIT License. It includes all core features: semantic search, knowledge graphs, bookmarks, and reading progress. Premium ($79, or $49 for students/launch) adds flashcards, quizzes, offline SQLite storage, and export features.',
      },
      {
        q: 'How do I get started with Quarry?',
        a: 'Simply visit the Quarry app and start exploring. You can browse the knowledge base, use semantic search, and view the knowledge graph immediately. For creating your own notes, connect a GitHub repository or use the Premium offline SQLite storage.',
      },
    ],
  },
  {
    name: 'Dynamic Documents',
    questions: [
      {
        q: 'What are Dynamic Documents?',
        a: 'Dynamic Documents transform your notes into living software. Inspired by Ink & Switch\'s Embark research, they combine freeform text with structured data (@mentions), spreadsheet-like formulas, and embedded visualizations (maps, calendars, charts). Your documents become computational environments that update automatically.',
      },
      {
        q: 'How do @mentions work?',
        a: 'Type @ to reference any entity: @Paris (places), @June-2025 (dates), @John-Smith (people), or @[[My Note]] (documents). Mentions are typed and linked to structured data. The system auto-completes as you type and shows entity previews on hover. All mentions are searchable across your knowledge base.',
      },
      {
        q: 'What formulas are available?',
        a: 'Formulas work like spreadsheet functions: =ADD(100, 200), =WEATHER("San Francisco"), =ROUTE("NYC", "LA"), =DAYS_BETWEEN(date1, date2). Use /formula to insert a formula block. Results update automatically when referenced data changes. See the Formulas Guide for the complete function reference.',
      },
      {
        q: 'What embedded views can I add?',
        a: 'Five view types: Map (plots @place mentions), Calendar (shows @date and @event mentions), Table (structured data grid), Chart (bar, line, pie visualizations), and List (simple item display). Use /map, /calendar, /table, /chart, or /list commands to insert. Views extract data from your document\'s mentions automatically.',
      },
      {
        q: 'What is AI enrichment?',
        a: 'AI enrichment analyzes your content client-side to suggest tags, categories, related documents, and appropriate views. All NLP processing happens locally—your data never leaves your device. Click "Refresh" in the Enrichment panel to re-analyze after editing.',
      },
      {
        q: 'How do formulas and views stay updated?',
        a: 'Dynamic Documents follow the "liveness" principle from Embark. Formulas recalculate when dependencies change. Views re-render when underlying mentions are added or modified. This happens automatically—no manual refresh needed.',
      },
      {
        q: 'Where can I learn more about Dynamic Documents?',
        a: 'Read the full documentation at /docs/frame-architecture/DYNAMIC_DOCUMENTS_GUIDE.md, which includes guides for Mentions, Formulas, Embeddable Views, and Enrichment. The feature is inspired by Ink & Switch\'s "Embark: Dynamic Documents as Personal Software" research paper.',
      },
    ],
  },
  {
    name: 'Features & Functionality',
    questions: [
      {
        q: 'How does the AI-powered search work?',
        a: 'Quarry uses semantic search powered by advanced language models. Instead of just matching keywords, it understands the meaning of your query and finds relevant notes even if they don\'t contain the exact words you searched for. This makes it much easier to find information when you can\'t remember the exact phrasing.',
      },
      {
        q: 'What LLM providers are supported for AI features?',
        a: 'Quarry supports optional LLM-enhanced features with multiple providers: OpenAI (GPT-5.2), Anthropic Claude (Claude Opus 4.5, Sonnet 4.5), and local models via Ollama (Llama 3, Mistral, etc.). All LLM features are optional—core functionality including semantic search, NLP extraction, and flashcard generation works 100% offline using built-in static models. You can bring your own API keys or run completely locally with Ollama for full privacy.',
      },
      {
        q: 'What is the OpenStrand schema?',
        a: 'OpenStrand is the hierarchical knowledge organization protocol used in Quarry. It organizes information into four levels: Fabric (entire repository), Weaves (top-level domains), Looms (thematic folders), and Strands (individual markdown notes). This structure makes it easy to organize complex knowledge bases while maintaining flexibility for both human navigation and AI traversal.',
      },
      {
        q: 'Does Quarry work offline?',
        a: 'Yes! Quarry is 100% offline-first. All core features including semantic search, NLP block tagging, worthiness scoring, and the knowledge graph work without an internet connection. Only optional AI features (LLM chat, AI block enhancement) require internet when using cloud providers—or run completely locally with Ollama.',
      },
      {
        q: 'Can I use Quarry on multiple devices?',
        a: 'Yes. With GitHub integration, your knowledge base syncs across devices via your repository. Premium users can also use offline SQLite storage with manual export/import for air-gapped environments.',
      },
    ],
  },
  {
    name: 'AI Features',
    questions: [
      {
        q: 'What are AI Selection Actions?',
        a: 'AI Selection Actions let you transform any selected text with AI. Select text in the editor, click the AI button, and choose actions like "Improve Writing," "Make Shorter," "Fix Grammar," or "Translate." The AI transforms your text instantly, and you can accept or reject the changes.',
      },
      {
        q: 'What actions are available for selected text?',
        a: 'Transform actions include: Improve Writing, Make Shorter, Make Longer, Fix Grammar, Summarize, and Expand. Tone changes include: Formal, Casual, and Professional. Analysis actions include: Explain and Define. Translation supports 10 languages including Spanish, French, German, Chinese, and Japanese.',
      },
      {
        q: 'What is the AI Document Visualizer?',
        a: 'The AI Visualizer transforms your written content into visual stories. It can generate illustrations for paragraphs in your documents, create picture book layouts with text and images side-by-side, and extract key concepts for visualization. Perfect for creative writing, storytelling, and visual presentations.',
      },
      {
        q: 'What visual styles are available?',
        a: 'Eight visual styles: Illustration (vibrant digital art), Watercolor (soft gradients), Sketch (pencil hand-drawn), Photorealistic, Diagram (technical style), Storybook (whimsical children\'s book), Graphic Novel (bold comic style), and Minimal (simple shapes).',
      },
      {
        q: 'What API keys do I need for AI features?',
        a: 'For text transformation (AI Selection Actions), you need an LLM API key (OpenAI, Anthropic, or OpenRouter). For image generation (Visualizer), you additionally need an image generation API key (OpenAI DALL-E, Stability AI, Replicate, or FAL.ai). Configure both in Settings > AI Features.',
      },
      {
        q: 'Do AI features work on mobile?',
        a: 'Yes! All AI features are fully responsive. The Visualizer opens as a full-screen modal on mobile, and Picture Book mode includes a tab bar to switch between text and image views. Touch targets are optimized for mobile interaction.',
      },
    ],
  },
  {
    name: 'Content Licensing',
    questions: [
      {
        q: 'What are strand licenses?',
        a: 'Every strand (note) in Quarry can have an associated license that specifies how the content can be used, shared, and modified. This is especially important when you\'re collecting content from external sources, sharing your knowledge base, or publishing your notes.',
      },
      {
        q: 'What license options are available?',
        a: 'Quarry supports 16 license types: Creative Commons variants (CC0, CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA, CC BY-ND, CC BY-NC-ND), open source licenses (MIT, Apache 2.0, GPL 3.0, BSD 3-Clause), commercial/proprietary licenses, private/confidential, fair use (for research/education), and custom licenses. The default is "None" (unspecified).',
      },
      {
        q: 'How does automatic license detection work?',
        a: 'When you import content, Quarry automatically scans for license information from multiple sources: SPDX identifiers in code comments, Creative Commons badges and meta tags in HTML, <link rel="license"> tags, schema.org structured data, GitHub repository license fields, package.json license fields, and copyright notices. Detection includes a confidence score so you know how reliable the detection is.',
      },
      {
        q: 'What do the license permissions mean?',
        a: 'Each license has three key permissions: Commercial Use (can the content be used for profit), Modifications (can the content be changed or adapted), and Attribution Required (must you credit the original author). Green checkmarks mean allowed, red X marks mean restricted. Hover over any permission for more details.',
      },
      {
        q: 'What\'s the difference between Creative Commons licenses?',
        a: 'CC0 is public domain (no restrictions). CC BY requires attribution only. CC BY-SA requires attribution and sharing derivatives under the same license. CC BY-NC prohibits commercial use. CC BY-ND prohibits modifications. These can be combined: CC BY-NC-SA requires attribution, prohibits commercial use, and requires share-alike for derivatives.',
      },
      {
        q: 'When should I use "Fair Use"?',
        a: 'Fair Use is appropriate for educational and research purposes when using excerpts from copyrighted materials. This includes quoting passages for analysis, academic citations, or personal study notes. It\'s not a license you\'d apply to your own original content—use it for content you\'re referencing from other sources.',
      },
      {
        q: 'Can I override detected licenses?',
        a: 'Yes! Automatic detection is just a starting point. You can always manually select a different license if the detection was incorrect or if you have specific knowledge about the content\'s licensing. Your manual selection takes precedence over any auto-detected license.',
      },
      {
        q: 'How are licenses stored?',
        a: 'Licenses are stored in the strand\'s YAML frontmatter using SPDX identifiers (e.g., "MIT", "CC-BY-4.0", "Apache-2.0"). This makes them portable and compatible with other tools that understand SPDX. Custom licenses include a licenseText field with the full license terms.',
      },
      {
        q: 'What happens to licenses when I export?',
        a: 'When exporting strands, the license metadata is preserved in the frontmatter. If you export to PDF or other formats, the license information is included in the document. This ensures proper attribution and license compliance even when content leaves Quarry.',
      },
    ],
  },
  {
    name: 'Privacy & Security',
    questions: [
      {
        q: 'Is my data private?',
        a: 'Your privacy is our priority. Notes are stored locally by default and processed client-side. When using LLMs, you control which provider to use—including local Ollama for complete privacy. Self-host Quarry for full control over your data.',
      },
      {
        q: 'Can I password-protect my Quarry?',
        a: 'Yes! Go to Settings > Security & Privacy to enable password protection. This locks the entire Quarry interface behind a password screen. Your password is hashed with SHA-256 and stored locally—it never leaves your device. You can also set a password hint and security question for recovery.',
      },
      {
        q: 'How does the lock screen work?',
        a: 'When password protection is enabled, Quarry shows a full-screen lock overlay on load. Enter your password to unlock. After 5 failed attempts, you\'ll be locked out for 5 minutes (anti-brute-force protection). You can reveal your password hint by answering your security question.',
      },
      {
        q: 'Can I set auto-lock for inactivity?',
        a: 'Yes! In Settings > Security & Privacy > Auto-Lock, you can configure Quarry to automatically lock after 1, 5, 15, 30, or 60 minutes of inactivity. Set to "Never" for manual lock only. Use the "Lock Now" button to instantly lock your session.',
      },
      {
        q: 'What if I forget my password?',
        a: 'If you set a password hint or security question during setup, you can reveal your hint on the lock screen by correctly answering your security question. If you didn\'t set recovery options, you\'ll need to clear all local data to reset—which erases your notes and history. Always export a backup first!',
      },
      {
        q: 'Why does password protection require multiple confirmations?',
        a: 'Enabling password protection uses a 3-step confirmation flow to prevent accidental locking. Step 1: Warning about what will happen. Step 2: Enter and confirm your password. Step 3: Final confirmation. This ensures you don\'t accidentally lock yourself out.',
      },
      {
        q: 'Is password protection available in public deployments?',
        a: 'If the deployment uses PUBLIC_ACCESS mode (NEXT_PUBLIC_PUBLIC_ACCESS=true), password settings are locked and cannot be modified by visitors. This prevents unauthorized users from changing the password on publicly shared Quarry instances. Contact the administrator to modify security settings.',
      },
      {
        q: 'What settings are locked in public access mode?',
        a: 'When PUBLIC_ACCESS mode is enabled, the following settings are view-only: Security settings (password, auto-lock), Storage settings (GitHub PAT, storage mode, sync), Database connections (add/remove/switch backends), Vault location (change folder), Instance customization (name, tagline, colors), and Plugin management (install/uninstall). You\'ll see a "Locked in public access mode" tooltip on disabled controls. A banner appears at the top of Settings when active.',
      },
      {
        q: 'Can I self-host Quarry?',
        a: 'Yes! Quarry is open source (MIT licensed) and designed for self-hosting. Deploy to GitHub Pages, Vercel, or any static host. For LLM features, use your own API keys or run Ollama locally for complete privacy. See our self-hosting guide for detailed instructions.',
      },
      {
        q: 'What happens to my data if I stop using Quarry?',
        a: 'Your notes are stored in standard Markdown files with YAML frontmatter—the same format used by Obsidian, Hugo, and other tools. Export anytime. No lock-in, no proprietary formats. Your data is always yours.',
      },
      {
        q: 'What encryption does Quarry use?',
        a: 'Quarry uses AES-256-GCM encryption (the same standard used by banks and governments) with device-bound keys. Your encryption key is derived using PBKDF2-SHA256 with 100,000 iterations, stored securely in IndexedDB with device fingerprinting. All encryption happens client-side using the Web Crypto API.',
      },
      {
        q: 'Is my data end-to-end encrypted?',
        a: 'Yes! When encryption is enabled, all your notes, reflections, and learning data are encrypted before being stored. The encryption key never leaves your device. Even with cloud sync (coming soon), your data will be encrypted before upload—we cannot read your content.',
      },
      {
        q: 'How do I enable encryption?',
        a: 'Go to Settings > Security & Privacy > Encryption. Toggle "Enable Local Encryption" to encrypt all stored data. You can view your device ID and encryption status at any time. For cloud sync (coming soon), you\'ll be able to manage device access and recovery keys.',
      },
      {
        q: 'What happens if I lose my device?',
        a: 'Your encrypted data is tied to your device\'s encryption key. For local-only storage, losing your device means losing access to that data unless you have exports. Cloud sync (coming soon) will include recovery key options and multi-device key management.',
      },
    ],
  },
  {
    name: 'Block-Level Tagging',
    questions: [
      {
        q: 'What is block-level tagging?',
        a: 'Block-level tagging adds granular metadata to individual headings, paragraphs, and code blocks—not just documents. Each block is automatically analyzed by an NLP pipeline that extracts tags, calculates a worthiness score, and suggests relevant tags from a controlled vocabulary.',
      },
      {
        q: 'How does the NLP pipeline work?',
        a: 'The NLP pipeline runs three stages: Block Processor (parses markdown into blocks, calculates worthiness scores), Block Tagger (suggests tags from vocabulary using TF-IDF and document context), and optionally AI Enhancer (uses LLMs with chain-of-thought prompting to refine tags). All stages work 100% offline except AI enhancement.',
      },
      {
        q: 'What is worthiness scoring?',
        a: 'Worthiness scoring (0-1) prioritizes which blocks deserve tags. Four signals combine: Topic Shift (divergence from previous content), Entity Density (named entities per word), Semantic Novelty (distance from document centroid), and Structural Importance (heading level, position, type). Blocks scoring ≥0.5 are prioritized.',
      },
      {
        q: 'Where do tag suggestions come from?',
        a: 'Tags are suggested from four sources: NLP (vocabulary matching + TF-IDF extraction), LLM (AI-suggested with reasoning), Existing (propagated from document tags), and User (manually confirmed). Each suggestion includes a confidence score (0-1) so you know how reliable it is.',
      },
      {
        q: 'How do I view block tags?',
        a: 'Open any strand and click the Blocks tab in the right sidebar. You\'ll see all blocks with their type, line numbers, worthiness score (with visual bar), accepted tags (green), and pending suggestions (amber). Filter by block type or worthiness score.',
      },
      {
        q: 'Can I contribute block tag improvements?',
        a: 'Yes! Block tags are stored in the open-source Codex repository. Click "Contribute tags" in the Blocks tab to suggest changes, which generates a GitHub issue or PR. The NLP pipeline processes contributions and validates against the controlled vocabulary.',
      },
      {
        q: 'How does AI enhancement work?',
        a: 'AI enhancement uses chain-of-thought prompting to analyze blocks: "Given this block about {topic}, evaluate these suggested tags, suggest additional tags from the vocabulary, rate confidence, and explain your reasoning." It refines NLP suggestions and generates better extractive summaries.',
      },
      {
        q: 'Is block tagging automatic?',
        a: 'Yes! The NLP pipeline runs automatically via GitHub Actions whenever strands are updated. Block parsing, worthiness scoring, and tag suggestions happen server-side. AI enhancement can be triggered manually with cost controls ($5 max by default).',
      },
    ],
  },
  {
    name: 'Technical',
    questions: [
      {
        q: 'What file formats does Quarry support?',
        a: 'Quarry uses Markdown (.md) files with YAML frontmatter for metadata—following the OpenStrand protocol. Block tags are stored in the frontmatter blocks[] array. Import from other note-taking apps, URLs, or plain text. Export to ZIP, PDF, or keep using your markdown files directly.',
      },
      {
        q: 'Can I integrate Quarry with other tools?',
        a: 'Yes! Quarry has a REST API for integration with other tools and AI agents. The codex-blocks.json index provides block-level tag data for external consumption. MCP (Model Context Protocol) support coming soon for direct integration with Claude and other AI assistants.',
      },
      {
        q: 'Is there a mobile app?',
        a: 'The web app is fully responsive and works great on mobile browsers. Native iOS and Android apps are on our roadmap for future releases.',
      },
    ],
  },
  {
    name: 'Planner & Calendar',
    questions: [
      {
        q: 'How do I create a time block or event?',
        a: 'Click on any time slot in the timeline view to open the time block editor. Enter a title, optionally set an icon, color, duration, and recurrence pattern. Click Save to create your event. You can also use the "+" button in the toolbar for quick creation.',
      },
      {
        q: 'Can I sync with Google Calendar?',
        a: 'Yes! Go to Settings > Integrations > Google Calendar and click "Connect". After authorization, select which calendars to sync. Changes sync bidirectionally—events you create in Quarry appear in Google Calendar and vice versa.',
      },
      {
        q: 'How do I set up reminders?',
        a: 'Go to Settings > Planner Settings > Notifications. Enable "Browser Notifications" and set your default reminder time (e.g., 15 minutes before). Each event can also have custom reminder times in the edit modal.',
      },
      {
        q: 'Can I drag events to reschedule them?',
        a: 'Yes! Click and hold any event in the timeline view, then drag it vertically to a new time slot. You can also resize events by dragging the top or bottom edge of the event card. Events snap to 15-minute intervals.',
      },
      {
        q: 'How do recurring events work?',
        a: 'When creating or editing an event, select a recurrence pattern: Daily, Weekly, Monthly, Yearly, or Custom. Custom allows specific days of the week or month. You can set an end date or number of occurrences.',
      },
      {
        q: 'What are habits and how do streaks work?',
        a: 'Habits are recurring tasks that track completion streaks. Complete a habit daily to build your streak. Miss a day and your streak resets—but grace periods give you a buffer. Daily habits have a 1-day grace; weekly habits have 2 days.',
      },
      {
        q: 'How do I change my work hours?',
        a: 'Go to Settings > Planner Settings > Work Hours. Set your start and end times. The planner will highlight your work hours and show countdowns to end-of-work in the timeline view.',
      },
      {
        q: 'Can I switch between 12-hour and 24-hour time?',
        a: 'Yes! Go to Settings > Planner Settings and change "Time Format" to either "12-hour (1:00 PM)" or "24-hour (13:00)". This affects all time displays throughout the planner.',
      },
      {
        q: 'What do the overlapping event badges mean?',
        a: 'When events overlap in time, the planner shows them staggered with a badge indicating how many events conflict. Click the badge to see all overlapping events in a popup and quickly navigate between them.',
      },
      {
        q: 'Does the planner work offline?',
        a: 'Yes! The planner uses local-first architecture. All events and tasks are saved locally first, then synced to Google Calendar when online. You can create, edit, and view events completely offline.',
      },
    ],
  },
  {
    name: 'Accomplishment Tracking',
    questions: [
      {
        q: 'What is accomplishment tracking?',
        a: 'Accomplishment tracking automatically records every task, subtask, and habit you complete. See your daily, weekly, and monthly achievements in one place with beautiful visualizations, completion streaks, and detailed analytics.',
      },
      {
        q: 'What gets tracked as an accomplishment?',
        a: 'Three types are tracked: Tasks (main todo items with completion timestamps), Subtasks (nested checklist items within tasks), and Habits (recurring tasks with streak tracking). Each is color-coded and grouped by project.',
      },
      {
        q: 'Where can I see my accomplishments?',
        a: 'Accomplishments appear in three places: the Reflect sidebar (today\'s completions alongside your journal), the Analytics page (Accomplishments tab with charts and trends), and the Planner sidebar (quick stats and streak banner).',
      },
      {
        q: 'How do completion streaks work?',
        a: 'Streaks count consecutive days where you completed at least one task or subtask. Complete something today to maintain your streak. The system tracks your current streak, longest streak ever, and shows gamified milestones at 3, 7, 14, 30, 60, 90, 180, and 365 days.',
      },
      {
        q: 'Can I export my accomplishments to my reflection?',
        a: 'Yes! Click the "Sync to Reflection" button in the Accomplishments panel to auto-populate the "What Got Done" section of your daily reflection with a formatted list of completions, optionally grouped by project.',
      },
      {
        q: 'What analytics are available?',
        a: 'The Analytics > Accomplishments tab shows: completion trends over 30 days, task/subtask/habit breakdown, completions by project, daily averages, peak productivity days, and streak statistics. All with interactive charts.',
      },
      {
        q: 'Is accomplishment data stored locally?',
        a: 'Yes! All accomplishment data is stored in your local SQLite database. Completion timestamps are recorded when tasks are marked done—no data is sent to any server unless you choose to sync.',
      },
    ],
  },
  {
    name: 'Reflect & Insights',
    questions: [
      {
        q: 'What is Reflect mode?',
        a: 'Reflect is Quarry\'s daily journaling and mood tracking feature. It provides a structured space for morning intentions, daily notes, evening reflections, and gratitude journaling. Track your mood over time with beautiful visualizations and build writing streaks.',
      },
      {
        q: 'What are Reflection Insights?',
        a: 'Insights automatically analyze your journal entries to extract themes, entities (people, places, projects), sentiment, and key phrases. They help you understand patterns in your writing and mood over time without manual tagging.',
      },
      {
        q: 'Do I need an API key for Insights?',
        a: 'No! Insights work in three tiers: AI Cloud (requires API key for Claude/GPT), Local AI (uses on-device BERT model, works offline), and Fast Analysis (instant keyword extraction, no AI required). If no API key is configured, Quarry automatically falls back to local or fast analysis.',
      },
      {
        q: 'What\'s the difference between insight tiers?',
        a: 'AI Cloud provides the richest insights including summaries, mood alignment, and action items—but requires an API key. Local AI uses semantic analysis with BERT for theme clustering—works offline. Fast Analysis uses keyword extraction and sentiment lexicons—instant and always available.',
      },
      {
        q: 'Is my journal data sent to the cloud?',
        a: 'Only if you explicitly use the AI Cloud tier for insights. You can enable "Skip LLM for Privacy" in settings to ensure your reflections never leave your device. Local AI and Fast Analysis tiers process everything client-side.',
      },
      {
        q: 'How do I generate insights for a reflection?',
        a: 'Open any reflection and click the "Generate" button in the Insights section. Quarry will automatically use the best available tier (AI Cloud > Local AI > Fast) based on your configuration and fall back gracefully if needed.',
      },
    ],
  },
  {
    name: 'Ratings & Quality',
    questions: [
      {
        q: 'What is the rating system?',
        a: 'Rate your documents, reflections, and notes using a 5-star system for personal assessment. Optionally enable AI-powered quality analysis that evaluates your content across 6 dimensions: quality, completeness, accuracy, clarity, relevance, and depth.',
      },
      {
        q: 'How does AI rating work?',
        a: 'Click "Analyze with AI" to have an LLM evaluate your content. It scores each dimension on a 1-10 scale, provides an overall score, explains its reasoning, and offers improvement suggestions. Requires an LLM API key (OpenAI, Anthropic, or OpenRouter) configured in settings.',
      },
      {
        q: 'What do the 6 rating dimensions mean?',
        a: 'Quality measures writing structure and professionalism. Completeness checks how thoroughly topics are covered. Accuracy evaluates factual correctness. Clarity assesses how easy the content is to understand. Relevance measures alignment with stated purpose. Depth evaluates the level of analytical detail and insight.',
      },
      {
        q: 'Are my ratings private?',
        a: 'Yes! All ratings are stored locally on your device in SQLite. AI analysis only happens when you explicitly click "Analyze"—content is never automatically sent to any server. Your personal star ratings never leave your device.',
      },
      {
        q: 'Can I rate any document?',
        a: 'Yes! The rating system works across all strand documents—not just reflections. You can rate notes, articles, research, and any content in your knowledge base. Ratings are saved per-strand and persist across sessions.',
      },
      {
        q: 'How do I see rating trends over time?',
        a: 'The Analytics page includes rating visualizations showing how your content quality has improved over time. Track average scores by dimension, see your highest-rated content, and identify areas for improvement.',
      },
    ],
  },
  {
    name: 'Evolution Timeline',
    questions: [
      {
        q: 'What is the Evolution Timeline?',
        a: 'The Evolution Timeline is a visual history of your entire knowledge base growth. It tracks strand creations, git commits, tag additions, and milestones over time. View your PKM\'s evolution at /quarry/evolution or in the Analytics page\'s Evolution tab.',
      },
      {
        q: 'What zoom levels are available?',
        a: 'Four zoom levels: Year (shows quarters), Quarter (shows months), Month (shows weeks), and Week (shows individual days). Each level shows collapsible timeframes with nested periods for deeper exploration.',
      },
      {
        q: 'What are milestones?',
        a: 'Milestones are automatically detected achievements in your PKM journey—like "First 100 Strands," "First 50 Commits," or "First 20 Tags." They appear in the timeline and are highlighted in the Milestones panel.',
      },
      {
        q: 'What is Lifecycle Decay?',
        a: 'Lifecycle Decay is a system that tracks how notes evolve over time based on engagement. Notes move through stages: Fresh (recently accessed), Active (regularly used), and Faded (not accessed recently). This helps you identify valuable notes that need attention before they become forgotten.',
      },
      {
        q: 'How does the decay score work?',
        a: 'Each note has a decay score (0-100) calculated from time since last access and engagement (views, edits, connections). Higher engagement slows decay. You can configure thresholds in the Lifecycle Settings panel to match your workflow.',
      },
      {
        q: 'What is resurfacing?',
        a: 'Resurfacing brings a faded note back to "Fresh" status. The system suggests faded notes worth revisiting based on their connections and past engagement. Click "Resurface" on any suggestion to reset its decay score and bring it back into active rotation.',
      },
      {
        q: 'How do activity indicators work?',
        a: 'Each timeframe shows a color-coded dot: green (low activity), amber (medium), or red/pulsing (high activity). This helps you quickly identify your most productive periods at a glance.',
      },
      {
        q: 'Can I filter the timeline?',
        a: 'Yes! Use the Filter Events button to show only specific event types: Strands Created, Git Commits, Tags Added, Milestones, or Content Changes. You can also expand or collapse all timeframes at once.',
      },
      {
        q: 'Where can I find the Evolution Timeline?',
        a: 'Three places: 1) Dedicated page at /quarry/evolution, 2) Analytics page Evolution tab, 3) Quick access via sidebar and mobile menu. The Analytics page also includes an Evolution Summary Card with key stats.',
      },
    ],
  },
  {
    name: 'Rituals & Habits',
    questions: [
      {
        q: 'What are Rituals?',
        a: 'Rituals are special habits that integrate with the lifecycle system. They help you maintain your knowledge base through lightweight journaling moments—morning setup to plan your day and evening reflection to capture insights.',
      },
      {
        q: 'How do Morning/Evening Rituals work?',
        a: 'Morning Setup surfaces relevant notes for your day and fading notes worth revisiting, letting you set intentions. Evening Reflection shows what you worked on today, lets you capture reflections, and marks notes as reviewed to reset their decay.',
      },
      {
        q: 'What happens when I complete a Ritual?',
        a: 'When you complete a ritual habit, a special modal opens showing notes to review, fading notes to resurface, and space for intentions/reflections. Notes you mark as reviewed have their decay scores reset, keeping them active.',
      },
      {
        q: 'How do I set up Rituals?',
        a: 'Go to Habits in the Planner, click New Habit, select the Rituals category, and choose Morning Setup or Evening Reflection. The system will prompt you with the ritual modal when you mark these habits complete.',
      },
      {
        q: 'Can I customize lifecycle settings?',
        a: 'Yes! In the Evolution page Lifecycle tab, access the Settings panel to adjust: Fresh duration (1-30 days), Fade duration (7-90 days), Engagement weight (how much activity slows decay), and auto-resurface preferences.',
      },
    ],
  },
  {
    name: 'About Frame.dev',
    questions: [
      {
        q: 'Who builds Quarry?',
        a: 'Quarry is built by Frame.dev, focused on creating AI-native infrastructure for developers and knowledge workers. We\'re building open-source tools that help people organize knowledge for the AI era.',
      },
      {
        q: 'How can I contribute to Quarry?',
        a: 'Quarry is open source under MIT! Contribute code, report bugs, suggest features, or help with documentation on our GitHub repository. Join our Discord for community discussions.',
      },
    ],
  },
]

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-lg font-medium text-gray-900 dark:text-white pr-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-gray-600 dark:text-gray-400 leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <QuarryNavigationLanding />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
          <div className="text-center mb-16">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative w-32 h-16">
                <Image
                  src="/quarry-logo-light.svg"
                  alt="Quarry"
                  fill
                  className="object-contain block dark:hidden"
                />
                <Image
                  src="/quarry-logo-dark.svg"
                  alt="Quarry"
                  fill
                  className="object-contain hidden dark:block"
                />
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Everything you need to know about{' '}
              <span
                className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 text-transparent bg-clip-text"
                style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}
              >
                Quarry
              </span>
            </p>
          </div>
        </section>

        {/* FAQ Categories */}
        <section className="container mx-auto px-4 pb-16 max-w-4xl">
          {faqCategories.map((category) => (
            <div key={category.name} className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-3">
                <HelpCircle className="w-6 h-6 text-emerald-500" />
                {category.name}
              </h2>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl px-6 border border-gray-200 dark:border-gray-800">
                {category.questions.map((item, index) => (
                  <FAQItem key={index} question={item.q} answer={item.a} />
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* More Questions Section */}
        <section className="bg-gray-50 dark:bg-gray-900/50 py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-3xl p-8 md:p-12 text-center border border-emerald-200 dark:border-emerald-800">
              <MessageSquare className="w-12 h-12 text-emerald-500 mx-auto mb-6" />
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                Still have questions?
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
                Can't find what you're looking for? Join our Discord community or check out the Frame.dev FAQ for more information.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="https://discord.gg/VXXC4SJMKh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors shadow-md"
                >
                  <MessageSquare className="w-5 h-5" />
                  Join Discord
                </a>
                <a
                  href="https://frame.dev/faq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-semibold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Frame.dev FAQ
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Try Quarry today and experience AI-native knowledge management.
          </p>
          <Link
            href="/quarry"
            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl"
          >
            <Sparkles className="w-5 h-5" />
            <span style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}>Try Quarry</span>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  )
}

