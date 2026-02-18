/**
 * TipTap Extensions Index
 * @module quarry/ui/tiptap/extensions
 *
 * Custom TipTap extensions for enhanced WYSIWYG editing.
 */

// Mermaid diagrams
export { MermaidExtension, default as MermaidExtensionDefault } from './MermaidExtension'

// LaTeX math
export { LatexInlineExtension, LatexBlockExtension, default as LatexBlockExtensionDefault } from './LatexExtension'

// Callouts/Admonitions
export { CalloutExtension, CALLOUT_CONFIG, default as CalloutExtensionDefault } from './CalloutExtension'
export type { CalloutType } from './CalloutExtension'

// Embark-style Formulas
export { FormulaExtension, default as FormulaExtensionDefault } from './FormulaExtension'

// Media embeds
export { VideoExtension, parseVideoUrl, default as VideoExtensionDefault } from './VideoExtension'
export type { VideoProvider, VideoOptions } from './VideoExtension'

export { AudioExtension, parseAudioUrl, default as AudioExtensionDefault } from './AudioExtension'
export type { AudioProvider, AudioOptions } from './AudioExtension'

export { EmbedExtension, parseEmbedUrl, default as EmbedExtensionDefault } from './EmbedExtension'
export type { EmbedProvider, EmbedOptions, EmbedInfo } from './EmbedExtension'

// Toggle blocks (collapsible)
export { ToggleExtension, default as ToggleExtensionDefault } from './ToggleExtension'
export type { ToggleOptions } from './ToggleExtension'

// Text colors
export { TextColorExtension, TEXT_COLORS, BACKGROUND_COLORS, default as TextColorExtensionDefault } from './TextColorExtension'
export type { TextColorOptions } from './TextColorExtension'
