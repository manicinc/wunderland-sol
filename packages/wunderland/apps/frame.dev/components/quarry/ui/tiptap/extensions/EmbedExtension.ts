/**
 * Embed Extension for TipTap Editor
 * @module quarry/ui/tiptap/extensions/EmbedExtension
 *
 * Embeds external content via iframes.
 * Supports Twitter/X, CodePen, Figma, CodeSandbox, and generic URLs.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import EmbedNodeView from './EmbedNodeView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embed: {
      /**
       * Insert an embed
       */
      insertEmbed: (url: string) => ReturnType
    }
  }
}

export interface EmbedOptions {
  /** HTML attributes for the node */
  HTMLAttributes: Record<string, unknown>
}

export type EmbedProvider = 'twitter' | 'codepen' | 'codesandbox' | 'figma' | 'loom' | 'notion' | 'generic'

export interface EmbedInfo {
  provider: EmbedProvider
  embedUrl: string
  height?: number
  aspectRatio?: string
}

/**
 * Parse URL and generate embed configuration
 */
export function parseEmbedUrl(url: string): EmbedInfo {
  // Twitter/X
  const twitterMatch = url.match(/(?:twitter\.com|x\.com)\/(?:\w+)\/status\/(\d+)/)
  if (twitterMatch) {
    // Twitter embeds work best via oEmbed, but we'll use a simple approach
    return {
      provider: 'twitter',
      embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${twitterMatch[1]}`,
      height: 400,
    }
  }

  // CodePen
  const codepenMatch = url.match(/codepen\.io\/([^/]+)\/(?:pen|full|details)\/([^/?]+)/)
  if (codepenMatch) {
    const [, user, penId] = codepenMatch
    return {
      provider: 'codepen',
      embedUrl: `https://codepen.io/${user}/embed/${penId}?default-tab=result&theme-id=dark`,
      height: 400,
    }
  }

  // CodeSandbox
  const codesandboxMatch = url.match(/codesandbox\.io\/(?:s|embed)\/([^/?]+)/)
  if (codesandboxMatch) {
    return {
      provider: 'codesandbox',
      embedUrl: `https://codesandbox.io/embed/${codesandboxMatch[1]}?fontsize=14&hidenavigation=1&theme=dark`,
      height: 500,
    }
  }

  // Figma
  const figmaMatch = url.match(/figma\.com\/(file|proto|design)\/([^/?]+)/)
  if (figmaMatch) {
    return {
      provider: 'figma',
      embedUrl: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`,
      aspectRatio: '16:9',
    }
  }

  // Loom
  const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/)
  if (loomMatch) {
    return {
      provider: 'loom',
      embedUrl: `https://www.loom.com/embed/${loomMatch[1]}`,
      aspectRatio: '16:9',
    }
  }

  // Notion
  const notionMatch = url.match(/notion\.so\/([^/?]+)/)
  if (notionMatch) {
    return {
      provider: 'notion',
      embedUrl: url.replace('notion.so', 'notion.so/embed'),
      height: 500,
    }
  }

  // Generic URL
  return {
    provider: 'generic',
    embedUrl: url,
    height: 400,
  }
}

export const EmbedExtension = Node.create<EmbedOptions>({
  name: 'embed',

  group: 'block',

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: element => element.getAttribute('data-src'),
        renderHTML: attributes => ({
          'data-src': attributes.src,
        }),
      },
      provider: {
        default: 'generic',
        parseHTML: element => element.getAttribute('data-provider'),
        renderHTML: attributes => ({
          'data-provider': attributes.provider,
        }),
      },
      embedUrl: {
        default: null,
        parseHTML: element => element.getAttribute('data-embed-url'),
        renderHTML: attributes => ({
          'data-embed-url': attributes.embedUrl,
        }),
      },
      height: {
        default: 400,
        parseHTML: element => parseInt(element.getAttribute('data-height') || '400', 10),
        renderHTML: attributes => ({
          'data-height': String(attributes.height),
        }),
      },
      aspectRatio: {
        default: null,
        parseHTML: element => element.getAttribute('data-aspect-ratio'),
        renderHTML: attributes => ({
          'data-aspect-ratio': attributes.aspectRatio,
        }),
      },
      caption: {
        default: '',
        parseHTML: element => element.getAttribute('data-caption') || '',
        renderHTML: attributes => ({
          'data-caption': attributes.caption,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="embed"]',
      },
      // Parse iframes
      {
        tag: 'iframe',
        getAttrs: node => {
          if (node instanceof HTMLElement) {
            const src = node.getAttribute('src')
            if (src && !src.includes('youtube') && !src.includes('vimeo')) {
              const parsed = parseEmbedUrl(src)
              return {
                src,
                ...parsed,
              }
            }
          }
          return false
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      { 'data-type': 'embed' },
      this.options.HTMLAttributes,
      HTMLAttributes
    )]
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedNodeView)
  },

  addCommands() {
    return {
      insertEmbed: (url: string) => ({ chain }) => {
        const parsed = parseEmbedUrl(url)
        return chain()
          .insertContent({
            type: this.name,
            attrs: {
              src: url,
              provider: parsed.provider,
              embedUrl: parsed.embedUrl,
              height: parsed.height,
              aspectRatio: parsed.aspectRatio,
            },
          })
          .run()
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { selection } = this.editor.state
        const { empty, $anchor } = selection
        const isAtStart = $anchor.parentOffset === 0

        if (!empty || !isAtStart) {
          return false
        }

        const node = $anchor.node()
        if (node.type.name === this.name) {
          return this.editor.commands.deleteNode(this.name)
        }

        return false
      },
    }
  },
})

export default EmbedExtension
