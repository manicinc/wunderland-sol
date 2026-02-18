/**
 * Visualization Presets Library
 * @module lib/visualization/presets
 * 
 * A comprehensive library of aesthetic visualization presets, prompt templates,
 * and style configurations for generating cohesive, matching visuals.
 * 
 * Features:
 * - Pre-defined aesthetic styles (minimalist, technical, artistic, etc.)
 * - Prompt injection templates for AI image generation
 * - Graph and diagram presets (flowcharts, timelines, character maps)
 * - Reusable visualization components
 * - Cohesive color palettes and typography
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface VisualizationStyle {
  id: string
  name: string
  description: string
  category: 'minimalist' | 'technical' | 'artistic' | 'educational' | 'corporate' | 'playful'
  colors: ColorPalette
  typography: TypographyConfig
  promptPrefix: string
  promptSuffix: string
  examples?: string[]
}

export interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  background: string
  foreground: string
  muted: string
  border: string
  success: string
  warning: string
  error: string
  info: string
}

export interface TypographyConfig {
  headingFont: string
  bodyFont: string
  codeFont: string
  scale: 'compact' | 'normal' | 'large'
}

export interface DiagramPreset {
  id: string
  name: string
  type: 'flowchart' | 'timeline' | 'mindmap' | 'hierarchy' | 'network' | 'sequence' | 'character-map' | 'plot-diagram'
  description: string
  template: string
  styleOverrides?: Partial<VisualizationStyle>
}

export interface PromptTemplate {
  id: string
  name: string
  category: string
  template: string
  variables: string[]
  examples: Array<{ input: Record<string, string>; output: string }>
}

// ═══════════════════════════════════════════════════════════════════════════
// COLOR PALETTES
// ═══════════════════════════════════════════════════════════════════════════

export const COLOR_PALETTES = {
  /** Deep ocean blue theme */
  ocean: {
    primary: '#0ea5e9',
    secondary: '#06b6d4',
    accent: '#14b8a6',
    background: '#0f172a',
    foreground: '#f8fafc',
    muted: '#64748b',
    border: '#334155',
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
    info: '#3b82f6',
  } as ColorPalette,
  
  /** Warm sunset gradient */
  sunset: {
    primary: '#f97316',
    secondary: '#fb923c',
    accent: '#facc15',
    background: '#1c1917',
    foreground: '#fafaf9',
    muted: '#78716c',
    border: '#44403c',
    success: '#84cc16',
    warning: '#f59e0b',
    error: '#dc2626',
    info: '#0ea5e9',
  } as ColorPalette,
  
  /** Forest green nature theme */
  forest: {
    primary: '#22c55e',
    secondary: '#10b981',
    accent: '#34d399',
    background: '#14532d',
    foreground: '#f0fdf4',
    muted: '#6b7280',
    border: '#365314',
    success: '#86efac',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
  } as ColorPalette,
  
  /** Purple cyberpunk */
  cyber: {
    primary: '#a855f7',
    secondary: '#8b5cf6',
    accent: '#ec4899',
    background: '#09090b',
    foreground: '#fafafa',
    muted: '#71717a',
    border: '#27272a',
    success: '#4ade80',
    warning: '#fcd34d',
    error: '#f43f5e',
    info: '#22d3ee',
  } as ColorPalette,
  
  /** Clean monochrome */
  mono: {
    primary: '#18181b',
    secondary: '#27272a',
    accent: '#a1a1aa',
    background: '#fafafa',
    foreground: '#09090b',
    muted: '#71717a',
    border: '#e4e4e7',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  } as ColorPalette,
  
  /** Dark monochrome */
  monoDark: {
    primary: '#fafafa',
    secondary: '#e4e4e7',
    accent: '#71717a',
    background: '#09090b',
    foreground: '#fafafa',
    muted: '#52525b',
    border: '#27272a',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  } as ColorPalette,
  
  /** Warm paper aesthetic */
  paper: {
    primary: '#78716c',
    secondary: '#a8a29e',
    accent: '#d6d3d1',
    background: '#faf9f6',
    foreground: '#292524',
    muted: '#a8a29e',
    border: '#e7e5e4',
    success: '#65a30d',
    warning: '#ca8a04',
    error: '#dc2626',
    info: '#2563eb',
  } as ColorPalette,
}

// ═══════════════════════════════════════════════════════════════════════════
// VISUALIZATION STYLES
// ═══════════════════════════════════════════════════════════════════════════

export const VISUALIZATION_STYLES: VisualizationStyle[] = [
  {
    id: 'tech-minimal',
    name: 'Technical Minimalist',
    description: 'Clean, modern technical documentation style with minimal ornamentation',
    category: 'technical',
    colors: COLOR_PALETTES.mono,
    typography: {
      headingFont: 'Inter, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      codeFont: 'JetBrains Mono, Fira Code, monospace',
      scale: 'normal',
    },
    promptPrefix: 'Create a clean, minimal technical diagram with crisp lines and simple shapes.',
    promptSuffix: 'Use a limited color palette, clear labels, and ample whitespace. Style: technical illustration, flat design, no gradients.',
    examples: ['System architecture', 'API flow', 'Data pipeline'],
  },
  {
    id: 'tech-blueprint',
    name: 'Blueprint Technical',
    description: 'Engineering blueprint style with grid lines and precise measurements',
    category: 'technical',
    colors: COLOR_PALETTES.ocean,
    typography: {
      headingFont: 'IBM Plex Sans, sans-serif',
      bodyFont: 'IBM Plex Sans, sans-serif',
      codeFont: 'IBM Plex Mono, monospace',
      scale: 'compact',
    },
    promptPrefix: 'Create an engineering blueprint-style diagram with grid background and technical annotations.',
    promptSuffix: 'Use blue and white colors, thin precise lines, measurement markers, and engineering fonts. Style: technical blueprint, CAD-like.',
    examples: ['Circuit diagram', 'Mechanical system', 'Infrastructure'],
  },
  {
    id: 'edu-friendly',
    name: 'Educational Friendly',
    description: 'Warm, approachable style for learning materials',
    category: 'educational',
    colors: COLOR_PALETTES.sunset,
    typography: {
      headingFont: 'Nunito, sans-serif',
      bodyFont: 'Open Sans, sans-serif',
      codeFont: 'Source Code Pro, monospace',
      scale: 'large',
    },
    promptPrefix: 'Create a friendly, educational illustration that explains concepts clearly.',
    promptSuffix: 'Use warm colors, rounded shapes, helpful icons, and clear visual hierarchy. Style: educational infographic, beginner-friendly.',
    examples: ['How-to guide', 'Concept explanation', 'Tutorial step'],
  },
  {
    id: 'edu-academic',
    name: 'Academic Scholarly',
    description: 'Formal academic style for research and papers',
    category: 'educational',
    colors: COLOR_PALETTES.paper,
    typography: {
      headingFont: 'Crimson Pro, serif',
      bodyFont: 'Source Serif Pro, serif',
      codeFont: 'Fira Code, monospace',
      scale: 'normal',
    },
    promptPrefix: 'Create a scholarly diagram suitable for academic publication.',
    promptSuffix: 'Use classic academic styling, clear figure numbering, serif fonts, and professional appearance. Style: academic figure, research paper quality.',
    examples: ['Research diagram', 'Statistical chart', 'Methodology flow'],
  },
  {
    id: 'art-watercolor',
    name: 'Artistic Watercolor',
    description: 'Soft watercolor aesthetic with artistic flair',
    category: 'artistic',
    colors: COLOR_PALETTES.forest,
    typography: {
      headingFont: 'Fraunces, Georgia, serif',
      bodyFont: 'Lora, serif',
      codeFont: 'Fira Code, monospace',
      scale: 'normal',
    },
    promptPrefix: 'Create a beautiful watercolor-style illustration with soft edges and artistic touches.',
    promptSuffix: 'Use watercolor textures, soft gradients, organic shapes, and artistic composition. Style: watercolor illustration, artistic, hand-drawn feel.',
    examples: ['Concept art', 'Nature diagram', 'Creative visualization'],
  },
  {
    id: 'art-isometric',
    name: 'Isometric 3D',
    description: '3D isometric style with depth and perspective',
    category: 'artistic',
    colors: COLOR_PALETTES.cyber,
    typography: {
      headingFont: 'Space Grotesk, sans-serif',
      bodyFont: 'DM Sans, sans-serif',
      codeFont: 'JetBrains Mono, monospace',
      scale: 'normal',
    },
    promptPrefix: 'Create an isometric 3D illustration with clean geometric shapes and depth.',
    promptSuffix: 'Use isometric perspective, subtle shadows, vibrant colors, and geometric precision. Style: isometric illustration, 3D flat design.',
    examples: ['Architecture', 'Process flow', 'System overview'],
  },
  {
    id: 'corp-professional',
    name: 'Corporate Professional',
    description: 'Professional business style for presentations',
    category: 'corporate',
    colors: COLOR_PALETTES.ocean,
    typography: {
      headingFont: 'Outfit, sans-serif',
      bodyFont: 'Inter, sans-serif',
      codeFont: 'Fira Code, monospace',
      scale: 'normal',
    },
    promptPrefix: 'Create a professional business diagram suitable for executive presentations.',
    promptSuffix: 'Use corporate blue colors, clean lines, professional icons, and polished appearance. Style: business presentation, corporate infographic.',
    examples: ['Business model', 'Organization chart', 'Strategy diagram'],
  },
  {
    id: 'playful-cartoon',
    name: 'Playful Cartoon',
    description: 'Fun, cartoon-like style with personality',
    category: 'playful',
    colors: COLOR_PALETTES.sunset,
    typography: {
      headingFont: 'Fredoka One, cursive',
      bodyFont: 'Quicksand, sans-serif',
      codeFont: 'Comic Mono, monospace',
      scale: 'large',
    },
    promptPrefix: 'Create a fun, cartoon-style illustration with playful characters and elements.',
    promptSuffix: 'Use bright colors, rounded shapes, expressive characters, and whimsical details. Style: cartoon illustration, playful, kid-friendly.',
    examples: ['Mascot', 'Fun explainer', 'Gamified content'],
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// DIAGRAM PRESETS
// ═══════════════════════════════════════════════════════════════════════════

export const DIAGRAM_PRESETS: DiagramPreset[] = [
  {
    id: 'flowchart-process',
    name: 'Process Flowchart',
    type: 'flowchart',
    description: 'Standard process flow with decision points',
    template: `
Create a flowchart showing the process flow for: {{title}}

Include:
- Start and end nodes
- Process steps: {{steps}}
- Decision points: {{decisions}}
- Clear arrows showing flow direction
- Labels for each connection

Use {{style}} visual style.
    `.trim(),
  },
  {
    id: 'timeline-horizontal',
    name: 'Horizontal Timeline',
    type: 'timeline',
    description: 'Linear timeline showing events in sequence',
    template: `
Create a horizontal timeline visualization for: {{title}}

Events:
{{events}}

Include:
- Clear date/time markers
- Event descriptions
- Visual indicators for importance
- Connecting line between events

Use {{style}} visual style.
    `.trim(),
  },
  {
    id: 'timeline-vertical',
    name: 'Vertical Timeline',
    type: 'timeline',
    description: 'Vertical timeline with detailed descriptions',
    template: `
Create a vertical timeline visualization for: {{title}}

Events (in chronological order):
{{events}}

Include:
- Date markers on one side
- Detailed descriptions on the other
- Visual hierarchy for major vs minor events
- Iconography for event types

Use {{style}} visual style.
    `.trim(),
  },
  {
    id: 'mindmap-central',
    name: 'Central Mind Map',
    type: 'mindmap',
    description: 'Radial mind map with central topic',
    template: `
Create a mind map visualization for: {{title}}

Central concept: {{center}}
Main branches:
{{branches}}

Include:
- Central node prominently displayed
- Color-coded branches
- Sub-branches with decreasing size
- Optional icons for categories

Use {{style}} visual style.
    `.trim(),
  },
  {
    id: 'hierarchy-org',
    name: 'Organizational Hierarchy',
    type: 'hierarchy',
    description: 'Tree structure for organizational charts',
    template: `
Create an organizational hierarchy diagram for: {{title}}

Structure:
{{hierarchy}}

Include:
- Clear parent-child relationships
- Role/title labels
- Optional photos or avatars
- Department groupings if applicable

Use {{style}} visual style.
    `.trim(),
  },
  {
    id: 'network-graph',
    name: 'Network Graph',
    type: 'network',
    description: 'Network visualization showing connections',
    template: `
Create a network graph visualization for: {{title}}

Nodes:
{{nodes}}

Connections:
{{connections}}

Include:
- Node labels
- Connection weights (line thickness)
- Node grouping/clustering
- Legend for node types

Use {{style}} visual style.
    `.trim(),
  },
  {
    id: 'sequence-diagram',
    name: 'Sequence Diagram',
    type: 'sequence',
    description: 'UML-style sequence diagram for interactions',
    template: `
Create a sequence diagram for: {{title}}

Participants:
{{participants}}

Sequence:
{{sequence}}

Include:
- Participant lifelines
- Synchronous/asynchronous messages
- Return messages
- Activation boxes where appropriate

Use {{style}} visual style.
    `.trim(),
  },
  {
    id: 'character-map',
    name: 'Character Relationship Map',
    type: 'character-map',
    description: 'Visual map of character relationships',
    template: `
Create a character relationship map for: {{title}}

Characters:
{{characters}}

Relationships:
{{relationships}}

Include:
- Character portraits or icons
- Relationship lines with labels
- Color coding for relationship types
- Groupings for factions/families

Use {{style}} visual style.
    `.trim(),
  },
  {
    id: 'plot-arc',
    name: 'Story Plot Arc',
    type: 'plot-diagram',
    description: 'Visualization of narrative structure',
    template: `
Create a plot arc diagram for: {{title}}

Story beats:
- Exposition: {{exposition}}
- Rising Action: {{risingAction}}
- Climax: {{climax}}
- Falling Action: {{fallingAction}}
- Resolution: {{resolution}}

Include:
- Clear arc shape
- Labeled story beats
- Tension indicators
- Scene markers if applicable

Use {{style}} visual style.
    `.trim(),
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// PROMPT TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'concept-explanation',
    name: 'Concept Explanation',
    category: 'educational',
    template: `Create an illustration that explains the concept of {{concept}}.

Key points to visualize:
{{keyPoints}}

Target audience: {{audience}}
Complexity level: {{complexity}}

{{stylePrefix}}
{{styleSuffix}}`,
    variables: ['concept', 'keyPoints', 'audience', 'complexity', 'stylePrefix', 'styleSuffix'],
    examples: [
      {
        input: {
          concept: 'API Gateway',
          keyPoints: '- Single entry point\n- Load balancing\n- Authentication',
          audience: 'developers',
          complexity: 'intermediate',
        },
        output: 'Create an illustration that explains the concept of API Gateway...',
      },
    ],
  },
  {
    id: 'architecture-diagram',
    name: 'Architecture Diagram',
    category: 'technical',
    template: `Create a system architecture diagram for: {{systemName}}

Components:
{{components}}

Data flows:
{{dataFlows}}

External integrations:
{{integrations}}

{{stylePrefix}}
{{styleSuffix}}`,
    variables: ['systemName', 'components', 'dataFlows', 'integrations', 'stylePrefix', 'styleSuffix'],
    examples: [],
  },
  {
    id: 'comparison-visual',
    name: 'Comparison Visual',
    category: 'educational',
    template: `Create a visual comparison between {{itemA}} and {{itemB}}.

Comparison criteria:
{{criteria}}

Highlight:
- Similarities: {{similarities}}
- Differences: {{differences}}

{{stylePrefix}}
{{styleSuffix}}`,
    variables: ['itemA', 'itemB', 'criteria', 'similarities', 'differences', 'stylePrefix', 'styleSuffix'],
    examples: [],
  },
  {
    id: 'step-by-step',
    name: 'Step-by-Step Guide',
    category: 'educational',
    template: `Create a step-by-step visual guide for: {{taskName}}

Steps:
{{steps}}

Common mistakes to avoid:
{{mistakes}}

Tips:
{{tips}}

{{stylePrefix}}
{{styleSuffix}}`,
    variables: ['taskName', 'steps', 'mistakes', 'tips', 'stylePrefix', 'styleSuffix'],
    examples: [],
  },
  {
    id: 'data-visualization',
    name: 'Data Visualization',
    category: 'technical',
    template: `Create a data visualization for: {{title}}

Data type: {{dataType}}
Key insights to highlight:
{{insights}}

Chart type preference: {{chartType}}

{{stylePrefix}}
{{styleSuffix}}`,
    variables: ['title', 'dataType', 'insights', 'chartType', 'stylePrefix', 'styleSuffix'],
    examples: [],
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get a visualization style by ID
 */
export function getStyle(id: string): VisualizationStyle | undefined {
  return VISUALIZATION_STYLES.find(s => s.id === id)
}

/**
 * Get a diagram preset by ID
 */
export function getDiagramPreset(id: string): DiagramPreset | undefined {
  return DIAGRAM_PRESETS.find(d => d.id === id)
}

/**
 * Get a prompt template by ID
 */
export function getPromptTemplate(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find(p => p.id === id)
}

/**
 * Build a prompt from a template
 */
export function buildPrompt(
  templateId: string,
  variables: Record<string, string>,
  styleId?: string
): string {
  const template = getPromptTemplate(templateId)
  if (!template) {
    throw new Error(`Unknown prompt template: ${templateId}`)
  }
  
  const style = styleId ? getStyle(styleId) : undefined
  
  let prompt = template.template
  
  // Inject style prefixes if using a style
  if (style) {
    prompt = prompt
      .replace('{{stylePrefix}}', style.promptPrefix)
      .replace('{{styleSuffix}}', style.promptSuffix)
  } else {
    prompt = prompt
      .replace('{{stylePrefix}}', '')
      .replace('{{styleSuffix}}', '')
  }
  
  // Inject variables
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  
  return prompt.trim()
}

/**
 * Build a diagram prompt from a preset
 */
export function buildDiagramPrompt(
  presetId: string,
  variables: Record<string, string>,
  styleId?: string
): string {
  const preset = getDiagramPreset(presetId)
  if (!preset) {
    throw new Error(`Unknown diagram preset: ${presetId}`)
  }
  
  const style = styleId ? getStyle(styleId) : undefined
  
  let prompt = preset.template
  
  // Inject style name
  if (style) {
    prompt = prompt.replace('{{style}}', style.name)
  } else {
    prompt = prompt.replace('{{style}}', 'clean, professional')
  }
  
  // Inject variables
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  
  return prompt.trim()
}

/**
 * Get styles by category
 */
export function getStylesByCategory(category: VisualizationStyle['category']): VisualizationStyle[] {
  return VISUALIZATION_STYLES.filter(s => s.category === category)
}

/**
 * Get diagram presets by type
 */
export function getDiagramPresetsByType(type: DiagramPreset['type']): DiagramPreset[] {
  return DIAGRAM_PRESETS.filter(d => d.type === type)
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const VisualizationLibrary = {
  styles: VISUALIZATION_STYLES,
  diagrams: DIAGRAM_PRESETS,
  prompts: PROMPT_TEMPLATES,
  palettes: COLOR_PALETTES,
  
  getStyle,
  getDiagramPreset,
  getPromptTemplate,
  buildPrompt,
  buildDiagramPrompt,
  getStylesByCategory,
  getDiagramPresetsByType,
}

export default VisualizationLibrary









