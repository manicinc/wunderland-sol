/**
 * AI Features Tour Definitions
 * @module quarry/ui/tour/aiTours
 *
 * Tour definitions for AI Writing Assistant and Image Generation features.
 * Uses the useTour hook for state management.
 */

import type { TourDefinition, TourStep } from './useTour'

/* ═══════════════════════════════════════════════════════════════════════════
   AI WRITING ASSISTANT TOUR
═══════════════════════════════════════════════════════════════════════════ */

const writingAssistantSteps: TourStep[] = [
  {
    id: 'wa-intro',
    title: 'AI Writing Assistant',
    content: 'Get intelligent writing suggestions as you type! The AI analyzes your context and offers ghost text completions.',
    placement: 'center',
    image: '/images/tour/writing-assistant-intro.svg',
  },
  {
    id: 'wa-enable',
    target: '[data-testid="ai-features-tab"], [data-tour="ai-settings"]',
    title: 'Enable in Settings',
    content: 'First, open Settings and go to AI Features. Toggle on "Enable Writing Suggestions" and make sure you have an API key configured.',
    placement: 'right',
    spotlight: true,
  },
  {
    id: 'wa-typing',
    target: '[data-testid="editor-content"], .ProseMirror, [data-tour="editor-block"]',
    title: 'Start Writing',
    content: 'Click on any text block and start typing. The AI watches as you write and learns your context.',
    placement: 'top',
    spotlight: true,
  },
  {
    id: 'wa-ghost-text',
    title: 'Ghost Text Appears',
    content: 'After you pause typing (configurable delay), gray italic text appears after your cursor. This is the AI\'s suggestion!',
    placement: 'center',
    image: '/images/tour/ghost-text-example.svg',
  },
  {
    id: 'wa-accept',
    title: 'Accept with Tab',
    content: 'Press Tab to insert the suggestion into your document. The ghost text becomes real text!',
    placement: 'center',
  },
  {
    id: 'wa-dismiss',
    title: 'Dismiss with Escape',
    content: 'Press Escape to dismiss the suggestion without inserting. Or just keep typing - the suggestion clears automatically.',
    placement: 'center',
  },
  {
    id: 'wa-manual',
    title: 'Manual Trigger',
    content: 'Press Ctrl+Space (Cmd+Space on Mac) anytime to request a suggestion on demand. Great for writer\'s block!',
    placement: 'center',
  },
  {
    id: 'wa-customize',
    target: '[data-testid="writing-assistant-settings"], [data-tour="writing-settings"]',
    title: 'Customize Your Experience',
    content: 'Adjust trigger delay (how long to wait), suggestion length (sentence vs paragraph), and whether to auto-trigger or use manual mode only.',
    placement: 'left',
    spotlight: true,
  },
]

export const writingAssistantTour: TourDefinition = {
  id: 'ai-writing-assistant',
  name: 'AI Writing Assistant',
  description: 'Learn how to use AI-powered writing suggestions',
  steps: writingAssistantSteps,
  showOnFirstVisit: false,
  version: 1,
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI IMAGE GENERATION TOUR
═══════════════════════════════════════════════════════════════════════════ */

const imageGenerationSteps: TourStep[] = [
  {
    id: 'ig-intro',
    title: 'AI Image Generation',
    content: 'Create custom images from text descriptions! Generate illustrations, photos, diagrams, and more - powered by DALL-E and Flux.',
    placement: 'center',
    image: '/images/tour/image-gen-intro.svg',
  },
  {
    id: 'ig-enable',
    target: '[data-testid="image-gen-settings"], [data-tour="image-gen-settings"]',
    title: 'Enable in Settings',
    content: 'Open Settings → AI Features and toggle on Image Generation. You\'ll need an OpenAI API key with DALL-E access.',
    placement: 'right',
    spotlight: true,
  },
  {
    id: 'ig-select-text',
    target: '[data-testid="editor-content"], .ProseMirror',
    title: 'Select Your Prompt',
    content: 'Highlight text that describes what you want to visualize. For example: "a cozy coffee shop with warm lighting and plants"',
    placement: 'top',
    spotlight: true,
  },
  {
    id: 'ig-toolbar-button',
    target: '[data-testid="image-gen-button"], [data-tour="image-gen-button"]',
    title: 'Click the Image Button',
    content: 'In the floating toolbar, click the image icon to open the generation modal with your selected text as the prompt.',
    placement: 'bottom',
    spotlight: true,
  },
  {
    id: 'ig-slash-command',
    title: 'Or Use /image Command',
    content: 'Type /image in any block to open the command palette. Select "Generate Image" to open the modal.',
    placement: 'center',
  },
  {
    id: 'ig-style-presets',
    target: '[data-testid="style-presets"], [data-tour="style-presets"]',
    title: 'Choose a Style',
    content: 'Pick from 7 style presets: Illustration, Photo, Diagram, Sketch, Watercolor, 3D, or Pixel Art. Each adds specific guidance for the AI.',
    placement: 'right',
    spotlight: true,
  },
  {
    id: 'ig-size',
    target: '[data-testid="size-selector"], [data-tour="size-selector"]',
    title: 'Select Size',
    content: 'Choose Square (1024×1024) for general use, Landscape (1792×1024) for headers, or Portrait (1024×1792) for cards.',
    placement: 'right',
    spotlight: true,
  },
  {
    id: 'ig-generate',
    target: '[data-testid="generate-button"], [data-tour="generate-button"]',
    title: 'Generate Your Image',
    content: 'Click Generate and wait 10-30 seconds. Preview your image, download it, or insert it directly into your document!',
    placement: 'top',
    spotlight: true,
  },
]

export const imageGenerationTour: TourDefinition = {
  id: 'ai-image-generation',
  name: 'AI Image Generation',
  description: 'Learn how to create images from text descriptions',
  steps: imageGenerationSteps,
  showOnFirstVisit: false,
  version: 1,
}

/* ═══════════════════════════════════════════════════════════════════════════
   QUICK TIPS (Mini-tours for specific features)
═══════════════════════════════════════════════════════════════════════════ */

export const ghostTextQuickTip: TourDefinition = {
  id: 'ghost-text-tip',
  name: 'Ghost Text',
  description: 'Quick tip about accepting AI suggestions',
  steps: [
    {
      id: 'ghost-tip',
      title: 'AI Suggestion',
      content: 'Press Tab to accept this suggestion, or Escape to dismiss it.',
      placement: 'top',
    },
  ],
  showOnFirstVisit: true,
  version: 1,
}

export const imageGenQuickTip: TourDefinition = {
  id: 'image-gen-tip',
  name: 'Image Generation',
  description: 'Quick tip about generating images',
  steps: [
    {
      id: 'image-tip',
      title: 'Generate Image',
      content: 'Select text and click this button to create an AI image from your description.',
      placement: 'bottom',
    },
  ],
  showOnFirstVisit: true,
  version: 1,
}

/* ═══════════════════════════════════════════════════════════════════════════
   ALL AI TOURS
═══════════════════════════════════════════════════════════════════════════ */

export const AI_TOURS = {
  WRITING_ASSISTANT: writingAssistantTour,
  IMAGE_GENERATION: imageGenerationTour,
  GHOST_TEXT_TIP: ghostTextQuickTip,
  IMAGE_GEN_TIP: imageGenQuickTip,
} as const

export type AITourId = keyof typeof AI_TOURS

/**
 * Get all available AI tours
 */
export function getAITours(): TourDefinition[] {
  return Object.values(AI_TOURS)
}

/**
 * Get a specific AI tour by ID
 */
export function getAITour(id: string): TourDefinition | undefined {
  return Object.values(AI_TOURS).find(tour => tour.id === id)
}
