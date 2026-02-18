/**
 * @file markdownTheme.ts
 * @description Custom CodeMirror 6 theme for markdown editing
 * Integrates with the diary agent's oceanic color scheme using CSS variables
 * @version 1.0.0
 */

import { EditorView } from '@codemirror/view'
import { Extension } from '@codemirror/state'

/**
 * Create a custom CodeMirror theme that integrates with the app's CSS variables
 * This theme uses the diary agent's color scheme for consistent styling
 */
export function createMarkdownTheme(): Extension {
  return EditorView.theme(
    {
      '&': {
        color: 'var(--color-text-primary)',
        backgroundColor: 'hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 1%), 0.98)',
        fontSize: '14px',
        fontFamily: 'var(--font-family-mono, monospace)',
        lineHeight: '1.6',
      },
      '.cm-content': {
        caretColor: 'hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l))',
        padding: '16px 12px',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: 'hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l))',
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: 'hsl(var(--diary-accent-h), var(--diary-accent-s), calc(var(--diary-accent-l) + 10%))',
      },
      '&.cm-focused': {
        outline: 'none',
      },
      '.cm-selectionBackground, .cm-focused .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: 'hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.2)',
      },
      '.cm-gutters': {
        backgroundColor: 'hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) - 1%), 0.95)',
        color: 'var(--color-text-muted)',
        border: 'none',
        borderRight: '1px solid hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.1)',
        paddingRight: '8px',
        minWidth: '50px',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.08)',
        color: 'hsl(var(--diary-accent-h), var(--diary-accent-s), calc(var(--diary-accent-l) + 15%))',
      },
      '.cm-activeLine': {
        backgroundColor: 'hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.05)',
      },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: 'inherit',
      },
      '.cm-line': {
        padding: '0 4px',
      },
      // Markdown-specific styling
      '.cm-heading': {
        fontWeight: '600',
        color: 'hsl(var(--diary-accent-h), var(--diary-accent-s), calc(var(--diary-accent-l) + 12%))',
      },
      '.cm-heading1': {
        fontSize: '1.75em',
        lineHeight: '1.4',
      },
      '.cm-heading2': {
        fontSize: '1.5em',
        lineHeight: '1.4',
      },
      '.cm-heading3': {
        fontSize: '1.25em',
        lineHeight: '1.4',
      },
      '.cm-heading4': {
        fontSize: '1.1em',
        lineHeight: '1.4',
      },
      '.cm-heading5, .cm-heading6': {
        fontSize: '1em',
        lineHeight: '1.4',
      },
      '.cm-strong': {
        fontWeight: '700',
        color: 'var(--color-text-primary)',
      },
      '.cm-em': {
        fontStyle: 'italic',
        color: 'var(--color-text-primary)',
      },
      '.cm-link': {
        color: 'hsl(var(--diary-accent-h), var(--diary-accent-s), calc(var(--diary-accent-l) + 5%))',
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
      },
      '.cm-url': {
        color: 'hsl(var(--diary-accent-h), var(--diary-accent-s), calc(var(--diary-accent-l) - 5%))',
        opacity: '0.8',
      },
      '.cm-quote': {
        color: 'var(--color-text-secondary)',
        fontStyle: 'italic',
      },
      '.cm-meta': {
        color: 'var(--color-text-muted)',
        fontSize: '0.9em',
      },
      '.cm-monospace, .cm-code': {
        fontFamily: 'var(--font-family-mono, monospace)',
        backgroundColor: 'hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 5%), 0.5)',
        padding: '2px 4px',
        borderRadius: '3px',
        color: 'var(--color-text-accent, var(--color-text-primary))',
        fontSize: '0.9em',
      },
      '.cm-list': {
        color: 'hsl(var(--diary-accent-h), var(--diary-accent-s), calc(var(--diary-accent-l) + 8%))',
      },
      '.cm-hr': {
        color: 'var(--color-border-primary)',
      },
      // Frontmatter styling
      '.cm-frontmatter': {
        opacity: '0.6',
        color: 'var(--color-text-muted)',
        backgroundColor: 'hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) - 2%), 0.5)',
      },
      // Search/match highlighting
      '.cm-searchMatch': {
        backgroundColor: 'hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.3)',
        outline: '1px solid hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.5)',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: 'hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.5)',
      },
      // Placeholder
      '.cm-placeholder': {
        color: 'var(--color-text-muted)',
        opacity: '0.6',
        fontStyle: 'italic',
      },
      // Tooltips
      '.cm-tooltip': {
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-primary)',
        borderRadius: '6px',
        padding: '4px 8px',
        fontSize: '0.875rem',
      },
      '.cm-tooltip-autocomplete': {
        '& > ul': {
          maxHeight: '200px',
        },
        '& > ul > li[aria-selected]': {
          backgroundColor: 'hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.2)',
          color: 'var(--color-text-primary)',
        },
      },
    },
    {
      dark: false, // We'll detect dark mode via CSS variables
    }
  )
}

/**
 * Get additional editor style extensions based on the current theme
 * This can be extended to support different color modes
 */
export function getEditorStyles(): Extension {
  return [createMarkdownTheme()]
}
