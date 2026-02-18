/**
 * Learning Studio Tour - Guided introduction to Learning Studio features
 * @module quarry/ui/learning/LearningStudioTour
 *
 * Multi-step tour explaining all Learning Studio tabs and features.
 * Auto-shows on first visit, can be replayed via info button.
 */

import type { TourDefinition, TourStep } from '../tour/useTour'

export const LEARNING_STUDIO_TOUR_ID = 'learning-studio-intro'
export const LEARNING_STUDIO_TOUR_VERSION = 1

export const learningStudioTourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Learning Studio',
    content: 'Your all-in-one learning companion. Master any topic with flashcards, quizzes, AI-assisted teaching, and more. Let me show you around!',
    placement: 'center',
    spotlight: false,
  },
  {
    id: 'flashcards',
    target: '[data-tour="tab-flashcards"]',
    title: 'Flashcards with Spaced Repetition',
    content: 'Study efficiently with AI-generated flashcards. Our FSRS algorithm schedules reviews at optimal intervals to maximize long-term retention. Rate cards as Again, Hard, Good, or Easy.',
    placement: 'bottom',
    spotlight: true,
  },
  {
    id: 'quiz',
    target: '[data-tour="tab-quiz"]',
    title: 'Quiz Mode',
    content: 'Test your knowledge with multiple choice, true/false, and fill-in-the-blank questions. Track your progress and identify areas that need more practice.',
    placement: 'bottom',
    spotlight: true,
  },
  {
    id: 'teach',
    target: '[data-tour="tab-teach"]',
    title: 'Teach Mode (Feynman Technique)',
    content: 'The best way to learn is to teach! Explain concepts to a virtual student and get AI feedback on gaps in your understanding.',
    placement: 'bottom',
    spotlight: true,
  },
  {
    id: 'glossary',
    target: '[data-tour="tab-glossary"]',
    title: 'Global Glossary',
    content: 'Access all terms and definitions across your selected strands. Search, filter by category, and quickly review key concepts.',
    placement: 'bottom',
    spotlight: true,
  },
  {
    id: 'mindmaps',
    target: '[data-tour="tab-mindmaps"]',
    title: 'Mind Maps',
    content: 'Visualize connections between concepts. Generate interactive mind maps in hierarchy, graph, or concept view. Export as SVG, PNG, or JSON.',
    placement: 'bottom',
    spotlight: true,
  },
  {
    id: 'questions',
    target: '[data-tour="tab-questions"]',
    title: 'Suggested Questions',
    content: 'AI-generated discussion questions and prompts to deepen your understanding. Use these as study guides or conversation starters.',
    placement: 'bottom',
    spotlight: true,
  },
  {
    id: 'strand-selection',
    target: '[data-tour="strand-selector"]',
    title: 'Select Your Content',
    content: 'Choose which strands to study. Select multiple strands to create comprehensive study materials that connect related concepts across topics.',
    placement: 'bottom',
    spotlight: true,
  },
  {
    id: 'generation-mode',
    target: '[data-tour="generation-mode"]',
    title: 'Generation Mode',
    content: 'Choose between Offline NLP (fast, works offline) or LLM (higher quality, requires API key). Switch modes based on your needs.',
    placement: 'bottom',
    spotlight: true,
  },
  {
    id: 'complete',
    title: 'Ready to Learn!',
    content: 'You\'re all set! Select some strands and start your learning journey. Click the help button anytime to replay this tour.',
    placement: 'center',
    spotlight: false,
  },
]

export const learningStudioTour: TourDefinition = {
  id: LEARNING_STUDIO_TOUR_ID,
  name: 'Learning Studio Introduction',
  description: 'A guided tour of Learning Studio features',
  steps: learningStudioTourSteps,
  showOnFirstVisit: true,
  version: LEARNING_STUDIO_TOUR_VERSION,
}
