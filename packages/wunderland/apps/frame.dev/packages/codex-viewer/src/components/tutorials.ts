/**
 * Tutorial configurations for the Quarry Codex walkthrough.
 * Defines steps, targets, and descriptive content for onboarding.
 * @module codex/tutorials
 */

import { TutorialStep } from '../ui/TutorialTour'

export type TutorialId = 'intro' | 'navigation' | 'search' | 'editing' | 'reader'

export interface TutorialConfig {
  id: TutorialId
  title: string
  steps: TutorialStep[]
}

export const TUTORIALS: Record<TutorialId, TutorialConfig> = {
  intro: {
    id: 'intro',
    title: 'Welcome to Codex',
    steps: [
      {
        id: 'intro-welcome',
        target: 'body',
        title: 'Welcome to Quarry',
        description: 'This is your knowledge base viewer. Let\'s take a quick tour of the main features.',
        placement: 'bottom',
      },
      {
        id: 'intro-sidebar',
        target: '[data-testid="codex-sidebar"]',
        title: 'Navigation Sidebar',
        description: 'Browse your file tree here. Use the density toggle in settings to adjust the view.',
        placement: 'right',
      },
      {
        id: 'intro-content',
        target: '[data-testid="codex-content"]',
        title: 'Content Viewer',
        description: 'Your selected files appear here. We support Markdown, code, images, and more.',
        placement: 'left',
      },
    ],
  },
  navigation: {
    id: 'navigation',
    title: 'Navigation & Organization',
    steps: [
      {
        id: 'nav-breadcrumbs',
        target: '[data-testid="nav-breadcrumbs"]',
        title: 'Breadcrumbs',
        description: 'See exactly where you are in the hierarchy. Click any segment to jump up.',
        placement: 'bottom',
      },
      {
        id: 'nav-bookmarks',
        target: '[data-testid="nav-bookmarks"]',
        title: 'Bookmarks',
        description: 'Pin important files for quick access later.',
        placement: 'bottom',
      },
    ],
  },
  search: {
    id: 'search',
    title: 'Powerful Search',
    steps: [
      {
        id: 'search-trigger',
        target: '[data-testid="search-trigger"]',
        title: 'Quick Search',
        description: 'Press "/" to start searching instantly. Find files by name or content.',
        placement: 'bottom',
      },
      {
        id: 'search-filters',
        target: '[data-testid="search-filters"]',
        title: 'Search Filters',
        description: 'Narrow down results by file type, date, or path.',
        placement: 'bottom',
      },
    ],
  },
  editing: {
    id: 'editing',
    title: 'Editing & Contributing',
    steps: [
      {
        id: 'edit-mode',
        target: '[data-testid="edit-button"]',
        title: 'Edit Mode',
        description: 'Found a typo? Switch to edit mode to make changes.',
        placement: 'bottom',
      },
      {
        id: 'contribute',
        target: '[data-testid="contribute-button"]',
        title: 'Contribute',
        description: 'Submit your changes via a Pull Request directly from Codex.',
        placement: 'bottom',
      },
    ],
  },
  reader: {
    id: 'reader',
    title: 'Reader Mode & Summaries',
    steps: [
      {
        id: 'reader-intro',
        target: '[data-testid="metadata-panel"]',
        title: 'Reader Mode',
        description: 'Access the Reader tab for paragraph-by-paragraph summaries that scroll with your content.',
        placement: 'left',
      },
      {
        id: 'reader-extractive',
        target: '[data-testid="reader-mode-toggle"]',
        title: 'Extractive Summaries',
        description: 'View TF-IDF extracted key sentences from each paragraph and code block.',
        placement: 'bottom',
      },
      {
        id: 'reader-abstractive',
        target: '[data-testid="reader-ai-toggle"]',
        title: 'AI Summaries',
        description: 'Toggle AI-generated abstractive summaries for deeper understanding.',
        placement: 'bottom',
      },
      {
        id: 'reader-illustrations',
        target: '[data-testid="reader-illustrations"]',
        title: 'Illustrations',
        description: 'View auto-generated diagrams and images attached to specific blocks.',
        placement: 'bottom',
      },
      {
        id: 'reader-sync',
        target: '[data-testid="codex-content"]',
        title: 'Scroll Sync',
        description: 'As you scroll through content, the Reader panel highlights the active block summary.',
        placement: 'left',
      },
    ],
  },
}
