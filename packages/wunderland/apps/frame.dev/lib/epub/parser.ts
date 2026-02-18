/**
 * EPUB Parser
 * @module lib/epub/parser
 *
 * Extracts spine-ordered text and metadata from EPUB files.
 */

import JSZip from 'jszip'
import { XMLParser } from 'fast-xml-parser'
import he from 'he'

export interface EPUBSection {
  /** 1-indexed position in reading order */
  index: number
  /** Href inside the EPUB */
  href: string
  /** Title for this section */
  title: string
  /** Extracted plain text */
  text: string
  /** Estimated word count */
  wordCount: number
}

export interface ParsedEPUB {
  filename: string
  metadata: {
    title?: string
    author?: string
    language?: string
  }
  totalSections: number
  totalWords: number
  sections: EPUBSection[]
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function stripHtmlToText(html: string): { title?: string; text: string } {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')

  const titleMatch =
    withoutScripts.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
    withoutScripts.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const rawTitle = titleMatch?.[1]
  const title = rawTitle
    ? he.decode(rawTitle.replace(/<[^>]+>/g, '').trim())
    : undefined

  const withBreaks = withoutScripts
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|h[1-6]|li)>/gi, '\n\n')

  const noTags = withBreaks.replace(/<[^>]+>/g, '')
  const decoded = he.decode(noTags)
  const text = decoded.replace(/\n{3,}/g, '\n\n').trim()

  return { title, text }
}

export async function parseEPUB(
  buffer: Buffer | ArrayBuffer,
  filename: string = 'document.epub'
): Promise<ParsedEPUB> {
  const zip = await JSZip.loadAsync(buffer as any)

  const containerFile = zip.file('META-INF/container.xml')
  if (!containerFile) {
    throw new Error('Invalid EPUB: missing META-INF/container.xml')
  }

  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
  })

  const containerXml = await containerFile.async('text')
  const container = xmlParser.parse(containerXml)
  const rootfiles = container?.container?.rootfiles?.rootfile
  const rootfile = toArray(rootfiles)[0]
  const opfPath = rootfile?.['@_full-path']
  if (!opfPath || typeof opfPath !== 'string') {
    throw new Error('Invalid EPUB: missing rootfile full-path')
  }

  const opfFile = zip.file(opfPath)
  if (!opfFile) {
    throw new Error(`Invalid EPUB: missing package file at ${opfPath}`)
  }

  const opfXml = await opfFile.async('text')
  const opf = xmlParser.parse(opfXml)
  const pkg = opf?.package
  if (!pkg) {
    throw new Error('Invalid EPUB: missing package metadata')
  }

  const meta = pkg.metadata || {}
  const titleRaw = toArray(meta.title)[0]
  const creatorRaw = toArray(meta.creator)[0]
  const languageRaw = toArray(meta.language)[0]

  const manifestItems = toArray(pkg.manifest?.item)
  const manifestById = new Map<string, any>()
  for (const item of manifestItems) {
    if (item?.['@_id']) {
      manifestById.set(item['@_id'], item)
    }
  }

  const spineItems = toArray(pkg.spine?.itemref)
  const opfDir = opfPath.includes('/') ? opfPath.split('/').slice(0, -1).join('/') : ''

  const sections: EPUBSection[] = []

  for (let i = 0; i < spineItems.length; i++) {
    const ref = spineItems[i]
    const idref = ref?.['@_idref']
    if (!idref) continue

    const manifestItem = manifestById.get(idref)
    const href = manifestItem?.['@_href']
    const mediaType = manifestItem?.['@_media-type']
    if (!href || (mediaType && !String(mediaType).includes('html'))) continue

    const fullHref = opfDir ? `${opfDir}/${href}` : href
    const contentFile = zip.file(fullHref)
    if (!contentFile) continue

    const html = await contentFile.async('text')
    const extracted = stripHtmlToText(html)
    const text = extracted.text
    if (!text) continue

    const wordCount = text.split(/\s+/).filter(Boolean).length
    sections.push({
      index: sections.length + 1,
      href: fullHref,
      title: extracted.title || `Section ${sections.length + 1}`,
      text,
      wordCount,
    })
  }

  return {
    filename,
    metadata: {
      title: typeof titleRaw === 'string' ? titleRaw : undefined,
      author: typeof creatorRaw === 'string' ? creatorRaw : undefined,
      language: typeof languageRaw === 'string' ? languageRaw : undefined,
    },
    totalSections: sections.length,
    totalWords: sections.reduce((sum, s) => sum + s.wordCount, 0),
    sections,
  }
}

