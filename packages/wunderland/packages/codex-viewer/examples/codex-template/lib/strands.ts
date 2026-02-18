import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { WEAVES_DIR, relativeMarkdownPathToSlug, slugToAbsoluteMarkdownPath } from './paths'
import { deriveSummary, findFirstImageUrl, sentenceCase } from './text'

export type StrandFrontMatter = {
  title?: string
  summary?: string
  description?: string
  tags?: string[]
  publishing?: {
    status?: string
    lastUpdated?: string
  }
  [key: string]: unknown
}

export type StrandRecord = {
  slug: string[]
  relativePath: string
  frontmatter: StrandFrontMatter
  content: string
  summary: string
  firstImage?: string
  weaveId: string
  weaveLabel: string
  lastUpdatedISO: string
}

const strandCache = new Map<string, Promise<StrandRecord | undefined>>()
let allStrandsPromise: Promise<StrandRecord[]> | undefined

async function walkMarkdownFiles(dir: string, prefix = ''): Promise<string[]> {
  const dirents = await fs.readdir(dir, { withFileTypes: true })
  const results: string[] = []

  for (const dirent of dirents) {
    if (dirent.name.startsWith('.')) continue
    const absolute = path.join(dir, dirent.name)
    const relative = path.join(prefix, dirent.name)

    if (dirent.isDirectory()) {
      const nested = await walkMarkdownFiles(absolute, relative)
      results.push(...nested)
      continue
    }

    if (dirent.isFile() && dirent.name.toLowerCase().endsWith('.md')) {
      results.push(relative)
    }
  }

  return results.sort()
}

async function parseStrand(relativePath: string): Promise<StrandRecord> {
  const absolutePath = path.join(WEAVES_DIR, relativePath)
  const raw = await fs.readFile(absolutePath, 'utf8')
  const fileStats = await fs.stat(absolutePath)

  const parsed = matter(raw)
  const content = parsed.content.trim()

  const slug = relativeMarkdownPathToSlug(relativePath)
  const weaveId = slug[0] ?? 'codex'
  const weaveLabel = sentenceCase(weaveId)

  const summary = (parsed.data.summary ||
    parsed.data.description ||
    deriveSummary(content)) as string

  const firstImage = findFirstImageUrl(raw)

  return {
    slug,
    relativePath,
    frontmatter: parsed.data as StrandFrontMatter,
    content,
    summary,
    firstImage,
    weaveId,
    weaveLabel,
    lastUpdatedISO: (parsed.data?.publishing as Record<string, string> | undefined)?.lastUpdated ??
      fileStats.mtime.toISOString(),
  }
}

export async function getAllStrands() {
  if (!allStrandsPromise) {
    allStrandsPromise = (async () => {
      const files = await walkMarkdownFiles(WEAVES_DIR)
      return Promise.all(files.map((file) => parseStrand(file)))
    })()
  }

  return allStrandsPromise
}

export async function getStrandBySlug(slug: string[]) {
  const key = slug.join('/')

  if (!strandCache.has(key)) {
    strandCache.set(
      key,
      (async () => {
        try {
          const absolutePath = slugToAbsoluteMarkdownPath(slug)
          const relative = path.relative(WEAVES_DIR, absolutePath)
          return await parseStrand(relative)
        } catch (error) {
          return undefined
        }
      })(),
    )
  }

  return strandCache.get(key)!
}

export function buildPermalink(slug: string[]) {
  return `/codex/${slug.join('/')}`
}


