/**
 * Video Extension for TipTap Editor
 * @module quarry/ui/tiptap/extensions/VideoExtension
 *
 * Embeds videos from YouTube, Vimeo, or direct URLs.
 * Supports responsive aspect ratios and lazy loading.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import VideoNodeView from './VideoNodeView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      /**
       * Insert a video embed
       */
      insertVideo: (url: string) => ReturnType
    }
  }
}

export interface VideoOptions {
  /** HTML attributes for the node */
  HTMLAttributes: Record<string, unknown>
  /** Allow fullscreen */
  allowFullscreen: boolean
  /** Default aspect ratio (e.g., '16:9', '4:3') */
  defaultAspectRatio: string
}

export type VideoProvider = 'youtube' | 'vimeo' | 'direct' | 'unknown'

/**
 * Parse video URL and extract provider + ID
 */
export function parseVideoUrl(url: string): { provider: VideoProvider; videoId: string | null; embedUrl: string } {
  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern)
    if (match) {
      const videoId = match[1]
      return {
        provider: 'youtube',
        videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`,
      }
    }
  }

  // Vimeo patterns
  const vimeoPattern = /vimeo\.com\/(?:video\/)?(\d+)/
  const vimeoMatch = url.match(vimeoPattern)
  if (vimeoMatch) {
    const videoId = vimeoMatch[1]
    return {
      provider: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?dnt=1`,
    }
  }

  // Direct video URL (mp4, webm, etc.)
  const videoExtensions = /\.(mp4|webm|ogg|mov)(\?.*)?$/i
  if (videoExtensions.test(url)) {
    return {
      provider: 'direct',
      videoId: null,
      embedUrl: url,
    }
  }

  // Unknown - try as direct URL
  return {
    provider: 'unknown',
    videoId: null,
    embedUrl: url,
  }
}

export const VideoExtension = Node.create<VideoOptions>({
  name: 'video',

  group: 'block',

  atom: true, // Treat as a single unit

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      allowFullscreen: true,
      defaultAspectRatio: '16:9',
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
      videoId: {
        default: null,
        parseHTML: element => element.getAttribute('data-video-id'),
        renderHTML: attributes => ({
          'data-video-id': attributes.videoId,
        }),
      },
      embedUrl: {
        default: null,
        parseHTML: element => element.getAttribute('data-embed-url'),
        renderHTML: attributes => ({
          'data-embed-url': attributes.embedUrl,
        }),
      },
      aspectRatio: {
        default: '16:9',
        parseHTML: element => element.getAttribute('data-aspect-ratio') || '16:9',
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
        tag: 'div[data-type="video"]',
      },
      // Parse iframe embeds
      {
        tag: 'iframe',
        getAttrs: node => {
          if (node instanceof HTMLElement) {
            const src = node.getAttribute('src') || ''
            if (src.includes('youtube') || src.includes('vimeo')) {
              const parsed = parseVideoUrl(src)
              return {
                src,
                ...parsed,
              }
            }
          }
          return false
        },
      },
      // Parse video elements
      {
        tag: 'video',
        getAttrs: node => {
          if (node instanceof HTMLElement) {
            const src = node.getAttribute('src') || node.querySelector('source')?.getAttribute('src')
            if (src) {
              return {
                src,
                provider: 'direct',
                embedUrl: src,
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
      { 'data-type': 'video' },
      this.options.HTMLAttributes,
      HTMLAttributes
    )]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView)
  },

  addCommands() {
    return {
      insertVideo: (url: string) => ({ chain }) => {
        const parsed = parseVideoUrl(url)
        return chain()
          .insertContent({
            type: this.name,
            attrs: {
              src: url,
              provider: parsed.provider,
              videoId: parsed.videoId,
              embedUrl: parsed.embedUrl,
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

export default VideoExtension
