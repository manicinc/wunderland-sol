/**
 * Audio Extension for TipTap Editor
 * @module quarry/ui/tiptap/extensions/AudioExtension
 *
 * Embeds audio files with a custom player UI.
 * Supports direct audio URLs and common formats.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import AudioNodeView from './AudioNodeView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    audio: {
      /**
       * Insert an audio embed
       */
      insertAudio: (url: string, title?: string) => ReturnType
    }
  }
}

export interface AudioOptions {
  /** HTML attributes for the node */
  HTMLAttributes: Record<string, unknown>
}

export type AudioProvider = 'direct' | 'soundcloud' | 'spotify' | 'unknown'

/**
 * Parse audio URL and determine provider
 */
export function parseAudioUrl(url: string): { provider: AudioProvider; embedUrl: string } {
  // SoundCloud pattern
  if (url.includes('soundcloud.com')) {
    return {
      provider: 'soundcloud',
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`,
    }
  }

  // Spotify pattern
  const spotifyMatch = url.match(/spotify\.com\/(track|episode|album|playlist)\/([a-zA-Z0-9]+)/)
  if (spotifyMatch) {
    const [, type, id] = spotifyMatch
    return {
      provider: 'spotify',
      embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
    }
  }

  // Direct audio URL (mp3, wav, ogg, etc.)
  const audioExtensions = /\.(mp3|wav|ogg|m4a|aac|flac|webm)(\?.*)?$/i
  if (audioExtensions.test(url)) {
    return {
      provider: 'direct',
      embedUrl: url,
    }
  }

  // Unknown - try as direct URL
  return {
    provider: 'unknown',
    embedUrl: url,
  }
}

export const AudioExtension = Node.create<AudioOptions>({
  name: 'audio',

  group: 'block',

  atom: true, // Treat as a single unit

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
        parseHTML: element => element.getAttribute('data-src') || element.getAttribute('src'),
        renderHTML: attributes => ({
          'data-src': attributes.src,
        }),
      },
      provider: {
        default: 'unknown',
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
      title: {
        default: '',
        parseHTML: element => element.getAttribute('data-title') || '',
        renderHTML: attributes => ({
          'data-title': attributes.title,
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
        tag: 'div[data-type="audio"]',
      },
      // Parse audio elements
      {
        tag: 'audio',
        getAttrs: node => {
          if (node instanceof HTMLElement) {
            const src = node.getAttribute('src') || node.querySelector('source')?.getAttribute('src')
            if (src) {
              const parsed = parseAudioUrl(src)
              return {
                src,
                provider: parsed.provider,
                embedUrl: parsed.embedUrl,
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
      { 'data-type': 'audio' },
      this.options.HTMLAttributes,
      HTMLAttributes
    )]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioNodeView)
  },

  addCommands() {
    return {
      insertAudio: (url: string, title?: string) => ({ chain }) => {
        const parsed = parseAudioUrl(url)
        return chain()
          .insertContent({
            type: this.name,
            attrs: {
              src: url,
              provider: parsed.provider,
              embedUrl: parsed.embedUrl,
              title: title || '',
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

export default AudioExtension
