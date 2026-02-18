/**
 * AI Editor Features Help Content
 * @module quarry/help/content/aiEditorHelp
 *
 * Help content, tour definitions, and FAQ for:
 * - AI Writing Assistant (ghost text suggestions)
 * - AI Image Generation
 */

import type { StepHelp, FieldHelp, WizardTourStep, WizardHelp } from '../HelpContent'

/* ═══════════════════════════════════════════════════════════════════════════
   AI WRITING ASSISTANT
═══════════════════════════════════════════════════════════════════════════ */

export const writingAssistantStepHelp: StepHelp = {
  id: 'ai-writing-assistant',
  title: 'AI Writing Assistant',
  overview: `Get intelligent writing suggestions as you type. The AI analyzes your context and offers ghost text completions that you can accept with Tab or dismiss with Escape.`,
  instructions: [
    'Enable the Writing Assistant in Settings → AI Features',
    'Start typing in any text block in the editor',
    'After a brief pause (configurable), ghost text suggestions appear',
    'Press Tab to accept the suggestion, or Esc to dismiss',
    'Use Ctrl+Space (Cmd+Space on Mac) to manually trigger suggestions',
  ],
  tips: [
    'Adjust the trigger delay in settings - faster for quick writers, slower to avoid interruptions',
    'Choose suggestion length based on your needs: short (1 sentence), medium (2-3 sentences), or long (full paragraph)',
    'The AI learns from your writing context - provide more text for better suggestions',
    'Disable auto-trigger if you prefer manual control with Ctrl+Space',
  ],
  troubleshooting: [
    {
      problem: 'No suggestions appearing',
      solution: 'Check that you have an OpenAI or Anthropic API key configured in Settings → API Keys',
    },
    {
      problem: 'Suggestions are too slow',
      solution: 'Reduce the trigger delay in Settings → AI Features → Writing Assistant',
    },
    {
      problem: 'Suggestions are off-topic',
      solution: 'Write more context before pausing - the AI uses surrounding text to understand your intent',
    },
    {
      problem: 'Tab key not accepting suggestions',
      solution: 'Make sure the cursor is at the end of your text where the ghost text appears',
    },
  ],
  quickRef: [
    { term: 'Ghost Text', definition: 'Semi-transparent suggested text that appears after your cursor' },
    { term: 'Tab', definition: 'Accept the current suggestion and insert it into your document' },
    { term: 'Escape', definition: 'Dismiss the current suggestion without inserting' },
    { term: 'Ctrl+Space', definition: 'Manually trigger a suggestion at any time' },
    { term: 'Trigger Delay', definition: 'How long to wait after you stop typing before showing suggestions (300-1000ms)' },
  ],
}

export const writingAssistantFieldHelp: Record<string, FieldHelp> = {
  enabled: {
    name: 'enabled',
    label: 'Enable Writing Suggestions',
    description: 'Toggle AI-powered ghost text suggestions while you type',
    examples: ['Turn on to get writing help', 'Turn off for distraction-free writing'],
  },
  autoTrigger: {
    name: 'autoTrigger',
    label: 'Auto-Trigger on Pause',
    description: 'Automatically show suggestions when you stop typing',
    examples: ['Enable for seamless suggestions', 'Disable to only use Ctrl+Space'],
    cautions: ['May feel intrusive for some writers'],
  },
  triggerDelay: {
    name: 'triggerDelay',
    label: 'Trigger Delay',
    description: 'How long to wait after typing stops before showing suggestions',
    examples: ['300ms for fast suggestions', '1000ms for more deliberate writing'],
    suggestion: 'Start with 500ms and adjust based on preference',
  },
  suggestionLength: {
    name: 'suggestionLength',
    label: 'Suggestion Length',
    description: 'How much text the AI should suggest at once',
    examples: ['Short: Complete the sentence', 'Medium: Add a few sentences', 'Long: Generate a paragraph'],
  },
}

export const writingAssistantTourSteps: WizardTourStep[] = [
  {
    id: 'ai-settings-step',
    target: '[data-tour="ai-settings"]',
    title: 'Enable AI Writing',
    description: 'First, enable the Writing Assistant in your AI settings. You\'ll need an API key from OpenAI or Anthropic.',
    position: 'bottom',
    blocking: false,
  },
  {
    id: 'editor-block-step',
    target: '[data-tour="editor-block"]',
    title: 'Start Writing',
    description: 'Click on any text block and start typing. The AI will analyze your context as you write.',
    position: 'right',
    blocking: false,
  },
  {
    id: 'ghost-text-step',
    target: '[data-tour="ghost-text"]',
    title: 'Ghost Text Appears',
    description: 'After you pause, suggested text appears in gray italic. This is your AI suggestion!',
    position: 'top',
    blocking: false,
  },
  {
    id: 'accept-suggestion-step',
    target: '[data-tour="accept-suggestion"]',
    title: 'Accept or Dismiss',
    description: 'Press Tab to insert the suggestion, or Escape to dismiss it. You can also just keep typing to ignore it.',
    position: 'bottom',
    blocking: false,
  },
  {
    id: 'manual-trigger-step',
    target: '[data-tour="manual-trigger"]',
    title: 'Manual Trigger',
    description: 'Press Ctrl+Space (Cmd+Space on Mac) anytime to request a suggestion on demand.',
    position: 'bottom',
    blocking: false,
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   AI IMAGE GENERATION
═══════════════════════════════════════════════════════════════════════════ */

export const imageGenerationStepHelp: StepHelp = {
  id: 'ai-image-generation',
  title: 'AI Image Generation',
  overview: `Generate custom images from text descriptions using DALL-E or Flux. Create illustrations, photos, diagrams, and more - all without leaving the editor.`,
  instructions: [
    'Enable Image Generation in Settings → AI Features',
    'Select text that describes what you want to visualize',
    'Click the image icon in the floating toolbar, or type /image',
    'Choose a style preset and size',
    'Click Generate and wait for your image',
    'Insert it directly below your current block',
  ],
  tips: [
    'Be specific in your descriptions - "a golden retriever playing fetch in a sunny park" works better than "a dog"',
    'Style presets automatically enhance your prompt for consistent results',
    'Use Illustration for editorial content, Photo for realistic imagery, Diagram for explanatory visuals',
    'Square images work best for most document layouts',
  ],
  troubleshooting: [
    {
      problem: 'Image generation button not appearing',
      solution: 'Enable "Show in Selection Toolbar" in Settings → AI Features → Image Generation',
    },
    {
      problem: 'Generation fails with error',
      solution: 'Check your OpenAI API key has access to DALL-E 3, or configure a Replicate key for Flux',
    },
    {
      problem: 'Images look different than expected',
      solution: 'Try a different style preset, or add more detail to your description',
    },
    {
      problem: 'Generation is slow',
      solution: 'Image generation typically takes 10-30 seconds. Be patient with complex prompts.',
    },
  ],
  quickRef: [
    { term: 'Style Presets', definition: 'Pre-configured prompts that guide the AI toward specific visual styles' },
    { term: 'Illustration', definition: 'Clean, editorial-style artwork suitable for articles and blogs' },
    { term: 'Photo', definition: 'Photorealistic imagery that looks like a real photograph' },
    { term: 'Diagram', definition: 'Technical, explanatory visuals with clear lines and labels' },
    { term: 'Sketch', definition: 'Hand-drawn look with visible strokes and artistic imperfection' },
    { term: 'Watercolor', definition: 'Soft, artistic style with flowing colors and organic edges' },
    { term: '3D', definition: 'Modern volumetric renders with depth and lighting' },
    { term: 'Pixel Art', definition: 'Retro game-style pixelated graphics' },
  ],
}

export const imageGenerationFieldHelp: Record<string, FieldHelp> = {
  enabled: {
    name: 'enabled',
    label: 'Enable Image Generation',
    description: 'Allow AI-powered image creation from text descriptions',
    examples: ['Turn on to create custom visuals', 'Turn off if you don\'t need generated images'],
  },
  showInToolbar: {
    name: 'showInToolbar',
    label: 'Show in Selection Toolbar',
    description: 'Display the image generation button when text is selected',
    examples: ['Enable for quick access', 'Disable if you prefer using /image command'],
  },
  defaultStyle: {
    name: 'defaultStyle',
    label: 'Default Style Preset',
    description: 'The style preset selected by default when opening the image generator',
    examples: ['Illustration for most articles', 'Photo for realistic content'],
    suggestion: 'Choose based on your most common use case',
  },
  defaultSize: {
    name: 'defaultSize',
    label: 'Default Size',
    description: 'The default dimensions for generated images',
    examples: ['Square (1024x1024) for versatile use', 'Landscape for headers', 'Portrait for cards'],
  },
}

export const imageGenerationTourSteps: WizardTourStep[] = [
  {
    id: 'image-gen-settings-step',
    target: '[data-tour="image-gen-settings"]',
    title: 'Enable Image Generation',
    description: 'Turn on AI Image Generation in your settings. You\'ll need an OpenAI API key with DALL-E access.',
    position: 'bottom',
    blocking: false,
  },
  {
    id: 'text-selection-step',
    target: '[data-tour="text-selection"]',
    title: 'Select Your Prompt',
    description: 'Highlight text that describes what you want to visualize. This becomes your image prompt.',
    position: 'top',
    blocking: false,
  },
  {
    id: 'image-gen-button-step',
    target: '[data-tour="image-gen-button"]',
    title: 'Click to Generate',
    description: 'Click the image icon in the toolbar to open the generation modal with your selected text.',
    position: 'bottom',
    blocking: false,
  },
  {
    id: 'style-presets-step',
    target: '[data-tour="style-presets"]',
    title: 'Choose a Style',
    description: 'Pick from style presets like Illustration, Photo, or Diagram. Each adds specific guidance for the AI.',
    position: 'right',
    blocking: false,
  },
  {
    id: 'size-selector-step',
    target: '[data-tour="size-selector"]',
    title: 'Select Size',
    description: 'Choose square, landscape, or portrait orientation based on where you\'ll use the image.',
    position: 'right',
    blocking: false,
  },
  {
    id: 'generate-button-step',
    target: '[data-tour="generate-button"]',
    title: 'Generate!',
    description: 'Click Generate and wait 10-30 seconds. You can preview and download, or insert directly into your document.',
    position: 'top',
    blocking: false,
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   FAQ ENTRIES
═══════════════════════════════════════════════════════════════════════════ */

export interface FAQItem {
  question: string
  answer: string
  category: 'writing' | 'image' | 'general'
}

export const aiEditorFAQs: FAQItem[] = [
  // Writing Assistant FAQs
  {
    question: 'How do I enable AI writing suggestions?',
    answer: 'Go to Settings → AI Features and toggle on "Enable Writing Suggestions". You\'ll need an OpenAI or Anthropic API key configured in Settings → API Keys.',
    category: 'writing',
  },
  {
    question: 'Why aren\'t AI suggestions appearing when I type?',
    answer: 'Check these common issues: 1) Ensure you have a valid API key configured, 2) Make sure Writing Assistant is enabled in settings, 3) Try increasing the trigger delay if suggestions appear too quickly and dismiss before you see them, 4) Press Ctrl+Space to manually trigger a suggestion.',
    category: 'writing',
  },
  {
    question: 'How do I accept or reject AI suggestions?',
    answer: 'When ghost text appears in gray after your cursor: Press Tab to accept and insert the text, press Escape to dismiss it, or simply keep typing to ignore it. The suggestion will clear automatically when you start typing.',
    category: 'writing',
  },
  {
    question: 'Can I trigger suggestions manually instead of waiting?',
    answer: 'Yes! Press Ctrl+Space (or Cmd+Space on Mac) at any time to request a suggestion on demand. You can also disable "Auto-Trigger on Pause" in settings if you prefer manual-only mode.',
    category: 'writing',
  },
  {
    question: 'How do I adjust how much text the AI suggests?',
    answer: 'In Settings → AI Features → Writing Assistant, choose your Suggestion Length: Short (completes your sentence), Medium (adds 2-3 sentences), or Long (generates a full paragraph).',
    category: 'writing',
  },
  {
    question: 'The AI suggestions don\'t match my writing style. What can I do?',
    answer: 'The AI uses surrounding context to match your style. Try writing more content before pausing, as more context helps the AI understand your voice. You can also try switching between OpenAI and Anthropic providers in API Keys settings.',
    category: 'writing',
  },

  // Image Generation FAQs
  {
    question: 'How do I generate images in the editor?',
    answer: 'There are three ways: 1) Select text and click the image icon in the floating toolbar, 2) Type /image in any block to open the command palette, 3) Right-click selected text and choose "Generate Image". All methods open the image generation modal.',
    category: 'image',
  },
  {
    question: 'What image styles are available?',
    answer: 'Seven style presets: Illustration (clean editorial art), Photo (photorealistic), Diagram (technical/explanatory), Sketch (hand-drawn look), Watercolor (artistic flowing colors), 3D (modern volumetric renders), and Pixel Art (retro game-style graphics).',
    category: 'image',
  },
  {
    question: 'Why is image generation failing?',
    answer: 'Check that: 1) You have an OpenAI API key with DALL-E 3 access, or a Replicate API key for Flux, 2) Your API key has sufficient credits/quota, 3) Your prompt doesn\'t violate content policies. Try simplifying your description if issues persist.',
    category: 'image',
  },
  {
    question: 'How long does image generation take?',
    answer: 'Typically 10-30 seconds depending on complexity. DALL-E 3 tends to be faster, while Flux may take longer but produces different aesthetic results. Complex scenes with many details take longer to generate.',
    category: 'image',
  },
  {
    question: 'Can I edit a generated image?',
    answer: 'Currently, you cannot edit generated images in-app. However, you can download the image, edit it externally, and re-upload. Alternatively, try regenerating with a modified prompt for different results.',
    category: 'image',
  },
  {
    question: 'What image sizes are available?',
    answer: 'Three size options: Square (1024×1024) for versatile use, Landscape (1792×1024) for headers and banners, and Portrait (1024×1792) for cards and mobile-first content.',
    category: 'image',
  },

  // General AI FAQs
  {
    question: 'Which AI providers are supported?',
    answer: 'For writing suggestions: OpenAI (GPT-4o-mini) and Anthropic (Claude 3 Haiku). For image generation: OpenAI (DALL-E 3) and Replicate (Flux). Configure your preferred provider in Settings → API Keys.',
    category: 'general',
  },
  {
    question: 'Are my API keys stored securely?',
    answer: 'Yes. API keys are encrypted before storage using AES-256-GCM encryption. Keys are only decrypted in memory when making API calls and are never sent to our servers.',
    category: 'general',
  },
  {
    question: 'Do AI features work offline?',
    answer: 'No. AI writing suggestions and image generation require an internet connection to communicate with OpenAI or Anthropic APIs. All other editor features work fully offline.',
    category: 'general',
  },
  {
    question: 'How much do AI features cost?',
    answer: 'You pay directly to the AI providers based on their pricing. Writing suggestions use GPT-4o-mini (~$0.15/1M tokens) or Claude Haiku (~$0.25/1M tokens). Image generation uses DALL-E 3 (~$0.04-0.12 per image depending on size).',
    category: 'general',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
═══════════════════════════════════════════════════════════════════════════ */

export interface KeyboardShortcut {
  keys: string[]
  action: string
  description: string
  feature: 'writing' | 'image'
}

export const aiKeyboardShortcuts: KeyboardShortcut[] = [
  {
    keys: ['Tab'],
    action: 'Accept suggestion',
    description: 'Insert the current ghost text suggestion into your document',
    feature: 'writing',
  },
  {
    keys: ['Escape'],
    action: 'Dismiss suggestion',
    description: 'Clear the current suggestion without inserting',
    feature: 'writing',
  },
  {
    keys: ['Ctrl', 'Space'],
    action: 'Trigger suggestion',
    description: 'Manually request an AI suggestion at the cursor position',
    feature: 'writing',
  },
  {
    keys: ['Cmd', 'Shift', 'I'],
    action: 'Generate image',
    description: 'Open image generation modal with selected text as prompt',
    feature: 'image',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   TOUR DEFINITIONS
═══════════════════════════════════════════════════════════════════════════ */

export const AI_TOUR_IDS = {
  WRITING_ASSISTANT: 'ai-writing-assistant-tour',
  IMAGE_GENERATION: 'ai-image-generation-tour',
} as const

export const writingAssistantTour: WizardHelp = {
  id: AI_TOUR_IDS.WRITING_ASSISTANT,
  title: 'AI Writing Assistant',
  description: 'Learn how to use the AI-powered writing assistant to enhance your writing with intelligent suggestions.',
  steps: [writingAssistantStepHelp],
  tourSteps: writingAssistantTourSteps,
}

export const imageGenerationTour: WizardHelp = {
  id: AI_TOUR_IDS.IMAGE_GENERATION,
  title: 'AI Image Generation',
  description: 'Learn how to generate custom images from text descriptions using AI.',
  steps: [imageGenerationStepHelp],
  tourSteps: imageGenerationTourSteps,
}
