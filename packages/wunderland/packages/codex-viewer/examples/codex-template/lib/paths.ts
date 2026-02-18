import path from 'node:path'

const PROJECT_ROOT = process.cwd()

export const WEAVES_DIR = path.join(PROJECT_ROOT, 'weaves')

export function normalizeSlashes(input: string) {
  return input.replace(/\\/g, '/')
}

export function slugToRelativePath(slug: string[]) {
  return normalizeSlashes(path.join(...slug))
}

export function slugToAbsoluteMarkdownPath(slug: string[]) {
  return path.join(WEAVES_DIR, ...slug) + '.md'
}

export function relativeMarkdownPathToSlug(relativePath: string) {
  return normalizeSlashes(relativePath)
    .replace(/\.md$/i, '')
    .split('/')
    .filter(Boolean)
}


